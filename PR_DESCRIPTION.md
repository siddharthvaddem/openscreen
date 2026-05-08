# Pull Request Template

## Description

This PR adds two major features:

1. **Recording background color compositing** — when recording a transparent window (e.g. iPhone Mirroring, iOS Simulator), the transparent areas are now filled with a user-chosen solid color via an off-screen canvas pipeline, instead of encoding as black.

2. **Improved AI zoom suggestions for mobile recordings** — the "Suggest Zooms" wand now generates a zoom region for every tap/click during recording, not just long cursor dwells. Click timestamps and short cursor pauses (120ms+) are both used as candidates, and suggestions no longer block each other so all interactions appear on the timeline.

## Motivation

**Background compositing**: When recording a transparent Electron window (e.g. a mirrored iPhone in a frameless window), H.264/VP8 video codecs have no alpha channel — transparent areas encode as solid black. Users had no way to control or replace that background color.

**AI zoom suggestions**: The previous dwell-detection algorithm required 450ms+ of cursor stillness, missing rapid navigation taps on mobile recordings. Suggestions were also silently dropped when they overlapped each other, causing most mobile interactions to be skipped entirely.

## Type of Change
- [x] New Feature
- [x] Bug Fix
- [ ] Refactor / Code Cleanup
- [ ] Documentation Update
- [ ] Other (please specify)

## Related Issue(s)
<!-- Link related issues here -->

## Screenshots / Video

<!-- Add a screen recording showing the color picker in the HUD and the zoom suggestions appearing for each tap -->

## Testing

**Background color picker:**
1. Launch a transparent window recording (iPhone Mirroring or iOS Simulator)
2. Before starting recording, click the colored circle in the HUD bar
3. Select a color from the presets or the custom color wheel
4. Record and export — the background should be the chosen color instead of black
5. Select the transparent (checkerboard) option — **known bug**: transparent areas still export as black because video codecs do not support alpha. This option is preserved in the UI for future codec support but does not currently work.

**AI zoom suggestions (mobile):**
1. Record an iPhone Mirroring session with several quick tap navigations (~1s apart)
2. Open the recording in the editor
3. Click the magic wand "Suggest Zooms" button on the zoom timeline row
4. A zoom region should appear for each tap, even if they are adjacent or overlapping
5. Pre-existing manually-created zoom regions are respected and will not be overwritten

## Known Bug

**Transparent background does not work** — selecting the checkerboard/transparent swatch sets `captureBackgroundColor` to `null`, which bypasses canvas compositing and passes the raw video track to `MediaRecorder`. Because H.264 (and VP8/VP9) have no alpha channel, any transparent pixels in the source window are encoded as black. The transparent option is present in the UI but produces the same black result as having no compositing. A fix would require a codec that supports alpha (e.g. HEVC with alpha, or ProRes 4444), which is not currently supported by `MediaRecorder` in Chromium/Electron.

## Checklist
- [x] I have performed a self-review of my code.
- [ ] I have added any necessary screenshots or videos.
- [ ] I have linked related issue(s) and updated the changelog if applicable.

---

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useScreenRecorder.ts` | Canvas compositing pipeline; `captureBackgroundColor` state |
| `src/components/launch/LaunchWindow.tsx` | HUD color picker (presets, transparent swatch, custom wheel) |
| `src/components/video-editor/VideoPlayback.tsx` | Write clamped auto-focus position back to `smoothedAutoFocusRef` |
| `src/components/video-editor/timeline/zoomSuggestionUtils.ts` | `detectClickCandidates()`; lowered `MIN_DWELL_DURATION_MS` 450→120ms; per-candidate `durationMs`/`startOffsetMs` |
| `src/components/video-editor/timeline/TimelineEditor.tsx` | Merge click+dwell candidates; removed inter-suggestion blocking; pass `cursorClickTimestamps` prop |
| `src/components/video-editor/VideoEditor.tsx` | Pass `cursorClickTimestamps` to `TimelineEditor` |

---
*Thank you for contributing!*
