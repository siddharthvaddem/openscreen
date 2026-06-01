import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	app,
	BrowserWindow,
	ipcMain,
	Menu,
	nativeImage,
	session,
	systemPreferences,
	Tray,
} from "electron";
import { ShortcutBinding } from "../src/lib/shortcuts";
import { parseArgs } from "./cli";

// Parse CLI flags and set HEADLESS env BEFORE any windows.ts code runs.
// windows.ts captures `process.env["HEADLESS"]` into a top-level const at
// module-evaluation time. ES module bundlers (Rollup/Vite) inline dependency
// modules above the importing module's top-level code, so we cannot rely on
// the env var being set via a top-level statement here. Solution: use a
// dynamic import for windows.ts (deferred to app.whenReady), and run the
// argv parse at the earliest possible top-level statement so any later
// dynamic import sees HEADLESS=true.
const cliOpts = parseArgs(process.argv.slice(2));
if (cliOpts.headless) {
	process.env.HEADLESS = "true";
}

import {
	loadAndRegisterGlobalShortcut,
	registerOpenAppShortcut,
	unregisterAllGlobalShortcuts,
} from "./globalShortcut";
import { mainT, setMainLocale } from "./i18n";
import {
	getSelectedDesktopSource,
	registerIpcHandlers,
	setSelectedDesktopSource,
} from "./ipc/handlers";

// Note: do NOT statically import from ./windows here. windows.ts reads
// process.env.HEADLESS at top level; static imports are hoisted/inlined by
// the bundler before this file's top-level code runs. Use dynamic import()
// inside app.whenReady / on-demand below.
type WindowsModule = typeof import("./windows");
let windowsModule: WindowsModule | null = null;
function getWindowsModule(): WindowsModule {
	if (!windowsModule) {
		throw new Error(
			"windows module not yet loaded — call await loadWindowsModule() in app.whenReady first",
		);
	}
	return windowsModule;
}
async function loadWindowsModule(): Promise<WindowsModule> {
	if (!windowsModule) {
		windowsModule = await import("./windows");
	}
	return windowsModule;
}
const createCountdownOverlayWindow = (
	...args: Parameters<WindowsModule["createCountdownOverlayWindow"]>
) => getWindowsModule().createCountdownOverlayWindow(...args);
const createEditorWindow = (...args: Parameters<WindowsModule["createEditorWindow"]>) =>
	getWindowsModule().createEditorWindow(...args);
const createHudOverlayWindow = (...args: Parameters<WindowsModule["createHudOverlayWindow"]>) =>
	getWindowsModule().createHudOverlayWindow(...args);
const createSourceSelectorWindow = (
	...args: Parameters<WindowsModule["createSourceSelectorWindow"]>
) => getWindowsModule().createSourceSelectorWindow(...args);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use Screen & System Audio Recording permissions instead of CoreAudio Tap API on macOS.
// CoreAudio Tap requires NSAudioCaptureUsageDescription in the parent app's Info.plist,
// which doesn't work when running from a terminal/IDE during development, makes my life easier
if (process.platform === "darwin") {
	app.commandLine.appendSwitch("disable-features", "MacCatapLoopbackAudioForScreenShare");
}

// Enable Wayland support for proper screen capture and window management
// on Wayland compositors (Hyprland, GNOME, KDE, etc.)
if (process.platform === "linux") {
	const isWayland =
		process.env.XDG_SESSION_TYPE === "wayland" || process.env.WAYLAND_DISPLAY !== undefined;
	if (isWayland) {
		app.commandLine.appendSwitch("ozone-platform", "wayland");
		// Enable WebRTCPipeWireCapturer for screen capture on Wayland
		app.commandLine.appendSwitch("enable-features", "WaylandWindowDrag,WebRTCPipeWireCapturer");
	}
}

export const RECORDINGS_DIR = path.join(app.getPath("userData"), "recordings");

