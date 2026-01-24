// src/utils/keystrokeRegionGenerator.ts

import {
  KeystrokeEventData,
  RecordedInputEvent,
  RecordedKeystrokeEvent,
  RecordedMouseClickEvent,
} from '../types/keystrokeEditorEvents';
import { KeystrokeEditorSettings } from '../types/keystrokeEditorSettings';
import {
  KeystrokeRegion,
  DEFAULT_KEYSTROKE_STYLE,
  DEFAULT_KEYSTROKE_POSITION,
} from '../components/video-editor/types';

/**
 * Generates KeystrokeRegion objects from recorded event data.
 * Each event becomes a region with timing based on the event timestamp
 * and the configured linger duration.
 * 
 * Requirements: 4.3 - Create KeystrokeRegion for each event
 */
export function generateKeystrokeRegions(
  eventData: KeystrokeEventData,
  settings: KeystrokeEditorSettings
): KeystrokeRegion[] {
  const { defaultStyle, defaultPosition } = settings;
  const showOnlyHotkeys = defaultStyle.showOnlyHotkeys;
  const lingerDurationMs = defaultStyle.lingerDurationMs;

  const regions: KeystrokeRegion[] = [];

  for (let i = 0; i < eventData.events.length; i++) {
    const event = eventData.events[i];

    // Filter events based on hotkey setting
    if (!shouldShowEvent(event, showOnlyHotkeys)) {
      continue;
    }

    // Skip events with invalid timestamps
    if (event.timestamp < 0) {
      continue;
    }

    const region: KeystrokeRegion = {
      id: `keystroke-${i + 1}`,
      startMs: event.timestamp,
      endMs: event.timestamp + lingerDurationMs,
      text: formatEventText(event),
      eventType: event.type === 'keystroke' ? 'keystroke' : 'mouse',
      positionPreset: defaultPosition ?? DEFAULT_KEYSTROKE_POSITION,
      style: { ...DEFAULT_KEYSTROKE_STYLE, ...defaultStyle },
    };

    regions.push(region);
  }

  return regions;
}

/**
 * Formats a recorded input event into a human-readable text string.
 * 
 * For keystroke events: Displays modifiers in order Ctrl → Alt → Shift → Meta → Key
 * For mouse events: Displays modifiers followed by button name (e.g., "Left Click")
 * 
 * Requirements: 6.2 - Format keystroke text as readable (e.g., "Ctrl + C", "Enter", "Left Click")
 */
export function formatEventText(event: RecordedInputEvent): string {
  const parts: string[] = [];

  // Add modifiers in the specified order: Ctrl → Alt → Shift → Meta
  if (event.modifiers.ctrl) {
    parts.push('Ctrl');
  }
  if (event.modifiers.alt) {
    parts.push('Alt');
  }
  if (event.modifiers.shift) {
    parts.push('Shift');
  }
  if (event.modifiers.meta) {
    parts.push('Meta');
  }

  if (event.type === 'keystroke') {
    const keystrokeEvent = event as RecordedKeystrokeEvent;
    parts.push(keystrokeEvent.keyName);
  } else {
    const mouseEvent = event as RecordedMouseClickEvent;
    parts.push(formatMouseButton(mouseEvent.button));
  }

  return parts.join(' + ');
}

/**
 * Formats a mouse button into a human-readable string.
 */
function formatMouseButton(button: 'left' | 'right' | 'middle'): string {
  switch (button) {
    case 'left':
      return 'Left Click';
    case 'right':
      return 'Right Click';
    case 'middle':
      return 'Middle Click';
    default:
      return 'Click';
  }
}

/**
 * Determines whether an event should be shown based on the hotkey filter setting.
 * 
 * When showOnlyHotkeys is true, only events with at least one modifier key active
 * (ctrl, alt, shift, or meta) are included.
 * 
 * Requirements: 7.8 - Filter to show only shortcuts/hotkeys when enabled
 */
export function shouldShowEvent(
  event: RecordedInputEvent,
  showOnlyHotkeys: boolean
): boolean {
  // If not filtering, show all events
  if (!showOnlyHotkeys) {
    return true;
  }

  // When filtering, only show events with at least one modifier active
  const { modifiers } = event;
  return modifiers.ctrl || modifiers.alt || modifiers.shift || modifiers.meta;
}
