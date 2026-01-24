/**
 * Hook for managing Auto Zoom settings
 * Uses localStorage for persistence (simpler than presets for a single toggle)
 * 
 * Requirements: 1.1, 1.4
 */

import { useState, useEffect, useCallback } from 'react';
import type { AutoZoomSettings } from '@/components/video-editor/types';
import { DEFAULT_AUTO_ZOOM_SETTINGS } from '@/components/video-editor/types';

const STORAGE_KEY = 'openscreen-auto-zoom-settings';

interface UseAutoZoomSettingsReturn {
  settings: AutoZoomSettings;
  loading: boolean;
  
  // Actions
  setEnabled: (enabled: boolean) => void;
  updateSettings: (updates: Partial<AutoZoomSettings>) => void;
  resetToDefaults: () => void;
}

/**
 * Load settings from localStorage
 */
function loadSettings(): AutoZoomSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to handle new fields
      return { ...DEFAULT_AUTO_ZOOM_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.warn('[AutoZoomSettings] Failed to load settings:', error);
  }
  return { ...DEFAULT_AUTO_ZOOM_SETTINGS };
}

/**
 * Save settings to localStorage
 */
function saveSettings(settings: AutoZoomSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('[AutoZoomSettings] Failed to save settings:', error);
  }
}

export function useAutoZoomSettings(): UseAutoZoomSettingsReturn {
  const [settings, setSettings] = useState<AutoZoomSettings>(DEFAULT_AUTO_ZOOM_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    setLoading(false);
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    setSettings(prev => {
      const updated = { ...prev, enabled };
      saveSettings(updated);
      return updated;
    });
  }, []);

  const updateSettings = useCallback((updates: Partial<AutoZoomSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...updates };
      saveSettings(updated);
      return updated;
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_AUTO_ZOOM_SETTINGS);
    saveSettings(DEFAULT_AUTO_ZOOM_SETTINGS);
  }, []);

  return {
    settings,
    loading,
    setEnabled,
    updateSettings,
    resetToDefaults,
  };
}
