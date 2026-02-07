import { app } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'

// Types matching src/components/video-editor/types.ts
export interface PresetSettings {
  padding: number;
  shadowIntensity: number;
  borderRadius: number;
  motionBlurEnabled: boolean;
  showBlur: boolean;
  wallpaper: string;
}

export interface Preset {
  id: string;
  name: string;
  createdAt: number;
  isDefault: boolean;
  settings: PresetSettings;
}

export interface PresetStore {
  version: number;
  defaultPresetId: string | null;
  presets: Preset[];
}

const PRESETS_FILE_NAME = 'presets.json'
const CURRENT_VERSION = 1

function getPresetsFilePath(): string {
  return path.join(app.getPath('userData'), PRESETS_FILE_NAME)
}

function createEmptyStore(): PresetStore {
  return {
    version: CURRENT_VERSION,
    defaultPresetId: null,
    presets: []
  }
}

export async function readPresetsStore(): Promise<PresetStore> {
  try {
    const filePath = getPresetsFilePath()
    const data = await fs.readFile(filePath, 'utf-8')
    const store = JSON.parse(data) as PresetStore
    
    // Basic validation
    if (!store.presets || !Array.isArray(store.presets)) {
      console.warn('Invalid presets file, creating new store')
      return createEmptyStore()
    }
    
    return store
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return empty store
      return createEmptyStore()
    }
    
    // Corrupt file - backup and start fresh
    console.error('Failed to read presets file:', error)
    try {
      const filePath = getPresetsFilePath()
      const backupPath = filePath + '.backup.' + Date.now()
      await fs.rename(filePath, backupPath)
      console.log('Backed up corrupt presets file to:', backupPath)
    } catch {
      // Ignore backup errors
    }
    return createEmptyStore()
  }
}

export async function writePresetsStore(store: PresetStore): Promise<void> {
  const filePath = getPresetsFilePath()
  await fs.writeFile(filePath, JSON.stringify(store, null, 2), 'utf-8')
}

export async function getPresets(): Promise<{ success: boolean; presets: Preset[]; defaultPresetId: string | null }> {
  try {
    const store = await readPresetsStore()
    return {
      success: true,
      presets: store.presets,
      defaultPresetId: store.defaultPresetId
    }
  } catch (error) {
    console.error('Failed to get presets:', error)
    return {
      success: false,
      presets: [],
      defaultPresetId: null
    }
  }
}

export async function savePreset(preset: Omit<Preset, 'id' | 'createdAt'>): Promise<{ success: boolean; preset?: Preset; error?: string }> {
  try {
    const store = await readPresetsStore()
    
    const newPreset: Preset = {
      ...preset,
      id: crypto.randomUUID(),
      createdAt: Date.now()
    }
    
    // If this preset is default, unset any existing default
    if (newPreset.isDefault) {
      store.presets = store.presets.map(p => ({ ...p, isDefault: false }))
      store.defaultPresetId = newPreset.id
    }
    
    store.presets.push(newPreset)
    await writePresetsStore(store)
    
    return { success: true, preset: newPreset }
  } catch (error) {
    console.error('Failed to save preset:', error)
    return { success: false, error: String(error) }
  }
}

export async function updatePreset(id: string, updates: Partial<Omit<Preset, 'id' | 'createdAt'>>): Promise<{ success: boolean; preset?: Preset; error?: string }> {
  try {
    const store = await readPresetsStore()
    
    const index = store.presets.findIndex(p => p.id === id)
    if (index === -1) {
      return { success: false, error: 'Preset not found' }
    }
    
    // Handle isDefault change
    if (updates.isDefault === true) {
      store.presets = store.presets.map(p => ({ ...p, isDefault: false }))
      store.defaultPresetId = id
    } else if (updates.isDefault === false && store.defaultPresetId === id) {
      store.defaultPresetId = null
    }
    
    store.presets[index] = { ...store.presets[index], ...updates }
    await writePresetsStore(store)
    
    return { success: true, preset: store.presets[index] }
  } catch (error) {
    console.error('Failed to update preset:', error)
    return { success: false, error: String(error) }
  }
}

export async function deletePreset(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const store = await readPresetsStore()
    
    const index = store.presets.findIndex(p => p.id === id)
    if (index === -1) {
      return { success: false, error: 'Preset not found' }
    }
    
    // Clear default if deleting the default preset
    if (store.defaultPresetId === id) {
      store.defaultPresetId = null
    }
    
    store.presets.splice(index, 1)
    await writePresetsStore(store)
    
    return { success: true }
  } catch (error) {
    console.error('Failed to delete preset:', error)
    return { success: false, error: String(error) }
  }
}

export async function duplicatePreset(id: string): Promise<{ success: boolean; preset?: Preset; error?: string }> {
  try {
    const store = await readPresetsStore()
    
    const original = store.presets.find(p => p.id === id)
    if (!original) {
      return { success: false, error: 'Preset not found' }
    }
    
    const newPreset: Preset = {
      ...original,
      id: crypto.randomUUID(),
      name: `Copy of ${original.name}`,
      createdAt: Date.now(),
      isDefault: false // Duplicates should never be default
    }
    
    store.presets.push(newPreset)
    await writePresetsStore(store)
    
    return { success: true, preset: newPreset }
  } catch (error) {
    console.error('Failed to duplicate preset:', error)
    return { success: false, error: String(error) }
  }
}

export async function setDefaultPreset(id: string | null): Promise<{ success: boolean; error?: string }> {
  try {
    const store = await readPresetsStore()
    
    // Unset all defaults
    store.presets = store.presets.map(p => ({ ...p, isDefault: false }))
    store.defaultPresetId = null
    
    // Set new default if id provided
    if (id) {
      const preset = store.presets.find(p => p.id === id)
      if (!preset) {
        return { success: false, error: 'Preset not found' }
      }
      preset.isDefault = true
      store.defaultPresetId = id
    }
    
    await writePresetsStore(store)
    return { success: true }
  } catch (error) {
    console.error('Failed to set default preset:', error)
    return { success: false, error: String(error) }
  }
}