async function ensureRecordingsDir() {
	try {
		await fs.mkdir(RECORDINGS_DIR, { recursive: true });
		console.log("RECORDINGS_DIR:", RECORDINGS_DIR);
		console.log("User Data Path:", app.getPath("userData"));
	} catch (error) {
		console.error("Failed to create recordings directory:", error);
	}
}

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, "..");

// Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
	? path.join(process.env.APP_ROOT, "public")
	: RENDERER_DIST;

// Window references
let mainWindow: BrowserWindow | null = null;
let sourceSelectorWindow: BrowserWindow | null = null;
let countdownOverlayWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let selectedSourceName = "";
// RecorderBridge reference for the headless CLI path. Populated inside the
// app.whenReady → cliOpts.headless branch.
let bridgeRef: import("./recorder-bridge").RecorderBridge | null = null;
const isMac = process.platform === "darwin";
const trayIconSize = isMac ? 16 : 24;

// Tray Icons
const defaultTrayIcon = getTrayIcon("openscreen.png", trayIconSize);
const recordingTrayIcon = getTrayIcon("rec-button.png", trayIconSize);

function createWindow() {
	mainWindow = createHudOverlayWindow();
}

function showMainWindow() {
	if (mainWindow && !mainWindow.isDestroyed()) {
		if (mainWindow.isMinimized()) {
			mainWindow.restore();
		}
		mainWindow.show();
		mainWindow.focus();
		return;
	}

	createWindow();
}

function isEditorWindow(window: BrowserWindow) {
	return window.webContents.getURL().includes("windowType=editor");
}

function sendEditorMenuAction(
	channel: "menu-load-project" | "menu-save-project" | "menu-save-project-as" | "menu-new-project",
) {
	let targetWindow = BrowserWindow.getFocusedWindow() ?? mainWindow;

	if (!targetWindow || targetWindow.isDestroyed() || !isEditorWindow(targetWindow)) {
		createEditorWindowWrapper();
		targetWindow = mainWindow;
		if (!targetWindow || targetWindow.isDestroyed()) return;

		targetWindow.webContents.once("did-finish-load", () => {
			if (!targetWindow || targetWindow.isDestroyed()) return;
			targetWindow.webContents.send(channel);
		});
		return;
	}

	targetWindow.webContents.send(channel);
}

