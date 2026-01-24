import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { KeystrokePositionPreset, AnimationPreset } from '../types';

// ============================================
// VALIDATION HELPER FUNCTIONS
// ============================================

/**
 * Valid position preset values as defined in the design document.
 */
export const VALID_POSITION_PRESETS: readonly KeystrokePositionPreset[] = [
  'bottom-center',
  'bottom-left',
  'bottom-right',
  'top-center',
  'top-left',
  'top-right',
] as const;

/**
 * Valid animation preset values as defined in the design document.
 */
export const VALID_ANIMATION_PRESETS: readonly AnimationPreset[] = [
  'fade',
  'slide-up',
  'slide-down',
  'scale',
  'none',
] as const;

/**
 * Clamps a text scale value to the valid range [0.5, 2.0].
 * 
 * @param value - The text scale value to clamp
 * @returns The clamped value within [0.5, 2.0]
 */
export function clampTextScale(value: number): number {
  if (Number.isNaN(value)) {
    return 1.0; // Default to 1.0 for NaN
  }
  return Math.min(2.0, Math.max(0.5, value));
}

/**
 * Clamps a border radius value to the valid range [0, 16].
 * 
 * @param value - The border radius value to clamp
 * @returns The clamped value within [0, 16]
 */
export function clampBorderRadius(value: number): number {
  if (Number.isNaN(value)) {
    return 8; // Default to 8 for NaN
  }
  return Math.min(16, Math.max(0, value));
}

/**
 * Checks if a value is a valid animation preset.
 * 
 * @param value - The value to check
 * @returns true if the value is a valid animation preset
 */
export function isValidAnimationPreset(value: string): value is AnimationPreset {
  return VALID_ANIMATION_PRESETS.includes(value as AnimationPreset);
}

/**
 * Checks if a value is a valid position preset.
 * 
 * @param value - The value to check
 * @returns true if the value is a valid position preset
 */
export function isValidPositionPreset(value: string): value is KeystrokePositionPreset {
  return VALID_POSITION_PRESETS.includes(value as KeystrokePositionPreset);
}

// ============================================
// PROPERTY-BASED TESTS
// ============================================

/**
 * Property 14: Text Scale Range Validation
 * 
 * *For any* text scale value, it SHALL be clamped to the valid range [0.5, 2.0].
 * 
 * **Validates: Requirements 7.1**
 * 
 * Feature: keystroke-editor-overlay, Property 14: Text Scale Range Validation
 */
