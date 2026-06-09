# macOS native cursor test pipeline

This document covers manual and diagnostic testing for macOS native cursor capture — the path that records real system cursor bitmaps via `NSCursor.currentSystem` and surfaces them through the OpenScreen editor and export pipeline.

## How the macOS cursor helper works

The helper binary (`openscreen-macos-cursor-helper`) runs as a child process of Electron during recording. It:

- polls `NSCursor.currentSystem` at the configured sample interval
- converts each cursor image to PNG and computes a SHA-256 content hash as a stable asset id
- emits the full base64 bitmap payload **once** per unique cursor shape per session; subsequent samples carry only the `assetId` so stdout stays small
- tracks left-button down/up events via `CGEventTap` and tags each sample with `interactionType`
- uses the Accessibility API to detect `text` and `pointer` affordances (link/button/input roles) when Accessibility is granted; these shapes use the bundled high-quality SVG replacements instead of the raw bitmap

Each sample line is newline-delimited JSON:

```json
{ "type": "ready", "timestampMs": 1234567890, "accessibilityTrusted": true, "mouseTapReady": true }
{ "type": "sample", "timestampMs": 1234567891, "assetId": "a7472...", "asset": { "id": "a7472...", "imageDataUrl": "data:image/png;base64,...", "width": 64, "height": 64, "hotspotX": 16, "hotspotY": 16, "scaleFactor": 2.0 }, "cursorType": null, "leftButtonDown": false, "leftButtonPressed": false, "leftButtonReleased": false }
{ "type": "sample", "timestampMs": 1234567924, "assetId": "a7472...", "cursorType": null, "leftButtonDown": false, "leftButtonPressed": false, "leftButtonReleased": false }
```

`asset` is present only the first time a given `assetId` appears. The TypeScript session (`MacNativeCursorRecordingSession`) collects unique assets into a map and sets `provider: "native"` in the final `CursorRecordingData` when at least one bitmap was captured.

## Build the helper

```bash
npm run build:native:mac
```

This builds both Swift helpers (`openscreen-screencapturekit-helper` and `openscreen-macos-cursor-helper`) and copies them to:

- `electron/native/screencapturekit/build/` — used by the local dev server
- `electron/native/bin/darwin-arm64/` or `darwin-x64/` — used by packaged builds

Requires Xcode (not just Command Line Tools). If you see a build error about missing SDK metadata, run:

```bash
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
```

## Smoke-test the helper directly

You can run the cursor helper standalone to inspect its raw output before involving the full app:

```bash
BIN=electron/native/screencapturekit/build/openscreen-macos-cursor-helper
("$BIN" '{"sampleIntervalMs":100}' & PID=$!; sleep 2; kill $PID) | head -20
```

Expected first line:

```json
{"type":"ready","mouseTapReady":true,"accessibilityTrusted":false,"timestampMs":...}
```

`accessibilityTrusted: false` is normal in dev/unsigned builds. It means text/pointer affordance detection is disabled; native bitmap capture still works.

Expected sample lines:

```json
{"type":"sample","assetId":"a7472...","asset":{"id":"a7472...","imageDataUrl":"data:image/png;base64,...","width":64,"height":64,"hotspotX":26,"hotspotY":16,"scaleFactor":2.0},...}
{"type":"sample","assetId":"a7472...",...}
```

Move the cursor over a text input while the helper is running and check that a new `assetId` appears with a different bitmap (if Accessibility is granted — see below).

## Point the app at a custom helper binary

```bash
export OPENSCREEN_MAC_CURSOR_HELPER_EXE=/path/to/openscreen-macos-cursor-helper
npm run dev
```

## macOS permissions

Two separate permissions are needed:

| Permission | What it enables | Where to grant |
|---|---|---|
| Screen Recording | ScreenCaptureKit video capture | System Settings → Privacy & Security → Screen & System Audio Recording → Electron ✅ |
| Accessibility | `text` / `pointer` cursor type detection (affordance hints) | System Settings → Privacy & Security → Accessibility → Electron ✅ |

**Screen Recording** is required to record. Without it the recording never starts.

**Accessibility** is optional. Without it, `cursorType` will always be `null` and all cursors render from their captured bitmaps (no SVG substitution). This is the expected fallback and does not degrade cursor quality for non-text/pointer shapes.

After granting either permission in System Settings, **fully quit and relaunch** the dev server — `getMediaAccessStatus` caches the result per-process.

## Manual test checklist

### P0 — core bitmap capture

- [ ] Record a short clip. Open the editor. Confirm the default arrow cursor is the real system arrow (not the bundled SVG approximation).
- [ ] Record while hovering over a web browser. Confirm custom-CSS cursors (e.g. `cursor: grab`, `cursor: crosshair`) appear as their actual shapes.
- [ ] Export to MP4. Confirm the cursor renders correctly in the exported video.
- [ ] Export to GIF. Same check.

