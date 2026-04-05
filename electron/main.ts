import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
import { createEditorWindow, createHudOverlayWindow, createSourceSelectorWindow } from "./windows";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use Screen & System Audio Recording permissions instead of CoreAudio Tap API on macOS.
// CoreAudio Tap requires NSAudioCaptureUsageDescription in the parent app's Info.plist,
// which doesn't work when running from a terminal/IDE during development, makes my life easier
if (process.platform === "darwin") {
	app.commandLine.appendSwitch("disable-features", "MacCatapLoopbackAudioForScreenShare");
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
				{ role: "about" },
				{ type: "separator" },
				{ role: "services" },
				{ type: "separator" },
				{ role: "hide" },
				{ role: "hideOthers" },
				{ role: "unhide" },
				{ type: "separator" },
				{ role: "quit" },
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
				...(isMac ? [] : [{ type: "separator" as const }, { role: "quit" as const }]),
			],
		},
		{
			label: mainT("common", "actions.edit") || "Edit",
			submenu: [
				{ role: "undo" },
				{ role: "redo" },
				{ type: "separator" },
				{ role: "cut" },
				{ role: "copy" },
				{ role: "paste" },
				{ role: "selectAll" },
			],
		},
		{
			label: mainT("common", "actions.view") || "View",
			submenu: [
				{ role: "reload" },
				{ role: "forceReload" },
				{ role: "toggleDevTools" },
				{ type: "separator" },
				{ role: "resetZoom" },
				{ role: "zoomIn" },
				{ role: "zoomOut" },
				{ type: "separator" },
				{ role: "togglefullscreen" },
			],
		},
		{
			label: mainT("common", "actions.window") || "Window",
			submenu: isMac
				? [{ role: "minimize" }, { role: "zoom" }, { type: "separator" }, { role: "front" }]
				: [{ role: "minimize" }, { role: "close" }],
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
	const trayToolTip = recording ? `Recording: ${selectedSourceName}` : "OpenScreen";
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

// On macOS, applications and their menu bar stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
	// Keep app running (macOS behavior)
});

app.on("activate", () => {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});

// ── CLI Export Mode ─────────────────────────────────────────────────────
// When launched with --cli-export, skip normal UI and run headless export.
const cliExportIndex = process.argv.indexOf("--cli-export");
const isCliExport = cliExportIndex !== -1;

function getCliArg(name: string): string | undefined {
	const index = process.argv.indexOf(name);
	return index !== -1 && index + 1 < process.argv.length ? process.argv[index + 1] : undefined;
}

async function runCliExport() {
	const configPath = getCliArg("--config");
	if (!configPath) {
		process.stdout.write(
			JSON.stringify({
				__cli: true,
				type: "error",
				data: { message: "Missing --config argument" },
			}) + "\n",
		);
		app.exit(1);
		return;
	}

	await ensureRecordingsDir();

	registerIpcHandlers(
		() => {
			/* no-op for CLI */
		},
		() => new BrowserWindow({ show: false }),
		() => null,
		() => null,
	);

	// The `read-binary-file` IPC handler restricts reads to RECORDINGS_DIR plus
	// a runtime-approved allowlist. Pre-approve the CLI config path (and the
	// video paths it references) so the hidden renderer can load them from
	// os.tmpdir() / user-chosen locations without being rejected.
	try {
		approveReadablePath(configPath);
		const rawConfig = await fs.readFile(configPath, "utf8");
		const parsedConfig = JSON.parse(rawConfig) as {
			project?: { media?: { screenVideoPath?: string; webcamVideoPath?: string } };
		};
		const screenVideoPath = parsedConfig.project?.media?.screenVideoPath;
		if (typeof screenVideoPath === "string" && screenVideoPath.length > 0) {
			approveReadablePath(screenVideoPath);
		}
		const webcamVideoPath = parsedConfig.project?.media?.webcamVideoPath;
		if (typeof webcamVideoPath === "string" && webcamVideoPath.length > 0) {
			approveReadablePath(webcamVideoPath);
		}
	} catch (err) {
		process.stdout.write(
			`${JSON.stringify({
				__cli: true,
				type: "error",
				data: { message: `Failed to pre-approve CLI export paths: ${String(err)}` },
			})}\n`,
		);
		app.exit(1);
		return;
	}

	// Override save-exported-video to write directly to the output path (no dialog)
	const outputPath = getCliArg("--output");
	ipcMain.removeHandler("save-exported-video");
	ipcMain.handle("save-exported-video", async (_, videoData: ArrayBuffer, _fileName: string) => {
		if (!outputPath) {
			return { success: false, message: "No --output path specified for CLI export" };
		}
		try {
			await fs.writeFile(outputPath, Buffer.from(videoData));
			return { success: true, path: outputPath, message: "Export saved" };
		} catch (error) {
			return { success: false, message: String(error) };
		}
	});

	let exiting = false;
	// Declared before handleCliExit so a fast renderer error (which fires the
	// IPC listener below before loadURL/loadFile has a chance to initialize
	// safetyTimer) doesn't hit the TDZ and mask the real error with a
	// ReferenceError.
	let safetyTimer: ReturnType<typeof setTimeout> | undefined;
	function handleCliExit(type: string) {
		if (exiting) return;
		exiting = true;
		if (safetyTimer) clearTimeout(safetyTimer);
		setTimeout(() => app.exit(type === "done" ? 0 : 1), 500);
	}

	const win = new BrowserWindow({
		width: 1920,
		height: 1080,
		show: false,
		webPreferences: {
			preload: path.join(__dirname, "preload.mjs"),
			nodeIntegration: false,
			contextIsolation: true,
			webSecurity: false,
			backgroundThrottling: false,
		},
	});

	// Single IPC handler for CLI export messages from renderer
	ipcMain.on("cli-export-message", (_, message: { type: string; data: unknown }) => {
		process.stdout.write(
			JSON.stringify({ __cli: true, type: message.type, data: message.data }) + "\n",
		);
		if (message.type === "done" || message.type === "error") {
			handleCliExit(message.type);
		}
	});

	const configPathEncoded = encodeURIComponent(configPath);
	if (VITE_DEV_SERVER_URL) {
		await win.loadURL(
			`${VITE_DEV_SERVER_URL}?windowType=cli-export&configPath=${configPathEncoded}`,
		);
	} else {
		await win.loadFile(path.join(RENDERER_DIST, "index.html"), {
			query: { windowType: "cli-export", configPath },
		});
	}

	safetyTimer = setTimeout(
		() => {
			process.stdout.write(
				JSON.stringify({
					__cli: true,
					type: "error",
					data: { message: "Export timed out after 10 minutes" },
				}) + "\n",
			);
			app.exit(1);
		},
		10 * 60 * 1000,
	);
}

// Register all IPC handlers when app is ready
app.whenReady().then(async () => {
	if (isCliExport) {
		// loadURL/loadFile inside runCliExport() can reject (ERR_FILE_NOT_FOUND,
		// dev server down, etc). Without this catch, the rejection bubbles up
		// and the CLI process crashes without ever emitting a __cli error
		// envelope, leaving the parent electron-bridge with no actionable
		// message to relay to the agent.
		try {
			await runCliExport();
		} catch (error) {
			process.stdout.write(
				`${JSON.stringify({
					__cli: true,
					type: "error",
					data: { message: error instanceof Error ? error.message : String(error) },
				})}\n`,
			);
			app.exit(1);
		}
		return;
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
		() => mainWindow,
		() => sourceSelectorWindow,
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
