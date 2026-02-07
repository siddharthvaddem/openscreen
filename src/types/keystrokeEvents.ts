// src/types/keystrokeEvents.ts

export interface KeystrokeEvent {
  type: 'keystroke';
  timestamp: number;
  key: string;           // Display name (e.g., "A", "Enter", "F1")
  keyCode: number;       // Raw key code from uiohook
  modifiers: {
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;       // Win/Cmd key
  };
}

export interface MouseActionEvent {
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

export type InputEvent = KeystrokeEvent | MouseActionEvent;

export interface DisplayEntry {
  id: string;
  text: string;
  type: 'keystroke' | 'mouse';
  timestamp: number;
  fadeStartTime: number;
}
