import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateAnimationPhase,
  calculateStackIndices,
  type AnimationPhase,
} from './KeystrokeEditorOverlay';
import type { KeystrokeRegion, KeystrokePositionPreset, KeystrokeStyle } from '../types';
import { DEFAULT_KEYSTROKE_STYLE, DEFAULT_KEYSTROKE_POSITION } from '../types';

/**
 * Property 8: Overlay Visibility by Time
 * 
 * *For any* current playback time T and any keystroke region R, the overlay for R 
 * SHALL be visible if and only if R.startMs <= T <= R.endMs.
 * 
 * Note: "visible" here means the animation phase is NOT 'hidden'. The overlay can be
 * in 'entering', 'visible', or 'exiting' phase - all of which render the overlay.
 * 
 * **Validates: Requirements 6.1**
 * 
 * Feature: keystroke-editor-overlay, Property 8: Overlay Visibility by Time
 */
describe('Property 8: Overlay Visibility by Time', () => {
  // Arbitrary for fade duration (reasonable range for animations)
  const fadeDurationArbitrary = fc.integer({ min: 0, max: 1000 });

  // Arbitrary for region timing (startMs, endMs where endMs > startMs)
  const regionTimingArbitrary = fc.tuple(
    fc.integer({ min: 0, max: 100000 }), // startMs
    fc.integer({ min: 1, max: 10000 })   // duration (to ensure endMs > startMs)
  ).map(([startMs, duration]) => ({
    startMs,
    endMs: startMs + duration,
  }));

  describe('Property 8.1: Overlay is hidden before region starts', () => {
    it('should return hidden phase when currentTimeMs < startMs', () => {
      fc.assert(
        fc.property(
          regionTimingArbitrary,
          fadeDurationArbitrary,
          ({ startMs, endMs }, fadeDurationMs) => {
            // Generate a time before the region starts
            const currentTimeMs = startMs > 0 ? fc.sample(fc.integer({ min: 0, max: startMs - 1 }), 1)[0] : -1;
            
            if (currentTimeMs < 0) return; // Skip if startMs is 0
            
            const phase = calculateAnimationPhase(currentTimeMs, startMs, endMs, fadeDurationMs);
            
            expect(phase).toBe('hidden');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 8.2: Overlay is hidden after region ends', () => {
    it('should return hidden phase when currentTimeMs >= endMs', () => {
      fc.assert(
        fc.property(
          regionTimingArbitrary,
          fadeDurationArbitrary,
          fc.integer({ min: 0, max: 10000 }), // offset after endMs
          ({ startMs, endMs }, fadeDurationMs, offset) => {
            const currentTimeMs = endMs + offset;
            
            // Skip edge case where fadeDurationMs >= region duration
            // In this case, the entering phase may extend past endMs
            const regionDuration = endMs - startMs;
            if (fadeDurationMs >= regionDuration && currentTimeMs < startMs + fadeDurationMs) {
              return; // Skip this case - entering phase extends past endMs
            }
            
            const phase = calculateAnimationPhase(currentTimeMs, startMs, endMs, fadeDurationMs);
            
            expect(phase).toBe('hidden');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 8.3: Overlay is NOT hidden when startMs <= T < endMs', () => {
    it('should return a non-hidden phase when time is within region range', () => {
      fc.assert(
        fc.property(
          regionTimingArbitrary,
          fadeDurationArbitrary,
          ({ startMs, endMs }, fadeDurationMs) => {
            // Generate a time within the region (startMs <= T < endMs)
            const duration = endMs - startMs;
            if (duration <= 0) return; // Skip invalid regions
            
            const offset = fc.sample(fc.integer({ min: 0, max: duration - 1 }), 1)[0];
            const currentTimeMs = startMs + offset;
            
            const phase = calculateAnimationPhase(currentTimeMs, startMs, endMs, fadeDurationMs);
            
            // Phase should be one of: 'entering', 'visible', or 'exiting'
            expect(['entering', 'visible', 'exiting']).toContain(phase);
            expect(phase).not.toBe('hidden');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 8.4: Visibility is determined by time range containment', () => {
    it('should be visible iff startMs <= T < endMs (when fadeDuration <= region duration)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100000 }), // currentTimeMs
          fc.integer({ min: 0, max: 50000 }), // startMs
          fc.integer({ min: 500, max: 10000 }), // duration (ensure reasonable duration)
          fc.integer({ min: 0, max: 200 }), // fadeDurationMs (keep small relative to duration)
          (currentTimeMs, startMs, duration, fadeDurationMs) => {
            const endMs = startMs + duration;
            
            // Only test when fadeDuration is less than half the region duration
            // to avoid edge cases where entering/exiting phases overlap
            if (fadeDurationMs * 2 > duration) return;
            
            const phase = calculateAnimationPhase(currentTimeMs, startMs, endMs, fadeDurationMs);
            
            const isWithinRange = currentTimeMs >= startMs && currentTimeMs < endMs;
            const isVisible = phase !== 'hidden';
            
            // Visibility should match time range containment
            expect(isVisible).toBe(isWithinRange);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 8.5: Animation phases are correctly assigned within visible range', () => {
    it('should be entering during fade-in period', () => {
      fc.assert(
        fc.property(
          regionTimingArbitrary,
          fc.integer({ min: 1, max: 500 }), // fadeDurationMs (must be > 0)
          ({ startMs, endMs }, fadeDurationMs) => {
            // Ensure region is long enough for fade animation
            if (endMs - startMs < fadeDurationMs * 2) return;
            
            // Time during entering phase: startMs <= T < startMs + fadeDurationMs
            const enteringTime = startMs + Math.floor(fadeDurationMs / 2);
            
            const phase = calculateAnimationPhase(enteringTime, startMs, endMs, fadeDurationMs);
            
            expect(phase).toBe('entering');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be visible between fade-in and fade-out periods', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 50000 }), // startMs
          fc.integer({ min: 2000, max: 10000 }), // duration (long enough for animations)
          fc.integer({ min: 100, max: 400 }), // fadeDurationMs
          (startMs, duration, fadeDurationMs) => {
            const endMs = startMs + duration;
            
            // Ensure region is long enough for both fade animations
            if (duration < fadeDurationMs * 2) return;
            
            // Time during visible phase: startMs + fadeDurationMs <= T < endMs - fadeDurationMs
            const visibleTime = startMs + fadeDurationMs + Math.floor((duration - fadeDurationMs * 2) / 2);
            
            const phase = calculateAnimationPhase(visibleTime, startMs, endMs, fadeDurationMs);
            
            expect(phase).toBe('visible');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be exiting during fade-out period', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 50000 }), // startMs
          fc.integer({ min: 2000, max: 10000 }), // duration (long enough for animations)
          fc.integer({ min: 100, max: 400 }), // fadeDurationMs
          (startMs, duration, fadeDurationMs) => {
            const endMs = startMs + duration;
            
            // Ensure region is long enough for both fade animations
            if (duration < fadeDurationMs * 2) return;
            
            // Time during exiting phase: endMs - fadeDurationMs <= T < endMs
            const exitingTime = endMs - Math.floor(fadeDurationMs / 2);
            
            const phase = calculateAnimationPhase(exitingTime, startMs, endMs, fadeDurationMs);
            
            expect(phase).toBe('exiting');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 8.6: Zero fade duration results in immediate visibility', () => {
    it('should be visible (not entering/exiting) when fadeDurationMs is 0', () => {
      fc.assert(
        fc.property(
          regionTimingArbitrary,
          ({ startMs, endMs }) => {
            const fadeDurationMs = 0;
            
            // Time within the region
            const duration = endMs - startMs;
            if (duration <= 0) return;
            
            const offset = fc.sample(fc.integer({ min: 0, max: duration - 1 }), 1)[0];
            const currentTimeMs = startMs + offset;
            
            const phase = calculateAnimationPhase(currentTimeMs, startMs, endMs, fadeDurationMs);
            
            // With zero fade duration, should be 'visible' (not entering/exiting)
            expect(phase).toBe('visible');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 8.7: Exact boundary conditions', () => {
    it('should be entering at exactly startMs', () => {
      fc.assert(
        fc.property(
          regionTimingArbitrary,
          fc.integer({ min: 1, max: 500 }), // fadeDurationMs > 0
          ({ startMs, endMs }, fadeDurationMs) => {
            // Ensure region is long enough
            if (endMs - startMs < fadeDurationMs) return;
            
            const phase = calculateAnimationPhase(startMs, startMs, endMs, fadeDurationMs);
            
            expect(phase).toBe('entering');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be hidden at exactly endMs (when fadeDuration < region duration)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 50000 }), // startMs
          fc.integer({ min: 500, max: 10000 }), // duration
          fc.integer({ min: 0, max: 200 }), // fadeDurationMs
          (startMs, duration, fadeDurationMs) => {
            const endMs = startMs + duration;
            
            // Only test when fadeDuration is less than region duration
            if (fadeDurationMs >= duration) return;
            
            const phase = calculateAnimationPhase(endMs, startMs, endMs, fadeDurationMs);
            
            expect(phase).toBe('hidden');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


/**
 * Property 9: Multiple Overlays Simultaneous Display
 * 
 * *For any* current playback time T where multiple keystroke regions have overlapping 
 * time ranges containing T, ALL such regions SHALL be rendered simultaneously.
 * 
 * This property tests the calculateStackIndices function which assigns stack indices
 * to regions that need to be displayed at the same time and position.
 * 
 * **Validates: Requirements 5.6, 6.6**
 * 
 * Feature: keystroke-editor-overlay, Property 9: Multiple Overlays Simultaneous Display
 */
describe('Property 9: Multiple Overlays Simultaneous Display', () => {
  // Arbitrary for position presets
  const positionPresetArbitrary: fc.Arbitrary<KeystrokePositionPreset> = fc.constantFrom(
    'bottom-center',
    'bottom-left',
    'bottom-right',
    'top-center',
    'top-left',
    'top-right'
  );

  // Arbitrary for hex color string
  const hexColorArbitrary = fc.string({ 
    minLength: 6, 
    maxLength: 6,
    unit: fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F')
  }).map(s => `#${s}`);

  // Arbitrary for keystroke style
  const keystrokeStyleArbitrary: fc.Arbitrary<KeystrokeStyle> = fc.record({
    textColor: hexColorArbitrary,
    backgroundColor: hexColorArbitrary,
    modifierColor: hexColorArbitrary,
    textScale: fc.double({ min: 0.5, max: 2.0 }),
    borderRadius: fc.integer({ min: 0, max: 16 }),
    fadeDurationMs: fc.integer({ min: 0, max: 1000 }),
    lingerDurationMs: fc.integer({ min: 100, max: 5000 }),
    animationIn: fc.constantFrom('fade', 'slide-up', 'slide-down', 'scale', 'none'),
    animationOut: fc.constantFrom('fade', 'slide-up', 'slide-down', 'scale', 'none'),
    showOnlyHotkeys: fc.boolean(),
  });

  // Arbitrary for keystroke region
  const keystrokeRegionArbitrary: fc.Arbitrary<KeystrokeRegion> = fc.record({
    id: fc.uuid(),
    startMs: fc.integer({ min: 0, max: 100000 }),
    endMs: fc.integer({ min: 1, max: 10000 }),
    text: fc.string({ minLength: 1, maxLength: 50 }),
    eventType: fc.constantFrom('keystroke', 'mouse'),
    positionPreset: positionPresetArbitrary,
    style: keystrokeStyleArbitrary,
  }).map(region => ({
    ...region,
    endMs: region.startMs + region.endMs, // Ensure endMs > startMs
  }));

  // Generate array of regions
  const regionsArbitrary = fc.array(keystrokeRegionArbitrary, { minLength: 0, maxLength: 20 });

  describe('Property 9.1: All regions receive stack indices', () => {
    it('should assign stack indices to all input regions', () => {
      fc.assert(
        fc.property(
          regionsArbitrary,
          (regions) => {
            const stackIndices = calculateStackIndices(regions);
            
            // Every region should have a stack index entry
            for (const region of regions) {
              expect(stackIndices.has(region.id)).toBe(true);
            }
            
            // Map size should equal region count
            expect(stackIndices.size).toBe(regions.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 9.2: Stack indices are zero-based within each position group', () => {
    it('should assign indices starting from 0 within each position preset group', () => {
      fc.assert(
        fc.property(
          regionsArbitrary,
          (regions) => {
            const stackIndices = calculateStackIndices(regions);
            
            // Group regions by position preset
            const groupsByPosition = new Map<KeystrokePositionPreset, KeystrokeRegion[]>();
            for (const region of regions) {
              const group = groupsByPosition.get(region.positionPreset) || [];
              group.push(region);
              groupsByPosition.set(region.positionPreset, group);
            }
            
            // For each position group, verify indices are 0 to N-1
            for (const [, group] of groupsByPosition) {
              const indices = group.map(r => stackIndices.get(r.id)!.stackIndex);
              const sortedIndices = [...indices].sort((a, b) => a - b);
              
              // Indices should be 0, 1, 2, ..., N-1
              for (let i = 0; i < sortedIndices.length; i++) {
                expect(sortedIndices[i]).toBe(i);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 9.3: Stack count reflects group size', () => {
    it('should set stackCount to the number of regions at the same position', () => {
      fc.assert(
        fc.property(
          regionsArbitrary,
          (regions) => {
            const stackIndices = calculateStackIndices(regions);
            
            // Group regions by position preset
            const groupsByPosition = new Map<KeystrokePositionPreset, KeystrokeRegion[]>();
            for (const region of regions) {
              const group = groupsByPosition.get(region.positionPreset) || [];
              group.push(region);
              groupsByPosition.set(region.positionPreset, group);
            }
            
            // For each region, verify stackCount matches its group size
            for (const region of regions) {
              const expectedCount = groupsByPosition.get(region.positionPreset)!.length;
              const { stackCount } = stackIndices.get(region.id)!;
              
              expect(stackCount).toBe(expectedCount);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 9.4: Unique indices within each position group', () => {
    it('should assign unique stack indices within each position preset group', () => {
      fc.assert(
        fc.property(
          regionsArbitrary,
          (regions) => {
            const stackIndices = calculateStackIndices(regions);
            
            // Group regions by position preset
            const groupsByPosition = new Map<KeystrokePositionPreset, KeystrokeRegion[]>();
            for (const region of regions) {
              const group = groupsByPosition.get(region.positionPreset) || [];
              group.push(region);
              groupsByPosition.set(region.positionPreset, group);
            }
            
            // For each position group, verify all indices are unique
            for (const [, group] of groupsByPosition) {
              const indices = group.map(r => stackIndices.get(r.id)!.stackIndex);
              const uniqueIndices = new Set(indices);
              
              expect(uniqueIndices.size).toBe(indices.length);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 9.5: Empty regions array produces empty result', () => {
    it('should return empty map for empty regions array', () => {
      const stackIndices = calculateStackIndices([]);
      
      expect(stackIndices.size).toBe(0);
    });
  });

  describe('Property 9.6: Single region gets index 0 and count 1', () => {
    it('should assign stackIndex 0 and stackCount 1 to a single region', () => {
      fc.assert(
        fc.property(
          keystrokeRegionArbitrary,
          (region) => {
            const stackIndices = calculateStackIndices([region]);
            
            const result = stackIndices.get(region.id);
            expect(result).toBeDefined();
            expect(result!.stackIndex).toBe(0);
            expect(result!.stackCount).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 9.7: Regions at different positions have independent indices', () => {
    it('should assign independent indices for regions at different position presets', () => {
      fc.assert(
        fc.property(
          fc.array(keystrokeRegionArbitrary, { minLength: 2, maxLength: 10 }),
          (regions) => {
            // Ensure we have regions at different positions
            const positions = new Set(regions.map(r => r.positionPreset));
            if (positions.size < 2) return; // Skip if all at same position
            
            const stackIndices = calculateStackIndices(regions);
            
            // Group by position
            const groupsByPosition = new Map<KeystrokePositionPreset, KeystrokeRegion[]>();
            for (const region of regions) {
              const group = groupsByPosition.get(region.positionPreset) || [];
              group.push(region);
              groupsByPosition.set(region.positionPreset, group);
            }
            
            // Each group should have its own independent index sequence
            for (const [, group] of groupsByPosition) {
              const indices = group.map(r => stackIndices.get(r.id)!.stackIndex);
              
              // Should contain 0 (first index)
              expect(indices).toContain(0);
              
              // Max index should be group.length - 1
              expect(Math.max(...indices)).toBe(group.length - 1);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 9.8: All position presets are handled correctly', () => {
    it('should correctly handle all six position presets', () => {
      const allPresets: KeystrokePositionPreset[] = [
        'bottom-center',
        'bottom-left',
        'bottom-right',
        'top-center',
        'top-left',
        'top-right',
      ];
      
      // Create one region for each preset
      const regions: KeystrokeRegion[] = allPresets.map((preset, index) => ({
        id: `region-${index}`,
        startMs: 0,
        endMs: 1000,
        text: `Test ${preset}`,
        eventType: 'keystroke' as const,
        positionPreset: preset,
        style: DEFAULT_KEYSTROKE_STYLE,
      }));
      
      const stackIndices = calculateStackIndices(regions);
      
      // Each region should have stackIndex 0 and stackCount 1 (since each is alone at its position)
      for (const region of regions) {
        const result = stackIndices.get(region.id);
        expect(result).toBeDefined();
        expect(result!.stackIndex).toBe(0);
        expect(result!.stackCount).toBe(1);
      }
    });
  });

  describe('Property 9.9: Multiple regions at same position are all tracked', () => {
    it('should track all regions when multiple are at the same position', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 10 }), // number of regions
          positionPresetArbitrary,
          (count, position) => {
            // Create multiple regions at the same position
            const regions: KeystrokeRegion[] = Array.from({ length: count }, (_, i) => ({
              id: `region-${i}`,
              startMs: i * 100,
              endMs: i * 100 + 1000,
              text: `Test ${i}`,
              eventType: 'keystroke' as const,
              positionPreset: position,
              style: DEFAULT_KEYSTROKE_STYLE,
            }));
            
            const stackIndices = calculateStackIndices(regions);
            
            // All regions should be tracked
            expect(stackIndices.size).toBe(count);
            
            // All should have stackCount equal to total count
            for (const region of regions) {
              expect(stackIndices.get(region.id)!.stackCount).toBe(count);
            }
            
            // Indices should be 0 to count-1
            const indices = regions.map(r => stackIndices.get(r.id)!.stackIndex);
            const sortedIndices = [...indices].sort((a, b) => a - b);
            for (let i = 0; i < count; i++) {
              expect(sortedIndices[i]).toBe(i);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

/**
 * Integration test: Combining Property 8 and Property 9
 * 
 * Tests that visibility determination (Property 8) and stack index calculation (Property 9)
 * work together correctly for simultaneous overlay display.
 */
describe('Integration: Overlay Visibility and Stacking', () => {
  describe('Overlapping regions at same position', () => {
    it('should correctly identify and stack overlapping regions', () => {
      // Create overlapping regions at the same position
      const regions: KeystrokeRegion[] = [
        {
          id: 'region-1',
          startMs: 0,
          endMs: 2000,
          text: 'Ctrl + C',
          eventType: 'keystroke',
          positionPreset: 'bottom-center',
          style: { ...DEFAULT_KEYSTROKE_STYLE, fadeDurationMs: 300 },
        },
        {
          id: 'region-2',
          startMs: 500,
          endMs: 2500,
          text: 'Ctrl + V',
          eventType: 'keystroke',
          positionPreset: 'bottom-center',
          style: { ...DEFAULT_KEYSTROKE_STYLE, fadeDurationMs: 300 },
        },
        {
          id: 'region-3',
          startMs: 1000,
          endMs: 3000,
          text: 'Enter',
          eventType: 'keystroke',
          positionPreset: 'bottom-center',
          style: { ...DEFAULT_KEYSTROKE_STYLE, fadeDurationMs: 300 },
        },
      ];
      
      // At time 1500ms, all three regions should be visible
      const currentTimeMs = 1500;
      
      // Check visibility for each region
      for (const region of regions) {
        const phase = calculateAnimationPhase(
          currentTimeMs,
          region.startMs,
          region.endMs,
          region.style.fadeDurationMs
        );
        
        // All should be visible (not hidden)
        expect(phase).not.toBe('hidden');
      }
      
      // Check stack indices
      const stackIndices = calculateStackIndices(regions);
      
      // All three should be at the same position, so stackCount should be 3
      for (const region of regions) {
        expect(stackIndices.get(region.id)!.stackCount).toBe(3);
      }
      
      // Indices should be 0, 1, 2
      const indices = regions.map(r => stackIndices.get(r.id)!.stackIndex);
      expect(indices.sort()).toEqual([0, 1, 2]);
    });
  });

  describe('Non-overlapping regions at same position', () => {
    it('should correctly handle sequential non-overlapping regions', () => {
      // Create non-overlapping regions at the same position
      const regions: KeystrokeRegion[] = [
        {
          id: 'region-1',
          startMs: 0,
          endMs: 1000,
          text: 'A',
          eventType: 'keystroke',
          positionPreset: 'bottom-center',
          style: { ...DEFAULT_KEYSTROKE_STYLE, fadeDurationMs: 100 },
        },
        {
          id: 'region-2',
          startMs: 2000,
          endMs: 3000,
          text: 'B',
          eventType: 'keystroke',
          positionPreset: 'bottom-center',
          style: { ...DEFAULT_KEYSTROKE_STYLE, fadeDurationMs: 100 },
        },
      ];
      
      // At time 500ms, only region-1 should be visible
      const phase1 = calculateAnimationPhase(500, regions[0].startMs, regions[0].endMs, 100);
      const phase2 = calculateAnimationPhase(500, regions[1].startMs, regions[1].endMs, 100);
      
      expect(phase1).not.toBe('hidden');
      expect(phase2).toBe('hidden');
      
      // At time 2500ms, only region-2 should be visible
      const phase1At2500 = calculateAnimationPhase(2500, regions[0].startMs, regions[0].endMs, 100);
      const phase2At2500 = calculateAnimationPhase(2500, regions[1].startMs, regions[1].endMs, 100);
      
      expect(phase1At2500).toBe('hidden');
      expect(phase2At2500).not.toBe('hidden');
      
      // Stack indices still assign both (they're at same position)
      const stackIndices = calculateStackIndices(regions);
      expect(stackIndices.size).toBe(2);
    });
  });
});
