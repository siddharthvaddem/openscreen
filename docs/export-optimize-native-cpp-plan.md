# Native C++ Export Engine — Goals & Architecture

**Status**: Draft  
**Date**: 2026-06-01

---

## Prior Art — CapCut Desktop

The architecture in this document draws on the export design of [CapCut](https://www.capcut.com) (desktop), which achieves near-instant export on consumer hardware through three interlocking strategies:

- **Full-stack hardware acceleration.** CapCut routes decode, composite, and encode through the platform's native multimedia APIs (Apple VideoToolbox on macOS, NVENC/AMF/Quick Sync on Windows) so the CPU is only coordinating, not processing pixels. The rendering pipeline uses Metal / Vulkan / OpenGL shaders rather than software compositing.
- **Background pre-render cache.** While the user scrubs the timeline and previews effects, CapCut silently renders affected segments into a low-bitrate segment cache. When export is triggered, cached segments are assembled directly without re-rendering — reducing the export to a mux-and-encode pass over pre-computed frames.
- **On-demand decode.** Only frames that survive trim boundaries are decoded. The demuxer seeks to the nearest keyframe before each active segment and skips the rest at the packet level, so a 10-minute source with a 30-second active region decodes approximately 30 seconds of video, not 10 minutes.

The architecture proposed here applies the first and third strategies directly. The second (segment pre-render cache) is a longer-term addition that can layer on top once the core C++ pipeline is in place.

---

## Goal

Reduce MP4/GIF export time from minutes to seconds for typical recordings. The target is to reach near-real-time export speed (export faster than the recording duration) on modern consumer hardware with hardware acceleration available.

Secondary goals: eliminate UI jank during export, remove the real-time audio bottleneck, and give the product full control over codec quality and bitrate tuning.

---

## Why the Current Approach Has a Hard Ceiling

The existing pipeline runs entirely inside Chromium's renderer process using the WebCodecs API. This creates structural limits that cannot be fixed with incremental JS-level changes:

- **No hardware control.** The browser decides whether to use a hardware encoder. There is no way to explicitly target NVENC, VideoToolbox, or Intel Quick Sync, or to pass hardware-specific quality parameters.
- **Single-threaded serial loop.** Every frame is decoded, composited, and encoded one at a time inside a single `await` chain. The compositor blocks the encoder; the encoder blocks the next decode. There is no pipeline parallelism.
- **No GPU zero-copy.** Decoded video frames cannot stay on the GPU between decode and encode. The browser forces a CPU round-trip for compositing, which is especially costly on Linux.
- **Real-time audio constraint.** Audio with speed changes is processed through `MediaRecorder` with real-time playback, meaning a clip with 2× speed still takes the original duration to process its audio.
- **WebCodecs is designed for streaming.** Its API model (optimised for WebRTC latency) imposes constraints — fixed latency mode, limited GOP control, no B-frames — that are the wrong trade-offs for offline batch export.

---

## Architecture: Native C++ Export Helper

The solution follows the same multi-process pattern OpenScreen already uses for `openscreen-screencapturekit-helper` and `openscreen-wgc-capture-helper`. A new standalone C++ binary, `openscreen-export-helper`, takes over the entire encode pipeline.

### Process boundary

```
Electron Renderer  ──IPC──►  Electron Main  ──spawn──►  openscreen-export-helper
  (React / UI)                (Node.js)                   (C++ encode engine)
```

The renderer and main process are unchanged from the user's perspective: they display progress, handle cancellation, and write the final file. All pixel work happens in the helper process.

### Why a separate process

- **Crash isolation.** A codec crash or driver fault does not take down the UI.
- **True multi-threading.** The helper can run a decode thread, a composite thread, and an encode thread in parallel — something the JS single-threaded model cannot do.
- **Direct OS API access.** The helper calls VideoToolbox, NVENC, DXGI, and VAAPI directly without browser sandboxing.
- **Consistent with existing codebase patterns.** No new integration model to learn or maintain.

---

## Hardware Acceleration Stack

The helper selects the best available backend at runtime, in priority order:

| Platform | Decode | Composite | Encode |
|---|---|---|---|
| macOS (Apple Silicon) | VideoToolbox | Metal compute | VideoToolbox (H.264 / HEVC) |
| macOS (Intel) | VideoToolbox | Metal compute | VideoToolbox |
| Windows (NVIDIA) | NVDEC | D3D11 compute | NVENC |
| Windows (AMD) | AMF decoder | D3D11 compute | AMF encoder |
| Windows (Intel) | Quick Sync | D3D11 compute | Quick Sync |
| Linux | VAAPI / NVDEC | OpenGL compute | VAAPI / NVENC |
| All (fallback) | FFmpeg software | CPU | libx264 / libx265 |

The critical optimisation at each stage is **GPU zero-copy**: the decoded frame lives on a GPU surface, the compositor reads and writes GPU textures, and the encoder consumes the GPU surface directly — no pixel data crosses the CPU bus until the final muxed file is written to disk.

---

## What the Helper Does

### Decode
The helper demuxes the source file and sends encoded packets directly to a hardware decoder context. Only frames that fall within the active trim regions are decoded; frames in trimmed gaps are skipped at the GOP level after seeking to the nearest keyframe. This mirrors CapCut's on-demand decode and is the single largest gain for heavily edited projects.

### Composite
Each output frame is assembled as a sequence of GPU shader passes on a render texture:

1. Wallpaper / background fill
2. Video frame (crop + resize)
3. Webcam picture-in-picture (if present)
4. Shadow (pre-baked once per export, not per frame)
5. Zoom / pan transform
6. Cursor overlay
7. Annotations

The shadow pass deserves special mention: the current JS pipeline recomputes a full CSS `drop-shadow` filter on every frame. In the C++ compositor, the shadow mask is a static texture baked once before the first frame and reused for the entire export — making it effectively free.

### Encode
The composited GPU texture is handed directly to the hardware encoder surface. The encoder runs concurrently with the compositor: while frame N is being encoded, frame N+1 is being composited. This pipeline overlap is not possible in the current serial JS loop.

Quality mapping from the existing UI quality selector:

| UI preset | Encoder target |
|---|---|
| Medium | Hardware VBR, CQ ~28, fast preset |
| Good | Hardware VBR, CQ ~23, medium preset |
| Source | Hardware VBR, CQ ~18, slow preset |

### Audio
Audio is decoded, speed-adjusted (using a time-stretch filter rather than real-time playback), and re-encoded fully offline on a separate thread. For a clip with 2× speed applied, audio processing takes half the clip duration — not the full duration as today.

### Mux
Audio and video packets are muxed by DTS into a standard MP4 container with `faststart` (moov atom at the front), ready for immediate playback without post-processing.

---

## Communication Contract

The helper follows the same stdin/stdout JSON contract as the existing native helpers:

- **Input**: a single JSON object passed as a command-line argument describing the full export job (paths, effects, quality, trim, cursor data, etc.)
- **Output**: newline-delimited JSON progress events on stdout (`ready`, `progress`, `done`, `error`)
- **Cancellation**: SIGTERM

The JS side (`NativeExporter`) wraps this in a thin TypeScript class that translates the existing `VideoExporterConfig` into the helper's JSON format and maps progress events back to the `onProgress` callback. The `VideoExporter` (WebCodecs) remains as a fallback for systems where the helper binary is unavailable.

---

## Build & Distribution

Follows the existing native helper conventions:

- Built with CMake, one binary per platform/arch
- Distributed alongside the existing helpers under `electron/native/bin/`
- Statically linked against FFmpeg (stripped to required codecs only) to avoid runtime dependency conflicts
- Must be code-signed and notarised on macOS (same as existing helpers)

---

## Phased Delivery

| Milestone | Scope | Value delivered |
|---|---|---|
| 1 | Helper skeleton: decode → passthrough → encode, no effects | Validates IPC contract; unblocks source-quality exports with no effects |
| 2 | Static effects: shadow, wallpaper, padding, border radius | Covers the most common export configuration |
| 3 | Per-frame effects: zoom, crop, motion blur | Full visual parity for standard editing features |
| 4 | Cursor overlay | Native cursor compositing without JS frame rendering |
| 5 | Webcam PiP + audio | Full feature parity |
| 6 | GIF output | Replaces gif.js; uses FFmpeg palette quantisation |

At each milestone the helper is the primary path for the effect combinations it supports; all others fall back to the existing WebCodecs pipeline.

---

## Expected Outcome

On a machine with hardware acceleration available, the export of a typical 2-minute 1080p recording should complete in under 15 seconds. On machines without hardware support, the software fallback via libx264 (multi-threaded) is still substantially faster than the current single-threaded WebCodecs software path.
