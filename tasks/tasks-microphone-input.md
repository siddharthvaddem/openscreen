# Microphone Input Feature - Task List

**Source:** `docs/plans/2026-01-13-microphone-input-design.md`  
**Status:** ✅ Implementation Complete - Pending Platform Testing

## Relevant Files

- `src/hooks/useMicrophone.ts` - New hook for mic device management & audio level meter
- `src/hooks/useMicrophone.test.ts` - Unit tests for useMicrophone hook (13 tests)
- `src/stores/audioSettings.ts` - New store for persisting mic preferences
- `src/stores/audioSettings.test.ts` - Unit tests for audioSettings store (16 tests)
- `src/components/launch/MicrophoneSelector.tsx` - New dropdown component for mic selection
- `src/hooks/useScreenRecorder.ts` - Modified to accept and combine audio stream
- `src/components/launch/LaunchWindow.tsx` - Modified to add mic toggle button

### Notes

- Unit tests should be placed alongside the code files they test
- Use `npm run test` or `npx vitest` to run tests (project uses Vitest)
- Test mic functionality requires mocking `navigator.mediaDevices`
- **29 total tests passing** for this feature

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, check it off by changing `- [ ]` to `- [x]`. Update after completing each sub-task.

## Tasks

- [x] 0.0 Create feature branch
- [x] 1.0 Create useMicrophone hook (device enumeration, audio stream, level meter)
- [x] 2.0 Create audioSettings store (persistence layer)
- [x] 3.0 Create MicrophoneSelector UI component
- [x] 4.0 Modify useScreenRecorder to support audio stream combining
- [x] 5.0 Integrate mic toggle into LaunchWindow HUD
- [x] 6.0 Add error handling and edge cases
- [ ] 7.0 Test and validate on multiple platforms

## Manual Testing Checklist (Task 7.0)

Test the following scenarios on Windows, macOS, and Linux:

### Basic Functionality
- [ ] Mic selector dropdown appears in HUD bar
- [ ] Device list shows available microphones
- [ ] Audio level meter updates in real-time
- [ ] Recording includes audio when mic enabled
- [ ] Recording is video-only when mic disabled/muted

### Edge Cases
- [ ] No microphone connected - shows disabled state with tooltip
- [ ] Permission denied - shows warning in dropdown
- [ ] Multiple microphones - can switch between them
- [ ] Device disconnected mid-recording - continues video-only
- [ ] Settings persist across app restarts

### Platforms
- [ ] Windows 10/11
- [ ] macOS (if available)
- [ ] Linux (if available)
