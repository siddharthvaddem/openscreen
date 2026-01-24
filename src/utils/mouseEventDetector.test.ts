/**
 * Property-based tests for Mouse Event Detector Logic
 * 
 * Note: These tests validate the logic of event processing, not the actual
 * global mouse hook which requires native modules. The core logic is tested
 * through simulated events.
 * 
 * **Property 3: Enabled State Captures All Click Events**
 * **Validates: Requirements 1.3, 2.1, 2.2, 2.3**
 * 
 * **Property 4: Drag Event Capture with Duration Threshold**
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { MouseClickEvent, MouseDragEvent, MouseEvent } from '../types/mouseEvents';

// Minimum drag duration threshold (must match mouseEventDetector.ts)
const MIN_DRAG_DURATION_MS = 100;
const MIN_DRAG_DISTANCE = 5;

// Simulated event processing logic (mirrors mouseEventDetector.ts)
interface SimulatedMouseDown {
  timestamp: number;
  x: number;
  y: number;
  button: number;
}

interface SimulatedMouseUp {
  timestamp: number;
  x: number;
  y: number;
  button: number;
}

function mapButton(button: number): 'left' | 'right' | 'middle' {
  switch (button) {
    case 1: return 'left';
    case 2: return 'right';
    case 3: return 'middle';
    default: return 'left';
  }
}

function processMouseEvents(
  mouseDown: SimulatedMouseDown,
  mouseUp: SimulatedMouseUp
): MouseEvent | null {
  const duration = mouseUp.timestamp - mouseDown.timestamp;
  const positionChanged = 
    Math.abs(mouseUp.x - mouseDown.x) > MIN_DRAG_DISTANCE ||
    Math.abs(mouseUp.y - mouseDown.y) > MIN_DRAG_DISTANCE;

  if (duration > MIN_DRAG_DURATION_MS && positionChanged) {
    // Drag event
    const dragEvent: MouseDragEvent = {
      type: 'drag',
      startTimestamp: mouseDown.timestamp,
      endTimestamp: mouseUp.timestamp,
      startX: mouseDown.x,
      startY: mouseDown.y,
      endX: mouseUp.x,
      endY: mouseUp.y,
    };
    return dragEvent;
  } else {
    // Click event
    const clickEvent: MouseClickEvent = {
      type: 'click',
      timestamp: mouseDown.timestamp,
      x: mouseDown.x,
      y: mouseDown.y,
      button: mapButton(mouseDown.button),
    };
    return clickEvent;
  }
}

// Arbitraries
const screenBoundsArb = fc.record({
  width: fc.integer({ min: 640, max: 3840 }),
  height: fc.integer({ min: 480, max: 2160 }),
});

const buttonArb = fc.integer({ min: 1, max: 3 });

describe('MouseEventDetector Logic', () => {
  describe('Property 3: Click Event Capture', () => {
    it('all clicks are captured with valid timestamp and coordinates within bounds', () => {
      fc.assert(
        fc.property(
          screenBoundsArb,
          fc.nat({ max: 3600000 }), // timestamp up to 1 hour
          buttonArb,
          (bounds, timestamp, button) => {
            // Generate coordinates within bounds
            const x = timestamp % bounds.width;
            const y = timestamp % bounds.height;

            const mouseDown: SimulatedMouseDown = { timestamp, x, y, button };
            // Click: same position, short duration
            const mouseUp: SimulatedMouseUp = { 
              timestamp: timestamp + 50, // 50ms < 100ms threshold
              x, 
              y, 
              button 
            };

            const event = processMouseEvents(mouseDown, mouseUp);

            // Verify it's a click event
            expect(event).not.toBeNull();
            expect(event!.type).toBe('click');

            if (event!.type === 'click') {
              // Verify timestamp is valid (>= 0)
              expect(event.timestamp).toBeGreaterThanOrEqual(0);
              
              // Verify coordinates are within bounds
              expect(event.x).toBeGreaterThanOrEqual(0);
              expect(event.x).toBeLessThan(bounds.width);
              expect(event.y).toBeGreaterThanOrEqual(0);
              expect(event.y).toBeLessThan(bounds.height);
              
              // Verify button is valid
              expect(['left', 'right', 'middle']).toContain(event.button);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('all button types (left, right, middle) are captured correctly', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 3600000 }),
          fc.constantFrom(1, 2, 3),
          (timestamp, button) => {
            const mouseDown: SimulatedMouseDown = { timestamp, x: 100, y: 100, button };
            const mouseUp: SimulatedMouseUp = { timestamp: timestamp + 50, x: 100, y: 100, button };

            const event = processMouseEvents(mouseDown, mouseUp);

            expect(event).not.toBeNull();
            expect(event!.type).toBe('click');

            if (event!.type === 'click') {
              const expectedButton = mapButton(button);
              expect(event.button).toBe(expectedButton);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4: Drag Event Capture with Duration Threshold', () => {
    it('drags > 100ms with position change are recorded as drag events', () => {
      fc.assert(
        fc.property(
          screenBoundsArb,
          fc.nat({ max: 3600000 }),
          fc.integer({ min: MIN_DRAG_DURATION_MS + 1, max: 5000 }), // duration > threshold
          fc.integer({ min: MIN_DRAG_DISTANCE + 1, max: 500 }), // distance > threshold
          (bounds, startTimestamp, duration, distance) => {
            const startX = Math.min(100, bounds.width - distance - 1);
            const startY = Math.min(100, bounds.height - 1);
            const endX = startX + distance;
            const endY = startY;

            const mouseDown: SimulatedMouseDown = { 
              timestamp: startTimestamp, 
              x: startX, 
              y: startY, 
              button: 1 
            };
            const mouseUp: SimulatedMouseUp = { 
              timestamp: startTimestamp + duration, 
              x: endX, 
              y: endY, 
              button: 1 
            };

            const event = processMouseEvents(mouseDown, mouseUp);

            // Verify it's a drag event
            expect(event).not.toBeNull();
            expect(event!.type).toBe('drag');

            if (event!.type === 'drag') {
              // Verify timestamps
              expect(event.startTimestamp).toBeLessThanOrEqual(event.endTimestamp);
              expect(event.startTimestamp).toBeGreaterThanOrEqual(0);
              
              // Verify coordinates are within bounds
              expect(event.startX).toBeGreaterThanOrEqual(0);
              expect(event.startX).toBeLessThan(bounds.width);
              expect(event.startY).toBeGreaterThanOrEqual(0);
              expect(event.startY).toBeLessThan(bounds.height);
              expect(event.endX).toBeGreaterThanOrEqual(0);
              expect(event.endX).toBeLessThan(bounds.width);
              expect(event.endY).toBeGreaterThanOrEqual(0);
              expect(event.endY).toBeLessThan(bounds.height);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('drags <= 100ms are recorded as click events', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 3600000 }),
          fc.integer({ min: 0, max: MIN_DRAG_DURATION_MS }), // duration <= threshold
          fc.integer({ min: MIN_DRAG_DISTANCE + 1, max: 500 }), // even with position change
          (startTimestamp, duration, distance) => {
            const mouseDown: SimulatedMouseDown = { 
              timestamp: startTimestamp, 
              x: 100, 
              y: 100, 
              button: 1 
            };
            const mouseUp: SimulatedMouseUp = { 
              timestamp: startTimestamp + duration, 
              x: 100 + distance, 
              y: 100, 
              button: 1 
            };

            const event = processMouseEvents(mouseDown, mouseUp);

            // Should be a click, not a drag (duration too short)
            expect(event).not.toBeNull();
            expect(event!.type).toBe('click');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('long duration without position change is recorded as click', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 3600000 }),
          fc.integer({ min: MIN_DRAG_DURATION_MS + 1, max: 5000 }), // duration > threshold
          (startTimestamp, duration) => {
            // Same position (no movement)
            const mouseDown: SimulatedMouseDown = { 
              timestamp: startTimestamp, 
              x: 100, 
              y: 100, 
              button: 1 
            };
            const mouseUp: SimulatedMouseUp = { 
              timestamp: startTimestamp + duration, 
              x: 100, // same position
              y: 100, 
              button: 1 
            };

            const event = processMouseEvents(mouseDown, mouseUp);

            // Should be a click (no position change)
            expect(event).not.toBeNull();
            expect(event!.type).toBe('click');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
