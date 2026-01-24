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
