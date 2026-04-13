import { type ChildProcess, spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
	app,
	BrowserWindow,
	desktopCapturer,
	dialog,
	ipcMain,
	screen,
	shell,
	systemPreferences,
} from "electron";
import {
	normalizeProjectMedia,
	normalizeRecordingSession,
	type ProjectMedia,
	type RecordingSession,
	type StoreRecordedSessionInput,
} from "../../src/lib/recordingSession";
import { buildFFmpegArgs, getFFmpegCapabilities, getFFmpegPath } from "../ffmpeg/ffmpegManager";
import { mainT } from "../i18n";
import { RECORDINGS_DIR } from "../main";

const PROJECT_FILE_EXTENSION = "openscreen";
const SHORTCUTS_FILE = path.join(app.getPath("userData"), "shortcuts.json");
const RECORDING_SESSION_SUFFIX = ".session.json";
const ALLOWED_IMPORT_VIDEO_EXTENSIONS = new Set([".webm", ".mp4", ".mov", ".avi", ".mkv"]);

/**
 * Paths explicitly approved by the user via file picker dialogs or project loads.
 * These are added at runtime when the user selects files from outside the default directories.
 */
const approvedPaths = new Set<string>();

function approveFilePath(filePath: string): void {
	approvedPaths.add(path.resolve(filePath));
}

function getAllowedReadDirs(): string[] {
	return [RECORDINGS_DIR];
}

function isPathWithinDir(filePath: string, dirPath: string): boolean {
	const resolved = path.resolve(filePath);
	const resolvedDir = path.resolve(dirPath);
	return resolved === resolvedDir || resolved.startsWith(resolvedDir + path.sep);
}

function isPathAllowed(filePath: string): boolean {
	const resolved = path.resolve(filePath);
	if (approvedPaths.has(resolved)) return true;
	return getAllowedReadDirs().some((dir) => isPathWithinDir(resolved, dir));
}

