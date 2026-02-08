// electron/ipc/keystrokeEditor.ts

/**
 * IPC handlers for Keystroke Editor functionality
 * 
 * Provides handlers for:
 * - start-capture: Start capturing keystroke/mouse events during recording
 * - stop-capture: Stop capturing and return captured events
 * - save-events: Save events to file
 * - load-events: Load events from file
 * - get-settings: Get editor settings
 * - set-settings: Save editor settings
 * - is-capturing: Check if currently capturing
 * 
 * Requirements:
 * - 2.1: Capture all keyboard keydown events using existing keystroke service
 * - 3.1: Save all events to JSON file when recording completes
 * - 4.1: Search for .keystroke.json file when video is loaded
 * - 4.2: Read and parse events from file
 */

import { ipcMain } from 'electron';
import { app } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  keystrokeEventRecorder,
  saveKeystrokeEvents,
  loadKeystrokeEvents,
  getKeystrokeFilePathFromVideo,
} from '../services/keystrokeEventRecorder';
import type { KeystrokeEventData } from '../../src/types/keystrokeEditorEvents';
import type { KeystrokeEditorSettings } from '../../src/types/keystrokeEditorSettings';
import { DEFAULT_KEYSTROKE_EDITOR_SETTINGS } from '../../src/types/keystrokeEditorSettings';

// ============================================
// SETTINGS STORAGE
// ============================================

export interface KeystrokeEditorSettingsStore {
  version: number;
  settings: KeystrokeEditorSettings;
}

const KEYSTROKE_EDITOR_SETTINGS_FILE_NAME = 'keystroke-editor-settings.json';
const CURRENT_VERSION = 1;

function sanitizeFileName(fileName: string): string {
  const basename = path.basename(fileName)
  if (!basename || basename === '.' || basename === '..') {
    throw new Error('Invalid file name')
  }
  return basename
}

function validatePathWithinDir(filePath: string, allowedDir: string): boolean {
  const resolved = path.resolve(filePath)
  const resolvedDir = path.resolve(allowedDir)
  return resolved === resolvedDir || resolved.startsWith(resolvedDir + path.sep)
}

function getKeystrokeEditorSettingsFilePath(): string {
  return path.join(app.getPath('userData'), KEYSTROKE_EDITOR_SETTINGS_FILE_NAME);
}

function createDefaultStore(): KeystrokeEditorSettingsStore {
  return {
    version: CURRENT_VERSION,
    settings: { ...DEFAULT_KEYSTROKE_EDITOR_SETTINGS },
  };
}

async function readKeystrokeEditorSettingsStore(): Promise<KeystrokeEditorSettingsStore> {
  try {
    const filePath = getKeystrokeEditorSettingsFilePath();
    const data = await fs.readFile(filePath, 'utf-8');
    const store = JSON.parse(data) as KeystrokeEditorSettingsStore;

    // Basic validation
    if (!store.settings || typeof store.settings !== 'object') {
      console.warn('[KeystrokeEditor] Invalid settings file, creating new store');
      return createDefaultStore();
    }

    // Merge with defaults to ensure all fields exist (handles version upgrades)
    return {
      version: store.version || CURRENT_VERSION,
      settings: { ...DEFAULT_KEYSTROKE_EDITOR_SETTINGS, ...store.settings },
    };
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      // File doesn't exist, return default store
      return createDefaultStore();
    }

    // Corrupt file - backup and start fresh
    console.error('[KeystrokeEditor] Failed to read settings file:', error);
    try {
      const filePath = getKeystrokeEditorSettingsFilePath();
      const backupPath = filePath + '.backup.' + Date.now();
      await fs.rename(filePath, backupPath);
      console.log('[KeystrokeEditor] Backed up corrupt settings file to:', backupPath);
    } catch {
      // Ignore backup errors
    }
    return createDefaultStore();
  }
}

async function writeKeystrokeEditorSettingsStore(store: KeystrokeEditorSettingsStore): Promise<void> {
  const filePath = getKeystrokeEditorSettingsFilePath();
  await fs.writeFile(filePath, JSON.stringify(store, null, 2), 'utf-8');
}

// ============================================
// SETTINGS HANDLERS
// ============================================

/**
 * Get keystroke editor settings
 * 
 * Requirements:
 * - 9.1-9.7: Settings persistence
 */
export async function getKeystrokeEditorSettings(): Promise<{
  success: boolean;
  settings: KeystrokeEditorSettings;
}> {
  try {
    const store = await readKeystrokeEditorSettingsStore();
    return {
      success: true,
      settings: store.settings,
    };
  } catch (error) {
    console.error('[KeystrokeEditor] Failed to get settings:', error);
    return {
      success: false,
      settings: { ...DEFAULT_KEYSTROKE_EDITOR_SETTINGS },
    };
  }
}

/**
 * Set keystroke editor settings
 * 
 * Requirements:
 * - 9.1-9.7: Settings persistence
 */
export async function setKeystrokeEditorSettings(
  settings: Partial<KeystrokeEditorSettings>
): Promise<{ success: boolean; settings?: KeystrokeEditorSettings; error?: string }> {
  try {
    const store = await readKeystrokeEditorSettingsStore();

    // Merge new settings with existing
    store.settings = { ...store.settings, ...settings };

    await writeKeystrokeEditorSettingsStore(store);

    return { success: true, settings: store.settings };
  } catch (error) {
    console.error('[KeystrokeEditor] Failed to save settings:', error);
    return { success: false, error: String(error) };
  }
}

// ============================================
// IPC HANDLER REGISTRATION
// ============================================

