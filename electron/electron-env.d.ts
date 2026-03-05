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
    getSources: (opts: Electron.SourcesOptions) => Promise<ProcessedDesktopSource[]>
    switchToEditor: () => Promise<void>
    openSourceSelector: () => Promise<void>
    selectSource: (source: any) => Promise<any>
    getSelectedSource: () => Promise<any>
    storeRecordedVideo: (videoData: ArrayBuffer, fileName: string) => Promise<{ success: boolean; path?: string; message?: string }>
    getRecordedVideoPath: () => Promise<{ success: boolean; path?: string; message?: string }>
    setRecordingState: (recording: boolean) => Promise<void>
    getCursorTelemetry: (videoPath?: string) => Promise<{ success: boolean; samples: CursorTelemetryPoint[]; message?: string; error?: string }>
    onStopRecordingFromTray: (callback: () => void) => () => void
    openExternalUrl: (url: string) => Promise<{ success: boolean; error?: string }>
    saveExportedVideo: (videoData: ArrayBuffer, fileName: string) => Promise<{ success: boolean; path?: string; message?: string; canceled?: boolean }>
    openVideoFilePicker: () => Promise<{ success: boolean; path?: string; canceled?: boolean }>
    setCurrentVideoPath: (path: string) => Promise<{ success: boolean }>
    getCurrentVideoPath: () => Promise<{ success: boolean; path?: string }>
    clearCurrentVideoPath: () => Promise<{ success: boolean }>
    saveProjectFile: (projectData: unknown, suggestedName?: string, existingProjectPath?: string) => Promise<{ success: boolean; path?: string; message?: string; canceled?: boolean; error?: string }>
    loadProjectFile: () => Promise<{ success: boolean; path?: string; project?: unknown; message?: string; canceled?: boolean; error?: string }>
    loadCurrentProjectFile: () => Promise<{ success: boolean; path?: string; project?: unknown; message?: string; canceled?: boolean; error?: string }>
    onMenuLoadProject: (callback: () => void) => () => void
    onMenuSaveProject: (callback: () => void) => () => void
    onMenuSaveProjectAs: (callback: () => void) => () => void
    getPlatform: () => Promise<string>
    revealInFolder: (filePath: string) => Promise<{ success: boolean; error?: string; message?: string }>,
    getShortcuts: () => Promise<Record<string, unknown> | null>
    saveShortcuts: (shortcuts: unknown) => Promise<{ success: boolean; error?: string }>
    hudOverlayHide: () => void;
    hudOverlayClose: () => void;
    setMicrophoneExpanded: (micEnabled: boolean) => Promise<void>
  }
}

interface ProcessedDesktopSource {
  id: string
  name: string
  display_id: string
  thumbnail: string | null
  appIcon: string | null
}

interface CursorTelemetryPoint {
  timeMs: number
  cx: number
  cy: number
}
