// src/components/keystroke-overlay/KeyCapGroup.test.ts

import { describe, it, expect } from 'vitest';
import React from 'react';
import { KeyCapGroup, type KeyCapGroupProps } from './KeyCapGroup';
import type { ParsedKey } from '../../utils/keyNameMapping';

/**
 * Unit Tests for KeyCapGroup Component
 * 
 * These tests verify the KeyCapGroup component's rendering logic by examining
 * the React element structure returned by the component.
 * 
 * **Validates: Requirements 3.1, 3.2**
 * 
 * Test coverage:
 * - Test renders correct number of KeyCap children
 * - Test horizontal layout with gap
 */

/**
 * Base font size for calculations (in pixels)
 * Must match the value in KeyCapGroup.tsx for consistent testing
 */
const BASE_FONT_SIZE = 16;

/**
 * Gap ratio between keycaps relative to base font size
 * Reference: keyviz/lib/windows/key_visualizer/widgets/keycap_group.dart lines 50-80
 * 
 * Requirements: 3.2
 */
const GAP_RATIO = 0.5;

/**
 * Helper function to analyze the React element structure returned by KeyCapGroup
 * This allows us to test the component's rendering logic without a DOM environment
 */
function analyzeKeyCapGroupElement(props: KeyCapGroupProps) {
  const element = KeyCapGroup(props);
  
  // The element should be a div (container)
  const container = element;
  const children = React.Children.toArray(container.props.children);
  
  // Get container style
  const containerStyle = container.props.style as React.CSSProperties;
  
  // Count KeyCap children (they should have data-testid="keycap-container")
  const keycapChildren = children.filter(
    (child: any) => child?.type?.name === 'KeyCap' || child?.props?.['data-testid'] === 'keycap-container'
  );
  
  return {
    container,
    containerStyle,
    children,
    keycapCount: children.length,
    keycapChildren,
    testId: container.props['data-testid'],
  };
}

