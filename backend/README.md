# Auto Screen Backend MVP Skeleton

현재 폴더는 Auto Screen의 계정/구독/entitlement 서버 뼈대입니다.

## 목표
- 이메일 + Google 로그인
- 이후 Kakao / Naver 확장
- Toss 월 15,900원 구독
- Electron desktop session exchange
- entitlement 기반 Free / Pro 기능 분기

## 예정 엔드포인트
- `GET /health`
- `GET /api/config/public`
- `POST /api/auth/desktop/exchange`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/phone/request`
- `POST /api/auth/phone/verify`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/admin/storage/status`
- `GET /api/admin/signup-audit`
- `POST /api/billing/checkout/session`
- `POST /api/billing/webhooks/toss`
- `GET /api/billing/subscription`
- `GET /api/entitlements`

## 판매형 가입 정책 메모
- 회원가입 필수 항목: 아이디 비밀번호 성 이름 이메일 휴대폰 번호
- 무료 플랜은 휴대폰 인증 완료 기준으로 1회 지급
- 디바이스 식별자와 IP를 같이 저장해서 반복 악용 탐지
- 문자 인증 공급자는 국내 기준 Solapi 우선 검토
- 약관 동의는 필수/선택 분리 저장 필요

## 실행 예시
```bash
cd backend
npm install
npm run dev
```

## 현재 상태
- Express 앱 뼈대 생성 완료
- 파일 기반 서버 저장소로 signup login phone verification 동작 가능
- Solapi dry run 기본값으로 개발 모드 인증 코드 미리보기 가능
- 실제 Postgres 연결, OAuth, Toss, deep link exchange는 다음 단계에서 구현

## 인증 개발 메모
- 서버 저장 파일 경로: `backend/data/auth-store.json`
- 기본은 `SMS_DRY_RUN=true` 이라서 실제 문자 대신 코드 미리보기를 반환
- 실문자 전환 시 아래 환경변수 필요
  - `SMS_DRY_RUN=false`
  - `SMS_SENDER`
  - `SMS_API_KEY`
  - `SMS_API_SECRET`
  - 선택 `SMS_API_BASE_URL`
- Postgres 준비 상태 확인용 환경변수
  - `DATABASE_URL`
  - 선택 `DATABASE_SSL=true`
- `DATABASE_URL` 이 있으면 인증 쓰기는 Postgres 경로를 우선 사용
- 관리자 조회 보호가 필요하면
  - `ADMIN_API_TOKEN`
