import { contextBridge, ipcRenderer } from 'electron'
import type { MouseEventData } from '../src/types/mouseEvents'
import type { Preset, PresetSettings } from './ipc/presets'
import type { TranscriptionProgress, TranscriptionRequest } from '../src/types/transcription'
import type { KeystrokeEventData } from '../src/types/keystrokeEditorEvents'
import type { KeystrokeEditorSettings } from '../src/types/keystrokeEditorSettings'

interface ProcessedDesktopSource {
  id: string
  name: string
  display_id: string
  thumbnail: string | null
  appIcon: string | null
}

contextBridge.exposeInMainWorld('electronAPI', {
    hudOverlayHide: () => {
      ipcRenderer.send('hud-overlay-hide');
    },
    hudOverlayClose: () => {
      ipcRenderer.send('hud-overlay-close');
    },
  getAssetBasePath: async () => {
    // ask main process for the correct base path (production vs dev)
    return await ipcRenderer.invoke('get-asset-base-path')
  },
  getSources: async (opts: Electron.SourcesOptions) => {
    return await ipcRenderer.invoke('get-sources', opts)
  },
  switchToEditor: () => {
    return ipcRenderer.invoke('switch-to-editor')
  },
  openSourceSelector: () => {
    return ipcRenderer.invoke('open-source-selector')
  },
  selectSource: (source: ProcessedDesktopSource) => {
    return ipcRenderer.invoke('select-source', source)
  },
  getSelectedSource: () => {
    return ipcRenderer.invoke('get-selected-source')
  },

  storeRecordedVideo: (videoData: ArrayBuffer, fileName: string) => {
    return ipcRenderer.invoke('store-recorded-video', videoData, fileName)
  },

  getRecordedVideoPath: () => {
    return ipcRenderer.invoke('get-recorded-video-path')
  },
  setRecordingState: (recording: boolean) => {
    return ipcRenderer.invoke('set-recording-state', recording)
  },
  onStopRecordingFromTray: (callback: (_event: unknown) => void) => {
    const listener = (event: Electron.IpcRendererEvent) => callback(event)
    ipcRenderer.on('stop-recording-from-tray', listener)
    return () => ipcRenderer.removeListener('stop-recording-from-tray', listener)
  },
  onStartRecordingFromShortcut: (callback: (_event: unknown, ...args: unknown[]) => void) => {
    const listener = (event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(event, ...args)
    ipcRenderer.on('start-recording-from-shortcut', listener)
    return () => ipcRenderer.removeListener('start-recording-from-shortcut', listener)
  },
  openExternalUrl: (url: string) => {
    return ipcRenderer.invoke('open-external-url', url)
  },
  saveExportedVideo: (videoData: ArrayBuffer, fileName: string) => {
    return ipcRenderer.invoke('save-exported-video', videoData, fileName)
  },
  openVideoFilePicker: () => {
    return ipcRenderer.invoke('open-video-file-picker')
  },
  setCurrentVideoPath: (path: string) => {
    return ipcRenderer.invoke('set-current-video-path', path)
  },
  getCurrentVideoPath: () => {
    return ipcRenderer.invoke('get-current-video-path')
  },
  clearCurrentVideoPath: () => {
    return ipcRenderer.invoke('clear-current-video-path')
  },
  getPlatform: () => {
    return ipcRenderer.invoke('get-platform')
  },

  // ============================================
  // PRESET API
  // ============================================
  presets: {
    get: () => {
      return ipcRenderer.invoke('presets:get')
    },
    save: (preset: { name: string; isDefault: boolean; settings: PresetSettings }) => {
      return ipcRenderer.invoke('presets:save', preset)
    },
    update: (id: string, updates: Partial<Omit<Preset, 'id' | 'createdAt'>>) => {
      return ipcRenderer.invoke('presets:update', id, updates)
    },
    delete: (id: string) => {
      return ipcRenderer.invoke('presets:delete', id)
    },
    duplicate: (id: string) => {
      return ipcRenderer.invoke('presets:duplicate', id)
    },
    setDefault: (id: string | null) => {
      return ipcRenderer.invoke('presets:setDefault', id)
    },
  },

  // ============================================
  // TRANSCRIPTION API
  // ============================================
  transcribeVideo: (request: TranscriptionRequest) => {
    return ipcRenderer.invoke('transcribe-video', request)
  },

  onTranscriptionProgress: (callback: (progress: TranscriptionProgress) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: TranscriptionProgress) => callback(progress)
    ipcRenderer.on('transcription-progress', listener)
    return () => ipcRenderer.removeListener('transcription-progress', listener)
  },

  // ============================================
  // SECURE STORAGE API
  // ============================================
  secureStorage: {
    isAvailable: () => {
      return ipcRenderer.invoke('secure-storage:is-available')
    },
    setApiKey: (service: string, apiKey: string) => {
      return ipcRenderer.invoke('secure-storage:set-api-key', service, apiKey)
    },
    getApiKey: (service: string) => {
      return ipcRenderer.invoke('secure-storage:get-api-key', service)
    },
    deleteApiKey: (service: string) => {
      return ipcRenderer.invoke('secure-storage:delete-api-key', service)
    },
    hasApiKey: (service: string) => {
      return ipcRenderer.invoke('secure-storage:has-api-key', service)
    },
  },

  // ============================================
  // AUTO ZOOM API
  // ============================================
  autoZoom: {
    startDetection: (recordingId: string, screenBounds: { width: number; height: number }) => {
      return ipcRenderer.invoke('auto-zoom:start-detection', recordingId, screenBounds)
    },
    stopDetection: () => {
      return ipcRenderer.invoke('auto-zoom:stop-detection')
    },
    saveEvents: (eventData: MouseEventData, fileName: string) => {
      return ipcRenderer.invoke('auto-zoom:save-events', eventData, fileName)
    },
    getEvents: (videoPath: string) => {
      return ipcRenderer.invoke('auto-zoom:get-events', videoPath)
    },
    isRunning: () => {
      return ipcRenderer.invoke('auto-zoom:is-running')
    },
  },

  // ============================================
  // KEYSTROKE EDITOR API
  // ============================================
  keystrokeEditor: {
    checkAvailability: () => {
      return ipcRenderer.invoke('keystroke-editor:check-availability')
    },
    startCapture: (recordingId: string) => {
      return ipcRenderer.invoke('keystroke-editor:start-capture', recordingId)
    },
    stopCapture: () => {
      return ipcRenderer.invoke('keystroke-editor:stop-capture')
    },
    isCapturing: () => {
      return ipcRenderer.invoke('keystroke-editor:is-capturing')
    },
    saveEvents: (eventData: KeystrokeEventData, fileName: string) => {
      return ipcRenderer.invoke('keystroke-editor:save-events', eventData, fileName)
    },
    loadEvents: (videoPath: string) => {
      return ipcRenderer.invoke('keystroke-editor:load-events', videoPath)
    },
    getSettings: () => {
      return ipcRenderer.invoke('keystroke-editor:get-settings')
    },
    setSettings: (settings: Partial<KeystrokeEditorSettings>) => {
      return ipcRenderer.invoke('keystroke-editor:set-settings', settings)
    },
  },
})
