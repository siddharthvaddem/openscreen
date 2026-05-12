import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { BrowserWindow, ipcMain, screen } from "electron";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const RENDERER_DIST = path.join(APP_ROOT, "dist");
const HEADLESS = process.env["HEADLESS"] === "true";

// Asset base URL for renderer (wallpapers, etc.). Packaged: extraResources copies
// public/wallpapers -> resources/wallpapers. Unpackaged: <appRoot>/public/.
const ASSET_BASE_DIR = process.defaultApp
	? path.join(__dirname, "..", "public")
	: process.resourcesPath;
const ASSET_BASE_URL_ARG = `--asset-base-url=${pathToFileURL(`${ASSET_BASE_DIR}${path.sep}`).toString()}`;

let hudOverlayWindow: BrowserWindow | null = null;
let cursorOverlayWindow: BrowserWindow | null = null;

// ── HUD cursor-polling ───────────────────────────────────────────────────────
// When getUserMedia captures the desktop with `cursor: "never"`, Chromium's
// capture pipeline may interfere with the { forward: true } mouse-move relay
// that the renderer uses to decide when to enable/disable click-through.
// As a reliable fallback, the main process polls the cursor position every
// 50 ms and drives setIgnoreMouseEvents directly — no renderer events needed.
let hudCursorPollInterval: NodeJS.Timeout | null = null;

export function startHudCursorPolling(): void {
	stopHudCursorPolling();
	hudCursorPollInterval = setInterval(() => {
		if (!hudOverlayWindow || hudOverlayWindow.isDestroyed()) return;
		const cursor = screen.getCursorScreenPoint();
		const { x, y, width, height } = hudOverlayWindow.getBounds();
		const isOverHud =
			cursor.x >= x && cursor.x <= x + width && cursor.y >= y && cursor.y <= y + height;
		hudOverlayWindow.setIgnoreMouseEvents(!isOverHud, { forward: true });
	}, 50);
}

export function stopHudCursorPolling(): void {
	if (hudCursorPollInterval !== null) {
		clearInterval(hudCursorPollInterval);
		hudCursorPollInterval = null;
	}
	// Restore normal pass-through so the renderer's onPointerMove takes over.
	if (hudOverlayWindow && !hudOverlayWindow.isDestroyed()) {
		hudOverlayWindow.setIgnoreMouseEvents(true, { forward: true });
	}
}

ipcMain.on("hud-overlay-hide", () => {
	if (hudOverlayWindow && !hudOverlayWindow.isDestroyed()) {
		hudOverlayWindow.minimize();
	}
});

ipcMain.on("hud-overlay-ignore-mouse-events", (_event, ignore: boolean) => {
	if (hudOverlayWindow && !hudOverlayWindow.isDestroyed()) {
		hudOverlayWindow.setIgnoreMouseEvents(ignore, { forward: true });
	}
});

/**
 * Creates the always-on-top HUD overlay window centred at the bottom of the
 * primary display. The window is frameless, transparent, and follows the user
 * across macOS Spaces so it is never lost when switching virtual desktops.
 */
