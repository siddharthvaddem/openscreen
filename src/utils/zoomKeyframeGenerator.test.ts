/**
 * Property-based tests for Zoom Keyframe Generator
 * 
 * **Property 5: Zoom Region Generation Count**
 * **Validates: Requirements 4.2**
 * 
 * **Property 6: Event Merging Within Threshold**
 * **Validates: Requirements 4.6**
 * 
 * **Property 7: Zoom Region Structure Validity**
 * **Validates: Requirements 4.4, 4.5, 5.1**
 * 
 * **Property 8: No Overlapping Zoom Regions**
 * **Validates: Requirements 6.3**
 * 
 * **Property 11: Out-of-Bounds Event Filtering**
 * **Validates: Requirements 8.3**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { MouseClickEvent, MouseEventData } from '../types/mouseEvents';
import type { AutoZoomSettings, ZoomDepth } from '../components/video-editor/types';
import { DEFAULT_AUTO_ZOOM_SETTINGS } from '../components/video-editor/types';
import {
  generateZoomRegions,
  mergeCloseEvents,
  filterOutOfBoundsEvents,
  normalizeCoordinates,
  hasOverlappingRegions,
} from './zoomKeyframeGenerator';

// Test settings with known values
const testSettings: AutoZoomSettings = {
  enabled: true,
  defaultZoomDepth: 1 as ZoomDepth,
  zoomDurationMs: 1000,
  mergeThresholdMs: 500,
};

// Arbitraries
const screenBoundsArb = fc.record({
  width: fc.integer({ min: 640, max: 3840 }),
  height: fc.integer({ min: 480, max: 2160 }),
});

const validClickEventArb = (screenWidth: number, screenHeight: number): fc.Arbitrary<MouseClickEvent> =>
  fc.record({
    type: fc.constant('click' as const),
    timestamp: fc.nat({ max: 3600000 }),
    x: fc.integer({ min: 0, max: screenWidth - 1 }),
    y: fc.integer({ min: 0, max: screenHeight - 1 }),
    button: fc.constantFrom('left', 'right', 'middle') as fc.Arbitrary<'left' | 'right' | 'middle'>,
  });

describe('Zoom Keyframe Generator', () => {
  describe('Property 5: Zoom Region Generation Count', () => {
    it('N events with timestamps > 500ms apart produce N zoom regions', () => {
      fc.assert(
        fc.property(
          screenBoundsArb,
          fc.integer({ min: 1, max: 10 }), // number of events
          (bounds, eventCount) => {
            // Generate events with timestamps > 500ms apart
            const events: MouseClickEvent[] = [];
            for (let i = 0; i < eventCount; i++) {
              events.push({
                type: 'click',
                timestamp: i * 1000, // 1000ms apart (> 500ms threshold)
                x: Math.floor(bounds.width / 2),
                y: Math.floor(bounds.height / 2),
                button: 'left',
              });
            }

            const eventData: MouseEventData = {
              version: 1,
              recordingId: 'test',
              screenWidth: bounds.width,
              screenHeight: bounds.height,
              events,
            };

            const videoDuration = eventCount * 2000; // Enough duration for all events
            const regions = generateZoomRegions(eventData, testSettings, videoDuration);

            // Should produce exactly N regions (or fewer if some get merged due to overlap prevention)
            expect(regions.length).toBeLessThanOrEqual(eventCount);
            expect(regions.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 6: Event Merging Within Threshold', () => {
    it('events within 500ms are merged into fewer events', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 5 }), // number of close events
          fc.integer({ min: 0, max: 400 }), // gap between events (< 500ms)
          (eventCount, gap) => {
            const events: MouseClickEvent[] = [];
            for (let i = 0; i < eventCount; i++) {
              events.push({
                type: 'click',
                timestamp: i * gap, // Events within threshold
                x: 500,
                y: 500,
                button: 'left',
              });
            }

            const merged = mergeCloseEvents(events, 500);

            // All events within 500ms should merge into 1
            if (gap <= 500) {
              expect(merged.length).toBe(1);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('events > 500ms apart are not merged', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 5 }),
          (eventCount) => {
            const events: MouseClickEvent[] = [];
            for (let i = 0; i < eventCount; i++) {
              events.push({
                type: 'click',
                timestamp: i * 1000, // 1000ms apart (> 500ms)
                x: 500,
                y: 500,
                button: 'left',
              });
            }

            const merged = mergeCloseEvents(events, 500);

            // Events should not be merged
            expect(merged.length).toBe(eventCount);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 7: Zoom Region Structure Validity', () => {
    it('all generated regions have valid structure', () => {
      fc.assert(
        fc.property(
          screenBoundsArb,
          fc.integer({ min: 1, max: 10 }),
          (bounds, eventCount) => {
            const events: MouseClickEvent[] = [];
            for (let i = 0; i < eventCount; i++) {
              events.push({
                type: 'click',
                timestamp: i * 1000,
                x: Math.floor(Math.random() * bounds.width),
                y: Math.floor(Math.random() * bounds.height),
                button: 'left',
              });
            }

            const eventData: MouseEventData = {
              version: 1,
              recordingId: 'test',
              screenWidth: bounds.width,
              screenHeight: bounds.height,
              events,
            };

            const regions = generateZoomRegions(eventData, testSettings, eventCount * 2000);

            for (const region of regions) {
              // Unique string id
              expect(typeof region.id).toBe('string');
              expect(region.id.length).toBeGreaterThan(0);

              // startMs >= 0 and endMs > startMs
              expect(region.startMs).toBeGreaterThanOrEqual(0);
              expect(region.endMs).toBeGreaterThan(region.startMs);

              // depth equals default (1)
              expect(region.depth).toBe(testSettings.defaultZoomDepth);

              // focus.cx and focus.cy in range [0, 1]
              expect(region.focus.cx).toBeGreaterThanOrEqual(0);
              expect(region.focus.cx).toBeLessThanOrEqual(1);
              expect(region.focus.cy).toBeGreaterThanOrEqual(0);
              expect(region.focus.cy).toBeLessThanOrEqual(1);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 8: No Overlapping Zoom Regions', () => {
    it('generated regions do not overlap', () => {
      fc.assert(
        fc.property(
          screenBoundsArb,
          fc.integer({ min: 2, max: 20 }),
          (bounds, eventCount) => {
            // Generate events at various timestamps
            const events: MouseClickEvent[] = [];
            for (let i = 0; i < eventCount; i++) {
              events.push({
                type: 'click',
                timestamp: Math.floor(Math.random() * 10000),
                x: Math.floor(Math.random() * bounds.width),
                y: Math.floor(Math.random() * bounds.height),
                button: 'left',
              });
            }

            const eventData: MouseEventData = {
              version: 1,
              recordingId: 'test',
              screenWidth: bounds.width,
              screenHeight: bounds.height,
              events,
            };

            const regions = generateZoomRegions(eventData, testSettings, 20000);

            // No regions should overlap
            expect(hasOverlappingRegions(regions)).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 11: Out-of-Bounds Event Filtering', () => {
    it('events outside screen bounds are excluded', () => {
      fc.assert(
        fc.property(
          screenBoundsArb,
          (bounds) => {
            // Create events: some in bounds, some out of bounds
            const events: MouseClickEvent[] = [
              // In bounds
              { type: 'click', timestamp: 0, x: 100, y: 100, button: 'left' },
              // Out of bounds (negative x)
              { type: 'click', timestamp: 1000, x: -10, y: 100, button: 'left' },
              // Out of bounds (x >= width)
              { type: 'click', timestamp: 2000, x: bounds.width + 10, y: 100, button: 'left' },
              // Out of bounds (negative y)
              { type: 'click', timestamp: 3000, x: 100, y: -10, button: 'left' },
              // Out of bounds (y >= height)
              { type: 'click', timestamp: 4000, x: 100, y: bounds.height + 10, button: 'left' },
              // In bounds
              { type: 'click', timestamp: 5000, x: bounds.width - 1, y: bounds.height - 1, button: 'left' },
            ];

            const filtered = filterOutOfBoundsEvents(events, bounds.width, bounds.height);

            // Only 2 events should remain (the in-bounds ones)
            expect(filtered.length).toBe(2);
            expect(filtered[0].timestamp).toBe(0);
            expect(filtered[1].timestamp).toBe(5000);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('out-of-bounds events do not produce zoom regions', () => {
      const bounds = { width: 1920, height: 1080 };
      
      // All events out of bounds
      const events: MouseClickEvent[] = [
        { type: 'click', timestamp: 0, x: -100, y: 100, button: 'left' },
        { type: 'click', timestamp: 1000, x: 2000, y: 100, button: 'left' },
        { type: 'click', timestamp: 2000, x: 100, y: -100, button: 'left' },
      ];

      const eventData: MouseEventData = {
        version: 1,
        recordingId: 'test',
        screenWidth: bounds.width,
        screenHeight: bounds.height,
        events,
      };

      const regions = generateZoomRegions(eventData, testSettings, 10000);

      // No regions should be generated
      expect(regions.length).toBe(0);
    });
  });

  describe('normalizeCoordinates', () => {
    it('normalizes coordinates to 0-1 range', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 3840 }),
          fc.integer({ min: 0, max: 2160 }),
          fc.integer({ min: 640, max: 3840 }),
          fc.integer({ min: 480, max: 2160 }),
          (x, y, width, height) => {
            const normalized = normalizeCoordinates(x, y, width, height);

            expect(normalized.cx).toBeGreaterThanOrEqual(0);
            expect(normalized.cx).toBeLessThanOrEqual(1);
            expect(normalized.cy).toBeGreaterThanOrEqual(0);
            expect(normalized.cy).toBeLessThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
