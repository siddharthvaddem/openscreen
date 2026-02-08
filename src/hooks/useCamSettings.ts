/**
 * Hook for managing Webcam settings
 * Uses localStorage for persistence (simpler than presets for a single toggle)
 * 
 * Requirements:
 * - 1.1: Provide Cam toggle in LaunchWindow
 * - 1.2: Disable toggle when recording
 * - 1.3: Persist toggle state
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

const STORAGE_KEY = 'openscreen-cam-settings';

interface CamSettings {
  enabled: boolean;
  // Future extensibility: deviceId, resolution, etc.
}

const DEFAULT_CAM_SETTINGS: CamSettings = {
  enabled: false,
};

interface UseCamSettingsReturn {
  settings: CamSettings;
  loading: boolean;
  permissionStatus: 'granted' | 'denied' | 'prompt' | 'unknown';
  
  // Actions
  setEnabled: (enabled: boolean) => Promise<void>;
  checkPermission: () => Promise<void>;
}

/**
 * Load settings from localStorage
 */
function loadSettings(): CamSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to handle new fields
      return { ...DEFAULT_CAM_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.warn('[CamSettings] Failed to load settings:', error);
  }
  return { ...DEFAULT_CAM_SETTINGS };
}

/**
 * Save settings to localStorage
 */
function saveSettings(settings: CamSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('[CamSettings] Failed to save settings:', error);
  }
}

export function useCamSettings(): UseCamSettingsReturn {
  const [settings, setSettings] = useState<CamSettings>(DEFAULT_CAM_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');

  // Load settings on mount
  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    setLoading(false);
    checkPermission();
  }, []);

  // Cross-window sync via storage event
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;

      if (e.newValue === null) {
        // Key was removed — reset to defaults
        setSettings({ ...DEFAULT_CAM_SETTINGS });
        return;
      }

      try {
        const parsed = JSON.parse(e.newValue);
        setSettings({ ...DEFAULT_CAM_SETTINGS, ...parsed });
      } catch {
        // Invalid JSON from another window — ignore
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const checkPermission = useCallback(async () => {
    // Check if electronAPI and camera property exist
    const api = window.electronAPI as Record<string, unknown>;
    if (api && api.camera) {
      try {
        const cam = api.camera as { getPermissionStatus: () => Promise<{ success: boolean; status: string }> };
        const result = await cam.getPermissionStatus();
        if (result.success) {
          setPermissionStatus(result.status as 'granted' | 'denied' | 'prompt' | 'unknown');
        }
      } catch (err) {
        console.error('[CamSettings] Failed to check permission:', err);
      }
    }
  }, []);

  const setEnabled = useCallback(async (enabled: boolean) => {
    // If enabling, check/request permission first
    if (enabled) {
      // Check if electronAPI and camera property exist
      const api = window.electronAPI as Record<string, unknown>;
      if (api && api.camera) {
        try {
          const cam = api.camera as { requestAccess: () => Promise<{ granted: boolean }> };
          const result = await cam.requestAccess();
          if (!result.granted) {
            console.warn('[CamSettings] Camera permission denied');
            toast.error('Camera access denied. Please grant camera permission in system settings.');
            setPermissionStatus('denied');
            
            // If denied, we must ensure state is false
            setSettings(prev => {
              if (prev.enabled) {
                const updated = { ...prev, enabled: false };
                saveSettings(updated);
                return updated;
              }
              return prev;
            });
            return; 
          }
          setPermissionStatus('granted');
        } catch (err) {
          console.error('[CamSettings] Failed to request permission:', err);
          toast.error('Failed to access camera.');
          return;
        }
      }
    }

    setSettings(prev => {
      const updated = { ...prev, enabled };
      saveSettings(updated);
      return updated;
    });
  }, []);

  return {
    settings,
    loading,
    permissionStatus,
    setEnabled,
    checkPermission,
  };
}
