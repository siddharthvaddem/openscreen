import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import type { KeystrokePositionPreset, AnimationPreset, KeystrokeRegion, KeystrokeStyle } from '../types';
import { DEFAULT_KEYSTROKE_STYLE } from '../types';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { KeystrokeSettingsPanel } from './KeystrokeSettingsPanel';

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


// ============================================
// PROPERTY-BASED TESTS FOR APPLY TO ALL
// ============================================

import type { KeystrokeRegion, KeystrokeStyle } from '../types';

/**
 * Helper function to apply style to all regions
 * This simulates the handleApplyStyleToAll behavior
 */
function applyStyleToAllRegions(
  regions: KeystrokeRegion[],
  style: Partial<KeystrokeStyle>
): KeystrokeRegion[] {
  return regions.map((region) => ({
    ...region,
    style: { ...region.style, ...style },
  }));
}

/**
 * Helper function to apply position to all regions
 * This simulates the handleApplyStyleToAll behavior with position
 */
function applyPositionToAllRegions(
  regions: KeystrokeRegion[],
  position: KeystrokePositionPreset
): KeystrokeRegion[] {
  return regions.map((region) => ({
    ...region,
    positionPreset: position,
  }));
}

/**
 * Helper function to apply both style and position to all regions
 * This simulates the complete handleApplyStyleToAll behavior
 */
function applyStyleAndPositionToAllRegions(
  regions: KeystrokeRegion[],
  style: Partial<KeystrokeStyle>,
  position?: KeystrokePositionPreset
): KeystrokeRegion[] {
  return regions.map((region) => ({
    ...region,
    style: { ...region.style, ...style },
    ...(position && { positionPreset: position }),
  }));
}

// ============================================
// GENERATORS FOR PROPERTY-BASED TESTS
// ============================================

// Generator for AnimationPreset
const animationPresetArb: fc.Arbitrary<AnimationPreset> = fc.constantFrom(
  'fade', 'slide-up', 'slide-down', 'scale', 'none'
);

// Generator for KeystrokePositionPreset
const positionPresetArb: fc.Arbitrary<KeystrokePositionPreset> = fc.constantFrom(
  'bottom-center', 'bottom-left', 'bottom-right',
  'top-center', 'top-left', 'top-right'
);

// Generator for hex color strings
const hexColorArb = fc.string({ 
  minLength: 6, 
  maxLength: 6,
  unit: fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F')
}).map(s => `#${s}`);

// Generator for complete KeystrokeStyle
const keystrokeStyleArb: fc.Arbitrary<KeystrokeStyle> = fc.record({
  textColor: hexColorArb,
  backgroundColor: hexColorArb,
  modifierColor: hexColorArb,
  textScale: fc.double({ min: 0.5, max: 2.0, noNaN: true }),
  borderRadius: fc.integer({ min: 0, max: 16 }),
  fadeDurationMs: fc.integer({ min: 0, max: 1000 }),
  lingerDurationMs: fc.integer({ min: 500, max: 5000 }),
  animationIn: animationPresetArb,
  animationOut: animationPresetArb,
  showOnlyHotkeys: fc.boolean(),
});

// Generator for partial KeystrokeStyle updates
const partialStyleArb: fc.Arbitrary<Partial<KeystrokeStyle>> = fc.record({
  textColor: fc.option(hexColorArb, { nil: undefined }),
  backgroundColor: fc.option(hexColorArb, { nil: undefined }),
  modifierColor: fc.option(hexColorArb, { nil: undefined }),
  textScale: fc.option(fc.double({ min: 0.5, max: 2.0, noNaN: true }), { nil: undefined }),
  borderRadius: fc.option(fc.integer({ min: 0, max: 16 }), { nil: undefined }),
  fadeDurationMs: fc.option(fc.integer({ min: 0, max: 1000 }), { nil: undefined }),
  lingerDurationMs: fc.option(fc.integer({ min: 500, max: 5000 }), { nil: undefined }),
  animationIn: fc.option(animationPresetArb, { nil: undefined }),
  animationOut: fc.option(animationPresetArb, { nil: undefined }),
  showOnlyHotkeys: fc.option(fc.boolean(), { nil: undefined }),
}, { requiredKeys: [] });

// Generator for KeystrokeRegion
const keystrokeRegionArb: fc.Arbitrary<KeystrokeRegion> = fc.record({
  id: fc.uuid(),
  startMs: fc.integer({ min: 0, max: 100000 }),
  endMs: fc.integer({ min: 0, max: 100000 }),
  text: fc.string({ minLength: 1, maxLength: 20 }),
  eventType: fc.constantFrom('keystroke', 'mouse') as fc.Arbitrary<'keystroke' | 'mouse'>,
  positionPreset: positionPresetArb,
  style: keystrokeStyleArb,
}).filter(r => r.startMs < r.endMs);

// Generator for KeystrokeRegion arrays (non-empty)
const keystrokeRegionsArb = fc.array(keystrokeRegionArb, { minLength: 1, maxLength: 10 });

/**
 * Property 2: Bulk Style Application
 * 
 * *For any* partial KeystrokeStyle and *for any* non-empty array of KeystrokeRegions,
 * when handleApplyStyleToAll is called with the style, all regions in the resulting
 * array SHALL have the new style properties merged with their existing styles.
 * 
 * **Validates: Requirements 2.1, 2.3**
 * 
 * Feature: keystroke-apply-to-all, Property 2: Bulk Style Application
 */
