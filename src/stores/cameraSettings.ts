/**
 * Camera Settings Store
 *
 * Persistence layer for camera/webcam settings that survives app restarts.
 * Uses localStorage for browser/Electron renderer process storage.
 */

// ============================================
// Types
// ============================================

export interface CameraSettings {
  deviceId: string | null;
  enabled: boolean;
  resolution: CameraResolution;
}

export type CameraResolution = '480p' | '720p' | '1080p';

// UI Options
export const RESOLUTION_OPTIONS: { value: CameraResolution; label: string; width: number; height: number }[] = [
  { value: '480p', label: '480p', width: 854, height: 480 },
  { value: '720p', label: '720p (HD)', width: 1280, height: 720 },
  { value: '1080p', label: '1080p (FHD)', width: 1920, height: 1080 },
];

// ============================================
// Constants
// ============================================

export const CAMERA_STORAGE_KEY = 'openscreen:cameraSettings';

export const DEFAULT_CAMERA_SETTINGS: CameraSettings = {
  deviceId: null,
  enabled: false,
  resolution: '720p',
};

// ============================================
// Helper Functions
// ============================================

function getLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function safeParseJSON(json: string | null): Partial<CameraSettings> | null {
  if (!json) return null;

  try {
    const parsed = JSON.parse(json);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

// ============================================
// API Functions
// ============================================

/**
 * Get current camera settings from localStorage.
 * Returns default settings if not found or on error.
 */
export function getCameraSettings(): CameraSettings {
  const storage = getLocalStorage();
  if (!storage) {
    return { ...DEFAULT_CAMERA_SETTINGS };
  }

  try {
    const stored = storage.getItem(CAMERA_STORAGE_KEY);
    const parsed = safeParseJSON(stored);

    if (!parsed) {
      return { ...DEFAULT_CAMERA_SETTINGS };
    }

    const validResolutions: CameraResolution[] = ['480p', '720p', '1080p'];

    return {
      deviceId: parsed.deviceId !== undefined ? parsed.deviceId : DEFAULT_CAMERA_SETTINGS.deviceId,
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_CAMERA_SETTINGS.enabled,
      resolution: validResolutions.includes(parsed.resolution as CameraResolution)
        ? (parsed.resolution as CameraResolution)
        : DEFAULT_CAMERA_SETTINGS.resolution,
    };
  } catch {
    return { ...DEFAULT_CAMERA_SETTINGS };
  }
}

/**
 * Save camera settings to localStorage.
 * Supports partial updates — merges with existing settings.
 */
export function setCameraSettings(settings: Partial<CameraSettings>): void {
  const storage = getLocalStorage();
  if (!storage) {
    console.warn('[CameraSettings] localStorage not available');
    return;
  }

  try {
    const current = getCameraSettings();
    const updated: CameraSettings = {
      ...current,
      ...settings,
    };

    storage.setItem(CAMERA_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('[CameraSettings] Failed to save:', err);
  }
}

/**
 * Clear camera settings from localStorage.
 */
export function clearCameraSettings(): void {
  const storage = getLocalStorage();
  if (!storage) return;

  try {
    storage.removeItem(CAMERA_STORAGE_KEY);
  } catch {
    // Silently fail
  }
}

/**
 * Get resolution constraints (width/height) for the selected resolution preset.
 */
export function getResolutionConstraints(resolution: CameraResolution): { width: number; height: number } {
  const option = RESOLUTION_OPTIONS.find((o) => o.value === resolution);
  return option ? { width: option.width, height: option.height } : { width: 1280, height: 720 };
}
