# General Index

## Root

- `biome.json` - Biome configuration for formatting and linting the repository [CONFIG]
- `components.json` - Configuration for UI component generator (shadcn/ui) and Tailwind integration [CONFIG]
- `electron-builder.json5` - Electron Builder configuration for packaging installers [BUILD]
- `index.html` - Renderer HTML entry that mounts the React app. Key: `root`, `/src/main.tsx` [SOURCE_CODE]
- `package.json` - npm package metadata, scripts and dependencies [CONFIG]
- `playwright.config.ts` - Playwright test runner configuration for end-to-end tests. Key: `defineConfig` [CONFIG]
- `postcss.config.cjs` - PostCSS configuration enabling Tailwind CSS and autoprefixer [CONFIG]
- `tailwind.config.cjs` - Tailwind CSS configuration including theme extensions and animations [CONFIG]
- `tsconfig.json` - TypeScript compiler settings for the renderer and electron sources [CONFIG]
- `tsconfig.node.json` - Node/Vite TypeScript config used for build tooling files [CONFIG]
- `vite.config.ts` - Vite build configuration that wires React and Electron entry points and controls bundling/minification.. Key: `defineConfig`, `electron`, `react`, `manualChunks` [BUILD]
- `vitest.browser.config.ts` - Vitest configuration for running browser-mode tests with Playwright/Chromium and WebGL support.. Key: `defineConfig`, `playwright`, `path` [CONFIG]
- `vitest.config.ts` - Vitest configuration that sets test environment, file globs, and a resolve alias for the test runner.. Key: `defineConfig` [CONFIG]

## electron/

- `electron-env.d.ts` - Ambient TypeScript declarations for Electron main/preload environment and window.electronAPI. Key: `NodeJS.ProcessEnv`, `Window`, `ProcessedDesktopSource`, `CursorTelemetryPoint` [CONFIG]
- `i18n.ts` - A minimal synchronous i18n helper for the Electron main process using the renderer's JSON locale files. Key: `messages`, `setMainLocale`, `getMainLocale`, `getMessageValue`, `interpolate` [SOURCE_CODE]
- `main.ts` - Electron main process: app lifecycle, window & tray management, IPC registration, permissions, and recordings dir bootstrapping. Key: `RECORDINGS_DIR`, `ensureRecordingsDir`, `VITE_DEV_SERVER_URL`, `MAIN_DIST`, `RENDERER_DIST` [SOURCE_CODE]
- `preload.ts` - ContextBridge exposing typed electronAPI methods to renderer for IPC communication. Key: `hudOverlayHide`, `hudOverlayClose`, `getAssetBasePath`, `getSources`, `startNewRecording` [SOURCE_CODE]
- `windows.ts` - Factory functions to create and configure Electron BrowserWindow instances (HUD, editor, source selector).. Key: `__dirname`, `APP_ROOT`, `VITE_DEV_SERVER_URL`, `RENDERER_DIST`, `HEADLESS` [SOURCE_CODE]

## electron/ipc/

- `handlers.ts` - Main-process IPC handlers for filesystem, recording session, project persistence, cursor telemetry and OS interactions. Key: `PROJECT_FILE_EXTENSION`, `SHORTCUTS_FILE`, `RECORDING_SESSION_SUFFIX`, `ALLOWED_IMPORT_VIDEO_EXTENSIONS`, `approveFilePath` [SOURCE_CODE]

## public/wasm/

- `web-demuxer.wasm` - Compiled WebAssembly demuxer binary for media decoding [GENERATED]

## scripts/

- `i18n-check.mjs` - CLI script to validate parity of translation keys across locales [CLI]

## src/

- `App.css` - Small demo app CSS for root layout and logo styles. Key: `#root`, `.logo` [SOURCE_CODE]
- `App.tsx` - Root React component that picks which UI window to render and initializes fonts/backgrounds.. Key: `App`, `content` [SOURCE_CODE]
- `index.css` - Global Tailwind base styles, variables, and UI utilities. Key: `:root / .dark variables`, `input[type="range"]` [SOURCE_CODE]
- `main.tsx` - Renderer app bootstrap: mounts the React App into the DOM and provides i18n context. Key: `ReactDOM`, `createRoot`, `I18nProvider`, `App` [SOURCE_CODE]
- `vite-env.d.ts` - Renderer-side ambient types including Vite and electron API surface for in-browser development. Key: `ProcessedDesktopSource`, `CursorTelemetryPoint`, `Window` [CONFIG]

