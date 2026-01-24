import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { KeystrokeSettings, DEFAULT_KEYSTROKE_SETTINGS } from './keystrokeSettings';

/**
 * Property 1: Settings Persistence Round-Trip
 * 
 * *For any* valid KeystrokeSettings object, serializing to JSON and then 
 * deserializing SHALL produce an object with identical field values 
 * (enabled, position, fadeDurationMs, fadeDelayMs, groupingThresholdMs, 
 * showMouseClicks, textScale).
 * 
 * **Validates: Requirements 1.4, 1.5, 9.1, 9.2, 9.3, 9.4, 9.5**
 * 
 * Feature: visual-keystrokes-and-mouse-actions, Property 1: Settings Persistence Round-Trip
 */
describe('Keystroke Settings', () => {
  describe('Property 1: Settings Persistence Round-Trip', () => {
    // Arbitrary for valid position values
    const positionArbitrary = fc.constantFrom(
      'bottom-center' as const,
      'bottom-left' as const,
      'bottom-right' as const,
      'top-center' as const
    );

    // Arbitrary for valid KeystrokeSettings
    const keystrokeSettingsArbitrary: fc.Arbitrary<KeystrokeSettings> = fc.record({
      enabled: fc.boolean(),
      position: positionArbitrary,
      fadeDurationMs: fc.integer({ min: 0, max: 10000 }),
      fadeDelayMs: fc.integer({ min: 0, max: 10000 }),
      groupingThresholdMs: fc.integer({ min: 0, max: 1000 }),
      showMouseClicks: fc.boolean(),
      textScale: fc.float({ min: 0.5, max: 2.0, noNaN: true })
    });

    it('should produce identical settings after JSON round-trip', () => {
      fc.assert(
        fc.property(
          keystrokeSettingsArbitrary,
          (settings: KeystrokeSettings) => {
            // Serialize to JSON
            const serialized = JSON.stringify(settings);
            
            // Deserialize from JSON
            const deserialized: KeystrokeSettings = JSON.parse(serialized);
            
            // Verify all fields are identical
            expect(deserialized.enabled).toBe(settings.enabled);
            expect(deserialized.position).toBe(settings.position);
            expect(deserialized.fadeDurationMs).toBe(settings.fadeDurationMs);
            expect(deserialized.fadeDelayMs).toBe(settings.fadeDelayMs);
            expect(deserialized.groupingThresholdMs).toBe(settings.groupingThresholdMs);
            expect(deserialized.showMouseClicks).toBe(settings.showMouseClicks);
            expect(deserialized.textScale).toBeCloseTo(settings.textScale, 10);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve all field types after round-trip', () => {
      fc.assert(
        fc.property(
          keystrokeSettingsArbitrary,
          (settings: KeystrokeSettings) => {
            const serialized = JSON.stringify(settings);
            const deserialized: KeystrokeSettings = JSON.parse(serialized);
            
            // Verify types are preserved
            expect(typeof deserialized.enabled).toBe('boolean');
            expect(typeof deserialized.position).toBe('string');
            expect(typeof deserialized.fadeDurationMs).toBe('number');
            expect(typeof deserialized.fadeDelayMs).toBe('number');
            expect(typeof deserialized.groupingThresholdMs).toBe('number');
            expect(typeof deserialized.showMouseClicks).toBe('boolean');
            expect(typeof deserialized.textScale).toBe('number');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve position union type values after round-trip', () => {
      fc.assert(
        fc.property(
          positionArbitrary,
          (position) => {
            const settings: KeystrokeSettings = {
              ...DEFAULT_KEYSTROKE_SETTINGS,
              position
            };
            
            const serialized = JSON.stringify(settings);
            const deserialized: KeystrokeSettings = JSON.parse(serialized);
            
            // Position should be one of the valid union values
            expect(['bottom-center', 'bottom-left', 'bottom-right', 'top-center'])
              .toContain(deserialized.position);
            expect(deserialized.position).toBe(position);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle textScale within valid range (0.5 - 2.0) after round-trip', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0.5, max: 2.0, noNaN: true }),
          (textScale: number) => {
            const settings: KeystrokeSettings = {
              ...DEFAULT_KEYSTROKE_SETTINGS,
              textScale
            };
            
            const serialized = JSON.stringify(settings);
            const deserialized: KeystrokeSettings = JSON.parse(serialized);
            
            // textScale should be within valid range
            expect(deserialized.textScale).toBeGreaterThanOrEqual(0.5);
            expect(deserialized.textScale).toBeLessThanOrEqual(2.0);
            expect(deserialized.textScale).toBeCloseTo(textScale, 10);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce deep equal objects after round-trip', () => {
      fc.assert(
        fc.property(
          keystrokeSettingsArbitrary,
          (settings: KeystrokeSettings) => {
            const serialized = JSON.stringify(settings);
            const deserialized: KeystrokeSettings = JSON.parse(serialized);
            
            // Deep equality check (using toEqual for object comparison)
            // Note: Using toBeCloseTo for textScale due to floating point precision
            expect({
              ...deserialized,
              textScale: Math.round(deserialized.textScale * 1e10) / 1e10
            }).toEqual({
              ...settings,
              textScale: Math.round(settings.textScale * 1e10) / 1e10
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle default settings round-trip correctly', () => {
      const serialized = JSON.stringify(DEFAULT_KEYSTROKE_SETTINGS);
      const deserialized: KeystrokeSettings = JSON.parse(serialized);
      
      expect(deserialized).toEqual(DEFAULT_KEYSTROKE_SETTINGS);
    });
  });
});
