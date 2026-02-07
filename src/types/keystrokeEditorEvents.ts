// src/types/keystrokeEditorEvents.ts

export interface RecordedKeystrokeEvent {
  type: 'keystroke';
  timestamp: number;      // ms relative to recording start
  keyCode: number;
  keyName: string;        // formatted display name
  modifiers: {
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
  };
}

export interface RecordedMouseClickEvent {
  type: 'mouse';
  timestamp: number;      // ms relative to recording start
  button: 'left' | 'right' | 'middle';
  modifiers: {
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
  };
}

export type RecordedInputEvent = RecordedKeystrokeEvent | RecordedMouseClickEvent;

export interface KeystrokeEventData {
  version: 1;
  recordingId: string;
  events: RecordedInputEvent[];
}
