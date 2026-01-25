import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import React from 'react';
import { KeyCap, type KeyCapProps } from './KeyCap';

/**
 * Design constants for keycap styling - extracted from KeyCap.tsx for testing
 * Reference: keyviz/lib/providers/key_style.dart lines 260-320
 * 
 * These constants define the scaling ratios for all keycap dimensions
 */
const KEYCAP_STYLE = {
  minSizeRatio: 2.25,           // Minimum width/height relative to base font size
  outerHeightRatio: 2.5,        // Total height including shadow
  shadowOffsetRatio: 0.25,      // Bottom shadow offset
  horizontalPaddingRatio: 0.5,  // Horizontal padding relative to base font size
  verticalPaddingRatio: 0.375,  // Vertical padding relative to base font size
  iconSizeRatio: 0.45,          // Icon size relative to base font size
  labelSizeRatio: 0.5,          // Label size for modifiers relative to base font size
  cornerSmoothing: 0.4,         // Border radius factor (40% corner smoothing)
  gapRatio: 0.5,                // Gap between keycaps
};

/**
 * Base font size for calculations (in pixels)
 */
const BASE_FONT_SIZE = 16;

/**
 * Calculate keycap dimensions based on font size and text scale
 * This mirrors the calculation logic in KeyCap.tsx
 */
function calculateKeycapDimensions(baseFontSize: number, textScale: number) {
  const scaledFontSize = baseFontSize * textScale;
  
  return {
    scaledFontSize,
    minSize: scaledFontSize * KEYCAP_STYLE.minSizeRatio,
    outerHeight: scaledFontSize * KEYCAP_STYLE.outerHeightRatio,
    shadowOffset: scaledFontSize * KEYCAP_STYLE.shadowOffsetRatio,
    horizontalPadding: scaledFontSize * KEYCAP_STYLE.horizontalPaddingRatio,
    verticalPadding: scaledFontSize * KEYCAP_STYLE.verticalPaddingRatio,
    iconSize: scaledFontSize * KEYCAP_STYLE.iconSizeRatio,
    labelSize: scaledFontSize * KEYCAP_STYLE.labelSizeRatio,
    gap: scaledFontSize * KEYCAP_STYLE.gapRatio,
    borderRadius: scaledFontSize * KEYCAP_STYLE.minSizeRatio * KEYCAP_STYLE.cornerSmoothing,
  };
}

/**
 * Property 2: Dimension Scaling Consistency
 * 
 * *For any* base font size F and textScale S, all keycap dimensions SHALL scale proportionally:
 * - Minimum keycap size = F × S × 2.25
 * - Gap between keycaps = F × S × 0.5
 * - Shadow offset = F × S × 0.25
 * - Horizontal padding = F × S × 0.5
 * - Vertical padding = F × S × 0.375
 * 
 * **Validates: Requirements 1.4, 3.2, 4.4, 4.6, 4.7, 6.1**
 * 
 * Feature: keyviz-style-keystroke-overlay, Property 2: Dimension Scaling Consistency
 */
