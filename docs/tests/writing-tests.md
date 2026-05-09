# Writing Tests

This project uses [Vitest](https://vitest.dev/) for both unit/integration tests and browser tests. There are two separate configs — each targets a different set of files.

## Unit tests

**Config:** `vitest.config.ts`  
**Runs in:** jsdom (simulated DOM, no real browser)  
**File pattern:** `src/**/*.test.ts` — anything that does **not** end in `.browser.test.ts`  
**CI command:** `npm run test`

Use unit tests for pure logic, utility functions, data transformations, and anything that doesn't need real browser APIs (Canvas, WebCodecs, MediaRecorder, etc.).

### File placement

Co-locate the test file next to the source file, or put it in a `__tests__/` folder in the same directory.

```
src/lib/compositeLayout.ts
src/lib/compositeLayout.test.ts        # co-located

src/i18n/__tests__/tutorialHelpTranslations.test.ts  # grouped
```

### Example

```ts
import { describe, expect, it } from "vitest";
import { computeCompositeLayout } from "./compositeLayout";

describe("computeCompositeLayout", () => {
  it("anchors the overlay in the lower-right corner", () => {
    const layout = computeCompositeLayout({
      canvasSize: { width: 1920, height: 1080 },
      screenSize: { width: 1920, height: 1080 },
      webcamSize: { width: 1280, height: 720 },
    });

    expect(layout).not.toBeNull();
    expect(layout!.webcamRect!.x).toBeGreaterThan(1920 / 2);
    expect(layout!.webcamRect!.y).toBeGreaterThan(1080 / 2);
  });
});
```

### Path aliases

The `@/` alias resolves to `src/`. Use it for imports that would otherwise need long relative paths.

```ts
import { SUPPORTED_LOCALES } from "@/i18n/config";
```

### Running locally

```bash
npm run test          # run once
npm run test:watch    # watch mode
```

---

## Browser tests

**Config:** `vitest.browser.config.ts`  
**Runs in:** real Chromium via Playwright (headless)  
**File pattern:** `src/**/*.browser.test.ts`  
**CI commands:** `npm run test:browser:install` then `npm run test:browser`

Use browser tests when the code under test depends on real browser APIs that jsdom doesn't implement: `VideoDecoder`, `VideoEncoder`, `MediaRecorder`, `OffscreenCanvas`, `WebGL`, etc.

### File placement

Name the file `<subject>.browser.test.ts` and place it next to the source file.

```
src/lib/exporter/videoExporter.ts
src/lib/exporter/videoExporter.browser.test.ts
```

### Loading fixture assets

Static assets (video files, images) live in `tests/fixtures/`. Import them with Vite's `?url` suffix so Vite serves them through the dev server.

```ts
import sampleVideoUrl from "../../../tests/fixtures/sample.webm?url";
```

### Example

```ts
import { describe, expect, it } from "vitest";
import sampleVideoUrl from "../../../tests/fixtures/sample.webm?url";
import { VideoExporter } from "./videoExporter";

describe("VideoExporter (real browser)", () => {
  it("exports a valid MP4 blob from a real video", async () => {
    const exporter = new VideoExporter({
      videoUrl: sampleVideoUrl,
      width: 320,
      height: 180,
      frameRate: 15,
      bitrate: 1_000_000,
      wallpaper: "#1a1a2e",
      zoomRegions: [],
      showShadow: false,
      shadowIntensity: 0,
      showBlur: false,
      cropRegion: { x: 0, y: 0, width: 1, height: 1 },
    });

    const result = await exporter.export();

    expect(result.success, result.error).toBe(true);
    expect(result.blob).toBeInstanceOf(Blob);
  });
});
```

### Timeouts

Browser tests have a default timeout of 120 seconds per test and 30 seconds per hook (set in `vitest.browser.config.ts`). Export operations are slow — prefer small fixture dimensions (320×180) and low bitrates to keep tests fast.

### Running locally

First install the browser (one-time):

```bash
npm run test:browser:install
```

Then run the tests:

```bash
npm run test:browser
```

---

## Choosing the right type

| Situation | Use |
|---|---|
| Pure function / data transformation | Unit test |
| i18n key coverage | Unit test |
| React hook logic (no real browser APIs) | Unit test |
| `VideoDecoder` / `VideoEncoder` / `MediaRecorder` | Browser test |
| `OffscreenCanvas` / WebGL / Pixi.js rendering | Browser test |
| File export producing a real `Blob` | Browser test |
