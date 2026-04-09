# Auto Screen Billing MVP Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Auto Screen을 월 15,900원 구독제로 판매할 수 있도록 결제, 구독 상태, entitlement 갱신 흐름을 설계한다.

**Architecture:** 결제는 앱 내부가 아니라 랜딩페이지/웹 결제 화면에서 진행한다. backend는 Toss Payments billing key와 webhook을 기준으로 구독 상태를 단일 진실 공급원으로 유지하고, Electron 앱은 entitlement refresh만 수행한다.

**Tech Stack:** Toss Payments, backend API, Supabase Postgres, Electron external browser flow.

---

## Product Decision
- 플랜: `Pro Monthly`
- 가격: **월 15,900원**
- 통화: KRW
- 초기 플랜 수: 1개
- 구매 위치: 랜딩페이지 + 앱 내부 업그레이드 버튼
- 결제 완료 판정: **webhook 기준**

---

## Purchase Funnel
1. 사용자가 랜딩페이지 방문
2. 가격표에서 Pro 기능 확인
3. `다운로드` 또는 `지금 시작` 클릭
4. 앱 설치 후 로그인/회원가입
5. Free 상태면 앱 내부 `업그레이드` CTA 노출
6. 또는 웹 가격 페이지에서 바로 결제 시작
7. Toss 결제 성공
8. backend webhook 수신
9. subscription = `active`
10. 앱이 entitlement refresh
11. Pro 기능 즉시 해제

---

## Tables

### `subscriptions`
핵심 필드:
- `user_id`
- `provider = toss`
- `plan_code = pro_monthly_15900_krw`
- `status`
- `provider_customer_key`
- `provider_billing_key`
- `current_period_start`
- `current_period_end`
- `cancel_at`
- `canceled_at`

### `billing_events`
- `id uuid primary key`
- `provider text not null`
- `event_type text not null`
- `event_id text null`
- `user_id uuid null`
- `payload jsonb not null`
- `created_at timestamptz not null default now()`

이 테이블은 webhook 디버깅용으로 중요하다.

---

## Subscription Status Model

허용 상태:
- `inactive`
- `trialing`
- `active`
- `past_due`
- `canceled`
- `expired`
- `refunded`

### Entitlement mapping
- `active` → Pro entitlements 부여
- `trialing` → Pro entitlements 부여
- `past_due` → 짧은 grace period 허용 여부 선택
- `canceled` + 기간 남음 → 만료일까지 유지
- `expired` → Free 전환
- `refunded` → 정책에 따라 즉시 종료 또는 종료 예정 처리

MVP에서는 복잡도를 낮추려면:
- `active`, `trialing`만 Pro
- 나머지는 Free

---

## API Contract

### `POST /api/billing/checkout/session`
로그인한 사용자에게 결제 시작 URL 반환.

Request:
```json
{
  "planCode": "pro_monthly_15900_krw",
  "successUrl": "https://app.autoscreen.io/billing/success",
  "cancelUrl": "https://app.autoscreen.io/billing/cancel"
}
```

Response:
```json
{
  "checkoutUrl": "https://..."
}
```

### `POST /api/billing/webhooks/toss`
Toss webhook 수신 endpoint.

### `GET /api/billing/subscription`
현재 사용자의 구독 상태 조회.

Response:
```json
{
  "plan": "pro_monthly_15900_krw",
  "status": "active",
  "currentPeriodEnd": "2026-05-09T00:00:00.000Z"
}
```

### `POST /api/billing/refresh-entitlements`
앱에서 수동 새로고침 시 사용.

---

## Webhook Rules
- webhook 서명 검증 필수
- 동일 이벤트 중복 수신 대비 idempotency 필요
- subscription 상태 업데이트는 webhook만 수행
- 프론트 redirect success 화면만으로 활성화 처리 금지

### 저장해야 하는 것
- raw payload
- event type
- received time
- 처리 결과

---

## App Flow

### 앱 내부 업그레이드 버튼
- renderer가 `openExternalUrl(pricing or checkout URL)` 호출
- 결제는 브라우저에서 수행
- 성공 후 앱은 다음 중 하나:
  1. `구독 새로고침` 버튼
  2. 주기적 polling
  3. `autoscreen://billing/success` deep link

MVP 권장:
- **웹 결제 완료 → 앱에서 `구독 새로고침` 버튼**
- deep link billing success는 2차로 추가 가능

---

## Landing Page Pricing Copy (MVP)

### Free
- 기본 편집 기능
- 제한된 export
- 로그인 후 사용 가능

### Pro — 월 15,900원
- 고급 편집 기능
- MCP/AI 편집 기능
- 고급 export
- 향후 템플릿/클라우드 기능 우선 제공

주의:
- 아직 없는 기능은 과장 금지
- 현재 되는 기능 위주로 문구 작성

---

## Task Breakdown

### Task 1: billing schema 확정
**Files:**
- Create: `backend/src/db/sql/006_billing_events.sql`
- Modify: `backend/src/db/sql/003_subscriptions.sql`

### Task 2: checkout session endpoint 추가
**Files:**
- Create: `backend/src/routes/billing.ts`
- Create: `backend/src/services/subscription-service.ts`

### Task 3: Toss webhook 처리 추가
**Files:**
- Modify: `backend/src/routes/billing.ts`
- Modify: `backend/src/services/subscription-service.ts`

### Task 4: entitlement refresh endpoint 연결
**Files:**
- Modify: `backend/src/routes/entitlements.ts`
- Modify: `backend/src/services/entitlement-service.ts`

### Task 5: 앱 내부 upgrade CTA 연결
**Files:**
- Modify: `src/components/video-editor/VideoEditor.tsx`
- Modify: `src/features/auth/AuthUpgradeBanner.tsx`

### Task 6: pricing page / landing 연동
**Files:**
- Future web app files
- Doc first in `docs/plans/landing-page-funnel.md`

---

## Acceptance Criteria
- 월 15,900원 단일 구독 플랜이 문서/DB/API에 일관되게 반영된다
- checkout은 웹에서 시작된다
- webhook만이 구독 상태를 active로 바꾼다
- 앱은 entitlement refresh로 Pro 상태를 반영한다
- Free/Pro 문구가 랜딩페이지와 앱에서 일치한다
