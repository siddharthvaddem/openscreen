/**
 * Property-based tests for Mouse Event types
 * 
 * **Property 9: Mouse Event Data Serialization Round-Trip**
 * **Validates: Requirements 7.3**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { MouseClickEvent, MouseDragEvent, MouseEvent, MouseEventData } from './mouseEvents';

// Arbitraries for generating random mouse events
const mouseButtonArb = fc.constantFrom('left', 'right', 'middle') as fc.Arbitrary<'left' | 'right' | 'middle'>;

const mouseClickEventArb: fc.Arbitrary<MouseClickEvent> = fc.record({
  type: fc.constant('click' as const),
  timestamp: fc.nat({ max: 3600000 }), // up to 1 hour in ms
  x: fc.nat({ max: 3840 }), // up to 4K width
  y: fc.nat({ max: 2160 }), // up to 4K height
  button: mouseButtonArb,
});

const mouseDragEventArb: fc.Arbitrary<MouseDragEvent> = fc.record({
  type: fc.constant('drag' as const),
  startTimestamp: fc.nat({ max: 3600000 }),
  endTimestamp: fc.nat({ max: 3600000 }),
  startX: fc.nat({ max: 3840 }),
  startY: fc.nat({ max: 2160 }),
  endX: fc.nat({ max: 3840 }),
  endY: fc.nat({ max: 2160 }),
}).map(event => ({
  ...event,
  // Ensure endTimestamp >= startTimestamp
  endTimestamp: event.startTimestamp + Math.abs(event.endTimestamp - event.startTimestamp),
}));

const mouseEventArb: fc.Arbitrary<MouseEvent> = fc.oneof(mouseClickEventArb, mouseDragEventArb);

const mouseEventDataArb: fc.Arbitrary<MouseEventData> = fc.record({
  version: fc.constant(1 as const),
  recordingId: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  screenWidth: fc.integer({ min: 640, max: 7680 }), // 640 to 8K
  screenHeight: fc.integer({ min: 480, max: 4320 }), // 480 to 8K
  events: fc.array(mouseEventArb, { minLength: 0, maxLength: 100 }),
});

describe('MouseEventData Serialization', () => {
  it('Property 9: serialization round-trip preserves all data', () => {
    fc.assert(
      fc.property(mouseEventDataArb, (eventData) => {
        // Serialize to JSON
        const serialized = JSON.stringify(eventData);
        
        // Deserialize back
        const deserialized = JSON.parse(serialized) as MouseEventData;
        
        // Verify all fields are preserved
        expect(deserialized.version).toBe(eventData.version);
        expect(deserialized.recordingId).toBe(eventData.recordingId);
        expect(deserialized.screenWidth).toBe(eventData.screenWidth);
        expect(deserialized.screenHeight).toBe(eventData.screenHeight);
        expect(deserialized.events.length).toBe(eventData.events.length);
        
        // Verify each event is preserved
        for (let i = 0; i < eventData.events.length; i++) {
          const original = eventData.events[i];
          const restored = deserialized.events[i];
          
          expect(restored.type).toBe(original.type);
          
          if (original.type === 'click' && restored.type === 'click') {
            expect(restored.timestamp).toBe(original.timestamp);
            expect(restored.x).toBe(original.x);
            expect(restored.y).toBe(original.y);
            expect(restored.button).toBe(original.button);
          } else if (original.type === 'drag' && restored.type === 'drag') {
            expect(restored.startTimestamp).toBe(original.startTimestamp);
            expect(restored.endTimestamp).toBe(original.endTimestamp);
            expect(restored.startX).toBe(original.startX);
            expect(restored.startY).toBe(original.startY);
            expect(restored.endX).toBe(original.endX);
            expect(restored.endY).toBe(original.endY);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('Property 10: event data always contains version metadata', () => {
    fc.assert(
      fc.property(mouseEventDataArb, (eventData) => {
        const serialized = JSON.stringify(eventData);
        const deserialized = JSON.parse(serialized) as MouseEventData;
        
        // Version must be a positive integer
        expect(typeof deserialized.version).toBe('number');
        expect(deserialized.version).toBeGreaterThan(0);
        expect(Number.isInteger(deserialized.version)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});
