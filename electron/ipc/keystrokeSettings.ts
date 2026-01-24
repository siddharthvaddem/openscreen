// electron/ipc/keystrokeSettings.ts

import { app } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { KeystrokeSettings } from '../../src/types/keystrokeSettings'
import { DEFAULT_KEYSTROKE_SETTINGS } from '../../src/types/keystrokeSettings'

export interface KeystrokeSettingsStore {
  version: number;
  settings: KeystrokeSettings;
}

const KEYSTROKE_SETTINGS_FILE_NAME = 'keystroke-settings.json'
const CURRENT_VERSION = 1

function getKeystrokeSettingsFilePath(): string {
  return path.join(app.getPath('userData'), KEYSTROKE_SETTINGS_FILE_NAME)
}

function createDefaultStore(): KeystrokeSettingsStore {
  return {
    version: CURRENT_VERSION,
    settings: { ...DEFAULT_KEYSTROKE_SETTINGS }
  }
}

export async function readKeystrokeSettingsStore(): Promise<KeystrokeSettingsStore> {
  try {
    const filePath = getKeystrokeSettingsFilePath()
    const data = await fs.readFile(filePath, 'utf-8')
    const store = JSON.parse(data) as KeystrokeSettingsStore
    
    // Basic validation
    if (!store.settings || typeof store.settings !== 'object') {
      console.warn('Invalid keystroke settings file, creating new store')
      return createDefaultStore()
    }
    
    // Merge with defaults to ensure all fields exist (handles version upgrades)
    return {
      version: store.version || CURRENT_VERSION,
      settings: { ...DEFAULT_KEYSTROKE_SETTINGS, ...store.settings }
    }
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      // File doesn't exist, return default store
      return createDefaultStore()
    }
    
    // Corrupt file - backup and start fresh
    console.error('Failed to read keystroke settings file:', error)
    try {
      const filePath = getKeystrokeSettingsFilePath()
      const backupPath = filePath + '.backup.' + Date.now()
      await fs.rename(filePath, backupPath)
      console.log('Backed up corrupt keystroke settings file to:', backupPath)
    } catch {
      // Ignore backup errors
    }
    return createDefaultStore()
  }
}

export async function writeKeystrokeSettingsStore(store: KeystrokeSettingsStore): Promise<void> {
  const filePath = getKeystrokeSettingsFilePath()
  await fs.writeFile(filePath, JSON.stringify(store, null, 2), 'utf-8')
}

export async function getKeystrokeSettings(): Promise<{ success: boolean; settings: KeystrokeSettings }> {
  try {
    const store = await readKeystrokeSettingsStore()
    return {
      success: true,
      settings: store.settings
    }
  } catch (error) {
    console.error('Failed to get keystroke settings:', error)
    return {
      success: false,
      settings: { ...DEFAULT_KEYSTROKE_SETTINGS }
    }
  }
}

export async function setKeystrokeSettings(settings: Partial<KeystrokeSettings>): Promise<{ success: boolean; settings?: KeystrokeSettings; error?: string }> {
  try {
    const store = await readKeystrokeSettingsStore()
    
    // Merge new settings with existing
    store.settings = { ...store.settings, ...settings }
    
    await writeKeystrokeSettingsStore(store)
    
    return { success: true, settings: store.settings }
  } catch (error) {
    console.error('Failed to save keystroke settings:', error)
    return { success: false, error: String(error) }
  }
}
