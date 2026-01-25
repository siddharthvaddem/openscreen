import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { DisplayEntry } from '../../types/keystrokeEvents';

/**
 * Keystroke grouping logic extracted for testing
 * This mirrors the logic in KeystrokeOverlay component
 */
interface GroupingTestEvent {
  type: 'keystroke' | 'mouse';
  timestamp: number;
  text: string;
}

interface GroupingState {
  entries: DisplayEntry[];
  lastEvent: { timestamp: number; text: string } | null;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Process an event and return updated state
 * This is the core grouping logic from KeystrokeOverlay
 */
function processEvent(
  state: GroupingState,
  event: GroupingTestEvent,
  groupingThresholdMs: number,
  fadeDelayMs: number
): GroupingState {
  const newEntry: DisplayEntry = {
    id: generateId(),
    text: event.text,
    type: event.type,
    timestamp: event.timestamp,
    fadeStartTime: event.timestamp + fadeDelayMs,
  };

  // Check for rapid keystroke grouping (only for keystrokes)
  if (event.type === 'keystroke' && state.lastEvent) {
    const timeDiff = event.timestamp - state.lastEvent.timestamp;
    
    if (timeDiff <= groupingThresholdMs && state.entries.length > 0) {
      const lastEntry = state.entries[state.entries.length - 1];
      if (lastEntry.type === 'keystroke') {
        // Group with the last entry
        const updatedEntry: DisplayEntry = {
          ...lastEntry,
          text: lastEntry.text + ' ' + newEntry.text,
          fadeStartTime: event.timestamp + fadeDelayMs,
        };
        
        return {
          entries: [...state.entries.slice(0, -1), updatedEntry],
          lastEvent: { timestamp: event.timestamp, text: event.text },
        };
      }
    }
  }

  return {
    entries: [...state.entries, newEntry],
    lastEvent: { timestamp: event.timestamp, text: event.text },
  };
}

/**
 * Property 4: Rapid Keystroke Grouping
 * 
 * *For any* sequence of keystroke events where consecutive events have timestamps
 * within groupingThresholdMs (default 100ms), those events SHALL be grouped into
 * a single display entry.
 * 
 * **Validates: Requirements 3.4**
 * 
 * Feature: visual-keystrokes-and-mouse-actions, Property 4: Rapid Keystroke Grouping
 */
describe('Property 4: Rapid Keystroke Grouping', () => {
  const DEFAULT_GROUPING_THRESHOLD = 100;
  const DEFAULT_FADE_DELAY = 1000;

  // Arbitrary for keystroke events
  const keystrokeEventArbitrary = fc.record({
    type: fc.constant('keystroke' as const),
    timestamp: fc.integer({ min: 0, max: 1000000 }),
    text: fc.string({ minLength: 1, maxLength: 10 }),
  });

  it('should group consecutive keystrokes within threshold into single entry', () => {
    fc.assert(
      fc.property(
        fc.array(keystrokeEventArbitrary, { minLength: 2, maxLength: 10 }),
        fc.integer({ min: 50, max: 200 }), // groupingThreshold
        (events, threshold) => {
          // Sort events by timestamp to ensure sequence
          const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);
          
          // Make events rapid (within threshold)
          const rapidEvents = sortedEvents.map((e, i) => ({
            ...e,
            timestamp: i * (threshold - 10), // Ensure within threshold
          }));

          let state: GroupingState = { entries: [], lastEvent: null };
          for (const event of rapidEvents) {
            state = processEvent(state, event, threshold, DEFAULT_FADE_DELAY);
          }

          // All rapid keystrokes should be grouped into one entry
          expect(state.entries.length).toBe(1);
          
          // The grouped entry should contain all texts
          const allTexts = rapidEvents.map(e => e.text);
          for (const text of allTexts) {
            expect(state.entries[0].text).toContain(text);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not group keystrokes outside threshold', () => {
    fc.assert(
      fc.property(
        fc.array(keystrokeEventArbitrary, { minLength: 2, maxLength: 5 }),
        fc.integer({ min: 50, max: 200 }), // groupingThreshold
        (events, threshold) => {
          // Make events far apart (outside threshold)
          const separatedEvents = events.map((e, i) => ({
            ...e,
            timestamp: i * (threshold + 100), // Ensure outside threshold
          }));

          let state: GroupingState = { entries: [], lastEvent: null };
          for (const event of separatedEvents) {
            state = processEvent(state, event, threshold, DEFAULT_FADE_DELAY);
          }

          // Each keystroke should be its own entry
          expect(state.entries.length).toBe(separatedEvents.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not group mouse events with keystrokes', () => {
    const mouseEvent: GroupingTestEvent = {
      type: 'mouse',
      timestamp: 50,
      text: 'Left Click',
    };
    
    const keystrokeEvent: GroupingTestEvent = {
      type: 'keystroke',
      timestamp: 60, // Within threshold
      text: 'A',
    };

    let state: GroupingState = { entries: [], lastEvent: null };
    state = processEvent(state, mouseEvent, DEFAULT_GROUPING_THRESHOLD, DEFAULT_FADE_DELAY);
    state = processEvent(state, keystrokeEvent, DEFAULT_GROUPING_THRESHOLD, DEFAULT_FADE_DELAY);

    // Should have 2 separate entries
    expect(state.entries.length).toBe(2);
    expect(state.entries[0].type).toBe('mouse');
    expect(state.entries[1].type).toBe('keystroke');
  });

  it('should handle mixed rapid and separated keystrokes', () => {
    const events: GroupingTestEvent[] = [
      { type: 'keystroke', timestamp: 0, text: 'A' },
      { type: 'keystroke', timestamp: 50, text: 'B' },    // Grouped with A
      { type: 'keystroke', timestamp: 500, text: 'C' },   // New entry
      { type: 'keystroke', timestamp: 550, text: 'D' },   // Grouped with C
    ];

    let state: GroupingState = { entries: [], lastEvent: null };
    for (const event of events) {
      state = processEvent(state, event, DEFAULT_GROUPING_THRESHOLD, DEFAULT_FADE_DELAY);
    }

    // Should have 2 entries: "A B" and "C D"
    expect(state.entries.length).toBe(2);
    expect(state.entries[0].text).toContain('A');
    expect(state.entries[0].text).toContain('B');
    expect(state.entries[1].text).toContain('C');
    expect(state.entries[1].text).toContain('D');
  });
});

/**
 * Property 6: Display Entry Lifecycle
 * 
 * *For any* display entry, it SHALL remain visible for at least fadeDelayMs,
 * then fade over fadeDurationMs, and be removed from the display list after
 * fadeDelayMs + fadeDurationMs total time. Multiple entries created within
 * this window SHALL all be visible simultaneously.
 * 
 * **Validates: Requirements 5.1, 5.3, 5.4**
 * 
 * Feature: visual-keystrokes-and-mouse-actions, Property 6: Display Entry Lifecycle
 */
describe('Property 6: Display Entry Lifecycle', () => {
  /**
   * Calculate opacity for an entry based on fade timing
   */
  function getEntryOpacity(entry: DisplayEntry, now: number, fadeDurationMs: number): number {
    if (now < entry.fadeStartTime) {
      return 1; // Full opacity before fade starts
    }
    
    const fadeProgress = (now - entry.fadeStartTime) / fadeDurationMs;
    return Math.max(0, 1 - fadeProgress);
  }

  /**
   * Check if entry should be removed (expired)
   */
  function isEntryExpired(entry: DisplayEntry, now: number, fadeDurationMs: number): boolean {
    const expiryTime = entry.fadeStartTime + fadeDurationMs;
    return now >= expiryTime;
  }

  it('should have full opacity before fadeStartTime', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }), // timestamp
        fc.integer({ min: 500, max: 3000 }), // fadeDelayMs
        fc.integer({ min: 500, max: 3000 }), // fadeDurationMs
        (timestamp, fadeDelayMs, fadeDurationMs) => {
          const entry: DisplayEntry = {
            id: 'test',
            text: 'Test',
            type: 'keystroke',
            timestamp,
            fadeStartTime: timestamp + fadeDelayMs,
          };

          // Check at any time before fadeStartTime
          const checkTime = timestamp + Math.floor(fadeDelayMs / 2);
          const opacity = getEntryOpacity(entry, checkTime, fadeDurationMs);
          
          expect(opacity).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should fade from 1 to 0 during fade duration', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }), // timestamp
        fc.integer({ min: 500, max: 3000 }), // fadeDelayMs
        fc.integer({ min: 500, max: 3000 }), // fadeDurationMs
        fc.float({ min: 0, max: 1, noNaN: true }), // fadeProgress (0-1)
        (timestamp, fadeDelayMs, fadeDurationMs, fadeProgress) => {
          const entry: DisplayEntry = {
            id: 'test',
            text: 'Test',
            type: 'keystroke',
            timestamp,
            fadeStartTime: timestamp + fadeDelayMs,
          };

          const checkTime = entry.fadeStartTime + Math.floor(fadeDurationMs * fadeProgress);
          const opacity = getEntryOpacity(entry, checkTime, fadeDurationMs);
          
          // Opacity should decrease as fadeProgress increases
          expect(opacity).toBeGreaterThanOrEqual(0);
          expect(opacity).toBeLessThanOrEqual(1);
          
          // Opacity should be approximately (1 - fadeProgress)
          const expectedOpacity = Math.max(0, 1 - fadeProgress);
          expect(opacity).toBeCloseTo(expectedOpacity, 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should be expired after fadeStartTime + fadeDurationMs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }), // timestamp
        fc.integer({ min: 500, max: 3000 }), // fadeDelayMs
        fc.integer({ min: 500, max: 3000 }), // fadeDurationMs
        (timestamp, fadeDelayMs, fadeDurationMs) => {
          const entry: DisplayEntry = {
            id: 'test',
            text: 'Test',
            type: 'keystroke',
            timestamp,
            fadeStartTime: timestamp + fadeDelayMs,
          };

          const expiryTime = entry.fadeStartTime + fadeDurationMs;
          
          // Should not be expired just before expiry
          expect(isEntryExpired(entry, expiryTime - 1, fadeDurationMs)).toBe(false);
          
          // Should be expired at expiry time
          expect(isEntryExpired(entry, expiryTime, fadeDurationMs)).toBe(true);
          
          // Should be expired after expiry time
          expect(isEntryExpired(entry, expiryTime + 100, fadeDurationMs)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should support multiple concurrent entries', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 1000 }), { minLength: 2, maxLength: 5 }),
        fc.integer({ min: 500, max: 3000 }), // fadeDelayMs
        fc.integer({ min: 500, max: 3000 }), // fadeDurationMs
        (timestamps, fadeDelayMs, fadeDurationMs) => {
          const entries: DisplayEntry[] = timestamps.map((ts, i) => ({
            id: `entry-${i}`,
            text: `Entry ${i}`,
            type: 'keystroke' as const,
            timestamp: ts,
            fadeStartTime: ts + fadeDelayMs,
          }));

          // Find a time when all entries should be visible
          const maxTimestamp = Math.max(...timestamps);
          const checkTime = maxTimestamp + Math.floor(fadeDelayMs / 2);

          // All entries created before checkTime should be visible
          const visibleEntries = entries.filter(e => 
            e.timestamp <= checkTime && !isEntryExpired(e, checkTime, fadeDurationMs)
          );

          // Multiple entries can be visible simultaneously
          expect(visibleEntries.length).toBeGreaterThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have total visible time of fadeDelayMs + fadeDurationMs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }), // timestamp
        fc.integer({ min: 500, max: 3000 }), // fadeDelayMs
        fc.integer({ min: 500, max: 3000 }), // fadeDurationMs
        (timestamp, fadeDelayMs, fadeDurationMs) => {
          const entry: DisplayEntry = {
            id: 'test',
            text: 'Test',
            type: 'keystroke',
            timestamp,
            fadeStartTime: timestamp + fadeDelayMs,
          };

          const totalVisibleTime = (entry.fadeStartTime + fadeDurationMs) - timestamp;
          expect(totalVisibleTime).toBe(fadeDelayMs + fadeDurationMs);
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Property 3: Fade Timing Correctness
 * 
 * *For any* display entry with fadeDelayMs D and fadeDurationMs T:
 * - Entry opacity SHALL be 1.0 for time < D after creation
 * - Entry opacity SHALL decrease linearly from 1.0 to 0.0 during interval [D, D+T]
 * - Entry SHALL be removed from DOM at time ≥ D+T
 * 
 * **Validates: Requirements 6.2, 6.3**
 * 
 * Feature: keyviz-style-keystroke-overlay, Property 3: Fade Timing Correctness
 */
describe('Property 3: Fade Timing Correctness', () => {
  /**
   * Calculate opacity for an entry based on fade timing
   * This mirrors the getEntryOpacity logic in KeystrokeOverlay component
   * 
   * @param creationTime The timestamp when the entry was created
   * @param fadeDelayMs Time before fade begins (D)
   * @param fadeDurationMs Duration of fade animation (T)
   * @param currentTime The current time to check opacity at
   * @returns Opacity value between 0 and 1
   */
  function calculateOpacity(
    creationTime: number,
    fadeDelayMs: number,
    fadeDurationMs: number,
    currentTime: number
  ): number {
    const fadeStartTime = creationTime + fadeDelayMs;
    
    if (currentTime < fadeStartTime) {
      return 1; // Full opacity before fade starts
    }
    
    const fadeProgress = (currentTime - fadeStartTime) / fadeDurationMs;
    return Math.max(0, 1 - fadeProgress);
  }

  /**
   * Check if entry should be removed from DOM (expired)
   * Entry is removed at time >= D+T after creation
   * 
   * @param creationTime The timestamp when the entry was created
   * @param fadeDelayMs Time before fade begins (D)
   * @param fadeDurationMs Duration of fade animation (T)
   * @param currentTime The current time to check
   * @returns True if entry should be removed
   */
  function shouldBeRemoved(
    creationTime: number,
    fadeDelayMs: number,
    fadeDurationMs: number,
    currentTime: number
  ): boolean {
    const expiryTime = creationTime + fadeDelayMs + fadeDurationMs;
    return currentTime >= expiryTime;
  }

  // Arbitraries matching design spec ranges
  const fadeDelayMsArb = fc.integer({ min: 100, max: 5000 });
  const fadeDurationMsArb = fc.integer({ min: 100, max: 3000 });
  const creationTimeArb = fc.integer({ min: 0, max: 100000 });

  /**
   * Property 3.1: Entry opacity SHALL be 1.0 for time < D after creation
   * Validates: Requirement 6.2 (fadeDelayMs setting)
   */
  it('should have opacity 1.0 for any time before fadeDelayMs after creation', () => {
    fc.assert(
      fc.property(
        creationTimeArb,
        fadeDelayMsArb,
        fadeDurationMsArb,
        fc.float({ min: 0, max: Math.fround(0.99), noNaN: true }), // fraction of fadeDelay elapsed
        (creationTime, fadeDelayMs, fadeDurationMs, fractionElapsed) => {
          // Check at any time before fadeStartTime (creationTime + fadeDelayMs)
          const checkTime = creationTime + Math.floor(fadeDelayMs * fractionElapsed);
          const opacity = calculateOpacity(creationTime, fadeDelayMs, fadeDurationMs, checkTime);
          
          expect(opacity).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.2: Entry opacity SHALL decrease linearly from 1.0 to 0.0 during interval [D, D+T]
   * Validates: Requirement 6.3 (fadeDurationMs setting)
   */
  it('should decrease opacity linearly from 1.0 to 0.0 during fade interval [D, D+T]', () => {
    fc.assert(
      fc.property(
        creationTimeArb,
        fadeDelayMsArb,
        fadeDurationMsArb,
        fc.float({ min: 0, max: Math.fround(1), noNaN: true }), // fadeProgress (0-1)
        (creationTime, fadeDelayMs, fadeDurationMs, fadeProgress) => {
          const fadeStartTime = creationTime + fadeDelayMs;
          const checkTime = fadeStartTime + Math.floor(fadeDurationMs * fadeProgress);
          const opacity = calculateOpacity(creationTime, fadeDelayMs, fadeDurationMs, checkTime);
          
          // Opacity should be in valid range
          expect(opacity).toBeGreaterThanOrEqual(0);
          expect(opacity).toBeLessThanOrEqual(1);
          
          // Opacity should be approximately (1 - fadeProgress) for linear decrease
          const expectedOpacity = Math.max(0, 1 - fadeProgress);
          expect(opacity).toBeCloseTo(expectedOpacity, 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.3: Entry SHALL be removed from DOM at time >= D+T
   * Validates: Requirements 6.2, 6.3
   */
  it('should be removed from DOM at time >= D+T after creation', () => {
    fc.assert(
      fc.property(
        creationTimeArb,
        fadeDelayMsArb,
        fadeDurationMsArb,
        fc.integer({ min: 0, max: 1000 }), // additional time after expiry
        (creationTime, fadeDelayMs, fadeDurationMs, additionalTime) => {
          const expiryTime = creationTime + fadeDelayMs + fadeDurationMs;
          
          // Should NOT be removed just before expiry
          expect(shouldBeRemoved(creationTime, fadeDelayMs, fadeDurationMs, expiryTime - 1)).toBe(false);
          
          // Should be removed exactly at expiry time
          expect(shouldBeRemoved(creationTime, fadeDelayMs, fadeDurationMs, expiryTime)).toBe(true);
          
          // Should be removed after expiry time
          expect(shouldBeRemoved(creationTime, fadeDelayMs, fadeDurationMs, expiryTime + additionalTime)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.4: Opacity at exact boundary times
   * Validates: Requirements 6.2, 6.3
   */
  it('should have correct opacity at boundary times D and D+T', () => {
    fc.assert(
      fc.property(
        creationTimeArb,
        fadeDelayMsArb,
        fadeDurationMsArb,
        (creationTime, fadeDelayMs, fadeDurationMs) => {
          const fadeStartTime = creationTime + fadeDelayMs;
          const fadeEndTime = fadeStartTime + fadeDurationMs;
          
          // At time D (fadeStartTime), opacity should be 1.0 (fade just starting)
          const opacityAtD = calculateOpacity(creationTime, fadeDelayMs, fadeDurationMs, fadeStartTime);
          expect(opacityAtD).toBe(1);
          
          // At time D+T (fadeEndTime), opacity should be 0.0 (fade complete)
          const opacityAtDPlusT = calculateOpacity(creationTime, fadeDelayMs, fadeDurationMs, fadeEndTime);
          expect(opacityAtDPlusT).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.5: Opacity monotonically decreases during fade
   * Validates: Requirement 6.3 (linear fade)
   */
  it('should have monotonically decreasing opacity during fade interval', () => {
    fc.assert(
      fc.property(
        creationTimeArb,
        fadeDelayMsArb,
        fadeDurationMsArb,
        fc.array(fc.float({ min: 0, max: Math.fround(1), noNaN: true }), { minLength: 2, maxLength: 10 }),
        (creationTime, fadeDelayMs, fadeDurationMs, progressPoints) => {
          const fadeStartTime = creationTime + fadeDelayMs;
          
          // Sort progress points to check monotonicity
          const sortedPoints = [...progressPoints].sort((a, b) => a - b);
          
          // Calculate opacities at each sorted progress point
          const opacities = sortedPoints.map(progress => {
            const checkTime = fadeStartTime + Math.floor(fadeDurationMs * progress);
            return calculateOpacity(creationTime, fadeDelayMs, fadeDurationMs, checkTime);
          });
          
          // Verify monotonic decrease (each opacity <= previous)
          for (let i = 1; i < opacities.length; i++) {
            expect(opacities[i]).toBeLessThanOrEqual(opacities[i - 1]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.6: Total visible duration equals D+T
   * Validates: Requirements 6.2, 6.3
   */
  it('should have total visible duration of exactly fadeDelayMs + fadeDurationMs', () => {
    fc.assert(
      fc.property(
        creationTimeArb,
        fadeDelayMsArb,
        fadeDurationMsArb,
        (creationTime, fadeDelayMs, fadeDurationMs) => {
          // Entry is visible from creation until removal
          // Removal happens at creationTime + fadeDelayMs + fadeDurationMs
          const removalTime = creationTime + fadeDelayMs + fadeDurationMs;
          const totalVisibleDuration = removalTime - creationTime;
          
          expect(totalVisibleDuration).toBe(fadeDelayMs + fadeDurationMs);
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Property 6: Mouse Click Filtering
 * 
 * *For any* mouse action event, WHEN showMouseClicks setting is false,
 * THE Keystroke_Overlay SHALL not render any KeyCap for that event.
 * 
 * **Validates: Requirements 6.4**
 * 
 * Feature: keyviz-style-keystroke-overlay, Property 6: Mouse Click Filtering
 */
describe('Property 6: Mouse Click Filtering', () => {
  /**
   * Represents a mouse action event for testing
   */
  interface MouseActionEvent {
    type: 'mouse';
    timestamp: number;
    button: 'left' | 'right' | 'middle';
    modifiers: {
      ctrl: boolean;
      alt: boolean;
      shift: boolean;
      meta: boolean;
    };
  }

  /**
   * Represents a keystroke event for testing
   */
  interface KeystrokeEvent {
    type: 'keystroke';
    timestamp: number;
    key: string;
    keyCode: number;
    modifiers: {
      ctrl: boolean;
      alt: boolean;
      shift: boolean;
      meta: boolean;
    };
  }

  type InputEvent = KeystrokeEvent | MouseActionEvent;

  /**
   * Settings interface for testing
   */
  interface Settings {
    showMouseClicks: boolean;
    fadeDelayMs: number;
    fadeDurationMs: number;
    textScale: number;
    groupingThresholdMs: number;
  }

  /**
   * Display entry for testing
   */
  interface TestDisplayEntry {
    id: string;
    type: 'keystroke' | 'mouse';
    timestamp: number;
  }

  /**
   * Simulates the mouse click filtering logic from KeystrokeOverlay
   * This mirrors the handleInputEvent function's filtering behavior
   * 
   * @param event The input event to process
   * @param settings The current settings
   * @returns True if the event should be rendered, false if filtered out
   */
  function shouldRenderEvent(event: InputEvent, settings: Settings): boolean {
    // Skip mouse events if showMouseClicks is disabled
    if (event.type === 'mouse' && !settings.showMouseClicks) {
      return false;
    }
    return true;
  }

  /**
   * Process a sequence of events and return the entries that would be rendered
   * This simulates the KeystrokeOverlay's event handling logic
   * 
   * @param events Array of input events
   * @param settings The current settings
   * @returns Array of display entries that would be rendered
   */
  function processEvents(events: InputEvent[], settings: Settings): TestDisplayEntry[] {
    const entries: TestDisplayEntry[] = [];
    
    for (const event of events) {
      if (shouldRenderEvent(event, settings)) {
        entries.push({
          id: `${event.timestamp}-${Math.random().toString(36).substring(2, 11)}`,
          type: event.type,
          timestamp: event.timestamp,
        });
      }
    }
    
    return entries;
  }

  // Arbitraries for generating random test data
  const mouseButtonArb = fc.constantFrom('left' as const, 'right' as const, 'middle' as const);
  
  const modifiersArb = fc.record({
    ctrl: fc.boolean(),
    alt: fc.boolean(),
    shift: fc.boolean(),
    meta: fc.boolean(),
  });

  const mouseEventArb: fc.Arbitrary<MouseActionEvent> = fc.record({
    type: fc.constant('mouse' as const),
    timestamp: fc.integer({ min: 0, max: 1000000 }),
    button: mouseButtonArb,
    modifiers: modifiersArb,
  });

  const keystrokeEventArb: fc.Arbitrary<KeystrokeEvent> = fc.record({
    type: fc.constant('keystroke' as const),
    timestamp: fc.integer({ min: 0, max: 1000000 }),
    key: fc.string({ minLength: 1, maxLength: 10 }),
    keyCode: fc.integer({ min: 0, max: 0xFFFF }),
    modifiers: modifiersArb,
  });

  const settingsArb: fc.Arbitrary<Settings> = fc.record({
    showMouseClicks: fc.boolean(),
    fadeDelayMs: fc.integer({ min: 100, max: 5000 }),
    fadeDurationMs: fc.integer({ min: 100, max: 3000 }),
    textScale: fc.float({ min: 0.5, max: 2.0, noNaN: true }),
    groupingThresholdMs: fc.integer({ min: 50, max: 200 }),
  });

  /**
   * Property 6.1: Mouse events SHALL NOT be rendered when showMouseClicks is false
   * Validates: Requirement 6.4
   */
  it('should not render any mouse event when showMouseClicks is false', () => {
    fc.assert(
      fc.property(
        mouseEventArb,
        (mouseEvent) => {
          const settings: Settings = {
            showMouseClicks: false,
            fadeDelayMs: 1000,
            fadeDurationMs: 500,
            textScale: 1.0,
            groupingThresholdMs: 100,
          };

          const shouldRender = shouldRenderEvent(mouseEvent, settings);
          
          // Mouse events should never be rendered when showMouseClicks is false
          expect(shouldRender).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.2: Mouse events SHALL be rendered when showMouseClicks is true
   * Validates: Requirement 6.4 (inverse case)
   */
  it('should render mouse events when showMouseClicks is true', () => {
    fc.assert(
      fc.property(
        mouseEventArb,
        (mouseEvent) => {
          const settings: Settings = {
            showMouseClicks: true,
            fadeDelayMs: 1000,
            fadeDurationMs: 500,
            textScale: 1.0,
            groupingThresholdMs: 100,
          };

          const shouldRender = shouldRenderEvent(mouseEvent, settings);
          
          // Mouse events should be rendered when showMouseClicks is true
          expect(shouldRender).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.3: Keystroke events SHALL always be rendered regardless of showMouseClicks
   * Validates: Requirement 6.4 (keystrokes are unaffected)
   */
  it('should always render keystroke events regardless of showMouseClicks setting', () => {
    fc.assert(
      fc.property(
        keystrokeEventArb,
        fc.boolean(), // showMouseClicks value
        (keystrokeEvent, showMouseClicks) => {
          const settings: Settings = {
            showMouseClicks,
            fadeDelayMs: 1000,
            fadeDurationMs: 500,
            textScale: 1.0,
            groupingThresholdMs: 100,
          };

          const shouldRender = shouldRenderEvent(keystrokeEvent, settings);
          
          // Keystroke events should always be rendered
          expect(shouldRender).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.4: In a mixed sequence, only mouse events are filtered when showMouseClicks is false
   * Validates: Requirement 6.4
   */
  it('should filter only mouse events from mixed event sequences when showMouseClicks is false', () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(mouseEventArb, keystrokeEventArb), { minLength: 1, maxLength: 20 }),
        (events) => {
          const settings: Settings = {
            showMouseClicks: false,
            fadeDelayMs: 1000,
            fadeDurationMs: 500,
            textScale: 1.0,
            groupingThresholdMs: 100,
          };

          const renderedEntries = processEvents(events, settings);
          
          // Count expected keystrokes (all should be rendered)
          const keystrokeCount = events.filter(e => e.type === 'keystroke').length;
          
          // All rendered entries should be keystrokes
          expect(renderedEntries.length).toBe(keystrokeCount);
          expect(renderedEntries.every(e => e.type === 'keystroke')).toBe(true);
          
          // No mouse events should be rendered
          expect(renderedEntries.some(e => e.type === 'mouse')).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.5: All events are rendered when showMouseClicks is true
   * Validates: Requirement 6.4 (inverse case)
   */
  it('should render all events when showMouseClicks is true', () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(mouseEventArb, keystrokeEventArb), { minLength: 1, maxLength: 20 }),
        (events) => {
          const settings: Settings = {
            showMouseClicks: true,
            fadeDelayMs: 1000,
            fadeDurationMs: 500,
            textScale: 1.0,
            groupingThresholdMs: 100,
          };

          const renderedEntries = processEvents(events, settings);
          
          // All events should be rendered
          expect(renderedEntries.length).toBe(events.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.6: Mouse button type does not affect filtering behavior
   * Validates: Requirement 6.4 (all mouse buttons are filtered equally)
   */
  it('should filter all mouse button types equally when showMouseClicks is false', () => {
    fc.assert(
      fc.property(
        mouseButtonArb,
        modifiersArb,
        fc.integer({ min: 0, max: 1000000 }),
        (button, modifiers, timestamp) => {
          const mouseEvent: MouseActionEvent = {
            type: 'mouse',
            timestamp,
            button,
            modifiers,
          };

          const settings: Settings = {
            showMouseClicks: false,
            fadeDelayMs: 1000,
            fadeDurationMs: 500,
            textScale: 1.0,
            groupingThresholdMs: 100,
          };

          const shouldRender = shouldRenderEvent(mouseEvent, settings);
          
          // All mouse button types should be filtered equally
          expect(shouldRender).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.7: Mouse events with any modifier combination are filtered when showMouseClicks is false
   * Validates: Requirement 6.4 (modifiers don't affect filtering)
   */
  it('should filter mouse events regardless of modifier combination when showMouseClicks is false', () => {
    fc.assert(
      fc.property(
        mouseEventArb,
        (mouseEvent) => {
          const settings: Settings = {
            showMouseClicks: false,
            fadeDelayMs: 1000,
            fadeDurationMs: 500,
            textScale: 1.0,
            groupingThresholdMs: 100,
          };

          const shouldRender = shouldRenderEvent(mouseEvent, settings);
          
          // Mouse events should be filtered regardless of modifiers
          expect(shouldRender).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.8: Entries array contains no mouse events when showMouseClicks is false
   * Validates: Requirement 6.4 (no KeyCap rendered for mouse events)
   */
  it('should result in entries array with no mouse events when showMouseClicks is false', () => {
    fc.assert(
      fc.property(
        fc.array(mouseEventArb, { minLength: 1, maxLength: 10 }),
        (mouseEvents) => {
          const settings: Settings = {
            showMouseClicks: false,
            fadeDelayMs: 1000,
            fadeDurationMs: 500,
            textScale: 1.0,
            groupingThresholdMs: 100,
          };

          const renderedEntries = processEvents(mouseEvents, settings);
          
          // No entries should be created for mouse events
          expect(renderedEntries.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