## src/assets/

- `react.svg` - React logo SVG asset used in the app [DATA]

## src/components/launch/

- `LaunchWindow.module.css` - CSS classes for Electron window drag/no-drag regions. Key: `electronDrag`, `electronNoDrag` [SOURCE_CODE]
- `LaunchWindow.tsx` - React HUD / launcher UI for starting/stopping recordings, selecting devices and switching to the editor.. Key: `LaunchWindow`, `ICON_CONFIG`, `getIcon`, `hudGroupClasses`, `hudIconBtnClasses` [SOURCE_CODE]
- `SourceSelector.module.css` - Styling for the source selector UI and selectable source cards. Key: `.glassContainer`, `.sourceCard`, `.selected`, `.checkBadge`, `.sourceGridScroll` [SOURCE_CODE]
- `SourceSelector.tsx` - React component that fetches desktop capture sources and renders a selectable source selector UI.. Key: `DesktopSource`, `SourceSelector`, `renderSourceCard`, `handleSourceSelect`, `handleShare` [SOURCE_CODE]

## src/components/ui/

- `accordion.tsx` - Accordion UI primitives using Radix with styling. Key: `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent` [SOURCE_CODE]
- `audio-level-meter.tsx` - Compact audio level meter visual component. Key: `AudioLevelMeter`, `getBarColor`, `bars` [SOURCE_CODE]
- `button.tsx` - Themed button component with variant system. Key: `buttonVariants`, `Button` [SOURCE_CODE]
- `card.tsx` - Card layout primitives for consistent panels. Key: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` [SOURCE_CODE]
- `content-clamp.tsx` - Truncates long text and shows full content in a popover on hover. Key: `ContentClamp` [SOURCE_CODE]
- `dialog.tsx` - Styled dialog/modal primitives built on Radix UI. Key: `DialogContent`, `DialogOverlay`, `DialogTitle` [SOURCE_CODE]
- `dropdown-menu.tsx` - Comprehensive dropdown menu primitives using Radix. Key: `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioItem` [SOURCE_CODE]
- `input.tsx` - Styled input React component with forwarded ref. Key: `Input` [SOURCE_CODE]
- `item-content.tsx` - Reusable styled container for item content. Key: `ItemContent` [SOURCE_CODE]
- `label.tsx` - Accessible label component with consistent styling. Key: `Label` [SOURCE_CODE]
- `popover.tsx` - Radix-based popover primitives with project styles. Key: `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverAnchor`, `PopoverArrow` [SOURCE_CODE]
- `select.tsx` - Composable Select primitives built on Radix with styling. Key: `Select`, `SelectTrigger`, `SelectContent`, `SelectItem` [SOURCE_CODE]
- `slider.tsx` - Styled slider input built on Radix Slider. Key: `Slider` [SOURCE_CODE]
- `sonner.tsx` - Configured toast/toaster wrapper around Sonner. Key: `Toaster` [SOURCE_CODE]
- `switch.tsx` - Styled Radix Switch wrapper component. Key: `Switch` [SOURCE_CODE]
- `tabs.tsx` - Styled Tabs primitives using Radix Tabs. Key: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` [SOURCE_CODE]
- `toggle-group.tsx` - Toggle group wrapper providing size/variant context. Key: `ToggleGroup`, `ToggleGroupItem` [SOURCE_CODE]
- `toggle.tsx` - Configurable toggle button with variant and size variants. Key: `toggleVariants`, `Toggle` [SOURCE_CODE]
- `tooltip.tsx` - Tooltip primitives built on Radix with consistent styling. Key: `TooltipProvider`, `Tooltip`, `TooltipContent` [SOURCE_CODE]

## src/components/video-editor/