describe('KeyCapGroup Component Unit Tests', () => {
  describe('Renders Correct Number of KeyCap Children', () => {
    /**
     * Test: KeyCapGroup renders correct number of KeyCap children
     * Validates: Requirement 3.1 - Arrange KeyCap elements horizontally in a flex row
     */
    it('should render one KeyCap for a single key', () => {
      const keys: ParsedKey[] = [
        { name: 'A', isModifier: false },
      ];
      
      const props: KeyCapGroupProps = {
        keys,
        textScale: 1.0,
      };
      
      const analysis = analyzeKeyCapGroupElement(props);
      
      expect(analysis.keycapCount).toBe(1);
    });

    it('should render two KeyCaps for a modifier + key combination', () => {
      const keys: ParsedKey[] = [
        { name: 'Ctrl', icon: '⌃', isModifier: true },
        { name: 'C', isModifier: false },
      ];
      
      const props: KeyCapGroupProps = {
        keys,
        textScale: 1.0,
      };
      
      const analysis = analyzeKeyCapGroupElement(props);
      
      expect(analysis.keycapCount).toBe(2);
    });

    it('should render three KeyCaps for two modifiers + key', () => {
      const keys: ParsedKey[] = [
        { name: 'Ctrl', icon: '⌃', isModifier: true },
        { name: 'Shift', icon: '⇧', isModifier: true },
        { name: 'S', isModifier: false },
      ];
      
      const props: KeyCapGroupProps = {
        keys,
        textScale: 1.0,
      };
      
      const analysis = analyzeKeyCapGroupElement(props);
      
      expect(analysis.keycapCount).toBe(3);
    });

    it('should render four KeyCaps for three modifiers + key', () => {
      const keys: ParsedKey[] = [
        { name: 'Ctrl', icon: '⌃', isModifier: true },
        { name: 'Alt', icon: '⌥', isModifier: true },
        { name: 'Shift', icon: '⇧', isModifier: true },
        { name: 'Delete', isModifier: false },
      ];
      
      const props: KeyCapGroupProps = {
        keys,
        textScale: 1.0,
      };
      
      const analysis = analyzeKeyCapGroupElement(props);
      
      expect(analysis.keycapCount).toBe(4);
    });

    it('should render five KeyCaps for all four modifiers + key', () => {
      const keys: ParsedKey[] = [
        { name: 'Ctrl', icon: '⌃', isModifier: true },
        { name: 'Alt', icon: '⌥', isModifier: true },
        { name: 'Shift', icon: '⇧', isModifier: true },
        { name: 'Meta', icon: '⌘', isModifier: true },
        { name: 'A', isModifier: false },
      ];
      
      const props: KeyCapGroupProps = {
        keys,
        textScale: 1.0,
      };
      
      const analysis = analyzeKeyCapGroupElement(props);
      
      expect(analysis.keycapCount).toBe(5);
    });

    it('should render zero KeyCaps for empty keys array', () => {
      const keys: ParsedKey[] = [];
      
      const props: KeyCapGroupProps = {
        keys,
        textScale: 1.0,
      };
      
      const analysis = analyzeKeyCapGroupElement(props);
      
      expect(analysis.keycapCount).toBe(0);
    });

    it('should render single KeyCap for modifier-only press', () => {
      const keys: ParsedKey[] = [
        { name: 'Ctrl', icon: '⌃', isModifier: true },
      ];
      
      const props: KeyCapGroupProps = {
        keys,
        textScale: 1.0,
      };
      
      const analysis = analyzeKeyCapGroupElement(props);
      
      expect(analysis.keycapCount).toBe(1);
    });
  });

  describe('Horizontal Layout with Gap', () => {
    /**
     * Test: KeyCapGroup uses horizontal flex layout
     * Validates: Requirement 3.1 - Arrange KeyCap elements horizontally in a flex row
     */
    it('should use flex display for horizontal layout', () => {
      const keys: ParsedKey[] = [
        { name: 'Ctrl', icon: '⌃', isModifier: true },
        { name: 'C', isModifier: false },
      ];
      
      const props: KeyCapGroupProps = {
        keys,
        textScale: 1.0,
      };
      
      const analysis = analyzeKeyCapGroupElement(props);
      
      expect(analysis.containerStyle.display).toBe('flex');
    });

    it('should use row flex direction', () => {
      const keys: ParsedKey[] = [
        { name: 'A', isModifier: false },
        { name: 'B', isModifier: false },
      ];
      
      const props: KeyCapGroupProps = {
        keys,
        textScale: 1.0,
      };
      
      const analysis = analyzeKeyCapGroupElement(props);
      
      expect(analysis.containerStyle.flexDirection).toBe('row');
    });

    /**
     * Test: KeyCapGroup maintains correct gap between keycaps
     * Validates: Requirement 3.2 - Gap equal to 50% of base font size between adjacent KeyCap elements
     */
    it('should have correct gap for textScale 1.0', () => {
      const keys: ParsedKey[] = [
        { name: 'Ctrl', icon: '⌃', isModifier: true },
        { name: 'V', isModifier: false },
      ];
      
      const props: KeyCapGroupProps = {
        keys,
        textScale: 1.0,
      };
      
      const analysis = analyzeKeyCapGroupElement(props);
      const expectedGap = BASE_FONT_SIZE * GAP_RATIO * 1.0; // 16 * 0.5 * 1.0 = 8
      
      expect(analysis.containerStyle.gap).toBe(expectedGap);
    });

    it('should scale gap with textScale 2.0', () => {
      const keys: ParsedKey[] = [
        { name: 'Shift', icon: '⇧', isModifier: true },
        { name: 'Enter', isModifier: false },
      ];
      
      const props: KeyCapGroupProps = {
        keys,
        textScale: 2.0,
      };
      
      const analysis = analyzeKeyCapGroupElement(props);
      const expectedGap = BASE_FONT_SIZE * GAP_RATIO * 2.0; // 16 * 0.5 * 2.0 = 16
      
      expect(analysis.containerStyle.gap).toBe(expectedGap);
    });

    it('should scale gap with textScale 0.5', () => {
      const keys: ParsedKey[] = [
        { name: 'Alt', icon: '⌥', isModifier: true },
        { name: 'Tab', isModifier: false },
      ];
      
      const props: KeyCapGroupProps = {
        keys,
        textScale: 0.5,
      };
      
      const analysis = analyzeKeyCapGroupElement(props);
      const expectedGap = BASE_FONT_SIZE * GAP_RATIO * 0.5; // 16 * 0.5 * 0.5 = 4
      
      expect(analysis.containerStyle.gap).toBe(expectedGap);
    });

    it('should scale gap with textScale 1.5', () => {
      const keys: ParsedKey[] = [
        { name: 'Meta', icon: '⌘', isModifier: true },
        { name: 'Space', isModifier: false },
      ];
      
      const props: KeyCapGroupProps = {
        keys,
        textScale: 1.5,
      };
      
      const analysis = analyzeKeyCapGroupElement(props);
      const expectedGap = BASE_FONT_SIZE * GAP_RATIO * 1.5; // 16 * 0.5 * 1.5 = 12
      
      expect(analysis.containerStyle.gap).toBe(expectedGap);
    });

    /**
     * Test: KeyCapGroup centers content
     * Validates: Requirement 3.3 - Center the row of KeyCap elements within the overlay container
     */
    it('should center items vertically with alignItems', () => {
      const keys: ParsedKey[] = [
        { name: 'Ctrl', icon: '⌃', isModifier: true },
        { name: 'Z', isModifier: false },
      ];
      
      const props: KeyCapGroupProps = {
        keys,
        textScale: 1.0,
      };
      
      const analysis = analyzeKeyCapGroupElement(props);
      
      expect(analysis.containerStyle.alignItems).toBe('center');
    });

    it('should center items horizontally with justifyContent', () => {
      const keys: ParsedKey[] = [
        { name: 'Alt', icon: '⌥', isModifier: true },
        { name: 'F4', isModifier: false },
      ];
      
      const props: KeyCapGroupProps = {
        keys,
        textScale: 1.0,
      };
      
      const analysis = analyzeKeyCapGroupElement(props);
      
      expect(analysis.containerStyle.justifyContent).toBe('center');
    });
  });

  describe('Container Structure', () => {
    /**
     * Test: KeyCapGroup has correct data-testid
     */
    it('should have data-testid="keycap-group"', () => {
      const keys: ParsedKey[] = [
        { name: 'A', isModifier: false },
      ];
      
      const props: KeyCapGroupProps = {
        keys,
        textScale: 1.0,
      };
      
      const analysis = analyzeKeyCapGroupElement(props);
      
      expect(analysis.testId).toBe('keycap-group');
    });

    it('should render container even with empty keys', () => {
      const keys: ParsedKey[] = [];
      
      const props: KeyCapGroupProps = {
        keys,
        textScale: 1.0,
      };
      
      const analysis = analyzeKeyCapGroupElement(props);
      
      expect(analysis.container).toBeDefined();
      expect(analysis.testId).toBe('keycap-group');
    });
  });

  describe('Key Order Preservation', () => {
    /**
     * Test: KeyCapGroup preserves the order of keys
     * Validates: Requirement 5.3 - Display modifiers in consistent order: Ctrl, Alt, Shift, Meta, then main key
     */
    it('should render keys in the order provided', () => {
      const keys: ParsedKey[] = [
        { name: 'Ctrl', icon: '⌃', isModifier: true },
        { name: 'Alt', icon: '⌥', isModifier: true },
        { name: 'Shift', icon: '⇧', isModifier: true },
        { name: 'Meta', icon: '⌘', isModifier: true },
        { name: 'Delete', isModifier: false },
      ];
      
      const props: KeyCapGroupProps = {
        keys,
        textScale: 1.0,
      };
      
      const analysis = analyzeKeyCapGroupElement(props);
      
      // Verify the children are rendered in order by checking their keys
      // React adds a prefix to keys, so we check that the key contains the expected pattern
      analysis.children.forEach((child: any, index: number) => {
        const expectedKeyPattern = `${keys[index].name}-${index}`;
        expect(child.key).toContain(expectedKeyPattern);
      });
    });

    it('should pass correct props to each KeyCap child', () => {
      const keys: ParsedKey[] = [
        { name: 'Ctrl', icon: '⌃', isModifier: true },
        { name: 'C', isModifier: false },
      ];
      
      const props: KeyCapGroupProps = {
        keys,
        textScale: 1.25,
      };
      
      const analysis = analyzeKeyCapGroupElement(props);
      
      // First child should be Ctrl modifier
      const firstChild = analysis.children[0] as any;
      expect(firstChild.props.keyName).toBe('Ctrl');
      expect(firstChild.props.icon).toBe('⌃');
      expect(firstChild.props.isModifier).toBe(true);
      expect(firstChild.props.textScale).toBe(1.25);
      
      // Second child should be C key
      const secondChild = analysis.children[1] as any;
      expect(secondChild.props.keyName).toBe('C');
      expect(secondChild.props.icon).toBeUndefined();
      expect(secondChild.props.isModifier).toBe(false);
      expect(secondChild.props.textScale).toBe(1.25);
    });
  });

  describe('Various Key Combinations', () => {
    /**
     * Test various real-world key combinations
     */
    it('should render Ctrl+C correctly', () => {
      const keys: ParsedKey[] = [
        { name: 'Ctrl', icon: '⌃', isModifier: true },
        { name: 'C', isModifier: false },
      ];
      
      const props: KeyCapGroupProps = {
        keys,
        textScale: 1.0,
      };
      
      const analysis = analyzeKeyCapGroupElement(props);
      
      expect(analysis.keycapCount).toBe(2);
      expect(analysis.containerStyle.display).toBe('flex');
      expect(analysis.containerStyle.flexDirection).toBe('row');
    });

    it('should render Ctrl+Shift+Escape correctly', () => {
      const keys: ParsedKey[] = [
        { name: 'Ctrl', icon: '⌃', isModifier: true },
        { name: 'Shift', icon: '⇧', isModifier: true },
        { name: 'Escape', isModifier: false },
      ];
      
      const props: KeyCapGroupProps = {
        keys,
        textScale: 1.0,
      };
      
      const analysis = analyzeKeyCapGroupElement(props);
      
      expect(analysis.keycapCount).toBe(3);
    });

    it('should render Alt+Tab correctly', () => {
      const keys: ParsedKey[] = [
        { name: 'Alt', icon: '⌥', isModifier: true },
        { name: 'Tab', isModifier: false },
      ];
      
      const props: KeyCapGroupProps = {
        keys,
        textScale: 1.0,
      };
      
      const analysis = analyzeKeyCapGroupElement(props);
      
      expect(analysis.keycapCount).toBe(2);
    });

    it('should render Meta+Space correctly', () => {
      const keys: ParsedKey[] = [
        { name: 'Meta', icon: '⌘', isModifier: true },
        { name: 'Space', isModifier: false },
      ];
      
      const props: KeyCapGroupProps = {
        keys,
        textScale: 1.0,
      };
      
      const analysis = analyzeKeyCapGroupElement(props);
      
      expect(analysis.keycapCount).toBe(2);
    });

    it('should render function key F12 correctly', () => {
      const keys: ParsedKey[] = [
        { name: 'F12', isModifier: false },
      ];
      
      const props: KeyCapGroupProps = {
        keys,
        textScale: 1.0,
      };
      
      const analysis = analyzeKeyCapGroupElement(props);
      
      expect(analysis.keycapCount).toBe(1);
    });

    it('should render arrow key correctly', () => {
      const keys: ParsedKey[] = [
        { name: 'Up', isModifier: false },
      ];
      
      const props: KeyCapGroupProps = {
        keys,
        textScale: 1.0,
      };
      
      const analysis = analyzeKeyCapGroupElement(props);
      
      expect(analysis.keycapCount).toBe(1);
    });
  });
});