export function createHudOverlayWindow(): BrowserWindow {
	const primaryDisplay = screen.getPrimaryDisplay();
	const { workArea } = primaryDisplay;

	// Extra padding around the visible pill so CSS box-shadows (60px blur)
	// aren't clipped by the transparent window boundary.
	// The pill sits at CSS `bottom-20` (80px from window bottom) so the
	// downward shadow has ~80px of transparent space to expand into.
	// The window is positioned so the pill's screen position stays unchanged.
	const windowWidth = 800;
	const windowHeight = 320;
	// Pill is bottom-20 (80px) instead of bottom-5 (20px), so shift window
	// down 60px to keep the pill at the same visual screen position.
	const x = Math.floor(workArea.x + (workArea.width - windowWidth) / 2);
	const y = Math.floor(workArea.y + workArea.height - windowHeight + 55);

	const win = new BrowserWindow({
		width: windowWidth,
		height: windowHeight,
		minWidth: 800,
		maxWidth: 800,
		minHeight: 320,
		maxHeight: 320,
		x: x,
		y: y,
		frame: false,
		transparent: true,
		resizable: false,
		alwaysOnTop: true,
		skipTaskbar: true,
		hasShadow: false,
		show: false, // shown via ready-to-show to avoid black flash
		webPreferences: {
			preload: path.join(__dirname, "preload.mjs"),
			additionalArguments: [ASSET_BASE_URL_ARG],
			nodeIntegration: false,
			contextIsolation: true,
			backgroundThrottling: false,
		},
	});
	win.setIgnoreMouseEvents(true, { forward: true });

	// Exclude the HUD from desktop screen captures so the recording controls
	// never appear in the user's footage. On Windows this calls
	// SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE); on macOS it uses the
	// equivalent CGWindowLevel exclusion path.
	win.setContentProtection(true);

	// Follow the user across macOS Spaces (virtual desktops).
	// Without this the HUD stays pinned to the Space it was first opened on.
	if (process.platform === "darwin") {
		win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
	}

	// Show only once content is painted — prevents black rectangle flash
	win.once("ready-to-show", () => {
		if (!HEADLESS) win.show();
	});

	win.webContents.on("did-finish-load", () => {
		win?.webContents.send("main-process-message", new Date().toLocaleString());
	});

	hudOverlayWindow = win;

	win.on("closed", () => {
		if (hudOverlayWindow === win) {
			hudOverlayWindow = null;
		}
	});

	if (VITE_DEV_SERVER_URL) {
		win.loadURL(VITE_DEV_SERVER_URL + "?windowType=hud-overlay");
	} else {
		win.loadFile(path.join(RENDERER_DIST, "index.html"), {
			query: { windowType: "hud-overlay" },
		});
	}

	return win;
}

/**
 * Creates the main editor window. Starts maximised with a hidden title bar on
 * macOS. This window is not always-on-top and appears in the taskbar/dock.
 */
export function createEditorWindow(): BrowserWindow {
	const isMac = process.platform === "darwin";

	const win = new BrowserWindow({
		width: 1200,
		height: 800,
		minWidth: 800,
		minHeight: 600,
		...(isMac && {
			titleBarStyle: "hiddenInset",
			trafficLightPosition: { x: 12, y: 12 },
		}),
		transparent: false,
		resizable: true,
		alwaysOnTop: false,
		skipTaskbar: false,
		title: "OpenScreen",
		backgroundColor: "#09090b",
		show: false, // shown via ready-to-show to avoid white flash on first load
		webPreferences: {
			preload: path.join(__dirname, "preload.mjs"),
			additionalArguments: [ASSET_BASE_URL_ARG],
			nodeIntegration: false,
			contextIsolation: true,
			webSecurity: false,
			backgroundThrottling: false,
		},
	});

	// Maximize the window by default
	win.maximize();

	// Show only once content is painted — prevents white flash on cold Vite start
	win.once("ready-to-show", () => {
		if (!HEADLESS) win.show();
	});

	// Inject dark background before any React paint so the sub-titlebar area
	// never flashes white even on the very first cold Vite load
	win.webContents.on("dom-ready", () => {
		win.webContents
			.insertCSS("html, body, #root { background: #09090b !important; }")
			.catch(() => {});
	});

	win.webContents.on("did-finish-load", () => {
		win?.webContents.send("main-process-message", new Date().toLocaleString());
	});

	if (VITE_DEV_SERVER_URL) {
		win.loadURL(VITE_DEV_SERVER_URL + "?windowType=editor");
	} else {
		win.loadFile(path.join(RENDERER_DIST, "index.html"), {
			query: { windowType: "editor" },
		});
	}

	return win;
}

/**
 * Creates the floating source-selector window used to pick a screen or window
 * to record. Frameless, transparent, and follows the user across macOS Spaces.
 */
export function createSourceSelectorWindow(): BrowserWindow {
	const { width, height } = screen.getPrimaryDisplay().workAreaSize;

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
		backgroundColor: "#00000000",
		webPreferences: {
			preload: path.join(__dirname, "preload.mjs"),
			additionalArguments: [ASSET_BASE_URL_ARG],
			nodeIntegration: false,
			contextIsolation: true,
		},
	});

	// Follow the user across macOS Spaces so the selector appears on the
	// active desktop regardless of where the HUD was originally opened.
	if (process.platform === "darwin") {
		win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
	}

	if (VITE_DEV_SERVER_URL) {
		win.loadURL(VITE_DEV_SERVER_URL + "?windowType=source-selector");
	} else {
		win.loadFile(path.join(RENDERER_DIST, "index.html"), {
			query: { windowType: "source-selector" },
		});
	}

	return win;
}

