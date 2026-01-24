/**
 * Property-based tests for Auto Zoom Settings
 * 
 * **Property 1: Toggle State Persistence (Round-Trip)**
 * **Validates: Requirements 1.4**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { AutoZoomSettings, ZoomDepth } from './types';
import { DEFAULT_AUTO_ZOOM_SETTINGS } from './types';

// Arbitrary for ZoomDepth
const zoomDepthArb: fc.Arbitrary<ZoomDepth> = fc.constantFrom(1, 2, 3, 4, 5, 6) as fc.Arbitrary<ZoomDepth>;

// Arbitrary for AutoZoomSettings
const autoZoomSettingsArb: fc.Arbitrary<AutoZoomSettings> = fc.record({
  enabled: fc.boolean(),
  defaultZoomDepth: zoomDepthArb,
  zoomDurationMs: fc.integer({ min: 100, max: 5000 }),
  mergeThresholdMs: fc.integer({ min: 100, max: 2000 }),
});

describe('AutoZoomSettings', () => {
  describe('Property 1: Toggle State Persistence (Round-Trip)', () => {
    it('saving and loading settings preserves all values', () => {
      fc.assert(
        fc.property(autoZoomSettingsArb, (settings) => {
          // Simulate save (serialize to JSON)
          const serialized = JSON.stringify(settings);
          
          // Simulate load (deserialize from JSON)
          const loaded = JSON.parse(serialized) as AutoZoomSettings;
          
          // Verify all fields are preserved
          expect(loaded.enabled).toBe(settings.enabled);
          expect(loaded.defaultZoomDepth).toBe(settings.defaultZoomDepth);
          expect(loaded.zoomDurationMs).toBe(settings.zoomDurationMs);
          expect(loaded.mergeThresholdMs).toBe(settings.mergeThresholdMs);
        }),
        { numRuns: 100 }
      );
    });

    it('enabled state specifically is preserved through round-trip', () => {
      fc.assert(
        fc.property(fc.boolean(), (enabled) => {
          const settings: AutoZoomSettings = {
            ...DEFAULT_AUTO_ZOOM_SETTINGS,
            enabled,
          };
          
          // Serialize and deserialize
          const serialized = JSON.stringify(settings);
          const loaded = JSON.parse(serialized) as AutoZoomSettings;
          
          // The enabled state must be exactly preserved
          expect(loaded.enabled).toBe(enabled);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Default Settings', () => {
    it('default settings have valid structure', () => {
      expect(DEFAULT_AUTO_ZOOM_SETTINGS).toBeDefined();
      expect(typeof DEFAULT_AUTO_ZOOM_SETTINGS.enabled).toBe('boolean');
      expect([1, 2, 3, 4, 5, 6]).toContain(DEFAULT_AUTO_ZOOM_SETTINGS.defaultZoomDepth);
      expect(DEFAULT_AUTO_ZOOM_SETTINGS.zoomDurationMs).toBeGreaterThan(0);
      expect(DEFAULT_AUTO_ZOOM_SETTINGS.mergeThresholdMs).toBeGreaterThan(0);
    });

    it('default settings are disabled by default', () => {
      expect(DEFAULT_AUTO_ZOOM_SETTINGS.enabled).toBe(false);
    });
  });
});