function setupApplicationMenu() {
	const isMac = process.platform === "darwin";
	const template: Electron.MenuItemConstructorOptions[] = [];

	if (isMac) {
		template.push({
			label: app.name,
			submenu: [
				{
					role: "about",
					label: mainT("common", "actions.about") || "About OpenScreen",
				},
				{ type: "separator" },
				{
					role: "services",
					label: mainT("common", "actions.services") || "Services",
				},
				{ type: "separator" },
				{
					role: "hide",
					label: mainT("common", "actions.hide") || "Hide OpenScreen",
				},
				{
					role: "hideOthers",
					label: mainT("common", "actions.hideOthers") || "Hide Others",
				},
				{
					role: "unhide",
					label: mainT("common", "actions.unhide") || "Show All",
				},
				{ type: "separator" },
				{ role: "quit", label: mainT("common", "actions.quit") || "Quit" },
			],
		});
	}

	template.push(
		{
			label: mainT("common", "actions.file") || "File",
			submenu: [
				{
					label: mainT("dialogs", "unsavedChanges.newProject") || "New Project",
					accelerator: "CmdOrCtrl+N",
					click: () => sendEditorMenuAction("menu-new-project"),
				},
				{ type: "separator" as const },
				{
					label: mainT("dialogs", "unsavedChanges.loadProject") || "Load Project…",
					accelerator: "CmdOrCtrl+O",
					click: () => sendEditorMenuAction("menu-load-project"),
				},
				{
					label: mainT("dialogs", "unsavedChanges.saveProject") || "Save Project…",
					accelerator: "CmdOrCtrl+S",
					click: () => sendEditorMenuAction("menu-save-project"),
				},
				{
					label: mainT("dialogs", "unsavedChanges.saveProjectAs") || "Save Project As…",
					accelerator: "CmdOrCtrl+Shift+S",
					click: () => sendEditorMenuAction("menu-save-project-as"),
				},
				...(isMac
					? []
					: [
							{ type: "separator" as const },
							{
								role: "quit" as const,
								label: mainT("common", "actions.quit") || "Quit",
							},
						]),
			],
		},
		{
			label: mainT("common", "actions.edit") || "Edit",
			submenu: [
				{ role: "undo", label: mainT("common", "actions.undo") || "Undo" },
				{ role: "redo", label: mainT("common", "actions.redo") || "Redo" },
				{ type: "separator" },
				{ role: "cut", label: mainT("common", "actions.cut") || "Cut" },
				{ role: "copy", label: mainT("common", "actions.copy") || "Copy" },
				{ role: "paste", label: mainT("common", "actions.paste") || "Paste" },
				{
					role: "selectAll",
					label: mainT("common", "actions.selectAll") || "Select All",
				},
			],
		},
		{
			label: mainT("common", "actions.view") || "View",
			submenu: [
				{
					role: "reload",
					label: mainT("common", "actions.reload") || "Reload",
				},
				{
					role: "forceReload",
					label: mainT("common", "actions.forceReload") || "Force Reload",
				},
				{
					role: "toggleDevTools",
					label: mainT("common", "actions.toggleDevTools") || "Toggle Developer Tools",
				},
				{ type: "separator" },
				{
					role: "resetZoom",
					label: mainT("common", "actions.actualSize") || "Actual Size",
				},
				{
					role: "zoomIn",
					label: mainT("common", "actions.zoomIn") || "Zoom In",
				},
				{
					role: "zoomOut",
					label: mainT("common", "actions.zoomOut") || "Zoom Out",
				},
				{ type: "separator" },
				{
					role: "togglefullscreen",
					label: mainT("common", "actions.toggleFullScreen") || "Toggle Full Screen",
				},
			],
		},
		{
			label: mainT("common", "actions.window") || "Window",
			submenu: isMac
				? [
						{
							role: "minimize",
							label: mainT("common", "actions.minimize") || "Minimize",
						},
						{ role: "zoom" },
						{ type: "separator" },
						{ role: "front" },
					]
				: [
						{
							role: "minimize",
							label: mainT("common", "actions.minimize") || "Minimize",
						},
						{
							role: "close",
							label: mainT("common", "actions.close") || "Close",
						},
					],
		},
	);

	const menu = Menu.buildFromTemplate(template);
	Menu.setApplicationMenu(menu);
}

function createTray() {
	tray = new Tray(defaultTrayIcon);
	tray.on("click", () => {
		showMainWindow();
	});
	tray.on("double-click", () => {
		showMainWindow();
	});
}

function getTrayIcon(filename: string, size: number) {
	return nativeImage
		.createFromPath(path.join(process.env.VITE_PUBLIC || RENDERER_DIST, filename))
		.resize({
			width: size,
			height: size,
			quality: "best",
		});
}

function updateTrayMenu(recording: boolean = false) {
	if (!tray) return;
	const trayIcon = recording ? recordingTrayIcon : defaultTrayIcon;
	const trayToolTip = recording
		? mainT("common", "actions.recordingStatus", {
				source: selectedSourceName,
			}) || `Recording: ${selectedSourceName}`
		: "OpenScreen";
	const menuTemplate = recording
		? [
				{
					label: mainT("common", "actions.stopRecording") || "Stop Recording",
					click: () => {
						if (mainWindow && !mainWindow.isDestroyed()) {
							mainWindow.webContents.send("stop-recording-from-tray");
						}
					},
				},
			]
		: [
				{
					label: mainT("common", "actions.open") || "Open",
					click: () => {
						showMainWindow();
					},
				},
				{
					label: mainT("common", "actions.quit") || "Quit",
					click: () => {
						app.quit();
					},
				},
			];
	tray.setImage(trayIcon);
	tray.setToolTip(trayToolTip);
	tray.setContextMenu(Menu.buildFromTemplate(menuTemplate));
}

