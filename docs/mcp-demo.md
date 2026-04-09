# Auto Screen MCP Demo

## 목표
터미널에서 실행한 Codex CLI / Claude Code가 Auto Screen 데스크톱 앱의 로컬 MCP 서버에 연결해 구조화된 편집 명령을 호출하고, 앱 UI에 실시간으로 결과가 반영되도록 한다.

## 현재 구조
- Auto Screen Electron main process가 localhost MCP 서버를 연다.
- renderer(VideoEditor)가 실제 편집 상태의 source of truth를 가진다.
- main ↔ renderer 는 typed IPC command bridge로 연결된다.
- 인증은 Auto Screen이 발급한 로컬 bearer token으로 한다.

## 현재 구현된 MCP tools
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

## 런타임 정보
앱 시작 시 Electron main 로그에 아래가 출력된다.
- `[Auto Screen MCP] http://127.0.0.1:<port>/mcp`
- `[Auto Screen MCP Token] <token>`

renderer에서는 `window.electronAPI.getMcpConnectionInfo()` 로도 조회 가능하다.

## Claude Code 연결 예시
MCP 서버를 Claude Code에 붙일 때는 streamable HTTP 엔드포인트와 bearer 토큰을 사용한다.
실제 연결 커맨드는 Claude Code 버전에 따라 다를 수 있으므로, 현재 설치 버전의 `claude mcp add --help` 기준으로 맞춘다.

개념 예시:
- URL: `http://127.0.0.1:<port>/mcp`
- Header: `Authorization: Bearer <token>`

## Codex 연결 예시
Codex도 동일하게 localhost MCP endpoint + bearer token을 사용한다.
Codex 쪽 실제 등록 명령은 설치 버전의 `codex mcp --help` 기준으로 맞춘다.

## 테스트 시나리오
1. Auto Screen 앱 실행
2. 기존 녹화본 또는 영상 파일 로드
3. MCP 클라이언트 연결
4. `get_project_state` 호출
5. `set_background` 호출
6. `add_trim_region`, `add_zoom_region`, `add_speed_region` 호출
7. `undo`, `redo` 호출
8. 필요 시 `apply_auto_edit`, `export_video` 호출

## 설계 원칙
- UI 클릭 자동화 금지
- 상태 기반/명령 기반 편집만 허용
- undo/redo 가능한 모든 편집은 renderer 상태 업데이트를 거친다.
- 향후 CapCut/Premiere 스타일 확장을 위해 command surface를 계속 늘린다.
