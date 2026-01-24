// src/hooks/useKeystrokeEditorSettings.ts

import { useState, useEffect, useCallback } from 'react';
import { 
  KeystrokeEditorSettings, 
  DEFAULT_KEYSTROKE_EDITOR_SETTINGS 
} from '../types/keystrokeEditorSettings';

/**
 * Hook for managing keystroke editor settings
 * 
 * This hook connects to the keystroke editor API which controls:
 * - captureEnabled: Whether keystroke/mouse events are captured during recording
 * - defaultStyle: Default styling for keystroke overlay in editor
 * - defaultPosition: Default position for keystroke overlay
 * 
 * Requirements:
 * - 1.1: Provide Keys toggle in LaunchWindow
 * - 1.2: Start capturing when toggle enabled and recording starts
 * - 1.3: Don't capture when toggle disabled
 * - 1.4, 1.5: Persist and restore toggle state
 * - 10.1: Disable toggle if keystroke service fails to initialize
 */
export function useKeystrokeEditorSettings() {
  const [settings, setSettings] = useState<KeystrokeEditorSettings>(DEFAULT_KEYSTROKE_EDITOR_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serviceAvailable, setServiceAvailable] = useState<boolean>(true);
  const [serviceError, setServiceError] = useState<string | null>(null);

  // Check service availability and load settings on mount
  useEffect(() => {
    const initialize = async () => {
      if (!window.electronAPI?.keystrokeEditor) {
        setLoading(false);
        setServiceAvailable(false);
        setServiceError('Keystroke editor API not available');
        return;
      }

      try {
        // Requirement 10.1: Check if keystroke service is available
        const availabilityResult = await window.electronAPI.keystrokeEditor.checkAvailability();
        if (!availabilityResult.available) {
          setServiceAvailable(false);
          setServiceError(availabilityResult.error || 'Keystroke capture is not available');
          console.warn('[useKeystrokeEditorSettings] Keystroke service not available:', availabilityResult.error);
        }

        // Load settings regardless of service availability
        const result = await window.electronAPI.keystrokeEditor.getSettings();
        if (result.success && result.settings) {
          setSettings(result.settings as KeystrokeEditorSettings);
        }
      } catch (err) {
        console.error('Failed to initialize keystroke editor settings:', err);
        setError('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  /**
   * Update settings and sync with main process
   */
  const updateSettings = useCallback(async (updates: Partial<KeystrokeEditorSettings>) => {
    const newSettings: KeystrokeEditorSettings = { ...settings, ...updates };
    
    // Optimistically update local state
    setSettings(newSettings);
    setError(null);

    if (!window.electronAPI?.keystrokeEditor) {
      return;
    }

    try {
      const result = await window.electronAPI.keystrokeEditor.setSettings(newSettings);
      if (!result.success) {
        // Revert on failure
        setSettings(settings);
        setError(result.error || 'Failed to save settings');
      } else if (result.settings) {
        // Update with server response
        setSettings(result.settings as KeystrokeEditorSettings);
      }
    } catch (err) {
      // Revert on error
      setSettings(settings);
      setError('Failed to save settings');
      console.error('Failed to save keystroke editor settings:', err);
    }
  }, [settings]);

  /**
   * Toggle the captureEnabled state
   * This controls whether keystroke/mouse events are captured during recording
   * 
   * Requirement 10.1: Only allow toggle if service is available
   */
  const toggleCaptureEnabled = useCallback(async () => {
    // Requirement 10.1: Don't allow enabling if service is not available
    if (!serviceAvailable && !settings.captureEnabled) {
      console.warn('[useKeystrokeEditorSettings] Cannot enable capture - service not available');
      return;
    }
    await updateSettings({ captureEnabled: !settings.captureEnabled });
  }, [settings.captureEnabled, updateSettings, serviceAvailable]);

  /**
   * Set captureEnabled directly
   * 
   * Requirement 10.1: Only allow enabling if service is available
   */
  const setCaptureEnabled = useCallback(async (enabled: boolean) => {
    // Requirement 10.1: Don't allow enabling if service is not available
    if (!serviceAvailable && enabled) {
      console.warn('[useKeystrokeEditorSettings] Cannot enable capture - service not available');
      return;
    }
    await updateSettings({ captureEnabled: enabled });
  }, [updateSettings, serviceAvailable]);

  return {
    settings,
    loading,
    error,
    updateSettings,
    toggleCaptureEnabled,
    setCaptureEnabled,
    // Convenience accessor for the toggle state
    captureEnabled: settings.captureEnabled,
    // Service availability status for UI
    serviceAvailable,
    serviceError,
  };
}

export default useKeystrokeEditorSettings;
