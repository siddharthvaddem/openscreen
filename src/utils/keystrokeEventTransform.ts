// src/utils/keystrokeEventTransform.ts

import type { InputEvent, KeystrokeEvent, MouseActionEvent } from '../types/keystrokeEvents';

/**
 * Represents a raw keyboard event from uiohook-napi
 */
export interface UiohookKeyboardEvent {
  keycode: number;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
}

/**
 * Represents a raw mouse click event from uiohook-napi
 */
export interface UiohookMouseEvent {
  button: number; // 1=left, 2=right, 3=middle
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
}

/**
 * Button mapping from uiohook button numbers to button names
 */
export const BUTTON_MAP: Record<number, 'left' | 'right' | 'middle'> = {
  1: 'left',
  2: 'right',
  3: 'middle',
};

/**
 * Valid button numbers that can be transformed
 */
export const VALID_BUTTON_NUMBERS = [1, 2, 3] as const;

/**
 * Transform a uiohook keyboard event into a KeystrokeEvent
 * 
 * This function is used by the KeystrokeService to transform raw uiohook
 * events into the InputEvent format that is sent via IPC to the renderer.
 * 
 * Requirements:
 * - 6.4: Events are transformed for IPC communication
 * - 3.1: Key name is included
 * - 3.2: Modifier key combinations are captured
 * 
 * @param event Raw uiohook keyboard event
 * @param timestamp Optional timestamp (defaults to Date.now())
 * @returns KeystrokeEvent ready for IPC transmission
 */
export function transformKeyboardEvent(
  event: UiohookKeyboardEvent,
  timestamp: number = Date.now()
): KeystrokeEvent {
  return {
    type: 'keystroke',
    timestamp,
    key: String(event.keycode), // Key mapping done in separate utility
    keyCode: event.keycode,
    modifiers: {
      ctrl: event.ctrlKey ?? false,
      alt: event.altKey ?? false,
      shift: event.shiftKey ?? false,
      meta: event.metaKey ?? false,
    },
  };
}

/**
 * Transform a uiohook mouse event into a MouseActionEvent
 * 
 * This function is used by the KeystrokeService to transform raw uiohook
 * mouse events into the InputEvent format that is sent via IPC to the renderer.
 * 
 * Requirements:
 * - 6.4: Events are transformed for IPC communication
 * - 4.1, 4.2, 4.3: Button type is correctly identified
 * - 4.4: Modifier keys are captured
 * 
 * @param event Raw uiohook mouse event
 * @param timestamp Optional timestamp (defaults to Date.now())
 * @returns MouseActionEvent ready for IPC transmission, or null if button is unknown
 */
export function transformMouseEvent(
  event: UiohookMouseEvent,
  timestamp: number = Date.now()
): MouseActionEvent | null {
  const button = BUTTON_MAP[event.button];
  
  // Only process known button types
  if (!button) {
    return null;
  }
  
  return {
    type: 'mouse',
    timestamp,
    button,
    modifiers: {
      ctrl: event.ctrlKey ?? false,
      alt: event.altKey ?? false,
      shift: event.shiftKey ?? false,
      meta: event.metaKey ?? false,
    },
  };
}

/**
 * Type guard to check if an InputEvent is a KeystrokeEvent
 */
export function isKeystrokeEvent(event: InputEvent): event is KeystrokeEvent {
  return event.type === 'keystroke';
}

/**
 * Type guard to check if an InputEvent is a MouseActionEvent
 */
export function isMouseActionEvent(event: InputEvent): event is MouseActionEvent {
  return event.type === 'mouse';
}

/**
 * Validate that an InputEvent has all required fields with correct types
 * Used for verifying IPC message integrity
 * 
 * @param event The event to validate
 * @returns true if the event is valid, false otherwise
 */
export function isValidInputEvent(event: unknown): event is InputEvent {
  if (!event || typeof event !== 'object') {
    return false;
  }
  
  const e = event as Record<string, unknown>;
  
  // Check common fields
  if (typeof e.type !== 'string' || typeof e.timestamp !== 'number') {
    return false;
  }
  
  // Check modifiers object
  if (!e.modifiers || typeof e.modifiers !== 'object') {
    return false;
  }
  
  const mods = e.modifiers as Record<string, unknown>;
  if (
    typeof mods.ctrl !== 'boolean' ||
    typeof mods.alt !== 'boolean' ||
    typeof mods.shift !== 'boolean' ||
    typeof mods.meta !== 'boolean'
  ) {
    return false;
  }
  
  // Type-specific validation
  if (e.type === 'keystroke') {
    return typeof e.key === 'string' && typeof e.keyCode === 'number';
  }
  
  if (e.type === 'mouse') {
    return e.button === 'left' || e.button === 'right' || e.button === 'middle';
  }
  
  return false;
}
