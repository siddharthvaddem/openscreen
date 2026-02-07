/**
 * Audio Settings Store
 * 
 * Persistence layer for microphone settings that survives app restarts.
 * Uses localStorage for browser/Electron renderer process storage.
 */

// ============================================
// Types
// ============================================

export interface AudioSettings {
  // Device Selection
  deviceId: string | null;
  enabled: boolean;
  
  // Recording Quality Settings
  sampleRate: 44100 | 48000;
  channelCount: 1 | 2;
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;
  
  // Export Quality Settings
  audioBitrate: 128 | 192 | 256 | 320; // in kbps
}

// Type definitions for settings options
export type SampleRate = 44100 | 48000;
export type ChannelCount = 1 | 2;
export type AudioBitrate = 128 | 192 | 256 | 320;

// UI Options
export const SAMPLE_RATE_OPTIONS: { value: SampleRate; label: string }[] = [
  { value: 44100, label: '44.1 kHz' },
  { value: 48000, label: '48 kHz' },
];

export const CHANNEL_COUNT_OPTIONS: { value: ChannelCount; label: string }[] = [
  { value: 1, label: 'Mono' },
  { value: 2, label: 'Stereo' },
];

export const AUDIO_BITRATE_OPTIONS: { value: AudioBitrate; label: string }[] = [
  { value: 128, label: '128 kbps' },
  { value: 192, label: '192 kbps' },
  { value: 256, label: '256 kbps' },
  { value: 320, label: '320 kbps' },
];

// ============================================
// Constants
// ============================================

export const STORAGE_KEY = 'openscreen:audioSettings';

export const DEFAULT_SETTINGS: AudioSettings = {
  deviceId: null,
  enabled: false,
  sampleRate: 48000,
  channelCount: 2,
  noiseSuppression: true,
  echoCancellation: false,
  autoGainControl: true,
  audioBitrate: 192,
};

// ============================================
// Helper Functions
// ============================================

/**
 * Safely access localStorage
 * Returns null if localStorage is unavailable
 */
function getLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    // localStorage may be unavailable (e.g., in some security contexts)
    return null;
  }
}

/**
 * Safely parse JSON with fallback to default
 */
function safeParseJSON(json: string | null): Partial<AudioSettings> | null {
  if (!json) return null;
  
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed;
    }
    return null;
  } catch {
    // Invalid JSON, return null
    return null;
  }
}

// ============================================
// API Functions
// ============================================

/**
 * Get current audio settings from localStorage
 * Returns default settings if not found or on error
 */
export function getAudioSettings(): AudioSettings {
  const storage = getLocalStorage();
  if (!storage) {
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const stored = storage.getItem(STORAGE_KEY);
    const parsed = safeParseJSON(stored);
    
    if (!parsed) {
      return { ...DEFAULT_SETTINGS };
    }

    // Merge with defaults to ensure all properties exist
    return {
      deviceId: parsed.deviceId !== undefined ? parsed.deviceId : DEFAULT_SETTINGS.deviceId,
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_SETTINGS.enabled,
      sampleRate: parsed.sampleRate === 44100 || parsed.sampleRate === 48000 
        ? parsed.sampleRate : DEFAULT_SETTINGS.sampleRate,
      channelCount: parsed.channelCount === 1 || parsed.channelCount === 2
        ? parsed.channelCount : DEFAULT_SETTINGS.channelCount,
      noiseSuppression: typeof parsed.noiseSuppression === 'boolean' 
        ? parsed.noiseSuppression : DEFAULT_SETTINGS.noiseSuppression,
      echoCancellation: typeof parsed.echoCancellation === 'boolean'
        ? parsed.echoCancellation : DEFAULT_SETTINGS.echoCancellation,
      autoGainControl: typeof parsed.autoGainControl === 'boolean'
        ? parsed.autoGainControl : DEFAULT_SETTINGS.autoGainControl,
      audioBitrate: [128, 192, 256, 320].includes(parsed.audioBitrate as number)
        ? (parsed.audioBitrate as AudioBitrate) : DEFAULT_SETTINGS.audioBitrate,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Save audio settings to localStorage
 * Supports partial updates - merges with existing settings
 */
export function setAudioSettings(settings: Partial<AudioSettings>): void {
  const storage = getLocalStorage();
  if (!storage) {
    console.warn('[AudioSettings] localStorage not available');
    return;
  }

  try {
    const current = getAudioSettings();
    const updated: AudioSettings = {
      ...current,
      ...settings,
    };
    
    storage.setItem(STORAGE_KEY, JSON.stringify(updated));
    console.log('[AudioSettings] Saved:', updated);
  } catch (err) {
    console.error('[AudioSettings] Failed to save:', err);
  }
}

/**
 * Clear audio settings from localStorage
 */
export function clearAudioSettings(): void {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Silently fail if localStorage is unavailable
  }
}
