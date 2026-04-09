# Auto Screen Electron Auth Flow Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Auto Screen 데스크톱 앱이 첫 실행 시 로그인/회원가입 진입 화면을 보여주고, 외부 브라우저 + deep link 방식으로 안전하게 계정 연동되도록 만든다.

**Architecture:** Electron main process가 custom protocol(`autoscreen://`) deep link를 등록하고, renderer는 인증 상태에 따라 `auth gate`와 실제 editor/app shell을 분기 렌더링한다. 로그인/회원가입과 결제는 웹에서 처리하고, 앱은 backend API를 통해 desktop session과 entitlements를 받는다.

**Tech Stack:** Electron, React, TypeScript, existing `openExternalUrl` IPC, custom protocol deep link, OS secure storage.

---

## Product Flow (확정)
1. 사용자가 랜딩페이지 방문
2. Mac / Windows / Linux 중 하나 다운로드
3. 앱 설치 후 첫 실행
4. **앱 첫 화면은 로그인/회원가입 화면**
5. 사용자가 `로그인`, `회원가입`, `나중에 둘러보기(선택)` 중 하나 선택
6. 로그인/회원가입은 기본 브라우저에서 진행
7. 완료 후 `autoscreen://auth/callback?...` 로 앱 복귀
8. 앱이 backend에서 세션/entitlement 수신
9. Free 또는 Pro 상태에 맞게 기능 노출
10. 업그레이드는 다시 웹 결제로 연결

---

## UX Decision

### 첫 화면
앱 첫 실행 시 기본 화면은 editor가 아니라 **Auth Gate Screen** 이다.

### Auth Gate Screen 구성
- 로고
- 짧은 제품 설명
- `Google로 계속하기`
- `이메일로 회원가입`
- `로그인`
- `나중에 둘러보기`(선택)
- `Pro 월 15,900원` 링크 또는 작은 배지
- `요금제 보기` 버튼

### 나중에 둘러보기 허용 여부
권장:
- **허용은 하되 제한 모드(guest/free preview)** 로 진입
- export, cloud, MCP, 고급 기능은 잠금
- 실제 저장/동기화/복구는 로그인 유도

이유:
- 설치 직후 완전 차단보다 전환율이 나을 수 있음
- 하지만 핵심 기능 unlock은 계정 기준 유지 가능

---

## State Model

### Renderer auth states
```ts
type AuthState =
  | { status: "booting" }
  | { status: "signed_out" }
  | { status: "pending_browser_auth" }
  | { status: "signed_in"; user: UserSummary; entitlements: string[] }
  | { status: "guest" }
  | { status: "session_expired" };
```

### Session payload
```ts
interface DesktopSessionPayload {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    displayName?: string | null;
  };
  subscription: {
    plan: string;
    status: string;
  };
  entitlements: string[];
}
```

---

## Required Electron Changes

### Main process
**Files:**
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`
- Modify: `electron/electron-env.d.ts`
- Modify: `src/vite-env.d.ts`
- Create: `electron/auth/protocol.ts`
- Create: `electron/auth/sessionStore.ts`
- Create: `electron/auth/client.ts`

**Responsibilities:**
- `autoscreen://` protocol 등록
- macOS `open-url` 이벤트 처리
- Windows/Linux second-instance argv에서 deep link 수신
- deep link의 `code` 파싱
- backend `POST /api/auth/desktop/exchange` 호출
- 토큰을 secure storage에 저장
- renderer에 auth state broadcast

### Renderer
**Files:**
- Create: `src/features/auth/AuthGate.tsx`
- Create: `src/features/auth/AuthGate.module.css`
- Create: `src/features/auth/useAuthSession.ts`
- Create: `src/features/auth/authTypes.ts`
- Create: `src/features/auth/AuthUpgradeBanner.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/video-editor/VideoEditor.tsx`

**Responsibilities:**
- 앱 부팅 시 auth session restore
- signed_out 이면 Auth Gate 렌더링
- signed_in 이면 editor/hud 렌더링
- guest/free/pro 상태별 CTA 분기

---

## Secure Storage Decision

MVP 권장 저장 방식:
- macOS: Keychain (`safeStorage`만으로 충분치 않으면 `keytar` 검토)
- Windows: Credential Locker 또는 encrypted file fallback
- Linux: Secret Service 우선, 불가 시 encrypted file fallback

실무적으로는 1차 구현에서:
1. refresh token만 저장
2. access token은 메모리 중심
3. 앱 시작 시 refresh로 재발급

---

## Deep Link Handling Plan

### macOS
- `app.setAsDefaultProtocolClient("autoscreen")`
- `app.on("open-url", ...)`

### Windows/Linux
- `app.requestSingleInstanceLock()`
- 두 번째 실행 인자의 `autoscreen://...` 파싱
- 이미 열린 창으로 이벤트 전달