function hasAllowedImportVideoExtension(filePath: string): boolean {
	return ALLOWED_IMPORT_VIDEO_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

async function approveReadableVideoPath(
	filePath?: string | null,
	trustedDirs?: string[],
): Promise<string | null> {
	const normalizedPath = normalizeVideoSourcePath(filePath);
	if (!normalizedPath) {
		return null;
	}

	if (isPathAllowed(normalizedPath)) {
		return normalizedPath;
	}

	if (!hasAllowedImportVideoExtension(normalizedPath)) {
		return null;
	}

	// When called with trustedDirs (e.g. from project load), only auto-approve
	// paths within those directories. This prevents malicious project files from
	// approving reads to arbitrary filesystem locations.
	if (trustedDirs) {
		const resolved = path.resolve(normalizedPath);
		const withinTrusted = trustedDirs.some((dir) => isPathWithinDir(resolved, dir));
		if (!withinTrusted) {
			return null;
		}
	}

	try {
		const stats = await fs.stat(normalizedPath);
		if (!stats.isFile()) {
			return null;
		}
	} catch {
		return null;
	}

	approveFilePath(normalizedPath);
	return normalizedPath;
}

function resolveRecordingOutputPath(fileName: string): string {
	const trimmed = fileName.trim();
	if (!trimmed) {
		throw new Error("Invalid recording file name");
	}

	const parsedPath = path.parse(trimmed);
	const hasTraversalSegments = trimmed.split(/[\\/]+/).some((segment) => segment === "..");
	const isNestedPath =
		parsedPath.dir !== "" ||
		path.isAbsolute(trimmed) ||
		trimmed.includes("/") ||
		trimmed.includes("\\");
	if (hasTraversalSegments || isNestedPath || parsedPath.base !== trimmed) {
		throw new Error("Recording file name must not contain path segments");
	}

	return path.join(RECORDINGS_DIR, parsedPath.base);
}

async function getApprovedProjectSession(
	project: unknown,
	projectFilePath?: string,
): Promise<RecordingSession | null> {
	if (!project || typeof project !== "object") {
		return null;
	}

	const rawProject = project as { media?: unknown; videoPath?: unknown };
	const media: ProjectMedia | null =
		normalizeProjectMedia(rawProject.media) ??
		(typeof rawProject.videoPath === "string"
			? {
					screenVideoPath: normalizeVideoSourcePath(rawProject.videoPath) ?? rawProject.videoPath,
				}
			: null);

	if (!media) {
		return null;
	}

	// Only auto-approve media paths within the project's directory or RECORDINGS_DIR.
	// This prevents crafted project files from approving reads to arbitrary locations.
	const trustedDirs = [RECORDINGS_DIR];
	if (projectFilePath) {
		trustedDirs.push(path.dirname(path.resolve(projectFilePath)));
	}

	const screenVideoPath = await approveReadableVideoPath(media.screenVideoPath, trustedDirs);
	if (!screenVideoPath) {
		throw new Error("Project references an invalid or unsupported screen video path");
	}

	const webcamVideoPath = media.webcamVideoPath
		? await approveReadableVideoPath(media.webcamVideoPath, trustedDirs)
		: undefined;
	if (media.webcamVideoPath && !webcamVideoPath) {
		throw new Error("Project references an invalid or unsupported webcam video path");
	}

	return webcamVideoPath
		? { screenVideoPath, webcamVideoPath, createdAt: Date.now() }
		: { screenVideoPath, createdAt: Date.now() };
}

type SelectedSource = {
	name: string;
	[key: string]: unknown;
};

let selectedSource: SelectedSource | null = null;
let currentProjectPath: string | null = null;
let currentRecordingSession: RecordingSession | null = null;

function normalizePath(filePath: string) {
	return path.resolve(filePath);
}

function normalizeVideoSourcePath(videoPath?: string | null): string | null {
	if (typeof videoPath !== "string") {
		return null;
	}

	const trimmed = videoPath.trim();
	if (!trimmed) {
		return null;
	}

	if (/^file:\/\//i.test(trimmed)) {
		try {
			return fileURLToPath(trimmed);
		} catch {
			// Fall through and keep best-effort string path below.
		}
	}

	return trimmed;
}

function isTrustedProjectPath(filePath?: string | null) {
	if (!filePath || !currentProjectPath) {
		return false;
	}
	return normalizePath(filePath) === normalizePath(currentProjectPath);
}

function setCurrentRecordingSessionState(session: RecordingSession | null) {
	currentRecordingSession = session;
}

function getSessionManifestPathForVideo(videoPath: string) {
	const parsed = path.parse(videoPath);
	const baseName = parsed.name.endsWith("-webcam")
		? parsed.name.slice(0, -"-webcam".length)
		: parsed.name;
	return path.join(parsed.dir, `${baseName}${RECORDING_SESSION_SUFFIX}`);
}

async function loadRecordedSessionForVideoPath(
	videoPath: string,
): Promise<RecordingSession | null> {
	const normalizedVideoPath = normalizeVideoSourcePath(videoPath);
	if (!normalizedVideoPath) {
		return null;
	}

	try {
		const manifestPath = getSessionManifestPathForVideo(normalizedVideoPath);
		const content = await fs.readFile(manifestPath, "utf-8");
		const session = normalizeRecordingSession(JSON.parse(content));
		if (!session) {
			return null;
		}

		const normalizedSession: RecordingSession = {
			...session,
			screenVideoPath: normalizeVideoSourcePath(session.screenVideoPath) ?? session.screenVideoPath,
			...(session.webcamVideoPath
				? {
						webcamVideoPath:
							normalizeVideoSourcePath(session.webcamVideoPath) ?? session.webcamVideoPath,
					}
				: {}),
		};

		const targetPath = normalizePath(normalizedVideoPath);
		const screenMatches = normalizePath(normalizedSession.screenVideoPath) === targetPath;
		const webcamMatches = normalizedSession.webcamVideoPath
			? normalizePath(normalizedSession.webcamVideoPath) === targetPath
			: false;

		return screenMatches || webcamMatches ? normalizedSession : null;
	} catch {
		return null;
	}
}

async function storeRecordedSessionFiles(payload: StoreRecordedSessionInput) {
	const createdAt =
		typeof payload.createdAt === "number" && Number.isFinite(payload.createdAt)
			? payload.createdAt
			: Date.now();
	const screenVideoPath = resolveRecordingOutputPath(payload.screen.fileName);
	await fs.writeFile(screenVideoPath, Buffer.from(payload.screen.videoData));

	let webcamVideoPath: string | undefined;
	if (payload.webcam) {
		webcamVideoPath = resolveRecordingOutputPath(payload.webcam.fileName);
		await fs.writeFile(webcamVideoPath, Buffer.from(payload.webcam.videoData));
	}

	const session: RecordingSession = webcamVideoPath
		? { screenVideoPath, webcamVideoPath, createdAt }
		: { screenVideoPath, createdAt };
	setCurrentRecordingSessionState(session);
	currentProjectPath = null;

	const telemetryPath = `${screenVideoPath}.cursor.json`;
	if (pendingCursorSamples.length > 0) {
		await fs.writeFile(
			telemetryPath,
			JSON.stringify({ version: CURSOR_TELEMETRY_VERSION, samples: pendingCursorSamples }, null, 2),
			"utf-8",
		);
	}
	pendingCursorSamples = [];

	const sessionManifestPath = path.join(
		RECORDINGS_DIR,
		`${path.parse(payload.screen.fileName).name}${RECORDING_SESSION_SUFFIX}`,
	);
	await fs.writeFile(sessionManifestPath, JSON.stringify(session, null, 2), "utf-8");

	return {
		success: true,
		path: screenVideoPath,
		session,
		message: "Recording session stored successfully",
	};
}

const CURSOR_TELEMETRY_VERSION = 1;
const CURSOR_SAMPLE_INTERVAL_MS = 100;
const MAX_CURSOR_SAMPLES = 60 * 60 * 10; // 1 hour @ 10Hz

interface CursorTelemetryPoint {
	timeMs: number;
	cx: number;
	cy: number;
}

let cursorCaptureInterval: NodeJS.Timeout | null = null;
let cursorCaptureStartTimeMs = 0;
let activeCursorSamples: CursorTelemetryPoint[] = [];
let pendingCursorSamples: CursorTelemetryPoint[] = [];

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

function stopCursorCapture() {
	if (cursorCaptureInterval) {
		clearInterval(cursorCaptureInterval);
		cursorCaptureInterval = null;
	}
}

function sampleCursorPoint() {
	const cursor = screen.getCursorScreenPoint();
	const sourceDisplayId = Number(selectedSource?.display_id);
	const sourceDisplay = Number.isFinite(sourceDisplayId)
		? (screen.getAllDisplays().find((display) => display.id === sourceDisplayId) ?? null)
		: null;
	const display = sourceDisplay ?? screen.getDisplayNearestPoint(cursor);
	const bounds = display.bounds;
	const width = Math.max(1, bounds.width);
	const height = Math.max(1, bounds.height);

	const cx = clamp((cursor.x - bounds.x) / width, 0, 1);
	const cy = clamp((cursor.y - bounds.y) / height, 0, 1);

	activeCursorSamples.push({
		timeMs: Math.max(0, Date.now() - cursorCaptureStartTimeMs),
		cx,
		cy,
	});

	if (activeCursorSamples.length > MAX_CURSOR_SAMPLES) {
		activeCursorSamples.shift();
	}
}

export function registerIpcHandlers(
	createEditorWindow: () => void,
	createSourceSelectorWindow: () => BrowserWindow,
	getMainWindow: () => BrowserWindow | null,
	getSourceSelectorWindow: () => BrowserWindow | null,
	onRecordingStateChange?: (recording: boolean, sourceName: string) => void,
	switchToHud?: () => void,
) {
	ipcMain.handle("switch-to-hud", () => {
		if (switchToHud) switchToHud();
	});
	ipcMain.handle("start-new-recording", async () => {
		try {
			setCurrentRecordingSessionState(null);
			if (switchToHud) {
				switchToHud();
			}
			return { success: true };
		} catch (error) {
			console.error("Failed to start new recording:", error);
			return { success: false, error: String(error) };
		}
	});

	ipcMain.handle("get-sources", async (_, opts) => {
		const sources = await desktopCapturer.getSources(opts);
		return sources.map((source) => ({
			id: source.id,
			name: source.name,
			display_id: source.display_id,
			thumbnail: source.thumbnail ? source.thumbnail.toDataURL() : null,
			appIcon: source.appIcon ? source.appIcon.toDataURL() : null,
		}));
	});

	ipcMain.handle("select-source", (_, source: SelectedSource) => {
		selectedSource = source;
		const sourceSelectorWin = getSourceSelectorWindow();
		if (sourceSelectorWin) {
			sourceSelectorWin.close();
		}
		return selectedSource;
	});

	ipcMain.handle("get-selected-source", () => {
		return selectedSource;
	});

	ipcMain.handle("request-camera-access", async () => {
		if (process.platform !== "darwin") {
			return { success: true, granted: true, status: "granted" };
		}

		try {
			const status = systemPreferences.getMediaAccessStatus("camera");
			if (status === "granted") {
				return { success: true, granted: true, status };
			}

			if (status === "not-determined") {
				const granted = await systemPreferences.askForMediaAccess("camera");
				return {
					success: true,
					granted,
					status: granted ? "granted" : systemPreferences.getMediaAccessStatus("camera"),
				};
			}

			return { success: true, granted: false, status };
		} catch (error) {
			console.error("Failed to request camera access:", error);
			return {
				success: false,
				granted: false,
				status: "unknown",
				error: String(error),
			};
		}
	});

	ipcMain.handle("open-source-selector", () => {
		const sourceSelectorWin = getSourceSelectorWindow();
		if (sourceSelectorWin) {
			sourceSelectorWin.focus();
			return;
		}
		createSourceSelectorWindow();
	});

	ipcMain.handle("switch-to-editor", () => {
		const mainWin = getMainWindow();
		if (mainWin) {
			mainWin.close();
		}
		createEditorWindow();
	});

	ipcMain.handle("store-recorded-session", async (_, payload: StoreRecordedSessionInput) => {
		try {
			return await storeRecordedSessionFiles(payload);
		} catch (error) {
			console.error("Failed to store recording session:", error);
			return {
				success: false,
				message: "Failed to store recording session",
				error: String(error),
			};
		}
	});

	ipcMain.handle("store-recorded-video", async (_, videoData: ArrayBuffer, fileName: string) => {
		try {
			return await storeRecordedSessionFiles({
				screen: { videoData, fileName },
				createdAt: Date.now(),
			});
		} catch (error) {
			console.error("Failed to store recorded video:", error);
			return {
				success: false,
				message: "Failed to store recorded video",
				error: String(error),
			};
		}
	});

	ipcMain.handle("get-recorded-video-path", async () => {
		try {
			if (currentRecordingSession?.screenVideoPath) {
				return { success: true, path: currentRecordingSession.screenVideoPath };
			}

			const files = await fs.readdir(RECORDINGS_DIR);
			const videoFiles = files.filter(
				(file) => file.endsWith(".webm") && !file.endsWith("-webcam.webm"),
			);

			if (videoFiles.length === 0) {
				return { success: false, message: "No recorded video found" };
			}

			const latestVideo = videoFiles.sort().reverse()[0];
			const videoPath = path.join(RECORDINGS_DIR, latestVideo);

			return { success: true, path: videoPath };
		} catch (error) {
			console.error("Failed to get video path:", error);
			return { success: false, message: "Failed to get video path", error: String(error) };
		}
	});

	ipcMain.handle("read-binary-file", async (_, inputPath: string) => {
		try {
			const normalizedPath = normalizeVideoSourcePath(inputPath);
			if (!normalizedPath) {
				return { success: false, message: "Invalid file path" };
			}

			if (!isPathAllowed(normalizedPath)) {
				console.warn(
					"[read-binary-file] Rejected path outside allowed directories:",
					normalizedPath,
				);
				return { success: false, message: "Access denied: path outside allowed directories" };
			}

			const data = await fs.readFile(normalizedPath);
			return {
				success: true,
				data: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
				path: normalizedPath,
			};
		} catch (error) {
			console.error("Failed to read binary file:", error);
			return {
				success: false,
				message: "Failed to read binary file",
				error: String(error),
			};
		}
	});

	ipcMain.handle("set-recording-state", (_, recording: boolean) => {
		if (recording) {
			stopCursorCapture();
			activeCursorSamples = [];
			pendingCursorSamples = [];
			cursorCaptureStartTimeMs = Date.now();
			sampleCursorPoint();
			cursorCaptureInterval = setInterval(sampleCursorPoint, CURSOR_SAMPLE_INTERVAL_MS);
		} else {
			stopCursorCapture();
			pendingCursorSamples = [...activeCursorSamples];
			activeCursorSamples = [];
		}

		const source = selectedSource || { name: "Screen" };
		if (onRecordingStateChange) {
			onRecordingStateChange(recording, source.name);
		}
	});

	ipcMain.handle("get-cursor-telemetry", async (_, videoPath?: string) => {
		const targetVideoPath = normalizeVideoSourcePath(
			videoPath ?? currentRecordingSession?.screenVideoPath,
		);
		if (!targetVideoPath) {
			return { success: true, samples: [] };
		}

		if (!isPathAllowed(targetVideoPath)) {
			console.warn(
				"[get-cursor-telemetry] Rejected path outside allowed directories:",
				targetVideoPath,
			);
			return { success: true, samples: [] };
		}

		const telemetryPath = `${targetVideoPath}.cursor.json`;
		try {
			const content = await fs.readFile(telemetryPath, "utf-8");
			const parsed = JSON.parse(content);
			const rawSamples = Array.isArray(parsed)
				? parsed
				: Array.isArray(parsed?.samples)
					? parsed.samples
					: [];

			const samples: CursorTelemetryPoint[] = rawSamples
				.filter((sample: unknown) => Boolean(sample && typeof sample === "object"))
				.map((sample: unknown) => {
					const point = sample as Partial<CursorTelemetryPoint>;
					return {
						timeMs:
							typeof point.timeMs === "number" && Number.isFinite(point.timeMs)
								? Math.max(0, point.timeMs)
								: 0,
						cx:
							typeof point.cx === "number" && Number.isFinite(point.cx)
								? clamp(point.cx, 0, 1)
								: 0.5,
						cy:
							typeof point.cy === "number" && Number.isFinite(point.cy)
								? clamp(point.cy, 0, 1)
								: 0.5,
					};
				})
				.sort((a: CursorTelemetryPoint, b: CursorTelemetryPoint) => a.timeMs - b.timeMs);

			return { success: true, samples };
		} catch (error) {
			const nodeError = error as NodeJS.ErrnoException;
			if (nodeError.code === "ENOENT") {
				return { success: true, samples: [] };
			}
			console.error("Failed to load cursor telemetry:", error);
			return {
				success: false,
				message: "Failed to load cursor telemetry",
				error: String(error),
				samples: [],
			};
		}
	});

	ipcMain.handle("open-external-url", async (_, url: string) => {
		try {
			await shell.openExternal(url);
			return { success: true };
		} catch (error) {
			console.error("Failed to open URL:", error);
			return { success: false, error: String(error) };
		}
	});

	// Return base path for assets so renderer can resolve file:// paths in production
	ipcMain.handle("get-asset-base-path", () => {
		try {
			if (app.isPackaged) {
				const assetPath = path.join(process.resourcesPath, "assets");
				return pathToFileURL(`${assetPath}${path.sep}`).toString();
			}
			const assetPath = path.join(app.getAppPath(), "public", "assets");
			return pathToFileURL(`${assetPath}${path.sep}`).toString();
		} catch (err) {
			console.error("Failed to resolve asset base path:", err);
			return null;
		}
	});

	ipcMain.handle("save-exported-video", async (_, videoData: ArrayBuffer, fileName: string) => {
		try {
			// Determine file type from extension
			const isGif = fileName.toLowerCase().endsWith(".gif");
			const filters = isGif
				? [{ name: mainT("dialogs", "fileDialogs.gifImage"), extensions: ["gif"] }]
				: [{ name: mainT("dialogs", "fileDialogs.mp4Video"), extensions: ["mp4"] }];

			const result = await dialog.showSaveDialog({
				title: isGif
					? mainT("dialogs", "fileDialogs.saveGif")
					: mainT("dialogs", "fileDialogs.saveVideo"),
				defaultPath: path.join(app.getPath("downloads"), fileName),
				filters,
				properties: ["createDirectory", "showOverwriteConfirmation"],
			});

			if (result.canceled || !result.filePath) {
				return {
					success: false,
					canceled: true,
					message: "Export canceled",
				};
			}

			await fs.writeFile(result.filePath, Buffer.from(videoData));

			return {
				success: true,
				path: result.filePath,
				message: "Video exported successfully",
			};
		} catch (error) {
			console.error("Failed to save exported video:", error);
			return {
				success: false,
				message: "Failed to save exported video",
				error: String(error),
			};
		}
	});

	ipcMain.handle("open-video-file-picker", async () => {
		try {
			const result = await dialog.showOpenDialog({
				title: mainT("dialogs", "fileDialogs.selectVideo"),
				defaultPath: RECORDINGS_DIR,
				filters: [
					{
						name: mainT("dialogs", "fileDialogs.videoFiles"),
						extensions: ["webm", "mp4", "mov", "avi", "mkv"],
					},
					{ name: mainT("dialogs", "fileDialogs.allFiles"), extensions: ["*"] },
				],
				properties: ["openFile"],
			});

			if (result.canceled || result.filePaths.length === 0) {
				return { success: false, canceled: true };
			}

			const approvedPath = await approveReadableVideoPath(result.filePaths[0]);
			if (!approvedPath) {
				return {
					success: false,
					message: "Selected file is not a supported video",
				};
			}
			currentProjectPath = null;
			return {
				success: true,
				path: approvedPath,
			};
		} catch (error) {
			console.error("Failed to open file picker:", error);
			return {
				success: false,
				message: "Failed to open file picker",
				error: String(error),
			};
		}
	});

	ipcMain.handle("reveal-in-folder", async (_, filePath: string) => {
		try {
			// shell.showItemInFolder doesn't return a value, it throws on error
			shell.showItemInFolder(filePath);
			return { success: true };
		} catch (error) {
			console.error(`Error revealing item in folder: ${filePath}`, error);
			// Fallback to open the directory if revealing the item fails
			// This might happen if the file was moved or deleted after export,
			// or if the path is somehow invalid for showItemInFolder
			try {
				const openPathResult = await shell.openPath(path.dirname(filePath));
				if (openPathResult) {
					// openPath returned an error message
					return { success: false, error: openPathResult };
				}
				return { success: true, message: "Could not reveal item, but opened directory." };
			} catch (openError) {
				console.error(`Error opening directory: ${path.dirname(filePath)}`, openError);
				return { success: false, error: String(error) };
			}
		}
	});

	ipcMain.handle(
		"save-project-file",
		async (_, projectData: unknown, suggestedName?: string, existingProjectPath?: string) => {
			try {
				const trustedExistingProjectPath = isTrustedProjectPath(existingProjectPath)
					? existingProjectPath
					: null;

				if (trustedExistingProjectPath) {
					await fs.writeFile(
						trustedExistingProjectPath,
						JSON.stringify(projectData, null, 2),
						"utf-8",
					);
					currentProjectPath = trustedExistingProjectPath;
					return {
						success: true,
						path: trustedExistingProjectPath,
						message: "Project saved successfully",
					};
				}

				const safeName = (suggestedName || `project-${Date.now()}`).replace(/[^a-zA-Z0-9-_]/g, "_");
				const defaultName = safeName.endsWith(`.${PROJECT_FILE_EXTENSION}`)
					? safeName
					: `${safeName}.${PROJECT_FILE_EXTENSION}`;

				const result = await dialog.showSaveDialog({
					title: mainT("dialogs", "fileDialogs.saveProject"),
					defaultPath: path.join(RECORDINGS_DIR, defaultName),
					filters: [
						{
							name: mainT("dialogs", "fileDialogs.openscreenProject"),
							extensions: [PROJECT_FILE_EXTENSION],
						},
						{ name: "JSON", extensions: ["json"] },
					],
					properties: ["createDirectory", "showOverwriteConfirmation"],
				});

				if (result.canceled || !result.filePath) {
					return {
						success: false,
						canceled: true,
						message: "Save project canceled",
					};
				}

				await fs.writeFile(result.filePath, JSON.stringify(projectData, null, 2), "utf-8");
				currentProjectPath = result.filePath;

				return {
					success: true,
					path: result.filePath,
					message: "Project saved successfully",
				};
			} catch (error) {
				console.error("Failed to save project file:", error);
				return {
					success: false,
					message: "Failed to save project file",
					error: String(error),
				};
			}
		},
	);

	ipcMain.handle("load-project-file", async () => {
		try {
			const result = await dialog.showOpenDialog({
				title: mainT("dialogs", "fileDialogs.openProject"),
				defaultPath: RECORDINGS_DIR,
				filters: [
					{
						name: mainT("dialogs", "fileDialogs.openscreenProject"),
						extensions: [PROJECT_FILE_EXTENSION],
					},
					{ name: "JSON", extensions: ["json"] },
					{ name: mainT("dialogs", "fileDialogs.allFiles"), extensions: ["*"] },
				],
				properties: ["openFile"],
			});

			if (result.canceled || result.filePaths.length === 0) {
				return { success: false, canceled: true, message: "Open project canceled" };
			}

			const filePath = result.filePaths[0];
			const content = await fs.readFile(filePath, "utf-8");
			const project = JSON.parse(content);
			const session = await getApprovedProjectSession(project, filePath);
			currentProjectPath = filePath;
			setCurrentRecordingSessionState(session);

			return {
				success: true,
				path: filePath,
				project,
			};
		} catch (error) {
			console.error("Failed to load project file:", error);
			return {
				success: false,
				message: "Failed to load project file",
				error: String(error),
			};
		}
	});

	ipcMain.handle("load-current-project-file", async () => {
		try {
			if (!currentProjectPath) {
				return { success: false, message: "No active project" };
			}

			const content = await fs.readFile(currentProjectPath, "utf-8");
			const project = JSON.parse(content);
			const session = await getApprovedProjectSession(project, currentProjectPath);
			setCurrentRecordingSessionState(session);
			return {
				success: true,
				path: currentProjectPath,
				project,
			};
		} catch (error) {
			console.error("Failed to load current project file:", error);
			return {
				success: false,
				message: "Failed to load current project file",
				error: String(error),
			};
		}
	});
	ipcMain.handle("set-current-recording-session", (_, session: RecordingSession | null) => {
		const normalized = normalizeRecordingSession(session);
		setCurrentRecordingSessionState(normalized);
		currentProjectPath = null;
		return { success: true, session: normalized ?? undefined };
	});

	ipcMain.handle("get-current-recording-session", () => {
		return currentRecordingSession
			? { success: true, session: currentRecordingSession }
			: { success: false };
	});

	ipcMain.handle("set-current-video-path", async (_, path: string) => {
		const normalizedPath = normalizeVideoSourcePath(path);
		if (!normalizedPath || !isPathAllowed(normalizedPath)) {
			return { success: false, message: "Video path has not been approved" };
		}

		const restoredSession = await loadRecordedSessionForVideoPath(normalizedPath);
		if (restoredSession) {
			// Approve all media paths from the restored session so they can be read later
			approveFilePath(restoredSession.screenVideoPath);
			if (restoredSession.webcamVideoPath) {
				approveFilePath(restoredSession.webcamVideoPath);
			}
			setCurrentRecordingSessionState(restoredSession);
		} else {
			setCurrentRecordingSessionState({
				screenVideoPath: normalizedPath,
				createdAt: Date.now(),
			});
		}
		currentProjectPath = null;
		return { success: true };
	});

	ipcMain.handle("get-current-video-path", () => {
		return currentRecordingSession?.screenVideoPath
			? { success: true, path: currentRecordingSession.screenVideoPath }
			: { success: false };
	});

	ipcMain.handle("clear-current-video-path", () => {
		setCurrentRecordingSessionState(null);
		return { success: true };
	});

	ipcMain.handle("get-platform", () => {
		return process.platform;
	});

	ipcMain.handle("get-shortcuts", async () => {
		try {
			const data = await fs.readFile(SHORTCUTS_FILE, "utf-8");
			return JSON.parse(data);
		} catch {
			return null;
		}
	});

	ipcMain.handle("save-shortcuts", async (_, shortcuts: unknown) => {
		try {
			await fs.writeFile(SHORTCUTS_FILE, JSON.stringify(shortcuts, null, 2), "utf-8");
			return { success: true };
		} catch (error) {
			console.error("Failed to save shortcuts:", error);
			return { success: false, error: String(error) };
		}
	});

	// ---- Security Check for Native APIs ----
	function isTrustedSender(event: Electron.IpcMainInvokeEvent): boolean {
		try {
			// In Electron 30+, senderFrame contains the actual frame URL
			const urlStr = event.senderFrame?.url || event.sender.getURL();
			if (!urlStr) return false;
			const url = new URL(urlStr);
			return (
				url.protocol === "file:" || url.hostname === "localhost" || url.hostname === "127.0.0.1"
			);
		} catch {
			return false;
		}
	}

	// ---- FFmpeg Native Export Handlers ----

	const ffmpegSessions = new Map<
		string,
		{
			process: ChildProcess;
			outputPath: string;
			frameCount: number;
			startedAt: number;
			finished: boolean;
			exitPromise: Promise<{ code: number | null; signal: string | null }>;
		}
	>();

	ipcMain.handle("ffmpeg-get-capabilities", async (event) => {
		if (!isTrustedSender(event)) {
			console.error("[Security] Blocked unauthorized FFmpeg capabilities request");
			return { available: false, encoders: [], bestEncoder: null, path: null };
		}
		try {
			return await getFFmpegCapabilities();
		} catch (error) {
			console.error("[FFmpeg] Failed to get capabilities:", error);
			return { available: false, encoders: [], bestEncoder: null, path: null };
		}
	});

	ipcMain.handle(
		"ffmpeg-export-start",
		async (
			event,
			config: {
				width: number;
				height: number;
				frameRate: number;
				encoder: string;
				bitrate: number;
				audioSourcePath?: string;
				hasAudio?: boolean;
			},
		) => {
			// Ensure only trusted local code can spawn arbitrary shell binaries
			if (!isTrustedSender(event)) {
				return { success: false, error: "Unauthorized caller" };
			}

			try {
				const ffmpegPath = getFFmpegPath();
				if (!ffmpegPath) {
					return { success: false, error: "FFmpeg not found" };
				}

				// Create temp output file
				const sessionId = `ffmpeg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
				const tempDir = path.join(app.getPath("temp"), "openscreen-export");
				await fs.mkdir(tempDir, { recursive: true });
				const outputPath = path.join(tempDir, `${sessionId}.mp4`);

				// Resolve audio source path if it's a file:// URL
				let resolvedAudioPath = config.audioSourcePath;
				if (resolvedAudioPath && /^file:\/\//i.test(resolvedAudioPath)) {
					try {
						resolvedAudioPath = fileURLToPath(resolvedAudioPath);
					} catch {
						// Keep original path
					}
				}

				// Verify audio source exists
				let hasAudio = config.hasAudio ?? false;
				if (resolvedAudioPath && hasAudio) {
					try {
						await fs.access(resolvedAudioPath);
					} catch {
						console.warn(
							"[FFmpeg] Audio source not accessible, exporting video only:",
							resolvedAudioPath,
						);
						hasAudio = false;
						resolvedAudioPath = undefined;
					}
				}

				const args = buildFFmpegArgs({
					width: config.width,
					height: config.height,
					frameRate: config.frameRate,
					encoder: config.encoder,
					bitrate: config.bitrate,
					outputPath,
					audioSourcePath: resolvedAudioPath,
					hasAudio,
				});

				console.log(`[FFmpeg] Starting export: ${ffmpegPath} ${args.join(" ")}`);

				const ffmpegProcess = spawn(ffmpegPath, args, {
					stdio: ["pipe", "pipe", "pipe"],
				});

				const exitPromise = new Promise<{ code: number | null; signal: string | null }>(
					(resolve) => {
						ffmpegProcess.on("close", (code, signal) => {
							resolve({ code, signal });
						});
						ffmpegProcess.on("error", (err) => {
							console.error("[FFmpeg] Process error:", err);
							resolve({ code: -1, signal: null });
						});
					},
				);

				let stderrOutput = "";
				ffmpegProcess.stderr?.on("data", (data: Buffer) => {
					const text = data.toString();
					stderrOutput += text;
					// Only log warnings/errors, not progress
					if (text.includes("Error") || text.includes("error") || text.includes("Warning")) {
						console.warn("[FFmpeg stderr]", text.trim());
					}
				});

				ffmpegSessions.set(sessionId, {
					process: ffmpegProcess,
					outputPath,
					frameCount: 0,
					startedAt: Date.now(),
					finished: false,
					exitPromise,
				});

				return { success: true, sessionId };
			} catch (error) {
				console.error("[FFmpeg] Failed to start export:", error);
				return { success: false, error: String(error) };
			}
		},
	);

	ipcMain.handle(
		"ffmpeg-export-frame",
		async (event, sessionId: string, frameData: ArrayBuffer) => {
			if (!isTrustedSender(event)) return { success: false, error: "Unauthorized" };

			try {
				const session = ffmpegSessions.get(sessionId);
				if (!session || session.finished) {
					return { success: false, error: "Invalid or finished session" };
				}

				const stdin = session.process.stdin;
				if (!stdin || stdin.destroyed) {
					return { success: false, error: "FFmpeg stdin not available" };
				}

				const buffer = Buffer.from(frameData);
				const canWrite = stdin.write(buffer);
				session.frameCount++;

				// Return backpressure signal so renderer can throttle
				return { success: true, backpressure: !canWrite, frameCount: session.frameCount };
			} catch (error) {
				return { success: false, error: String(error) };
			}
		},
	);

	ipcMain.handle("ffmpeg-export-finish", async (event, sessionId: string, fileName: string) => {
		if (!isTrustedSender(event)) return { success: false, error: "Unauthorized" };

		try {
			const session = ffmpegSessions.get(sessionId);
			if (!session) {
				return { success: false, error: "Invalid session" };
			}

			session.finished = true;

			// Close stdin to signal end of input
			if (session.process.stdin && !session.process.stdin.destroyed) {
				session.process.stdin.end();
			}

			// Wait for FFmpeg to finish
			const result = await session.exitPromise;
			const elapsed = ((Date.now() - session.startedAt) / 1000).toFixed(1);
			console.log(
				`[FFmpeg] Export finished: ${session.frameCount} frames in ${elapsed}s (exit code: ${result.code})`,
			);

			if (result.code !== 0) {
				ffmpegSessions.delete(sessionId);
				return {
					success: false,
					error: `FFmpeg exited with code ${result.code}`,
				};
			}

			// Verify output file exists
			try {
				await fs.access(session.outputPath);
			} catch {
				ffmpegSessions.delete(sessionId);
				return { success: false, error: "FFmpeg output file not found" };
			}

			// Show save dialog
			const saveResult = await dialog.showSaveDialog({
				title: mainT("dialogs", "fileDialogs.saveVideo"),
				defaultPath: path.join(app.getPath("downloads"), fileName),
				filters: [{ name: mainT("dialogs", "fileDialogs.mp4Video"), extensions: ["mp4"] }],
				properties: ["createDirectory", "showOverwriteConfirmation"],
			});

			if (saveResult.canceled || !saveResult.filePath) {
				// Clean up temp file
				await fs.unlink(session.outputPath).catch(() => {});
				ffmpegSessions.delete(sessionId);
				return { success: false, canceled: true, message: "Export canceled" };
			}

			// Move temp file to user-chosen location
			await fs.copyFile(session.outputPath, saveResult.filePath);
			// Clean up temp file
			await fs.unlink(session.outputPath).catch(() => {});

			ffmpegSessions.delete(sessionId);

			return {
				success: true,
				path: saveResult.filePath,
				message: "Video exported successfully",
			};
		} catch (error) {
			console.error("[FFmpeg] Failed to finish export:", error);
			ffmpegSessions.delete(sessionId);
			return { success: false, error: String(error) };
		}
	});

	ipcMain.handle("ffmpeg-export-cancel", async (event, sessionId: string) => {
		if (!isTrustedSender(event)) return { success: false, error: "Unauthorized" };

		try {
			const session = ffmpegSessions.get(sessionId);
			if (!session) {
				return { success: false, error: "Invalid session" };
			}

			session.finished = true;
			session.process.kill("SIGKILL");
			ffmpegSessions.delete(sessionId);

			// Clean up temp file
			fs.unlink(session.outputPath).catch(() => {});

			console.log(`[FFmpeg] Export canceled: session ${sessionId}`);
			return { success: true };
		} catch (error) {
			return { success: false, error: String(error) };
		}
	});
}