/**
 * Check if keystroke service is available
 * Attempts to load uiohook-napi to verify it can be used
 * 
 * Requirements:
 * - 10.1: Check if keystroke service can initialize
 */
export async function checkKeystrokeServiceAvailability(): Promise<{
  available: boolean;
  error?: string;
}> {
  try {
    // Try to dynamically import uiohook-napi to check if it's available
    await import('uiohook-napi');
    return { available: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[KeystrokeEditor] Keystroke service not available:', errorMessage);
    return {
      available: false,
      error: 'Keystroke capture is not available on this system. The native library could not be loaded.',
    };
  }
}

/**
 * Register all keystroke editor IPC handlers
 * 
 * Call this function from main.ts to register all handlers
 * 
 * Requirements:
 * - 2.1: Start/stop capture during recording
 * - 3.1: Save events to file
 * - 4.1, 4.2: Load events from file
 * - 10.1: Check keystroke service availability
 */
export function registerKeystrokeEditorIpcHandlers(recordingsDir: string): void {
  // ============================================
  // SERVICE AVAILABILITY HANDLER
  // ============================================

  /**
   * Check if keystroke service is available
   * 
   * Requirements:
   * - 10.1: Check if keystroke service can initialize
   */
  ipcMain.handle('keystroke-editor:check-availability', async () => {
    return await checkKeystrokeServiceAvailability();
  });

  // ============================================
  // CAPTURE HANDLERS
  // ============================================

  /**
   * Start capturing keystroke and mouse events
   * 
   * Requirements:
   * - 2.1: Capture all keyboard keydown events using existing keystroke service
   * - 2.2: Capture all mouse click events (left, right, middle)
   * - 10.1: Handle initialization failure gracefully
   */
  ipcMain.handle('keystroke-editor:start-capture', async (_, recordingId: string) => {
    try {
      keystrokeEventRecorder.start(recordingId);
      return { success: true };
    } catch (error) {
      // Requirement 10.1: Log error and return gracefully
      console.error('[KeystrokeEditor] Failed to start capture:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  /**
   * Stop capturing and return captured events
   * 
   * Requirements:
   * - 2.1: Stop capturing events
   */
  ipcMain.handle('keystroke-editor:stop-capture', async () => {
    try {
      const eventData = keystrokeEventRecorder.stop();
      return { success: true, data: eventData };
    } catch (error) {
      console.error('[KeystrokeEditor] Failed to stop capture:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  /**
   * Check if currently capturing
   */
  ipcMain.handle('keystroke-editor:is-capturing', () => {
    return keystrokeEventRecorder.isRunning();
  });

  // ============================================
  // FILE HANDLERS
  // ============================================

  /**
   * Save keystroke events to file
   * 
   * Requirements:
   * - 3.1: Save all events to JSON file when recording completes
   * - 3.2: File naming convention matches video file
   * - 10.2: Log errors and continue gracefully, don't interrupt recording
   */
  ipcMain.handle(
    'keystroke-editor:save-events',
    async (_, eventData: KeystrokeEventData, fileName: string) => {
      try {
        const safeName = sanitizeFileName(fileName)
        const filePath = path.join(recordingsDir, safeName);
        const result = await saveKeystrokeEvents(eventData, filePath);
        
        // Requirement 10.2: Log error but return gracefully
        if (!result.success) {
          console.error('[KeystrokeEditor] Failed to save events:', result.error);
        }
        
        return result;
      } catch (error) {
        // Requirement 10.2: Log error and continue gracefully
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[KeystrokeEditor] Failed to save events:', errorMessage);
        return {
          success: false,
          error: errorMessage,
        };
      }
    }
  );

  /**
   * Load keystroke events from file
   * 
   * Requirements:
   * - 4.1: Search for .keystroke.json file when video is loaded
   * - 4.2: Read and parse events from file
   * - 4.4: Handle missing/corrupt file gracefully
   * - 10.3: Log errors and continue gracefully, don't interrupt video loading
   */
  ipcMain.handle('keystroke-editor:load-events', async (_, videoPath: string) => {
    try {
      const resolvedVideoPath = path.resolve(videoPath)
      if (!validatePathWithinDir(resolvedVideoPath, recordingsDir)) {
        return { success: false, error: 'Invalid video path' }
      }

      const keystrokeFilePath = getKeystrokeFilePathFromVideo(resolvedVideoPath);
      const result = await loadKeystrokeEvents(keystrokeFilePath);
      
      // Requirement 10.3: Log error but return gracefully for corrupt files
      if (!result.success && !result.notFound && result.error) {
        console.error('[KeystrokeEditor] Failed to load events (corrupt file):', result.error);
      }
      
      return result;
    } catch (error) {
      // Requirement 10.3: Log error and continue gracefully
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[KeystrokeEditor] Failed to load events:', errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  });

  // ============================================
  // SETTINGS HANDLERS
  // ============================================

  /**
   * Get keystroke editor settings
   * 
   * Requirements:
   * - 9.1-9.7: Settings persistence
   */
  ipcMain.handle('keystroke-editor:get-settings', async () => {
    return await getKeystrokeEditorSettings();
  });

  /**
   * Set keystroke editor settings
   * 
   * Requirements:
   * - 9.1-9.7: Settings persistence
   */
  ipcMain.handle(
    'keystroke-editor:set-settings',
    async (_, settings: Partial<KeystrokeEditorSettings>) => {
      return await setKeystrokeEditorSettings(settings);
    }
  );

  console.log('[KeystrokeEditor] IPC handlers registered');
}
