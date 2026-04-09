# Auto Screen Auth Backend MVP Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Auto Screen 유료 판매를 위한 최소 백엔드(Auth, user profile, device registration, entitlement 조회, desktop token 교환)를 만든다.

**Architecture:** Supabase Auth를 사용자 인증의 기반으로 두고, 별도 backend API가 desktop login code 교환, device 등록, entitlement 판정, billing 상태 조회를 담당한다. 클라이언트(Electron 앱)는 직접 비밀키를 갖지 않고, 서버 API만 호출한다.

**Tech Stack:** Next.js App Router 또는 Express, Supabase Auth, Supabase Postgres, Zod, Toss Payments webhook 연동 예정.

---

## Scope (MVP)
- 이메일 회원가입/로그인
- Google 로그인
- desktop deep link용 one-time code 발급/교환
- 사용자 기본 profile 저장
- device 등록/제한(계정당 2대)
- entitlement 조회 API
- subscription 상태는 backend DB 기준

## Out of Scope (이번 단계 제외)
- Kakao/Naver 실제 provider 연결
- 팀 플랜
- 쿠폰/프로모션
- 연간 결제
- in-app purchase

---

## Recommended Repo Layout

```text
backend/
  src/
    app.ts
    config/env.ts
    lib/supabase.ts
    lib/errors.ts
    middleware/auth.ts
    middleware/requestId.ts
    routes/health.ts
    routes/auth.ts
    routes/me.ts
    routes/devices.ts
    routes/entitlements.ts
    routes/billing.ts
    services/auth-service.ts
    services/device-service.ts
    services/entitlement-service.ts
    services/desktop-session-service.ts
    services/subscription-service.ts
    db/types.ts
    db/sql/
      001_users.sql
      002_devices.sql
      003_subscriptions.sql
      004_desktop_login_codes.sql
      005_refresh_sessions.sql
  package.json
  tsconfig.json
  .env.example
```

---

## Data Model

### `profiles`
- `id uuid primary key` — Supabase auth user id와 동일
- `email text not null`
- `display_name text null`
- `avatar_url text null`
- `default_locale text null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `devices`
- `id uuid primary key`
- `user_id uuid not null`
- `device_id text not null`
- `device_name text not null`
- `platform text not null`
- `app_version text null`
- `last_seen_at timestamptz not null default now()`
- `revoked_at timestamptz null`
- unique `(user_id, device_id)`

### `subscriptions`
- `id uuid primary key`
- `user_id uuid not null`
- `provider text not null default 'toss'`
- `plan_code text not null default 'pro_monthly_15900_krw'`
- `status text not null`
- `current_period_start timestamptz null`
- `current_period_end timestamptz null`
- `cancel_at timestamptz null`
- `canceled_at timestamptz null`
- `provider_customer_key text null`
- `provider_billing_key text null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `desktop_login_codes`
- `id uuid primary key`
- `user_id uuid not null`
- `code text not null unique`
- `code_challenge text null`
- `device_id text null`
- `expires_at timestamptz not null`
- `used_at timestamptz null`
- `created_at timestamptz not null default now()`

### `refresh_sessions`
- `id uuid primary key`
- `user_id uuid not null`
- `device_id text not null`
- `refresh_token_hash text not null`
- `expires_at timestamptz not null`
- `revoked_at timestamptz null`
- `last_rotated_at timestamptz not null default now()`
- `created_at timestamptz not null default now()`

---

## API Contract

### `GET /api/health`
응답:
```json
{ "ok": true }
```

### `POST /api/auth/desktop/start`
브라우저 로그인 완료 후 호출. 서버가 one-time code 생성.

Request:
```json
{
  "deviceId": "macos-uuid",
  "codeChallenge": "optional-pkce-value"
}
```

Response:
```json
{
  "redirectUrl": "autoscreen://auth/callback?code=abc123"
}
```

### `POST /api/auth/desktop/exchange`
앱이 deep link의 code를 전달해 desktop 세션 발급.

Request:
```json
{
  "code": "abc123",
  "device": {
    "deviceId": "macos-uuid",
    "deviceName": "MacBook Pro",
    "platform": "darwin",
    "appVersion": "1.3.0"
  }
}
```

Response:
```json
{
  "accessToken": "jwt-or-random-token",
  "refreshToken": "opaque-refresh-token",
  "expiresIn": 3600,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "User"
  },
  "subscription": {
    "plan": "pro_monthly_15900_krw",
    "status": "active"
  },
  "entitlements": ["mcp_editing", "advanced_auto_edit", "export_hd"]
}
```

### `POST /api/auth/refresh`
Request:
```json
{
  "refreshToken": "opaque-refresh-token",
  "deviceId": "macos-uuid"
}
```

### `POST /api/auth/logout`
현재 device 세션 revoke.

### `GET /api/me`
현재 사용자 정보 조회.

### `GET /api/entitlements`
응답:
```json
{
  "plan": "free",
  "status": "inactive",
  "entitlements": []
}
```
또는
```json
{
  "plan": "pro_monthly",
  "status": "active",
  "entitlements": ["mcp_editing", "advanced_auto_edit", "export_hd"]
}
```

### `GET /api/devices`
현재 계정에 연결된 기기 목록.

### `POST /api/devices/revoke`
다른 기기 세션 강제 해제.

---

## Device Limit Policy
- 기본 허용: 계정당 활성 기기 2대
- 3번째 기기 로그인 시 정책:
  1. 오래된 기기 자동 revoke, 또는
  2. API가 `DEVICE_LIMIT_REACHED` 반환 후 사용자가 웹에서 관리
- MVP는 **오래된 기기 자동 revoke**가 구현 비용이 가장 낮음

에러 예시:
```json
{
  "error": {
    "code": "DEVICE_LIMIT_REACHED",
    "message": "Maximum active devices reached"
  }
}
```

