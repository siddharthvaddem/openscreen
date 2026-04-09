/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
	interface ProcessEnv {
		/**
		 * The built directory structure
		 *
		 * ```tree
		 * ├─┬─┬ dist
		 * │ │ └── index.html
		 * │ │
		 * │ ├─┬ dist-electron
		 * │ │ ├── main.js
		 * │ │ └── preload.js
		 * │
		 * ```
		 */
		APP_ROOT: string;
		/** /dist/ or /public/ */
		VITE_PUBLIC: string;
	}
}

// Used in Renderer process, expose in `preload.ts`
interface Window {
	electronAPI: {
		getSources: (opts: Electron.SourcesOptions) => Promise<ProcessedDesktopSource[]>;
		switchToEditor: () => Promise<void>;
		switchToHud: () => Promise<void>;
		startNewRecording: () => Promise<{ success: boolean; error?: string }>;
		openSourceSelector: () => Promise<void>;
		selectSource: (source: ProcessedDesktopSource) => Promise<ProcessedDesktopSource | null>;
		getSelectedSource: () => Promise<ProcessedDesktopSource | null>;
		requestCameraAccess: () => Promise<{
			success: boolean;
			granted: boolean;
			status: string;
			error?: string;
		}>;
		getAssetBasePath: () => Promise<string | null>;
		storeRecordedVideo: (
			videoData: ArrayBuffer,
			fileName: string,
		) => Promise<{
			success: boolean;
			path?: string;
			session?: import("../src/lib/recordingSession").RecordingSession;
			message?: string;
			error?: string;
		}>;
		storeRecordedSession: (
			payload: import("../src/lib/recordingSession").StoreRecordedSessionInput,
		) => Promise<{
			success: boolean;
			path?: string;
			session?: import("../src/lib/recordingSession").RecordingSession;
			message?: string;
			error?: string;
		}>;
		getRecordedVideoPath: () => Promise<{
			success: boolean;
			path?: string;
			message?: string;
			error?: string;
		}>;
		setRecordingState: (recording: boolean) => Promise<void>;
		getCursorTelemetry: (videoPath?: string) => Promise<{
			success: boolean;
			samples: CursorTelemetryPoint[];
			message?: string;
			error?: string;
		}>;
		getInteractionTelemetry: (videoPath?: string) => Promise<{
			success: boolean;
			clicks: Array<{ timeMs: number; cx: number; cy: number }>;
			keys: Array<{ timeMs: number; key: string }>;
		}>;
		onStopRecordingFromTray: (callback: () => void) => () => void;
		openExternalUrl: (url: string) => Promise<{ success: boolean; error?: string }>;
		writeClipboardText: (text: string) => Promise<{ success: boolean }>;
		getAuthSession: () => Promise<{
			accessToken: string;
			refreshToken: string;
			expiresAt: string;
			user: { id: string; email: string; displayName: string };
			subscription: { plan: "free" | "pro"; status: string };
			entitlements: string[];
			lastUpdatedAt: string;
		} | null>;
		logoutAuthSession: () => Promise<{ success: boolean }>;
		clearAuthSession: () => Promise<{ success: boolean }>;
		getDeviceFingerprint: () => Promise<{ deviceId: string; createdAt: string }>;
		createLocalAuthAccount: (payload: {
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
		}) => Promise<{ success: boolean; error?: string }>;
		loginLocalAuthAccount: (payload: {
			identifier: string;
			password: string;
			deviceId?: string;
		}) => Promise<{ success: boolean; error?: string }>;
		requestLocalPhoneVerification: (payload: {
			phoneNumber: string;
			deviceId?: string;
			purpose?: "signup" | "recovery";
		}) => Promise<{
			success: boolean;
			message?: string;
			previewCode?: string;
			retryAfterSec?: number;
			expiresInSec?: number;
			expiresAt?: string;
			error?: string;
		}>;
		verifyLocalPhoneCode: (payload: {
			phoneNumber: string;
			code: string;
			deviceId?: string;
			purpose?: "signup" | "recovery";
		}) => Promise<{
			success: boolean;
			verificationToken?: string;
			expiresAt?: string;
			message?: string;
			error?: string;
		}>;
		findLocalAuthUsername: (payload: {
			familyName: string;
			givenName: string;
			phoneNumber: string;
			verificationToken: string;
		}) => Promise<{ success: boolean; username?: string; error?: string }>;
		resetLocalAuthPassword: (payload: {
			username: string;
			phoneNumber: string;
			verificationToken: string;
			newPassword: string;
		}) => Promise<{ success: boolean; error?: string }>;
		onAuthSessionChanged: (
			callback: (
				session: {
					accessToken: string;
					refreshToken: string;
					expiresAt: string;
					user: { id: string; email: string; displayName: string };
					subscription: { plan: "free" | "pro"; status: string };
					entitlements: string[];
					lastUpdatedAt: string;
				} | null,
			) => void,
		) => () => void;
		saveExportedVideo: (
			videoData: ArrayBuffer,
			fileName: string,
		) => Promise<{ success: boolean; path?: string; message?: string; canceled?: boolean }>;
		openVideoFilePicker: () => Promise<{ success: boolean; path?: string; canceled?: boolean }>;
		setCurrentVideoPath: (path: string) => Promise<{ success: boolean }>;
		setCurrentRecordingSession: (
			session: import("../src/lib/recordingSession").RecordingSession | null,
		) => Promise<{
			success: boolean;
			session?: import("../src/lib/recordingSession").RecordingSession;
		}>;
		getCurrentVideoPath: () => Promise<{ success: boolean; path?: string }>;
		getCurrentRecordingSession: () => Promise<{
			success: boolean;
			session?: import("../src/lib/recordingSession").RecordingSession;
		}>;
		readBinaryFile: (filePath: string) => Promise<{
			success: boolean;
			data?: ArrayBuffer;
			path?: string;
			message?: string;
			error?: string;
		}>;
		clearCurrentVideoPath: () => Promise<{ success: boolean }>;
		saveProjectFile: (
			projectData: unknown,
			suggestedName?: string,
			existingProjectPath?: string,
		) => Promise<{
			success: boolean;
			path?: string;
			message?: string;
			canceled?: boolean;
			error?: string;
		}>;
		loadProjectFile: () => Promise<{
			success: boolean;
			path?: string;
			project?: unknown;
			message?: string;
			canceled?: boolean;
			error?: string;
		}>;
		loadCurrentProjectFile: () => Promise<{
			success: boolean;
			path?: string;
			project?: unknown;
			message?: string;
			canceled?: boolean;
			error?: string;
		}>;
		onMenuLoadProject: (callback: () => void) => () => void;
		onMenuSaveProject: (callback: () => void) => () => void;
		onMenuSaveProjectAs: (callback: () => void) => () => void;
		getPlatform: () => Promise<string>;
		revealInFolder: (
			filePath: string,
		) => Promise<{ success: boolean; error?: string; message?: string }>;
		getShortcuts: () => Promise<Record<string, unknown> | null>;
		saveShortcuts: (shortcuts: unknown) => Promise<{ success: boolean; error?: string }>;
		hudOverlayHide: () => void;
		hudOverlayClose: () => void;
		setMicrophoneExpanded: (expanded: boolean) => void;
		setHasUnsavedChanges: (hasChanges: boolean) => void;
		onRequestSaveBeforeClose: (callback: () => Promise<boolean> | boolean) => () => void;
		setLocale: (locale: string) => Promise<void>;
		onEditorCommandRequest: (
			callback: (
				request: import("../src/editor/commands/types").EditorCommandRequestEnvelope,
			) => void | Promise<void>,
		) => () => void;
		sendEditorCommandResponse: (
			response: import("../src/editor/commands/types").EditorCommandResponseEnvelope,
		) => void;
		publishEditorState: (
			snapshot: import("../src/editor/commands/types").ProjectStateSnapshot,
		) => void;
		getMcpConnectionInfo: () => Promise<{
			enabled: boolean;
			url: string;
			token: string;
		}>;
		resetMcpToken: () => Promise<{
			success: boolean;
			url?: string;
			token?: string;
			error?: string;
		}>;
		getAdminBackendStatus: () => Promise<{
			success: boolean;
			storageDriver?: string;
			postgres?: {
				configured: boolean;
				driver: string;
				connected: boolean;
				message: string;
				serverTime?: string;
			};
			auditSource?: string;
			recentSignupAuditLogs?: Array<{
				id: string;
				username?: string;
				email?: string;
				phoneNumber?: string;
				deviceId?: string;
				signupIp?: string;
				outcome: string;
				reason?: string;
				createdAt: string;
			}>;
			error?: string;
		}>;
		testMcpConnection: () => Promise<{ success: boolean; message?: string; error?: string }>;
	};
}

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