let editorHasUnsavedChanges = false;
let isForceClosing = false;
let isCloseConfirmInFlight = false;

ipcMain.on("set-has-unsaved-changes", (_, hasChanges: boolean) => {
	editorHasUnsavedChanges = hasChanges;
});

function forceCloseEditorWindow(windowToClose: BrowserWindow | null) {
	if (!windowToClose || windowToClose.isDestroyed()) return;

	isForceClosing = true;
	setImmediate(() => {
		try {
			if (!windowToClose.isDestroyed()) {
				windowToClose.close();
			}
		} finally {
			isForceClosing = false;
		}
	});
}

function createEditorWindowWrapper() {
	if (mainWindow) {
		isForceClosing = true;
		mainWindow.close();
		isForceClosing = false;
		mainWindow = null;
	}
	mainWindow = createEditorWindow();
	editorHasUnsavedChanges = false;

	mainWindow.on("close", (event) => {
		if (isForceClosing || !editorHasUnsavedChanges || isCloseConfirmInFlight) return;

		event.preventDefault();
		isCloseConfirmInFlight = true;

		const windowToClose = mainWindow;
		if (!windowToClose || windowToClose.isDestroyed()) return;

		// Ask renderer to show the custom in-app dialog
		windowToClose.webContents.send("request-close-confirm");

		ipcMain.once("close-confirm-response", (event, choice: "save" | "discard" | "cancel") => {
			if (event.sender.id !== windowToClose?.webContents.id) return;
			isCloseConfirmInFlight = false;
			if (!windowToClose || windowToClose.isDestroyed()) return;

			if (choice === "save") {
				// Tell renderer to save the project, then close when done
				windowToClose.webContents.send("request-save-before-close");
				ipcMain.once("save-before-close-done", (event, shouldClose: boolean) => {
					if (event.sender.id !== windowToClose?.webContents.id) return;
					if (!shouldClose) return;
					forceCloseEditorWindow(windowToClose);
				});
			} else if (choice === "discard") {
				forceCloseEditorWindow(windowToClose);
			}
			// "cancel": flag reset, window stays open
		});
	});
}

function createSourceSelectorWindowWrapper() {
	sourceSelectorWindow = createSourceSelectorWindow();
	sourceSelectorWindow.on("closed", () => {
		sourceSelectorWindow = null;
	});
	return sourceSelectorWindow;
}

function createCountdownOverlayWindowWrapper() {
	if (countdownOverlayWindow && !countdownOverlayWindow.isDestroyed()) {
		return countdownOverlayWindow;
	}

	countdownOverlayWindow = createCountdownOverlayWindow();
	countdownOverlayWindow.on("closed", () => {
		countdownOverlayWindow = null;
	});
	return countdownOverlayWindow;
}

// Closing every window quits the app entirely (tray icon goes too).
// The in-app "Return to Recorder" button covers the editor → HUD round-trip,
// so closing the last window is an explicit "I'm done" signal.
app.on("window-all-closed", () => {
	// In headless mode the renderer (HUD) is intentionally hidden — we must
	// keep the app alive so the IPC socket server (T3.3) can drive recordings.
	if (cliOpts.headless) return;
	app.quit();
});

app.on("activate", () => {
	// In headless mode, never re-show a window on dock-click.
	if (cliOpts.headless) return;
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	const hasVisibleWindow = BrowserWindow.getAllWindows().some((window) => {
		if (window.isDestroyed() || !window.isVisible()) {
			return false;
		}

		const url = window.webContents.getURL();
		const isCountdownOverlayWindow = url.includes("windowType=countdown-overlay");
		return !isCountdownOverlayWindow;
	});
	if (!hasVisibleWindow) {
		showMainWindow();
	}
});

app.on("will-quit", () => {
	unregisterAllGlobalShortcuts();
});

