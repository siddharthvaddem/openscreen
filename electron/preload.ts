import { contextBridge, ipcRenderer } from 'electron'

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
  selectSource: (source: any) => {
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
  getCursorTelemetry: (videoPath?: string) => {
    return ipcRenderer.invoke('get-cursor-telemetry', videoPath)
  },
  onStopRecordingFromTray: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('stop-recording-from-tray', listener)
    return () => ipcRenderer.removeListener('stop-recording-from-tray', listener)
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
  saveProjectFile: (projectData: unknown, suggestedName?: string, existingProjectPath?: string) => {
    return ipcRenderer.invoke('save-project-file', projectData, suggestedName, existingProjectPath)
  },
  loadProjectFile: () => {
    return ipcRenderer.invoke('load-project-file')
  },
  loadCurrentProjectFile: () => {
    return ipcRenderer.invoke('load-current-project-file')
  },
  onMenuLoadProject: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('menu-load-project', listener)
    return () => ipcRenderer.removeListener('menu-load-project', listener)
  },
  onMenuSaveProject: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('menu-save-project', listener)
    return () => ipcRenderer.removeListener('menu-save-project', listener)
  },
  onMenuSaveProjectAs: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('menu-save-project-as', listener)
    return () => ipcRenderer.removeListener('menu-save-project-as', listener)
  },
  getPlatform: () => {
    return ipcRenderer.invoke('get-platform')
  },
  revealInFolder: (filePath: string) => {
    return ipcRenderer.invoke('reveal-in-folder', filePath)
  },
  setMicrophoneExpanded: (micEnabled: boolean) => {
    return ipcRenderer.invoke('hud:setMicrophoneExpanded', micEnabled)
  },
})
})
  getShortcuts: () => {
    return ipcRenderer.invoke('get-shortcuts')
  },
  saveShortcuts: (shortcuts: unknown) => {
    return ipcRenderer.invoke('save-shortcuts', shortcuts)
  },
})
