# src/lib/exporter/ - Video Export Engine

## Package Identity
High-performance video/GIF export pipeline using WebCodecs, PixiJS, and MP4Box. Handles frame decoding, rendering, encoding, and muxing.

## Architecture Overview
```
┌─────────────────────────────────────────────────────────────┐
│                      VideoExporter                          │
├─────────────────────────────────────────────────────────────┤
│  videoDecoder.ts  →  frameRenderer.ts  →  muxer.ts         │
│  (decode frames)     (PixiJS render)      (MP4 output)      │
│                            ↓                                │
│                   keystrokeRenderer.ts                      │
│                   annotationRenderer.ts                     │
│                   subtitleRenderer.ts                       │
└─────────────────────────────────────────────────────────────┘

Supporting modules:
- backpressureHandler.ts  - Encoder queue management
- texturePool.ts          - PixiJS texture recycling
- shadowCache.ts          - Cached shadow rendering
- promiseBatcher.ts       - Batch async operations
- audioExtractor.ts       - Audio track handling
- gifExporter.ts          - GIF export path
```

## Key Patterns

### Backpressure Handling
- ✅ DO: Use `EncoderBackpressureHandler` for encoder queue management
- ✅ DO: Wait for capacity with `ondequeue` events (NOT setTimeout)
- ✅ DO: Keep queue size between 10-20 frames

**Example (from `backpressureHandler.ts`):**
```ts
const backpressure = new EncoderBackpressureHandler(15);
backpressure.attach(encoder);
await backpressure.waitForCapacity(); // Uses ondequeue, not polling
encoder.encode(frame);
```

### Resource Pooling
- ✅ DO: Use `TexturePool` for PixiJS texture management
- ✅ DO: Release textures back to pool when done
- ✅ DO: Pre-warm pools for expected frame sizes

### Type Definitions
- ✅ DO: Export types from `types.ts` via `index.ts`
- ✅ DO: Use `ExportConfig`, `ExportProgress`, `ExportResult` interfaces
- ✅ DO: Validate configs with type guards (`isValidGifFrameRate`)

### Testing
- ✅ DO: Write property-based tests with `fast-check`
- ✅ DO: Test edge cases (queue full, encoder failure)
- ✅ DO: Mock WebCodecs APIs in tests

**Test example (from `backpressureHandler.test.ts`):**
```ts
describe('EncoderBackpressureHandler', () => {
  it('waits when queue is full', async () => {
    // Property-based testing with fast-check
  });
});
```

## Key Files
| Purpose                  | File                   |
| ------------------------ | ---------------------- |
| Main export orchestrator | `videoExporter.ts`       |
| Frame decode             | `videoDecoder.ts`        |
| PixiJS rendering         | `frameRenderer.ts`       |
| MP4 muxing               | `muxer.ts`               |
| Backpressure             | `backpressureHandler.ts` |
| GIF export               | `gifExporter.ts`         |
| Types & config           | `types.ts`               |
| Public API               | `index.ts`               |

## JIT Search Commands
```bash
# Find class definitions
rg -n "export class" src/lib/exporter

# Find interface definitions
rg -n "export interface" src/lib/exporter

# Find WebCodecs usage
rg -n "VideoEncoder|VideoDecoder|VideoFrame" src/lib/exporter

# Find tests
fd -e test.ts src/lib/exporter
```

## Common Gotchas
- **Memory**: Always call `.close()` on VideoFrames after use
- **Backpressure**: Never busy-wait with `setTimeout(resolve, 0)`—use `ondequeue`
- **Queue size**: Keep encoder queue at 10-20 frames (see Requirement 2.1)
- **PixiJS**: Destroy textures properly to prevent GPU memory leaks

## Performance Requirements
- Frame processing: < 100ms per frame target
- Memory: Texture pool prevents allocation spikes
- CPU: `ondequeue` prevents busy-waiting

## Pre-PR Checks
```bash
npm test -- src/lib/exporter && npm run build
```
