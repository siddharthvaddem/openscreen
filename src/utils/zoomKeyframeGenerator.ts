/**
 * Zoom Keyframe Generator
 * Converts mouse event data into zoom regions for the video editor timeline
 * 
 * Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 8.3
 */

import type { MouseEvent, MouseEventData } from '../types/mouseEvents';
import type { ZoomRegion, ZoomFocus, AutoZoomSettings, ZoomDepth } from '../components/video-editor/types';
import { getEventTimestamp, isEventInBounds } from '../types/mouseEvents';

/**
 * Normalize pixel coordinates to 0-1 range
 */
export function normalizeCoordinates(
  x: number,
  y: number,
  screenWidth: number,
  screenHeight: number
): ZoomFocus {
  return {
    cx: Math.max(0, Math.min(1, x / screenWidth)),
    cy: Math.max(0, Math.min(1, y / screenHeight)),
  };
}

/**
 * Get focus point from a mouse event
 */
function getEventFocusPoint(
  event: MouseEvent,
  screenWidth: number,
  screenHeight: number
): ZoomFocus {
  if (event.type === 'click') {
    return normalizeCoordinates(event.x, event.y, screenWidth, screenHeight);
  }
  // For drag events, use the center of the drag area
  const centerX = (event.startX + event.endX) / 2;
  const centerY = (event.startY + event.endY) / 2;
  return normalizeCoordinates(centerX, centerY, screenWidth, screenHeight);
}

/**
 * Merge events that are close together in time
 * Events within mergeThresholdMs are combined into a single event
 */
export function mergeCloseEvents(
  events: MouseEvent[],
  thresholdMs: number
): MouseEvent[] {
  if (events.length === 0) return [];
  
  // Sort events by timestamp
  const sorted = [...events].sort((a, b) => getEventTimestamp(a) - getEventTimestamp(b));
  
  const merged: MouseEvent[] = [];
  let currentGroup: MouseEvent[] = [sorted[0]];
  
  for (let i = 1; i < sorted.length; i++) {
    const prevTimestamp = getEventTimestamp(sorted[i - 1]);
    const currTimestamp = getEventTimestamp(sorted[i]);
    
    if (currTimestamp - prevTimestamp <= thresholdMs) {
      // Add to current group
      currentGroup.push(sorted[i]);
    } else {
      // Finalize current group and start new one
      merged.push(mergeEventGroup(currentGroup));
      currentGroup = [sorted[i]];
    }
  }
  
  // Don't forget the last group
  merged.push(mergeEventGroup(currentGroup));
  
  return merged;
}

/**
 * Merge a group of events into a single representative event
 */
function mergeEventGroup(events: MouseEvent[]): MouseEvent {
  if (events.length === 1) return events[0];
  
  // Use the first event's timestamp
  const firstEvent = events[0];
  const lastEvent = events[events.length - 1];
  
  // Calculate average position
  let totalX = 0;
  let totalY = 0;
  
  for (const event of events) {
    if (event.type === 'click') {
      totalX += event.x;
      totalY += event.y;
    } else {
      totalX += (event.startX + event.endX) / 2;
      totalY += (event.startY + event.endY) / 2;
    }
  }
  
  const avgX = totalX / events.length;
  const avgY = totalY / events.length;
  
  // Check if any event is a drag
  const hasDrag = events.some(e => e.type === 'drag');
  
  if (hasDrag) {
    // Return as drag event spanning the group
    const firstTimestamp = getEventTimestamp(firstEvent);
    const lastTimestamp = lastEvent.type === 'drag' 
      ? lastEvent.endTimestamp 
      : getEventTimestamp(lastEvent);
    
    return {
      type: 'drag',
      startTimestamp: firstTimestamp,
      endTimestamp: lastTimestamp,
      startX: avgX,
      startY: avgY,
      endX: avgX,
      endY: avgY,
    };
  }
  
  // Return as click at average position
  return {
    type: 'click',
    timestamp: getEventTimestamp(firstEvent),
    x: avgX,
    y: avgY,
    button: (firstEvent as any).button || 'left',
  };
}

/**
 * Filter out events with coordinates outside screen bounds
 */
export function filterOutOfBoundsEvents(
  events: MouseEvent[],
  screenWidth: number,
  screenHeight: number
): MouseEvent[] {
  return events.filter(event => isEventInBounds(event, screenWidth, screenHeight));
}

/**
 * Generate zoom regions from mouse event data
 */
export function generateZoomRegions(
  eventData: MouseEventData,
  settings: AutoZoomSettings,
  videoDuration: number
): ZoomRegion[] {
  if (!eventData.events || eventData.events.length === 0) {
    return [];
  }
  
  const { screenWidth, screenHeight } = eventData;
  const { defaultZoomDepth, zoomDurationMs, mergeThresholdMs } = settings;
  
  // Step 1: Filter out-of-bounds events
  let events = filterOutOfBoundsEvents(eventData.events, screenWidth, screenHeight);
  
  // Step 2: Merge close events
  events = mergeCloseEvents(events, mergeThresholdMs);
  
  // Step 3: Generate zoom regions
  const regions: ZoomRegion[] = [];
  
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const timestamp = getEventTimestamp(event);
    
    // Calculate start and end times
    let startMs = timestamp;
    let endMs = timestamp + zoomDurationMs;
    
    // For drag events, extend to cover the drag duration
    if (event.type === 'drag') {
      endMs = Math.max(endMs, event.endTimestamp + zoomDurationMs / 2);
    }
    
    // Clamp to video duration
    startMs = Math.max(0, startMs);
    endMs = Math.min(videoDuration, endMs);
    
    // Skip if region would be invalid
    if (endMs <= startMs) continue;
    
    // Check for overlap with previous region and adjust
    if (regions.length > 0) {
      const prevRegion = regions[regions.length - 1];
      if (startMs < prevRegion.endMs) {
        // Adjust previous region to end before this one starts
        // Or skip this region if they overlap too much
        if (startMs - prevRegion.startMs < zoomDurationMs / 2) {
          // Skip this region, too close to previous
          continue;
        }
        prevRegion.endMs = startMs;
      }
    }
    
    const focus = getEventFocusPoint(event, screenWidth, screenHeight);
    
    const region: ZoomRegion = {
      id: `zoom-auto-${i}-${Date.now()}`,
      startMs,
      endMs,
      depth: defaultZoomDepth as ZoomDepth,
      focus,
    };
    
    regions.push(region);
  }
  
  return regions;
}

/**
 * Check if two zoom regions overlap
 */
export function regionsOverlap(a: ZoomRegion, b: ZoomRegion): boolean {
  return !(a.endMs <= b.startMs || b.endMs <= a.startMs);
}

/**
 * Check if any regions in the array overlap
 */
export function hasOverlappingRegions(regions: ZoomRegion[]): boolean {
  for (let i = 0; i < regions.length; i++) {
    for (let j = i + 1; j < regions.length; j++) {
      if (regionsOverlap(regions[i], regions[j])) {
        return true;
      }
    }
  }
  return false;
}
