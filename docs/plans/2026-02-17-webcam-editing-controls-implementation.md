# Webcam Editing Controls Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add right-panel webcam editing controls (position, shape, shadow, size slider) that apply live in preview and render identically in exported video.

**Architecture:** Keep `webcamSettings` as single source of truth in `VideoEditor`. Add a dedicated webcam settings panel in the existing right settings area, shown only when a webcam timeline region is selected. Use shared webcam layout utilities so preview (`WebcamOverlay`) and export (`FrameRenderer`) use the same sizing/position math.

**Tech Stack:** React 18 + TypeScript, Vitest + Testing Library, existing OpenScreen video editor/export pipeline (PixiJS + WebCodecs).

---

### Task 1: Add shared webcam layout utilities (DRY between preview and export)

**Files:**
- Create: `src/components/video-editor/webcam/webcamLayout.ts`
- Create: `src/components/video-editor/webcam/webcamLayout.test.ts`
- Modify: `src/components/video-editor/types.ts` (webcam settings type/default)

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_WEBCAM_OVERLAY_SETTINGS } from '../types';
import { getWebcamDimensions, getWebcamPosition } from './webcamLayout';

describe('webcamLayout', () => {
  it('uses default sizePercent when not provided', () => {
    const dims = getWebcamDimensions(1920, { ...DEFAULT_WEBCAM_OVERLAY_SETTINGS });
    expect(dims.width).toBeCloseTo(384, 1); // 20%
  });

  it('uses explicit sizePercent for dimensions', () => {
    const dims = getWebcamDimensions(1920, { ...DEFAULT_WEBCAM_OVERLAY_SETTINGS, sizePercent: 30 });
    expect(dims.width).toBeCloseTo(576, 1);
  });

  it('returns preset position for bottom-right', () => {
    const pos = getWebcamPosition(1920, 1080, 384, 216, {
      ...DEFAULT_WEBCAM_OVERLAY_SETTINGS,
      position: 'bottom-right',
    });
    expect(pos.x).toBeGreaterThan(0);
    expect(pos.y).toBeGreaterThan(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/video-editor/webcam/webcamLayout.test.ts`
Expected: FAIL with module/function-not-found errors.

**Step 3: Write minimal implementation**

```ts
// src/components/video-editor/webcam/webcamLayout.ts
import type { WebcamOverlaySettings } from '../types';

const DEFAULT_SIZE_PERCENT = 20;
const MIN_SIZE_PERCENT = 10;
const MAX_SIZE_PERCENT = 40;
const ASPECT_RATIO = 16 / 9;

export function clampSizePercent(value?: number): number {
  const v = value ?? DEFAULT_SIZE_PERCENT;
  return Math.min(MAX_SIZE_PERCENT, Math.max(MIN_SIZE_PERCENT, v));
}

export function getWebcamDimensions(containerWidth: number, settings: WebcamOverlaySettings) {
  const sizePercent = clampSizePercent(settings.sizePercent);
  const width = (containerWidth * sizePercent) / 100;
  const height = settings.shape === 'circle' ? width : width / ASPECT_RATIO;
  return { width, height };
}

export function getWebcamPosition(
  containerWidth: number,
  containerHeight: number,
  width: number,
  height: number,
  settings: WebcamOverlaySettings,
) {
  if (settings.position === 'custom' && settings.customPosition) {
    return {
      x: settings.customPosition.x * containerWidth,
      y: settings.customPosition.y * containerHeight,
    };
  }

  const paddingX = containerWidth * 0.03;
  const paddingY = containerHeight * 0.05;

  switch (settings.position) {
    case 'bottom-left':
      return { x: paddingX, y: containerHeight - height - paddingY };
    case 'top-right':
      return { x: containerWidth - width - paddingX, y: paddingY };
    case 'top-left':
      return { x: paddingX, y: paddingY };
    case 'bottom-right':
    default:
      return { x: containerWidth - width - paddingX, y: containerHeight - height - paddingY };
  }
}
```

Also extend type defaults:

```ts
// src/components/video-editor/types.ts
export interface WebcamOverlaySettings {
  position: WebcamPositionPreset;
  customPosition?: { x: number; y: number };
  shape: WebcamShape;
  shadowIntensity: number;
  sizePercent: number;
}

export const DEFAULT_WEBCAM_OVERLAY_SETTINGS: WebcamOverlaySettings = {
  position: 'bottom-right',
  shape: 'rounded',
  shadowIntensity: 50,
  sizePercent: 20,
};
```

**Step 4: Run tests to verify pass**

Run:
- `npm test -- src/components/video-editor/webcam/webcamLayout.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/video-editor/webcam/webcamLayout.ts src/components/video-editor/webcam/webcamLayout.test.ts src/components/video-editor/types.ts
git commit -m "feat: add shared webcam layout utilities and size setting"
```

---

### Task 2: Wire preview overlay to shared layout + sizePercent

**Files:**
- Modify: `src/components/video-editor/WebcamOverlay.tsx`
- Modify: `src/components/video-editor/WebcamOverlay.test.tsx`

**Step 1: Write the failing test**

```ts
it('applies sizePercent to webcam width', () => {
  const settings = { ...DEFAULT_WEBCAM_OVERLAY_SETTINGS, sizePercent: 30 };
  render(<WebcamOverlay {...defaultProps} settings={settings} />);
  const overlay = screen.getByTestId('webcam-overlay');
  expect(overlay).toHaveStyle({ width: '576px' });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/video-editor/WebcamOverlay.test.tsx`
Expected: FAIL for width assertion.

**Step 3: Write minimal implementation**

```ts
// WebcamOverlay.tsx
import { getWebcamDimensions, getWebcamPosition } from './webcam/webcamLayout';

const { width, height } = getWebcamDimensions(containerWidth, settings);
const position = getWebcamPosition(containerWidth, containerHeight, width, height, settings);
const effectiveHeight = height;
```

Retain existing drag behavior:

```ts
onPositionChange('custom', { x: d.x / containerWidth, y: d.y / containerHeight });
```

**Step 4: Run tests to verify pass**

Run:
- `npm test -- src/components/video-editor/WebcamOverlay.test.tsx`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/video-editor/WebcamOverlay.tsx src/components/video-editor/WebcamOverlay.test.tsx
git commit -m "feat: apply webcam sizePercent in preview overlay"
```

---

### Task 3: Add dedicated right-panel webcam controls UI

**Files:**
- Create: `src/components/video-editor/webcam/WebcamSettingsPanel.tsx`
- Create: `src/components/video-editor/webcam/WebcamSettingsPanel.test.tsx`

**Step 1: Write the failing test**

```ts
it('updates size via slider callback', async () => {
  const onChange = vi.fn();
  render(
    <WebcamSettingsPanel
      settings={DEFAULT_WEBCAM_OVERLAY_SETTINGS}
      onChange={onChange}
    />,
  );

  await userEvent.click(screen.getByRole('button', { name: /top-left/i }));
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ position: 'top-left' }));
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/video-editor/webcam/WebcamSettingsPanel.test.tsx`
Expected: FAIL with component-not-found.

**Step 3: Write minimal implementation**

```tsx
interface WebcamSettingsPanelProps {
  settings: WebcamOverlaySettings;
  onChange: (next: WebcamOverlaySettings) => void;
}

export function WebcamSettingsPanel({ settings, onChange }: WebcamSettingsPanelProps) {
  return (
    <div className="space-y-4">
      {/* position preset buttons */}
      {/* shape selector */}
      {/* shadow slider 0-100 */}
      {/* size slider 10-40 */}
    </div>
  );
}
```

Control behavior rules:
- Position preset change sets `position` and clears `customPosition` when preset is not `custom`.
- Size slider writes `sizePercent`.
- Shape writes `shape`.
- Shadow writes `shadowIntensity`.

**Step 4: Run tests to verify pass**

Run:
- `npm test -- src/components/video-editor/webcam/WebcamSettingsPanel.test.tsx`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/video-editor/webcam/WebcamSettingsPanel.tsx src/components/video-editor/webcam/WebcamSettingsPanel.test.tsx
git commit -m "feat: add webcam settings panel controls"
```

---

### Task 4: Integrate webcam controls into SettingsPanel (conditional by webcam selection)

**Files:**
- Modify: `src/components/video-editor/SettingsPanel.tsx`
- Test: `src/components/video-editor/webcam/WebcamSettingsPanel.test.tsx` (integration assertion)

**Step 1: Write the failing test**

```ts
it('shows webcam settings only when webcam region is selected', () => {
  // Render SettingsPanel wrapper with selectedWebcamId null and non-null
  // Assert webcam controls hidden when null, visible when non-null
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/video-editor/webcam/WebcamSettingsPanel.test.tsx`
Expected: FAIL due missing webcam props/conditional render.

**Step 3: Write minimal implementation**

Update `SettingsPanelProps` with webcam fields:

```ts
selectedWebcamId?: string | null;
webcamSettings?: WebcamOverlaySettings;
onWebcamSettingsChange?: (next: WebcamOverlaySettings) => void;
```

Render panel conditionally:

```tsx
{selectedWebcamId && webcamSettings && onWebcamSettingsChange && (
  <WebcamSettingsPanel
    settings={webcamSettings}
    onChange={onWebcamSettingsChange}
  />
)}
```

**Step 4: Run tests to verify pass**

Run:
- `npx eslint src/components/video-editor/SettingsPanel.tsx`
- `npm test -- src/components/video-editor/webcam/WebcamSettingsPanel.test.tsx`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/video-editor/SettingsPanel.tsx src/components/video-editor/webcam/WebcamSettingsPanel.test.tsx
git commit -m "feat: show webcam settings panel on webcam selection"
```

---

### Task 5: Wire VideoEditor state to SettingsPanel and keep export sync

**Files:**
- Modify: `src/components/video-editor/VideoEditor.tsx`

**Step 1: Write the failing test**

```ts
it('passes webcam settings to settings panel when webcam item is selected', () => {
  // Render VideoEditor with webcam state fixture
  // Select webcam item
  // Assert webcam controls appear and callback updates webcamSettings state
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/video-editor/WebcamOverlay.test.tsx`
Expected: FAIL or missing wiring behavior.

**Step 3: Write minimal implementation**

In `VideoEditor.tsx` pass webcam props into `SettingsPanel`:

```tsx
<SettingsPanel
  // ...existing props
  selectedWebcamId={selectedWebcamId}
  webcamSettings={webcamSettings}
  onWebcamSettingsChange={setWebcamSettings}
/>
```

No extra source-of-truth added. Keep existing export wiring:

```ts
webcamSettings: webcamPath ? webcamSettings : undefined,
```

**Step 4: Run tests to verify pass**

Run:
- `npx eslint src/components/video-editor/VideoEditor.tsx`
- `npm test -- src/components/video-editor/WebcamOverlay.test.tsx src/lib/exporter/webcamExport.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/video-editor/VideoEditor.tsx
git commit -m "feat: connect webcam settings from editor state to right panel"
```

---

### Task 6: Ensure exporter uses shared webcam layout math

**Files:**
- Modify: `src/lib/exporter/frameRenderer.ts`
- Modify: `src/lib/exporter/webcamExport.test.ts`

**Step 1: Write the failing test**

```ts
it('computes webcam export size from sizePercent', () => {
  // Use shared helper expectations: 30% of 1920 => width 576
  // Assert export-side helper/result matches
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/exporter/webcamExport.test.ts`
Expected: FAIL for outdated hardcoded width formula.

**Step 3: Write minimal implementation**

In `frameRenderer.ts` webcam render path, replace hardcoded sizing with shared helper:

```ts
import { getWebcamDimensions, getWebcamPosition } from '@/components/video-editor/webcam/webcamLayout';

const { width: webcamWidth, height: webcamHeight } = getWebcamDimensions(canvasWidth, webcamSettings);
const { x, y } = getWebcamPosition(canvasWidth, canvasHeight, webcamWidth, webcamHeight, webcamSettings);
```

Update tests to assert helper-backed values.

**Step 4: Run tests to verify pass**

Run:
- `npm test -- src/lib/exporter/webcamExport.test.ts src/components/video-editor/webcam/webcamLayout.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/exporter/frameRenderer.ts src/lib/exporter/webcamExport.test.ts src/components/video-editor/webcam/webcamLayout.ts src/components/video-editor/webcam/webcamLayout.test.ts
git commit -m "fix: unify webcam preview and export layout calculations"
```

---

### Task 7: Final verification, docs, and cleanup

**Files:**
- Modify: `.opencode/CHANGELOG.md`
- Optional docs note: `docs/plans/2026-02-17-webcam-editing-controls-implementation.md` (mark done checklist)

**Step 1: Add verification checklist (failing-to-passing behavior)**

Document exact manual checks:

```md
- Select webcam region -> right panel appears
- Change size to 30% -> preview webcam grows
- Change shape to circle -> preview updates
- Export MP4 -> output matches preview for shape/size/position/shadow
```

**Step 2: Run full focused verification**

Run:
- `npx eslint src/components/video-editor/VideoEditor.tsx src/components/video-editor/SettingsPanel.tsx src/components/video-editor/WebcamOverlay.tsx src/components/video-editor/webcam/WebcamSettingsPanel.tsx src/lib/exporter/frameRenderer.ts`
- `npm test -- src/components/video-editor/WebcamOverlay.test.tsx src/components/video-editor/webcam/WebcamSettingsPanel.test.tsx src/components/video-editor/webcam/webcamLayout.test.ts src/lib/exporter/webcamExport.test.ts`

Expected: PASS.

**Step 3: Manual app verification**

Run: `npm run dev`

Expected:
- Webcam settings panel visible only when webcam row item selected.
- Live preview updates for position/shape/shadow/size.
- Exported video matches preview webcam edits.

**Step 4: Update changelog**

Add concise entry to `.opencode/CHANGELOG.md`.

**Step 5: Commit**

```bash
git add .opencode/CHANGELOG.md
git commit -m "docs: record webcam editing controls rollout"
```

---

## Notes for Implementation Engineer

- Use @superpowers:test-driven-development for each task's failing-test-first cycle.
- Use @superpowers:verification-before-completion before declaring feature done.
- Keep commits small and scoped to single task intent.
- Do not bundle unrelated cleanup.
- Preserve existing keyboard/selection behavior in timeline.
