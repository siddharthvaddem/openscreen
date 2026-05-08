import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
	app,
	BrowserWindow,
	dialog,
	ipcMain,
	Menu,
	nativeImage,
	session,
	systemPreferences,
	Tray,
} from "electron";
import { mainT, setMainLocale } from "./i18n";
import { approveReadablePath, registerIpcHandlers } from "./ipc/handlers";
import {
	createCountdownOverlayWindow,
	createEditorWindow,
	createHudOverlayWindow,
	createSourceSelectorWindow,
} from "./windows";

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

function getAssetBaseUrlArg() {
	return `--asset-base-url=${pathToFileURL(`${process.env.VITE_PUBLIC}${path.sep}`).toString()}`;
}

// Window references
let mainWindow: BrowserWindow | null = null;
let sourceSelectorWindow: BrowserWindow | null = null;
let countdownOverlayWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let selectedSourceName = "";
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
	channel: "menu-load-project" | "menu-save-project" | "menu-save-project-as",
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
		if (isForceClosing || !editorHasUnsavedChanges) return;

		event.preventDefault();

		const choice = dialog.showMessageBoxSync(mainWindow!, {
			type: "warning",
			buttons: [
				mainT("dialogs", "unsavedChanges.saveAndClose"),
				mainT("dialogs", "unsavedChanges.discardAndClose"),
				mainT("common", "actions.cancel"),
			],
			defaultId: 0,
			cancelId: 2,
			title: mainT("dialogs", "unsavedChanges.title"),
			message: mainT("dialogs", "unsavedChanges.message"),
			detail: mainT("dialogs", "unsavedChanges.detail"),
		});

		const windowToClose = mainWindow;
		if (!windowToClose || windowToClose.isDestroyed()) return;

		if (choice === 0) {
			// Save & Close — tell renderer to save, then close
			windowToClose.webContents.send("request-save-before-close");
			ipcMain.once("save-before-close-done", (_, shouldClose: boolean) => {
				if (!shouldClose) return;
				forceCloseEditorWindow(windowToClose);
			});
		} else if (choice === 1) {
			// Discard & Close
			forceCloseEditorWindow(windowToClose);
		}
		// choice === 2: Cancel — do nothing, window stays open
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
	app.quit();
});

