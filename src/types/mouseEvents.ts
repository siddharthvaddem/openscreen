/**
 * Mouse event types for Auto Zoom feature
 * Used to capture and store mouse events during screen recording
 */

export interface MouseClickEvent {
  type: 'click';
  timestamp: number;      // ms relative to recording start
  x: number;              // pixel position
  y: number;              // pixel position
  button: 'left' | 'right' | 'middle';
}

export interface MouseDragEvent {
  type: 'drag';
  startTimestamp: number;
  endTimestamp: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export type MouseEvent = MouseClickEvent | MouseDragEvent;

export interface MouseEventData {
  version: 1;
  recordingId: string;
  screenWidth: number;
  screenHeight: number;
  events: MouseEvent[];
}

/**
 * Helper to get timestamp from any mouse event
 */
export function getEventTimestamp(event: MouseEvent): number {
  return event.type === 'click' ? event.timestamp : event.startTimestamp;
}

/**
 * Helper to check if event is within screen bounds
 */
export function isEventInBounds(
  event: MouseEvent,
  screenWidth: number,
  screenHeight: number
): boolean {
  if (event.type === 'click') {
    return (
      event.x >= 0 &&
      event.x < screenWidth &&
      event.y >= 0 &&
      event.y < screenHeight
    );
  }
  // For drag events, check all coordinates
  return (
    event.startX >= 0 &&
    event.startX < screenWidth &&
    event.startY >= 0 &&
    event.startY < screenHeight &&
    event.endX >= 0 &&
    event.endX < screenWidth &&
    event.endY >= 0 &&
    event.endY < screenHeight
  );
}
