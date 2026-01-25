import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { KeystrokeEvent, MouseActionEvent } from '../types/keystrokeEvents';
import {
  getKeyDisplayName,
  formatKeystroke,
  formatMouseAction,
  formatModifiers,
  isModifierKeyCode,
  MODIFIER_ICONS,
  getModifierIcon,
  isModifierKey,
  parseKeystrokeToKeys,
} from './keyNameMapping';

/**
 * Property 3: Keystroke Formatting with Modifier Order
 * 
 * *For any* keystroke event with any combination of modifiers (ctrl, alt, shift, meta),
 * the formatted output SHALL display modifiers in the order Ctrl → Alt → Shift → Meta → Key,
 * with only the active modifiers shown, separated by " + ".
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.5**
 * 
 * Feature: visual-keystrokes-and-mouse-actions, Property 3: Keystroke Formatting with Modifier Order
 */
describe('Key Name Mapping', () => {
  describe('Property 3: Keystroke Formatting with Modifier Order', () => {
    // Arbitrary for modifier combinations
    const modifiersArbitrary = fc.record({
      ctrl: fc.boolean(),
      alt: fc.boolean(),
      shift: fc.boolean(),
      meta: fc.boolean(),
    });

    // Known key codes for testing (non-modifier keys)
    const knownKeyCodes = [
      0x001E, // A
      0x0030, // B
      0x002E, // C
      0x001C, // Enter
      0x000E, // Backspace
      0x0039, // Space
      0x003B, // F1
      0x0044, // F10
    ];

    const keyCodeArbitrary = fc.constantFrom(...knownKeyCodes);

    // Arbitrary for KeystrokeEvent
    const keystrokeEventArbitrary: fc.Arbitrary<KeystrokeEvent> = fc.record({
      type: fc.constant('keystroke' as const),
      timestamp: fc.integer({ min: 0 }),
      key: fc.string(),
      keyCode: keyCodeArbitrary,
      modifiers: modifiersArbitrary,
    });

    it('should format modifiers in order: Ctrl + Alt + Shift + Meta', () => {
      fc.assert(
        fc.property(
          keystrokeEventArbitrary,
          (event: KeystrokeEvent) => {
            const formatted = formatKeystroke(event);
            
            // Extract modifier positions if they exist
            const ctrlPos = formatted.indexOf('Ctrl');
            const altPos = formatted.indexOf('Alt');
            const shiftPos = formatted.indexOf('Shift');
            const metaPos = formatted.indexOf('Meta');
            
            // If multiple modifiers present, verify order
            if (ctrlPos !== -1 && altPos !== -1) {
              expect(ctrlPos).toBeLessThan(altPos);
            }
            if (altPos !== -1 && shiftPos !== -1) {
              expect(altPos).toBeLessThan(shiftPos);
            }
            if (shiftPos !== -1 && metaPos !== -1) {
              expect(shiftPos).toBeLessThan(metaPos);
            }
            if (ctrlPos !== -1 && shiftPos !== -1) {
              expect(ctrlPos).toBeLessThan(shiftPos);
            }
            if (ctrlPos !== -1 && metaPos !== -1) {
              expect(ctrlPos).toBeLessThan(metaPos);
            }
            if (altPos !== -1 && metaPos !== -1) {
              expect(altPos).toBeLessThan(metaPos);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include only active modifiers in output', () => {
      fc.assert(
        fc.property(
          keystrokeEventArbitrary,
          (event: KeystrokeEvent) => {
            const formatted = formatKeystroke(event);
            
            // Check each modifier appears only if active
            if (event.modifiers.ctrl) {
              expect(formatted).toContain('Ctrl');
            } else {
              // Ctrl should not appear unless it's the key itself
              if (!isModifierKeyCode(event.keyCode)) {
                expect(formatted.includes('Ctrl + ')).toBe(false);
              }
            }
            
            if (event.modifiers.alt) {
              expect(formatted).toContain('Alt');
            } else {
              if (!isModifierKeyCode(event.keyCode)) {
                expect(formatted.includes('Alt + ')).toBe(false);
              }
            }
            
            if (event.modifiers.shift) {
              expect(formatted).toContain('Shift');
            } else {
              if (!isModifierKeyCode(event.keyCode)) {
                expect(formatted.includes('Shift + ')).toBe(false);
              }
            }
            
            if (event.modifiers.meta) {
              expect(formatted).toContain('Meta');
            } else {
              if (!isModifierKeyCode(event.keyCode)) {
                expect(formatted.includes('Meta + ')).toBe(false);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should separate modifiers and key with " + "', () => {
      fc.assert(
        fc.property(
          keystrokeEventArbitrary,
          (event: KeystrokeEvent) => {
            const formatted = formatKeystroke(event);
            const hasModifiers = event.modifiers.ctrl || event.modifiers.alt || 
                                 event.modifiers.shift || event.modifiers.meta;
            
            if (hasModifiers && !isModifierKeyCode(event.keyCode)) {
              // Should contain " + " separator
              expect(formatted).toContain(' + ');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always produce non-empty output', () => {
      fc.assert(
        fc.property(
          keystrokeEventArbitrary,
          (event: KeystrokeEvent) => {
            const formatted = formatKeystroke(event);
            expect(formatted.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('getKeyDisplayName', () => {
    it('should return readable names for special keys', () => {
      expect(getKeyDisplayName(0x001C)).toBe('Enter');
      expect(getKeyDisplayName(0x000E)).toBe('Backspace');
      expect(getKeyDisplayName(0x000F)).toBe('Tab');
      expect(getKeyDisplayName(0x0039)).toBe('Space');
      expect(getKeyDisplayName(0x0001)).toBe('Escape');
    });

    it('should return F1-F12 for function keys', () => {
      expect(getKeyDisplayName(0x003B)).toBe('F1');
      expect(getKeyDisplayName(0x003C)).toBe('F2');
      expect(getKeyDisplayName(0x003D)).toBe('F3');
      expect(getKeyDisplayName(0x003E)).toBe('F4');
      expect(getKeyDisplayName(0x003F)).toBe('F5');
      expect(getKeyDisplayName(0x0040)).toBe('F6');
      expect(getKeyDisplayName(0x0041)).toBe('F7');
      expect(getKeyDisplayName(0x0042)).toBe('F8');
      expect(getKeyDisplayName(0x0043)).toBe('F9');
      expect(getKeyDisplayName(0x0044)).toBe('F10');
      expect(getKeyDisplayName(0x0057)).toBe('F11');
      expect(getKeyDisplayName(0x0058)).toBe('F12');
    });

    it('should return letter names for A-Z keys', () => {
      expect(getKeyDisplayName(0x001E)).toBe('A');
      expect(getKeyDisplayName(0x0030)).toBe('B');
      expect(getKeyDisplayName(0x002E)).toBe('C');
      expect(getKeyDisplayName(0x002C)).toBe('Z');
    });

    it('should return hex code for unknown keys', () => {
      const unknownCode = 0xFFFF;
      const result = getKeyDisplayName(unknownCode);
      expect(result).toMatch(/^Key\(0x[0-9A-F]+\)$/);
    });
  });

  describe('formatModifiers', () => {
    it('should return empty string when no modifiers active', () => {
      const result = formatModifiers({
        ctrl: false,
        alt: false,
        shift: false,
        meta: false,
      });
      expect(result).toBe('');
    });

    it('should format single modifier correctly', () => {
      expect(formatModifiers({ ctrl: true, alt: false, shift: false, meta: false }))
        .toBe('Ctrl + ');
      expect(formatModifiers({ ctrl: false, alt: true, shift: false, meta: false }))
        .toBe('Alt + ');
      expect(formatModifiers({ ctrl: false, alt: false, shift: true, meta: false }))
        .toBe('Shift + ');
      expect(formatModifiers({ ctrl: false, alt: false, shift: false, meta: true }))
        .toBe('Meta + ');
    });

    it('should format all modifiers in correct order', () => {
      const result = formatModifiers({
        ctrl: true,
        alt: true,
        shift: true,
        meta: true,
      });
      expect(result).toBe('Ctrl + Alt + Shift + Meta + ');
    });
  });

  /**
   * Unit tests for MODIFIER_ICONS constant
   * 
   * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
   */
  describe('MODIFIER_ICONS', () => {
    it('should have correct glyph for Ctrl', () => {
      expect(MODIFIER_ICONS.Ctrl).toBe('⌃');
    });

    it('should have correct glyph for Alt', () => {
      expect(MODIFIER_ICONS.Alt).toBe('⌥');
    });

    it('should have correct glyph for Shift', () => {
      expect(MODIFIER_ICONS.Shift).toBe('⇧');
    });

    it('should have correct glyph for Meta', () => {
      expect(MODIFIER_ICONS.Meta).toBe('⌘');
    });

    it('should have exactly 4 modifier icons', () => {
      expect(Object.keys(MODIFIER_ICONS)).toHaveLength(4);
    });
  });

  /**
   * Unit tests for getModifierIcon function
   * 
   * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
   */
  describe('getModifierIcon', () => {
    it('should return ⌃ for Ctrl', () => {
      expect(getModifierIcon('Ctrl')).toBe('⌃');
    });

    it('should return ⌥ for Alt', () => {
      expect(getModifierIcon('Alt')).toBe('⌥');
    });

    it('should return ⇧ for Shift', () => {
      expect(getModifierIcon('Shift')).toBe('⇧');
    });

    it('should return ⌘ for Meta', () => {
      expect(getModifierIcon('Meta')).toBe('⌘');
    });

    it('should return undefined for non-modifier keys', () => {
      expect(getModifierIcon('A')).toBeUndefined();
      expect(getModifierIcon('Enter')).toBeUndefined();
      expect(getModifierIcon('Space')).toBeUndefined();
      expect(getModifierIcon('F1')).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(getModifierIcon('')).toBeUndefined();
    });

    it('should be case-sensitive', () => {
      expect(getModifierIcon('ctrl')).toBeUndefined();
      expect(getModifierIcon('CTRL')).toBeUndefined();
      expect(getModifierIcon('alt')).toBeUndefined();
      expect(getModifierIcon('shift')).toBeUndefined();
      expect(getModifierIcon('meta')).toBeUndefined();
    });
  });

  /**
   * Unit tests for isModifierKey function
   * 
   * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
   */
  describe('isModifierKey', () => {
    it('should return true for Ctrl', () => {
      expect(isModifierKey('Ctrl')).toBe(true);
    });

    it('should return true for Alt', () => {
      expect(isModifierKey('Alt')).toBe(true);
    });

    it('should return true for Shift', () => {
      expect(isModifierKey('Shift')).toBe(true);
    });

    it('should return true for Meta', () => {
      expect(isModifierKey('Meta')).toBe(true);
    });

    it('should return false for non-modifier keys', () => {
      expect(isModifierKey('A')).toBe(false);
      expect(isModifierKey('Enter')).toBe(false);
      expect(isModifierKey('Space')).toBe(false);
      expect(isModifierKey('F1')).toBe(false);
      expect(isModifierKey('Backspace')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isModifierKey('')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(isModifierKey('ctrl')).toBe(false);
      expect(isModifierKey('CTRL')).toBe(false);
      expect(isModifierKey('alt')).toBe(false);
      expect(isModifierKey('shift')).toBe(false);
      expect(isModifierKey('meta')).toBe(false);
    });
  });
});


/**
 * Property 4: Modifier Icon Mapping
 * 
 * *For any* modifier key name in {Ctrl, Alt, Shift, Meta}, `getModifierIcon` SHALL return
 * the corresponding Unicode glyph:
 * - Ctrl → ⌃
 * - Alt → ⌥
 * - Shift → ⇧
 * - Meta → ⌘
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
 * 
 * Feature: keyviz-style-keystroke-overlay, Property 4: Modifier Icon Mapping
 */
describe('Property 4: Modifier Icon Mapping', () => {
  // Define the expected modifier to icon mapping
  const expectedModifierIcons: Record<string, string> = {
    Ctrl: '⌃',
    Alt: '⌥',
    Shift: '⇧',
    Meta: '⌘',
  };

  // Arbitrary for modifier key names
  const modifierKeyNameArbitrary = fc.constantFrom('Ctrl', 'Alt', 'Shift', 'Meta');

  // Arbitrary for non-modifier key names (various key types)
  const nonModifierKeyNameArbitrary = fc.oneof(
    // Letter keys
    fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
                    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'),
    // Number keys
    fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'),
    // Function keys
    fc.constantFrom('F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'),
    // Special keys
    fc.constantFrom('Enter', 'Backspace', 'Tab', 'Space', 'Escape', 'Delete', 'Insert',
                    'Home', 'End', 'Page Up', 'Page Down', 'Caps Lock', 'Num Lock'),
    // Arrow keys
    fc.constantFrom('Up', 'Down', 'Left', 'Right'),
    // Symbol keys
    fc.constantFrom('`', '-', '=', '[', ']', '\\', ';', "'", ',', '.', '/'),
    // Random strings that are definitely not modifiers
    fc.string({ minLength: 1, maxLength: 20 }).filter(s => 
      !['Ctrl', 'Alt', 'Shift', 'Meta'].includes(s)
    )
  );

  /**
   * Property: For all modifier key names, getModifierIcon returns the correct Unicode glyph
   */
  it('should return correct Unicode glyph for all modifier key names', () => {
    fc.assert(
      fc.property(
        modifierKeyNameArbitrary,
        (modifierName: string) => {
          const icon = getModifierIcon(modifierName);
          
          // Icon should be defined for all modifier keys
          expect(icon).toBeDefined();
          
          // Icon should match the expected glyph
          expect(icon).toBe(expectedModifierIcons[modifierName]);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Ctrl always maps to ⌃
   */
  it('should always return ⌃ for Ctrl', () => {
    fc.assert(
      fc.property(
        fc.constant('Ctrl'),
        (keyName: string) => {
          expect(getModifierIcon(keyName)).toBe('⌃');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Alt always maps to ⌥
   */
  it('should always return ⌥ for Alt', () => {
    fc.assert(
      fc.property(
        fc.constant('Alt'),
        (keyName: string) => {
          expect(getModifierIcon(keyName)).toBe('⌥');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Shift always maps to ⇧
   */
  it('should always return ⇧ for Shift', () => {
    fc.assert(
      fc.property(
        fc.constant('Shift'),
        (keyName: string) => {
          expect(getModifierIcon(keyName)).toBe('⇧');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Meta always maps to ⌘
   */
  it('should always return ⌘ for Meta', () => {
    fc.assert(
      fc.property(
        fc.constant('Meta'),
        (keyName: string) => {
          expect(getModifierIcon(keyName)).toBe('⌘');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any non-modifier key name, getModifierIcon returns undefined
   */
  it('should return undefined for all non-modifier key names', () => {
    fc.assert(
      fc.property(
        nonModifierKeyNameArbitrary,
        (keyName: string) => {
          const icon = getModifierIcon(keyName);
          
          // Icon should be undefined for non-modifier keys
          expect(icon).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: The MODIFIER_ICONS constant contains exactly 4 entries
   */
  it('should have exactly 4 modifier icons defined', () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          expect(Object.keys(MODIFIER_ICONS)).toHaveLength(4);
          expect(Object.keys(MODIFIER_ICONS).sort()).toEqual(['Alt', 'Ctrl', 'Meta', 'Shift']);
        }
      ),
      { numRuns: 1 }
    );
  });

  /**
   * Property: All values in MODIFIER_ICONS are single Unicode characters
   */
  it('should have single Unicode character glyphs for all modifiers', () => {
    fc.assert(
      fc.property(
        modifierKeyNameArbitrary,
        (modifierName: string) => {
          const icon = MODIFIER_ICONS[modifierName];
          
          // Each icon should be a single character
          expect(icon).toBeDefined();
          expect([...icon].length).toBe(1); // Using spread to handle Unicode correctly
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: getModifierIcon and MODIFIER_ICONS are consistent
   */
  it('should have getModifierIcon return same value as MODIFIER_ICONS lookup', () => {
    fc.assert(
      fc.property(
        modifierKeyNameArbitrary,
        (modifierName: string) => {
          const fromFunction = getModifierIcon(modifierName);
          const fromConstant = MODIFIER_ICONS[modifierName];
          
          expect(fromFunction).toBe(fromConstant);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: isModifierKey returns true for all modifier names and false for non-modifiers
   */
  it('should have isModifierKey consistent with getModifierIcon', () => {
    fc.assert(
      fc.property(
        fc.oneof(modifierKeyNameArbitrary, nonModifierKeyNameArbitrary),
        (keyName: string) => {
          const hasIcon = getModifierIcon(keyName) !== undefined;
          const isModifier = isModifierKey(keyName);
          
          // isModifierKey should return true iff getModifierIcon returns a value
          expect(isModifier).toBe(hasIcon);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 5: Mouse Action Display with Modifiers
 * 
 * *For any* mouse click event (left, right, or middle button) with any combination
 * of active modifiers, the formatted output SHALL include the button name and any
 * active modifiers in the standard order.
 * 
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
 * 
 * Feature: visual-keystrokes-and-mouse-actions, Property 5: Mouse Action Display with Modifiers
 */
describe('Property 5: Mouse Action Display with Modifiers', () => {
  // Arbitrary for modifier combinations
  const modifiersArbitrary = fc.record({
    ctrl: fc.boolean(),
    alt: fc.boolean(),
    shift: fc.boolean(),
    meta: fc.boolean(),
  });

  // Arbitrary for mouse button
  const buttonArbitrary = fc.constantFrom('left' as const, 'right' as const, 'middle' as const);

  // Arbitrary for MouseActionEvent
  const mouseEventArbitrary: fc.Arbitrary<MouseActionEvent> = fc.record({
    type: fc.constant('mouse' as const),
    timestamp: fc.integer({ min: 0 }),
    button: buttonArbitrary,
    modifiers: modifiersArbitrary,
  });

  it('should include button name in output', () => {
    fc.assert(
      fc.property(
        mouseEventArbitrary,
        (event: MouseActionEvent) => {
          const formatted = formatMouseAction(event);
          
          // Should contain the appropriate click text
          if (event.button === 'left') {
            expect(formatted).toContain('Left Click');
          } else if (event.button === 'right') {
            expect(formatted).toContain('Right Click');
          } else if (event.button === 'middle') {
            expect(formatted).toContain('Middle Click');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include active modifiers in standard order', () => {
    fc.assert(
      fc.property(
        mouseEventArbitrary,
        (event: MouseActionEvent) => {
          const formatted = formatMouseAction(event);
          
          // Check modifier order when multiple are present
          const ctrlPos = formatted.indexOf('Ctrl');
          const altPos = formatted.indexOf('Alt');
          const shiftPos = formatted.indexOf('Shift');
          const metaPos = formatted.indexOf('Meta');
          
          if (ctrlPos !== -1 && altPos !== -1) {
            expect(ctrlPos).toBeLessThan(altPos);
          }
          if (altPos !== -1 && shiftPos !== -1) {
            expect(altPos).toBeLessThan(shiftPos);
          }
          if (shiftPos !== -1 && metaPos !== -1) {
            expect(shiftPos).toBeLessThan(metaPos);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include only active modifiers', () => {
    fc.assert(
      fc.property(
        mouseEventArbitrary,
        (event: MouseActionEvent) => {
          const formatted = formatMouseAction(event);
          
          if (event.modifiers.ctrl) {
            expect(formatted).toContain('Ctrl');
          } else {
            expect(formatted.includes('Ctrl')).toBe(false);
          }
          
          if (event.modifiers.alt) {
            expect(formatted).toContain('Alt');
          } else {
            expect(formatted.includes('Alt')).toBe(false);
          }
          
          if (event.modifiers.shift) {
            expect(formatted).toContain('Shift');
          } else {
            expect(formatted.includes('Shift')).toBe(false);
          }
          
          if (event.modifiers.meta) {
            expect(formatted).toContain('Meta');
          } else {
            expect(formatted.includes('Meta')).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should format modifiers before button name', () => {
    fc.assert(
      fc.property(
        mouseEventArbitrary,
        (event: MouseActionEvent) => {
          const formatted = formatMouseAction(event);
          const clickPos = formatted.indexOf('Click');
          
          // All modifiers should appear before "Click"
          if (event.modifiers.ctrl) {
            expect(formatted.indexOf('Ctrl')).toBeLessThan(clickPos);
          }
          if (event.modifiers.alt) {
            expect(formatted.indexOf('Alt')).toBeLessThan(clickPos);
          }
          if (event.modifiers.shift) {
            expect(formatted.indexOf('Shift')).toBeLessThan(clickPos);
          }
          if (event.modifiers.meta) {
            expect(formatted.indexOf('Meta')).toBeLessThan(clickPos);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should always produce non-empty output', () => {
    fc.assert(
      fc.property(
        mouseEventArbitrary,
        (event: MouseActionEvent) => {
          const formatted = formatMouseAction(event);
          expect(formatted.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('formatMouseAction unit tests', () => {
  it('should format left click without modifiers', () => {
    const event: MouseActionEvent = {
      type: 'mouse',
      timestamp: Date.now(),
      button: 'left',
      modifiers: { ctrl: false, alt: false, shift: false, meta: false },
    };
    expect(formatMouseAction(event)).toBe('Left Click');
  });

  it('should format right click without modifiers', () => {
    const event: MouseActionEvent = {
      type: 'mouse',
      timestamp: Date.now(),
      button: 'right',
      modifiers: { ctrl: false, alt: false, shift: false, meta: false },
    };
    expect(formatMouseAction(event)).toBe('Right Click');
  });

  it('should format middle click without modifiers', () => {
    const event: MouseActionEvent = {
      type: 'mouse',
      timestamp: Date.now(),
      button: 'middle',
      modifiers: { ctrl: false, alt: false, shift: false, meta: false },
    };
    expect(formatMouseAction(event)).toBe('Middle Click');
  });

  it('should format Ctrl + Left Click', () => {
    const event: MouseActionEvent = {
      type: 'mouse',
      timestamp: Date.now(),
      button: 'left',
      modifiers: { ctrl: true, alt: false, shift: false, meta: false },
    };
    expect(formatMouseAction(event)).toBe('Ctrl + Left Click');
  });

  it('should format Ctrl + Alt + Right Click', () => {
    const event: MouseActionEvent = {
      type: 'mouse',
      timestamp: Date.now(),
      button: 'right',
      modifiers: { ctrl: true, alt: true, shift: false, meta: false },
    };
    expect(formatMouseAction(event)).toBe('Ctrl + Alt + Right Click');
  });
});


/**
 * Property 1: Keystroke Parsing Produces Correct Key Count and Order
 * 
 * *For any* keystroke event with N active modifiers (where N ≥ 0) and a main key,
 * `parseKeystrokeToKeys` SHALL return exactly N+1 ParsedKey objects (or N if the
 * main key is itself a modifier), with modifiers appearing in the order:
 * Ctrl, Alt, Shift, Meta, followed by the main key.
 * 
 * **Validates: Requirements 1.1, 1.2, 5.1, 5.2, 5.3, 5.4**
 * 
 * Feature: keyviz-style-keystroke-overlay, Property 1: Keystroke Parsing Produces Correct Key Count and Order
 */
describe('Property 1: Keystroke Parsing Produces Correct Key Count and Order', () => {
  // Arbitrary for modifier combinations
  const modifiersArbitrary = fc.record({
    ctrl: fc.boolean(),
    alt: fc.boolean(),
    shift: fc.boolean(),
    meta: fc.boolean(),
  });

  // Non-modifier key codes for testing
  const nonModifierKeyCodes = [
    0x001E, // A
    0x0030, // B
    0x002E, // C
    0x0020, // D
    0x0012, // E
    0x001C, // Enter
    0x000E, // Backspace
    0x000F, // Tab
    0x0039, // Space
    0x0001, // Escape
    0x003B, // F1
    0x0044, // F10
    0xE048, // Up
    0xE050, // Down
    0xE04B, // Left
    0xE04D, // Right
  ];

  // Modifier key codes
  const modifierKeyCodes = [
    0x001D, // Ctrl
    0xE01D, // Ctrl (extended)
    0x0038, // Alt
    0xE038, // Alt (extended)
    0x002A, // Shift
    0x0036, // Shift (right)
    0xE05B, // Meta
    0xE05C, // Meta (right)
  ];

  const nonModifierKeyCodeArbitrary = fc.constantFrom(...nonModifierKeyCodes);
  const modifierKeyCodeArbitrary = fc.constantFrom(...modifierKeyCodes);
  const anyKeyCodeArbitrary = fc.constantFrom(...nonModifierKeyCodes, ...modifierKeyCodes);

  // Arbitrary for KeystrokeEvent with non-modifier main key
  const keystrokeEventWithNonModifierArbitrary: fc.Arbitrary<KeystrokeEvent> = fc.record({
    type: fc.constant('keystroke' as const),
    timestamp: fc.integer({ min: 0 }),
    key: fc.string(),
    keyCode: nonModifierKeyCodeArbitrary,
    modifiers: modifiersArbitrary,
  });

  // Arbitrary for KeystrokeEvent with modifier main key
  const keystrokeEventWithModifierArbitrary: fc.Arbitrary<KeystrokeEvent> = fc.record({
    type: fc.constant('keystroke' as const),
    timestamp: fc.integer({ min: 0 }),
    key: fc.string(),
    keyCode: modifierKeyCodeArbitrary,
    modifiers: modifiersArbitrary,
  });

  // Arbitrary for any KeystrokeEvent
  const keystrokeEventArbitrary: fc.Arbitrary<KeystrokeEvent> = fc.record({
    type: fc.constant('keystroke' as const),
    timestamp: fc.integer({ min: 0 }),
    key: fc.string(),
    keyCode: anyKeyCodeArbitrary,
    modifiers: modifiersArbitrary,
  });

  /**
   * Property: For non-modifier main keys, output count = active modifiers + 1
   */
  it('should return N+1 ParsedKey objects for N active modifiers with non-modifier main key', () => {
    fc.assert(
      fc.property(
        keystrokeEventWithNonModifierArbitrary,
        (event: KeystrokeEvent) => {
          const result = parseKeystrokeToKeys(event);
          
          // Count active modifiers
          const activeModifierCount = 
            (event.modifiers.ctrl ? 1 : 0) +
            (event.modifiers.alt ? 1 : 0) +
            (event.modifiers.shift ? 1 : 0) +
            (event.modifiers.meta ? 1 : 0);
          
          // For non-modifier main key: output should be N+1
          expect(result.length).toBe(activeModifierCount + 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For modifier-only presses (no modifier flags set), output count = 1
   */
  it('should return 1 ParsedKey for modifier-only press with no modifier flags', () => {
    fc.assert(
      fc.property(
        fc.record({
          type: fc.constant('keystroke' as const),
          timestamp: fc.integer({ min: 0 }),
          key: fc.string(),
          keyCode: modifierKeyCodeArbitrary,
          modifiers: fc.constant({ ctrl: false, alt: false, shift: false, meta: false }),
        }),
        (event: KeystrokeEvent) => {
          const result = parseKeystrokeToKeys(event);
          
          // Modifier-only press with no flags: should return 1 key
          expect(result.length).toBe(1);
          expect(result[0].isModifier).toBe(true);
          expect(result[0].icon).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For modifier main key with modifier flags set, output count = N (active modifiers)
   * When the main key is a modifier and its flag is set, it's already counted in the modifiers
   */
  it('should return N ParsedKey objects when main key is modifier with flags set', () => {
    fc.assert(
      fc.property(
        keystrokeEventWithModifierArbitrary,
        (event: KeystrokeEvent) => {
          const result = parseKeystrokeToKeys(event);
          
          // Count active modifiers
          const activeModifierCount = 
            (event.modifiers.ctrl ? 1 : 0) +
            (event.modifiers.alt ? 1 : 0) +
            (event.modifiers.shift ? 1 : 0) +
            (event.modifiers.meta ? 1 : 0);
          
          // For modifier main key:
          // - If no modifier flags set: output = 1 (just the modifier key)
          // - If modifier flags set: output = N (the modifiers from flags, main key is one of them)
          if (activeModifierCount === 0) {
            expect(result.length).toBe(1);
          } else {
            expect(result.length).toBe(activeModifierCount);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Modifiers always appear in order Ctrl, Alt, Shift, Meta
   */
  it('should always output modifiers in order: Ctrl, Alt, Shift, Meta', () => {
    fc.assert(
      fc.property(
        keystrokeEventArbitrary,
        (event: KeystrokeEvent) => {
          const result = parseKeystrokeToKeys(event);
          
          // Extract modifier names from result (excluding the last key if it's non-modifier)
          const modifierNames = result
            .filter(key => key.isModifier)
            .map(key => key.name);
          
          // Define expected order
          const expectedOrder = ['Ctrl', 'Alt', 'Shift', 'Meta'];
          
          // Filter to only modifiers that appear in result
          const expectedModifiersInOrder = expectedOrder.filter(mod => 
            modifierNames.includes(mod)
          );
          
          // Verify order matches
          expect(modifierNames).toEqual(expectedModifiersInOrder);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Main key (if non-modifier) always appears last
   */
  it('should always place non-modifier main key at the end', () => {
    fc.assert(
      fc.property(
        keystrokeEventWithNonModifierArbitrary,
        (event: KeystrokeEvent) => {
          const result = parseKeystrokeToKeys(event);
          
          // Last key should be non-modifier
          const lastKey = result[result.length - 1];
          expect(lastKey.isModifier).toBe(false);
          expect(lastKey.icon).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All modifier keys in output have icons
   */
  it('should include icons for all modifier keys in output', () => {
    fc.assert(
      fc.property(
        keystrokeEventArbitrary,
        (event: KeystrokeEvent) => {
          const result = parseKeystrokeToKeys(event);
          
          // All keys marked as modifiers should have icons
          for (const key of result) {
            if (key.isModifier) {
              expect(key.icon).toBeDefined();
              expect(['⌃', '⌥', '⇧', '⌘']).toContain(key.icon);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Non-modifier keys never have icons
   */
  it('should not include icons for non-modifier keys', () => {
    fc.assert(
      fc.property(
        keystrokeEventArbitrary,
        (event: KeystrokeEvent) => {
          const result = parseKeystrokeToKeys(event);
          
          // All keys not marked as modifiers should not have icons
          for (const key of result) {
            if (!key.isModifier) {
              expect(key.icon).toBeUndefined();
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Output is never empty
   */
  it('should always produce at least one ParsedKey', () => {
    fc.assert(
      fc.property(
        keystrokeEventArbitrary,
        (event: KeystrokeEvent) => {
          const result = parseKeystrokeToKeys(event);
          expect(result.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Active modifiers in event correspond to modifier keys in output
   */
  it('should include exactly the active modifiers from event', () => {
    fc.assert(
      fc.property(
        keystrokeEventWithNonModifierArbitrary,
        (event: KeystrokeEvent) => {
          const result = parseKeystrokeToKeys(event);
          
          // Get modifier names from result
          const modifierNames = result
            .filter(key => key.isModifier)
            .map(key => key.name);
          
          // Verify each active modifier is present
          if (event.modifiers.ctrl) {
            expect(modifierNames).toContain('Ctrl');
          } else {
            expect(modifierNames).not.toContain('Ctrl');
          }
          
          if (event.modifiers.alt) {
            expect(modifierNames).toContain('Alt');
          } else {
            expect(modifierNames).not.toContain('Alt');
          }
          
          if (event.modifiers.shift) {
            expect(modifierNames).toContain('Shift');
          } else {
            expect(modifierNames).not.toContain('Shift');
          }
          
          if (event.modifiers.meta) {
            expect(modifierNames).toContain('Meta');
          } else {
            expect(modifierNames).not.toContain('Meta');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Unit tests for parseKeystrokeToKeys function
 * 
 * **Validates: Requirements 1.1, 1.2, 5.1, 5.2, 5.3, 5.4**
 */
describe('parseKeystrokeToKeys', () => {
  describe('single key press (no modifiers)', () => {
    it('should return single ParsedKey for letter key', () => {
      const event: KeystrokeEvent = {
        type: 'keystroke',
        timestamp: Date.now(),
        key: 'A',
        keyCode: 0x001E, // A
        modifiers: { ctrl: false, alt: false, shift: false, meta: false },
      };
      
      const result = parseKeystrokeToKeys(event);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'A',
        icon: undefined,
        isModifier: false,
      });
    });

    it('should return single ParsedKey for Enter key', () => {
      const event: KeystrokeEvent = {
        type: 'keystroke',
        timestamp: Date.now(),
        key: 'Enter',
        keyCode: 0x001C, // Enter
        modifiers: { ctrl: false, alt: false, shift: false, meta: false },
      };
      
      const result = parseKeystrokeToKeys(event);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'Enter',
        icon: undefined,
        isModifier: false,
      });
    });

    it('should return single ParsedKey for function key F1', () => {
      const event: KeystrokeEvent = {
        type: 'keystroke',
        timestamp: Date.now(),
        key: 'F1',
        keyCode: 0x003B, // F1
        modifiers: { ctrl: false, alt: false, shift: false, meta: false },
      };
      
      const result = parseKeystrokeToKeys(event);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'F1',
        icon: undefined,
        isModifier: false,
      });
    });
  });

  describe('modifier-only presses (Requirement 5.1)', () => {
    it('should return single ParsedKey with icon for Ctrl-only press', () => {
      const event: KeystrokeEvent = {
        type: 'keystroke',
        timestamp: Date.now(),
        key: 'Ctrl',
        keyCode: 0x001D, // Ctrl
        modifiers: { ctrl: false, alt: false, shift: false, meta: false },
      };
      
      const result = parseKeystrokeToKeys(event);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'Ctrl',
        icon: '⌃',
        isModifier: true,
      });
    });

    it('should return single ParsedKey with icon for Alt-only press', () => {
      const event: KeystrokeEvent = {
        type: 'keystroke',
        timestamp: Date.now(),
        key: 'Alt',
        keyCode: 0x0038, // Alt
        modifiers: { ctrl: false, alt: false, shift: false, meta: false },
      };
      
      const result = parseKeystrokeToKeys(event);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'Alt',
        icon: '⌥',
        isModifier: true,
      });
    });

    it('should return single ParsedKey with icon for Shift-only press', () => {
      const event: KeystrokeEvent = {
        type: 'keystroke',
        timestamp: Date.now(),
        key: 'Shift',
        keyCode: 0x002A, // Shift
        modifiers: { ctrl: false, alt: false, shift: false, meta: false },
      };
      
      const result = parseKeystrokeToKeys(event);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'Shift',
        icon: '⇧',
        isModifier: true,
      });
    });

    it('should return single ParsedKey with icon for Meta-only press', () => {
      const event: KeystrokeEvent = {
        type: 'keystroke',
        timestamp: Date.now(),
        key: 'Meta',
        keyCode: 0xE05B, // Meta
        modifiers: { ctrl: false, alt: false, shift: false, meta: false },
      };
      
      const result = parseKeystrokeToKeys(event);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'Meta',
        icon: '⌘',
        isModifier: true,
      });
    });
  });

  describe('modifier + key combinations (Requirement 5.2)', () => {
    it('should return Ctrl + A as two ParsedKeys', () => {
      const event: KeystrokeEvent = {
        type: 'keystroke',
        timestamp: Date.now(),
        key: 'A',
        keyCode: 0x001E, // A
        modifiers: { ctrl: true, alt: false, shift: false, meta: false },
      };
      
      const result = parseKeystrokeToKeys(event);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'Ctrl',
        icon: '⌃',
        isModifier: true,
      });
      expect(result[1]).toEqual({
        name: 'A',
        icon: undefined,
        isModifier: false,
      });
    });

    it('should return Alt + Tab as two ParsedKeys', () => {
      const event: KeystrokeEvent = {
        type: 'keystroke',
        timestamp: Date.now(),
        key: 'Tab',
        keyCode: 0x000F, // Tab
        modifiers: { ctrl: false, alt: true, shift: false, meta: false },
      };
      
      const result = parseKeystrokeToKeys(event);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'Alt',
        icon: '⌥',
        isModifier: true,
      });
      expect(result[1]).toEqual({
        name: 'Tab',
        icon: undefined,
        isModifier: false,
      });
    });

    it('should return Shift + Enter as two ParsedKeys', () => {
      const event: KeystrokeEvent = {
        type: 'keystroke',
        timestamp: Date.now(),
        key: 'Enter',
        keyCode: 0x001C, // Enter
        modifiers: { ctrl: false, alt: false, shift: true, meta: false },
      };
      
      const result = parseKeystrokeToKeys(event);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'Shift',
        icon: '⇧',
        isModifier: true,
      });
      expect(result[1]).toEqual({
        name: 'Enter',
        icon: undefined,
        isModifier: false,
      });
    });
  });

  describe('multiple modifiers + key (Requirement 5.4)', () => {
    it('should return Ctrl + Alt + Delete as three ParsedKeys in order', () => {
      const event: KeystrokeEvent = {
        type: 'keystroke',
        timestamp: Date.now(),
        key: 'Delete',
        keyCode: 0xE053, // Delete
        modifiers: { ctrl: true, alt: true, shift: false, meta: false },
      };
      
      const result = parseKeystrokeToKeys(event);
      
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Ctrl');
      expect(result[1].name).toBe('Alt');
      expect(result[2].name).toBe('Delete');
    });

    it('should return Ctrl + Shift + S as three ParsedKeys in order', () => {
      const event: KeystrokeEvent = {
        type: 'keystroke',
        timestamp: Date.now(),
        key: 'S',
        keyCode: 0x001F, // S
        modifiers: { ctrl: true, alt: false, shift: true, meta: false },
      };
      
      const result = parseKeystrokeToKeys(event);
      
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Ctrl');
      expect(result[1].name).toBe('Shift');
      expect(result[2].name).toBe('S');
    });

    it('should return all four modifiers + key in correct order (Requirement 5.3)', () => {
      const event: KeystrokeEvent = {
        type: 'keystroke',
        timestamp: Date.now(),
        key: 'A',
        keyCode: 0x001E, // A
        modifiers: { ctrl: true, alt: true, shift: true, meta: true },
      };
      
      const result = parseKeystrokeToKeys(event);
      
      expect(result).toHaveLength(5);
      expect(result[0].name).toBe('Ctrl');
      expect(result[1].name).toBe('Alt');
      expect(result[2].name).toBe('Shift');
      expect(result[3].name).toBe('Meta');
      expect(result[4].name).toBe('A');
      
      // Verify modifiers have icons
      expect(result[0].icon).toBe('⌃');
      expect(result[1].icon).toBe('⌥');
      expect(result[2].icon).toBe('⇧');
      expect(result[3].icon).toBe('⌘');
      
      // Verify main key has no icon
      expect(result[4].icon).toBeUndefined();
    });
  });

  describe('modifier key with modifier flag set', () => {
    it('should handle Ctrl key press with ctrl modifier flag set', () => {
      // This happens when holding Ctrl - the keyCode is Ctrl and ctrl modifier is true
      const event: KeystrokeEvent = {
        type: 'keystroke',
        timestamp: Date.now(),
        key: 'Ctrl',
        keyCode: 0x001D, // Ctrl
        modifiers: { ctrl: true, alt: false, shift: false, meta: false },
      };
      
      const result = parseKeystrokeToKeys(event);
      
      // Should return just the Ctrl modifier (not duplicated)
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'Ctrl',
        icon: '⌃',
        isModifier: true,
      });
    });

    it('should handle Shift key press with shift modifier flag set', () => {
      const event: KeystrokeEvent = {
        type: 'keystroke',
        timestamp: Date.now(),
        key: 'Shift',
        keyCode: 0x002A, // Shift
        modifiers: { ctrl: false, alt: false, shift: true, meta: false },
      };
      
      const result = parseKeystrokeToKeys(event);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'Shift',
        icon: '⇧',
        isModifier: true,
      });
    });
  });

  describe('isModifier flag correctness', () => {
    it('should set isModifier=true for all modifier keys', () => {
      const event: KeystrokeEvent = {
        type: 'keystroke',
        timestamp: Date.now(),
        key: 'A',
        keyCode: 0x001E,
        modifiers: { ctrl: true, alt: true, shift: true, meta: true },
      };
      
      const result = parseKeystrokeToKeys(event);
      
      // First 4 should be modifiers
      expect(result[0].isModifier).toBe(true);
      expect(result[1].isModifier).toBe(true);
      expect(result[2].isModifier).toBe(true);
      expect(result[3].isModifier).toBe(true);
      // Last should be non-modifier
      expect(result[4].isModifier).toBe(false);
    });

    it('should set isModifier=false for non-modifier keys', () => {
      const nonModifierKeys = [
        { keyCode: 0x001E, name: 'A' },
        { keyCode: 0x001C, name: 'Enter' },
        { keyCode: 0x003B, name: 'F1' },
        { keyCode: 0x0039, name: 'Space' },
      ];
      
      for (const key of nonModifierKeys) {
        const event: KeystrokeEvent = {
          type: 'keystroke',
          timestamp: Date.now(),
          key: key.name,
          keyCode: key.keyCode,
          modifiers: { ctrl: false, alt: false, shift: false, meta: false },
        };
        
        const result = parseKeystrokeToKeys(event);
        expect(result[0].isModifier).toBe(false);
      }
    });
  });
});
