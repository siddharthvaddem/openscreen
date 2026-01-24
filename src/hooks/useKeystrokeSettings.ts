// src/hooks/useKeystrokeSettings.ts

import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_KEYSTROKE_SETTINGS } from '../types/keystrokeSettings';

// Use global KeystrokeSettings type from electron-env.d.ts
type KeystrokeSettingsType = KeystrokeSettings;

/**
 * Hook for managing keystroke overlay settings
 * 
 * Provides:
 * - Current settings state
 * - Function to update settings (syncs with main process)
 * - Loading state
 * 
 * Requirements:
 * - 1.4, 1.5: Persist and restore toggle state
 * - 9.1, 9.2, 9.3, 9.4: Persist all settings
 */
export function useKeystrokeSettings() {
  const [settings, setSettings] = useState<KeystrokeSettingsType>(DEFAULT_KEYSTROKE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      if (!window.electronAPI?.keystroke) {
        setLoading(false);
        return;
      }

      try {
        const loadedSettings = await window.electronAPI.keystroke.getSettings();
        if (loadedSettings) {
          setSettings(loadedSettings);
        }
      } catch (err) {
        console.error('Failed to load keystroke settings:', err);
        setError('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  /**
   * Update settings and sync with main process
   */
  const updateSettings = useCallback(async (updates: Partial<KeystrokeSettingsType>) => {
    const newSettings: KeystrokeSettingsType = { ...settings, ...updates };
    
    // Optimistically update local state
    setSettings(newSettings);
    setError(null);

    if (!window.electronAPI?.keystroke) {
      return;
    }

    try {
      const result = await window.electronAPI.keystroke.setSettings(newSettings);
      if (!result.success) {
        // Revert on failure
        setSettings(settings);
        setError(result.error || 'Failed to save settings');
      }
    } catch (err) {
      // Revert on error
      setSettings(settings);
      setError('Failed to save settings');
      console.error('Failed to save keystroke settings:', err);
    }
  }, [settings]);

  /**
   * Toggle the enabled state
   */
  const toggleEnabled = useCallback(async () => {
    const newEnabled = !settings.enabled;
    await updateSettings({ enabled: newEnabled });

    if (!window.electronAPI?.keystroke) {
      return;
    }

    try {
      if (newEnabled) {
        await window.electronAPI.keystroke.showOverlay();
        await window.electronAPI.keystroke.start();
      } else {
        await window.electronAPI.keystroke.stop();
        await window.electronAPI.keystroke.hideOverlay();
      }
    } catch (err) {
      console.error('Failed to toggle keystroke overlay:', err);
      // Revert the enabled state on error
      await updateSettings({ enabled: !newEnabled });
    }
  }, [settings.enabled, updateSettings]);

  return {
    settings,
    loading,
    error,
    updateSettings,
    toggleEnabled,
  };
}

export default useKeystrokeSettings;
