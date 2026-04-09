# Auto Screen 가입 및 무료 플랜 악용 방지 정책

## 가입 필수 항목
- 아이디
- 비밀번호
- 성
- 이름
- 이메일
- 휴대폰 번호
- 문자 인증 코드
- 필수 약관 동의

## 가입 단계
1. 아이디 입력
2. 성 / 이름 입력
3. 이메일 입력
4. 휴대폰 번호 입력
5. 문자 인증 요청
6. 인증 코드 확인
7. 비밀번호 입력
8. 약관 동의
9. 계정 생성

## 무료 플랜 지급 기준
- 휴대폰 인증 완료 계정만 무료 플랜 시작 가능
- 기본값은 휴대폰 번호당 1회
- 디바이스 식별자당 1회 제한을 추가 권장
- 같은 IP 대역 반복 가입은 별도 모니터링 필요

## 서버 저장 권장 항목
- user_id
- username
- email
- family_name
- given_name
- phone_number
- phone_verified_at
- accepted_terms_at
- accepted_privacy_at
- accepted_marketing_at
- signup_ip
- signup_device_id
- first_free_trial_granted_at
- free_trial_grant_count

## 문자 인증 운영 메모
- 국내 판매 기준 Solapi 우선 검토
- 인증번호는 3분 만료 권장
- 재요청 30초 제한
- 인증 실패 5회 초과 시 재발송 필요
- 인증 완료 토큰은 짧은 TTL로 서버 저장

## 지금 구현 상태
- 데스크톱 앱 내부 회원가입 폼 확장 완료
- 로컬 문자 인증 요청/확인 스켈레톤 완료
- 백엔드 phone request/verify 스켈레톤 추가 완료
- 디바이스 식별자 생성 및 가입 payload 연결 완료
- 서버형 signup/login API 스켈레톤 추가 완료
- DB SQL 초안에 phone verification / signup audit / agreements / free trial grant 추가 완료
- 실서비스용 SMS 공급자 연동은 아직 미구현
