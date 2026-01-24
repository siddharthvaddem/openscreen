import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  generateKeystrokeRegions,
  formatEventText,
  shouldShowEvent,
} from './keystrokeRegionGenerator';
import type {
  KeystrokeEventData,
  RecordedInputEvent,
  RecordedKeystrokeEvent,
  RecordedMouseClickEvent,
} from '../types/keystrokeEditorEvents';
import type { KeystrokeEditorSettings } from '../types/keystrokeEditorSettings';
import { DEFAULT_KEYSTROKE_EDITOR_SETTINGS } from '../types/keystrokeEditorSettings';
import { DEFAULT_KEYSTROKE_STYLE, DEFAULT_KEYSTROKE_POSITION } from '../components/video-editor/types';

/**
 * Property 6: Region Generation from Events
 * 
 * *For any* loaded KeystrokeEventData with N events (where showOnlyHotkeys is false), 
 * the system SHALL generate exactly N KeystrokeRegion objects, each with:
 * - Unique id
 * - startMs equal to event timestamp
 * - endMs equal to startMs + lingerDurationMs
 * - Non-empty text containing the formatted keystroke/mouse action
 * 
 * **Validates: Requirements 4.3**
 * 
 * Feature: keystroke-editor-overlay, Property 6: Region Generation from Events
 */
