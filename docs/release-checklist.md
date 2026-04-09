# Auto Screen release checklist

## 목표 산출물
- macOS Apple Silicon: `Auto Screen-<version>-mac-arm64.dmg`
- macOS Intel: `Auto Screen-<version>-mac-x64.dmg`
- macOS updater metadata: `Auto Screen-<version>-mac-<arch>.zip`, `*.blockmap`, `latest-mac.yml`
- Windows x64: `Auto Screen-<version>-win-x64.exe`
- Windows updater metadata: `latest.yml`
- Linux AppImage: `Auto Screen-<version>-linux-x64.AppImage`
- Linux Debian/Ubuntu: `Auto Screen-<version>-linux-x64.deb`
- Linux updater metadata: `latest-linux.yml`

## 권장 빌드 호스트
- macOS DMG: macOS
- Windows EXE: Windows
- Linux AppImage/DEB: macOS 또는 Linux

## 현재 검증 상태
- macOS x64 DMG: 검증 완료
- macOS arm64 DMG: 검증 완료
- Linux AppImage: 검증 완료
- Linux DEB: 검증 완료
- Windows EXE: 설정 완료, Windows 호스트에서 최종 빌드 필요

## 빌드 명령
```bash
npm run build:mac:x64
npm run build:mac:arm64
npm run build:win:x64
npm run build:linux:x64
```

## GitHub Actions 릴리즈 플로우
- 수동 검증 빌드: `Build Electron App` workflow를 `workflow_dispatch`로 실행
- 정식 릴리즈: `v*` 태그 푸시 예) `v1.3.0`
- 태그 릴리즈 전 확인: `package.json` 버전과 태그 버전이 정확히 일치해야 함

수동 실행 시에는 각 OS 산출물이 workflow artifact로 업로드되고, 태그 푸시 시에는 GitHub Releases에 설치 파일과 업데이트 메타데이터가 게시된다.

## 릴리즈 정리
빌드 후 unpacked 디렉터리와 이전 이름 파일을 제거한다.

```bash
npm run release:clean
npm run release:artifacts
```

## 업로드 전 확인
- release/<version>/ 안에 최종 파일만 남아 있는지 확인
- macOS `.dmg` / `.zip` / `.blockmap` / `latest-mac.yml` 확인
- Windows `.exe` / `latest.yml` 확인
- Linux `.AppImage` / `.deb` / `latest-linux.yml` 확인
- 테스트 계정/개발용 문구 노출 없는지 확인
- 로그인/회원가입/복구 플로우 확인
- MCP 설정 팝업에서 토큰 복사/재발급 동작 확인
- macOS 권한 안내 문구 확인
- 배포 채널에 업로드할 파일명과 README 설명 일치 확인

## 상용 배포 전 남은 것
- Windows 코드사인 인증서 적용
- macOS notarization 적용
- GitHub Releases 공개 상태 및 첨부 파일 확인
- 자동 업데이트 메타데이터 사용 여부 최종 결정
