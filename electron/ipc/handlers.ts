import { ipcMain, desktopCapturer, BrowserWindow, shell, app, dialog, screen } from 'electron'

import fs from 'node:fs/promises'
import path from 'node:path'
import { RECORDINGS_DIR } from '../main'

let selectedSource: any = null
let globalMouseListenerInterval: NodeJS.Timeout | null = null
let recordingWindow: BrowserWindow | null = null
let lastMousePosition: { x: number; y: number } | null = null

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
    selectedSource = source
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
      const videoPath = path.join(RECORDINGS_DIR, fileName)
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

  ipcMain.handle('store-cursor-data', async (_, videoPath: string, cursorData: unknown) => {
    try {
      const cursorPath = `${videoPath}.cursor.json`
      const payload = JSON.stringify(cursorData)
      await fs.writeFile(cursorPath, payload, 'utf-8')
      return { success: true, path: cursorPath }
    } catch (error) {
      console.error('Failed to store cursor data:', error)
      return { success: false, message: 'Failed to store cursor data', error: String(error) }
    }
  })

  ipcMain.handle('load-cursor-data', async (_, videoPath: string) => {
    try {
      const cursorPath = `${videoPath}.cursor.json`
      const data = await fs.readFile(cursorPath, 'utf-8')
      return { success: true, path: cursorPath, data }
    } catch (error) {
      return { success: false, message: 'Cursor data not found', error: String(error) }
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
    const source = selectedSource || { name: 'Screen' }
    if (onRecordingStateChange) {
      onRecordingStateChange(recording, source.name)
    }
    
    // Start or stop global mouse listener
    if (recording) {
      startGlobalMouseListener(getMainWindow())
    } else {
      stopGlobalMouseListener()
    }
  })

  function startGlobalMouseListener(window: BrowserWindow | null) {
    if (globalMouseListenerInterval) {
      return // Already running
    }
    
    recordingWindow = window
    lastMousePosition = null
    
    // Poll mouse position and button state at 60fps for smooth cursor tracking
    globalMouseListenerInterval = setInterval(() => {
      // Find the recording window (could be HUD overlay or editor window)
      const targetWindow = recordingWindow || getMainWindow()
      
      if (!targetWindow || targetWindow.isDestroyed()) {
        // Try to find any open window
        const allWindows = BrowserWindow.getAllWindows()
        if (allWindows.length === 0) {
          stopGlobalMouseListener()
          return
        }
        recordingWindow = allWindows[0]
      }
      
      try {
        const point = screen.getCursorScreenPoint()
        const currentPosition = { x: point.x, y: point.y }
        
        // Check if position changed
        if (!lastMousePosition || 
            lastMousePosition.x !== currentPosition.x || 
            lastMousePosition.y !== currentPosition.y) {
          
          // Send mouse move event to all windows (in case recording is in different window)
          const windows = BrowserWindow.getAllWindows()
          windows.forEach(win => {
            if (!win.isDestroyed()) {
              win.webContents.send('global-mouse-move', {
                screenX: currentPosition.x,
                screenY: currentPosition.y,
                timestamp: Date.now()
              })
            }
          })
          
          lastMousePosition = currentPosition
        }
        
        // Note: Electron's screen API doesn't provide mouse button state
        // We'll rely on the renderer process to capture button events
        // when they occur within the application window
      } catch (error) {
        console.error('Error in global mouse listener:', error)
      }
    }, 1000 / 60) // 60fps
  }

  function stopGlobalMouseListener() {
    if (globalMouseListenerInterval) {
      clearInterval(globalMouseListenerInterval)
      globalMouseListenerInterval = null
    }
    recordingWindow = null
    lastMousePosition = null
  }


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
      const result = await dialog.showSaveDialog({
        title: 'Save Exported Video',
        defaultPath: path.join(app.getPath('downloads'), fileName),
        filters: [
          { name: 'MP4 Video', extensions: ['mp4'] }
        ],
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

      return {
        success: true,
        path: result.filePaths[0]
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

  let currentVideoPath: string | null = null;

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

  ipcMain.handle('get-source-bounds', async () => {
    try {
      if (!selectedSource) {
        return { success: false, message: 'No source selected' };
      }

      const sourceId = selectedSource.id;
      
      // Handle screen sources
      if (sourceId.startsWith('screen:')) {
        const displays = screen.getAllDisplays();
        const displayId = selectedSource.display_id;
        
        // Find the display matching the display_id
        const display = displays.find(d => String(d.id) === String(displayId)) || screen.getPrimaryDisplay();
        
        // Use bounds which are in physical pixels (already account for DPI scaling)
        return {
          success: true,
          bounds: {
            x: display.bounds.x,
            y: display.bounds.y,
            width: display.bounds.width,
            height: display.bounds.height,
          },
          scaleFactor: display.scaleFactor || 1.0
        };
      }
      
      // Handle window sources
      if (sourceId.startsWith('window:')) {
        // For window sources, we need to get the bounds of the window
        // Since desktopCapturer doesn't provide direct window access,
        // we'll try to get the display that contains the window
        // by getting all windows and matching by name or using a fallback
        
        // Get all displays to find the one that likely contains this window
        const displays = screen.getAllDisplays();
        const displayId = selectedSource.display_id;
        
        // Try to find the display matching the display_id
        const display = displays.find(d => String(d.id) === String(displayId)) || screen.getPrimaryDisplay();
        
        // For window sources, we'll use the display bounds as a fallback
        // In a more sophisticated implementation, you might want to track
        // window positions when sources are selected, but for now this is
        // a reasonable approximation
        return {
          success: true,
          bounds: {
            x: display.bounds.x,
            y: display.bounds.y,
            width: display.bounds.width,
            height: display.bounds.height,
          },
          scaleFactor: display.scaleFactor || 1.0
        };
      }
      
      // Fallback to primary display
      const primaryDisplay = screen.getPrimaryDisplay();
      return {
        success: true,
        bounds: {
          x: primaryDisplay.bounds.x,
          y: primaryDisplay.bounds.y,
          width: primaryDisplay.bounds.width,
          height: primaryDisplay.bounds.height,
        },
        scaleFactor: primaryDisplay.scaleFactor || 1.0
      };
    } catch (error) {
      console.error('Failed to get source bounds:', error);
      return {
        success: false,
        message: 'Failed to get source bounds',
        error: String(error)
      };
    }
  });
}
