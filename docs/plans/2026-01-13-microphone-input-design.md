# Microphone Input Feature Design

**Date:** 2026-01-13  
**Status:** Ready for Implementation

## Overview

Add microphone input capability to screen recording, allowing users to record voice narration alongside screen capture. Audio is merged directly into the video file.

## Requirements

- Audio microphone merged into single WebM output file
- User can select from available microphone devices
- Toggle control in HUD bar (simple, non-intrusive)
- Dropdown menu for device selection
- Real-time audio level meter for visual feedback

## User Flow

1. User opens app → HUD bar appears
2. User clicks mic icon in HUD → Dropdown appears with:
   - List of available microphone devices
   - Real-time audio level meter
   - Mute toggle
3. User selects mic device → Saved as preference
4. User starts recording → Screen + mic audio captured simultaneously
5. Stop recording → Output: single WebM file with video + audio merged

## Technical Architecture

### Stream Combining Approach

```
┌─────────────────────────────────────────────────────┐
│                    MediaStream                       │
│  ┌─────────────────┐    ┌─────────────────────────┐ │
│  │   Video Track   │    │      Audio Track        │ │
│  │ (screen capture)│    │ (microphone input)      │ │
│  └────────┬────────┘    └───────────┬─────────────┘ │
│           │                         │               │
│           └──────────┬──────────────┘               │
│                      ▼                              │
│            ┌─────────────────┐                      │
│            │  MediaRecorder  │                      │
│            │  (combined)     │                      │
│            └────────┬────────┘                      │
│                     ▼                               │
│            ┌─────────────────┐                      │
│            │  WebM Output    │                      │
│            │  (video+audio)  │                      │
│            └─────────────────┘                      │
└─────────────────────────────────────────────────────┘
```

### Key Technical Decisions

1. **Stream Combining**: Use `MediaStream` constructor to combine video track (from screen) + audio track (from mic)
2. **Device Enumeration**: Use `navigator.mediaDevices.enumerateDevices()` to list microphones
3. **Audio Level Meter**: Use `AudioContext` + `AnalyserNode` for real-time level visualization
4. **State Persistence**: Save selected mic `deviceId` to localStorage or Electron store

## File Structure

### New Files

```
src/
├── hooks/
│   └── useMicrophone.ts          # Mic device management & level meter
│
├── components/
│   └── launch/
│       └── MicrophoneSelector.tsx # Dropdown with device list + level meter
│
├── stores/                        
│   └── audioSettings.ts          # Persist mic preferences
```

### Modified Files

```
src/
├── hooks/
│   └── useScreenRecorder.ts      # Add audio stream support
│
├── components/
│   └── launch/
│       └── LaunchWindow.tsx      # Add mic toggle button
```

## Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| `useMicrophone` hook | Enumerate devices, get audio stream, compute audio level, manage state |
| `MicrophoneSelector` | Dropdown UI, device list, level meter bar, toggle on/off |
| `useScreenRecorder` (modified) | Accept audio stream, combine with video, encode to WebM |
| `audioSettings` store | Persist deviceId, enabled state |

## UI Design

### HUD Bar Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  ⋮⋮  │ 🖥️ Screen 1  │ 🎙️ │ ⏺️ Record │ 📁 Open │  ─  │  ✕  │
│      │              │ ▼  │           │         │     │     │
└─────────────────────────────────────────────────────────────────────┘
                       ↑
                    Mic Toggle (new)
```

### Mic Dropdown

```
┌─────────────────────────────────┐
│  🎙️ Microphone                 │
├─────────────────────────────────┤
│  ○ MacBook Pro Microphone       │
│  ● USB Microphone (selected)    │
│  ○ AirPods Pro                  │
├─────────────────────────────────┤
│  Level: ████████░░░░░░ (68%)    │
├─────────────────────────────────┤
│  [ ] Mute microphone            │
└─────────────────────────────────┘
```

### Visual States

| State | Appearance |
|-------|------------|
| Mic enabled | Blue/white icon, small green indicator dot |
| Mic disabled/muted | Gray icon with strikethrough |
| Recording + mic on | Level meter active, red indicator |
| No mic found | Disabled icon, tooltip "No microphone detected" |

## Error Handling

| Scenario | Handling |
|----------|----------|
| No microphone detected | Show disabled mic icon with tooltip, user can still record without audio |
| Mic permission denied | Show toast/alert, guide user to system preferences, fallback to video-only |
| Mic disconnected mid-recording | Continue recording video-only, show notification "Microphone disconnected" |
| Mic reconnected | Auto-reconnect if same device, or notify user for manual selection |
| Multiple mic devices | Default to last-used device, fallback to system default |
| Audio encoding failure | Fallback to video-only, log error, notify user |

### Permission Flow

1. First time click mic → Browser/Electron permission prompt
2. If granted → Enumerate devices, enable mic
3. If denied → Show "Permission denied" state, provide help link
4. User can retry anytime via dropdown

## Implementation Order

1. Create `useMicrophone` hook (device enumeration, audio stream, level meter)
2. Create `audioSettings` store (persistence)
3. Create `MicrophoneSelector` component (UI)
4. Modify `useScreenRecorder` to accept and combine audio stream
5. Modify `LaunchWindow` to include mic toggle
6. Add error handling and edge cases
7. Test on multiple platforms (Windows, macOS, Linux)

## Testing Considerations

- Test with no microphone connected
- Test permission denial flow
- Test device hot-plug (connect/disconnect during recording)
- Test audio sync with video
- Test with multiple microphones
- Test level meter accuracy
- Test persistence across app restarts
