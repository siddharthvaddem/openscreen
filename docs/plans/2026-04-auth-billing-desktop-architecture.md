# Auto Screen Auth / Billing / Desktop Account Architecture Plan

> **For Hermes:** 이 문서는 Auto Screen을 유료 SaaS + 데스크톱 앱으로 판매하기 위한 인증/결제/계정 연동 기준안이다. 구현 전 이 문서를 source of truth로 사용한다.

**Goal:** Auto Screen 데스크톱 앱에 회원가입/로그인, 월 15,900원 구독 결제, 계정 기반 권한 제어를 붙여 실제 판매 가능한 구조를 만든다.

**Architecture:** Electron 앱은 클라이언트일 뿐이고, 인증/결제/구독 상태의 기준은 반드시 서버가 가진다. 로그인과 결제는 웹/외부 브라우저 중심으로 처리하고, 앱은 로그인 완료 후 서버에서 세션과 entitlement(권한)를 받아 기능을 해제한다.

**Tech Stack (Recommended MVP):**
- Electron + React (기존 앱)
- Auth: Supabase Auth
- Social Login: Google 우선, Kakao 2차, Naver 3차
- Backend/API: Next.js API 또는 Express 서버
- DB: Supabase Postgres
- Billing: Toss Payments 정기결제
- Desktop session: custom protocol deep link + server-issued token

---

## 1. 최종 권장 방향

### 추천 1안
**Supabase Auth + Backend(API) + Toss Payments 정기결제 + Electron 외부 브라우저 로그인**

이 조합을 추천하는 이유:
1. 현재 프로젝트는 **데스크톱 앱만 있고 서버가 없음**
2. 유료 판매 구조에서 가장 중요한 건
   - 로그인 UI가 아니라
   - **서버가 구독 상태를 단일 기준으로 관리하는 것**
3. 한국 사용자 대상 월 구독이라면 Stripe보다 **Toss Payments**가 운영상 자연스럽다
4. Electron 앱에서 OAuth/결제를 앱 내부 웹뷰로 처리하면 보안/심사/예외가 복잡해져서, **기본 브라우저 처리**가 더 안전하다

### 대안
**Firebase Auth + Backend + PortOne**

언제 고려하나:
- 카드 외 결제수단/PG 선택이 빨리 필요할 때
- 결제사 유연성이 더 중요할 때

단점:
- 인증/결제/서버 구성이 더 분산됨
- MVP 속도는 추천안보다 느릴 가능성이 높음

---

## 2. 로그인 방식 우선순위

### MVP 1차
반드시 먼저 넣을 것:
- 이메일 회원가입/로그인
- Google 로그인

### 2차
- Kakao 로그인

### 3차
- Naver 로그인

### 왜 이렇게 가야 하나
- Google은 구현/운영 난도가 제일 낮고 범용성이 높음
- Kakao는 한국 사용자에 가치가 크지만 초반부터 넣으면 예외 처리가 늘어남
- Naver는 B2C 초반 필수는 아님

### 결론
**소셜 로그인은 가능하다.**
다만 처음부터 Google/Kakao/Naver 3개를 동시에 넣는 건 MVP 속도를 늦춘다.

따라서 실제 권장 순서:
1. 이메일 + Google
2. Kakao
3. Naver

---

## 3. 결제 구조

### 요금제
- Pro Monthly
- 월 15,900원
- 기본 통화: KRW
- 상품 ID 예시: `pro_monthly_15900_krw`

### MVP 결제 모델
- 단일 유료 플랜 1개만 운영
- 연간 요금제는 나중
- 쿠폰/프로모션/팀플랜은 나중
- 무료 체험이 필요하면 7일 trial만 고려

### 추천 결제 방식
**Toss Payments 정기결제(빌링키 기반)**

서버가 해야 하는 일:
- 고객 생성/매핑
- 빌링키 저장
- 월 정기 청구 요청
- 결제 성공/실패 웹훅 처리
- 구독 상태 변경 반영

### 구독 상태 예시
- `trialing`
- `active`
- `past_due`
- `canceled`
- `expired`
- `refunded`

---

## 4. 서버가 반드시 가져야 하는 책임

이 기능은 **앱만으로 구현하면 안 된다.**
반드시 서버가 해야 하는 책임:

1. 사용자 계정 관리
2. 소셜 로그인/OAuth 콜백 처리
3. 결제 고객과 앱 계정 매핑
4. 구독 상태 저장
5. 결제 웹훅 수신 및 상태 반영
6. 앱이 사용할 세션 토큰 발급
7. entitlement 판정
   - 이 계정이 현재 Pro인가?
8. 기기 등록 및 제한
   - 예: 계정당 2대
9. 환불/해지 후 권한 종료 처리
10. 구매 복구 처리

### 절대 클라이언트(Electron 앱)에 넣으면 안 되는 것
- OAuth client secret
- 결제 secret key
- webhook secret
- DB admin key
- service role key
- 구독 상태를 변경할 수 있는 권한

---

## 5. 데스크톱 앱 + 계정 연동 흐름

