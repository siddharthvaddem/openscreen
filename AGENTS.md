# Project Overview

OpenScreen — an Electron + React TypeScript desktop app for screen recording and lightweight video editing. It provides a HUD for quick recordings, an editor with crop/zoom/annotations, and export pipelines (MP4/GIF) that aim to match the editor preview. Primary stack: Electron (main + preload), Vite + React renderer, PixiJS for GPU composition, WebCodecs / web-demuxer for exporter decoding.

# Key Components

- electron/main.ts: app bootstrap, window lifecycle, RECORDINGS_DIR creation, tray/menu handling
- electron/preload.ts: contextBridge surface -> window.electronAPI (safe renderer API)
- electron/ipc/handlers.ts: registerIpcHandlers and concrete main-side implementations (file approval, storeRecordedSession, read-binary-file, cursor telemetry, save/load project)
- electron/i18n.ts: main-process synchronous i18n accessor (mainT, setMainLocale)

Renderer (src/):
- src/main.tsx / src/App.tsx: renderer bootstrap and windowType-based UI selection
- src/components/launch/LaunchWindow.tsx: HUD overlay UI and device controls (uses useScreenRecorder)
- src/components/launch/SourceSelector.tsx: desktop capture source pick UI (calls electronAPI.getSources/selectSource)
- src/hooks/useScreenRecorder.ts: recording lifecycle and persistence orchestration (createRecorderHandle, finalizeRecording)
- src/components/video-editor/VideoEditor.tsx: editor root — state, history, save/export orchestration (saveProject, handleExport)
- src/components/video-editor/VideoPlayback.tsx: PixiJS preview pipeline (layoutVideoContent, webcam sync)
- src/components/video-editor/settings & timeline: SettingsPanel.tsx, TimelineEditor.tsx, TimelineWrapper.tsx (drag/resize clamping)

Exporters / low-level libs:
- src/lib/exporter/streamingDecoder.ts: forward-pass demux + VideoDecoder -> produces VideoFrame stream & metadata
- src/lib/exporter/frameRenderer.ts: deterministic per-frame composition used by exporters
- src/lib/exporter/videoExporter.ts and gifExporter.ts: high-level export pipelines that wire decoder -> renderer -> encoder/muxer
- src/lib/compositeLayout.ts: canonical webcam + screen composition math used by playback & export
- src/components/video-editor/projectPersistence.ts: normalization & serialization for project files (toFileUrl/fromFileUrl, normalizeProjectEditor)

# Architecture

    [User] UI actions (HUD / Editor)
        │
        ▼
    Renderer (React) - App/UI components
        │ calls window.electronAPI (preload) <─
        │                                    │
        ▼                                    │
    Preload (contextBridge)                  │
        │ ipcRenderer.invoke/send              │ ipcMain.handle
        ▼                                    │
    Main process (electron/main.ts) ──> electron/ipc/handlers.ts
        │                                  │
        │ filesystem, dialogs, approvedPaths │
        ▼                                  ▼
    RECORDINGS_DIR, OS dialogs, cursor sampling, persist session manifests

Export flow (editor -> exporter):

    VideoEditor -> VideoExporter / GifExporter
      ├─ uses StreamingVideoDecoder (web-demuxer + WebCodecs)
      ├─ uses FrameRenderer to composite each frame
      └─ encodes via WebCodecs VideoEncoder (VideoExporter) or gif.js (GifExporter) -> muxer -> Blob

# Core Data Structures

- RecordingSession (src/lib/recordingSession.ts): schema for saved recordings (screen + optional webcam paths, cursor telemetry)
- Project file / EditorProjectData (src/components/video-editor/projectPersistence.ts:createProjectData, normalizeProjectEditor)
- CursorTelemetryPoint (electron/electron-env.d.ts): { timeMs, cx, cy }
- ProcessedDesktopSource (electron/electron-env.d.ts): desktop capture source shape returned by getSources
- CropRegion (src/components/video-editor/types.ts): normalized { x,y,width,height } in [0..1]
- AnnotationRegion / FigureData (src/components/video-editor/types.ts): annotation model used by AnnotationSettingsPanel.tsx
- WebcamSizePreset (number percent 10..50) + WEBCAM_LAYOUT_PRESET (src/lib/compositeLayout.ts)

