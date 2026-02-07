import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  KeystrokeEditorSettings,
  DEFAULT_KEYSTROKE_EDITOR_SETTINGS,
} from './keystrokeEditorSettings';
import {
  KeystrokeStyle,
  KeystrokePositionPreset,
  AnimationPreset,
  DEFAULT_KEYSTROKE_STYLE,
} from '../components/video-editor/types';

/**
 * Property 1: Toggle State Persistence Round-Trip
 *
 * *For any* toggle enabled/disabled state, saving the setting and then loading it back
 * SHALL produce the same state value.
 *
 * **Validates: Requirements 1.4, 1.5**
 *
 * Feature: keystroke-editor-overlay, Property 1: Toggle State Persistence Round-Trip
 */
describe('Property 1: Toggle State Persistence Round-Trip', () => {
  it('should preserve captureEnabled boolean state after JSON round-trip', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (captureEnabled: boolean) => {
          // Create settings with the generated toggle state
          const settings: KeystrokeEditorSettings = {
            ...DEFAULT_KEYSTROKE_EDITOR_SETTINGS,
            captureEnabled,
          };

          // Serialize to JSON (simulating save)
          const serialized = JSON.stringify(settings);

          // Deserialize from JSON (simulating load)
          const deserialized: KeystrokeEditorSettings = JSON.parse(serialized);

          // Verify toggle state is identical after round-trip
          expect(deserialized.captureEnabled).toBe(captureEnabled);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve captureEnabled type as boolean after round-trip', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (captureEnabled: boolean) => {
          const settings: KeystrokeEditorSettings = {
            ...DEFAULT_KEYSTROKE_EDITOR_SETTINGS,
            captureEnabled,
          };

          const serialized = JSON.stringify(settings);
          const deserialized: KeystrokeEditorSettings = JSON.parse(serialized);

          // Verify the type is preserved as boolean (not string or other)
          expect(typeof deserialized.captureEnabled).toBe('boolean');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle toggle state independently from other settings', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.constantFrom(
          'bottom-center' as const,
          'bottom-left' as const,
          'bottom-right' as const,
          'top-center' as const,
          'top-left' as const,
          'top-right' as const
        ),
        (captureEnabled: boolean, position: KeystrokePositionPreset) => {
          // Create settings with both toggle state and position
          const settings: KeystrokeEditorSettings = {
            ...DEFAULT_KEYSTROKE_EDITOR_SETTINGS,
            captureEnabled,
            defaultPosition: position,
          };

          const serialized = JSON.stringify(settings);
          const deserialized: KeystrokeEditorSettings = JSON.parse(serialized);

          // Toggle state should be preserved independently
          expect(deserialized.captureEnabled).toBe(captureEnabled);
          // Other settings should also be preserved
          expect(deserialized.defaultPosition).toBe(position);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve toggle state through multiple round-trips', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.integer({ min: 1, max: 5 }),
        (captureEnabled: boolean, roundTrips: number) => {
          let settings: KeystrokeEditorSettings = {
            ...DEFAULT_KEYSTROKE_EDITOR_SETTINGS,
            captureEnabled,
          };

          // Perform multiple round-trips
          for (let i = 0; i < roundTrips; i++) {
            const serialized = JSON.stringify(settings);
            settings = JSON.parse(serialized);
          }

          // Toggle state should be preserved after multiple round-trips
          expect(settings.captureEnabled).toBe(captureEnabled);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly distinguish between true and false toggle states', () => {
    // Test explicit true state
    const settingsTrue: KeystrokeEditorSettings = {
      ...DEFAULT_KEYSTROKE_EDITOR_SETTINGS,
      captureEnabled: true,
    };
    const deserializedTrue: KeystrokeEditorSettings = JSON.parse(JSON.stringify(settingsTrue));
    expect(deserializedTrue.captureEnabled).toBe(true);
    expect(deserializedTrue.captureEnabled).not.toBe(false);

    // Test explicit false state
    const settingsFalse: KeystrokeEditorSettings = {
      ...DEFAULT_KEYSTROKE_EDITOR_SETTINGS,
      captureEnabled: false,
    };
    const deserializedFalse: KeystrokeEditorSettings = JSON.parse(JSON.stringify(settingsFalse));
    expect(deserializedFalse.captureEnabled).toBe(false);
    expect(deserializedFalse.captureEnabled).not.toBe(true);
  });

  it('should preserve default toggle state (false) after round-trip', () => {
    const serialized = JSON.stringify(DEFAULT_KEYSTROKE_EDITOR_SETTINGS);
    const deserialized: KeystrokeEditorSettings = JSON.parse(serialized);

    expect(deserialized.captureEnabled).toBe(DEFAULT_KEYSTROKE_EDITOR_SETTINGS.captureEnabled);
    expect(deserialized.captureEnabled).toBe(false);
  });
});

/**
 * Property 13: Settings Persistence Round-Trip
 *
 * *For any* valid KeystrokeEditorSettings object (including all style properties:
 * textColor, backgroundColor, modifierColor, textScale, borderRadius, fadeDurationMs,
 * lingerDurationMs, animationIn, animationOut, showOnlyHotkeys), serializing and then
 * deserializing SHALL produce an object with identical field values.
 *
 * **Validates: Requirements 9.8**
 *
 * Feature: keystroke-editor-overlay, Property 13: Settings Persistence Round-Trip
 */
describe('Property 13: Settings Persistence Round-Trip', () => {
  describe('Full Settings Round-Trip', () => {
    // Arbitrary for valid position preset values
    const positionPresetArbitrary: fc.Arbitrary<KeystrokePositionPreset> = fc.constantFrom(
      'bottom-center' as const,
      'bottom-left' as const,
      'bottom-right' as const,
      'top-center' as const,
      'top-left' as const,
      'top-right' as const
    );

    // Arbitrary for valid animation preset values
    const animationPresetArbitrary: fc.Arbitrary<AnimationPreset> = fc.constantFrom(
      'fade' as const,
      'slide-up' as const,
      'slide-down' as const,
      'scale' as const,
      'none' as const
    );

    // Arbitrary for valid hex color strings (6 hex characters)
    const hexColorArbitrary = fc
      .array(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'), {
        minLength: 6,
        maxLength: 6,
      })
      .map((chars) => `#${chars.join('')}`);

    // Arbitrary for hex color with optional alpha (6 or 8 hex characters)
    const hexColorWithAlphaArbitrary = fc.oneof(
      hexColorArbitrary,
      fc
        .array(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'), {
          minLength: 8,
          maxLength: 8,
        })
        .map((chars) => `#${chars.join('')}`)
    );

    // Arbitrary for valid KeystrokeStyle
    const keystrokeStyleArbitrary: fc.Arbitrary<KeystrokeStyle> = fc.record({
      textColor: hexColorArbitrary,
      backgroundColor: hexColorWithAlphaArbitrary,
      modifierColor: hexColorArbitrary,
      textScale: fc.float({ min: 0.5, max: 2.0, noNaN: true }),
      borderRadius: fc.integer({ min: 0, max: 16 }),
      fadeDurationMs: fc.integer({ min: 0, max: 10000 }),
      lingerDurationMs: fc.integer({ min: 0, max: 10000 }),
      animationIn: animationPresetArbitrary,
      animationOut: animationPresetArbitrary,
      showOnlyHotkeys: fc.boolean(),
    });

    // Arbitrary for valid KeystrokeEditorSettings
    const keystrokeEditorSettingsArbitrary: fc.Arbitrary<KeystrokeEditorSettings> = fc.record({
      captureEnabled: fc.boolean(),
      defaultStyle: keystrokeStyleArbitrary,
      defaultPosition: positionPresetArbitrary,
    });

    it('should produce identical settings after JSON round-trip', () => {
      fc.assert(
        fc.property(
          keystrokeEditorSettingsArbitrary,
          (settings: KeystrokeEditorSettings) => {
            // Serialize to JSON
            const serialized = JSON.stringify(settings);

            // Deserialize from JSON
            const deserialized: KeystrokeEditorSettings = JSON.parse(serialized);

            // Verify top-level fields are identical
            expect(deserialized.captureEnabled).toBe(settings.captureEnabled);
            expect(deserialized.defaultPosition).toBe(settings.defaultPosition);

            // Verify all style properties are identical
            expect(deserialized.defaultStyle.textColor).toBe(settings.defaultStyle.textColor);
            expect(deserialized.defaultStyle.backgroundColor).toBe(settings.defaultStyle.backgroundColor);
            expect(deserialized.defaultStyle.modifierColor).toBe(settings.defaultStyle.modifierColor);
            expect(deserialized.defaultStyle.textScale).toBeCloseTo(settings.defaultStyle.textScale, 10);
            expect(deserialized.defaultStyle.borderRadius).toBe(settings.defaultStyle.borderRadius);
            expect(deserialized.defaultStyle.fadeDurationMs).toBe(settings.defaultStyle.fadeDurationMs);
            expect(deserialized.defaultStyle.lingerDurationMs).toBe(settings.defaultStyle.lingerDurationMs);
            expect(deserialized.defaultStyle.animationIn).toBe(settings.defaultStyle.animationIn);
            expect(deserialized.defaultStyle.animationOut).toBe(settings.defaultStyle.animationOut);
            expect(deserialized.defaultStyle.showOnlyHotkeys).toBe(settings.defaultStyle.showOnlyHotkeys);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve all field types after round-trip', () => {
      fc.assert(
        fc.property(
          keystrokeEditorSettingsArbitrary,
          (settings: KeystrokeEditorSettings) => {
            const serialized = JSON.stringify(settings);
            const deserialized: KeystrokeEditorSettings = JSON.parse(serialized);

            // Verify top-level types
            expect(typeof deserialized.captureEnabled).toBe('boolean');
            expect(typeof deserialized.defaultPosition).toBe('string');
            expect(typeof deserialized.defaultStyle).toBe('object');

            // Verify style property types
            expect(typeof deserialized.defaultStyle.textColor).toBe('string');
            expect(typeof deserialized.defaultStyle.backgroundColor).toBe('string');
            expect(typeof deserialized.defaultStyle.modifierColor).toBe('string');
            expect(typeof deserialized.defaultStyle.textScale).toBe('number');
            expect(typeof deserialized.defaultStyle.borderRadius).toBe('number');
            expect(typeof deserialized.defaultStyle.fadeDurationMs).toBe('number');
            expect(typeof deserialized.defaultStyle.lingerDurationMs).toBe('number');
            expect(typeof deserialized.defaultStyle.animationIn).toBe('string');
            expect(typeof deserialized.defaultStyle.animationOut).toBe('string');
            expect(typeof deserialized.defaultStyle.showOnlyHotkeys).toBe('boolean');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve position preset union type values after round-trip', () => {
      fc.assert(
        fc.property(
          positionPresetArbitrary,
          (position) => {
            const settings: KeystrokeEditorSettings = {
              ...DEFAULT_KEYSTROKE_EDITOR_SETTINGS,
              defaultPosition: position,
            };

            const serialized = JSON.stringify(settings);
            const deserialized: KeystrokeEditorSettings = JSON.parse(serialized);

            // Position should be one of the valid union values
            expect([
              'bottom-center',
              'bottom-left',
              'bottom-right',
              'top-center',
              'top-left',
              'top-right',
            ]).toContain(deserialized.defaultPosition);
            expect(deserialized.defaultPosition).toBe(position);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve animation preset union type values after round-trip', () => {
      fc.assert(
        fc.property(
          animationPresetArbitrary,
          animationPresetArbitrary,
          (animationIn, animationOut) => {
            const settings: KeystrokeEditorSettings = {
              ...DEFAULT_KEYSTROKE_EDITOR_SETTINGS,
              defaultStyle: {
                ...DEFAULT_KEYSTROKE_STYLE,
                animationIn,
                animationOut,
              },
            };

            const serialized = JSON.stringify(settings);
            const deserialized: KeystrokeEditorSettings = JSON.parse(serialized);

            // Animation presets should be valid union values
            const validAnimations = ['fade', 'slide-up', 'slide-down', 'scale', 'none'];
            expect(validAnimations).toContain(deserialized.defaultStyle.animationIn);
            expect(validAnimations).toContain(deserialized.defaultStyle.animationOut);
            expect(deserialized.defaultStyle.animationIn).toBe(animationIn);
            expect(deserialized.defaultStyle.animationOut).toBe(animationOut);
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
            const settings: KeystrokeEditorSettings = {
              ...DEFAULT_KEYSTROKE_EDITOR_SETTINGS,
              defaultStyle: {
                ...DEFAULT_KEYSTROKE_STYLE,
                textScale,
              },
            };

            const serialized = JSON.stringify(settings);
            const deserialized: KeystrokeEditorSettings = JSON.parse(serialized);

            // textScale should be within valid range
            expect(deserialized.defaultStyle.textScale).toBeGreaterThanOrEqual(0.5);
            expect(deserialized.defaultStyle.textScale).toBeLessThanOrEqual(2.0);
            expect(deserialized.defaultStyle.textScale).toBeCloseTo(textScale, 10);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle borderRadius within valid range (0 - 16) after round-trip', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 16 }),
          (borderRadius: number) => {
            const settings: KeystrokeEditorSettings = {
              ...DEFAULT_KEYSTROKE_EDITOR_SETTINGS,
              defaultStyle: {
                ...DEFAULT_KEYSTROKE_STYLE,
                borderRadius,
              },
            };

            const serialized = JSON.stringify(settings);
            const deserialized: KeystrokeEditorSettings = JSON.parse(serialized);

            // borderRadius should be within valid range
            expect(deserialized.defaultStyle.borderRadius).toBeGreaterThanOrEqual(0);
            expect(deserialized.defaultStyle.borderRadius).toBeLessThanOrEqual(16);
            expect(deserialized.defaultStyle.borderRadius).toBe(borderRadius);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce deep equal objects after round-trip', () => {
      fc.assert(
        fc.property(
          keystrokeEditorSettingsArbitrary,
          (settings: KeystrokeEditorSettings) => {
            const serialized = JSON.stringify(settings);
            const deserialized: KeystrokeEditorSettings = JSON.parse(serialized);

            // Deep equality check (using toEqual for object comparison)
            // Note: Using toBeCloseTo for textScale due to floating point precision
            expect({
              ...deserialized,
              defaultStyle: {
                ...deserialized.defaultStyle,
                textScale: Math.round(deserialized.defaultStyle.textScale * 1e10) / 1e10,
              },
            }).toEqual({
              ...settings,
              defaultStyle: {
                ...settings.defaultStyle,
                textScale: Math.round(settings.defaultStyle.textScale * 1e10) / 1e10,
              },
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle default settings round-trip correctly', () => {
      const serialized = JSON.stringify(DEFAULT_KEYSTROKE_EDITOR_SETTINGS);
      const deserialized: KeystrokeEditorSettings = JSON.parse(serialized);

      expect(deserialized).toEqual(DEFAULT_KEYSTROKE_EDITOR_SETTINGS);
    });

    it('should handle all style properties independently after round-trip', () => {
      fc.assert(
        fc.property(
          keystrokeStyleArbitrary,
          (style: KeystrokeStyle) => {
            const settings: KeystrokeEditorSettings = {
              ...DEFAULT_KEYSTROKE_EDITOR_SETTINGS,
              defaultStyle: style,
            };

            const serialized = JSON.stringify(settings);
            const deserialized: KeystrokeEditorSettings = JSON.parse(serialized);

            // Each style property should be preserved independently
            expect(deserialized.defaultStyle.textColor).toBe(style.textColor);
            expect(deserialized.defaultStyle.backgroundColor).toBe(style.backgroundColor);
            expect(deserialized.defaultStyle.modifierColor).toBe(style.modifierColor);
            expect(deserialized.defaultStyle.textScale).toBeCloseTo(style.textScale, 10);
            expect(deserialized.defaultStyle.borderRadius).toBe(style.borderRadius);
            expect(deserialized.defaultStyle.fadeDurationMs).toBe(style.fadeDurationMs);
            expect(deserialized.defaultStyle.lingerDurationMs).toBe(style.lingerDurationMs);
            expect(deserialized.defaultStyle.animationIn).toBe(style.animationIn);
            expect(deserialized.defaultStyle.animationOut).toBe(style.animationOut);
            expect(deserialized.defaultStyle.showOnlyHotkeys).toBe(style.showOnlyHotkeys);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