### 로그인 흐름
1. 앱에서 `로그인` 클릭
2. Electron이 기본 브라우저로 `https://app.autoscreen.io/login?source=desktop` 오픈
3. 사용자가 웹에서 로그인 수행
4. 서버가 로그인 완료 후 `autoscreen://auth/callback?code=ONE_TIME_CODE` 로 리다이렉트
5. Electron main process가 deep link 수신
6. 앱이 이 one-time code를 서버 API로 보내서
   - desktop access token
   - refresh token
   - user summary
   - entitlement
   를 받음
7. 앱은 토큰을 OS Keychain에 저장
8. 앱은 entitlement 기준으로 기능 활성화

### 결제 흐름
1. 앱에서 `Pro 업그레이드` 클릭
2. Electron이 기본 브라우저로 `https://app.autoscreen.io/billing/checkout` 오픈
3. 사용자가 결제 완료
4. 서버가 결제 완료 및 webhook 확인 후 `subscription = active` 반영
5. 앱은
   - 즉시 polling 또는
   - 재로그인 없이 `Refresh subscription` 버튼
   으로 entitlement 갱신

### 앱 실행 시 검증 흐름
1. 저장된 refresh token 확인
2. 서버에 세션 갱신 요청
3. 서버가 현재 구독 상태 반환
4. 앱이 기능 잠금/해제 적용

---

## 6. 앱 권한(Entitlement) 모델

### Free
- 기본 편집 기능 제한적 사용
- 워터마크 또는 export 제한 가능
- 고급 자동 편집/AI/MCP 연동 기능 제한 가능

### Pro
- 전체 편집 기능
- 고급 export
- MCP/AI 편집 기능
- 향후 클라우드 기능/템플릿/동기화 확장 가능

### 권장 방식
앱은 단순히 `isPro`만 보지 말고 entitlement 배열로 받는 게 좋다.

예시:
```json
{
  "plan": "pro_monthly",
  "status": "active",
  "entitlements": [
    "export_hd",
    "mcp_editing",
    "advanced_auto_edit",
    "future_cloud_sync"
  ]
}
```

이렇게 하면 나중에 플랜이 늘어나도 구조가 버틴다.

---

## 7. 기기 제한 정책

### MVP 권장
- 계정당 2대 허용
- 새 기기 로그인 시 오래된 기기 로그아웃 또는 사용자 선택

### 서버 테이블 예시
- `devices`
  - `id`
  - `user_id`
  - `device_id`
  - `device_name`
  - `platform`
  - `last_seen_at`
  - `revoked_at`

### 왜 필요한가
유료 플랜을 월 구독으로 팔 때 계정 공유를 완전히 막기는 어렵지만,
**기기 제한 + 세션 갱신 + 서버 검증**만 해도 남용을 크게 줄일 수 있다.

---

## 8. 소셜 로그인 현실 판단

### Google
- 바로 넣기 좋음
- MVP 포함 권장

### Kakao
- 가능함
- 다만 공급자 등록/redirect/callback 처리 추가 필요
- MVP 직후 2차 권장

### Naver
- 가능함
- 하지만 우선순위는 낮음
- 실제 타깃에서 필요성이 확인되면 추가

### 결론
사용자 요청대로 **Google/Kakao/Naver 소셜 연동은 가능하다.**
하지만 **MVP는 이메일 + Google**으로 먼저 파는 게 가장 현실적이다.

---

## 9. 구현 우선순위 (MVP 순서)

### Phase 1 — 서버 뼈대
- Auth 서버/API 프로젝트 생성
- 사용자/구독/결제/기기 테이블 생성
- 환경변수/비밀키 분리

### Phase 2 — 로그인
- 이메일 회원가입/로그인
- Google 로그인
- desktop deep link 로그인 완료

### Phase 3 — 결제
- 월 15,900원 Pro 플랜 생성
- Toss 정기결제 checkout
- webhook 처리
- entitlement API

### Phase 4 — 데스크톱 연동
- 앱 로그인 상태 유지
- entitlement 동기화
- 업그레이드/구매복구 버튼

### Phase 5 — 한국형 확장
- Kakao 로그인
- Naver 로그인
- 고객센터/환불/해지 UX

---

## 10. 지금 바로 결정해야 하는 것

### 바로 결정 추천
1. **MVP 로그인은 이메일 + Google까지만 먼저 한다**
2. **결제는 Toss 정기결제 기준으로 간다**
3. **앱 첫 실행 화면은 로그인/회원가입 화면으로 시작한다**
4. **앱 내부 웹뷰 로그인 대신 외부 브라우저 + deep link로 간다**
5. **플랜은 월 15,900원 1개만 먼저 운영한다**
6. **랜딩페이지가 다운로드/가격/사용법 퍼널의 중심이 된다**

---

## 11. 다음 문서로 바로 이어질 것

1. `docs/plans/auth-backend-mvp.md`
   - backend DB/API 구조
2. `docs/plans/electron-auth-flow.md`
   - deep link / token storage / session refresh / 앱 첫 로그인 화면 설계
3. `docs/plans/billing-mvp.md`
   - Toss webhook / 구독 상태 / entitlement 설계
4. `docs/plans/landing-page-funnel.md`
   - 랜딩페이지 / 다운로드 / 가격 / 사용법 / 앱 진입 퍼널 설계

---

## 한 줄 결론

**지금은 “앱 안에 로그인 붙이기”보다 “서버를 세우고, 이메일+Google 로그인 + 웹 결제 + 서버 entitlement 구조를 먼저 만든다”가 정답이다.**