# Control Flow (end-to-end)

1. App startup: electron/main.ts ensures RECORDINGS_DIR, creates HUD/editor windows via electron/windows.ts and calls registerIpcHandlers from electron/ipc/handlers.ts.
2. Renderer mounts App (src/App.tsx). WindowType determines which root component (HUD/SourceSelector/Editor) is rendered.
3. Record flow (HUD): LaunchWindow.tsx calls useScreenRecorder.startRecording which obtains getDisplayMedia/getUserMedia, creates MediaRecorder(s), collects chunks and when stopped calls electronAPI.storeRecordedSession (preload -> ipc handler storeRecordedSession persists files + manifest).
4. Main persists files, writes session manifest (RECORDING_SESSION_SUFFIX), approves paths and sets in-memory currentRecordingSession; then may call switchToEditor.
5. Editor load: VideoEditor.tsx loads session via window.electronAPI.getCurrentRecordingSession or set-current-video-path, normalizeProjectEditor populates editor state; VideoPlayback mounts Pixi preview via layoutVideoContent.
6. Export: VideoEditor builds export config -> VideoExporter/GifExporter uses StreamingVideoDecoder to stream decoded frames, FrameRenderer to composite, then encodes/muxes to final blob. Exports use robust readback (gl.readPixels / raster canvas) to avoid platform GPU sharing failures.

# Test-Driven Development

