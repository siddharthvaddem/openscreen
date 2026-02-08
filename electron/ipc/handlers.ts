import { ipcMain, desktopCapturer, BrowserWindow, shell, app, dialog } from 'electron'

import fs from 'node:fs/promises'
import path from 'node:path'
import { RECORDINGS_DIR } from '../main'
import {
  getPresets,
  savePreset,
  updatePreset,
  deletePreset,
  duplicatePreset,
  setDefaultPreset,
  type Preset,
  type PresetSettings
} from './presets'
import { transcribeVideo } from '../services/transcription'
import type { TranscriptionRequest, TranscriptionProgress } from '../../src/types/transcription'
import { mouseEventDetector } from '../services/mouseEventDetector'
import type { MouseEventData } from '../../src/types/mouseEvents'
import { 
  setApiKey, 
  getApiKey, 
  deleteApiKey, 
  hasApiKey,
  isEncryptionAvailable 
} from '../services/secureStorage'
import { getCameraPermissionStatus, requestCameraAccess } from '../permissions'

interface SelectedSource {
  name: string
}

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

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error
}

let selectedSource: SelectedSource | null = null
let currentVideoPath: string | null = null;
const explicitlySelectedVideoPaths = new Set<string>()

export function registerIpcHandlers(
  createEditorWindow: () => void,
  createSourceSelectorWindow: () => BrowserWindow,
  getMainWindow: () => BrowserWindow | null,
  getSourceSelectorWindow: () => BrowserWindow | null,
  onRecordingStateChange?: (recording: boolean, sourceName: string) => void
) {
  ipcMain.handle('get-sources', async (_, opts) => {
    const sources = await desktopCapturer.getSources(opts)
    return sources.map(source => ({
      id: source.id,
      name: source.name,
      display_id: source.display_id,
      thumbnail: source.thumbnail ? source.thumbnail.toDataURL() : null,
      appIcon: source.appIcon ? source.appIcon.toDataURL() : null
    }))
  })

  ipcMain.handle('select-source', (_, source) => {
    selectedSource = source as SelectedSource
    const sourceSelectorWin = getSourceSelectorWindow()
    if (sourceSelectorWin) {
      sourceSelectorWin.close()
    }
    return selectedSource
  })

  ipcMain.handle('get-selected-source', () => {
    return selectedSource
  })

  ipcMain.handle('open-source-selector', () => {
    const sourceSelectorWin = getSourceSelectorWindow()
    if (sourceSelectorWin) {
      sourceSelectorWin.focus()
      return
    }
    createSourceSelectorWindow()
  })

  ipcMain.handle('switch-to-editor', () => {
    const mainWin = getMainWindow()
    if (mainWin) {
      mainWin.close()
    }
    createEditorWindow()
  })



  ipcMain.handle('store-recorded-video', async (_, videoData: ArrayBuffer, fileName: string) => {
    try {
      const videoPath = path.join(RECORDINGS_DIR, sanitizeFileName(fileName))
      await fs.writeFile(videoPath, Buffer.from(videoData))
      currentVideoPath = videoPath;
      return {
        success: true,
        path: videoPath,
        message: 'Video stored successfully'
      }
    } catch (error) {
      console.error('Failed to store video:', error)
      return {
        success: false,
        message: 'Failed to store video',
        error: String(error)
      }
    }
  })



  ipcMain.handle('get-recorded-video-path', async () => {
    try {
      const files = await fs.readdir(RECORDINGS_DIR)
      const videoFiles = files.filter(file => file.endsWith('.webm'))
      
      if (videoFiles.length === 0) {
        return { success: false, message: 'No recorded video found' }
      }
      
      const latestVideo = videoFiles.sort().reverse()[0]
      const videoPath = path.join(RECORDINGS_DIR, latestVideo)
      
      return { success: true, path: videoPath }
    } catch (error) {
      console.error('Failed to get video path:', error)
      return { success: false, message: 'Failed to get video path', error: String(error) }
    }
  })

  ipcMain.handle('set-recording-state', (_, recording: boolean) => {
    const sourceName = selectedSource?.name ?? 'Screen'
    if (onRecordingStateChange) {
      onRecordingStateChange(recording, sourceName)
    }
  })


  ipcMain.handle('open-external-url', async (_, url: string) => {
    try {
      await shell.openExternal(url)
      return { success: true }
    } catch (error) {
      console.error('Failed to open URL:', error)
      return { success: false, error: String(error) }
    }
  })

  // Return base path for assets so renderer can resolve file:// paths in production
  ipcMain.handle('get-asset-base-path', () => {
    try {
      if (app.isPackaged) {
        return path.join(process.resourcesPath, 'assets')
      }
      return path.join(app.getAppPath(), 'public', 'assets')
    } catch (err) {
      console.error('Failed to resolve asset base path:', err)
      return null
    }
  })

  ipcMain.handle('save-exported-video', async (_, videoData: ArrayBuffer, fileName: string) => {
    try {
      // Determine file type from extension
      const isGif = fileName.toLowerCase().endsWith('.gif');
      const filters = isGif 
        ? [{ name: 'GIF Image', extensions: ['gif'] }]
        : [{ name: 'MP4 Video', extensions: ['mp4'] }];

      const result = await dialog.showSaveDialog({
        title: isGif ? 'Save Exported GIF' : 'Save Exported Video',
        defaultPath: path.join(app.getPath('downloads'), fileName),
        filters,
        properties: ['createDirectory', 'showOverwriteConfirmation']
      });


      if (result.canceled || !result.filePath) {
        return {
          success: false,
          cancelled: true,
          message: 'Export cancelled'
        };
      }

      await fs.writeFile(result.filePath, Buffer.from(videoData));

      return {
        success: true,
        path: result.filePath,
        message: 'Video exported successfully'
      };
    } catch (error) {
      console.error('Failed to save exported video:', error)
      return {
        success: false,
        message: 'Failed to save exported video',
        error: String(error)
      }
    }
  })

  ipcMain.handle('open-video-file-picker', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Select Video File',
        defaultPath: RECORDINGS_DIR,
        filters: [
          { name: 'Video Files', extensions: ['webm', 'mp4', 'mov', 'avi', 'mkv'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, cancelled: true };
      }

      const selectedPath = path.resolve(result.filePaths[0])
      explicitlySelectedVideoPaths.add(selectedPath)

      return {
        success: true,
        path: selectedPath
      };
    } catch (error) {
      console.error('Failed to open file picker:', error);
      return {
        success: false,
        message: 'Failed to open file picker',
        error: String(error)
      };
    }
  });

  ipcMain.handle('set-current-video-path', (_, path: string) => {
    currentVideoPath = path;
    return { success: true };
  });

  ipcMain.handle('get-current-video-path', () => {
    return currentVideoPath ? { success: true, path: currentVideoPath } : { success: false };
  });

  ipcMain.handle('clear-current-video-path', () => {
    currentVideoPath = null;
    return { success: true };
  });

  ipcMain.handle('get-platform', () => {
    return process.platform;
  });

  // ============================================
  // PRESET HANDLERS
  // ============================================

  ipcMain.handle('presets:get', async () => {
    return await getPresets();
  });

  ipcMain.handle('presets:save', async (_, preset: { name: string; isDefault: boolean; settings: PresetSettings }) => {
    return await savePreset(preset);
  });

  ipcMain.handle('presets:update', async (_, id: string, updates: Partial<Omit<Preset, 'id' | 'createdAt'>>) => {
    return await updatePreset(id, updates);
  });

  ipcMain.handle('presets:delete', async (_, id: string) => {
    return await deletePreset(id);
  });

  ipcMain.handle('presets:duplicate', async (_, id: string) => {
    return await duplicatePreset(id);
  });

  ipcMain.handle('presets:setDefault', async (_, id: string | null) => {
    return await setDefaultPreset(id);
  });

  // ============================================
  // TRANSCRIPTION HANDLERS
  // ============================================

  ipcMain.handle('transcribe-video', async (_event, request: TranscriptionRequest) => {
    return await transcribeVideo(request, (progress: TranscriptionProgress) => {
      const mainWindow = getMainWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('transcription-progress', progress);
      }
    });
  });

  // ============================================
  // SECURE STORAGE HANDLERS
  // ============================================

  ipcMain.handle('secure-storage:is-available', () => {
    return { available: isEncryptionAvailable() };
  });

  ipcMain.handle('secure-storage:set-api-key', async (_, service: string, apiKey: string) => {
    return setApiKey(service, apiKey);
  });

  ipcMain.handle('secure-storage:get-api-key', async (_, service: string) => {
    return getApiKey(service);
  });

  ipcMain.handle('secure-storage:delete-api-key', async (_, service: string) => {
    return deleteApiKey(service);
  });

  ipcMain.handle('secure-storage:has-api-key', async (_, service: string) => {
    return { hasKey: hasApiKey(service) };
  });

  // ============================================
  // AUTO ZOOM HANDLERS
  // ============================================

  ipcMain.handle('auto-zoom:start-detection', async (_, recordingId: string, screenBounds: { width: number; height: number }) => {
    try {
      mouseEventDetector.start(recordingId, screenBounds);
      return { success: true };
    } catch (error) {
      console.error('Failed to start mouse event detection:', error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('auto-zoom:stop-detection', async () => {
    try {
      const eventData = mouseEventDetector.stop();
      return { success: true, data: eventData };
    } catch (error) {
      console.error('Failed to stop mouse event detection:', error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('auto-zoom:save-events', async (_, eventData: MouseEventData, fileName: string) => {
    try {
      const eventsPath = path.join(RECORDINGS_DIR, sanitizeFileName(fileName));
      await fs.writeFile(eventsPath, JSON.stringify(eventData, null, 2));
      return { success: true, path: eventsPath };
    } catch (error) {
      console.error('Failed to save mouse events:', error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('auto-zoom:get-events', async (_, videoPath: string) => {
    try {
      const resolvedVideoPath = path.resolve(videoPath)
      const isInRecordingsDir = validatePathWithinDir(resolvedVideoPath, RECORDINGS_DIR)
      const isExplicitlySelected = explicitlySelectedVideoPaths.has(resolvedVideoPath)

      if (!isInRecordingsDir && !isExplicitlySelected) {
        return { success: false, error: 'Invalid video path' }
      }

      const eventsPath = resolvedVideoPath.replace(/\.(webm|mp4|mov|avi|mkv)$/i, '.events.json');

      try {
        const data = await fs.readFile(eventsPath, 'utf-8');
        const eventData = JSON.parse(data) as MouseEventData;
        return { success: true, data: eventData };
      } catch (readError: unknown) {
        if (isErrnoException(readError) && (readError as NodeJS.ErrnoException).code === 'ENOENT') {
          return { success: false, notFound: true };
        }
        throw readError;
      }
    } catch (error) {
      console.error('Failed to get mouse events:', error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('auto-zoom:is-running', () => {
    return mouseEventDetector.isRunning();
  });

  // ============================================
  // CAMERA PERMISSION HANDLERS
  // ============================================

  ipcMain.handle('camera:get-permission-status', () => {
    try {
      const status = getCameraPermissionStatus();
      return { success: true, status };
    } catch (error) {
      console.error('Failed to get camera permission status:', error);
      return { success: false, status: 'unknown', error: String(error) };
    }
  });

   ipcMain.handle('camera:request-access', async () => {
    try {
      const granted = await requestCameraAccess();
      return { success: true, granted };
    } catch (error) {
      console.error('Failed to request camera access:', error);
      return { success: false, granted: false, error: String(error) };
    }
  });

  // ============================================
  // WEBCAM FILE DISCOVERY HANDLERS
  // ============================================

  ipcMain.handle('webcam:get-webcam-video-path', async (_, mainVideoPath: string) => {
    try {
      const resolvedVideoPath = path.resolve(mainVideoPath)
      const isInRecordingsDir = validatePathWithinDir(resolvedVideoPath, RECORDINGS_DIR)
      const isExplicitlySelected = explicitlySelectedVideoPaths.has(resolvedVideoPath)

      if (!isInRecordingsDir && !isExplicitlySelected) {
        return { success: false, error: 'Invalid video path' }
      }

      const webcamPath = resolvedVideoPath.replace(/\.(webm|mp4|mov|avi|mkv)$/i, '.webcam.webm');

      try {
        await fs.access(webcamPath);
        return { success: true, path: webcamPath };
      } catch (accessError: unknown) {
        if (isErrnoException(accessError) && (accessError as NodeJS.ErrnoException).code === 'ENOENT') {
          return { success: false, notFound: true };
        }
        throw accessError;
      }
    } catch (error) {
      console.error('Failed to get webcam video path:', error);
      return { success: false, error: String(error) };
    }
  });
}