describe('Property 6: Region Generation from Events', () => {
  // Arbitrary for modifier state
  const modifiersArbitrary = fc.record({
    ctrl: fc.boolean(),
    alt: fc.boolean(),
    shift: fc.boolean(),
    meta: fc.boolean(),
  });

  // Arbitrary for keystroke events with valid timestamps
  const keystrokeEventArbitrary: fc.Arbitrary<RecordedKeystrokeEvent> = fc.record({
    type: fc.constant('keystroke' as const),
    timestamp: fc.integer({ min: 0, max: 3600000 }), // 0 to 1 hour in ms
    keyCode: fc.integer({ min: 1, max: 255 }),
    keyName: fc.string({ minLength: 1, maxLength: 20 }),
    modifiers: modifiersArbitrary,
  });

  // Arbitrary for mouse events with valid timestamps
  const mouseEventArbitrary: fc.Arbitrary<RecordedMouseClickEvent> = fc.record({
    type: fc.constant('mouse' as const),
    timestamp: fc.integer({ min: 0, max: 3600000 }),
    button: fc.constantFrom('left', 'right', 'middle'),
    modifiers: modifiersArbitrary,
  });

  // Arbitrary for any input event
  const inputEventArbitrary: fc.Arbitrary<RecordedInputEvent> = fc.oneof(
    keystrokeEventArbitrary,
    mouseEventArbitrary
  );

  // Arbitrary for event data with valid events
  const eventDataArbitrary = (events: fc.Arbitrary<RecordedInputEvent[]>): fc.Arbitrary<KeystrokeEventData> =>
    fc.record({
      version: fc.constant(1 as const),
      recordingId: fc.string({ minLength: 1, maxLength: 50 }),
      events: events,
    });

  // Settings with showOnlyHotkeys disabled
  const settingsWithHotkeysDisabled: KeystrokeEditorSettings = {
    ...DEFAULT_KEYSTROKE_EDITOR_SETTINGS,
    defaultStyle: {
      ...DEFAULT_KEYSTROKE_STYLE,
      showOnlyHotkeys: false,
    },
  };

  describe('Property 6.1: Region count matches event count when showOnlyHotkeys is false', () => {
    it('should generate exactly N regions for N events', () => {
      fc.assert(
        fc.property(
          eventDataArbitrary(fc.array(inputEventArbitrary, { minLength: 0, maxLength: 50 })),
          (eventData) => {
            const regions = generateKeystrokeRegions(eventData, settingsWithHotkeysDisabled);

            // Region count should match event count
            expect(regions.length).toBe(eventData.events.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6.2: Each region has a unique id', () => {
    it('should generate regions with unique ids', () => {
      fc.assert(
        fc.property(
          eventDataArbitrary(fc.array(inputEventArbitrary, { minLength: 1, maxLength: 50 })),
          (eventData) => {
            const regions = generateKeystrokeRegions(eventData, settingsWithHotkeysDisabled);

            const ids = regions.map(r => r.id);
            const uniqueIds = new Set(ids);

            // All ids should be unique
            expect(uniqueIds.size).toBe(ids.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6.3: startMs equals event timestamp', () => {
    it('should set startMs equal to event timestamp', () => {
      fc.assert(
        fc.property(
          eventDataArbitrary(fc.array(inputEventArbitrary, { minLength: 1, maxLength: 50 })),
          (eventData) => {
            const regions = generateKeystrokeRegions(eventData, settingsWithHotkeysDisabled);

            // Each region's startMs should match corresponding event's timestamp
            for (let i = 0; i < regions.length; i++) {
              expect(regions[i].startMs).toBe(eventData.events[i].timestamp);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6.4: endMs equals startMs + lingerDurationMs', () => {
    it('should set endMs equal to startMs + lingerDurationMs', () => {
      fc.assert(
        fc.property(
          eventDataArbitrary(fc.array(inputEventArbitrary, { minLength: 1, maxLength: 50 })),
          fc.integer({ min: 100, max: 5000 }), // lingerDurationMs
          (eventData, lingerDurationMs) => {
            const settings: KeystrokeEditorSettings = {
              ...settingsWithHotkeysDisabled,
              defaultStyle: {
                ...settingsWithHotkeysDisabled.defaultStyle,
                lingerDurationMs,
              },
            };

            const regions = generateKeystrokeRegions(eventData, settings);

            // Each region's endMs should be startMs + lingerDurationMs
            for (const region of regions) {
              expect(region.endMs).toBe(region.startMs + lingerDurationMs);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6.5: Each region has non-empty text', () => {
    it('should generate regions with non-empty text', () => {
      fc.assert(
        fc.property(
          eventDataArbitrary(fc.array(inputEventArbitrary, { minLength: 1, maxLength: 50 })),
          (eventData) => {
            const regions = generateKeystrokeRegions(eventData, settingsWithHotkeysDisabled);

            // Each region should have non-empty text
            for (const region of regions) {
              expect(region.text).toBeTruthy();
              expect(region.text.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6.6: Region eventType matches source event type', () => {
    it('should set eventType correctly based on source event', () => {
      fc.assert(
        fc.property(
          eventDataArbitrary(fc.array(inputEventArbitrary, { minLength: 1, maxLength: 50 })),
          (eventData) => {
            const regions = generateKeystrokeRegions(eventData, settingsWithHotkeysDisabled);

            // Each region's eventType should match source event type
            for (let i = 0; i < regions.length; i++) {
              const expectedType = eventData.events[i].type === 'keystroke' ? 'keystroke' : 'mouse';
              expect(regions[i].eventType).toBe(expectedType);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6.7: Empty event array produces no regions', () => {
    it('should return empty array for empty events', () => {
      const emptyEventData: KeystrokeEventData = {
        version: 1,
        recordingId: 'test-recording',
        events: [],
      };

      const regions = generateKeystrokeRegions(emptyEventData, settingsWithHotkeysDisabled);

      expect(regions).toEqual([]);
    });
  });
});

/**
 * Property 7: Hotkey Filter Property
 * 
 * *For any* event where showOnlyHotkeys is true, only events with at least one 
 * modifier key active (ctrl, alt, shift, or meta) SHALL be included in the 
 * generated regions. Events without any modifiers SHALL be excluded.
 * 
 * **Validates: Requirements 7.8**
 * 
 * Feature: keystroke-editor-overlay, Property 7: Hotkey Filter Property
 */
describe('Property 7: Hotkey Filter Property', () => {
  // Arbitrary for modifier state
  const modifiersArbitrary = fc.record({
    ctrl: fc.boolean(),
    alt: fc.boolean(),
    shift: fc.boolean(),
    meta: fc.boolean(),
  });

  // Arbitrary for modifiers with at least one active
  const modifiersWithAtLeastOneArbitrary = modifiersArbitrary.filter(
    m => m.ctrl || m.alt || m.shift || m.meta
  );

  // Arbitrary for modifiers with none active
  const modifiersWithNoneArbitrary = fc.constant({
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
  });

  // Arbitrary for keystroke events
  const keystrokeEventWithModifiers = (modifiers: fc.Arbitrary<{ ctrl: boolean; alt: boolean; shift: boolean; meta: boolean }>): fc.Arbitrary<RecordedKeystrokeEvent> =>
    fc.record({
      type: fc.constant('keystroke' as const),
      timestamp: fc.integer({ min: 0, max: 3600000 }),
      keyCode: fc.integer({ min: 1, max: 255 }),
      keyName: fc.string({ minLength: 1, maxLength: 20 }),
      modifiers: modifiers,
    });

  // Arbitrary for mouse events
  const mouseEventWithModifiers = (modifiers: fc.Arbitrary<{ ctrl: boolean; alt: boolean; shift: boolean; meta: boolean }>): fc.Arbitrary<RecordedMouseClickEvent> =>
    fc.record({
      type: fc.constant('mouse' as const),
      timestamp: fc.integer({ min: 0, max: 3600000 }),
      button: fc.constantFrom('left', 'right', 'middle'),
      modifiers: modifiers,
    });

  // Settings with showOnlyHotkeys enabled
  const settingsWithHotkeysEnabled: KeystrokeEditorSettings = {
    ...DEFAULT_KEYSTROKE_EDITOR_SETTINGS,
    defaultStyle: {
      ...DEFAULT_KEYSTROKE_STYLE,
      showOnlyHotkeys: true,
    },
  };

  describe('Property 7.1: shouldShowEvent returns true for events with modifiers when filter enabled', () => {
    it('should return true for keystroke events with at least one modifier', () => {
      fc.assert(
        fc.property(
          keystrokeEventWithModifiers(modifiersWithAtLeastOneArbitrary),
          (event) => {
            const result = shouldShowEvent(event, true);
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return true for mouse events with at least one modifier', () => {
      fc.assert(
        fc.property(
          mouseEventWithModifiers(modifiersWithAtLeastOneArbitrary),
          (event) => {
            const result = shouldShowEvent(event, true);
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7.2: shouldShowEvent returns false for events without modifiers when filter enabled', () => {
    it('should return false for keystroke events without modifiers', () => {
      fc.assert(
        fc.property(
          keystrokeEventWithModifiers(modifiersWithNoneArbitrary),
          (event) => {
            const result = shouldShowEvent(event, true);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return false for mouse events without modifiers', () => {
      fc.assert(
        fc.property(
          mouseEventWithModifiers(modifiersWithNoneArbitrary),
          (event) => {
            const result = shouldShowEvent(event, true);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7.3: shouldShowEvent returns true for all events when filter disabled', () => {
    it('should return true for any event when showOnlyHotkeys is false', () => {
      const anyInputEvent = fc.oneof(
        keystrokeEventWithModifiers(modifiersArbitrary),
        mouseEventWithModifiers(modifiersArbitrary)
      );

      fc.assert(
        fc.property(
          anyInputEvent,
          (event) => {
            const result = shouldShowEvent(event, false);
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7.4: Region generation filters correctly with showOnlyHotkeys enabled', () => {
    it('should only include events with modifiers when showOnlyHotkeys is true', () => {
      // Generate a mix of events with and without modifiers
      const eventWithModifier = fc.oneof(
        keystrokeEventWithModifiers(modifiersWithAtLeastOneArbitrary),
        mouseEventWithModifiers(modifiersWithAtLeastOneArbitrary)
      );
      const eventWithoutModifier = fc.oneof(
        keystrokeEventWithModifiers(modifiersWithNoneArbitrary),
        mouseEventWithModifiers(modifiersWithNoneArbitrary)
      );

      fc.assert(
        fc.property(
          fc.array(eventWithModifier, { minLength: 0, maxLength: 10 }),
          fc.array(eventWithoutModifier, { minLength: 0, maxLength: 10 }),
          fc.string({ minLength: 1, maxLength: 20 }),
          (eventsWithMod, eventsWithoutMod, recordingId) => {
            // Combine and shuffle events
            const allEvents = [...eventsWithMod, ...eventsWithoutMod];
            
            const eventData: KeystrokeEventData = {
              version: 1,
              recordingId,
              events: allEvents,
            };

            const regions = generateKeystrokeRegions(eventData, settingsWithHotkeysEnabled);

            // Count events that have modifiers
            const expectedCount = allEvents.filter(e => 
              e.modifiers.ctrl || e.modifiers.alt || e.modifiers.shift || e.modifiers.meta
            ).length;

            // Region count should match events with modifiers
            expect(regions.length).toBe(expectedCount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7.5: Each modifier type individually triggers inclusion', () => {
    it('should include event when only ctrl is active', () => {
      const event: RecordedKeystrokeEvent = {
        type: 'keystroke',
        timestamp: 1000,
        keyCode: 67,
        keyName: 'C',
        modifiers: { ctrl: true, alt: false, shift: false, meta: false },
      };
      expect(shouldShowEvent(event, true)).toBe(true);
    });

    it('should include event when only alt is active', () => {
      const event: RecordedKeystrokeEvent = {
        type: 'keystroke',
        timestamp: 1000,
        keyCode: 9,
        keyName: 'Tab',
        modifiers: { ctrl: false, alt: true, shift: false, meta: false },
      };
      expect(shouldShowEvent(event, true)).toBe(true);
    });

    it('should include event when only shift is active', () => {
      const event: RecordedKeystrokeEvent = {
        type: 'keystroke',
        timestamp: 1000,
        keyCode: 65,
        keyName: 'A',
        modifiers: { ctrl: false, alt: false, shift: true, meta: false },
      };
      expect(shouldShowEvent(event, true)).toBe(true);
    });

    it('should include event when only meta is active', () => {
      const event: RecordedKeystrokeEvent = {
        type: 'keystroke',
        timestamp: 1000,
        keyCode: 86,
        keyName: 'V',
        modifiers: { ctrl: false, alt: false, shift: false, meta: true },
      };
      expect(shouldShowEvent(event, true)).toBe(true);
    });
  });

  describe('Property 7.6: Multiple modifiers also trigger inclusion', () => {
    it('should include events with multiple modifiers active', () => {
      fc.assert(
        fc.property(
          fc.record({
            ctrl: fc.boolean(),
            alt: fc.boolean(),
            shift: fc.boolean(),
            meta: fc.boolean(),
          }).filter(m => {
            // At least 2 modifiers active
            const count = [m.ctrl, m.alt, m.shift, m.meta].filter(Boolean).length;
            return count >= 2;
          }),
          (modifiers) => {
            const event: RecordedKeystrokeEvent = {
              type: 'keystroke',
              timestamp: 1000,
              keyCode: 65,
              keyName: 'A',
              modifiers,
            };
            expect(shouldShowEvent(event, true)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


/**
 * Property 10: Keystroke Formatting with Modifiers
 * 
 * *For any* keystroke event with any combination of modifiers (ctrl, alt, shift, meta), 
 * the formatted output SHALL display modifiers in the order Ctrl → Alt → Shift → Meta → Key, 
 * with only the active modifiers shown, separated by " + ".
 * 
 * **Validates: Requirements 6.2**
 * 
 * Feature: keystroke-editor-overlay, Property 10: Keystroke Formatting with Modifiers
 */
describe('Property 10: Keystroke Formatting with Modifiers', () => {
  // Arbitrary for modifier state
  const modifiersArbitrary = fc.record({
    ctrl: fc.boolean(),
    alt: fc.boolean(),
    shift: fc.boolean(),
    meta: fc.boolean(),
  });

  // Arbitrary for keystroke events with valid key names
  const keystrokeEventArbitrary: fc.Arbitrary<RecordedKeystrokeEvent> = fc.record({
    type: fc.constant('keystroke' as const),
    timestamp: fc.integer({ min: 0, max: 3600000 }),
    keyCode: fc.integer({ min: 1, max: 255 }),
    keyName: fc.string({ minLength: 1, maxLength: 20 }),
    modifiers: modifiersArbitrary,
  });

  describe('Property 10.1: Modifiers appear in correct order (Ctrl → Alt → Shift → Meta → Key)', () => {
    it('should format modifiers in the order Ctrl, Alt, Shift, Meta, then Key', () => {
      fc.assert(
        fc.property(
          keystrokeEventArbitrary,
          (event) => {
            const result = formatEventText(event);
            const parts = result.split(' + ');

            // Build expected order of modifiers that are active
            const expectedOrder: string[] = [];
            if (event.modifiers.ctrl) expectedOrder.push('Ctrl');
            if (event.modifiers.alt) expectedOrder.push('Alt');
            if (event.modifiers.shift) expectedOrder.push('Shift');
            if (event.modifiers.meta) expectedOrder.push('Meta');
            expectedOrder.push(event.keyName);

            // Verify the parts match the expected order
            expect(parts).toEqual(expectedOrder);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 10.2: Only active modifiers are shown', () => {
    it('should not include inactive modifiers in the output', () => {
      fc.assert(
        fc.property(
          keystrokeEventArbitrary,
          (event) => {
            const result = formatEventText(event);

            // Check that inactive modifiers are not present
            if (!event.modifiers.ctrl) {
              expect(result).not.toContain('Ctrl');
            }
            if (!event.modifiers.alt) {
              expect(result).not.toContain('Alt');
            }
            if (!event.modifiers.shift) {
              expect(result).not.toContain('Shift');
            }
            if (!event.modifiers.meta) {
              expect(result).not.toContain('Meta');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 10.3: Active modifiers are always shown', () => {
    it('should include all active modifiers in the output', () => {
      fc.assert(
        fc.property(
          keystrokeEventArbitrary,
          (event) => {
            const result = formatEventText(event);

            // Check that active modifiers are present
            if (event.modifiers.ctrl) {
              expect(result).toContain('Ctrl');
            }
            if (event.modifiers.alt) {
              expect(result).toContain('Alt');
            }
            if (event.modifiers.shift) {
              expect(result).toContain('Shift');
            }
            if (event.modifiers.meta) {
              expect(result).toContain('Meta');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 10.4: Parts are separated by " + "', () => {
    it('should use " + " as separator between all parts', () => {
      fc.assert(
        fc.property(
          keystrokeEventArbitrary,
          (event) => {
            const result = formatEventText(event);

            // Count expected parts
            let expectedPartCount = 1; // Always have the key
            if (event.modifiers.ctrl) expectedPartCount++;
            if (event.modifiers.alt) expectedPartCount++;
            if (event.modifiers.shift) expectedPartCount++;
            if (event.modifiers.meta) expectedPartCount++;

            // Split by " + " and verify part count
            const parts = result.split(' + ');
            expect(parts.length).toBe(expectedPartCount);

            // Verify no empty parts
            for (const part of parts) {
              expect(part.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 10.5: Key name is always the last part', () => {
    it('should always have the key name as the last element', () => {
      fc.assert(
        fc.property(
          keystrokeEventArbitrary,
          (event) => {
            const result = formatEventText(event);
            const parts = result.split(' + ');

            // The last part should be the key name
            expect(parts[parts.length - 1]).toBe(event.keyName);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 10.6: Event with no modifiers shows only key name', () => {
    it('should return only the key name when no modifiers are active', () => {
      fc.assert(
        fc.property(
          fc.record({
            type: fc.constant('keystroke' as const),
            timestamp: fc.integer({ min: 0, max: 3600000 }),
            keyCode: fc.integer({ min: 1, max: 255 }),
            keyName: fc.string({ minLength: 1, maxLength: 20 }),
            modifiers: fc.constant({
              ctrl: false,
              alt: false,
              shift: false,
              meta: false,
            }),
          }),
          (event) => {
            const result = formatEventText(event);

            // Should be exactly the key name with no separators
            expect(result).toBe(event.keyName);
            expect(result).not.toContain(' + ');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 10.7: Event with all modifiers shows all in correct order', () => {
    it('should show all modifiers in order when all are active', () => {
      fc.assert(
        fc.property(
          fc.record({
            type: fc.constant('keystroke' as const),
            timestamp: fc.integer({ min: 0, max: 3600000 }),
            keyCode: fc.integer({ min: 1, max: 255 }),
            keyName: fc.string({ minLength: 1, maxLength: 20 }),
            modifiers: fc.constant({
              ctrl: true,
              alt: true,
              shift: true,
              meta: true,
            }),
          }),
          (event) => {
            const result = formatEventText(event);
            const parts = result.split(' + ');

            // Should have exactly 5 parts: Ctrl, Alt, Shift, Meta, Key
            expect(parts.length).toBe(5);
            expect(parts[0]).toBe('Ctrl');
            expect(parts[1]).toBe('Alt');
            expect(parts[2]).toBe('Shift');
            expect(parts[3]).toBe('Meta');
            expect(parts[4]).toBe(event.keyName);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

/**
 * Property 11: Mouse Action Formatting
 * 
 * *For any* mouse click event (left, right, or middle button) with any combination 
 * of active modifiers, the formatted output SHALL include the button name 
 * ("Left Click", "Right Click", "Middle Click") and any active modifiers in the standard order.
 * 
 * **Validates: Requirements 6.2**
 * 
 * Feature: keystroke-editor-overlay, Property 11: Mouse Action Formatting
 */
describe('Property 11: Mouse Action Formatting', () => {
  // Arbitrary for modifier state
  const modifiersArbitrary = fc.record({
    ctrl: fc.boolean(),
    alt: fc.boolean(),
    shift: fc.boolean(),
    meta: fc.boolean(),
  });

  // Arbitrary for mouse events
  const mouseEventArbitrary: fc.Arbitrary<RecordedMouseClickEvent> = fc.record({
    type: fc.constant('mouse' as const),
    timestamp: fc.integer({ min: 0, max: 3600000 }),
    button: fc.constantFrom('left', 'right', 'middle'),
    modifiers: modifiersArbitrary,
  });

  // Map button to expected display name
  const buttonDisplayNames: Record<'left' | 'right' | 'middle', string> = {
    left: 'Left Click',
    right: 'Right Click',
    middle: 'Middle Click',
  };

  describe('Property 11.1: Mouse button is formatted correctly', () => {
    it('should format button as "Left Click", "Right Click", or "Middle Click"', () => {
      fc.assert(
        fc.property(
          mouseEventArbitrary,
          (event) => {
            const result = formatEventText(event);
            const expectedButtonName = buttonDisplayNames[event.button];

            // The result should contain the correct button name
            expect(result).toContain(expectedButtonName);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 11.2: Modifiers appear in correct order for mouse events', () => {
    it('should format modifiers in the order Ctrl, Alt, Shift, Meta, then button', () => {
      fc.assert(
        fc.property(
          mouseEventArbitrary,
          (event) => {
            const result = formatEventText(event);
            const parts = result.split(' + ');

            // Build expected order of modifiers that are active
            const expectedOrder: string[] = [];
            if (event.modifiers.ctrl) expectedOrder.push('Ctrl');
            if (event.modifiers.alt) expectedOrder.push('Alt');
            if (event.modifiers.shift) expectedOrder.push('Shift');
            if (event.modifiers.meta) expectedOrder.push('Meta');
            expectedOrder.push(buttonDisplayNames[event.button]);

            // Verify the parts match the expected order
            expect(parts).toEqual(expectedOrder);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 11.3: Only active modifiers are shown for mouse events', () => {
    it('should not include inactive modifiers in the output', () => {
      fc.assert(
        fc.property(
          mouseEventArbitrary,
          (event) => {
            const result = formatEventText(event);

            // Check that inactive modifiers are not present
            if (!event.modifiers.ctrl) {
              expect(result).not.toContain('Ctrl');
            }
            if (!event.modifiers.alt) {
              expect(result).not.toContain('Alt');
            }
            if (!event.modifiers.shift) {
              expect(result).not.toContain('Shift');
            }
            if (!event.modifiers.meta) {
              expect(result).not.toContain('Meta');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 11.4: Active modifiers are always shown for mouse events', () => {
    it('should include all active modifiers in the output', () => {
      fc.assert(
        fc.property(
          mouseEventArbitrary,
          (event) => {
            const result = formatEventText(event);

            // Check that active modifiers are present
            if (event.modifiers.ctrl) {
              expect(result).toContain('Ctrl');
            }
            if (event.modifiers.alt) {
              expect(result).toContain('Alt');
            }
            if (event.modifiers.shift) {
              expect(result).toContain('Shift');
            }
            if (event.modifiers.meta) {
              expect(result).toContain('Meta');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 11.5: Button name is always the last part', () => {
    it('should always have the button name as the last element', () => {
      fc.assert(
        fc.property(
          mouseEventArbitrary,
          (event) => {
            const result = formatEventText(event);
            const parts = result.split(' + ');
            const expectedButtonName = buttonDisplayNames[event.button];

            // The last part should be the button name
            expect(parts[parts.length - 1]).toBe(expectedButtonName);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 11.6: Mouse event with no modifiers shows only button name', () => {
    it('should return only the button name when no modifiers are active', () => {
      fc.assert(
        fc.property(
          fc.record({
            type: fc.constant('mouse' as const),
            timestamp: fc.integer({ min: 0, max: 3600000 }),
            button: fc.constantFrom('left', 'right', 'middle') as fc.Arbitrary<'left' | 'right' | 'middle'>,
            modifiers: fc.constant({
              ctrl: false,
              alt: false,
              shift: false,
              meta: false,
            }),
          }),
          (event) => {
            const result = formatEventText(event);
            const expectedButtonName = buttonDisplayNames[event.button];

            // Should be exactly the button name with no separators
            expect(result).toBe(expectedButtonName);
            expect(result).not.toContain(' + ');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 11.7: Mouse event with all modifiers shows all in correct order', () => {
    it('should show all modifiers in order when all are active', () => {
      fc.assert(
        fc.property(
          fc.record({
            type: fc.constant('mouse' as const),
            timestamp: fc.integer({ min: 0, max: 3600000 }),
            button: fc.constantFrom('left', 'right', 'middle') as fc.Arbitrary<'left' | 'right' | 'middle'>,
            modifiers: fc.constant({
              ctrl: true,
              alt: true,
              shift: true,
              meta: true,
            }),
          }),
          (event) => {
            const result = formatEventText(event);
            const parts = result.split(' + ');
            const expectedButtonName = buttonDisplayNames[event.button];

            // Should have exactly 5 parts: Ctrl, Alt, Shift, Meta, Button
            expect(parts.length).toBe(5);
            expect(parts[0]).toBe('Ctrl');
            expect(parts[1]).toBe('Alt');
            expect(parts[2]).toBe('Shift');
            expect(parts[3]).toBe('Meta');
            expect(parts[4]).toBe(expectedButtonName);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 11.8: Each button type formats correctly', () => {
    it('should format left button as "Left Click"', () => {
      const event: RecordedMouseClickEvent = {
        type: 'mouse',
        timestamp: 1000,
        button: 'left',
        modifiers: { ctrl: false, alt: false, shift: false, meta: false },
      };
      expect(formatEventText(event)).toBe('Left Click');
    });

    it('should format right button as "Right Click"', () => {
      const event: RecordedMouseClickEvent = {
        type: 'mouse',
        timestamp: 1000,
        button: 'right',
        modifiers: { ctrl: false, alt: false, shift: false, meta: false },
      };
      expect(formatEventText(event)).toBe('Right Click');
    });

    it('should format middle button as "Middle Click"', () => {
      const event: RecordedMouseClickEvent = {
        type: 'mouse',
        timestamp: 1000,
        button: 'middle',
        modifiers: { ctrl: false, alt: false, shift: false, meta: false },
      };
      expect(formatEventText(event)).toBe('Middle Click');
    });
  });
});
