/// <reference types="vite/client" />
/// <reference types="../electron/electron-env" />

interface ProcessedDesktopSource {
  id: string;
  name: string;
  display_id: string;
  thumbnail: string | null;
  appIcon: string | null;
}

interface CursorTelemetryPoint {
  timeMs: number;
  cx: number;
  cy: number;
}

interface Window {
  electronAPI: {
    getSources: (opts: Electron.SourcesOptions) => Promise<ProcessedDesktopSource[]>
    switchToEditor: () => Promise<void>
    openSourceSelector: () => Promise<void>
    selectSource: (source: any) => Promise<any>
    getSelectedSource: () => Promise<any>
    storeRecordedVideo: (videoData: ArrayBuffer, fileName: string) => Promise<{
      success: boolean
      path?: string
      message: string
      error?: string
    }>
    getRecordedVideoPath: () => Promise<{
      success: boolean
      path?: string
      message?: string
      error?: string
    }>
    getAssetBasePath: () => Promise<string | null>
    setRecordingState: (recording: boolean) => Promise<void>
    getCursorTelemetry: (videoPath?: string) => Promise<{
      success: boolean
      samples: CursorTelemetryPoint[]
      message?: string
      error?: string
    }>
    openVideoFilePicker: () => Promise<{ success: boolean; path?: string; cancelled?: boolean }>
    setCurrentVideoPath: (path: string) => Promise<{ success: boolean }>
    getCurrentVideoPath: () => Promise<{ success: boolean; path?: string }>
    clearCurrentVideoPath: () => Promise<{ success: boolean }>
    getPlatform: () => Promise<string>
    revealInFolder: (filePath: string) => Promise<{ success: boolean; error?: string; message?: string }>
    hudOverlayHide: () => void
    hudOverlayClose: () => void
    setMicrophoneExpanded: (micEnabled: boolean) => Promise<void>
    onStopRecordingFromTray: (callback: () => void) => () => void
    openExternalUrl: (url: string) => Promise<{ success: boolean; error?: string }>
    saveExportedVideo: (videoData: ArrayBuffer, fileName: string) => Promise<{
      success: boolean
      path?: string
      message?: string
      canceled?: boolean
    }>
    openVideoFilePicker: () => Promise<{ success: boolean; path?: string; canceled?: boolean }>
    setCurrentVideoPath: (path: string) => Promise<{ success: boolean }>
    getCurrentVideoPath: () => Promise<{ success: boolean; path?: string }>
    clearCurrentVideoPath: () => Promise<{ success: boolean }>
    saveProjectFile: (projectData: unknown, suggestedName?: string, existingProjectPath?: string) => Promise<{
      success: boolean
      path?: string
      message?: string
      canceled?: boolean
      error?: string
    }>
    loadProjectFile: () => Promise<{
      success: boolean
      path?: string
      project?: unknown
      message?: string
      canceled?: boolean
      error?: string
    }>
    loadCurrentProjectFile: () => Promise<{
      success: boolean
      path?: string
      project?: unknown
      message?: string
      canceled?: boolean
      error?: string
    }>
    onMenuLoadProject: (callback: () => void) => () => void
    onMenuSaveProject: (callback: () => void) => () => void
    onMenuSaveProjectAs: (callback: () => void) => () => void
  }
}
