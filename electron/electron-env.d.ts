/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    APP_ROOT: string
    /** /dist/ or /public/ */
    VITE_PUBLIC: string
  }
}

// Used in Renderer process, expose in `preload.ts`
interface Window {
  electronAPI: {
    getAssetBasePath: () => Promise<string | null>
    getSources: (opts: Electron.SourcesOptions) => Promise<ProcessedDesktopSource[]>
    switchToEditor: () => Promise<void>
    openSourceSelector: () => Promise<void>
    selectSource: (source: any) => Promise<any>
    getSelectedSource: () => Promise<any>
    storeRecordedVideo: (videoData: ArrayBuffer, fileName: string) => Promise<{ success: boolean; path?: string; message?: string }>
    getRecordedVideoPath: () => Promise<{ success: boolean; path?: string; message?: string }>
    setRecordingState: (recording: boolean) => Promise<void>
    onStopRecordingFromTray: (callback: () => void) => () => void
    openExternalUrl: (url: string) => Promise<{ success: boolean; error?: string }>
    saveExportedVideo: (videoData: ArrayBuffer, fileName: string) => Promise<{ success: boolean; path?: string; message?: string; cancelled?: boolean }>
    openVideoFilePicker: () => Promise<{ success: boolean; path?: string; cancelled?: boolean }>
    setCurrentVideoPath: (path: string) => Promise<{ success: boolean }>
    getCurrentVideoPath: () => Promise<{ success: boolean; path?: string }>
    clearCurrentVideoPath: () => Promise<{ success: boolean }>
    getPlatform: () => Promise<string>
    hudOverlayHide: () => void;
    hudOverlayClose: () => void;
    presets: {
      get: () => Promise<{ success: boolean; presets: Preset[]; defaultPresetId: string | null }>
      save: (preset: { name: string; isDefault: boolean; settings: PresetSettings }) => Promise<{ success: boolean; preset?: Preset; error?: string }>
      update: (id: string, updates: Partial<{ name: string; isDefault: boolean; settings: PresetSettings }>) => Promise<{ success: boolean; preset?: Preset; error?: string }>
      delete: (id: string) => Promise<{ success: boolean; error?: string }>
      duplicate: (id: string) => Promise<{ success: boolean; preset?: Preset; error?: string }>
      setDefault: (id: string | null) => Promise<{ success: boolean; error?: string }>
    }
    keystroke: {
      start: () => Promise<{ success: boolean; error?: string }>
      stop: () => Promise<{ success: boolean }>
      getSettings: () => Promise<KeystrokeSettings | null>
      setSettings: (settings: KeystrokeSettings) => Promise<{ success: boolean; error?: string }>
      showOverlay: () => Promise<{ success: boolean; error?: string }>
      hideOverlay: () => Promise<{ success: boolean }>
      onEvent: (callback: (event: KeystrokeOrMouseEvent) => void) => () => void
    }
    // Transcription API
    transcribeVideo: (request: { 
      videoPath: string; 
      language: string; 
      apiKey: string 
    }) => Promise<{
      success: boolean;
      words?: Array<{
        text: string;
        startMs: number;
        endMs: number;
        confidence: number;
      }>;
      error?: string;
    }>
    onTranscriptionProgress: (callback: (progress: {
      status: string;
      progress: number;
      message: string;
    }) => void) => () => void
    // Auto Zoom API
    autoZoom: {
      startDetection: (recordingId: string, screenBounds: { width: number; height: number }) => Promise<{ success: boolean; error?: string }>
      stopDetection: () => Promise<{ success: boolean; data?: any; error?: string }>
      saveEvents: (eventData: any, fileName: string) => Promise<{ success: boolean; path?: string; error?: string }>
      getEvents: (videoPath: string) => Promise<{ success: boolean; data?: any; notFound?: boolean; error?: string }>
      isRunning: () => Promise<boolean>
    }
  }
}

interface ProcessedDesktopSource {
  id: string
  name: string
  display_id: string
  thumbnail: string | null
  appIcon: string | null
}

// Preset types for electronAPI
interface PresetSettings {
  padding: number
  shadowIntensity: number
  borderRadius: number
  motionBlurEnabled: boolean
  showBlur: boolean
  wallpaper: string
}

interface Preset {
  id: string
  name: string
  createdAt: number
  isDefault: boolean
  settings: PresetSettings
}

// Keystroke types for electronAPI
interface KeystrokeSettings {
  enabled: boolean
  position: 'bottom-center' | 'bottom-left' | 'bottom-right' | 'top-center'
  fadeDurationMs: number
  fadeDelayMs: number
  groupingThresholdMs: number
  showMouseClicks: boolean
  textScale: number
}

interface KeystrokeModifiers {
  ctrl: boolean
  alt: boolean
  shift: boolean
  meta: boolean
}

interface KeystrokeInputEvent {
  type: 'keystroke'
  timestamp: number
  key: string
  keyCode: number
  modifiers: KeystrokeModifiers
}

interface MouseInputEvent {
  type: 'mouse'
  timestamp: number
  button: 'left' | 'right' | 'middle'
  modifiers: KeystrokeModifiers
}

type KeystrokeOrMouseEvent = KeystrokeInputEvent | MouseInputEvent
