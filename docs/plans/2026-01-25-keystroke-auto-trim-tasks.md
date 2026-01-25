# Keystroke Auto-Trim Implementation Tasks

Reference: [Design Document](./2026-01-25-keystroke-auto-trim-design.md)

## Tasks

- [x] 1. Add auto-trim logic to keystrokeRegionGenerator
  - [x] 1.1 Add `DEFAULT_KEYSTROKE_DURATION_MS = 1500` constant
  - [x] 1.2 Modify `generateKeystrokeRegions` to use fixed duration instead of `lingerDurationMs`
  - [x] 1.3 Add auto-trim: if new region starts before previous ends, trim previous region's endMs

- [x] 2. Update property-based tests
  - [x] 2.1 Add test: no two generated regions should overlap
  - [x] 2.2 Update existing tests that reference `lingerDurationMs` in region generation

- [x] 3. Remove Linger Duration slider from UI
  - [x] 3.1 Remove Linger Duration slider from `KeystrokeSettingsPanel.tsx`
  - [x] 3.2 Update related tests in `KeystrokeSettingsPanel.test.ts` (no changes needed - tests still pass)

- [ ] 4. Cleanup (optional)
  - [ ] 4.1 Remove `lingerDurationMs` from `KeystrokeStyle` type (or keep for backwards compat)
  - [ ] 4.2 Update `DEFAULT_KEYSTROKE_STYLE` if type is removed