// Register all IPC handlers when app is ready
app.whenReady().then(async () => {
	// Load the windows module via dynamic import AFTER the HEADLESS env var has
	// been set (top of this file). windows.ts captures HEADLESS into a top-level
	// const at evaluation time, so the import must be deferred to here.
	await loadWindowsModule();

	if (cliOpts.headless) {
		// Headless boot: skip dock, tray, menus. Eagerly create the HUD so the
		// renderer (LaunchWindow / useScreenRecorder) is alive and ready to
		// receive future cli-start-recording IPC. The HUD factory already
		// respects HEADLESS=true and will NOT call win.show().
		await ensureRecordingsDir();

		// The renderer's getDisplayMedia path requires the same permission +
		// display-media handlers the GUI mode registers. Register them here so a
		// CLI-initiated recording can actually capture a stream.
		session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
			const allowed = [
				"media",
				"audioCapture",
				"microphone",
				"videoCapture",
				"camera",
				"screen",
				"display-capture",
			];
			return allowed.includes(permission);
		});
		session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
			const allowed = [
				"media",
				"audioCapture",
				"microphone",
				"videoCapture",
				"camera",
				"screen",
				"display-capture",
			];
			callback(allowed.includes(permission));
		});
		session.defaultSession.setDisplayMediaRequestHandler(
			(request, callback) => {
				const source = getSelectedDesktopSource();
				if (!request.videoRequested || !source) {
					callback({});
					return;
				}
				callback({
					video: source,
					...(request.audioRequested && process.platform === "win32" ? { audio: "loopback" } : {}),
				});
			},
			{ useSystemPicker: false },
		);

		// Register the full IPC handler suite. The headless HUD needs every
		// channel the GUI exposes (get-sources, select-source, store-recorded-session, …).
		// Pass no-op factories for editor / picker windows that aren't relevant
		// headless.
		registerIpcHandlers(
			/* createEditorWindow */ () => {
				/* no editor in headless mode */
			},
			/* createSourceSelectorWindow */ () => mainWindow as BrowserWindow,
			/* createCountdownOverlayWindow */ () => mainWindow as BrowserWindow,
			/* getMainWindow */ () => mainWindow,
			/* getSourceSelectorWindow */ () => null,
			/* getCountdownOverlayWindow */ () => null,
			/* onRecordingStateChange */ (recording, sourceName) => {
				selectedSourceName = sourceName;
				bridgeRef?.notifyRecordingState(recording);
			},
			/* switchToHud */ () => {
				/* already hidden HUD; nothing to do */
			},
		);

		mainWindow = createHudOverlayWindow();

		const { IpcSocketServer } = await import("./ipc-socket-server.js");
		const { RecorderBridge } = await import("./recorder-bridge.js");
		const { desktopCapturer } = await import("electron");

		const bridge = new RecorderBridge({
			webContents: mainWindow.webContents,
			ipcOn: (channel, listener) => {
				ipcMain.on(channel, (event, ...args) => listener(event, ...args));
			},
			ipcOnce: (channel, listener) => {
				const wrapped = (event: Electron.IpcMainEvent, ...args: unknown[]) =>
					listener(event, ...args);
				ipcMain.once(channel, wrapped);
				return () => ipcMain.removeListener(channel, wrapped);
			},
			recordingsDir: RECORDINGS_DIR,
		});
		bridgeRef = bridge;

		// Auto-pick the first screen source before any cli-start-recording fires.
		// Sets module-level state in handlers.ts directly so that
		// setDisplayMediaRequestHandler resolves the correct source without
		// going through executeJavaScript (which would inject an OS-controlled
		// string into an eval, risking injection and fragility).
		async function autoSelectFirstScreen(): Promise<void> {
			const sources = await desktopCapturer.getSources({
				types: ["screen"],
				thumbnailSize: { width: 0, height: 0 },
			});
			const first = sources[0];
			if (!first) throw new Error("no screen sources available");
			setSelectedDesktopSource(first);
		}

		const ipc = new IpcSocketServer(cliOpts.ipcPath);
		ipc.register("recorder.start", async (params) => {
			await autoSelectFirstScreen();
			return bridge.start((params as Parameters<typeof bridge.start>[0]) ?? {});
		});
		ipc.register("recorder.stop", (params) =>
			bridge.stop((params as Parameters<typeof bridge.stop>[0]) ?? {}),
		);
		ipc.register("recorder.status", () => Promise.resolve(bridge.status()));
		ipc.register("recorder.cleanup", (params) =>
			bridge.cleanup(params as Parameters<typeof bridge.cleanup>[0]),
		);
		await ipc.listen();
		console.log(`openscreen --headless: renderer loaded, ipc listening on ${cliOpts.ipcPath}`);

		const shutdown = async () => {
			try {
				await ipc.close();
			} finally {
				app.quit();
			}
		};
		process.on("SIGINT", () => void shutdown());
		process.on("SIGTERM", () => void shutdown());

		return;
	}

	// Force the app into "regular" activation policy so the Dock icon appears.
	// The HUD overlay (transparent + frameless + skipTaskbar) is the first
	// window we open, and AppKit otherwise classifies us as an accessory app.
	if (process.platform === "darwin") {
		app.dock?.show();
	}

	// Allow microphone/media/screen permission checks
	session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
		const allowed = [
			"media",
			"audioCapture",
			"microphone",
			"videoCapture",
			"camera",
			"screen",
			"display-capture",
		];
		return allowed.includes(permission);
	});

	session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
		const allowed = [
			"media",
			"audioCapture",
			"microphone",
			"videoCapture",
			"camera",
			"screen",
			"display-capture",
		];
		callback(allowed.includes(permission));
	});

	session.defaultSession.setDisplayMediaRequestHandler(
		(request, callback) => {
			const source = getSelectedDesktopSource();
			if (!request.videoRequested || !source) {
				callback({});
				return;
			}

			callback({
				video: source,
				...(request.audioRequested && process.platform === "win32" ? { audio: "loopback" } : {}),
			});
		},
		{ useSystemPicker: false },
	);

	// Request microphone permission from macOS. Screen Recording is requested
	// lazily from the source-picker action so the system prompt is not hidden
	// behind OpenScreen's source selector window.
	if (process.platform === "darwin") {
		const micStatus = systemPreferences.getMediaAccessStatus("microphone");
		if (micStatus !== "granted") {
			await systemPreferences.askForMediaAccess("microphone");
		}
	}

	// Listen for HUD overlay quit event (macOS only)
	ipcMain.on("hud-overlay-close", () => {
		app.quit();
	});
	ipcMain.handle("set-locale", (_, locale: string) => {
		setMainLocale(locale);
		setupApplicationMenu();
		updateTrayMenu();
	});

	ipcMain.handle("update-global-shortcut", (_, binding: ShortcutBinding) => {
		const success = registerOpenAppShortcut(binding, showMainWindow);
		return { success };
	});

	createTray();
	updateTrayMenu();
	setupApplicationMenu();
	// Ensure recordings directory exists
	await ensureRecordingsDir();

	function switchToHudWrapper() {
		if (mainWindow) {
			isForceClosing = true;
			mainWindow.close();
			isForceClosing = false;
			mainWindow = null;
		}
		showMainWindow();
	}

	registerIpcHandlers(
		createEditorWindowWrapper,
		createSourceSelectorWindowWrapper,
		createCountdownOverlayWindowWrapper,
		() => mainWindow,
		() => sourceSelectorWindow,
		() => countdownOverlayWindow,
		(recording: boolean, sourceName: string) => {
			selectedSourceName = sourceName;
			if (!tray) createTray();
			updateTrayMenu(recording);
			if (!recording) {
				showMainWindow();
			}
		},
		switchToHudWrapper,
	);

	await loadAndRegisterGlobalShortcut(showMainWindow);

	createWindow();
});
