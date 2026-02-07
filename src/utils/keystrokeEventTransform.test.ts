import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  transformKeyboardEvent,
  transformMouseEvent,
  isValidInputEvent,
  isKeystrokeEvent,
  isMouseActionEvent,
  BUTTON_MAP,
  VALID_BUTTON_NUMBERS,
  type UiohookKeyboardEvent,
  type UiohookMouseEvent,
} from './keystrokeEventTransform';

/**
 * Property 7: IPC Event Communication
 * 
 * *For any* keyboard or mouse event captured by the Keystroke Service, 
 * an IPC message SHALL be sent to the overlay renderer process containing 
 * the event data.
 * 
 * **Validates: Requirements 6.4**
 * 
 * Since we cannot test actual IPC in unit tests, we test the event 
 * transformation logic that prepares events for IPC transmission:
 * 1. The keystroke service correctly transforms uiohook events into InputEvent objects
 * 2. The event callback is called with properly formatted events
 * 3. All event fields are preserved through the transformation
 * 
 * Feature: visual-keystrokes-and-mouse-actions, Property 7: IPC Event Communication
 */
describe('IPC Event Communication - Event Transformation', () => {
  // Arbitrary for uiohook keyboard events
  const uiohookKeyboardEventArbitrary: fc.Arbitrary<UiohookKeyboardEvent> = fc.record({
    keycode: fc.integer({ min: 1, max: 65535 }), // Valid keycode range
    ctrlKey: fc.option(fc.boolean(), { nil: undefined }),
    altKey: fc.option(fc.boolean(), { nil: undefined }),
    shiftKey: fc.option(fc.boolean(), { nil: undefined }),
    metaKey: fc.option(fc.boolean(), { nil: undefined }),
  });

  // Arbitrary for valid uiohook mouse events (buttons 1, 2, 3)
  const validUiohookMouseEventArbitrary: fc.Arbitrary<UiohookMouseEvent> = fc.record({
    button: fc.constantFrom(1, 2, 3),
    ctrlKey: fc.option(fc.boolean(), { nil: undefined }),
    altKey: fc.option(fc.boolean(), { nil: undefined }),
    shiftKey: fc.option(fc.boolean(), { nil: undefined }),
    metaKey: fc.option(fc.boolean(), { nil: undefined }),
  });

  // Arbitrary for invalid mouse button numbers
  const invalidButtonArbitrary = fc.integer().filter(n => n !== 1 && n !== 2 && n !== 3);

  // Arbitrary for timestamps
  const timestampArbitrary = fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER });

  describe('Property 7.1: Keyboard event transformation produces valid InputEvent', () => {
    it('should transform any uiohook keyboard event into a valid KeystrokeEvent', () => {
      fc.assert(
        fc.property(
          uiohookKeyboardEventArbitrary,
          timestampArbitrary,
          (uiohookEvent, timestamp) => {
            const result = transformKeyboardEvent(uiohookEvent, timestamp);

            // Result must be a valid InputEvent
            expect(isValidInputEvent(result)).toBe(true);
            
            // Result must be a KeystrokeEvent
            expect(isKeystrokeEvent(result)).toBe(true);
            
            // Type must be 'keystroke'
            expect(result.type).toBe('keystroke');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7.2: Keyboard event fields are preserved through transformation', () => {
    it('should preserve keycode in the transformed event', () => {
      fc.assert(
        fc.property(
          uiohookKeyboardEventArbitrary,
          timestampArbitrary,
          (uiohookEvent, timestamp) => {
            const result = transformKeyboardEvent(uiohookEvent, timestamp);

            // keyCode must match original keycode
            expect(result.keyCode).toBe(uiohookEvent.keycode);
            
            // key must be string representation of keycode
            expect(result.key).toBe(String(uiohookEvent.keycode));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve timestamp in the transformed event', () => {
      fc.assert(
        fc.property(
          uiohookKeyboardEventArbitrary,
          timestampArbitrary,
          (uiohookEvent, timestamp) => {
            const result = transformKeyboardEvent(uiohookEvent, timestamp);

            expect(result.timestamp).toBe(timestamp);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve all modifier states through transformation', () => {
      fc.assert(
        fc.property(
          uiohookKeyboardEventArbitrary,
          timestampArbitrary,
          (uiohookEvent, timestamp) => {
            const result = transformKeyboardEvent(uiohookEvent, timestamp);

            // Modifiers should match (undefined treated as false)
            expect(result.modifiers.ctrl).toBe(uiohookEvent.ctrlKey ?? false);
            expect(result.modifiers.alt).toBe(uiohookEvent.altKey ?? false);
            expect(result.modifiers.shift).toBe(uiohookEvent.shiftKey ?? false);
            expect(result.modifiers.meta).toBe(uiohookEvent.metaKey ?? false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7.3: Mouse event transformation produces valid InputEvent', () => {
    it('should transform any valid uiohook mouse event into a valid MouseActionEvent', () => {
      fc.assert(
        fc.property(
          validUiohookMouseEventArbitrary,
          timestampArbitrary,
          (uiohookEvent, timestamp) => {
            const result = transformMouseEvent(uiohookEvent, timestamp);

            // Result must not be null for valid buttons
            expect(result).not.toBeNull();
            
            // Result must be a valid InputEvent
            expect(isValidInputEvent(result)).toBe(true);
            
            // Result must be a MouseActionEvent
            expect(isMouseActionEvent(result!)).toBe(true);
            
            // Type must be 'mouse'
            expect(result!.type).toBe('mouse');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return null for invalid button numbers', () => {
      fc.assert(
        fc.property(
          invalidButtonArbitrary,
          (invalidButton) => {
            const uiohookEvent: UiohookMouseEvent = {
              button: invalidButton,
              ctrlKey: false,
              altKey: false,
              shiftKey: false,
              metaKey: false,
            };
            
            const result = transformMouseEvent(uiohookEvent);

            // Invalid buttons should return null
            expect(result).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7.4: Mouse event fields are preserved through transformation', () => {
    it('should correctly map button numbers to button names', () => {
      fc.assert(
        fc.property(
          validUiohookMouseEventArbitrary,
          timestampArbitrary,
          (uiohookEvent, timestamp) => {
            const result = transformMouseEvent(uiohookEvent, timestamp);

            expect(result).not.toBeNull();
            
            // Button should be correctly mapped
            const expectedButton = BUTTON_MAP[uiohookEvent.button];
            expect(result!.button).toBe(expectedButton);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve timestamp in the transformed mouse event', () => {
      fc.assert(
        fc.property(
          validUiohookMouseEventArbitrary,
          timestampArbitrary,
          (uiohookEvent, timestamp) => {
            const result = transformMouseEvent(uiohookEvent, timestamp);

            expect(result).not.toBeNull();
            expect(result!.timestamp).toBe(timestamp);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve all modifier states through mouse event transformation', () => {
      fc.assert(
        fc.property(
          validUiohookMouseEventArbitrary,
          timestampArbitrary,
          (uiohookEvent, timestamp) => {
            const result = transformMouseEvent(uiohookEvent, timestamp);

            expect(result).not.toBeNull();
            
            // Modifiers should match (undefined treated as false)
            expect(result!.modifiers.ctrl).toBe(uiohookEvent.ctrlKey ?? false);
            expect(result!.modifiers.alt).toBe(uiohookEvent.altKey ?? false);
            expect(result!.modifiers.shift).toBe(uiohookEvent.shiftKey ?? false);
            expect(result!.modifiers.meta).toBe(uiohookEvent.metaKey ?? false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7.5: All valid button types are supported', () => {
    it('should support all three mouse button types (left, right, middle)', () => {
      // Verify all valid buttons produce correct output
      for (const buttonNum of VALID_BUTTON_NUMBERS) {
        const uiohookEvent: UiohookMouseEvent = {
          button: buttonNum,
          ctrlKey: false,
          altKey: false,
          shiftKey: false,
          metaKey: false,
        };
        
        const result = transformMouseEvent(uiohookEvent);
        
        expect(result).not.toBeNull();
        expect(result!.button).toBe(BUTTON_MAP[buttonNum]);
      }
      
      // Verify button mapping is complete
      expect(BUTTON_MAP[1]).toBe('left');
      expect(BUTTON_MAP[2]).toBe('right');
      expect(BUTTON_MAP[3]).toBe('middle');
    });
  });

  describe('Property 7.6: Event validation correctly identifies valid events', () => {
    it('should validate all transformed keyboard events as valid', () => {
      fc.assert(
        fc.property(
          uiohookKeyboardEventArbitrary,
          timestampArbitrary,
          (uiohookEvent, timestamp) => {
            const result = transformKeyboardEvent(uiohookEvent, timestamp);

            expect(isValidInputEvent(result)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate all transformed mouse events as valid', () => {
      fc.assert(
        fc.property(
          validUiohookMouseEventArbitrary,
          timestampArbitrary,
          (uiohookEvent, timestamp) => {
            const result = transformMouseEvent(uiohookEvent, timestamp);

            expect(result).not.toBeNull();
            expect(isValidInputEvent(result)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject invalid event objects', () => {
      // Test various invalid inputs
      expect(isValidInputEvent(null)).toBe(false);
      expect(isValidInputEvent(undefined)).toBe(false);
      expect(isValidInputEvent({})).toBe(false);
      expect(isValidInputEvent({ type: 'keystroke' })).toBe(false);
      expect(isValidInputEvent({ type: 'mouse' })).toBe(false);
      expect(isValidInputEvent({ type: 'unknown', timestamp: 123 })).toBe(false);
      expect(isValidInputEvent({ 
        type: 'keystroke', 
        timestamp: 123,
        // Missing key, keyCode, modifiers
      })).toBe(false);
      expect(isValidInputEvent({ 
        type: 'mouse', 
        timestamp: 123,
        button: 'invalid', // Invalid button
        modifiers: { ctrl: false, alt: false, shift: false, meta: false }
      })).toBe(false);
    });
  });

  describe('Property 7.7: Modifier combinations are correctly handled', () => {
    it('should handle all 16 possible modifier combinations for keyboard events', () => {
      const modifierCombinations = fc.record({
        ctrl: fc.boolean(),
        alt: fc.boolean(),
        shift: fc.boolean(),
        meta: fc.boolean(),
      });

      fc.assert(
        fc.property(
          modifierCombinations,
          fc.integer({ min: 1, max: 65535 }),
          timestampArbitrary,
          (modifiers, keycode, timestamp) => {
            const uiohookEvent: UiohookKeyboardEvent = {
              keycode,
              ctrlKey: modifiers.ctrl,
              altKey: modifiers.alt,
              shiftKey: modifiers.shift,
              metaKey: modifiers.meta,
            };

            const result = transformKeyboardEvent(uiohookEvent, timestamp);

            // All modifier states should be preserved exactly
            expect(result.modifiers.ctrl).toBe(modifiers.ctrl);
            expect(result.modifiers.alt).toBe(modifiers.alt);
            expect(result.modifiers.shift).toBe(modifiers.shift);
            expect(result.modifiers.meta).toBe(modifiers.meta);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle all 16 possible modifier combinations for mouse events', () => {
      const modifierCombinations = fc.record({
        ctrl: fc.boolean(),
        alt: fc.boolean(),
        shift: fc.boolean(),
        meta: fc.boolean(),
      });

      fc.assert(
        fc.property(
          modifierCombinations,
          fc.constantFrom(1, 2, 3),
          timestampArbitrary,
          (modifiers, button, timestamp) => {
            const uiohookEvent: UiohookMouseEvent = {
              button,
              ctrlKey: modifiers.ctrl,
              altKey: modifiers.alt,
              shiftKey: modifiers.shift,
              metaKey: modifiers.meta,
            };

            const result = transformMouseEvent(uiohookEvent, timestamp);

            expect(result).not.toBeNull();
            
            // All modifier states should be preserved exactly
            expect(result!.modifiers.ctrl).toBe(modifiers.ctrl);
            expect(result!.modifiers.alt).toBe(modifiers.alt);
            expect(result!.modifiers.shift).toBe(modifiers.shift);
            expect(result!.modifiers.meta).toBe(modifiers.meta);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
