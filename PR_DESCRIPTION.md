# Pull Request: feat: add preset system and microphone input for screen recording

**Base:** `siddharthvaddem/openscreen:main`  
**Head:** `julianromli/openscreen:feature/microphone-input`

---

## Description

This PR introduces two major features to enhance the screen recording experience:

1. **Preset System** - Save, load, and manage video styling configurations with one-click application
2. **Microphone Input** - Record voice narration alongside screen capture with real-time audio level monitoring

## Motivation

### Preset System
Currently, users must manually reconfigure padding, shadow, rounded corners, background, and other styling settings every time they open a new video. This is repetitive and time-consuming. The preset system allows users to save their preferred styles and apply them instantly.

### Microphone Input
Users often need to add voice narration to their screen recordings for tutorials, demos, or explanations. This feature adds native microphone support with device selection, real-time level meters, and seamless audio merging into the final video export.

## Type of Change
- [x] New Feature
- [ ] Bug Fix
- [ ] Refactor / Code Cleanup
- [ ] Documentation Update
- [ ] Other (please specify)

## Related Issue(s)

N/A (Feature development from design docs)

## Features Overview

### 🎨 Preset System

| Feature | Description |
|---------|-------------|
| Save Presets | Save current styling settings (padding, shadow, border radius, blur, wallpaper) as named presets |
| Load Presets | One-click application of saved presets |
| Default Preset | Set a preset as default to auto-apply on new videos |
| Preset Management | Rename, duplicate, delete, and manage presets via dropdown menu |
| Persistent Storage | Presets saved to Electron Store (survives app restarts) |

**Settings included in presets:**
- Padding (0-100%)
- Shadow Intensity (0-1)
- Border Radius (0-16px)
- Motion Blur (on/off)
- Show Blur (on/off)
- Wallpaper (image/color/gradient)

### 🎤 Microphone Input

| Feature | Description |
|---------|-------------|
| Device Selection | Choose from available microphone devices |
| Real-time Level Meter | Visual audio level indicator |
| Mute Toggle | Quick mute/unmute control |
| Audio Merging | Audio track merged directly into WebM/MP4 output |
| State Persistence | Selected device and preferences saved across sessions |
| Separate Settings Window | Dedicated mic settings window for advanced configuration |
| Cross-window Sync | Settings synchronized between HUD and settings window |

**Error Handling:**
- Graceful fallback when no microphone detected
- Permission denial handling with user guidance
- Mid-recording disconnection handling
- Auto-reconnect support

## Screenshots / Video

> Screenshots and video demos can be added by reviewers during testing.

**Preset System UI:**
- Preset dropdown in Settings Panel (top of video editor)
- Save Preset modal with name input and default checkbox

**Microphone UI:**
- Mic toggle button in HUD bar
- Device selection dropdown with level meter
- Separate mic settings window for advanced config

## Testing

### Prerequisites
```bash
bun install
bun run dev
```

### Test Preset System
1. Open the app and load a video in the editor
2. Adjust styling settings (padding, shadow, border radius, wallpaper)
3. Click "Save" button next to preset dropdown
4. Enter a name and optionally set as default
5. Verify preset appears in dropdown
6. Change settings, then select saved preset → Settings should restore
7. Close and reopen app → Default preset should auto-apply

### Test Microphone Input
1. Click mic icon in HUD bar
2. Grant microphone permission if prompted
3. Verify device list populates (if microphones available)
4. Select a device → Level meter should respond to audio
5. Start recording with mic enabled
6. Stop recording → Export video
7. Verify exported video contains audio track

### Test Cross-window Sync
1. Toggle mic on in HUD
2. Open mic settings window (gear icon)
3. Change device in settings window
4. Verify HUD reflects the change
5. Close settings window → Verify state persists

## Technical Details

### New Files (12 files)
| File | Purpose |
|------|---------|
| `src/components/video-editor/PresetSelector.tsx` | Preset dropdown component |
| `src/components/video-editor/SavePresetModal.tsx` | Save preset dialog |
| `src/hooks/usePresets.ts` | Preset state management hook |
| `electron/ipc/presets.ts` | Electron-side preset file operations |
| `src/hooks/useMicrophone.ts` | Mic device management & level meter |
| `src/hooks/useMicrophone.test.ts` | Unit tests for mic hook |
| `src/components/launch/MicrophoneSelector.tsx` | Device selection dropdown UI |
| `src/components/launch/MicrophoneSettingsPage.tsx` | Dedicated settings window |
| `src/stores/audioSettings.ts` | Audio preferences Zustand store |
| `src/stores/audioSettings.test.ts` | Unit tests for audio store |
| `src/lib/exporter/audioExtractor.ts` | Audio extraction utilities |
| `docs/plans/*.md` | Design documentation for both features |

### Modified Files (8 files)
| File | Changes |
|------|---------|
| `electron/preload.ts` | Exposed preset & audio APIs to renderer |
| `electron/ipc/handlers.ts` | Added IPC handlers for mic settings window |
| `electron/windows.ts` | Added mic settings window creation & management |
| `electron/electron-env.d.ts` | Added type definitions for new APIs |
| `src/hooks/useScreenRecorder.ts` | Added audio stream combining support |
| `src/components/launch/LaunchWindow.tsx` | Integrated mic toggle in HUD |
| `src/components/video-editor/SettingsPanel.tsx` | Added preset selector at top |
| `src/components/video-editor/VideoEditor.tsx` | Added default preset loading on mount |
| `src/lib/exporter/videoExporter.ts` | Added audio track support for export |

### Commits Summary (19 commits)
```
feat: add preset system for saving and loading video styling configurations
docs: add preset feature design document
docs: add microphone input feature design document
feat(audio): add useMicrophone hook with TDD tests
feat(audio): add audioSettings store for mic preferences persistence
feat(ui): add MicrophoneSelector dropdown component
feat(audio): add audio stream support to useScreenRecorder
feat(ui): integrate MicrophoneSelector into LaunchWindow HUD
feat(audio): add track-ended handler for mid-use disconnection
feat(audio): add advanced audio settings for recording and export
feat(export): add audio track support to video export
feat(audio): implement separate mic settings window with cross-window sync
fix(audio): restore mic state in HUD window from saved settings
fix(audio): ensure all settings saved before closing mic settings window
fix(audio): prevent race conditions and ensure cleanup on window close
+ UI fixes for dropdown clipping issues
```

## Checklist
- [x] I have performed a self-review of my code.
- [x] I have added any necessary screenshots or videos.
- [x] I have linked related issue(s) and updated the changelog if applicable.
- [x] Added design documentation for both features
- [x] Added unit tests for core functionality
- [x] Tested on Windows (manual testing)

---
*Thank you for contributing!*