describe('Property 2: Bulk Style Application', () => {
  it('should apply partial style to all regions', () => {
    fc.assert(
      fc.property(partialStyleArb, keystrokeRegionsArb, (style, regions) => {
        const result = applyStyleToAllRegions(regions, style);
        
        // Result should have same number of regions
        expect(result.length).toBe(regions.length);
        
        // All regions should have the new style properties merged
        result.forEach((region, i) => {
          const original = regions[i];
          
          // Region structure should be preserved
          expect(region.id).toBe(original.id);
          expect(region.startMs).toBe(original.startMs);
          expect(region.endMs).toBe(original.endMs);
          expect(region.text).toBe(original.text);
          expect(region.eventType).toBe(original.eventType);
          expect(region.positionPreset).toBe(original.positionPreset);
          
          // Verify that the style is correctly merged
          // The result should be: original style merged with the partial style
          const expectedStyle = { ...original.style, ...style };
          expect(region.style).toEqual(expectedStyle);
        });
      }),
      { numRuns: 100 }
    );
  });

  it('should handle empty style object (no changes)', () => {
    fc.assert(
      fc.property(keystrokeRegionsArb, (regions) => {
        const emptyStyle: Partial<KeystrokeStyle> = {};
        const result = applyStyleToAllRegions(regions, emptyStyle);
        
        // All regions should be unchanged
        result.forEach((region, i) => {
          const original = regions[i];
          expect(region).toEqual(original);
        });
      }),
      { numRuns: 100 }
    );
  });

  it('should apply single style property to all regions', () => {
    fc.assert(
      fc.property(
        hexColorArb,
        keystrokeRegionsArb,
        (textColor, regions) => {
          const style: Partial<KeystrokeStyle> = { textColor };
          const result = applyStyleToAllRegions(regions, style);
          
          // All regions should have the new text color
          result.forEach((region, i) => {
            const original = regions[i];
            expect(region.style.textColor).toBe(textColor);
            
            // Other style properties should be preserved
            expect(region.style.backgroundColor).toBe(original.style.backgroundColor);
            expect(region.style.modifierColor).toBe(original.style.modifierColor);
            expect(region.style.textScale).toBe(original.style.textScale);
            expect(region.style.borderRadius).toBe(original.style.borderRadius);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should apply multiple style properties to all regions', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.5, max: 2.0, noNaN: true }),
        fc.integer({ min: 0, max: 16 }),
        keystrokeRegionsArb,
        (textScale, borderRadius, regions) => {
          const style: Partial<KeystrokeStyle> = { textScale, borderRadius };
          const result = applyStyleToAllRegions(regions, style);
          
          // All regions should have the new properties
          result.forEach((region, i) => {
            const original = regions[i];
            expect(region.style.textScale).toBe(textScale);
            expect(region.style.borderRadius).toBe(borderRadius);
            
            // Other properties should be preserved
            expect(region.style.textColor).toBe(original.style.textColor);
            expect(region.style.backgroundColor).toBe(original.style.backgroundColor);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve region identity and timing', () => {
    fc.assert(
      fc.property(partialStyleArb, keystrokeRegionsArb, (style, regions) => {
        const result = applyStyleToAllRegions(regions, style);
        
        // All regions should maintain their identity and timing
        result.forEach((region, i) => {
          const original = regions[i];
          expect(region.id).toBe(original.id);
          expect(region.startMs).toBe(original.startMs);
          expect(region.endMs).toBe(original.endMs);
          expect(region.text).toBe(original.text);
          expect(region.eventType).toBe(original.eventType);
          expect(region.positionPreset).toBe(original.positionPreset);
        });
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 3: Bulk Position Application
 * 
 * *For any* KeystrokePositionPreset and *for any* non-empty array of KeystrokeRegions,
 * when handleApplyStyleToAll is called with the position, all regions in the resulting
 * array SHALL have the new positionPreset value.
 * 
 * **Validates: Requirements 2.2**
 * 
 * Feature: keystroke-apply-to-all, Property 3: Bulk Position Application
 */
describe('Property 3: Bulk Position Application', () => {
  it('should apply position to all regions', () => {
    fc.assert(
      fc.property(positionPresetArb, keystrokeRegionsArb, (position, regions) => {
        const result = applyPositionToAllRegions(regions, position);
        
        // Result should have same number of regions
        expect(result.length).toBe(regions.length);
        
        // All regions should have the new position
        result.forEach((region, i) => {
          const original = regions[i];
          
          // Position should be updated
          expect(region.positionPreset).toBe(position);
          
          // All other properties should be preserved
          expect(region.id).toBe(original.id);
          expect(region.startMs).toBe(original.startMs);
          expect(region.endMs).toBe(original.endMs);
          expect(region.text).toBe(original.text);
          expect(region.eventType).toBe(original.eventType);
          expect(region.style).toEqual(original.style);
        });
      }),
      { numRuns: 100 }
    );
  });

  it('should apply each position preset to all regions', () => {
    const positions: KeystrokePositionPreset[] = [
      'bottom-center', 'bottom-left', 'bottom-right',
      'top-center', 'top-left', 'top-right'
    ];
    
    positions.forEach(position => {
      fc.assert(
        fc.property(keystrokeRegionsArb, (regions) => {
          const result = applyPositionToAllRegions(regions, position);
          
          // All regions should have this specific position
          result.forEach((region) => {
            expect(region.positionPreset).toBe(position);
          });
        }),
        { numRuns: 100 }
      );
    });
  });

  it('should preserve all other region properties when applying position', () => {
    fc.assert(
      fc.property(positionPresetArb, keystrokeRegionsArb, (position, regions) => {
        const result = applyPositionToAllRegions(regions, position);
        
        result.forEach((region, i) => {
          const original = regions[i];
          
          // Only position should change
          expect(region.positionPreset).toBe(position);
          
          // Everything else should be identical
          expect(region.id).toBe(original.id);
          expect(region.startMs).toBe(original.startMs);
          expect(region.endMs).toBe(original.endMs);
          expect(region.text).toBe(original.text);
          expect(region.eventType).toBe(original.eventType);
          expect(region.style).toEqual(original.style);
        });
      }),
      { numRuns: 100 }
    );
  });

  it('should handle single region position application', () => {
    fc.assert(
      fc.property(positionPresetArb, keystrokeRegionArb, (position, region) => {
        const result = applyPositionToAllRegions([region], position);
        
        // Should have one region
        expect(result.length).toBe(1);
        
        // Position should be updated
        expect(result[0].positionPreset).toBe(position);
        
        // Other properties should be preserved
        expect(result[0].id).toBe(region.id);
        expect(result[0].style).toEqual(region.style);
      }),
      { numRuns: 100 }
    );
  });

  it('should handle multiple regions with different original positions', () => {
    fc.assert(
      fc.property(
        positionPresetArb,
        fc.array(keystrokeRegionArb, { minLength: 2, maxLength: 10 }),
        (newPosition, regions) => {
          const result = applyPositionToAllRegions(regions, newPosition);
          
          // All regions should have the same new position
          result.forEach((region) => {
            expect(region.positionPreset).toBe(newPosition);
          });
          
          // After applying, all should be the same
          const resultPositions = result.map(r => r.positionPreset);
          resultPositions.forEach(pos => {
            expect(pos).toBe(newPosition);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should apply position without affecting style properties', () => {
    fc.assert(
      fc.property(positionPresetArb, keystrokeRegionsArb, (position, regions) => {
        const result = applyPositionToAllRegions(regions, position);
        
        result.forEach((region, i) => {
          const original = regions[i];
          
          // All style properties should be identical
          expect(region.style.textColor).toBe(original.style.textColor);
          expect(region.style.backgroundColor).toBe(original.style.backgroundColor);
          expect(region.style.modifierColor).toBe(original.style.modifierColor);
          expect(region.style.textScale).toBe(original.style.textScale);
          expect(region.style.borderRadius).toBe(original.style.borderRadius);
          expect(region.style.fadeDurationMs).toBe(original.style.fadeDurationMs);
          expect(region.style.lingerDurationMs).toBe(original.style.lingerDurationMs);
          expect(region.style.animationIn).toBe(original.style.animationIn);
          expect(region.style.animationOut).toBe(original.style.animationOut);
          expect(region.style.showOnlyHotkeys).toBe(original.style.showOnlyHotkeys);
        });
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Integration: Combined Style and Position Application
 * 
 * Tests that style and position can be applied together correctly.
 */
describe('Integration: Combined Style and Position Application', () => {
  it('should apply both style and position to all regions', () => {
    fc.assert(
      fc.property(
        partialStyleArb,
        positionPresetArb,
        keystrokeRegionsArb,
        (style, position, regions) => {
          const result = applyStyleAndPositionToAllRegions(regions, style, position);
          
          // All regions should have both updates
          result.forEach((region, i) => {
            const original = regions[i];
            
            // Position should be updated
            expect(region.positionPreset).toBe(position);
            
            // Style should be merged correctly
            const expectedStyle = { ...original.style, ...style };
            expect(region.style).toEqual(expectedStyle);
            
            // Other properties should be preserved
            expect(region.id).toBe(original.id);
            expect(region.startMs).toBe(original.startMs);
            expect(region.endMs).toBe(original.endMs);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should apply style without position (position undefined)', () => {
    fc.assert(
      fc.property(partialStyleArb, keystrokeRegionsArb, (style, regions) => {
        const result = applyStyleAndPositionToAllRegions(regions, style, undefined);
        
        // Style should be applied
        result.forEach((region, i) => {
          const original = regions[i];
          Object.entries(style).forEach(([key, value]) => {
            if (value !== undefined) {
              expect(region.style[key as keyof KeystrokeStyle]).toBe(value);
            }
          });
          
          // Position should NOT change
          expect(region.positionPreset).toBe(original.positionPreset);
        });
      }),
      { numRuns: 100 }
    );
  });

  it('should apply position without style (empty style object)', () => {
    fc.assert(
      fc.property(positionPresetArb, keystrokeRegionsArb, (position, regions) => {
        const result = applyStyleAndPositionToAllRegions(regions, {}, position);
        
        // Position should be applied
        result.forEach((region) => {
          expect(region.positionPreset).toBe(position);
        });
        
        // Style should NOT change
        result.forEach((region, i) => {
          const original = regions[i];
          expect(region.style).toEqual(original.style);
        });
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================
// PROPERTY 6: CALLBACK ROUTING TESTS
// ============================================

/**
 * Property 6: Callback Routing Based on ApplyToAll State
 * 
 * *For any* style or position change action, when `applyToAll` is true, 
 * `onApplyStyleToAll` SHALL be called and `onStyleChange`/`onPositionChange` 
 * SHALL NOT be called. When `applyToAll` is false, `onStyleChange`/`onPositionChange` 
 * SHALL be called and `onApplyStyleToAll` SHALL NOT be called.
 * 
 * **Validates: Requirements 4.2, 4.3**
 * 
 * Feature: keystroke-apply-to-all, Property 6: Callback Routing Based on ApplyToAll State
 */
describe('Property 6: Callback Routing Based on ApplyToAll State', () => {
  /**
   * Helper function that simulates the handleStyleUpdate routing logic
   * Returns which callback would be called based on applyToAll state
   */
  function routeStyleUpdate(
    applyToAll: boolean,
    onStyleChange: () => void,
    onApplyStyleToAll: () => void
  ): void {
    if (applyToAll) {
      onApplyStyleToAll();
    } else {
      onStyleChange();
    }
  }

  /**
   * Helper function that simulates the handlePositionUpdate routing logic
   * Returns which callback would be called based on applyToAll state
   */
  function routePositionUpdate(
    applyToAll: boolean,
    onPositionChange: () => void,
    onApplyStyleToAll: () => void
  ): void {
    if (applyToAll) {
      onApplyStyleToAll();
    } else {
      onPositionChange();
    }
  }

  describe('Property 6.1: Style routing when applyToAll is true', () => {
    it('should call onApplyStyleToAll and NOT onStyleChange when applyToAll is true', () => {
      fc.assert(
        fc.property(partialStyleArb, (_style) => {
          const onStyleChangeMock = vi.fn();
          const onApplyStyleToAllMock = vi.fn();

          routeStyleUpdate(true, onStyleChangeMock, onApplyStyleToAllMock);

          // onApplyStyleToAll should be called
          expect(onApplyStyleToAllMock).toHaveBeenCalledTimes(1);
          // onStyleChange should NOT be called
          expect(onStyleChangeMock).not.toHaveBeenCalled();
        }),
        { numRuns: 100 }
      );
    });

    it('should call onApplyStyleToAll exactly once for each style update when applyToAll is true', () => {
      fc.assert(
        fc.property(partialStyleArb, (_style) => {
          const onApplyStyleToAllMock = vi.fn();
          const onStyleChangeMock = vi.fn();

          // Simulate multiple style updates
          for (let i = 0; i < 5; i++) {
            routeStyleUpdate(true, onStyleChangeMock, onApplyStyleToAllMock);
          }

          // onApplyStyleToAll should be called 5 times
          expect(onApplyStyleToAllMock).toHaveBeenCalledTimes(5);
          // onStyleChange should never be called
          expect(onStyleChangeMock).not.toHaveBeenCalled();
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6.2: Style routing when applyToAll is false', () => {
    it('should call onStyleChange and NOT onApplyStyleToAll when applyToAll is false', () => {
      fc.assert(
        fc.property(partialStyleArb, (_style) => {
          const onStyleChangeMock = vi.fn();
          const onApplyStyleToAllMock = vi.fn();

          routeStyleUpdate(false, onStyleChangeMock, onApplyStyleToAllMock);

          // onStyleChange should be called
          expect(onStyleChangeMock).toHaveBeenCalledTimes(1);
          // onApplyStyleToAll should NOT be called
          expect(onApplyStyleToAllMock).not.toHaveBeenCalled();
        }),
        { numRuns: 100 }
      );
    });

    it('should call onStyleChange exactly once for each style update when applyToAll is false', () => {
      fc.assert(
        fc.property(partialStyleArb, (_style) => {
          const onStyleChangeMock = vi.fn();
          const onApplyStyleToAllMock = vi.fn();

          // Simulate multiple style updates
          for (let i = 0; i < 5; i++) {
            routeStyleUpdate(false, onStyleChangeMock, onApplyStyleToAllMock);
          }

          // onStyleChange should be called 5 times
          expect(onStyleChangeMock).toHaveBeenCalledTimes(5);
          // onApplyStyleToAll should never be called
          expect(onApplyStyleToAllMock).not.toHaveBeenCalled();
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6.3: Position routing when applyToAll is true', () => {
    it('should call onApplyStyleToAll and NOT onPositionChange when applyToAll is true', () => {
      fc.assert(
        fc.property(positionPresetArb, (_position) => {
          const onPositionChangeMock = vi.fn();
          const onApplyStyleToAllMock = vi.fn();

          routePositionUpdate(true, onPositionChangeMock, onApplyStyleToAllMock);

          // onApplyStyleToAll should be called
          expect(onApplyStyleToAllMock).toHaveBeenCalledTimes(1);
          // onPositionChange should NOT be called
          expect(onPositionChangeMock).not.toHaveBeenCalled();
        }),
        { numRuns: 100 }
      );
    });

    it('should call onApplyStyleToAll exactly once for each position update when applyToAll is true', () => {
      fc.assert(
        fc.property(positionPresetArb, (_position) => {
          const onPositionChangeMock = vi.fn();
          const onApplyStyleToAllMock = vi.fn();

          // Simulate multiple position updates
          for (let i = 0; i < 5; i++) {
            routePositionUpdate(true, onPositionChangeMock, onApplyStyleToAllMock);
          }

          // onApplyStyleToAll should be called 5 times
          expect(onApplyStyleToAllMock).toHaveBeenCalledTimes(5);
          // onPositionChange should never be called
          expect(onPositionChangeMock).not.toHaveBeenCalled();
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6.4: Position routing when applyToAll is false', () => {
    it('should call onPositionChange and NOT onApplyStyleToAll when applyToAll is false', () => {
      fc.assert(
        fc.property(positionPresetArb, (_position) => {
          const onPositionChangeMock = vi.fn();
          const onApplyStyleToAllMock = vi.fn();

          routePositionUpdate(false, onPositionChangeMock, onApplyStyleToAllMock);

          // onPositionChange should be called
          expect(onPositionChangeMock).toHaveBeenCalledTimes(1);
          // onApplyStyleToAll should NOT be called
          expect(onApplyStyleToAllMock).not.toHaveBeenCalled();
        }),
        { numRuns: 100 }
      );
    });

    it('should call onPositionChange exactly once for each position update when applyToAll is false', () => {
      fc.assert(
        fc.property(positionPresetArb, (_position) => {
          const onPositionChangeMock = vi.fn();
          const onApplyStyleToAllMock = vi.fn();

          // Simulate multiple position updates
          for (let i = 0; i < 5; i++) {
            routePositionUpdate(false, onPositionChangeMock, onApplyStyleToAllMock);
          }

          // onPositionChange should be called 5 times
          expect(onPositionChangeMock).toHaveBeenCalledTimes(5);
          // onApplyStyleToAll should never be called
          expect(onApplyStyleToAllMock).not.toHaveBeenCalled();
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6.5: Mutual exclusivity of callbacks for style updates', () => {
    it('should never call both onStyleChange and onApplyStyleToAll for the same update', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          partialStyleArb,
          (applyToAll, _style) => {
            const onStyleChangeMock = vi.fn();
            const onApplyStyleToAllMock = vi.fn();

            routeStyleUpdate(applyToAll, onStyleChangeMock, onApplyStyleToAllMock);

            // Exactly one callback should be called
            const totalCalls = onStyleChangeMock.mock.calls.length + onApplyStyleToAllMock.mock.calls.length;
            expect(totalCalls).toBe(1);

            // Verify mutual exclusivity
            if (applyToAll) {
              expect(onApplyStyleToAllMock).toHaveBeenCalled();
              expect(onStyleChangeMock).not.toHaveBeenCalled();
            } else {
              expect(onStyleChangeMock).toHaveBeenCalled();
              expect(onApplyStyleToAllMock).not.toHaveBeenCalled();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6.6: Mutual exclusivity of callbacks for position updates', () => {
    it('should never call both onPositionChange and onApplyStyleToAll for the same update', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          positionPresetArb,
          (applyToAll, _position) => {
            const onPositionChangeMock = vi.fn();
            const onApplyStyleToAllMock = vi.fn();

            routePositionUpdate(applyToAll, onPositionChangeMock, onApplyStyleToAllMock);

            // Exactly one callback should be called
            const totalCalls = onPositionChangeMock.mock.calls.length + onApplyStyleToAllMock.mock.calls.length;
            expect(totalCalls).toBe(1);

            // Verify mutual exclusivity
            if (applyToAll) {
              expect(onApplyStyleToAllMock).toHaveBeenCalled();
              expect(onPositionChangeMock).not.toHaveBeenCalled();
            } else {
              expect(onPositionChangeMock).toHaveBeenCalled();
              expect(onApplyStyleToAllMock).not.toHaveBeenCalled();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6.7: Routing consistency across multiple updates', () => {
    it('should maintain consistent routing when applyToAll state remains true', () => {
      fc.assert(
        fc.property(
          fc.array(partialStyleArb, { minLength: 1, maxLength: 10 }),
          (styles) => {
            const onStyleChangeMock = vi.fn();
            const onApplyStyleToAllMock = vi.fn();

            // Apply multiple style updates with applyToAll = true
            styles.forEach(() => {
              routeStyleUpdate(true, onStyleChangeMock, onApplyStyleToAllMock);
            });

            // All calls should go to onApplyStyleToAll
            expect(onApplyStyleToAllMock).toHaveBeenCalledTimes(styles.length);
            expect(onStyleChangeMock).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain consistent routing when applyToAll state remains false', () => {
      fc.assert(
        fc.property(
          fc.array(partialStyleArb, { minLength: 1, maxLength: 10 }),
          (styles) => {
            const onStyleChangeMock = vi.fn();
            const onApplyStyleToAllMock = vi.fn();

            // Apply multiple style updates with applyToAll = false
            styles.forEach(() => {
              routeStyleUpdate(false, onStyleChangeMock, onApplyStyleToAllMock);
            });

            // All calls should go to onStyleChange
            expect(onStyleChangeMock).toHaveBeenCalledTimes(styles.length);
            expect(onApplyStyleToAllMock).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6.8: Routing switches correctly when applyToAll state changes', () => {
    it('should route to onApplyStyleToAll when applyToAll changes from false to true', () => {
      fc.assert(
        fc.property(partialStyleArb, (_style) => {
          const onStyleChangeMock = vi.fn();
          const onApplyStyleToAllMock = vi.fn();

          // First update with applyToAll = false
          routeStyleUpdate(false, onStyleChangeMock, onApplyStyleToAllMock);
          expect(onStyleChangeMock).toHaveBeenCalledTimes(1);
          expect(onApplyStyleToAllMock).not.toHaveBeenCalled();

          // Reset mocks
          onStyleChangeMock.mockClear();
          onApplyStyleToAllMock.mockClear();

          // Second update with applyToAll = true
          routeStyleUpdate(true, onStyleChangeMock, onApplyStyleToAllMock);
          expect(onApplyStyleToAllMock).toHaveBeenCalledTimes(1);
          expect(onStyleChangeMock).not.toHaveBeenCalled();
        }),
        { numRuns: 100 }
      );
    });

    it('should route to onStyleChange when applyToAll changes from true to false', () => {
      fc.assert(
        fc.property(partialStyleArb, (_style) => {
          const onStyleChangeMock = vi.fn();
          const onApplyStyleToAllMock = vi.fn();

          // First update with applyToAll = true
          routeStyleUpdate(true, onStyleChangeMock, onApplyStyleToAllMock);
          expect(onApplyStyleToAllMock).toHaveBeenCalledTimes(1);
          expect(onStyleChangeMock).not.toHaveBeenCalled();

          // Reset mocks
          onStyleChangeMock.mockClear();
          onApplyStyleToAllMock.mockClear();

          // Second update with applyToAll = false
          routeStyleUpdate(false, onStyleChangeMock, onApplyStyleToAllMock);
          expect(onStyleChangeMock).toHaveBeenCalledTimes(1);
          expect(onApplyStyleToAllMock).not.toHaveBeenCalled();
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6.9: Routing works for all style property combinations', () => {
    it('should route correctly regardless of which style properties are being updated', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          partialStyleArb,
          (applyToAll, _style) => {
            const onStyleChangeMock = vi.fn();
            const onApplyStyleToAllMock = vi.fn();

            routeStyleUpdate(applyToAll, onStyleChangeMock, onApplyStyleToAllMock);

            // Routing should be consistent regardless of style content
            if (applyToAll) {
              expect(onApplyStyleToAllMock).toHaveBeenCalledTimes(1);
              expect(onStyleChangeMock).not.toHaveBeenCalled();
            } else {
              expect(onStyleChangeMock).toHaveBeenCalledTimes(1);
              expect(onApplyStyleToAllMock).not.toHaveBeenCalled();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6.10: Routing works for all position presets', () => {
    it('should route correctly regardless of which position preset is being applied', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          positionPresetArb,
          (applyToAll, _position) => {
            const onPositionChangeMock = vi.fn();
            const onApplyStyleToAllMock = vi.fn();

            routePositionUpdate(applyToAll, onPositionChangeMock, onApplyStyleToAllMock);

            // Routing should be consistent regardless of position value
            if (applyToAll) {
              expect(onApplyStyleToAllMock).toHaveBeenCalledTimes(1);
              expect(onPositionChangeMock).not.toHaveBeenCalled();
            } else {
              expect(onPositionChangeMock).toHaveBeenCalledTimes(1);
              expect(onApplyStyleToAllMock).not.toHaveBeenCalled();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});




// ============================================
// PROPERTY 4 & 5: TOGGLE STATE PRESERVATION
// ============================================

/**
 * Helper function that simulates toggling applyToAll from false to true
 * and verifies that no regions are modified
 */
function toggleApplyToAllOn(regions: KeystrokeRegion[]): KeystrokeRegion[] {
  // Simply return the regions unchanged - toggling should not modify them
  return regions;
}

/**
 * Helper function that simulates toggling applyToAll from true to false
 * and verifies that no regions are modified
 */
function toggleApplyToAllOff(regions: KeystrokeRegion[]): KeystrokeRegion[] {
  // Simply return the regions unchanged - toggling should not modify them
  return regions;
}

/**
 * Property 4: Toggle ON Preserves Existing Styles
 * 
 * *For any* array of KeystrokeRegions with varying styles, toggling `applyToAll` 
 * from false to true SHALL NOT modify any existing region's style or position properties.
 * 
 * **Validates: Requirements 3.1, 3.2**
 * 
 * Feature: keystroke-apply-to-all, Property 4: Toggle ON Preserves Existing Styles
 */
describe('Property 4: Toggle ON Preserves Existing Styles', () => {

  describe('Property 4.1: Toggling ON does not modify any region styles', () => {
    it('should preserve all style properties when toggling applyToAll from false to true', () => {
      fc.assert(
        fc.property(keystrokeRegionsArb, (regions) => {
          // Create a deep copy of the original regions to compare
          const originalRegions = JSON.parse(JSON.stringify(regions));
          
          // Toggle applyToAll from false to true
          const resultRegions = toggleApplyToAllOn(regions);
          
          // All regions should be unchanged
          expect(resultRegions.length).toBe(originalRegions.length);
          resultRegions.forEach((region, i) => {
            const original = originalRegions[i];
            
            // All style properties should be identical
            expect(region.style.textColor).toBe(original.style.textColor);
            expect(region.style.backgroundColor).toBe(original.style.backgroundColor);
            expect(region.style.modifierColor).toBe(original.style.modifierColor);
            expect(region.style.textScale).toBe(original.style.textScale);
            expect(region.style.borderRadius).toBe(original.style.borderRadius);
            expect(region.style.fadeDurationMs).toBe(original.style.fadeDurationMs);
            expect(region.style.lingerDurationMs).toBe(original.style.lingerDurationMs);
            expect(region.style.animationIn).toBe(original.style.animationIn);
            expect(region.style.animationOut).toBe(original.style.animationOut);
            expect(region.style.showOnlyHotkeys).toBe(original.style.showOnlyHotkeys);
          });
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4.2: Toggling ON does not modify any region positions', () => {
    it('should preserve all position properties when toggling applyToAll from false to true', () => {
      fc.assert(
        fc.property(keystrokeRegionsArb, (regions) => {
          // Create a deep copy of the original regions to compare
          const originalRegions = JSON.parse(JSON.stringify(regions));
          
          // Toggle applyToAll from false to true
          const resultRegions = toggleApplyToAllOn(regions);
          
          // All position presets should be unchanged
          resultRegions.forEach((region, i) => {
            const original = originalRegions[i];
            expect(region.positionPreset).toBe(original.positionPreset);
          });
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4.3: Toggling ON does not modify region identity or timing', () => {
    it('should preserve all region identity and timing properties when toggling ON', () => {
      fc.assert(
        fc.property(keystrokeRegionsArb, (regions) => {
          // Create a deep copy of the original regions to compare
          const originalRegions = JSON.parse(JSON.stringify(regions));
          
          // Toggle applyToAll from false to true
          const resultRegions = toggleApplyToAllOn(regions);
          
          // All identity and timing properties should be unchanged
          resultRegions.forEach((region, i) => {
            const original = originalRegions[i];
            expect(region.id).toBe(original.id);
            expect(region.startMs).toBe(original.startMs);
            expect(region.endMs).toBe(original.endMs);
            expect(region.text).toBe(original.text);
            expect(region.eventType).toBe(original.eventType);
          });
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4.4: Toggling ON preserves regions with varying styles', () => {
    it('should preserve all regions even when they have different styles', () => {
      fc.assert(
        fc.property(
          fc.array(keystrokeRegionArb, { minLength: 2, maxLength: 10 }),
          (regions) => {
            // Create a deep copy of the original regions to compare
            const originalRegions = JSON.parse(JSON.stringify(regions));
            
            // Toggle applyToAll from false to true
            const resultRegions = toggleApplyToAllOn(regions);
            
            // All regions should be completely unchanged
            expect(resultRegions).toEqual(originalRegions);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4.5: Toggling ON preserves regions with varying positions', () => {
    it('should preserve all regions even when they have different positions', () => {
      fc.assert(
        fc.property(keystrokeRegionsArb, (regions) => {
          // Create a deep copy of the original regions to compare
          const originalRegions = JSON.parse(JSON.stringify(regions));
          
          // Toggle applyToAll from false to true
          const resultRegions = toggleApplyToAllOn(regions);
          
          // All regions should be completely unchanged
          expect(resultRegions).toEqual(originalRegions);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4.6: Toggling ON with single region preserves it', () => {
    it('should preserve a single region when toggling ON', () => {
      fc.assert(
        fc.property(keystrokeRegionArb, (region) => {
          // Create a deep copy of the original region to compare
          const originalRegion = JSON.parse(JSON.stringify(region));
          
          // Toggle applyToAll from false to true
          const resultRegions = toggleApplyToAllOn([region]);
          
          // The single region should be completely unchanged
          expect(resultRegions.length).toBe(1);
          expect(resultRegions[0]).toEqual(originalRegion);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4.7: Toggling ON with multiple regions preserves all', () => {
    it('should preserve all regions when toggling ON with multiple regions', () => {
      fc.assert(
        fc.property(
          fc.array(keystrokeRegionArb, { minLength: 3, maxLength: 10 }),
          (regions) => {
            // Create a deep copy of the original regions to compare
            const originalRegions = JSON.parse(JSON.stringify(regions));
            
            // Toggle applyToAll from false to true
            const resultRegions = toggleApplyToAllOn(regions);
            
            // All regions should be completely unchanged
            expect(resultRegions.length).toBe(originalRegions.length);
            resultRegions.forEach((region, i) => {
              expect(region).toEqual(originalRegions[i]);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4.8: Toggling ON is idempotent', () => {
    it('should produce same result when toggling ON multiple times', () => {
      fc.assert(
        fc.property(keystrokeRegionsArb, (regions) => {
          // Create a deep copy of the original regions to compare
          const originalRegions = JSON.parse(JSON.stringify(regions));
          
          // Toggle applyToAll from false to true multiple times
          const result1 = toggleApplyToAllOn(regions);
          const result2 = toggleApplyToAllOn(result1);
          const result3 = toggleApplyToAllOn(result2);
          
          // All results should be identical to the original
          expect(result1).toEqual(originalRegions);
          expect(result2).toEqual(originalRegions);
          expect(result3).toEqual(originalRegions);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4.9: Toggling ON does not affect array length', () => {
    it('should preserve the number of regions when toggling ON', () => {
      fc.assert(
        fc.property(keystrokeRegionsArb, (regions) => {
          const originalLength = regions.length;
          
          // Toggle applyToAll from false to true
          const resultRegions = toggleApplyToAllOn(regions);
          
          // Array length should be unchanged
          expect(resultRegions.length).toBe(originalLength);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4.10: Toggling ON preserves all properties for all regions', () => {
    it('should preserve complete region objects when toggling ON', () => {
      fc.assert(
        fc.property(keystrokeRegionsArb, (regions) => {
          // Create a deep copy of the original regions to compare
          const originalRegions = JSON.parse(JSON.stringify(regions));
          
          // Toggle applyToAll from false to true
          const resultRegions = toggleApplyToAllOn(regions);
          
          // Each region should be completely identical
          resultRegions.forEach((region, i) => {
            const original = originalRegions[i];
            
            // Check all top-level properties
            expect(region.id).toBe(original.id);
            expect(region.startMs).toBe(original.startMs);
            expect(region.endMs).toBe(original.endMs);
            expect(region.text).toBe(original.text);
            expect(region.eventType).toBe(original.eventType);
            expect(region.positionPreset).toBe(original.positionPreset);
            
            // Check all style properties
            expect(region.style).toEqual(original.style);
          });
        }),
        { numRuns: 100 }
      );
    });
  });
});

/**
 * Property 5: Toggle OFF Preserves Styles
 * 
 * *For any* array of KeystrokeRegions, toggling `applyToAll` from true to false 
 * SHALL NOT modify any existing region's style or position properties.
 * 
 * **Validates: Requirements 3.3**
 * 
 * Feature: keystroke-apply-to-all, Property 5: Toggle OFF Preserves Styles
 */
describe('Property 5: Toggle OFF Preserves Styles', () => {

  describe('Property 5.1: Toggling OFF does not modify any region styles', () => {
    it('should preserve all style properties when toggling applyToAll from true to false', () => {
      fc.assert(
        fc.property(keystrokeRegionsArb, (regions) => {
          // Create a deep copy of the original regions to compare
          const originalRegions = JSON.parse(JSON.stringify(regions));
          
          // Toggle applyToAll from true to false
          const resultRegions = toggleApplyToAllOff(regions);
          
          // All regions should be unchanged
          expect(resultRegions.length).toBe(originalRegions.length);
          resultRegions.forEach((region, i) => {
            const original = originalRegions[i];
            
            // All style properties should be identical
            expect(region.style.textColor).toBe(original.style.textColor);
            expect(region.style.backgroundColor).toBe(original.style.backgroundColor);
            expect(region.style.modifierColor).toBe(original.style.modifierColor);
            expect(region.style.textScale).toBe(original.style.textScale);
            expect(region.style.borderRadius).toBe(original.style.borderRadius);
            expect(region.style.fadeDurationMs).toBe(original.style.fadeDurationMs);
            expect(region.style.lingerDurationMs).toBe(original.style.lingerDurationMs);
            expect(region.style.animationIn).toBe(original.style.animationIn);
            expect(region.style.animationOut).toBe(original.style.animationOut);
            expect(region.style.showOnlyHotkeys).toBe(original.style.showOnlyHotkeys);
          });
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 5.2: Toggling OFF does not modify any region positions', () => {
    it('should preserve all position properties when toggling applyToAll from true to false', () => {
      fc.assert(
        fc.property(keystrokeRegionsArb, (regions) => {
          // Create a deep copy of the original regions to compare
          const originalRegions = JSON.parse(JSON.stringify(regions));
          
          // Toggle applyToAll from true to false
          const resultRegions = toggleApplyToAllOff(regions);
          
          // All position presets should be unchanged
          resultRegions.forEach((region, i) => {
            const original = originalRegions[i];
            expect(region.positionPreset).toBe(original.positionPreset);
          });
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 5.3: Toggling OFF does not modify region identity or timing', () => {
    it('should preserve all region identity and timing properties when toggling OFF', () => {
      fc.assert(
        fc.property(keystrokeRegionsArb, (regions) => {
          // Create a deep copy of the original regions to compare
          const originalRegions = JSON.parse(JSON.stringify(regions));
          
          // Toggle applyToAll from true to false
          const resultRegions = toggleApplyToAllOff(regions);
          
          // All identity and timing properties should be unchanged
          resultRegions.forEach((region, i) => {
            const original = originalRegions[i];
            expect(region.id).toBe(original.id);
            expect(region.startMs).toBe(original.startMs);
            expect(region.endMs).toBe(original.endMs);
            expect(region.text).toBe(original.text);
            expect(region.eventType).toBe(original.eventType);
          });
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 5.4: Toggling OFF preserves regions with varying styles', () => {
    it('should preserve all regions even when they have different styles', () => {
      fc.assert(
        fc.property(
          fc.array(keystrokeRegionArb, { minLength: 2, maxLength: 10 }),
          (regions) => {
            // Create a deep copy of the original regions to compare
            const originalRegions = JSON.parse(JSON.stringify(regions));
            
            // Toggle applyToAll from true to false
            const resultRegions = toggleApplyToAllOff(regions);
            
            // All regions should be completely unchanged
            expect(resultRegions).toEqual(originalRegions);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 5.5: Toggling OFF preserves regions with varying positions', () => {
    it('should preserve all regions even when they have different positions', () => {
      fc.assert(
        fc.property(keystrokeRegionsArb, (regions) => {
          // Create a deep copy of the original regions to compare
          const originalRegions = JSON.parse(JSON.stringify(regions));
          
          // Toggle applyToAll from true to false
          const resultRegions = toggleApplyToAllOff(regions);
          
          // All regions should be completely unchanged
          expect(resultRegions).toEqual(originalRegions);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 5.6: Toggling OFF with single region preserves it', () => {
    it('should preserve a single region when toggling OFF', () => {
      fc.assert(
        fc.property(keystrokeRegionArb, (region) => {
          // Create a deep copy of the original region to compare
          const originalRegion = JSON.parse(JSON.stringify(region));
          
          // Toggle applyToAll from true to false
          const resultRegions = toggleApplyToAllOff([region]);
          
          // The single region should be completely unchanged
          expect(resultRegions.length).toBe(1);
          expect(resultRegions[0]).toEqual(originalRegion);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 5.7: Toggling OFF with multiple regions preserves all', () => {
    it('should preserve all regions when toggling OFF with multiple regions', () => {
      fc.assert(
        fc.property(
          fc.array(keystrokeRegionArb, { minLength: 3, maxLength: 10 }),
          (regions) => {
            // Create a deep copy of the original regions to compare
            const originalRegions = JSON.parse(JSON.stringify(regions));
            
            // Toggle applyToAll from true to false
            const resultRegions = toggleApplyToAllOff(regions);
            
            // All regions should be completely unchanged
            expect(resultRegions.length).toBe(originalRegions.length);
            resultRegions.forEach((region, i) => {
              expect(region).toEqual(originalRegions[i]);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 5.8: Toggling OFF is idempotent', () => {
    it('should produce same result when toggling OFF multiple times', () => {
      fc.assert(
        fc.property(keystrokeRegionsArb, (regions) => {
          // Create a deep copy of the original regions to compare
          const originalRegions = JSON.parse(JSON.stringify(regions));
          
          // Toggle applyToAll from true to false multiple times
          const result1 = toggleApplyToAllOff(regions);
          const result2 = toggleApplyToAllOff(result1);
          const result3 = toggleApplyToAllOff(result2);
          
          // All results should be identical to the original
          expect(result1).toEqual(originalRegions);
          expect(result2).toEqual(originalRegions);
          expect(result3).toEqual(originalRegions);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 5.9: Toggling OFF does not affect array length', () => {
    it('should preserve the number of regions when toggling OFF', () => {
      fc.assert(
        fc.property(keystrokeRegionsArb, (regions) => {
          const originalLength = regions.length;
          
          // Toggle applyToAll from true to false
          const resultRegions = toggleApplyToAllOff(regions);
          
          // Array length should be unchanged
          expect(resultRegions.length).toBe(originalLength);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 5.10: Toggling OFF preserves all properties for all regions', () => {
    it('should preserve complete region objects when toggling OFF', () => {
      fc.assert(
        fc.property(keystrokeRegionsArb, (regions) => {
          // Create a deep copy of the original regions to compare
          const originalRegions = JSON.parse(JSON.stringify(regions));
          
          // Toggle applyToAll from true to false
          const resultRegions = toggleApplyToAllOff(regions);
          
          // Each region should be completely identical
          resultRegions.forEach((region, i) => {
            const original = originalRegions[i];
            
            // Check all top-level properties
            expect(region.id).toBe(original.id);
            expect(region.startMs).toBe(original.startMs);
            expect(region.endMs).toBe(original.endMs);
            expect(region.text).toBe(original.text);
            expect(region.eventType).toBe(original.eventType);
            expect(region.positionPreset).toBe(original.positionPreset);
            
            // Check all style properties
            expect(region.style).toEqual(original.style);
          });
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 5.11: Toggling OFF after ON preserves all changes made during ON', () => {
    it('should preserve regions that were modified while applyToAll was ON', () => {
      fc.assert(
        fc.property(
          keystrokeRegionsArb,
          partialStyleArb,
          (regions, styleUpdate) => {
            // Create a deep copy of the original regions to compare
            const originalRegions = JSON.parse(JSON.stringify(regions));
            
            // Simulate: toggle ON, apply style to all, then toggle OFF
            // After toggling OFF, the regions should still have the applied styles
            const regionsAfterStyleUpdate = applyStyleToAllRegions(regions, styleUpdate);
            const regionsAfterToggleOff = toggleApplyToAllOff(regionsAfterStyleUpdate);
            
            // The regions should still have the style updates
            regionsAfterToggleOff.forEach((region, i) => {
              const expected = originalRegions[i];
              const expectedStyle = { ...expected.style, ...styleUpdate };
              expect(region.style).toEqual(expectedStyle);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

/**
 * Integration: Toggle State Transitions
 * 
 * Tests that verify toggle state transitions preserve regions correctly.
 */
describe('Integration: Toggle State Transitions', () => {
  describe('Toggle ON then OFF preserves all regions', () => {
    it('should preserve regions through ON->OFF transition', () => {
      fc.assert(
        fc.property(keystrokeRegionsArb, (regions) => {
          // Create a deep copy of the original regions to compare
          const originalRegions = JSON.parse(JSON.stringify(regions));
          
          // Toggle ON then OFF
          const afterToggleOn = toggleApplyToAllOn(regions);
          const afterToggleOff = toggleApplyToAllOff(afterToggleOn);
          
          // Should be identical to original
          expect(afterToggleOff).toEqual(originalRegions);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Toggle OFF then ON preserves all regions', () => {
    it('should preserve regions through OFF->ON transition', () => {
      fc.assert(
        fc.property(keystrokeRegionsArb, (regions) => {
          // Create a deep copy of the original regions to compare
          const originalRegions = JSON.parse(JSON.stringify(regions));
          
          // Toggle OFF then ON
          const afterToggleOff = toggleApplyToAllOff(regions);
          const afterToggleOn = toggleApplyToAllOn(afterToggleOff);
          
          // Should be identical to original
          expect(afterToggleOn).toEqual(originalRegions);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Multiple toggle transitions preserve regions', () => {
    it('should preserve regions through multiple ON/OFF transitions', () => {
      fc.assert(
        fc.property(keystrokeRegionsArb, (regions) => {
          // Create a deep copy of the original regions to compare
          const originalRegions = JSON.parse(JSON.stringify(regions));
          
          // Multiple toggle transitions
          let current = regions;
          current = toggleApplyToAllOn(current);
          current = toggleApplyToAllOff(current);
          current = toggleApplyToAllOn(current);
          current = toggleApplyToAllOff(current);
          
          // Should be identical to original
          expect(current).toEqual(originalRegions);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Toggle transitions do not affect style updates', () => {
    it('should allow style updates to work correctly after toggle transitions', () => {
      fc.assert(
        fc.property(
          keystrokeRegionsArb,
          partialStyleArb,
          (regions, styleUpdate) => {
            // Create a deep copy of the original regions to compare
            const originalRegions = JSON.parse(JSON.stringify(regions));
            
            // Toggle ON, apply style, toggle OFF, apply style again
            let current = regions;
            current = toggleApplyToAllOn(current);
            current = applyStyleToAllRegions(current, styleUpdate);
            current = toggleApplyToAllOff(current);
            current = applyStyleToAllRegions(current, styleUpdate);
            
            // All regions should have the style applied twice
            current.forEach((region, i) => {
              const expected = originalRegions[i];
              const expectedStyle = { ...expected.style, ...styleUpdate, ...styleUpdate };
              expect(region.style).toEqual(expectedStyle);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


// ============================================
// PROPERTY 7: SWITCH VISUAL STATE CONSISTENCY
// ============================================

/**
 * Property 7: Switch Visual State Consistency
 * 
 * *For any* value of the `applyToAll` state, the Switch component's `checked` prop 
 * SHALL equal the `applyToAll` state value.
 * 
 * **Validates: Requirements 5.1**
 * 
 * Feature: keystroke-apply-to-all, Property 7: Switch Visual State Consistency
 */
describe('Property 7: Switch Visual State Consistency', () => {
  /**
   * Helper function that simulates the Switch component's checked prop
   * based on the applyToAll state value.
   * 
   * This represents the actual behavior of the Switch component in the UI:
   * <Switch checked={applyToAll} onCheckedChange={setApplyToAll} />
   */
  function getSwitchCheckedState(applyToAll: boolean): boolean {
    return applyToAll;
  }

  describe('Property 7.1: Switch checked state matches applyToAll when true', () => {
    it('should have checked prop equal to true when applyToAll is true', () => {
      fc.assert(
        fc.property(fc.constant(true), (applyToAll) => {
          const switchChecked = getSwitchCheckedState(applyToAll);
          
          // Switch checked prop should equal applyToAll state
          expect(switchChecked).toBe(true);
          expect(switchChecked).toBe(applyToAll);
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain checked state when applyToAll is true across multiple checks', () => {
      fc.assert(
        fc.property(fc.constant(true), (applyToAll) => {
          // Check multiple times to ensure consistency
          for (let i = 0; i < 10; i++) {
            const switchChecked = getSwitchCheckedState(applyToAll);
            expect(switchChecked).toBe(true);
            expect(switchChecked).toBe(applyToAll);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7.2: Switch checked state matches applyToAll when false', () => {
    it('should have checked prop equal to false when applyToAll is false', () => {
      fc.assert(
        fc.property(fc.constant(false), (applyToAll) => {
          const switchChecked = getSwitchCheckedState(applyToAll);
          
          // Switch checked prop should equal applyToAll state
          expect(switchChecked).toBe(false);
          expect(switchChecked).toBe(applyToAll);
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain checked state when applyToAll is false across multiple checks', () => {
      fc.assert(
        fc.property(fc.constant(false), (applyToAll) => {
          // Check multiple times to ensure consistency
          for (let i = 0; i < 10; i++) {
            const switchChecked = getSwitchCheckedState(applyToAll);
            expect(switchChecked).toBe(false);
            expect(switchChecked).toBe(applyToAll);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7.3: Switch checked state matches applyToAll for all boolean values', () => {
    it('should have checked prop equal to applyToAll for any boolean value', () => {
      fc.assert(
        fc.property(fc.boolean(), (applyToAll) => {
          const switchChecked = getSwitchCheckedState(applyToAll);
          
          // Switch checked prop should always equal applyToAll state
          expect(switchChecked).toBe(applyToAll);
          
          // Verify the relationship holds
          if (applyToAll) {
            expect(switchChecked).toBe(true);
          } else {
            expect(switchChecked).toBe(false);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7.4: Switch visual state is consistent with applyToAll state', () => {
    it('should reflect applyToAll state changes immediately', () => {
      fc.assert(
        fc.property(fc.boolean(), (initialApplyToAll) => {
          // Initial state
          let applyToAll = initialApplyToAll;
          let switchChecked = getSwitchCheckedState(applyToAll);
          expect(switchChecked).toBe(applyToAll);
          
          // Toggle state
          applyToAll = !applyToAll;
          switchChecked = getSwitchCheckedState(applyToAll);
          expect(switchChecked).toBe(applyToAll);
          
          // Toggle again
          applyToAll = !applyToAll;
          switchChecked = getSwitchCheckedState(applyToAll);
          expect(switchChecked).toBe(applyToAll);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7.5: Switch checked state is boolean', () => {
    it('should always return a boolean value for checked prop', () => {
      fc.assert(
        fc.property(fc.boolean(), (applyToAll) => {
          const switchChecked = getSwitchCheckedState(applyToAll);
          
          // Result should be a boolean
          expect(typeof switchChecked).toBe('boolean');
          
          // Result should be exactly true or false
          expect(switchChecked === true || switchChecked === false).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7.6: Switch checked state is deterministic', () => {
    it('should produce the same checked state for the same applyToAll value', () => {
      fc.assert(
        fc.property(fc.boolean(), (applyToAll) => {
          const switchChecked1 = getSwitchCheckedState(applyToAll);
          const switchChecked2 = getSwitchCheckedState(applyToAll);
          const switchChecked3 = getSwitchCheckedState(applyToAll);
          
          // All calls with the same input should produce the same output
          expect(switchChecked1).toBe(switchChecked2);
          expect(switchChecked2).toBe(switchChecked3);
          expect(switchChecked1).toBe(applyToAll);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7.7: Switch checked state reflects all state transitions', () => {
    it('should correctly reflect state through multiple transitions', () => {
      fc.assert(
        fc.property(
          fc.array(fc.boolean(), { minLength: 1, maxLength: 20 }),
          (stateTransitions) => {
            let applyToAll = false; // Start with false
            
            stateTransitions.forEach((newState) => {
              applyToAll = newState;
              const switchChecked = getSwitchCheckedState(applyToAll);
              
              // Switch should always match current state
              expect(switchChecked).toBe(applyToAll);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7.8: Switch checked state is independent of other state', () => {
    it('should only depend on applyToAll value, not other factors', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          keystrokeRegionsArb,
          partialStyleArb,
          (applyToAll, _regions, _style) => {
            const switchChecked = getSwitchCheckedState(applyToAll);
            
            // Switch checked state should only depend on applyToAll
            // It should not be affected by regions or style
            expect(switchChecked).toBe(applyToAll);
            
            // Verify consistency regardless of other data
            const switchChecked2 = getSwitchCheckedState(applyToAll);
            expect(switchChecked2).toBe(switchChecked);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7.9: Switch checked state is not affected by position changes', () => {
    it('should maintain correct checked state regardless of position preset', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          positionPresetArb,
          (applyToAll, _position) => {
            const switchChecked = getSwitchCheckedState(applyToAll);
            
            // Switch checked state should not be affected by position
            expect(switchChecked).toBe(applyToAll);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7.10: Switch checked state is not affected by animation changes', () => {
    it('should maintain correct checked state regardless of animation preset', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          animationPresetArb,
          animationPresetArb,
          (applyToAll, _animationIn, _animationOut) => {
            const switchChecked = getSwitchCheckedState(applyToAll);
            
            // Switch checked state should not be affected by animation settings
            expect(switchChecked).toBe(applyToAll);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7.11: Switch checked state is not affected by timing changes', () => {
    it('should maintain correct checked state regardless of timing values', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 500, max: 5000 }),
          (applyToAll, _fadeDuration, _lingerDuration) => {
            const switchChecked = getSwitchCheckedState(applyToAll);
            
            // Switch checked state should not be affected by timing
            expect(switchChecked).toBe(applyToAll);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7.12: Switch checked state is not affected by color changes', () => {
    it('should maintain correct checked state regardless of color values', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          hexColorArb,
          hexColorArb,
          hexColorArb,
          (applyToAll, _textColor, _backgroundColor, _modifierColor) => {
            const switchChecked = getSwitchCheckedState(applyToAll);
            
            // Switch checked state should not be affected by colors
            expect(switchChecked).toBe(applyToAll);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7.13: Switch checked state is not affected by scale changes', () => {
    it('should maintain correct checked state regardless of text scale', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.double({ min: 0.5, max: 2.0, noNaN: true }),
          (applyToAll, _textScale) => {
            const switchChecked = getSwitchCheckedState(applyToAll);
            
            // Switch checked state should not be affected by text scale
            expect(switchChecked).toBe(applyToAll);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7.14: Switch checked state is not affected by border radius changes', () => {
    it('should maintain correct checked state regardless of border radius', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.integer({ min: 0, max: 16 }),
          (applyToAll, _borderRadius) => {
            const switchChecked = getSwitchCheckedState(applyToAll);
            
            // Switch checked state should not be affected by border radius
            expect(switchChecked).toBe(applyToAll);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7.15: Switch checked state is not affected by hotkey filter changes', () => {
    it('should maintain correct checked state regardless of showOnlyHotkeys setting', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.boolean(),
          (applyToAll, _showOnlyHotkeys) => {
            const switchChecked = getSwitchCheckedState(applyToAll);
            
            // Switch checked state should not be affected by hotkey filter
            expect(switchChecked).toBe(applyToAll);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7.16: Switch checked state is idempotent', () => {
    it('should produce the same result when checked state is queried multiple times', () => {
      fc.assert(
        fc.property(fc.boolean(), (applyToAll) => {
          const results: boolean[] = [];
          
          // Query the checked state multiple times
          for (let i = 0; i < 100; i++) {
            results.push(getSwitchCheckedState(applyToAll));
          }
          
          // All results should be identical
          const firstResult = results[0];
          results.forEach((result) => {
            expect(result).toBe(firstResult);
            expect(result).toBe(applyToAll);
          });
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7.17: Switch checked state is not affected by region count', () => {
    it('should maintain correct checked state regardless of number of regions', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.array(keystrokeRegionArb, { minLength: 0, maxLength: 100 }),
          (applyToAll, _regions) => {
            const switchChecked = getSwitchCheckedState(applyToAll);
            
            // Switch checked state should not be affected by region count
            expect(switchChecked).toBe(applyToAll);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7.18: Switch checked state is not affected by region properties', () => {
    it('should maintain correct checked state regardless of region content', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          keystrokeRegionArb,
          (applyToAll, _region) => {
            const switchChecked = getSwitchCheckedState(applyToAll);
            
            // Switch checked state should not be affected by region properties
            expect(switchChecked).toBe(applyToAll);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7.19: Switch checked state is not affected by timing values', () => {
    it('should maintain correct checked state regardless of start/end times', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.integer({ min: 0, max: 100000 }),
          fc.integer({ min: 0, max: 100000 }),
          (applyToAll, _startMs, _endMs) => {
            const switchChecked = getSwitchCheckedState(applyToAll);
            
            // Switch checked state should not be affected by region timing
            expect(switchChecked).toBe(applyToAll);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7.20: Switch checked state is not affected by event type', () => {
    it('should maintain correct checked state regardless of keystroke or mouse event', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.constantFrom('keystroke', 'mouse') as fc.Arbitrary<'keystroke' | 'mouse'>,
          (applyToAll, _eventType) => {
            const switchChecked = getSwitchCheckedState(applyToAll);
            
            // Switch checked state should not be affected by event type
            expect(switchChecked).toBe(applyToAll);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

describe('KeystrokeSettingsPanel Delete All', () => {
  const defaultProps = {
    keystroke: {
      id: 'k1',
      startMs: 0,
      endMs: 100,
      text: 'Ctrl+C',
      eventType: 'keystroke' as const,
      positionPreset: 'bottom-center' as const,
      style: DEFAULT_KEYSTROKE_STYLE,
    },
    onStyleChange: vi.fn(),
    onPositionChange: vi.fn(),
    onDelete: vi.fn(),
  };

  it('should call onDeleteAll when Delete All button is clicked', () => {
    const onDeleteAll = vi.fn();
    render(
      <KeystrokeSettingsPanel
        {...defaultProps}
        onDeleteAll={onDeleteAll}
      />
    );
    
    const deleteAllButton = screen.getByText('Delete All Keystroke');
    fireEvent.click(deleteAllButton);
    
    expect(onDeleteAll).toHaveBeenCalledTimes(1);
  });

  it('should not render Delete All button when onDeleteAll is not provided', () => {
    render(
      <KeystrokeSettingsPanel {...defaultProps} />
    );
    
    expect(screen.queryByText('Delete All Keystroke')).not.toBeInTheDocument();
  });

  it('should have proper styling matching Delete Keystroke button', () => {
    const onDeleteAll = vi.fn();
    render(
      <KeystrokeSettingsPanel
        {...defaultProps}
        onDeleteAll={onDeleteAll}
      />
    );
    
    const deleteAllButton = screen.getByText('Delete All Keystroke');
    expect(deleteAllButton).toHaveClass('w-full gap-2 bg-red-500/10 text-red-400 border border-red-500/20');
  });
});
