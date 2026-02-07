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
    onStartRecordingFromShortcut: (callback: () => void) => () => void
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
    }>;
    onTranscriptionProgress: (callback: (progress: {
      status: string;
      progress: number;
      message: string;
    }) => void) => () => void;
    // Auto Zoom API
    autoZoom: {
      startDetection: (recordingId: string, screenBounds: { width: number; height: number }) => Promise<{ success: boolean; error?: string }>
      stopDetection: () => Promise<{ success: boolean; data?: any; error?: string }>
      saveEvents: (eventData: any, fileName: string) => Promise<{ success: boolean; path?: string; error?: string }>
      getEvents: (videoPath: string) => Promise<{ success: boolean; data?: any; notFound?: boolean; error?: string }>
      isRunning: () => Promise<boolean>
    }
    // Keystroke Editor API
    keystrokeEditor: {
      checkAvailability: () => Promise<{ available: boolean; error?: string }>
      startCapture: (recordingId: string) => Promise<{ success: boolean; error?: string }>
      stopCapture: () => Promise<{ success: boolean; data?: KeystrokeEditorEventData; error?: string }>
      isCapturing: () => Promise<boolean>
      saveEvents: (eventData: KeystrokeEditorEventData, fileName: string) => Promise<{ success: boolean; path?: string; error?: string }>
      loadEvents: (videoPath: string) => Promise<{ success: boolean; data?: KeystrokeEditorEventData; notFound?: boolean; error?: string }>
      getSettings: () => Promise<{ success: boolean; settings: KeystrokeEditorSettingsType }>
      setSettings: (settings: Partial<KeystrokeEditorSettingsType>) => Promise<{ success: boolean; settings?: KeystrokeEditorSettingsType; error?: string }>
    }
    // ============================================
    // SECURE STORAGE API
    // ============================================
    secureStorage: {
      isAvailable: () => Promise<{ available: boolean }>
      setApiKey: (service: string, apiKey: string) => Promise<{ success: boolean; error?: string }>
      getApiKey: (service: string) => Promise<{ success: boolean; apiKey?: string; error?: string; notFound?: boolean }>
      deleteApiKey: (service: string) => Promise<{ success: boolean; error?: string }>
      hasApiKey: (service: string) => Promise<{ hasKey: boolean }>
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

// ============================================
// Keystroke Editor types for electronAPI
// ============================================

// Position presets for keystroke overlay
type KeystrokeEditorPositionPreset = 
  | 'bottom-center' 
  | 'bottom-left' 
  | 'bottom-right' 
  | 'top-center'
  | 'top-left'
  | 'top-right';

// Animation presets for keystroke overlay
type KeystrokeEditorAnimationPreset = 
  | 'fade' 
  | 'slide-up' 
  | 'slide-down' 
  | 'scale' 
  | 'none';

// Style configuration for keystroke overlay
interface KeystrokeEditorStyle {
  textColor: string;
  backgroundColor: string;
  modifierColor: string;
  textScale: number;
  borderRadius: number;
  fadeDurationMs: number;
  lingerDurationMs: number;
  animationIn: KeystrokeEditorAnimationPreset;
  animationOut: KeystrokeEditorAnimationPreset;
  showOnlyHotkeys: boolean;
}

// Settings for keystroke editor
interface KeystrokeEditorSettingsType {
  captureEnabled: boolean;
  defaultStyle: KeystrokeEditorStyle;
  defaultPosition: KeystrokeEditorPositionPreset;
}

// Recorded keystroke event
interface RecordedKeystrokeEditorEvent {
  type: 'keystroke';
  timestamp: number;
  keyCode: number;
  keyName: string;
  modifiers: {
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
  };
}

// Recorded mouse click event
interface RecordedMouseClickEditorEvent {
  type: 'mouse';
  timestamp: number;
  button: 'left' | 'right' | 'middle';
  modifiers: {
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
  };
}

// Union type for recorded input events
type RecordedEditorInputEvent = RecordedKeystrokeEditorEvent | RecordedMouseClickEditorEvent;

// Event data structure for keystroke editor
interface KeystrokeEditorEventData {
  version: 1;
  recordingId: string;
  events: RecordedEditorInputEvent[];
}
