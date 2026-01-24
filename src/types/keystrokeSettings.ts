// src/types/keystrokeSettings.ts

export interface KeystrokeSettings {
  enabled: boolean;
  position: 'bottom-center' | 'bottom-left' | 'bottom-right' | 'top-center';
  fadeDurationMs: number;      // default: 1500
  fadeDelayMs: number;         // default: 1000
  groupingThresholdMs: number; // default: 100
  showMouseClicks: boolean;    // default: true
  textScale: number;           // default: 1.0 (range: 0.5 - 2.0)
}

export const DEFAULT_KEYSTROKE_SETTINGS: KeystrokeSettings = {
  enabled: false,
  position: 'bottom-center',
  fadeDurationMs: 1500,
  fadeDelayMs: 1000,
  groupingThresholdMs: 100,
  showMouseClicks: true,
  textScale: 1.0,
};
