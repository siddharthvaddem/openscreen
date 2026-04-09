# Auto Screen Local MCP Workflow

## 목표
Auto Screen을 **로컬 MCP 서버**로 실행하고, 터미널에서 실행한 **Codex CLI / Claude Code**가 편집 툴을 호출해 앱 상태를 바꾸는 흐름을 정리한 문서입니다.

## 현재 구현 범위
- Electron main 프로세스가 로컬 MCP 서버를 시작
- Bearer token 기반 로컬 인증
- Renderer editor controller가 구조화된 편집 명령 실행
- 현재 MCP tool
  - `get_project_state`
  - `remove_background`
  - `set_background`
  - `apply_auto_edit`
  - `add_trim_region`
  - `add_speed_region`
  - `add_zoom_region`
  - `undo`
  - `redo`
  - `export_video`

## 연결 정보 확인
앱 실행 후 main 로그에서 아래 값을 확인합니다.

- `Auto Screen MCP` → MCP URL
- `Auto Screen MCP Token` → Bearer token

예시:

```text
[Auto Screen MCP] http://127.0.0.1:43123/mcp
[Auto Screen MCP Token] <token>
```

## 검증 순서
앱 창을 불필요하게 자주 띄우지 않기 위해 아래 순서를 권장합니다.

### 1) 서버/인증만 먼저 확인
editor 창이 아직 없어도 아래 preflight는 확인할 수 있습니다.

```bash
node scripts/test-mcp-client.mjs <mcp-url> <token>
```

이 스크립트는 먼저 `GET /mcp/session`으로 preflight를 수행합니다.

### 2) 실제 편집 툴 검증
실제 mutation tool은 editor window가 있어야 안정적으로 동작합니다.

권장 방식:

```bash
AUTO_SCREEN_START_EDITOR=true npm run dev
```

그 다음 별도 터미널에서:

```bash
node scripts/test-mcp-mutations.mjs <mcp-url> <token>
node scripts/test-mcp-demo-once.mjs <mcp-url> <token>
```

## get_project_state 동작
현재 `get_project_state`는 아래 순서로 응답합니다.

1. editor window가 있으면 live command 실행
2. editor window가 없지만 publish된 최신 상태가 있으면 cached snapshot 반환
3. 둘 다 없으면 `state: null` 과 함께 안내 메시지 반환

즉, editor가 아직 안 열린 상태에서도 왜 비어 있는지 바로 알 수 있게 했습니다.

## Hermes / Codex / Claude Code 역할 분담
이 프로젝트에서는 세 에이전트를 아래처럼 씁니다.

### Hermes
- 작업 범위 정리
- 우선순위 결정
- 어떤 에이전트에게 어떤 일을 맡길지 지휘
- 최종 반영/정리

### Codex
- 코드 수정
- 빌드
- 테스트 스크립트 점검
- 런타임 재현과 수정

### Claude Code
- 구조 리뷰
- 세션/상태 흐름 점검
- 설계상 누락/리스크 확인
- 다음 리팩토링 우선순위 제안

## 실제 진행 로그 예시
- `[Hermes] MCP 인증 흐름부터 확인`
- `[Codex] electron/mcp/server.ts 수정`
- `[Claude Code] session/transport 구조 리뷰`
- `[Hermes] 두 결과를 합쳐 최소 수정 반영`

## 현재 남은 구조 개선 우선순위
1. HUD window와 editor window 참조 분리
2. state source of truth 정리 (`live` vs `cached`)
3. 세션 종료/재연결 로그와 관측성 더 보강

## session transport 구조 메모
현재 MCP 서버는 stateful session 모드로 동작합니다.

- initialize 요청마다 새 `server + transport` 쌍 생성
- `mcp-session-id` 헤더로 기존 세션 transport 재사용
- `GET /mcp`와 `DELETE /mcp`도 session id 기준으로 기존 transport에 라우팅
- 세션 종료 시 runtime cleanup helper로 server/transport 정리를 한 곳에서 처리

## 참고
현재 로컬 개발 단계에서는 URL/token이 로그에 출력됩니다. 이 값은 로컬 Bearer 인증 정보이므로 외부 공유는 피하는 것이 좋습니다.