- `AddCustomFontDialog.tsx` - Dialog to add Google Fonts as custom project fonts. Key: `AddCustomFontDialog`, `handleImportUrlChange`, `handleAdd` [SOURCE_CODE]
- `AnnotationOverlay.tsx` - Draggable, resizable annotation overlay component for editor canvas. Key: `AnnotationOverlay` [SOURCE_CODE]
- `AnnotationSettingsPanel.tsx` - React settings panel UI for viewing and editing a single annotation's type, content and style. Key: `AnnotationSettingsPanelProps`, `AnnotationSettingsPanel`, `FONT_FAMILIES`, `FONT_SIZES`, `handleImageUpload` [SOURCE_CODE]
- `ArrowSvgs.tsx` - Inline SVG arrow components for eight directions. Key: `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `getArrowComponent` [SOURCE_CODE]
- `CropControl.tsx` - Interactive crop UI over a video canvas that exposes a normalized crop region.. Key: `CropRegion`, `CropControlProps`, `DragHandle`, `CropControl`, `handlePointerDown` [SOURCE_CODE]
- `ExportDialog.tsx` - React component that displays export progress, errors, and success for MP4/GIF exports. Key: `ExportDialogProps`, `ExportDialog`, `getStatusMessage`, `getTitle` [SOURCE_CODE]
- `FormatSelector.tsx` - UI control to pick export format (mp4 or gif). Key: `FormatSelector`, `formatOptions` [SOURCE_CODE]
- `GifOptionsPanel.tsx` - UI panel for configuring GIF export options. Key: `GifOptionsPanel` [SOURCE_CODE]
- `KeyboardShortcutsHelp.tsx` - React component that renders a hover-help popup showing keyboard shortcuts and a link to customize them. Key: `KeyboardShortcutsHelp` [SOURCE_CODE]
- `PlaybackControls.tsx` - React playback control bar for editor: play/pause, seek, time display, optional fullscreen.. Key: `PlaybackControls`, `PlaybackControlsProps`, `formatTime`, `handleSeekChange` [SOURCE_CODE]
- `SettingsPanel.tsx` - React settings sidebar for the video editor exposing UI to control wallpaper, crop, webcam, export and visual settings. Key: `CustomSpeedInput`, `WALLPAPER_COUNT`, `WALLPAPER_RELATIVE`, `GRADIENTS`, `ZOOM_DEPTH_OPTIONS` [SOURCE_CODE]
- `ShortcutsConfigDialog.tsx` - Dialog UI to view, capture, resolve conflicts, and persist keyboard shortcuts. Key: `ShortcutsConfigDialog`, `findConflict`, `formatBinding` [SOURCE_CODE]
- `TutorialHelp.tsx` - Dialog presenting an editing tutorial and visual examples. Key: `TutorialHelp` [SOURCE_CODE]
- `VideoEditor.tsx` - Main React component for the video editor UI: load/save project, manage editor state, playback controls, and export workflow.. Key: `VideoEditor`, `applyLoadedProject`, `currentProjectMedia`, `saveProject`, `hasUnsavedChanges` [SOURCE_CODE]
- `VideoPlayback.tsx` - Preview component that renders the video + webcam overlay using PixiJS, handles per-frame transforms (zoom/focus), motion blur, trims, speed regions and user interactions.. Key: `VideoPlayback`, `VideoPlaybackRef`, `layoutVideoContent`, `updateFocusFromClientPoint`, `handleWebcamPointerDown` [SOURCE_CODE]
- `index.ts` - Barrel exports for video editor components. Key: `PlaybackControls`, `SettingsPanel`, `TimelineEditor`, `VideoEditor`, `VideoPlayback` [SOURCE_CODE]
- `projectPersistence.test.ts` - Tests for project persistence, compatibility and snapshotting. Key: `createProjectData`, `validateProjectData`, `resolveProjectMedia`, `createProjectSnapshot`, `hasProjectUnsavedChanges` [TEST]
- `projectPersistence.ts` - Normalize, validate and serialize editor project data and helper utilities for file URLs and id generation. Key: `WALLPAPER_PATHS`, `PROJECT_VERSION`, `toFileUrl`, `fromFileUrl`, `deriveNextId` [SOURCE_CODE]
- `types.ts` - Type definitions, defaults, and utility clamps for editor features: webcam, zoom, annotations, crop and playback.. Key: `WebcamSizePreset`, `DEFAULT_WEBCAM_SIZE_PRESET`, `DEFAULT_WEBCAM_LAYOUT_PRESET`, `DEFAULT_WEBCAM_MASK_SHAPE`, `DEFAULT_WEBCAM_POSITION` [SOURCE_CODE]

## src/components/video-editor/timeline/

- `Item.tsx` - React timeline item component used by the video editor to render zoom/trim/speed/annotation items with drag/resize handles and a compact time label.. Key: `ZOOM_LABELS`, `formatMs`, `Item` [SOURCE_CODE]
- `KeyframeMarkers.tsx` - Interactive keyframe marker rendering and drag-to-move logic. Key: `KeyframeMarkers` [SOURCE_CODE]
- `Row.tsx` - Timeline row wrapper component used by dnd-timeline. Key: `Row` [SOURCE_CODE]
- `Subrow.tsx` - Styled subrow container used in timeline rows. Key: `Subrow` [SOURCE_CODE]
- `TimelineEditor.tsx` - React timeline editor for video projects: renders rows (zoom/trim/annotation/speed), handles interactions, keyboard shortcuts and zoom suggestions. Key: `TimelineEditorProps`, `SCALE_CANDIDATES`, `calculateAxisScale`, `calculateTimelineScale`, `createInitialRange` [SOURCE_CODE]
- `TimelineWrapper.tsx` - React wrapper that wires dnd-timeline interactions, clamping logic, and a live DOM tooltip for editing timeline spans.. Key: `TimelineWrapper`, `clampSpanToBounds`, `clampRange`, `clampToNeighbours`, `onResizeEnd` [SOURCE_CODE]
- `zoomSuggestionUtils.ts` - Detects cursor dwell regions to propose zoom suggestions. Key: `MIN_DWELL_DURATION_MS`, `MAX_DWELL_DURATION_MS`, `DWELL_MOVE_THRESHOLD`, `normalizeCursorTelemetry`, `detectZoomDwellCandidates` [SOURCE_CODE]

## src/components/video-editor/videoPlayback/

- `constants.ts` - Constants for zoom, smoothing, and transition timing in playback. Key: `DEFAULT_FOCUS`, `TRANSITION_WINDOW_MS`, `SMOOTHING_FACTOR` [SOURCE_CODE]
- `cursorFollowUtils.ts` - Interpolation and smoothing helpers for cursor-follow zooming. Key: `interpolateCursorAt`, `smoothCursorFocus`, `adaptiveSmoothFactor` [SOURCE_CODE]
- `focusUtils.ts` - Helpers to clamp and convert zoom focus between stage and video space. Key: `clampFocusToStage`, `clampFocusToScale`, `softenFocusToScale`, `stageFocusToVideoSpace`, `getFocusBoundsForScale` [SOURCE_CODE]
- `index.ts` - Barrel exports for video playback utilities. Key: `exports from ./constants`, `exports from ./focusUtils`, `exports from ./layoutUtils`, `exports from ./mathUtils`, `exports from ./overlayUtils` [SOURCE_CODE]
- `layoutUtils.ts` - Compute and apply PIXI layout for video + webcam overlay, cropping and masking.. Key: `LayoutParams`, `LayoutResult`, `layoutVideoContent` [SOURCE_CODE]
- `mathUtils.ts` - Math and easing helpers for animation and zoom transitions. Key: `clamp01`, `cubicBezier`, `easeOutExpo`, `easeOutScreenStudio`, `smoothStep` [SOURCE_CODE]
- `overlayUtils.ts` - Positions and updates the zoom overlay indicator on the video stage. Key: `updateOverlayIndicator` [SOURCE_CODE]
- `videoEventHandlers.ts` - Creates event handlers to manage video playback, seeking, trims, and speed regions. Key: `createVideoEventHandlers` [SOURCE_CODE]
- `zoomRegionUtils.ts` - Compute dominant zoom regions and transitions for playback focus. Key: `findDominantRegion`, `computeRegionStrength`, `getConnectedRegionPairs` [SOURCE_CODE]
- `zoomTransform.ts` - Compute and apply zoom/pan transforms and motion blur for the video camera layer. Key: `computeZoomTransform`, `computeFocusFromTransform`, `applyZoomTransform`, `createMotionBlurState`, `MotionBlurState` [SOURCE_CODE]

## src/contexts/

- `I18nContext.tsx` - React i18n provider and hooks to manage locale and translations. Key: `I18nProvider`, `useI18n`, `useScopedT` [SOURCE_CODE]
- `ShortcutsContext.tsx` - React context for managing keyboard shortcuts and persistence. Key: `ShortcutsProvider`, `useShortcuts`, `DEFAULT_SHORTCUTS` [SOURCE_CODE]

## src/hooks/

- `useAudioLevelMeter.ts` - React hook that opens a microphone MediaStream, creates an AudioContext + AnalyserNode and exposes a smoothed RMS audio level.. Key: `AudioLevelMeterOptions`, `useAudioLevelMeter` [SOURCE_CODE]
- `useCameraDevices.test.ts` - Unit tests for useCameraDevices hook with mocked mediaDevices. Key: `useCameraDevices`, `mockEnumerateDevices`, `mockGetUserMedia` [TEST]
- `useCameraDevices.ts` - Hook to enumerate and manage available camera devices. Key: `useCameraDevices`, `CameraDevice` [SOURCE_CODE]
- `useEditorHistory.ts` - React hook that implements undo/redo history and live-update checkpointing for the video editor state. Key: `EditorState`, `INITIAL_EDITOR_STATE`, `MAX_HISTORY`, `resolve`, `withCheckpoint` [SOURCE_CODE]
- `useMicrophoneDevices.ts` - Hook to request permission and enumerate microphone devices. Key: `useMicrophoneDevices`, `MicrophoneDevice` [SOURCE_CODE]
- `useScreenRecorder.ts` - A React hook that manages screen/webcam/microphone recording lifecycle, media mixing, and persistence.. Key: `createRecorderHandle`, `useScreenRecorder`, `selectMimeType`, `computeBitrate`, `teardownMedia` [SOURCE_CODE]

## src/i18n/

- `config.ts` - Defines supported locales, namespaces, and i18n constants. Key: `DEFAULT_LOCALE`, `SUPPORTED_LOCALES`, `I18N_NAMESPACES` [SOURCE_CODE]
- `loader.ts` - Loads locale JSONs and performs message lookup/interpolation. Key: `translate`, `getMessages`, `getLocaleName` [SOURCE_CODE]

## src/i18n/locales/en/

- `common.json` - English common UI action and playback strings [DATA]
- `dialogs.json` - English dialog and file dialog strings for UI dialogs [DATA]
- `editor.json` - English editor-specific UI strings and error messages [DATA]
- `launch.json` - English strings for the launcher/HUD and source selection UI [DATA]
- `settings.json` - English settings and preferences strings for editor controls [DATA]
- `shortcuts.json` - English keyboard shortcut UI text and action labels [DATA]
- `timeline.json` - English timeline UI strings for timeline buttons, hints and errors [DATA]

## src/i18n/locales/es/

- `common.json` - Spanish common UI strings (actions, playback, locale) [DATA]
- `dialogs.json` - Spanish dialog and export/user prompt translations [DATA]
- `editor.json` - Spanish editor-specific translations (errors, project, recording) [DATA]
- `launch.json` - Spanish launch screen and HUD translations [DATA]
- `settings.json` - Spanish settings and preferences translations [DATA]
- `shortcuts.json` - Spanish keyboard shortcuts UI translations [DATA]
- `timeline.json` - Spanish timeline and timeline-related messages [DATA]

## src/i18n/locales/fr/

- `common.json` - French common UI strings (actions, playback, locale) [DATA]
- `dialogs.json` - French dialog and export/user prompt translations [DATA]
- `editor.json` - French editor-specific translations (errors, project, recording) [DATA]
- `launch.json` - French launch screen and HUD translations [DATA]
- `settings.json` - French settings and preferences translations [DATA]
- `shortcuts.json` - French keyboard shortcuts UI translations [DATA]
- `timeline.json` - French timeline and timeline-related messages [DATA]

## src/i18n/locales/tr/

- `common.json` - Turkish common UI strings (actions, playback, locale) [DATA]
- `dialogs.json` - Turkish localization strings for dialogs and export UI [DATA]
- `editor.json` - Turkish localization for editor error and project messages [DATA]
- `launch.json` - Turkish localization for launch HUD and source selection [DATA]
- `settings.json` - Turkish localization for settings and editor preferences [DATA]
- `shortcuts.json` - Turkish localization for keyboard shortcuts UI [DATA]
- `timeline.json` - Turkish localization for timeline and timeline-related prompts [DATA]

## src/i18n/locales/zh-CN/

- `common.json` - Simplified Chinese common UI strings and actions [DATA]
- `dialogs.json` - Simplified Chinese translations for dialogs and export UI [DATA]
- `editor.json` - Simplified Chinese editor and recording messages [DATA]
- `launch.json` - Simplified Chinese localization for HUD and launch controls [DATA]
- `settings.json` - Simplified Chinese localization for settings and editor preferences [DATA]
- `shortcuts.json` - Simplified Chinese localization for keyboard shortcuts UI [DATA]
- `timeline.json` - Simplified Chinese localization for timeline components [DATA]

## src/lib/

- `assetPath.ts` - Resolve a safe URL for an app asset, handling dev server, Electron base path, and fallbacks. Key: `encodeRelativeAssetPath`, `ensureTrailingSlash`, `getAssetPath` [SOURCE_CODE]
- `compositeLayout.test.ts` - Unit tests validating composite webcam+screen layout invariants and presets.. Key: `computeCompositeLayout`, `describe`, `it` [TEST]
- `compositeLayout.ts` - Compute positions and sizes for composing a screen capture and webcam overlay on a canvas.. Key: `RenderRect`, `StyledRenderRect`, `WebcamLayoutPreset`, `webcamSizeToFraction`, `WEBCAM_LAYOUT_PRESET_MAP` [SOURCE_CODE]
- `customFonts.ts` - Load, validate, persist and manage custom Google Fonts in the app. Key: `addCustomFont`, `loadFont`, `loadAllCustomFonts` [SOURCE_CODE]
- `frameStep.ts` - Compute precise single-frame step timing for playback controls. Key: `FRAME_DURATION_SEC`, `computeFrameStepTime` [SOURCE_CODE]
- `recordingSession.ts` - Types and normalization utilities for recording session data. Key: `RecordingSession`, `normalizeProjectMedia`, `normalizeRecordingSession` [SOURCE_CODE]
- `requestCameraAccess.ts` - Unified camera access request with Electron fallback and status reporting. Key: `requestCameraAccess`, `CameraAccessResult` [SOURCE_CODE]
- `shortcuts.ts` - Typed shortcut binding registry and utilities for matching, formatting, merging, and conflict detection. Key: `SHORTCUT_ACTIONS`, `ShortcutAction`, `ShortcutBinding`, `ShortcutsConfig`, `FixedShortcut` [SOURCE_CODE]
- `userPreferences.ts` - Load and persist user preferences with validation. Key: `loadUserPreferences`, `saveUserPreferences`, `UserPreferences` [SOURCE_CODE]
- `utils.ts` - Utility to merge and normalize Tailwind/clsx class names. Key: `cn` [SOURCE_CODE]
- `webcamMaskShapes.ts` - Helpers to compute and draw webcam mask shapes for UI and canvas. Key: `getCssClipPath`, `drawCanvasClipPath` [SOURCE_CODE]

## src/lib/__tests__/

- `frameStepNavigation.test.ts` - Unit tests for frame-step time calculation logic. Key: `computeFrameStepTime`, `FRAME_DURATION_SEC` [TEST]

## src/lib/exporter/

- `annotationRenderer.ts` - Canvas renderer for text, image and arrow annotations. Key: `ARROW_PATHS`, `parseSvgPath`, `renderArrow`, `renderText`, `renderImage` [SOURCE_CODE]
- `asyncVideoFrameQueue.ts` - Async queue for VideoFrame producers/consumers with backpressure. Key: `AsyncVideoFrameQueue`, `enqueue`, `dequeue`, `fail` [SOURCE_CODE]
- `audioEncoder.ts` - Audio processing/encoding pipeline for exports (trim & speed-aware). Key: `AudioProcessor`, `process`, `renderPitchPreservedTimelineAudio` [SOURCE_CODE]
- `frameRenderer.ts` - Pixi-based offscreen renderer that composites video, webcam overlay, background, masks, blur, shadow and annotations for export frames. Key: `FrameRenderer`, `initialize`, `setupBackground`, `renderFrame`, `updateLayout` [SOURCE_CODE]
- `gifExporter.browser.test.ts` - Browser integration test: generate GIF from real video using GifExporter. Key: `GifExporter`, `ExportProgress` [TEST]
- `gifExporter.test.ts` - Unit tests for GIF output sizing: verifies calculateOutputDimensions behavior for presets and aspect ratios.. Key: `describe`, `it`, `calculateOutputDimensions`, `GIF_SIZE_PRESETS` [TEST]
- `gifExporter.ts` - Client-side GIF export pipeline: compute output size, stream-decode video(s), render frames and encode to GIF using gif.js workers.. Key: `GIF_WORKER_URL`, `calculateOutputDimensions`, `GifExporter`, `export`, `cancel` [SOURCE_CODE]
- `gradientParser.test.ts` - Unit tests for CSS gradient parsing and gradient geometry helpers. Key: `parseCssGradient`, `resolveLinearGradientAngle`, `getLinearGradientPoints`, `getRadialGradientShape` [TEST]
- `gradientParser.ts` - Parses CSS gradients and computes geometry for rendering. Key: `parseCssGradient`, `resolveLinearGradientAngle`, `getLinearGradientPoints`, `getRadialGradientShape` [SOURCE_CODE]
- `index.ts` - Re-exports video/gif export pipeline modules and types. Key: `FrameRenderer`, `GifExporter`, `VideoExporter` [SOURCE_CODE]
- `muxer.ts` - MP4 muxer wrapper that assembles encoded packets into a Blob. Key: `VideoMuxer`, `initialize`, `finalize` [SOURCE_CODE]
- `streamingDecoder.test.ts` - Tests for detecting early decoder termination in streaming decode. Key: `shouldFailDecodeEndedEarly` [TEST]
- `streamingDecoder.ts` - Stream-decoding video files via web-demuxer + WebCodecs and resampling VFR→CFR for export.. Key: `SOURCE_LOAD_TIMEOUT_MS`, `buildAV1CodecString`, `DecodedVideoInfo`, `shouldFailDecodeEndedEarly`, `OnFrameCallback` [SOURCE_CODE]
- `types.ts` - Type definitions, constants, and validators for export pipeline. Key: `ExportConfig`, `ExportProgress`, `GifExportConfig`, `GIF_SIZE_PRESETS`, `isValidGifFrameRate` [SOURCE_CODE]
- `videoDecoder.ts` - Simple HTMLVideo-based decoder to read video metadata and provide a seekable element. Key: `VideoFileDecoder`, `loadVideo` [SOURCE_CODE]
- `videoExporter.browser.test.ts` - Browser integration test: export MP4 from a real video using VideoExporter. Key: `VideoExporter`, `ExportProgress` [TEST]
- `videoExporter.ts` - Export orchestrator: decodes source video(s), renders frames via FrameRenderer, encodes video with WebCodecs VideoEncoder, and muxes audio/video into final blob. Key: `VideoExporter`, `export`, `exportWithEncoderPreference`, `initializeEncoder`, `cleanup` [SOURCE_CODE]

## src/utils/

- `aspectRatioUtils.ts` - Utility helpers for representing and converting supported aspect ratios.. Key: `ASPECT_RATIOS`, `AspectRatio`, `getAspectRatioValue`, `getNativeAspectRatioValue`, `getAspectRatioDimensions` [SOURCE_CODE]
- `getTestId.ts` - Utility to generate standardized test id strings. Key: `TestId`, `getTestId` [SOURCE_CODE]
- `platformUtils.ts` - Detect platform and format modifier key labels for UI. Key: `getPlatform`, `isMac`, `formatShortcut` [SOURCE_CODE]
- `timeUtils.ts` - Simple time formatting helpers. Key: `formatTimePadded` [SOURCE_CODE]

## tests/e2e/

- `gif-export.spec.ts` - Playwright E2E test: export GIF from a loaded video via Electron. Key: `MAIN_JS`, `TEST_VIDEO`, `test` [TEST]


---
*This knowledge base was extracted by [Codeset](https://codeset.ai) and is available via `python .codex/docs/get_context.py <file_or_folder>`*