- Unit tests: vitest run via `npm run test` (vitest config: vitest.config.ts, jsdom env). Unit tests for modules under src/**.test.ts
- Browser/Playwright tests: `npm run test:browser` uses vitest browser config (vitest.browser.config.ts) and Playwright (SwiftShader flags for headless GL). E2E Playwright tests in tests/e2e.
- Useful commands (local):
  - Run unit tests: npm run test
  - Run browser tests: npm run test:browser (install dependencies: npm run test:browser:install)
  - Run e2e: npm run test:e2e

# Bash Commands

- Dev server: npm run dev
- Build renderer & electron packages: npm run build
- Build per-OS: npm run build:mac | npm run build:win | npm run build:linux
- Run vite build only: npm run build-vite
- Lint: npm run lint
- Fix lint/format: npm run lint:fix or npm run format
- Typecheck: npx tsc --noEmit
- Run unit tests: npm run test
- Run browser tests: npm run test:browser
- Init husky hooks: (prepare runs on install) npm run prepare

CI (GitHub Actions): .github/workflows/ci.yml runs lint, typecheck (npx tsc --noEmit), browser tests (playwright + vitest browser), and vite build. Separate build matrix in .github/workflows/build.yml builds installers for Windows/macOS/Linux via electron-builder.

# Code Style & Conventions

- TypeScript-first: run npx tsc --noEmit regularly. Keep electron-env.d.ts and src/vite-env.d.ts synced with preload.ts.
- Formatting & linting via Biome: `npm run lint` (check) and `npm run lint:fix` / `npm run format` (fix). package.json enforces biome in lint-staged.
- Avoid direct fs reads from renderer — always use window.electronAPI handlers declared in electron/preload.ts and typed in electron/electron-env.d.ts.
- Undoable editor state is managed via src/hooks/useEditorHistory.ts: use updateState/commitState for live drags.

# CI Matrix

- Lint job: biome check
- Typecheck job: npx tsc --noEmit
- Test job: Playwright + vitest browser tests (installs chromium headless shell), runs tests defined by vitest.browser.config.ts
- Build job: npx vite build
- Build workflow (manual dispatch): builds platform installers on Windows/macOS/Linux with electron-builder and uploads artifacts

# Gotchas (do not forget)

- Keep preload API, ipc handlers and ambient types synchronized:
  - electron/preload.ts ↔ electron/ipc/handlers.ts ↔ electron/electron-env.d.ts ↔ src/vite-env.d.ts
  - Missing sync causes runtime missing methods in packaged app or TypeScript errors in dev.
- IPC path security: electron/ipc/handlers.ts enforces approvedPaths and normalizeVideoSourcePath; do not bypass approveReadableVideoPath — direct fs reads of renderer-supplied paths open path traversal risks.
- Exporter platform quirks:
  - Don't assume canvas -> VideoFrame or drawImage(canvas) works on all platforms. Use the explicit readback path (FrameRenderer + readPixels / rasterCanvas) to avoid green/empty frames on Linux/Wayland.
  - AV1 codec strings returned by web-demuxer may be bare 'av01'; preserve buildAV1CodecString in src/lib/exporter/streamingDecoder.ts to synthesize a proper codec string for WebCodecs.
- Cursor telemetry sampling: electron/ipc/handlers.ts samples cursor on a timed loop and writes pendingCursorSamples; changing MAX_CURSOR_SAMPLES or the sampling lifecycle can leak intervals if stopCursorCapture isn't robust.
- Layout parity: compositeLayout math is authoritative — if changing webcam sizing/geometry update both computeCompositeLayout (src/lib/compositeLayout.ts) and FrameRenderer usage to keep preview/export consistent.
- History & commit semantics: useEditorHistory.ts intentionally excludes selection IDs; do not add ephemeral selection into undoable EditorState.

# Pattern Examples (good references)

- electron/ipc/handlers.ts:approveReadableVideoPath — path approval & validation pattern (whitelist, canonicalize)
- electron/preload.ts:storeRecordedSession — secure contextBridge wrapper exposing typed IPC calls
- src/hooks/useScreenRecorder.ts:finalizeRecording — idempotent recording finalization and storeRecordedSession interaction
- src/lib/exporter/streamingDecoder.ts:buildAV1CodecString & decodeAll — robust demux + VFR→CFR resampling and timeout guarding
- src/lib/exporter/frameRenderer.ts:renderFrame — deterministic GPU+CPU composition and readback fallback
- src/components/video-editor/projectPersistence.ts:normalizeProjectEditor — deterministic snapshot normalization for persistence and unsaved-change diffs
- src/components/video-editor/timeline/TimelineWrapper.tsx:clampToNeighbours — neighbor-aware snapping & tooltip DOM updates (perf-minded)

# Common Mistakes & Fixes

- Symptom: Renderer calls window.electronAPI.<fn> exists in dev but crashes in production.
  - Fix: Verify preload exposes that channel and update electron/electron-env.d.ts and src/vite-env.d.ts to match. Ensure electron/preload.ts invokes ipcRenderer.invoke('channel') and main registered handler exists.

- Symptom: Exported frames are green/blank on Linux CI.
  - Fix: Use explicit readback in FrameRenderer (gl.readPixels -> rasterCanvas) or create VideoFrame from ImageData buffer before encoding (see FrameRenderer and VideoExporter readback code).

- Symptom: Loading a project with legacy videoPath fails to find media.
  - Fix: Use resolveProjectMedia/fromFileUrl utilities in projectPersistence to accept legacy videoPath or normalized media object.

- Symptom: Many noisy undo entries when dragging sliders
  - Fix: Use updateState during drag and commitState after end (useEditorHistory.ts contract). Preserve on*Commit handlers in SettingsPanel.tsx.

# Invariants (must hold)

- RECORDINGS_DIR exists and is used by main for all persisted recording files
- Approved file reads happen only after normalizeVideoSourcePath + isPathAllowed / approveReadableVideoPath
- normalizeProjectEditor must produce deterministic snapshots used by hasProjectUnsavedChanges
- FrameRenderer layout math must match computeCompositeLayout used by VideoPlayback for WYSIWYG exports
- StreamingVideoDecoder must always close VideoFrames and destroy demuxer/decoder on error or cancel

# Anti-patterns (avoid these)

- Do not fs.readFile(renderer-supplied path) directly in renderer code — always go through electron IPC approval flow.
- Do not rely on HTMLVideoElement per-frame seeking for export — use StreamingVideoDecoder for deterministic, efficient exports.
- Avoid React state for high-frequency per-frame flags (use refs for motionBlurEnabledRef etc. in VideoPlayback)
- Don’t mutate history present object in-place — always return new objects in useEditorHistory updates

# Notes for Contributors

- Run linting & typecheck before PR: npm run lint && npx tsc --noEmit
- Run browser tests locally when modifying exporter/FrameRenderer: npm run test:browser (install with npm run test:browser:install)
- For macOS packaging tests use the build workflow and read README macOS notes (Gatekeeper xattr workaround)

---

If you need a quick pointer for a change you plan to make, tell me the target file/feature and I will list the most sensitive co-change locations and tests to run.

# Verification Checklist

- Run the full test matrix locally or in CI
- Confirm failing test fails before fix, passes after
- Run linters and formatters

# Test Integrity

- NEVER modify existing tests to make your implementation pass
- If a test fails after your change, fix the implementation, not the test
- Only modify tests when explicitly asked to, or when the test itself is demonstrably incorrect

# Suggestions for Thorough Investigation

When working on a task, consider looking beyond the immediate file:
- Test files can reveal expected behavior and edge cases
- Config or constants files may define values the code depends on
- Files that are frequently changed together (coupled files) often share context

# Must-Follow Rules

1. Work in short cycles. In each cycle: choose the single highest-leverage next action, execute it, verify with the strongest available check (tests, typecheck, run, lint, or a minimal repro), then write a brief log entry of what changed + what you'll do next.
2. Prefer the smallest change that can be verified. Keep edits localized, avoid broad formatting churn, and structure work so every change is easy to revert.
3. If you're missing information (requirements, environment behavior, API contracts), do not assume. Instead: inspect code, read docs in-repo, run a targeted experiment, add temporary instrumentation, or create a minimal reproduction to learn the truth quickly.


# Index Files

I have provided an index file to help navigate this codebase:
- `.codex/docs/general_index.md`

The file is organized by directory (## headers), with each file listed as:
`- `filename` - short description. Key: `construct1`, `construct2` [CATEGORY]`

You can grep for directory names, filenames, construct names, or categories (TEST, CLI, PUBLIC_API, GENERATED, SOURCE_CODE) to quickly find relevant files without reading the entire index.

**MANDATORY RULE — NO EXCEPTIONS:** After you read, reference, or consider editing a file or folder, you MUST run:
`python .codex/docs/get_context.py <path>`

This works for **both files and folders**:
- For a file: `python .codex/docs/get_context.py <file_path>`
- For a folder: `python .codex/docs/get_context.py <folder_path>`

This is a hard requirement for EVERY file and folder you touch. Without this, you'll miss recent important information and your edit will likely fail verification. Do not skip this step. Do not assume you already know enough. Do not batch it "for later." Do not skip files even if you have obtained context about a parent directory. Run it immediately after any other action on that path.

The command returns critical context you cannot infer on your own:

**For files:**
- Edit checklist with tests to run, constants to check, and related files
- Historical insights (past bugs, fixes, lessons learned)
- Key constructs defined in the file
- Tests that exercise this file
- Related files and semantic overview
- Common pitfalls

**For folders:**
- Folder role and responsibility in the codebase
- Key files and why they matter
- Cross-cutting behaviors across the subtree
- Distilled insights from every file in that folder

**Workflow (follow this exact order every time):**
1. Identify the file or folder you need to work with.
2. Run `python .codex/docs/get_context.py <path>` and read the output.
3. Only then proceed to read, edit, or reason about it.

If you need to work with multiple paths, run the command for each one before touching any of them.

**Violations:** If you read or edit a file or folder without first running get_context.py on it, you are violating a project-level rule. Stop, run the command, and re-evaluate your changes with the new context.



---
*This knowledge base was extracted by [Codeset](https://codeset.ai) and is available via `python .codex/docs/get_context.py <file_or_folder>`*
