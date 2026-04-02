# Attribution

OpenScreen thanks the following open-source projects for inspiring and contributing code:

## Zoom & Pan Animation

The zoom and pan animation system in OpenScreen was inspired by and ported from [Recordly](https://github.com/Recordly-dev/Recordly).

The following functions in `src/components/video-editor/videoPlayback/` were ported from Recordly:

- `mathUtils.ts` — `easeOutScreenStudio()`, `cubicBezier()`, and `clamp01()`
- `zoomRegionUtils.ts` — zoom region strength, chaining, and connected pan transition logic

We apologize for the omission and thank Recordly's maintainers for their excellent work.