describe('Property 14: Text Scale Range Validation', () => {
  describe('Property 14.1: Clamped values are always within valid range', () => {
    it('should clamp any number to the range [0.5, 2.0]', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -1000, max: 1000, noNaN: true }),
          (value: number) => {
            const clamped = clampTextScale(value);
            
            // Result should always be within valid range
            expect(clamped).toBeGreaterThanOrEqual(0.5);
            expect(clamped).toBeLessThanOrEqual(2.0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 14.2: Values within range are preserved', () => {
    it('should preserve values already within [0.5, 2.0]', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.5, max: 2.0, noNaN: true }),
          (value: number) => {
            const clamped = clampTextScale(value);
            
            // Value within range should be preserved
            expect(clamped).toBeCloseTo(value, 10);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 14.3: Values below minimum are clamped to 0.5', () => {
    it('should clamp values below 0.5 to exactly 0.5', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -1000, max: 0.49999, noNaN: true }),
          (value: number) => {
            const clamped = clampTextScale(value);
            
            // Values below 0.5 should be clamped to 0.5
            expect(clamped).toBe(0.5);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 14.4: Values above maximum are clamped to 2.0', () => {
    it('should clamp values above 2.0 to exactly 2.0', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 2.00001, max: 1000, noNaN: true }),
          (value: number) => {
            const clamped = clampTextScale(value);
            
            // Values above 2.0 should be clamped to 2.0
            expect(clamped).toBe(2.0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 14.5: Boundary values are handled correctly', () => {
    it('should handle exact boundary values', () => {
      // Exact minimum
      expect(clampTextScale(0.5)).toBe(0.5);
      
      // Exact maximum
      expect(clampTextScale(2.0)).toBe(2.0);
      
      // Default value
      expect(clampTextScale(1.0)).toBe(1.0);
    });
  });

  describe('Property 14.6: NaN values are handled gracefully', () => {
    it('should return default value (1.0) for NaN', () => {
      const clamped = clampTextScale(NaN);
      
      expect(clamped).toBe(1.0);
      expect(Number.isNaN(clamped)).toBe(false);
    });
  });

  describe('Property 14.7: Extreme values are clamped correctly', () => {
    it('should handle extreme negative values', () => {
      expect(clampTextScale(-Infinity)).toBe(0.5);
      expect(clampTextScale(-1e10)).toBe(0.5);
    });

    it('should handle extreme positive values', () => {
      expect(clampTextScale(Infinity)).toBe(2.0);
      expect(clampTextScale(1e10)).toBe(2.0);
    });
  });

  describe('Property 14.8: Clamping is idempotent', () => {
    it('should produce same result when applied multiple times', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -1000, max: 1000, noNaN: true }),
          (value: number) => {
            const clampedOnce = clampTextScale(value);
            const clampedTwice = clampTextScale(clampedOnce);
            const clampedThrice = clampTextScale(clampedTwice);
            
            // Clamping should be idempotent
            expect(clampedTwice).toBe(clampedOnce);
            expect(clampedThrice).toBe(clampedOnce);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

/**
 * Property 15: Border Radius Range Validation
 * 
 * *For any* border radius value, it SHALL be clamped to the valid range [0, 16].
 * 
 * **Validates: Requirements 7.5**
 * 
 * Feature: keystroke-editor-overlay, Property 15: Border Radius Range Validation
 */
describe('Property 15: Border Radius Range Validation', () => {
  describe('Property 15.1: Clamped values are always within valid range', () => {
    it('should clamp any number to the range [0, 16]', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -1000, max: 1000, noNaN: true }),
          (value: number) => {
            const clamped = clampBorderRadius(value);
            
            // Result should always be within valid range
            expect(clamped).toBeGreaterThanOrEqual(0);
            expect(clamped).toBeLessThanOrEqual(16);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 15.2: Values within range are preserved', () => {
    it('should preserve values already within [0, 16]', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 16, noNaN: true }),
          (value: number) => {
            const clamped = clampBorderRadius(value);
            
            // Value within range should be preserved
            expect(clamped).toBeCloseTo(value, 10);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 15.3: Values below minimum are clamped to 0', () => {
    it('should clamp values below 0 to exactly 0', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -1000, max: -0.00001, noNaN: true }),
          (value: number) => {
            const clamped = clampBorderRadius(value);
            
            // Values below 0 should be clamped to 0
            expect(clamped).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 15.4: Values above maximum are clamped to 16', () => {
    it('should clamp values above 16 to exactly 16', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 16.00001, max: 1000, noNaN: true }),
          (value: number) => {
            const clamped = clampBorderRadius(value);
            
            // Values above 16 should be clamped to 16
            expect(clamped).toBe(16);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 15.5: Boundary values are handled correctly', () => {
    it('should handle exact boundary values', () => {
      // Exact minimum
      expect(clampBorderRadius(0)).toBe(0);
      
      // Exact maximum
      expect(clampBorderRadius(16)).toBe(16);
      
      // Default value
      expect(clampBorderRadius(8)).toBe(8);
    });
  });

  describe('Property 15.6: Integer values within range are preserved exactly', () => {
    it('should preserve integer values within [0, 16]', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 16 }),
          (value: number) => {
            const clamped = clampBorderRadius(value);
            
            // Integer values within range should be preserved exactly
            expect(clamped).toBe(value);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 15.7: NaN values are handled gracefully', () => {
    it('should return default value (8) for NaN', () => {
      const clamped = clampBorderRadius(NaN);
      
      expect(clamped).toBe(8);
      expect(Number.isNaN(clamped)).toBe(false);
    });
  });

  describe('Property 15.8: Extreme values are clamped correctly', () => {
    it('should handle extreme negative values', () => {
      expect(clampBorderRadius(-Infinity)).toBe(0);
      expect(clampBorderRadius(-1e10)).toBe(0);
    });

    it('should handle extreme positive values', () => {
      expect(clampBorderRadius(Infinity)).toBe(16);
      expect(clampBorderRadius(1e10)).toBe(16);
    });
  });

  describe('Property 15.9: Clamping is idempotent', () => {
    it('should produce same result when applied multiple times', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -1000, max: 1000, noNaN: true }),
          (value: number) => {
            const clampedOnce = clampBorderRadius(value);
            const clampedTwice = clampBorderRadius(clampedOnce);
            const clampedThrice = clampBorderRadius(clampedTwice);
            
            // Clamping should be idempotent
            expect(clampedTwice).toBe(clampedOnce);
            expect(clampedThrice).toBe(clampedOnce);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

/**
 * Property 16: Animation Preset Validity
 * 
 * *For any* animation preset (animationIn or animationOut), it SHALL be one of the 
 * valid values: 'fade', 'slide-up', 'slide-down', 'scale', 'none'.
 * 
 * **Validates: Requirements 8.1.1, 8.1.2**
 * 
 * Feature: keystroke-editor-overlay, Property 16: Animation Preset Validity
 */
describe('Property 16: Animation Preset Validity', () => {
  // Arbitrary for valid animation presets
  const validAnimationPresetArbitrary: fc.Arbitrary<AnimationPreset> = fc.constantFrom(
    'fade',
    'slide-up',
    'slide-down',
    'scale',
    'none'
  );

  // Arbitrary for invalid strings (not valid animation presets)
  const invalidAnimationPresetArbitrary = fc.string({ minLength: 1, maxLength: 50 })
    .filter(s => !VALID_ANIMATION_PRESETS.includes(s as AnimationPreset));

  describe('Property 16.1: All valid animation presets are recognized', () => {
    it('should return true for all valid animation preset values', () => {
      fc.assert(
        fc.property(
          validAnimationPresetArbitrary,
          (preset: AnimationPreset) => {
            expect(isValidAnimationPreset(preset)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 16.2: Invalid strings are rejected', () => {
    it('should return false for invalid animation preset strings', () => {
      fc.assert(
        fc.property(
          invalidAnimationPresetArbitrary,
          (invalidPreset: string) => {
            expect(isValidAnimationPreset(invalidPreset)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 16.3: Exactly five valid animation presets exist', () => {
    it('should have exactly 5 valid animation presets', () => {
      expect(VALID_ANIMATION_PRESETS.length).toBe(5);
    });

    it('should contain all expected animation presets', () => {
      expect(VALID_ANIMATION_PRESETS).toContain('fade');
      expect(VALID_ANIMATION_PRESETS).toContain('slide-up');
      expect(VALID_ANIMATION_PRESETS).toContain('slide-down');
      expect(VALID_ANIMATION_PRESETS).toContain('scale');
      expect(VALID_ANIMATION_PRESETS).toContain('none');
    });
  });

  describe('Property 16.4: Animation presets are case-sensitive', () => {
    it('should reject uppercase variants', () => {
      expect(isValidAnimationPreset('FADE')).toBe(false);
      expect(isValidAnimationPreset('Fade')).toBe(false);
      expect(isValidAnimationPreset('SLIDE-UP')).toBe(false);
      expect(isValidAnimationPreset('Slide-Up')).toBe(false);
      expect(isValidAnimationPreset('NONE')).toBe(false);
    });
  });

  describe('Property 16.5: Empty string is not a valid animation preset', () => {
    it('should return false for empty string', () => {
      expect(isValidAnimationPreset('')).toBe(false);
    });
  });

  describe('Property 16.6: Whitespace variants are not valid', () => {
    it('should reject animation presets with leading/trailing whitespace', () => {
      expect(isValidAnimationPreset(' fade')).toBe(false);
      expect(isValidAnimationPreset('fade ')).toBe(false);
      expect(isValidAnimationPreset(' fade ')).toBe(false);
      expect(isValidAnimationPreset('slide-up ')).toBe(false);
    });
  });

  describe('Property 16.7: Similar but invalid strings are rejected', () => {
    it('should reject strings similar to valid presets', () => {
      expect(isValidAnimationPreset('fades')).toBe(false);
      expect(isValidAnimationPreset('slide')).toBe(false);
      expect(isValidAnimationPreset('slide-left')).toBe(false);
      expect(isValidAnimationPreset('slide-right')).toBe(false);
      expect(isValidAnimationPreset('zoom')).toBe(false);
      expect(isValidAnimationPreset('bounce')).toBe(false);
    });
  });

  describe('Property 16.8: Validation is consistent for animationIn and animationOut', () => {
    it('should validate both animationIn and animationOut with same rules', () => {
      fc.assert(
        fc.property(
          validAnimationPresetArbitrary,
          validAnimationPresetArbitrary,
          (animationIn: AnimationPreset, animationOut: AnimationPreset) => {
            // Both should be valid
            expect(isValidAnimationPreset(animationIn)).toBe(true);
            expect(isValidAnimationPreset(animationOut)).toBe(true);
            
            // They can be the same or different
            expect(VALID_ANIMATION_PRESETS).toContain(animationIn);
            expect(VALID_ANIMATION_PRESETS).toContain(animationOut);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

/**
 * Property 12: Position Preset Validity
 * 
 * *For any* position preset setting, it SHALL be one of the valid values: 
 * 'bottom-center', 'bottom-left', 'bottom-right', 'top-center', 'top-left', 'top-right'.
 * 
 * **Validates: Requirements 6.3, 7.2**
 * 
 * Feature: keystroke-editor-overlay, Property 12: Position Preset Validity
 */
describe('Property 12: Position Preset Validity', () => {
  // Arbitrary for valid position presets
  const validPositionPresetArbitrary: fc.Arbitrary<KeystrokePositionPreset> = fc.constantFrom(
    'bottom-center',
    'bottom-left',
    'bottom-right',
    'top-center',
    'top-left',
    'top-right'
  );

  // Arbitrary for invalid strings (not valid position presets)
  const invalidPositionPresetArbitrary = fc.string({ minLength: 1, maxLength: 50 })
    .filter(s => !VALID_POSITION_PRESETS.includes(s as KeystrokePositionPreset));

  describe('Property 12.1: All valid position presets are recognized', () => {
    it('should return true for all valid position preset values', () => {
      fc.assert(
        fc.property(
          validPositionPresetArbitrary,
          (preset: KeystrokePositionPreset) => {
            expect(isValidPositionPreset(preset)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 12.2: Invalid strings are rejected', () => {
    it('should return false for invalid position preset strings', () => {
      fc.assert(
        fc.property(
          invalidPositionPresetArbitrary,
          (invalidPreset: string) => {
            expect(isValidPositionPreset(invalidPreset)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 12.3: Exactly six valid position presets exist', () => {
    it('should have exactly 6 valid position presets', () => {
      expect(VALID_POSITION_PRESETS.length).toBe(6);
    });

    it('should contain all expected position presets', () => {
      expect(VALID_POSITION_PRESETS).toContain('bottom-center');
      expect(VALID_POSITION_PRESETS).toContain('bottom-left');
      expect(VALID_POSITION_PRESETS).toContain('bottom-right');
      expect(VALID_POSITION_PRESETS).toContain('top-center');
      expect(VALID_POSITION_PRESETS).toContain('top-left');
      expect(VALID_POSITION_PRESETS).toContain('top-right');
    });
  });

  describe('Property 12.4: Position presets are case-sensitive', () => {
    it('should reject uppercase variants', () => {
      expect(isValidPositionPreset('BOTTOM-CENTER')).toBe(false);
      expect(isValidPositionPreset('Bottom-Center')).toBe(false);
      expect(isValidPositionPreset('TOP-LEFT')).toBe(false);
      expect(isValidPositionPreset('Top-Left')).toBe(false);
    });
  });

  describe('Property 12.5: Empty string is not a valid position preset', () => {
    it('should return false for empty string', () => {
      expect(isValidPositionPreset('')).toBe(false);
    });
  });

  describe('Property 12.6: Whitespace variants are not valid', () => {
    it('should reject position presets with leading/trailing whitespace', () => {
      expect(isValidPositionPreset(' bottom-center')).toBe(false);
      expect(isValidPositionPreset('bottom-center ')).toBe(false);
      expect(isValidPositionPreset(' bottom-center ')).toBe(false);
      expect(isValidPositionPreset('top-left ')).toBe(false);
    });
  });

  describe('Property 12.7: Similar but invalid strings are rejected', () => {
    it('should reject strings similar to valid presets', () => {
      expect(isValidPositionPreset('center')).toBe(false);
      expect(isValidPositionPreset('bottom')).toBe(false);
      expect(isValidPositionPreset('top')).toBe(false);
      expect(isValidPositionPreset('left')).toBe(false);
      expect(isValidPositionPreset('right')).toBe(false);
      expect(isValidPositionPreset('middle-center')).toBe(false);
      expect(isValidPositionPreset('bottom-middle')).toBe(false);
    });
  });

  describe('Property 12.8: Position presets cover all corners and edges', () => {
    it('should have presets for all bottom positions', () => {
      const bottomPresets = VALID_POSITION_PRESETS.filter(p => p.startsWith('bottom-'));
      expect(bottomPresets.length).toBe(3);
      expect(bottomPresets).toContain('bottom-center');
      expect(bottomPresets).toContain('bottom-left');
      expect(bottomPresets).toContain('bottom-right');
    });

    it('should have presets for all top positions', () => {
      const topPresets = VALID_POSITION_PRESETS.filter(p => p.startsWith('top-'));
      expect(topPresets.length).toBe(3);
      expect(topPresets).toContain('top-center');
      expect(topPresets).toContain('top-left');
      expect(topPresets).toContain('top-right');
    });
  });

  describe('Property 12.9: All position presets follow naming convention', () => {
    it('should follow {vertical}-{horizontal} naming pattern', () => {
      fc.assert(
        fc.property(
          validPositionPresetArbitrary,
          (preset: KeystrokePositionPreset) => {
            const parts = preset.split('-');
            
            // Should have exactly 2 parts
            expect(parts.length).toBe(2);
            
            // First part should be vertical position
            expect(['bottom', 'top']).toContain(parts[0]);
            
            // Second part should be horizontal position
            expect(['center', 'left', 'right']).toContain(parts[1]);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

/**
 * Integration Tests: Combined Settings Validation
 * 
 * Tests that all validation functions work together correctly for complete settings objects.
 */
describe('Integration: Combined Settings Validation', () => {
  describe('Complete settings object validation', () => {
    it('should validate all settings properties together', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -100, max: 100, noNaN: true }), // textScale
          fc.double({ min: -100, max: 100, noNaN: true }), // borderRadius
          fc.constantFrom('fade', 'slide-up', 'slide-down', 'scale', 'none') as fc.Arbitrary<AnimationPreset>,
          fc.constantFrom('fade', 'slide-up', 'slide-down', 'scale', 'none') as fc.Arbitrary<AnimationPreset>,
          fc.constantFrom('bottom-center', 'bottom-left', 'bottom-right', 'top-center', 'top-left', 'top-right') as fc.Arbitrary<KeystrokePositionPreset>,
          (textScale, borderRadius, animationIn, animationOut, position) => {
            // Clamp numeric values
            const clampedTextScale = clampTextScale(textScale);
            const clampedBorderRadius = clampBorderRadius(borderRadius);
            
            // Validate all properties
            expect(clampedTextScale).toBeGreaterThanOrEqual(0.5);
            expect(clampedTextScale).toBeLessThanOrEqual(2.0);
            expect(clampedBorderRadius).toBeGreaterThanOrEqual(0);
            expect(clampedBorderRadius).toBeLessThanOrEqual(16);
            expect(isValidAnimationPreset(animationIn)).toBe(true);
            expect(isValidAnimationPreset(animationOut)).toBe(true);
            expect(isValidPositionPreset(position)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Settings with extreme values', () => {
    it('should handle settings with extreme numeric values', () => {
      // Extreme text scale values
      expect(clampTextScale(-Infinity)).toBe(0.5);
      expect(clampTextScale(Infinity)).toBe(2.0);
      
      // Extreme border radius values
      expect(clampBorderRadius(-Infinity)).toBe(0);
      expect(clampBorderRadius(Infinity)).toBe(16);
      
      // Valid presets should still work
      expect(isValidAnimationPreset('fade')).toBe(true);
      expect(isValidPositionPreset('bottom-center')).toBe(true);
    });
  });
});