### P1 — affordance substitution (requires Accessibility)

- [ ] Grant Accessibility permission and restart the app.
- [ ] Record hovering over a text input field. Confirm the text I-beam uses the bundled SVG version (prettier than the system bitmap).
- [ ] Record hovering over a link/button. Confirm the pointer hand uses the bundled SVG.

### P1 — hotspot alignment (Retina)

- [ ] On a Retina display, record a precise click on a small button. In the editor, confirm the cursor tip aligns with the actual click point. The helper reports `scaleFactor: 2.0`; the renderer divides pixel dimensions and hotspot by this value to recover point sizes.

### P1 — click detection

- [ ] Record several left-clicks. In the editor, confirm the click-bounce animation fires on each click.
- [ ] Confirm `interactionType: "click"` and `"mouseup"` events are present in the recording session sidecar (`cursorRecordingData` inside `<videoPath>.cursor.json`).

### P2 — graceful degradation

- [ ] Remove **both** build-output copies of the helper binary and start a recording. The session should succeed with `provider: "none"` (position-only telemetry, default arrow rendered). Restore both binaries afterward.
  ```bash
  ARCH=$([ "$(uname -m)" = "arm64" ] && echo darwin-arm64 || echo darwin-x64)
  mv electron/native/screencapturekit/build/openscreen-macos-cursor-helper /tmp/cursor-helper-build
  mv electron/native/bin/$ARCH/openscreen-macos-cursor-helper /tmp/cursor-helper-bin
  # ... start recording, then restore:
  mv /tmp/cursor-helper-bin electron/native/bin/$ARCH/openscreen-macos-cursor-helper
  mv /tmp/cursor-helper-build electron/native/screencapturekit/build/openscreen-macos-cursor-helper
  ```
- [ ] Revoke Accessibility. Confirm recording still works and cursors render from bitmaps (no SVG substitution).

### P2 — multi-display

- [ ] Move the cursor to a secondary display during recording. Confirm the cursor clips to the canvas edge rather than snapping invisible on fast swipes. Confirm it hides after ≈100 ms of sustained out-of-bounds movement.

### P2 — long recording memory

- [ ] Record for 3–5 minutes while switching between many apps (browser, terminal, editor). The helper should not grow in memory because each iteration drains Cocoa objects via `autoreleasepool`. Check `Activity Monitor` → `openscreen-macos-cursor-helper` RSS stays flat after the first few seconds.

## What a healthy recording looks like

Inspect the cursor sidecar file written alongside the recorded video (`<videoPath>.cursor.json`). For a recording saved to `/tmp/rec.mp4`, the sidecar is `/tmp/rec.mp4.cursor.json`:

```json
{
  "version": 2,
  "provider": "native",
  "assets": [
    { "id": "a7472...", "platform": "darwin", "imageDataUrl": "data:image/png;base64,...", "width": 64, "height": 64, "hotspotX": 26.0, "hotspotY": 16.0, "scaleFactor": 2.0 }
  ],
  "samples": [
    { "timeMs": 0, "cx": 0.42, "cy": 0.38, "visible": true, "assetId": "a7472...", "interactionType": "move" },
    ...
  ]
}
```

`provider: "native"` and a non-empty `assets` array confirm bitmap capture is active. If you see `provider: "none"` and `assets: []`, the helper was not found or exited before `ready`.

## Native macOS capture backend

The app routes macOS recordings through the ScreenCaptureKit helper (`openscreen-screencapturekit-helper`) when it is available, so the real system cursor is excluded from the video frame. The cursor position and bitmap are captured separately by the cursor helper and composited in the editor and export pipeline.

Current native availability rules:

- macOS 13 (Ventura) or newer
- `openscreen-screencapturekit-helper` binary is present
- Screen Recording permission is granted

Build both helpers locally:

```bash
npm run build:native:mac
```

For local diagnostics with a custom helper binary, use the environment override:

```bash
export OPENSCREEN_MAC_CURSOR_HELPER_EXE=/path/to/openscreen-macos-cursor-helper
npm run dev
```

## Known limitations

- **Intel (x86\_64) Macs**: the distributed helper is built for `darwin-arm64`. On Intel Macs, you need to build from source with `npm run build:native:mac` on the target machine.
- **Accessibility permission in unsigned/dev builds**: `getMediaAccessStatus("accessibility")` may not reflect the toggle state for unsigned Electron in dev mode. The helper will always probe and report `accessibilityTrusted` in its `ready` event — use that as the authoritative signal.
- **App-defined custom cursors (CGS layer)**: `NSCursor.currentSystem` captures the active AppKit cursor. Cursors set at the CoreGraphics/CGS layer by some games or GPU-accelerated apps may not be visible here. This is a known macOS API limitation.
