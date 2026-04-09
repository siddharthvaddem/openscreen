/// <reference types="vite/client" />
/// <reference types="../electron/electron-env" />

interface ImportMetaEnv {
	readonly VITE_APP_WEBSITE_URL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
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
		storeRecordedVideo: (
			videoData: ArrayBuffer,
			fileName: string,
		) => Promise<{
			success: boolean;
			path?: string;
			session?: import("./lib/recordingSession").RecordingSession;
			message?: string;
			error?: string;
		}>;
		storeRecordedSession: (
			payload: import("./lib/recordingSession").StoreRecordedSessionInput,
		) => Promise<{
			success: boolean;
			path?: string;
			session?: import("./lib/recordingSession").RecordingSession;
			message?: string;
			error?: string;
		}>;
		getRecordedVideoPath: () => Promise<{
			success: boolean;
			path?: string;
			message?: string;
			error?: string;
		}>;
		getAssetBasePath: () => Promise<string | null>;
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
			agreements: { terms: boolean; privacy: boolean; marketing: boolean };
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
		) => Promise<{
			success: boolean;
			path?: string;
			message?: string;
			canceled?: boolean;
		}>;
		openVideoFilePicker: () => Promise<{ success: boolean; path?: string; canceled?: boolean }>;
		setCurrentVideoPath: (path: string) => Promise<{ success: boolean }>;
		setCurrentRecordingSession: (
			session: import("./lib/recordingSession").RecordingSession | null,
		) => Promise<{
			success: boolean;
			session?: import("./lib/recordingSession").RecordingSession;
		}>;
		getCurrentVideoPath: () => Promise<{ success: boolean; path?: string }>;
		getCurrentRecordingSession: () => Promise<{
			success: boolean;
			session?: import("./lib/recordingSession").RecordingSession;
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
		setMicrophoneExpanded: (expanded: boolean) => void;
		setHasUnsavedChanges: (hasChanges: boolean) => void;
		onRequestSaveBeforeClose: (callback: () => Promise<boolean> | boolean) => () => void;
		setLocale: (locale: string) => Promise<void>;
		onEditorCommandRequest: (
			callback: (
				request: import("./editor/commands/types").EditorCommandRequestEnvelope,
			) => void | Promise<void>,
		) => () => void;
		sendEditorCommandResponse: (
			response: import("./editor/commands/types").EditorCommandResponseEnvelope,
		) => void;
		publishEditorState: (snapshot: import("./editor/commands/types").ProjectStateSnapshot) => void;
		getMcpConnectionInfo: () => Promise<{
			enabled: boolean;
			url: string;
			token: string;
		}>;
	};
}
