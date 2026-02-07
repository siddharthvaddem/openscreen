// src/utils/keystrokeFilterUtils.test.ts

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  isHotkeyRegion,
  filterKeystrokeRegions,
  getVisibleKeystrokeRegions,
} from './keystrokeFilterUtils';
import type { KeystrokeRegion } from '../components/video-editor/types';
import { DEFAULT_KEYSTROKE_STYLE } from '../components/video-editor/types';

// Helper to create a keystroke region
function createRegion(
  id: string,
  text: string,
  startMs: number = 0,
  endMs: number = 1000
): KeystrokeRegion {
  return {
    id,
    startMs,
    endMs,
    text,
    eventType: 'keystroke',
    positionPreset: 'bottom-center',
    style: { ...DEFAULT_KEYSTROKE_STYLE },
  };
}

describe('keystrokeFilterUtils', () => {
  describe('isHotkeyRegion', () => {
    it('should return true for regions with Ctrl modifier', () => {
      const region = createRegion('1', 'Ctrl + C');
      expect(isHotkeyRegion(region)).toBe(true);
    });

    it('should return true for regions with Alt modifier', () => {
      const region = createRegion('1', 'Alt + Tab');
      expect(isHotkeyRegion(region)).toBe(true);
    });

    it('should return true for regions with Shift modifier', () => {
      const region = createRegion('1', 'Shift + Delete');
      expect(isHotkeyRegion(region)).toBe(true);
    });

    it('should return true for regions with Meta modifier', () => {
      const region = createRegion('1', 'Meta + V');
      expect(isHotkeyRegion(region)).toBe(true);
    });

    it('should return true for regions with multiple modifiers', () => {
      const region = createRegion('1', 'Ctrl + Shift + T');
      expect(isHotkeyRegion(region)).toBe(true);
    });

    it('should return false for regions without modifiers', () => {
      const region = createRegion('1', 'A');
      expect(isHotkeyRegion(region)).toBe(false);
    });

    it('should return false for single keys', () => {
      expect(isHotkeyRegion(createRegion('1', 'Enter'))).toBe(false);
      expect(isHotkeyRegion(createRegion('2', 'Space'))).toBe(false);
      expect(isHotkeyRegion(createRegion('3', '1'))).toBe(false);
      expect(isHotkeyRegion(createRegion('4', 'F'))).toBe(false);
    });

    it('should return false for mouse clicks', () => {
      const region = createRegion('1', 'Left Click');
      expect(isHotkeyRegion(region)).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(isHotkeyRegion(createRegion('1', 'CTRL + C'))).toBe(true);
      expect(isHotkeyRegion(createRegion('2', 'ctrl + c'))).toBe(true);
      expect(isHotkeyRegion(createRegion('3', 'Ctrl + c'))).toBe(true);
    });
  });

  describe('filterKeystrokeRegions', () => {
    const regions = [
      createRegion('1', 'Ctrl + C'),
      createRegion('2', 'A'),
      createRegion('3', 'Alt + Tab'),
      createRegion('4', 'Enter'),
      createRegion('5', 'Shift + Delete'),
      createRegion('6', 'B'),
    ];

    it('should return all regions when showOnlyHotkeys is false', () => {
      const filtered = filterKeystrokeRegions(regions, false);
      expect(filtered).toEqual(regions);
      expect(filtered.length).toBe(6);
    });

    it('should return only hotkey regions when showOnlyHotkeys is true', () => {
      const filtered = filterKeystrokeRegions(regions, true);
      expect(filtered.length).toBe(3);
      expect(filtered.map(r => r.id)).toEqual(['1', '3', '5']);
    });

    it('should return empty array when no hotkeys exist and showOnlyHotkeys is true', () => {
      const nonHotkeyRegions = [
        createRegion('1', 'A'),
        createRegion('2', 'B'),
        createRegion('3', 'Enter'),
      ];
      const filtered = filterKeystrokeRegions(nonHotkeyRegions, true);
      expect(filtered).toEqual([]);
    });

    it('should return all regions when all are hotkeys and showOnlyHotkeys is true', () => {
      const hotkeyRegions = [
        createRegion('1', 'Ctrl + C'),
        createRegion('2', 'Alt + Tab'),
        createRegion('3', 'Shift + Delete'),
      ];
      const filtered = filterKeystrokeRegions(hotkeyRegions, true);
      expect(filtered).toEqual(hotkeyRegions);
    });
  });

  describe('getVisibleKeystrokeRegions', () => {
    const regions = [
      createRegion('1', 'Ctrl + C', 0, 1000),
      createRegion('2', 'A', 500, 1500),
      createRegion('3', 'Alt + Tab', 1000, 2000),
      createRegion('4', 'Enter', 1500, 2500),
      createRegion('5', 'Shift + Delete', 2000, 3000),
    ];

    it('should return regions visible at current time when showOnlyHotkeys is false', () => {
      const visible = getVisibleKeystrokeRegions(regions, 1000, false);
      expect(visible.length).toBe(3);
      expect(visible.map(r => r.id)).toEqual(['1', '2', '3']);
    });

    it('should return only hotkey regions visible at current time when showOnlyHotkeys is true', () => {
      const visible = getVisibleKeystrokeRegions(regions, 1000, true);
      expect(visible.length).toBe(2);
      expect(visible.map(r => r.id)).toEqual(['1', '3']);
    });

    it('should return empty array when no regions are visible at current time', () => {
      const visible = getVisibleKeystrokeRegions(regions, 5000, false);
      expect(visible).toEqual([]);
    });

    it('should filter out non-hotkeys even if they are visible', () => {
      const visible = getVisibleKeystrokeRegions(regions, 1500, true);
      // At 1500ms: regions 2 (A), 3 (Alt+Tab), 4 (Enter) are visible
      // But only 3 is a hotkey
      expect(visible.length).toBe(1);
      expect(visible[0].id).toBe('3');
    });
  });

  /**
   * Property 1: Filter Idempotence
   * 
   * *For any* array of KeystrokeRegion objects and boolean showOnlyHotkeys value,
   * applying filterKeystrokeRegions twice SHALL produce the same result as applying it once.
   * 
   * Validates: Requirements - Runtime filter consistency
   */
  describe('Property 1: Filter idempotence', () => {
    it('should be idempotent - filtering twice gives same result as filtering once', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string(),
              text: fc.oneof(
                fc.constant('Ctrl + C'),
                fc.constant('Alt + Tab'),
                fc.constant('A'),
                fc.constant('Enter'),
                fc.constant('Shift + Delete'),
                fc.constant('B')
              ),
            })
          ),
          fc.boolean(),
          (regionData, showOnlyHotkeys) => {
            const regions = regionData.map((data, i) =>
              createRegion(data.id || `region-${i}`, data.text)
            );

            const filtered1 = filterKeystrokeRegions(regions, showOnlyHotkeys);
            const filtered2 = filterKeystrokeRegions(filtered1, showOnlyHotkeys);

            expect(filtered1).toEqual(filtered2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 2: Filter Subset
   * 
   * *For any* array of KeystrokeRegion objects, when showOnlyHotkeys is true,
   * the filtered result SHALL be a subset of the original array.
   * 
   * Validates: Requirements - Filter does not add new regions
   */
  describe('Property 2: Filter produces subset', () => {
    it('should always produce a subset when filtering', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string(),
              text: fc.oneof(
                fc.constant('Ctrl + C'),
                fc.constant('A'),
                fc.constant('Alt + Tab'),
                fc.constant('Enter')
              ),
            }),
            { minLength: 0, maxLength: 20 }
          ),
          (regionData) => {
            const regions = regionData.map((data, i) =>
              createRegion(data.id || `region-${i}`, data.text)
            );

            const filtered = filterKeystrokeRegions(regions, true);

            // Every filtered region should exist in original
            filtered.forEach(filteredRegion => {
              expect(regions).toContainEqual(filteredRegion);
            });

            // Filtered length should be <= original length
            expect(filtered.length).toBeLessThanOrEqual(regions.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 3: Hotkey Detection Consistency
   * 
   * *For any* KeystrokeRegion with text containing a modifier keyword (ctrl, alt, shift, meta),
   * isHotkeyRegion SHALL return true.
   * 
   * Validates: Requirements - Correct hotkey detection
   */
  describe('Property 3: Hotkey detection consistency', () => {
    it('should detect all regions with modifiers as hotkeys', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('ctrl'),
            fc.constant('alt'),
            fc.constant('shift'),
            fc.constant('meta')
          ),
          fc.string({ minLength: 1, maxLength: 5 }),
          (modifier, key) => {
            const text = `${modifier} + ${key}`;
            const region = createRegion('test', text);

            expect(isHotkeyRegion(region)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
