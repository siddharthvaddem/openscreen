// src/types/keystrokeEditorSettings.ts

import {
  KeystrokeStyle,
  KeystrokePositionPreset,
  DEFAULT_KEYSTROKE_STYLE,
} from '../components/video-editor/types';

export interface KeystrokeEditorSettings {
  captureEnabled: boolean;      // toggle state for recording
  defaultStyle: KeystrokeStyle;
  defaultPosition: KeystrokePositionPreset;
}

export const DEFAULT_KEYSTROKE_EDITOR_SETTINGS: KeystrokeEditorSettings = {
  captureEnabled: false,
  defaultStyle: DEFAULT_KEYSTROKE_STYLE,
  defaultPosition: 'bottom-center',
};
