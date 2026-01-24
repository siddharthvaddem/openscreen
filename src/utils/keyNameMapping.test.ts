import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { KeystrokeEvent, MouseActionEvent } from '../types/keystrokeEvents';
import {
  getKeyDisplayName,
  formatKeystroke,
  formatMouseAction,
  formatModifiers,
  isModifierKeyCode,
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
