import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	app,
	BrowserWindow,
	clipboard,
	dialog,
	ipcMain,
	Menu,
	nativeImage,
	session,
	systemPreferences,
	Tray,
} from "electron";

declare global {
	namespace Electron {
		interface App {
			isQuitting?: boolean;
		}
	}
}

import {
	loginWithEmailViaApi,
	logoutDesktopSession,
	refreshDesktopSession,
	requestPhoneVerificationViaApi,
	signupWithEmailViaApi,
	verifyPhoneCodeViaApi,
} from "./auth/client";
import { getOrCreateDeviceFingerprint } from "./auth/deviceFingerprint";
import {
	findLocalUsername,
	loginLocalDesktopAccount,
	registerLocalDesktopAccount,
	requestLocalPhoneVerification,
	resetLocalDesktopPassword,
	verifyLocalPhoneCode,
} from "./auth/localAccountStore";
import {
	clearStoredDesktopAuthSession,
	handleDesktopProtocolUrl,
	restoreDesktopAuthSession,
	setupDesktopProtocol,
} from "./auth/protocol";
import { type DesktopAuthSession, writeDesktopAuthSession } from "./auth/sessionStore";
import { mainT, setMainLocale } from "./i18n";
import { registerEditorCommandBridge } from "./ipc/editorBridge";
import { registerIpcHandlers } from "./ipc/handlers";
import { startAutoScreenMcpServer } from "./mcp/server";
import { createEditorWindow, createHudOverlayWindow, createSourceSelectorWindow } from "./windows";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use Screen & System Audio Recording permissions instead of CoreAudio Tap API on macOS.
// CoreAudio Tap requires NSAudioCaptureUsageDescription in the parent app's Info.plist,
// which doesn't work when running from a terminal/IDE during development, makes my life easier
if (process.platform === "darwin") {
	app.commandLine.appendSwitch("disable-features", "MacCatapLoopbackAudioForScreenShare");
}

export const RECORDINGS_DIR = path.join(app.getPath("userData"), "recordings");

function createHiddenAdminSession(): DesktopAuthSession {
	return {
		accessToken: `admin-access-${Date.now()}`,
		refreshToken: `admin-refresh-${Date.now()}`,
		expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
		user: {
			id: "admin:test1",
			email: "admin@autoscreen.local",
			displayName: "관리자",
		},
		subscription: { plan: "pro", status: "active" },
		entitlements: ["basic_recording", "basic_editing", "pro_export", "mcp_editing"],
		lastUpdatedAt: new Date().toISOString(),
	};
}

function isProductionDesktopBuild() {
	return app.isPackaged && process.env.ALLOW_DESKTOP_DEV_AUTH !== "1";
}

function canUseLocalAuthFallback() {
	return !isProductionDesktopBuild();
}

function canUseHiddenTestAdmin() {
	return process.env.ALLOW_TEST_ADMIN_LOGIN === "1" || !app.isPackaged;
}

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
let hudWindow: BrowserWindow | null = null;
let editorWindow: BrowserWindow | null = null;
let sourceSelectorWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let selectedSourceName = "";
let mcpRuntime: Awaited<ReturnType<typeof startAutoScreenMcpServer>> | null = null;
let pendingProtocolUrl: string | null = null;

// Tray Icons
const defaultTrayIcon = getTrayIcon("autoscreen.png");
const recordingTrayIcon = getTrayIcon("autoscreen-recording.png");

function createWindow() {
	const shouldStartWithEditor =
		process.env.AUTO_SCREEN_START_EDITOR === "true" ||
		process.env.AUTO_SCREEN_AUTH_GATE !== "false";

	if (shouldStartWithEditor) {
		createEditorWindowWrapper();
		return;
	}

	showHudWindow();
}

function showHudWindow() {
	if (hudWindow && !hudWindow.isDestroyed()) {
		if (hudWindow.isMinimized()) {
			hudWindow.restore();
		}
		hudWindow.show();
		hudWindow.focus();
		return;
	}

	hudWindow = createHudOverlayWindow();
	hudWindow.on("closed", () => {
		if (hudWindow && hudWindow.isDestroyed()) {
			hudWindow = null;
		}
	});
}

function isEditorWindow(window: BrowserWindow) {
	return window.webContents.getURL().includes("windowType=editor");
}

function sendEditorMenuAction(
	channel: "menu-load-project" | "menu-save-project" | "menu-save-project-as",
) {
	let targetWindow = BrowserWindow.getFocusedWindow() ?? editorWindow;

	if (!targetWindow || targetWindow.isDestroyed() || !isEditorWindow(targetWindow)) {
		createEditorWindowWrapper();
		targetWindow = editorWindow;
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
		showHudWindow();
	});
	tray.on("double-click", () => {
		showHudWindow();
	});
}