/**
 * Creates a full-screen transparent click-through window that renders a
 * virtual software cursor. Used when the OS cursor is hidden during
 * editable-overlay recording so the user can still see where their cursor is
 * without it appearing in the raw footage.
 *
 * The window is excluded from screen capture via setContentProtection so the
 * virtual cursor is never baked into recorded video.
 */
export function createCursorOverlayWindow(): BrowserWindow {
	if (cursorOverlayWindow && !cursorOverlayWindow.isDestroyed()) {
		return cursorOverlayWindow;
	}

	const { bounds } = screen.getPrimaryDisplay();

	const win = new BrowserWindow({
		width: bounds.width,
		height: bounds.height,
		x: bounds.x,
		y: bounds.y,
		frame: false,
		resizable: false,
		alwaysOnTop: true,
		skipTaskbar: true,
		focusable: false,
		transparent: true,
		backgroundColor: "#00000000",
		hasShadow: false,
		show: false,
		webPreferences: {
			preload: path.join(__dirname, "preload.mjs"),
			additionalArguments: [ASSET_BASE_URL_ARG],
			nodeIntegration: false,
			contextIsolation: true,
			backgroundThrottling: false,
		},
	});

	// Sit above everything including the HUD so the virtual cursor renders on top.
	win.setAlwaysOnTop(true, "screen-saver");
	// Click-through: mouse events pass to windows below, but the renderer DOM
	// still fires mousemove so we can track cursor position.
	win.setIgnoreMouseEvents(true, { forward: true });
	// Excluded from screen capture — virtual cursor must NOT appear in footage.
	win.setContentProtection(true);

	if (process.platform === "darwin") {
		win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
	}

	win.once("ready-to-show", () => {
		if (!HEADLESS) win.show();
	});

	cursorOverlayWindow = win;
	win.on("closed", () => {
		if (cursorOverlayWindow === win) {
			cursorOverlayWindow = null;
		}
	});

	if (VITE_DEV_SERVER_URL) {
		win.loadURL(VITE_DEV_SERVER_URL + "?windowType=cursor-overlay");
	} else {
		win.loadFile(path.join(RENDERER_DIST, "index.html"), {
			query: { windowType: "cursor-overlay" },
		});
	}

	return win;
}

/**
 * Closes and cleans up the virtual cursor overlay window.
 */
export function destroyCursorOverlayWindow(): void {
	if (cursorOverlayWindow && !cursorOverlayWindow.isDestroyed()) {
		cursorOverlayWindow.close();
	}
	cursorOverlayWindow = null;
}

/**
 * Sends an IPC message to the cursor overlay window if it is alive.
 */
export function sendToCursorOverlay(channel: string, ...args: unknown[]): void {
	if (cursorOverlayWindow && !cursorOverlayWindow.isDestroyed()) {
		cursorOverlayWindow.webContents.send(channel, ...args);
	}
}

/**
 * Creates a centered transparent countdown overlay window that sits above the
 * HUD while recording pre-roll is running.
 */
export function createCountdownOverlayWindow(): BrowserWindow {
	const { workArea } = screen.getPrimaryDisplay();
	const overlayWidth = 420;
	const overlayHeight = 260;

	const win = new BrowserWindow({
		width: overlayWidth,
		height: overlayHeight,
		minWidth: overlayWidth,
		maxWidth: overlayWidth,
		minHeight: overlayHeight,
		maxHeight: overlayHeight,
		x: Math.round(workArea.x + (workArea.width - overlayWidth) / 2),
		y: Math.round(workArea.y + (workArea.height - overlayHeight) / 2),
		frame: false,
		resizable: false,
		alwaysOnTop: true,
		skipTaskbar: true,
		focusable: false,
		transparent: true,
		backgroundColor: "#00000000",
		hasShadow: false,
		show: false,
		webPreferences: {
			preload: path.join(__dirname, "preload.mjs"),
			additionalArguments: [ASSET_BASE_URL_ARG],
			nodeIntegration: false,
			contextIsolation: true,
			backgroundThrottling: false,
		},
	});

	win.setIgnoreMouseEvents(true);

	if (process.platform === "darwin") {
		win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
	}

	if (VITE_DEV_SERVER_URL) {
		win.loadURL(VITE_DEV_SERVER_URL + "?windowType=countdown-overlay");
	} else {
		win.loadFile(path.join(RENDERER_DIST, "index.html"), {
			query: { windowType: "countdown-overlay" },
		});
	}

	return win;
}