app.on("activate", () => {
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

// CLI record mode runs the existing Electron capture stack without showing the HUD.
// The Node CLI owns argument parsing and project output; the renderer owns
// getUserMedia/MediaRecorder so capture behavior stays aligned with the app.
const isCliRecord = process.argv.includes("--cli-record");
const isCliRender = process.argv.includes("--cli-render");

type CliRecordConfig = {
	durationMs: number;
	source?: string;
	sourceType?: "screen" | "window" | "any";
	systemAudio?: boolean;
};

type CliRenderConfig = {
	project: {
		media?: {
			screenVideoPath?: string;
			webcamVideoPath?: string;
		};
		videoPath?: string;
		editor: unknown;
	};
	output: string;
	format: "mp4" | "gif";
	quality?: "medium" | "good" | "source";
	gifFrameRate?: 15 | 20 | 25 | 30;
	gifSizePreset?: "medium" | "large" | "original";
	gifLoop?: boolean;
};

function getCliArg(name: string): string | undefined {
	const index = process.argv.indexOf(name);
	return index !== -1 && index + 1 < process.argv.length ? process.argv[index + 1] : undefined;
}

function writeCliMessage(type: string, data: unknown) {
	process.stdout.write(`${JSON.stringify({ __cli: true, type, data })}\n`);
}

async function readCliRecordConfig(): Promise<CliRecordConfig> {
	const configPath = getCliArg("--config");
	if (!configPath) {
		throw new Error("Missing --config argument.");
	}

	const rawConfig = await fs.readFile(configPath, "utf8");
	const parsed = JSON.parse(rawConfig) as Partial<CliRecordConfig>;
	const durationMs = Number(parsed.durationMs);
	if (!Number.isFinite(durationMs) || durationMs <= 0) {
		throw new Error("CLI record config requires a positive durationMs.");
	}

	const sourceType =
		parsed.sourceType === "screen" || parsed.sourceType === "window" || parsed.sourceType === "any"
			? parsed.sourceType
			: "any";

	return {
		durationMs,
		source: typeof parsed.source === "string" ? parsed.source : undefined,
		sourceType,
		systemAudio: parsed.systemAudio === true,
	};
}

async function runCliRecord() {
	const config = await readCliRecordConfig();
	await ensureRecordingsDir();

	const createHiddenWindow = () =>
		new BrowserWindow({
			width: 1,
			height: 1,
			show: false,
			webPreferences: {
				preload: path.join(__dirname, "preload.mjs"),
				nodeIntegration: false,
				contextIsolation: true,
			},
		});

	registerIpcHandlers(
		() => {
			/* no editor window in CLI mode */
		},
		createHiddenWindow,
		createHiddenWindow,
		() => null,
		() => null,
		() => null,
	);

	ipcMain.handle("get-cli-record-config", () => config);

	let exiting = false;
	let safetyTimer: ReturnType<typeof setTimeout> | undefined;
	const finish = (exitCode: number) => {
		if (exiting) return;
		exiting = true;
		if (safetyTimer) clearTimeout(safetyTimer);
		setTimeout(() => app.exit(exitCode), 250);
	};

	ipcMain.on("cli-record-message", (_, message: { type: string; data: unknown }) => {
		writeCliMessage(message.type, message.data);
		if (message.type === "done") finish(0);
		if (message.type === "error") finish(1);
	});

	const win = new BrowserWindow({
		width: 1280,
		height: 720,
		show: false,
		webPreferences: {
			preload: path.join(__dirname, "preload.mjs"),
			nodeIntegration: false,
			contextIsolation: true,
			webSecurity: false,
			backgroundThrottling: false,
		},
	});

	if (VITE_DEV_SERVER_URL) {
		await win.loadURL(`${VITE_DEV_SERVER_URL}?windowType=cli-record`);
	} else {
		await win.loadFile(path.join(RENDERER_DIST, "index.html"), {
			query: { windowType: "cli-record" },
		});
	}

	safetyTimer = setTimeout(
		() => {
			writeCliMessage("error", { message: "Recording timed out." });
			finish(1);
		},
		Math.max(config.durationMs + 120_000, 180_000),
	);
}

async function readCliRenderConfig(): Promise<CliRenderConfig> {
	const configPath = getCliArg("--config");
	if (!configPath) {
		throw new Error("Missing --config argument.");
	}

	approveReadablePath(configPath);
	const rawConfig = await fs.readFile(configPath, "utf8");
	const parsed = JSON.parse(rawConfig) as Partial<CliRenderConfig>;
	if (!parsed.project || typeof parsed.project !== "object") {
		throw new Error("CLI render config requires a project.");
	}
	if (typeof parsed.output !== "string" || !parsed.output.trim()) {
		throw new Error("CLI render config requires an output path.");
	}

	const output = path.resolve(parsed.output);
	await fs.mkdir(path.dirname(output), { recursive: true });

	const screenVideoPath =
		typeof parsed.project.media?.screenVideoPath === "string"
			? parsed.project.media.screenVideoPath
			: typeof parsed.project.videoPath === "string"
				? parsed.project.videoPath
				: undefined;
	if (screenVideoPath) {
		approveReadablePath(screenVideoPath);
	}
	if (typeof parsed.project.media?.webcamVideoPath === "string") {
		approveReadablePath(parsed.project.media.webcamVideoPath);
	}

	return {
		project: parsed.project as CliRenderConfig["project"],
		output,
		format: parsed.format === "gif" ? "gif" : "mp4",
		quality: parsed.quality === "medium" || parsed.quality === "source" ? parsed.quality : "good",
		gifFrameRate: parsed.gifFrameRate,
		gifSizePreset:
			parsed.gifSizePreset === "large" || parsed.gifSizePreset === "original"
				? parsed.gifSizePreset
				: "medium",
		gifLoop: parsed.gifLoop,
	};
}

async function runCliRender() {
	const config = await readCliRenderConfig();
	await ensureRecordingsDir();

	registerIpcHandlers(
		() => {
			/* no editor window in CLI mode */
		},
		() => new BrowserWindow({ show: false }),
		() => new BrowserWindow({ show: false }),
		() => null,
		() => null,
		() => null,
	);

	ipcMain.handle("get-cli-render-config", () => config);
	ipcMain.removeHandler("save-exported-video");
	ipcMain.handle("save-exported-video", async (_, videoData: ArrayBuffer) => {
		try {
			await fs.writeFile(config.output, Buffer.from(videoData));
			return { success: true, path: config.output, message: "Export saved" };
		} catch (error) {
			return { success: false, message: String(error) };
		}
	});

	let exiting = false;
	let safetyTimer: ReturnType<typeof setTimeout> | undefined;
	const finish = (exitCode: number) => {
		if (exiting) return;
		exiting = true;
		if (safetyTimer) clearTimeout(safetyTimer);
		setTimeout(() => app.exit(exitCode), 250);
	};

	ipcMain.on("cli-render-message", (_, message: { type: string; data: unknown }) => {
		writeCliMessage(message.type, message.data);
		if (message.type === "done") finish(0);
		if (message.type === "error") finish(1);
	});

	const win = new BrowserWindow({
		width: 1920,
		height: 1080,
		show: false,
		webPreferences: {
			preload: path.join(__dirname, "preload.mjs"),
			additionalArguments: [getAssetBaseUrlArg()],
			nodeIntegration: false,
			contextIsolation: true,
			webSecurity: false,
			backgroundThrottling: false,
		},
	});

	if (VITE_DEV_SERVER_URL) {
		await win.loadURL(`${VITE_DEV_SERVER_URL}?windowType=cli-render`);
	} else {
		await win.loadFile(path.join(RENDERER_DIST, "index.html"), {
			query: { windowType: "cli-render" },
		});
	}

	safetyTimer = setTimeout(
		() => {
			writeCliMessage("error", { message: "Render timed out." });
			finish(1);
		},
		10 * 60 * 1000,
	);
}

// Register all IPC handlers when app is ready
app.whenReady().then(async () => {
	if (isCliRecord) {
		try {
			await runCliRecord();
		} catch (error) {
			writeCliMessage("error", {
				message: error instanceof Error ? error.message : String(error),
			});
			app.exit(1);
		}
		return;
	}

	if (isCliRender) {
		try {
			await runCliRender();
		} catch (error) {
			writeCliMessage("error", {
				message: error instanceof Error ? error.message : String(error),
			});
			app.exit(1);
		}
		return;
	}

	// Force the app into "regular" activation policy so the Dock icon appears.
	// The HUD overlay (transparent + frameless + skipTaskbar) is the first
	// window we open, and AppKit otherwise classifies us as an accessory app.
	if (process.platform === "darwin") {
		app.dock?.show();
	}

	// Allow microphone/media permission checks
	session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
		const allowed = ["media", "audioCapture", "microphone", "videoCapture", "camera"];
		return allowed.includes(permission);
	});

	session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
		const allowed = ["media", "audioCapture", "microphone", "videoCapture", "camera"];
		callback(allowed.includes(permission));
	});

	// Request microphone permission from macOS
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
	createWindow();
});