---

## Security Rules
- Supabase service role key는 backend 서버에만 저장
- desktop access token TTL은 짧게(예: 1시간)
- refresh token은 opaque token으로 발급하고 hash만 DB 저장
- one-time code 만료는 60~120초
- one-time code는 단 1회 사용
- access token만으로 subscription 상태 변경 불가
- webhook 처리만이 subscription 변경 가능

---

## Task Breakdown

### Task 1: Backend skeleton 생성
**Objective:** 인증/과금 백엔드 작업 디렉터리를 만든다.

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/src/app.ts`
- Create: `backend/src/config/env.ts`
- Create: `backend/.env.example`

**Implementation notes:**
- 서버 프레임워크는 Express로 시작
- `zod`, `dotenv`, `cors`, `cookie-parser` 사용 가능
- `/api/health` 하나만 먼저 열기

**Verify:**
- Run: `cd backend && npm install`
- Run: `npm run dev`
- Expected: `GET /api/health` returns `{ ok: true }`

### Task 2: Supabase 연결 계층 추가
**Objective:** backend가 Supabase Auth/Admin API를 안전하게 사용할 수 있게 한다.

**Files:**
- Create: `backend/src/lib/supabase.ts`
- Modify: `backend/src/config/env.ts`
- Modify: `backend/.env.example`

**Implementation notes:**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- env validation은 zod로 고정

**Verify:**
- 서버 시작 시 env validation pass
- 잘못된 env면 즉시 fail-fast

### Task 3: DB migration SQL 작성
**Objective:** profiles/devices/subscriptions/desktop_login_codes/refresh_sessions 테이블을 만든다.

**Files:**
- Create: `backend/src/db/sql/001_users.sql`
- Create: `backend/src/db/sql/002_devices.sql`
- Create: `backend/src/db/sql/003_subscriptions.sql`
- Create: `backend/src/db/sql/004_desktop_login_codes.sql`
- Create: `backend/src/db/sql/005_refresh_sessions.sql`

**Verify:**
- Supabase SQL editor에서 실행 가능
- unique/index/foreign key 확인

### Task 4: entitlement service 구현
**Objective:** 구독 상태를 앱 권한 배열로 변환한다.

**Files:**
- Create: `backend/src/services/entitlement-service.ts`
- Create: `backend/src/routes/entitlements.ts`

**Implementation notes:**
- `free` → `[]`
- `active pro_monthly_15900_krw` → `["mcp_editing", "advanced_auto_edit", "export_hd"]`
- 이후 플랜 추가 대비 함수 분리

**Verify:**
- 단위 테스트 또는 route smoke test

### Task 5: desktop one-time code 발급 구현
**Objective:** 웹 로그인 완료 후 Electron 앱으로 넘길 one-time code를 발급한다.

**Files:**
- Create: `backend/src/services/desktop-session-service.ts`
- Create: `backend/src/routes/auth.ts`

**Implementation notes:**
- 인증된 웹 사용자만 호출 가능
- 60~120초 만료 code 생성
- 사용 후 재사용 금지
- 응답은 `autoscreen://auth/callback?code=...`

**Verify:**
- 같은 code 재사용 시 400/409 반환

### Task 6: desktop code exchange 구현
**Objective:** Electron 앱이 code를 access/refresh token으로 교환하게 한다.

**Files:**
- Modify: `backend/src/routes/auth.ts`
- Modify: `backend/src/services/desktop-session-service.ts`
- Create: `backend/src/services/device-service.ts`

**Implementation notes:**
- device upsert
- 계정당 기기 2대 정책 적용
- access token + refresh token 발급
- entitlement payload 동시 반환

**Verify:**
- 정상 code → 세션 발급
- 만료/사용 완료 code → 실패

### Task 7: refresh / logout / me 구현
**Objective:** 앱 재실행 후 세션 갱신과 로그아웃이 가능하게 한다.

**Files:**
- Modify: `backend/src/routes/auth.ts`
- Create: `backend/src/routes/me.ts`
- Create: `backend/src/middleware/auth.ts`

**Implementation notes:**
- refresh rotation 적용
- logout 시 refresh session revoke
- `GET /api/me`는 현재 user summary 반환

**Verify:**
- refresh 후 새 access token 발급
- logout 뒤 기존 refresh token 사용 불가

### Task 8: device 관리 API 구현
**Objective:** 사용자가 연결 기기를 확인/해제할 수 있게 한다.

**Files:**
- Create: `backend/src/routes/devices.ts`
- Modify: `backend/src/services/device-service.ts`

**Verify:**
- `GET /api/devices`
- `POST /api/devices/revoke`

### Task 9: API 문서/환경변수 문서화
**Objective:** 프론트/Electron이 바로 붙을 수 있도록 backend contract를 고정한다.

**Files:**
- Create: `backend/README.md`
- Modify: `docs/plans/2026-04-auth-billing-desktop-architecture.md`

**Verify:**
- 구현자 입장에서 API path와 env를 문서만 보고 재현 가능

---

## Environment Variables

```bash
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SIGNING_SECRET=
DESKTOP_REDIRECT_SCHEME=autoscreen
APP_WEB_BASE_URL=https://app.autoscreen.io
API_BASE_URL=https://api.autoscreen.io
DEVICE_LIMIT=2
```

---

## Acceptance Criteria
- 이메일/Google 로그인 완료 사용자에 대해 desktop login code 발급 가능
- Electron 앱이 code를 교환해 세션/entitlement 획득 가능
- 구독 active 사용자는 `mcp_editing` 등 Pro entitlement 수신
- 계정당 기기 2대 제한 적용
- refresh/logout 동작 가능
- backend만이 subscription 상태를 기준으로 삼음
