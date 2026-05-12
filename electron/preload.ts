import { contextBridge, ipcRenderer, webUtils } from "electron";
import type { NativeWindowsRecordingRequest } from "../src/lib/nativeWindowsRecording";
import type { RecordingSession, StoreRecordedSessionInput } from "../src/lib/recordingSession";
import { NATIVE_BRIDGE_CHANNEL, type NativeBridgeRequest } from "../src/native/contracts";

// Asset base URL is passed from the main process via webPreferences.additionalArguments
// (see windows.ts). Sandboxed preloads cannot import node:path / node:url, so we
// can't compute it here.
const ASSET_BASE_URL_ARG_PREFIX = "--asset-base-url=";
const assetBaseUrlArg = process.argv.find((arg) => arg.startsWith(ASSET_BASE_URL_ARG_PREFIX));
const assetBaseUrl = assetBaseUrlArg ? assetBaseUrlArg.slice(ASSET_BASE_URL_ARG_PREFIX.length) : "";

contextBridge.exposeInMainWorld("electronAPI", {
	assetBaseUrl,
	invokeNativeBridge: <TData>(request: NativeBridgeRequest) => {
		return ipcRenderer.invoke(NATIVE_BRIDGE_CHANNEL, request) as Promise<TData>;
	},
	hudOverlayHide: () => {
		ipcRenderer.send("hud-overlay-hide");
	},
	hudOverlayClose: () => {
		ipcRenderer.send("hud-overlay-close");
	},
	setHudOverlayIgnoreMouseEvents: (ignore: boolean) => {
		ipcRenderer.send("hud-overlay-ignore-mouse-events", ignore);
	},
	getSources: async (opts: Electron.SourcesOptions) => {
		return await ipcRenderer.invoke("get-sources", opts);
	},
	switchToEditor: () => {
		return ipcRenderer.invoke("switch-to-editor");
	},
	switchToHud: () => {
		return ipcRenderer.invoke("switch-to-hud");
	},
	startNewRecording: () => {
		return ipcRenderer.invoke("start-new-recording");
	},
	openSourceSelector: () => {
		return ipcRenderer.invoke("open-source-selector");
	},
	selectSource: (source: ProcessedDesktopSource) => {
		return ipcRenderer.invoke("select-source", source);
	},
	getSelectedSource: () => {
		return ipcRenderer.invoke("get-selected-source");
	},
	requestCameraAccess: () => {
		return ipcRenderer.invoke("request-camera-access");
	},
	storeRecordedVideo: (videoData: ArrayBuffer, fileName: string) => {
		return ipcRenderer.invoke("store-recorded-video", videoData, fileName);
	},
	storeRecordedSession: (payload: StoreRecordedSessionInput) => {
		return ipcRenderer.invoke("store-recorded-session", payload);
	},

	getRecordedVideoPath: () => {
		return ipcRenderer.invoke("get-recorded-video-path");
	},
	setRecordingState: (
		recording: boolean,
		recordingId?: number,
		cursorCaptureMode?: import("../src/lib/recordingSession").CursorCaptureMode,
	) => {
		return ipcRenderer.invoke("set-recording-state", recording, recordingId, cursorCaptureMode);
	},
	isNativeWindowsCaptureAvailable: () => {
		return ipcRenderer.invoke("is-native-windows-capture-available");
	},
	startNativeWindowsRecording: (request: NativeWindowsRecordingRequest) => {
		return ipcRenderer.invoke("start-native-windows-recording", request);
	},
	stopNativeWindowsRecording: (discard?: boolean) => {
		return ipcRenderer.invoke("stop-native-windows-recording", discard);
	},
	getCursorTelemetry: (videoPath?: string) => {
		return ipcRenderer.invoke("get-cursor-telemetry", videoPath);
	},
	discardCursorTelemetry: (recordingId: number) => {
		return ipcRenderer.invoke("discard-cursor-telemetry", recordingId);
	},
	onStopRecordingFromTray: (callback: () => void) => {
		const listener = () => callback();
		ipcRenderer.on("stop-recording-from-tray", listener);
		return () => ipcRenderer.removeListener("stop-recording-from-tray", listener);
	},
	openExternalUrl: (url: string) => {
		return ipcRenderer.invoke("open-external-url", url);
	},
	pickExportSavePath: (fileName: string, exportFolder?: string) => {
		return ipcRenderer.invoke("pick-export-save-path", fileName, exportFolder);
	},
	writeExportToPath: (videoData: ArrayBuffer, filePath: string) => {
		return ipcRenderer.invoke("write-export-to-path", videoData, filePath);
	},
	openVideoFilePicker: () => {
		return ipcRenderer.invoke("open-video-file-picker");
	},
	setCurrentVideoPath: (path: string) => {
		return ipcRenderer.invoke("set-current-video-path", path);
	},
	setCurrentRecordingSession: (session: RecordingSession | null) => {
		return ipcRenderer.invoke("set-current-recording-session", session);
	},
	getCurrentVideoPath: () => {
		return ipcRenderer.invoke("get-current-video-path");
	},
	getCurrentRecordingSession: () => {
		return ipcRenderer.invoke("get-current-recording-session");
	},
	readBinaryFile: (filePath: string) => {
		return ipcRenderer.invoke("read-binary-file", filePath);
	},
	clearCurrentVideoPath: () => {
		return ipcRenderer.invoke("clear-current-video-path");
	},
	saveProjectFile: (projectData: unknown, suggestedName?: string, existingProjectPath?: string) => {
		return ipcRenderer.invoke("save-project-file", projectData, suggestedName, existingProjectPath);
	},
	loadProjectFile: () => {
		return ipcRenderer.invoke("load-project-file");
	},
	loadProjectFileFromPath: (filePath: string) => {
		return ipcRenderer.invoke("load-project-file-from-path", filePath);
	},
	getPathForFile: (file: File) => {
		try {
			return webUtils.getPathForFile(file);
		} catch {
			return "";
		}
	},
	loadCurrentProjectFile: () => {
		return ipcRenderer.invoke("load-current-project-file");
	},
	onMenuNewProject: (callback: () => void) => {
		const listener = () => callback();
		ipcRenderer.on("menu-new-project", listener);
		return () => ipcRenderer.removeListener("menu-new-project", listener);
	},
	onMenuImportVideo: (callback: () => void) => {
		const listener = () => callback();
		ipcRenderer.on("menu-import-video", listener);
		return () => ipcRenderer.removeListener("menu-import-video", listener);
	},
	onMenuLoadProject: (callback: () => void) => {
		const listener = () => callback();
		ipcRenderer.on("menu-load-project", listener);
		return () => ipcRenderer.removeListener("menu-load-project", listener);
	},
	onMenuSaveProject: (callback: () => void) => {
		const listener = () => callback();
		ipcRenderer.on("menu-save-project", listener);
		return () => ipcRenderer.removeListener("menu-save-project", listener);
	},
	onMenuSaveProjectAs: (callback: () => void) => {
		const listener = () => callback();
		ipcRenderer.on("menu-save-project-as", listener);
		return () => ipcRenderer.removeListener("menu-save-project-as", listener);
	},
	getPlatform: () => {
		return ipcRenderer.invoke("get-platform");
	},
	revealInFolder: (filePath: string) => {
		return ipcRenderer.invoke("reveal-in-folder", filePath);
	},
	getShortcuts: () => {
		return ipcRenderer.invoke("get-shortcuts");
	},
	saveShortcuts: (shortcuts: unknown) => {
		return ipcRenderer.invoke("save-shortcuts", shortcuts);
	},
	setLocale: (locale: string) => {
		return ipcRenderer.invoke("set-locale", locale);
	},
	saveDiagnostic: (payload: {
		error: string;
		stack?: string;
		projectState: unknown;
		logs: string[];
	}) => {
		return ipcRenderer.invoke("save-diagnostic", payload);
	},
	setMicrophoneExpanded: (expanded: boolean) => {
		ipcRenderer.send("hud:setMicrophoneExpanded", expanded);
	},
	setHasUnsavedChanges: (hasChanges: boolean) => {
		ipcRenderer.send("set-has-unsaved-changes", hasChanges);
	},
	showCountdownOverlay: (value: number, runId: number) => {
		return ipcRenderer.invoke("countdown-overlay-show", value, runId);
	},
	setCountdownOverlayValue: (value: number, runId: number) => {
		return ipcRenderer.invoke("countdown-overlay-set-value", value, runId);
	},
	hideCountdownOverlay: (runId: number) => {
		return ipcRenderer.invoke("countdown-overlay-hide", runId);
	},
	onCountdownOverlayValue: (callback: (value: number | null) => void) => {
		const listener = (_event: unknown, value: number | null) => callback(value);
		ipcRenderer.on("countdown-overlay-value", listener);
		return () => ipcRenderer.removeListener("countdown-overlay-value", listener);
	},
	onRequestSaveBeforeClose: (callback: () => Promise<boolean> | boolean) => {
		const listener = async () => {
			try {
				const shouldClose = await callback();
				ipcRenderer.send("save-before-close-done", shouldClose);
			} catch {
				ipcRenderer.send("save-before-close-done", false);
			}
		};
		ipcRenderer.on("request-save-before-close", listener);
		return () => ipcRenderer.removeListener("request-save-before-close", listener);
	},
	onRequestCloseConfirm: (callback: () => void) => {
		const listener = () => callback();
		ipcRenderer.on("request-close-confirm", listener);
		return () => ipcRenderer.removeListener("request-close-confirm", listener);
	},
	sendCloseConfirmResponse: (choice: "save" | "discard" | "cancel") => {
		ipcRenderer.send("close-confirm-response", choice);
	},
	onCursorTypeChange: (
		callback: (
			cursorType: import("../src/native/contracts").NativeCursorType | null,
			asset:
				| import("../electron/native-bridge/cursor/recording/windowsNativeRecordingSession.types").CursorOverlayAsset
				| null,
		) => void,
	) => {
		const listener = (
			_event: unknown,
			cursorType: import("../src/native/contracts").NativeCursorType | null,
			asset:
				| import("../electron/native-bridge/cursor/recording/windowsNativeRecordingSession.types").CursorOverlayAsset
				| null,
		) => callback(cursorType, asset);
		ipcRenderer.on("cursor-type-change", listener);
		return () => ipcRenderer.removeListener("cursor-type-change", listener);
	},
});
