import { useState, useEffect, useCallback } from 'react';
import type { Preset, PresetSettings } from '@/components/video-editor/types';

interface UsePresetsReturn {
  presets: Preset[];
  defaultPresetId: string | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  loadPresets: () => Promise<void>;
  savePreset: (name: string, settings: PresetSettings, isDefault?: boolean) => Promise<Preset | null>;
  updatePreset: (id: string, updates: Partial<{ name: string; isDefault: boolean; settings: PresetSettings }>) => Promise<boolean>;
  deletePreset: (id: string) => Promise<boolean>;
  duplicatePreset: (id: string) => Promise<Preset | null>;
  setDefaultPreset: (id: string | null) => Promise<boolean>;
  
  // Helpers
  getDefaultPreset: () => Preset | undefined;
  getPresetById: (id: string) => Preset | undefined;
}

export function usePresets(): UsePresetsReturn {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [defaultPresetId, setDefaultPresetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPresets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await window.electronAPI.presets.get();
      
      if (result.success) {
        setPresets(result.presets);
        setDefaultPresetId(result.defaultPresetId);
      } else {
        setError('Failed to load presets');
      }
    } catch (err) {
      console.error('Failed to load presets:', err);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Load presets on mount
  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  const savePreset = useCallback(async (
    name: string,
    settings: PresetSettings,
    isDefault: boolean = false
  ): Promise<Preset | null> => {
    try {
      const result = await window.electronAPI.presets.save({
        name,
        isDefault,
        settings,
      });
      
      if (result.success && result.preset) {
        // Refresh the list to get updated state
        await loadPresets();
        return result.preset;
      } else {
        console.error('Failed to save preset:', result.error);
        return null;
      }
    } catch (err) {
      console.error('Failed to save preset:', err);
      return null;
    }
  }, [loadPresets]);

  const updatePreset = useCallback(async (
    id: string,
    updates: Partial<{ name: string; isDefault: boolean; settings: PresetSettings }>
  ): Promise<boolean> => {
    try {
      const result = await window.electronAPI.presets.update(id, updates);
      
      if (result.success) {
        await loadPresets();
        return true;
      } else {
        console.error('Failed to update preset:', result.error);
        return false;
      }
    } catch (err) {
      console.error('Failed to update preset:', err);
      return false;
    }
  }, [loadPresets]);

  const deletePreset = useCallback(async (id: string): Promise<boolean> => {
    try {
      const result = await window.electronAPI.presets.delete(id);
      
      if (result.success) {
        await loadPresets();
        return true;
      } else {
        console.error('Failed to delete preset:', result.error);
        return false;
      }
    } catch (err) {
      console.error('Failed to delete preset:', err);
      return false;
    }
  }, [loadPresets]);

  const duplicatePreset = useCallback(async (id: string): Promise<Preset | null> => {
    try {
      const result = await window.electronAPI.presets.duplicate(id);
      
      if (result.success && result.preset) {
        await loadPresets();
        return result.preset;
      } else {
        console.error('Failed to duplicate preset:', result.error);
        return null;
      }
    } catch (err) {
      console.error('Failed to duplicate preset:', err);
      return null;
    }
  }, [loadPresets]);

  const setDefaultPresetAction = useCallback(async (id: string | null): Promise<boolean> => {
    try {
      const result = await window.electronAPI.presets.setDefault(id);
      
      if (result.success) {
        await loadPresets();
        return true;
      } else {
        console.error('Failed to set default preset:', result.error);
        return false;
      }
    } catch (err) {
      console.error('Failed to set default preset:', err);
      return false;
    }
  }, [loadPresets]);

  const getDefaultPreset = useCallback(() => {
    return presets.find(p => p.id === defaultPresetId);
  }, [presets, defaultPresetId]);

  const getPresetById = useCallback((id: string) => {
    return presets.find(p => p.id === id);
  }, [presets]);

  return {
    presets,
    defaultPresetId,
    loading,
    error,
    loadPresets,
    savePreset,
    updatePreset,
    deletePreset,
    duplicatePreset,
    setDefaultPreset: setDefaultPresetAction,
    getDefaultPreset,
    getPresetById,
  };
}