### Deep link format
```text
autoscreen://auth/callback?code=ONE_TIME_CODE
```

추가 가능:
```text
autoscreen://billing/success
autoscreen://billing/cancel
```

---

## IPC Contract

### Preload additions
```ts
openLoginUrl(url: string): Promise<{ success: boolean; error?: string }>;
onAuthCallback(callback: (payload: { code: string }) => void): () => void;
getStoredSession(): Promise<StoredSession | null>;
clearStoredSession(): Promise<{ success: boolean }>;
refreshDesktopSession(): Promise<DesktopSessionPayload | null>;
logoutDesktopSession(): Promise<{ success: boolean }>;
```

---

## Screen Flow

### 1. Cold start
- app boot
- 저장된 refresh token 확인
- 있으면 `/api/auth/refresh` 호출
- 성공하면 signed_in
- 실패하면 signed_out

### 2. Signed out
화면:
- 제품 로고
- 핵심 가치 2~3줄
- `Google로 시작`
- `이메일 회원가입`
- `로그인`
- `요금제 보기`
- `나중에 둘러보기`

### 3. Browser auth in progress
- spinner
- `브라우저에서 로그인 중입니다...`
- `브라우저가 열리지 않으면 다시 시도`

### 4. Signed in free
- editor 사용 가능
- Pro 기능 영역은 lock badge
- 상단/설정 영역에 `Pro 업그레이드`

### 5. Signed in pro
- 전체 기능 활성화

---

## Task Breakdown

### Task 1: auth domain 타입 정의
**Objective:** renderer/main 공용 auth 타입을 먼저 고정한다.

**Files:**
- Create: `src/features/auth/authTypes.ts`
- Modify: `electron/electron-env.d.ts`
- Modify: `src/vite-env.d.ts`

### Task 2: main process protocol 등록 추가
**Objective:** 앱이 `autoscreen://` deep link를 받을 수 있게 한다.

**Files:**
- Create: `electron/auth/protocol.ts`
- Modify: `electron/main.ts`

**Implementation notes:**
- 앱 시작 초기에 protocol 등록
- single instance lock 추가
- mac/win/linux 분기 처리

### Task 3: session store 추가
**Objective:** refresh token과 user summary를 OS secure storage에 저장한다.

**Files:**
- Create: `electron/auth/sessionStore.ts`
- Modify: `electron/preload.ts`
- Modify: `electron/electron-env.d.ts`

### Task 4: backend auth client 추가
**Objective:** main process에서 desktop exchange/refresh/logout API 호출 계층을 만든다.

**Files:**
- Create: `electron/auth/client.ts`
- Modify: `electron/preload.ts`

### Task 5: auth gate 화면 추가
**Objective:** 앱 첫 화면을 로그인/회원가입 진입 화면으로 만든다.

**Files:**
- Create: `src/features/auth/AuthGate.tsx`
- Create: `src/features/auth/AuthGate.module.css`
- Modify: `src/App.tsx`

**Implementation notes:**
- signed_out에서만 노출
- 버튼 클릭 시 웹 URL openExternal
- guest 진입 허용 여부는 feature flag로 둘 수 있음

### Task 6: 앱 전체 auth session hook 연결
**Objective:** signed_out / signed_in / guest 상태에 따라 앱 shell을 분기한다.

**Files:**
- Create: `src/features/auth/useAuthSession.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/video-editor/VideoEditor.tsx`

### Task 7: deep link callback 처리 완료
**Objective:** 브라우저 로그인 완료 후 앱이 실제로 signed_in 상태가 되게 한다.

**Files:**
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`
- Modify: `src/features/auth/useAuthSession.ts`

### Task 8: upgrade / pricing CTA 연결
**Objective:** Free 사용자가 앱 안에서 요금제/결제로 자연스럽게 이동하게 한다.

**Files:**
- Create: `src/features/auth/AuthUpgradeBanner.tsx`
- Modify: `src/components/video-editor/VideoEditor.tsx`

### Task 9: session expiry / logout UX 추가
**Objective:** 세션 만료와 로그아웃 시 UX가 깨지지 않게 한다.

**Files:**
- Modify: `src/features/auth/useAuthSession.ts`
- Modify: `src/features/auth/AuthGate.tsx`

---

## Acceptance Criteria
- 앱 첫 실행 시 로그인/회원가입 화면이 먼저 보인다
- 로그인/회원가입은 웹 브라우저에서 열린다
- 로그인 완료 후 앱이 deep link로 복귀한다
- 앱이 desktop session/entitlements를 저장한다
- Free/Pro에 따라 UI가 다르게 보인다
- 로그아웃 후 다시 Auth Gate로 복귀한다
- guest/free 모드가 있더라도 Pro 기능은 잠겨 있다
