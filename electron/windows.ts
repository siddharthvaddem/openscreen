import { BrowserWindow, screen } from 'electron'
import { ipcMain } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const APP_ROOT = path.join(__dirname, '..')
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
const RENDERER_DIST = path.join(APP_ROOT, 'dist')

let hudOverlayWindow: BrowserWindow | null = null;
let keystrokeOverlayWindow: BrowserWindow | null = null;

ipcMain.on('hud-overlay-hide', () => {
  if (hudOverlayWindow && !hudOverlayWindow.isDestroyed()) {
    hudOverlayWindow.minimize();
  }
});

export function createHudOverlayWindow(): BrowserWindow {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { workArea } = primaryDisplay;


  const windowWidth = 500;
  const windowHeight = 100;

  const x = Math.floor(workArea.x + (workArea.width - windowWidth) / 2);
  const y = Math.floor(workArea.y + workArea.height - windowHeight - 5);

  const win = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    minWidth: 500,
    maxWidth: 500,
    minHeight: 100,
    maxHeight: 100,
    x: x,
    y: y,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
    },
  })


  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  hudOverlayWindow = win;

  win.on('closed', () => {
    if (hudOverlayWindow === win) {
      hudOverlayWindow = null;
    }
  });


  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL + '?windowType=hud-overlay')
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'), { 
      query: { windowType: 'hud-overlay' } 
    })
  }

  return win
}

export function createEditorWindow(): BrowserWindow {
  const isMac = process.platform === 'darwin';

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    ...(isMac && {
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 12, y: 12 },
    }),
    transparent: false,
    resizable: true,
    alwaysOnTop: false,
    skipTaskbar: false,
    title: 'OpenScreen',
    backgroundColor: '#000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      backgroundThrottling: false,
    },
  })

  // Maximize the window by default
  win.maximize();

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL + '?windowType=editor')
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'), { 
      query: { windowType: 'editor' } 
    })
  }

  return win
}

export function createSourceSelectorWindow(): BrowserWindow {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  
  const win = new BrowserWindow({
    width: 620,
    height: 420,
    minHeight: 350,
    maxHeight: 500,
    x: Math.round((width - 620) / 2),
    y: Math.round((height - 420) / 2),
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL + '?windowType=source-selector')
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'), { 
      query: { windowType: 'source-selector' } 
    })
  }

  return win
}


/**
 * Creates the keystroke overlay window for displaying keystrokes and mouse actions.
 * 
 * Requirements:
 * - 2.1: Transparent with no visible window frame or background
 * - 2.2: Always-on-top so it appears above other windows
 * - 2.3: Click-through so mouse events pass through to underlying windows
 * - 2.4: Excluded from the taskbar
 * - 2.5: Positioned at a configurable screen location (default: bottom-center)
 * - 2.7: Appear only on the monitor being recorded
 * 
 * @param displayId - Optional display ID to position the overlay on (for multi-monitor support)
 * @returns The created BrowserWindow instance
 */
export function createKeystrokeOverlayWindow(displayId?: string): BrowserWindow {
  // Get the display to show overlay on
  // If displayId provided, find that display; otherwise use primary
  const displays = screen.getAllDisplays();
  const targetDisplay = displayId 
    ? displays.find(d => d.id.toString() === displayId) || screen.getPrimaryDisplay()
    : screen.getPrimaryDisplay();
  
  const { bounds } = targetDisplay;
  
  // Window dimensions
  const windowWidth = 400;
  const windowHeight = 100;
  
  // Position at bottom-center of target display (Requirement 2.5)
  const x = Math.floor(bounds.x + (bounds.width - windowWidth) / 2);
  const y = Math.floor(bounds.y + bounds.height - windowHeight - 50);
  
  const win = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x,
    y,
    frame: false,           // 2.1: No window frame
    transparent: true,      // 2.1: Transparent background
    resizable: false,
    alwaysOnTop: true,      // 2.2: Always on top
    skipTaskbar: true,      // 2.4: Excluded from taskbar
    hasShadow: false,
    focusable: false,       // Don't steal focus
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
    },
  });
  
  // 2.3: Enable click-through so mouse events pass through to underlying windows
  win.setIgnoreMouseEvents(true);
  
  // Load the keystroke overlay component
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL + '?windowType=keystroke-overlay');
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'), { 
      query: { windowType: 'keystroke-overlay' } 
    });
  }
  
  keystrokeOverlayWindow = win;
  
  win.on('closed', () => {
    if (keystrokeOverlayWindow === win) {
      keystrokeOverlayWindow = null;
    }
  });
  
  return win;
}

/**
 * Gets the current keystroke overlay window instance.
 * @returns The keystroke overlay window or null if not created
 */
export function getKeystrokeOverlayWindow(): BrowserWindow | null {
  return keystrokeOverlayWindow;
}

/**
 * Hides the keystroke overlay window if it exists and is not destroyed.
 */
export function hideKeystrokeOverlayWindow(): void {
  if (keystrokeOverlayWindow && !keystrokeOverlayWindow.isDestroyed()) {
    keystrokeOverlayWindow.hide();
  }
}

/**
 * Shows the keystroke overlay window if it exists and is not destroyed.
 */
export function showKeystrokeOverlayWindow(): void {
  if (keystrokeOverlayWindow && !keystrokeOverlayWindow.isDestroyed()) {
    keystrokeOverlayWindow.show();
  }
}

/**
 * Destroys the keystroke overlay window and cleans up the reference.
 */
export function destroyKeystrokeOverlayWindow(): void {
  if (keystrokeOverlayWindow && !keystrokeOverlayWindow.isDestroyed()) {
    keystrokeOverlayWindow.close();
    keystrokeOverlayWindow = null;
  }
}