function getTrayIcon(filename: string) {
	return nativeImage
		.createFromPath(path.join(process.env.VITE_PUBLIC || RENDERER_DIST, filename))
		.resize({
			width: 24,
			height: 24,
			quality: "best",
		});
}

function updateTrayMenu(recording: boolean = false) {
	if (!tray) return;
	const trayIcon = recording ? recordingTrayIcon : defaultTrayIcon;
	const trayToolTip = recording ? `Recording: ${selectedSourceName}` : "Auto Screen";
	const menuTemplate = recording
		? [
				{
					label: mainT("common", "actions.stopRecording") || "Stop Recording",
					click: () => {
						if (hudWindow && !hudWindow.isDestroyed()) {
							hudWindow.webContents.send("stop-recording-from-tray");
						}
					},
				},
			]
		: [
				{
					label: mainT("common", "actions.open") || "Open",
					click: () => {
						showHudWindow();
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
let isSwitchingToHud = false;

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
	if (editorWindow && !editorWindow.isDestroyed()) {
		if (editorWindow.isMinimized()) {
			editorWindow.restore();
		}
		editorWindow.show();
		editorWindow.focus();
		return editorWindow;
	}

	if (hudWindow && !hudWindow.isDestroyed()) {
		hudWindow.hide();
	}

	editorWindow = createEditorWindow();
	editorHasUnsavedChanges = false;

	editorWindow.on("closed", () => {
		const shouldRevealHud =
			isSwitchingToHud || (!app.isQuitting && (!hudWindow || hudWindow.isDestroyed()));
		editorWindow = null;
		if (shouldRevealHud) {
			showHudWindow();
		}
		isSwitchingToHud = false;
	});

	editorWindow.on("close", (event) => {
		if (isForceClosing || !editorHasUnsavedChanges) return;

		event.preventDefault();

		const choice = dialog.showMessageBoxSync(editorWindow!, {
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

		const windowToClose = editorWindow;
		if (!windowToClose || windowToClose.isDestroyed()) return;

		if (choice === 0) {
			windowToClose.webContents.send("request-save-before-close");
			ipcMain.once("save-before-close-done", (_, shouldClose: boolean) => {
				if (!shouldClose) return;
				forceCloseEditorWindow(windowToClose);
			});
		} else if (choice === 1) {
			forceCloseEditorWindow(windowToClose);
		}
	});

	return editorWindow;
}

function createSourceSelectorWindowWrapper() {
	sourceSelectorWindow = createSourceSelectorWindow();
	sourceSelectorWindow.on("closed", () => {
		sourceSelectorWindow = null;
	});
	return sourceSelectorWindow;
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
	app.quit();
}

app.on("second-instance", (_event, commandLine) => {
	const deepLink = commandLine.find((arg) => arg.startsWith("autoscreen://"));
	if (deepLink) {
		pendingProtocolUrl = deepLink;
		void handleDesktopProtocolUrl(deepLink, editorWindow);
	}
	createEditorWindowWrapper();
});

app.on("open-url", (event, url) => {
	event.preventDefault();
	pendingProtocolUrl = url;
	void handleDesktopProtocolUrl(url, editorWindow);
});

// On macOS, applications and their menu bar stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
	// Keep app running (macOS behavior)
});

app.on("before-quit", () => {
	app.isQuitting = true;
});

app.on("activate", () => {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});

// Register all IPC handlers when app is ready
app.whenReady().then(async () => {
	setupDesktopProtocol();

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
	ipcMain.handle("get-auth-session", async () => {
		const currentSession = await restoreDesktopAuthSession();
		if (!currentSession) {
			return null;
		}

		if (new Date(currentSession.expiresAt).getTime() > Date.now() + 30_000) {
			return currentSession;
		}

		try {
			const refreshedSession = await refreshDesktopSession(currentSession.refreshToken);
			await writeDesktopAuthSession(refreshedSession);
			return refreshedSession;
		} catch {
			await clearStoredDesktopAuthSession(editorWindow);
			return null;
		}
	});
	ipcMain.handle("logout-auth-session", async () => {
		const currentSession = await restoreDesktopAuthSession();
		if (currentSession?.refreshToken) {
			try {
				await logoutDesktopSession(currentSession.refreshToken);
			} catch {
				// ignore logout network failures and still clear local session
			}
		}
		await clearStoredDesktopAuthSession(editorWindow);
		return { success: true };
	});
	ipcMain.handle("clear-auth-session", async () => {
		await clearStoredDesktopAuthSession(editorWindow);
		return { success: true };
	});
	ipcMain.handle("get-device-fingerprint", async () => {
		return await getOrCreateDeviceFingerprint();
	});
	ipcMain.handle(
		"create-local-auth-account",
		async (
			_event,
			payload: {
				username: string;
				familyName: string;
				givenName: string;
				phoneNumber: string;
				password: string;
				verificationToken: string;
				deviceId: string;
				agreements: {
					terms: boolean;
					privacy: boolean;
					marketing: boolean;
				};
			},
		) => {
			try {
				const session = await signupWithEmailViaApi(payload);
				await writeDesktopAuthSession(session);
				editorWindow?.webContents.send("auth-session-changed", session);
				return { success: true, session };
			} catch (error) {
				if (error instanceof Error && !error.message.startsWith("fetch")) {
					return { success: false, error: error.message };
				}
				if (!canUseLocalAuthFallback()) {
					return {
						success: false,
						error:
							"회원가입 서버에 연결하지 못했습니다. 운영 환경에서는 로컬 계정으로 가입할 수 없습니다.",
					};
				}
				const result = await registerLocalDesktopAccount(payload);
				if (!result.session) {
					return { success: false, error: result.error ?? "회원가입에 실패했습니다." };
				}

				await writeDesktopAuthSession(result.session);
				editorWindow?.webContents.send("auth-session-changed", result.session);
				return { success: true, session: result.session };
			}
		},
	);
	ipcMain.handle(
		"login-local-auth-account",
		async (_event, payload: { identifier: string; password: string; deviceId?: string }) => {
			const identifier = payload.identifier.trim().toLowerCase();
			const password = payload.password.trim();
			if (canUseHiddenTestAdmin() && identifier === "test1" && password === "test1") {
				const session = createHiddenAdminSession();
				await writeDesktopAuthSession(session);
				editorWindow?.webContents.send("auth-session-changed", session);
				return { success: true, session };
			}
			try {
				const session = await loginWithEmailViaApi(payload);
				await writeDesktopAuthSession(session);
				editorWindow?.webContents.send("auth-session-changed", session);
				return { success: true, session };
			} catch (error) {
				if (error instanceof Error && !error.message.startsWith("fetch")) {
					return { success: false, error: error.message };
				}
				if (!canUseLocalAuthFallback()) {
					return {
						success: false,
						error:
							"로그인 서버에 연결하지 못했습니다. 운영 환경에서는 로컬 로그인으로 폴백하지 않습니다.",
					};
				}
				const result = await loginLocalDesktopAccount(payload);
				if (!result.session) {
					return { success: false, error: result.error ?? "로그인에 실패했습니다." };
				}

				await writeDesktopAuthSession(result.session);
				editorWindow?.webContents.send("auth-session-changed", result.session);
				return { success: true, session: result.session };
			}
		},
	);
	ipcMain.handle(
		"request-local-phone-verification",
		async (
			_event,
			payload: { phoneNumber: string; deviceId?: string; purpose?: "signup" | "recovery" },
		) => {
			const purpose = payload.purpose ?? "signup";
			try {
				const result = await requestPhoneVerificationViaApi({
					phoneNumber: payload.phoneNumber,
					purpose: purpose === "recovery" ? "login" : "signup",
					deviceId: payload.deviceId,
				});
				return {
					success: true,
					message: result.message,
					previewCode: app.isPackaged ? undefined : result.previewCode,
					retryAfterSec: result.retryAfterSec,
					expiresInSec: result.expiresInSec,
					expiresAt: result.expiresAt,
				};
			} catch (error) {
				if (error instanceof Error && !error.message.startsWith("fetch")) {
					return { success: false, error: error.message };
				}
				if (!canUseLocalAuthFallback()) {
					return {
						success: false,
						error:
							"문자 인증 서버에 연결하지 못했습니다. 운영 환경에서는 로컬 인증으로 폴백하지 않습니다.",
					};
				}
				return await requestLocalPhoneVerification(payload.phoneNumber, purpose);
			}
		},
	);
	ipcMain.handle(
		"verify-local-phone-code",
		async (
			_event,
			payload: {
				phoneNumber: string;
				code: string;
				deviceId?: string;
				purpose?: "signup" | "recovery";
			},
		) => {
			const purpose = payload.purpose ?? "signup";
			try {
				const result = await verifyPhoneCodeViaApi({
					phoneNumber: payload.phoneNumber,
					code: payload.code,
					purpose: purpose === "recovery" ? "login" : "signup",
					deviceId: payload.deviceId,
				});
				return {
					success: Boolean(result.verified),
					verificationToken: result.verificationToken,
					expiresAt: result.expiresAt,
					message: result.message,
					error: result.error,
				};
			} catch (error) {
				if (error instanceof Error && !error.message.startsWith("fetch")) {
					return { success: false, error: error.message };
				}
				return await verifyLocalPhoneCode(payload.phoneNumber, payload.code, purpose);
			}
		},
	);
	ipcMain.handle(
		"find-local-auth-username",
		async (
			_event,
			payload: {
				familyName: string;
				givenName: string;
				phoneNumber: string;
				verificationToken: string;
			},
		) => {
			return await findLocalUsername(payload);
		},
	);
	ipcMain.handle(
		"reset-local-auth-password",
		async (
			_event,
			payload: {
				username: string;
				phoneNumber: string;
				verificationToken: string;
				newPassword: string;
			},
		) => {
			return await resetLocalDesktopPassword(payload);
		},
	);
	ipcMain.handle("write-clipboard-text", async (_event, text: string) => {
		clipboard.writeText(text || "");
		return { success: true };
	});
	ipcMain.handle("reset-mcp-token", async () => {
		if (!mcpRuntime?.enabled) {
			return { success: false, error: "MCP 런타임이 아직 준비되지 않았습니다." };
		}
		try {
			const token = await mcpRuntime.resetToken();
			return { success: true, url: mcpRuntime.url, token };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "토큰 재발급에 실패했습니다.",
			};
		}
	});
	ipcMain.handle("get-admin-backend-status", async () => {
		const baseUrl =
			process.env.AUTO_SCREEN_AUTH_API_URL ||
			process.env.AUTO_SCREEN_BACKEND_URL ||
			process.env.VITE_APP_API_URL ||
			"http://127.0.0.1:4242";
		const normalized = baseUrl.replace(/\/$/, "");
		try {
			const [statusResponse, auditResponse] = await Promise.all([
				fetch(`${normalized}/api/admin/storage/status`),
				fetch(`${normalized}/api/admin/signup-audit?limit=3`),
			]);
			if (!statusResponse.ok) {
				return { success: false, error: `관리자 상태 확인 실패 (${statusResponse.status})` };
			}
			const statusPayload = await statusResponse.json();
			const auditPayload = auditResponse.ok ? await auditResponse.json() : { logs: [] };
			return {
				success: true,
				storageDriver: statusPayload.storageDriver,
				postgres: statusPayload.postgres,
				auditSource: auditPayload.source,
				recentSignupAuditLogs: Array.isArray(auditPayload.logs) ? auditPayload.logs : [],
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "관리자 상태를 가져오지 못했습니다.",
			};
		}
	});
	ipcMain.handle("test-mcp-connection", async () => {
		if (!mcpRuntime?.enabled || !mcpRuntime.url || !mcpRuntime.token) {
			return { success: false, error: "MCP 런타임이 아직 준비되지 않았습니다." };
		}

		try {
			const response = await fetch(`${mcpRuntime.url}/session`, {
				headers: {
					Authorization: `Bearer ${mcpRuntime.token}`,
				},
			});
			if (!response.ok) {
				return { success: false, error: `MCP 상태 확인 실패 (${response.status})` };
			}

			const payload = await response.json();
			return {
				success: true,
				message: payload?.state
					? "편집기와 MCP 연결이 정상입니다."
					: "MCP 서버는 살아 있지만 아직 열린 편집기 상태가 없습니다.",
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "MCP 상태 확인 중 오류가 발생했습니다.",
			};
		}
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
		if (editorWindow && !editorWindow.isDestroyed()) {
			isSwitchingToHud = true;
			isForceClosing = true;
			editorWindow.close();
			isForceClosing = false;
			return;
		}
		showHudWindow();
	}

	const editorBridge = registerEditorCommandBridge(() => editorWindow);
	registerIpcHandlers(
		createEditorWindowWrapper,
		createSourceSelectorWindowWrapper,
		() => sourceSelectorWindow,
		(recording: boolean, sourceName: string) => {
			selectedSourceName = sourceName;
			if (!tray) createTray();
			updateTrayMenu(recording);
			if (!recording) {
				showHudWindow();
			}
		},
		switchToHudWrapper,
	);
	mcpRuntime = await startAutoScreenMcpServer(editorBridge);
	editorBridge.setConnectionInfoGetter(() => ({
		enabled: mcpRuntime?.enabled ?? false,
		url: mcpRuntime?.url ?? "",
		token: mcpRuntime?.token ?? "",
	}));
	console.log(`[Auto Screen MCP] ${mcpRuntime.url}`);
	console.log("[Auto Screen MCP] bearer token is available in-app via MCP settings.");
	createWindow();

	if (pendingProtocolUrl) {
		await handleDesktopProtocolUrl(pendingProtocolUrl, editorWindow);
		pendingProtocolUrl = null;
	}
});