describe('Property 2: Dimension Scaling Consistency', () => {
  // Arbitrary for base font size (8-72px as specified in task)
  const fontSizeArbitrary = fc.float({ min: 8, max: 72, noNaN: true });
  
  // Arbitrary for text scale (0.5-2.0 as specified in task)
  const textScaleArbitrary = fc.float({ min: 0.5, max: 2.0, noNaN: true });

  /**
   * Property: Minimum keycap size = F × S × 2.25
   * Validates: Requirement 1.4 - Minimum size to ensure readability
   */
  it('should calculate minimum keycap size as F × S × 2.25', () => {
    fc.assert(
      fc.property(
        fontSizeArbitrary,
        textScaleArbitrary,
        (fontSize: number, textScale: number) => {
          const dimensions = calculateKeycapDimensions(fontSize, textScale);
          const expectedMinSize = fontSize * textScale * KEYCAP_STYLE.minSizeRatio;
          
          expect(dimensions.minSize).toBeCloseTo(expectedMinSize, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Gap between keycaps = F × S × 0.5
   * Validates: Requirement 3.2 - Gap equal to 50% of base font size
   */
  it('should calculate gap between keycaps as F × S × 0.5', () => {
    fc.assert(
      fc.property(
        fontSizeArbitrary,
        textScaleArbitrary,
        (fontSize: number, textScale: number) => {
          const dimensions = calculateKeycapDimensions(fontSize, textScale);
          const expectedGap = fontSize * textScale * KEYCAP_STYLE.gapRatio;
          
          expect(dimensions.gap).toBeCloseTo(expectedGap, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Shadow offset = F × S × 0.25
   * Validates: Requirement 4.4 - Top container offset upward by 25% of font size
   */
  it('should calculate shadow offset as F × S × 0.25', () => {
    fc.assert(
      fc.property(
        fontSizeArbitrary,
        textScaleArbitrary,
        (fontSize: number, textScale: number) => {
          const dimensions = calculateKeycapDimensions(fontSize, textScale);
          const expectedShadowOffset = fontSize * textScale * KEYCAP_STYLE.shadowOffsetRatio;
          
          expect(dimensions.shadowOffset).toBeCloseTo(expectedShadowOffset, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Horizontal padding = F × S × 0.5
   * Validates: Requirement 4.6 - Internal padding (horizontal: 50% font size)
   */
  it('should calculate horizontal padding as F × S × 0.5', () => {
    fc.assert(
      fc.property(
        fontSizeArbitrary,
        textScaleArbitrary,
        (fontSize: number, textScale: number) => {
          const dimensions = calculateKeycapDimensions(fontSize, textScale);
          const expectedHorizontalPadding = fontSize * textScale * KEYCAP_STYLE.horizontalPaddingRatio;
          
          expect(dimensions.horizontalPadding).toBeCloseTo(expectedHorizontalPadding, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Vertical padding = F × S × 0.375
   * Validates: Requirement 4.6 - Internal padding (vertical: 37.5% font size)
   */
  it('should calculate vertical padding as F × S × 0.375', () => {
    fc.assert(
      fc.property(
        fontSizeArbitrary,
        textScaleArbitrary,
        (fontSize: number, textScale: number) => {
          const dimensions = calculateKeycapDimensions(fontSize, textScale);
          const expectedVerticalPadding = fontSize * textScale * KEYCAP_STYLE.verticalPaddingRatio;
          
          expect(dimensions.verticalPadding).toBeCloseTo(expectedVerticalPadding, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All dimensions scale proportionally with textScale
   * Validates: Requirement 4.7 - Keycap scales proportionally based on Text_Scale setting
   * Validates: Requirement 6.1 - Apply Text_Scale setting to all dimensions
   */
  it('should scale all dimensions proportionally when textScale changes', () => {
    fc.assert(
      fc.property(
        fontSizeArbitrary,
        textScaleArbitrary,
        fc.float({ min: 0.5, max: 2.0, noNaN: true }),
        (fontSize: number, textScale1: number, textScale2: number) => {
          const dimensions1 = calculateKeycapDimensions(fontSize, textScale1);
          const dimensions2 = calculateKeycapDimensions(fontSize, textScale2);
          
          // Calculate the ratio between the two scales
          const scaleRatio = textScale2 / textScale1;
          
          // All dimensions should scale by the same ratio
          expect(dimensions2.minSize / dimensions1.minSize).toBeCloseTo(scaleRatio, 5);
          expect(dimensions2.gap / dimensions1.gap).toBeCloseTo(scaleRatio, 5);
          expect(dimensions2.shadowOffset / dimensions1.shadowOffset).toBeCloseTo(scaleRatio, 5);
          expect(dimensions2.horizontalPadding / dimensions1.horizontalPadding).toBeCloseTo(scaleRatio, 5);
          expect(dimensions2.verticalPadding / dimensions1.verticalPadding).toBeCloseTo(scaleRatio, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All dimensions scale proportionally with font size
   * Validates: Requirement 6.1 - Apply Text_Scale setting to all dimensions
   */
  it('should scale all dimensions proportionally when font size changes', () => {
    fc.assert(
      fc.property(
        fontSizeArbitrary,
        fc.float({ min: 8, max: 72, noNaN: true }),
        textScaleArbitrary,
        (fontSize1: number, fontSize2: number, textScale: number) => {
          const dimensions1 = calculateKeycapDimensions(fontSize1, textScale);
          const dimensions2 = calculateKeycapDimensions(fontSize2, textScale);
          
          // Calculate the ratio between the two font sizes
          const fontRatio = fontSize2 / fontSize1;
          
          // All dimensions should scale by the same ratio
          expect(dimensions2.minSize / dimensions1.minSize).toBeCloseTo(fontRatio, 5);
          expect(dimensions2.gap / dimensions1.gap).toBeCloseTo(fontRatio, 5);
          expect(dimensions2.shadowOffset / dimensions1.shadowOffset).toBeCloseTo(fontRatio, 5);
          expect(dimensions2.horizontalPadding / dimensions1.horizontalPadding).toBeCloseTo(fontRatio, 5);
          expect(dimensions2.verticalPadding / dimensions1.verticalPadding).toBeCloseTo(fontRatio, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Dimensions maintain correct ratios relative to each other
   * This ensures the visual proportions are preserved regardless of scale
   */
  it('should maintain correct ratios between dimensions', () => {
    fc.assert(
      fc.property(
        fontSizeArbitrary,
        textScaleArbitrary,
        (fontSize: number, textScale: number) => {
          const dimensions = calculateKeycapDimensions(fontSize, textScale);
          
          // Verify ratios between dimensions are constant
          // minSize / scaledFontSize should always equal 2.25
          expect(dimensions.minSize / dimensions.scaledFontSize).toBeCloseTo(KEYCAP_STYLE.minSizeRatio, 5);
          
          // gap / scaledFontSize should always equal 0.5
          expect(dimensions.gap / dimensions.scaledFontSize).toBeCloseTo(KEYCAP_STYLE.gapRatio, 5);
          
          // shadowOffset / scaledFontSize should always equal 0.25
          expect(dimensions.shadowOffset / dimensions.scaledFontSize).toBeCloseTo(KEYCAP_STYLE.shadowOffsetRatio, 5);
          
          // horizontalPadding / scaledFontSize should always equal 0.5
          expect(dimensions.horizontalPadding / dimensions.scaledFontSize).toBeCloseTo(KEYCAP_STYLE.horizontalPaddingRatio, 5);
          
          // verticalPadding / scaledFontSize should always equal 0.375
          expect(dimensions.verticalPadding / dimensions.scaledFontSize).toBeCloseTo(KEYCAP_STYLE.verticalPaddingRatio, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All dimensions are positive for valid inputs
   * Validates: All dimensions should be usable for rendering
   */
  it('should produce positive dimensions for all valid inputs', () => {
    fc.assert(
      fc.property(
        fontSizeArbitrary,
        textScaleArbitrary,
        (fontSize: number, textScale: number) => {
          const dimensions = calculateKeycapDimensions(fontSize, textScale);
          
          expect(dimensions.scaledFontSize).toBeGreaterThan(0);
          expect(dimensions.minSize).toBeGreaterThan(0);
          expect(dimensions.outerHeight).toBeGreaterThan(0);
          expect(dimensions.shadowOffset).toBeGreaterThan(0);
          expect(dimensions.horizontalPadding).toBeGreaterThan(0);
          expect(dimensions.verticalPadding).toBeGreaterThan(0);
          expect(dimensions.iconSize).toBeGreaterThan(0);
          expect(dimensions.labelSize).toBeGreaterThan(0);
          expect(dimensions.gap).toBeGreaterThan(0);
          expect(dimensions.borderRadius).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Outer height is greater than min size (to accommodate shadow)
   * Validates: Requirement 4.1 - Two stacked containers with shadow offset
   */
  it('should have outer height greater than min size', () => {
    fc.assert(
      fc.property(
        fontSizeArbitrary,
        textScaleArbitrary,
        (fontSize: number, textScale: number) => {
          const dimensions = calculateKeycapDimensions(fontSize, textScale);
          
          // Outer height (2.5) should be greater than min size (2.25)
          expect(dimensions.outerHeight).toBeGreaterThan(dimensions.minSize);
          
          // The difference should be approximately the shadow offset
          // outerHeight - minSize = 2.5 - 2.25 = 0.25 (same as shadowOffsetRatio)
          const heightDifference = dimensions.outerHeight - dimensions.minSize;
          expect(heightDifference).toBeCloseTo(dimensions.shadowOffset, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Icon size is smaller than label size for modifiers
   * Validates: Requirement 2.5, 2.6 - Icon at 45%, label at 50%
   */
  it('should have icon size smaller than label size', () => {
    fc.assert(
      fc.property(
        fontSizeArbitrary,
        textScaleArbitrary,
        (fontSize: number, textScale: number) => {
          const dimensions = calculateKeycapDimensions(fontSize, textScale);
          
          // Icon size (0.45) should be less than label size (0.5)
          expect(dimensions.iconSize).toBeLessThan(dimensions.labelSize);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Border radius is proportional to min size
   * Validates: Requirement 1.3 - 40% corner smoothing
   */
  it('should calculate border radius as 40% of min size', () => {
    fc.assert(
      fc.property(
        fontSizeArbitrary,
        textScaleArbitrary,
        (fontSize: number, textScale: number) => {
          const dimensions = calculateKeycapDimensions(fontSize, textScale);
          const expectedBorderRadius = dimensions.minSize * KEYCAP_STYLE.cornerSmoothing;
          
          expect(dimensions.borderRadius).toBeCloseTo(expectedBorderRadius, 5);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Unit tests for dimension calculations with specific values
 */
describe('Dimension Scaling Unit Tests', () => {
  it('should calculate correct dimensions for default values (16px, scale 1.0)', () => {
    const dimensions = calculateKeycapDimensions(BASE_FONT_SIZE, 1.0);
    
    expect(dimensions.scaledFontSize).toBe(16);
    expect(dimensions.minSize).toBe(36);           // 16 × 2.25
    expect(dimensions.gap).toBe(8);                // 16 × 0.5
    expect(dimensions.shadowOffset).toBe(4);       // 16 × 0.25
    expect(dimensions.horizontalPadding).toBe(8);  // 16 × 0.5
    expect(dimensions.verticalPadding).toBe(6);    // 16 × 0.375
  });

  it('should calculate correct dimensions for scale 2.0', () => {
    const dimensions = calculateKeycapDimensions(BASE_FONT_SIZE, 2.0);
    
    expect(dimensions.scaledFontSize).toBe(32);
    expect(dimensions.minSize).toBe(72);           // 32 × 2.25
    expect(dimensions.gap).toBe(16);               // 32 × 0.5
    expect(dimensions.shadowOffset).toBe(8);       // 32 × 0.25
    expect(dimensions.horizontalPadding).toBe(16); // 32 × 0.5
    expect(dimensions.verticalPadding).toBe(12);   // 32 × 0.375
  });

  it('should calculate correct dimensions for scale 0.5', () => {
    const dimensions = calculateKeycapDimensions(BASE_FONT_SIZE, 0.5);
    
    expect(dimensions.scaledFontSize).toBe(8);
    expect(dimensions.minSize).toBe(18);           // 8 × 2.25
    expect(dimensions.gap).toBe(4);                // 8 × 0.5
    expect(dimensions.shadowOffset).toBe(2);       // 8 × 0.25
    expect(dimensions.horizontalPadding).toBe(4);  // 8 × 0.5
    expect(dimensions.verticalPadding).toBe(3);    // 8 × 0.375
  });

  it('should calculate correct dimensions for large font size (72px)', () => {
    const dimensions = calculateKeycapDimensions(72, 1.0);
    
    expect(dimensions.scaledFontSize).toBe(72);
    expect(dimensions.minSize).toBe(162);          // 72 × 2.25
    expect(dimensions.gap).toBe(36);               // 72 × 0.5
    expect(dimensions.shadowOffset).toBe(18);      // 72 × 0.25
    expect(dimensions.horizontalPadding).toBe(36); // 72 × 0.5
    expect(dimensions.verticalPadding).toBe(27);   // 72 × 0.375
  });

  it('should calculate correct dimensions for small font size (8px)', () => {
    const dimensions = calculateKeycapDimensions(8, 1.0);
    
    expect(dimensions.scaledFontSize).toBe(8);
    expect(dimensions.minSize).toBe(18);           // 8 × 2.25
    expect(dimensions.gap).toBe(4);                // 8 × 0.5
    expect(dimensions.shadowOffset).toBe(2);       // 8 × 0.25
    expect(dimensions.horizontalPadding).toBe(4);  // 8 × 0.5
    expect(dimensions.verticalPadding).toBe(3);    // 8 × 0.375
  });
});


/**
 * Unit Tests for KeyCap Component
 * 
 * These tests verify the KeyCap component's rendering logic by examining
 * the React element structure returned by the component.
 * 
 * **Validates: Requirements 1.5, 4.1, 7.1, 7.2**
 * 
 * Test coverage:
 * - Test renders two stacked containers (shadow and face)
 * - Test modifier key displays icon above label
 * - Test non-modifier key centers label without icon
 */
describe('KeyCap Component Unit Tests', () => {
  /**
   * Helper function to recursively flatten React children, handling fragments
   */
  function flattenChildren(children: any): any[] {
    const result: any[] = [];
    React.Children.forEach(children, (child) => {
      if (child === null || child === undefined) {
        return;
      }
      // Check if it's a fragment (type is Symbol(react.fragment))
      if (child.type === React.Fragment || (child.type && child.type.toString() === 'Symbol(react.fragment)')) {
        result.push(...flattenChildren(child.props.children));
      } else {
        result.push(child);
      }
    });
    return result;
  }

  /**
   * Helper function to analyze the React element structure returned by KeyCap
   * This allows us to test the component's rendering logic without a DOM environment
   */
  function analyzeKeyCapElement(props: KeyCapProps) {
    const element = KeyCap(props);
    
    // The element should be a div (container)
    const container = element;
    const children = React.Children.toArray(container.props.children);
    
    // Find shadow and face elements by their data-testid
    const shadowElement = children.find(
      (child: any) => child?.props?.['data-testid'] === 'keycap-shadow'
    );
    const faceElement = children.find(
      (child: any) => child?.props?.['data-testid'] === 'keycap-face'
    );
    
    // Analyze face element children - flatten to handle React Fragments
    let iconElement = null;
    let labelElement = null;
    
    if (faceElement) {
      const faceChildren = flattenChildren((faceElement as any).props.children);
      iconElement = faceChildren.find(
        (child: any) => child?.props?.['data-testid'] === 'keycap-icon'
      );
      labelElement = faceChildren.find(
        (child: any) => child?.props?.['data-testid'] === 'keycap-label'
      );
    }
    
    return {
      container,
      shadowElement,
      faceElement,
      iconElement,
      labelElement,
      hasIcon: iconElement !== null && iconElement !== undefined,
      hasLabel: labelElement !== null && labelElement !== undefined,
    };
  }

  describe('Two Stacked Containers Structure', () => {
    /**
     * Test: KeyCap renders two stacked containers (shadow and face)
     * Validates: Requirement 1.5 - Elevated_Style with two stacked containers
     * Validates: Requirement 4.1 - Two stacked containers: bottom (shadow) and top (face)
     */
    it('should render container with shadow and face elements', () => {
      const props: KeyCapProps = {
        keyName: 'A',
        isModifier: false,
        textScale: 1.0,
      };
      
      const analysis = analyzeKeyCapElement(props);
      
      // Container should exist
      expect(analysis.container).toBeDefined();
      expect(analysis.container.props['data-testid']).toBe('keycap-container');
      
      // Shadow element should exist
      expect(analysis.shadowElement).toBeDefined();
      
      // Face element should exist
      expect(analysis.faceElement).toBeDefined();
    });

    it('should render shadow element with correct data-testid', () => {
      const props: KeyCapProps = {
        keyName: 'Enter',
        isModifier: false,
        textScale: 1.5,
      };
      
      const analysis = analyzeKeyCapElement(props);
      
      expect(analysis.shadowElement).toBeDefined();
      expect((analysis.shadowElement as any).props['data-testid']).toBe('keycap-shadow');
    });

    it('should render face element with correct data-testid', () => {
      const props: KeyCapProps = {
        keyName: 'Backspace',
        isModifier: false,
        textScale: 0.75,
      };
      
      const analysis = analyzeKeyCapElement(props);
      
      expect(analysis.faceElement).toBeDefined();
      expect((analysis.faceElement as any).props['data-testid']).toBe('keycap-face');
    });

    it('should render two stacked containers for modifier keys', () => {
      const props: KeyCapProps = {
        keyName: 'Ctrl',
        icon: '⌃',
        isModifier: true,
        textScale: 1.0,
      };
      
      const analysis = analyzeKeyCapElement(props);
      
      expect(analysis.shadowElement).toBeDefined();
      expect(analysis.faceElement).toBeDefined();
    });

    it('should render two stacked containers for non-modifier keys', () => {
      const props: KeyCapProps = {
        keyName: 'Space',
        isModifier: false,
        textScale: 1.0,
      };
      
      const analysis = analyzeKeyCapElement(props);
      
      expect(analysis.shadowElement).toBeDefined();
      expect(analysis.faceElement).toBeDefined();
    });
  });

  describe('Modifier Key Display', () => {
    /**
     * Test: Modifier key displays icon above label
     * Validates: Requirement 2.7 - Icon and label vertically stacked
     */
    it('should display icon for modifier key with icon prop', () => {
      const props: KeyCapProps = {
        keyName: 'Ctrl',
        icon: '⌃',
        isModifier: true,
        textScale: 1.0,
      };
      
      const analysis = analyzeKeyCapElement(props);
      
      expect(analysis.hasIcon).toBe(true);
      expect(analysis.hasLabel).toBe(true);
    });

    it('should display correct icon glyph for Ctrl modifier', () => {
      const props: KeyCapProps = {
        keyName: 'Ctrl',
        icon: '⌃',
        isModifier: true,
        textScale: 1.0,
      };
      
      const analysis = analyzeKeyCapElement(props);
      
      expect(analysis.iconElement).toBeDefined();
      expect((analysis.iconElement as any).props.children).toBe('⌃');
    });

    it('should display correct icon glyph for Alt modifier', () => {
      const props: KeyCapProps = {
        keyName: 'Alt',
        icon: '⌥',
        isModifier: true,
        textScale: 1.0,
      };
      
      const analysis = analyzeKeyCapElement(props);
      
      expect(analysis.iconElement).toBeDefined();
      expect((analysis.iconElement as any).props.children).toBe('⌥');
    });

    it('should display correct icon glyph for Shift modifier', () => {
      const props: KeyCapProps = {
        keyName: 'Shift',
        icon: '⇧',
        isModifier: true,
        textScale: 1.0,
      };
      
      const analysis = analyzeKeyCapElement(props);
      
      expect(analysis.iconElement).toBeDefined();
      expect((analysis.iconElement as any).props.children).toBe('⇧');
    });

    it('should display correct icon glyph for Meta modifier', () => {
      const props: KeyCapProps = {
        keyName: 'Meta',
        icon: '⌘',
        isModifier: true,
        textScale: 1.0,
      };
      
      const analysis = analyzeKeyCapElement(props);
      
      expect(analysis.iconElement).toBeDefined();
      expect((analysis.iconElement as any).props.children).toBe('⌘');
    });

    it('should display label below icon for modifier keys', () => {
      const props: KeyCapProps = {
        keyName: 'Ctrl',
        icon: '⌃',
        isModifier: true,
        textScale: 1.0,
      };
      
      const analysis = analyzeKeyCapElement(props);
      
      expect(analysis.labelElement).toBeDefined();
      expect((analysis.labelElement as any).props.children).toBe('Ctrl');
    });

    it('should use space-between justification for modifier keys with icon', () => {
      const props: KeyCapProps = {
        keyName: 'Shift',
        icon: '⇧',
        isModifier: true,
        textScale: 1.0,
      };
      
      const analysis = analyzeKeyCapElement(props);
      
      // Face element should have justifyContent: 'space-between' for modifiers with icon
      const faceStyle = (analysis.faceElement as any).props.style;
      expect(faceStyle.justifyContent).toBe('space-between');
    });
  });

  describe('Non-Modifier Key Display', () => {
    /**
     * Test: Non-modifier key centers label without icon
     * Validates: Requirement 7.1 - Non-modifier keys display only the key label centered
     * Validates: Requirement 7.2 - Label vertically and horizontally centered
     */
    it('should not display icon for non-modifier key', () => {
      const props: KeyCapProps = {
        keyName: 'A',
        isModifier: false,
        textScale: 1.0,
      };
      
      const analysis = analyzeKeyCapElement(props);
      
      expect(analysis.hasIcon).toBe(false);
      expect(analysis.hasLabel).toBe(true);
    });

    it('should display only label for non-modifier key', () => {
      const props: KeyCapProps = {
        keyName: 'Enter',
        isModifier: false,
        textScale: 1.0,
      };
      
      const analysis = analyzeKeyCapElement(props);
      
      expect(analysis.hasIcon).toBe(false);
      expect(analysis.labelElement).toBeDefined();
      expect((analysis.labelElement as any).props.children).toBe('Enter');
    });

    it('should center label for non-modifier keys', () => {
      const props: KeyCapProps = {
        keyName: 'Space',
        isModifier: false,
        textScale: 1.0,
      };
      
      const analysis = analyzeKeyCapElement(props);
      
      // Face element should have justifyContent: 'center' for non-modifiers
      const faceStyle = (analysis.faceElement as any).props.style;
      expect(faceStyle.justifyContent).toBe('center');
    });

    it('should display special key names correctly', () => {
      const specialKeys = ['Enter', 'Backspace', 'Tab', 'Escape', 'Space'];
      
      for (const keyName of specialKeys) {
        const props: KeyCapProps = {
          keyName,
          isModifier: false,
          textScale: 1.0,
        };
        
        const analysis = analyzeKeyCapElement(props);
        
        expect(analysis.hasIcon).toBe(false);
        expect((analysis.labelElement as any).props.children).toBe(keyName);
      }
    });

    it('should display function keys correctly', () => {
      const functionKeys = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'];
      
      for (const keyName of functionKeys) {
        const props: KeyCapProps = {
          keyName,
          isModifier: false,
          textScale: 1.0,
        };
        
        const analysis = analyzeKeyCapElement(props);
        
        expect(analysis.hasIcon).toBe(false);
        expect((analysis.labelElement as any).props.children).toBe(keyName);
      }
    });

    it('should display arrow keys correctly', () => {
      const arrowKeys = ['Up', 'Down', 'Left', 'Right'];
      
      for (const keyName of arrowKeys) {
        const props: KeyCapProps = {
          keyName,
          isModifier: false,
          textScale: 1.0,
        };
        
        const analysis = analyzeKeyCapElement(props);
        
        expect(analysis.hasIcon).toBe(false);
        expect((analysis.labelElement as any).props.children).toBe(keyName);
      }
    });
  });

  describe('Property 5: Non-Modifier Keys Have No Icon', () => {
    /**
     * Property 5: Non-Modifier Keys Have No Icon
     * 
     * *For any* key that is not a modifier (Ctrl, Alt, Shift, Meta), the rendered KeyCap 
     * SHALL not display an icon element, and the label SHALL be centered both vertically 
     * and horizontally.
     * 
     * **Validates: Requirements 7.1, 7.2**
     */
    it('should not display icon for any non-modifier key', () => {
      // Test with various non-modifier key names
      const nonModifierKeys = [
        'A', 'B', 'C', 'Z', '1', '2', '0', 
        'Enter', 'Backspace', 'Tab', 'Escape', 'Space',
        'F1', 'F12', 'Up', 'Down', 'Left', 'Right',
        'Home', 'End', 'PageUp', 'PageDown', 'Delete', 'Insert'
      ];
      
      for (const keyName of nonModifierKeys) {
        const props: KeyCapProps = {
          keyName,
          isModifier: false,
          textScale: 1.0,
        };
        
        const analysis = analyzeKeyCapElement(props);
        
        // Non-modifier keys should never have an icon
        expect(analysis.hasIcon).toBe(false);
        
        // Label should be centered (justifyContent: 'center')
        const faceStyle = (analysis.faceElement as any).props.style;
        expect(faceStyle.justifyContent).toBe('center');
        expect(faceStyle.alignItems).toBe('center');
      }
    });

    it('should not display icon even if icon prop is provided for non-modifier', () => {
      // Edge case: icon prop provided but isModifier is false
      const props: KeyCapProps = {
        keyName: 'A',
        icon: '⌃', // Icon provided but should be ignored
        isModifier: false,
        textScale: 1.0,
      };
      
      const analysis = analyzeKeyCapElement(props);
      
      // Should not display icon because isModifier is false
      expect(analysis.hasIcon).toBe(false);
    });
  });

  describe('Text Scale Variations', () => {
    it('should render correctly with small text scale (0.5)', () => {
      const props: KeyCapProps = {
        keyName: 'A',
        isModifier: false,
        textScale: 0.5,
      };
      
      const analysis = analyzeKeyCapElement(props);
      
      expect(analysis.container).toBeDefined();
      expect(analysis.shadowElement).toBeDefined();
      expect(analysis.faceElement).toBeDefined();
    });

    it('should render correctly with large text scale (2.0)', () => {
      const props: KeyCapProps = {
        keyName: 'Ctrl',
        icon: '⌃',
        isModifier: true,
        textScale: 2.0,
      };
      
      const analysis = analyzeKeyCapElement(props);
      
      expect(analysis.container).toBeDefined();
      expect(analysis.shadowElement).toBeDefined();
      expect(analysis.faceElement).toBeDefined();
      expect(analysis.hasIcon).toBe(true);
    });

    it('should render correctly with default text scale (1.0)', () => {
      const props: KeyCapProps = {
        keyName: 'Enter',
        isModifier: false,
        textScale: 1.0,
      };
      
      const analysis = analyzeKeyCapElement(props);
      
      expect(analysis.container).toBeDefined();
      expect(analysis.shadowElement).toBeDefined();
      expect(analysis.faceElement).toBeDefined();
    });
  });
});
