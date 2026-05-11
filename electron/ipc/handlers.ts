import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { DesktopCapturerSource } from "electron";
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
import type { NativeWindowsRecordingRequest } from "../../src/lib/nativeWindowsRecording";
import {
	type CursorCaptureMode,
	normalizeCursorCaptureMode,
	normalizeProjectMedia,
	normalizeRecordingSession,
	type ProjectMedia,
	type RecordingSession,
	type StoreRecordedSessionInput,
} from "../../src/lib/recordingSession";
import type {
	CursorRecordingData,
	CursorRecordingSample,
	NativeCursorAsset,
	ProjectFileResult,
	ProjectPathResult,
} from "../../src/native/contracts";
import { mainT } from "../i18n";
import { RECORDINGS_DIR } from "../main";
import { createCursorRecordingSession } from "../native-bridge/cursor/recording/factory";
import type { CursorRecordingSession } from "../native-bridge/cursor/recording/session";
import {
	createCursorOverlayWindow,
	destroyCursorOverlayWindow,
	startHudCursorPolling,
	stopHudCursorPolling,
} from "../windows";
import { registerNativeBridgeHandlers } from "./nativeBridge";

const PROJECT_FILE_EXTENSION = "openscreen";
const SHORTCUTS_FILE = path.join(app.getPath("userData"), "shortcuts.json");
const RECORDING_FILE_PREFIX = "recording-";
const RECORDING_SESSION_SUFFIX = ".session.json";
const ALLOWED_IMPORT_VIDEO_EXTENSIONS = new Set([
	".webm",
	".mp4",
	".mov",
	".avi",
	".mkv",
	".m4v",
	".wmv",
	".flv",
	".ts",
]);

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

function resolveApprovedVideoPath(videoPath?: string | null): string | null {
	const normalizedPath = normalizeVideoSourcePath(videoPath);
	if (!normalizedPath) {
		return null;
	}

	if (!hasAllowedImportVideoExtension(normalizedPath) || !isPathAllowed(normalizedPath)) {
		return null;
	}

	return normalizedPath;
}

/**
 * Helper function to build dialog options with a parent window only when it's valid.
 * This prevents passing stale or destroyed BrowserWindow references to dialog calls.
 */
function buildDialogOptions<T extends Electron.OpenDialogOptions | Electron.SaveDialogOptions>(
	baseOptions: T,
	parentWindow: BrowserWindow | null,
): T & { parent?: BrowserWindow } {
	const mainWindow = parentWindow;
	if (mainWindow && !mainWindow.isDestroyed()) {
		return { ...baseOptions, parent: mainWindow };
	}
	return baseOptions;
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
	id?: string;
	display_id?: string;
	[key: string]: unknown;
};

let selectedSource: SelectedSource | null = null;
let selectedDesktopSource: DesktopCapturerSource | null = null;
let lastEnumeratedSources = new Map<string, DesktopCapturerSource>();
let currentProjectPath: string | null = null;
let currentRecordingSession: RecordingSession | null = null;

/**
 * Returns the cached DesktopCapturerSource set when the user picked a source.
 * Used by setDisplayMediaRequestHandler in main.ts for cursor-free capture.
 */
export function getSelectedDesktopSource(): DesktopCapturerSource | null {
	return selectedDesktopSource;
}
let currentVideoPath: string | null = null;

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

const CURSOR_TELEMETRY_VERSION = 2;
const CURSOR_SAMPLE_INTERVAL_MS = 33;
const MAX_CURSOR_SAMPLES = 60 * 60 * 30; // 1 hour @ 30Hz

let cursorRecordingSession: CursorRecordingSession | null = null;
let pendingCursorRecordingData: CursorRecordingData | null = null;
let nativeWindowsCaptureProcess: ChildProcessWithoutNullStreams | null = null;
let nativeWindowsCaptureOutput = "";
let nativeWindowsCaptureTargetPath: string | null = null;
let nativeWindowsCaptureWebcamTargetPath: string | null = null;
let nativeWindowsCaptureRecordingId: number | null = null;
let nativeWindowsCursorOffsetMs = 0;
let nativeWindowsCursorCaptureMode: CursorCaptureMode = "editable-overlay";
const NATIVE_WINDOWS_CAPTURE_STOP_TIMEOUT_MS = 15_000;

function normalizeCursorSample(sample: unknown): CursorRecordingSample | null {
	if (!sample || typeof sample !== "object") {
		return null;
	}

	const point = sample as Partial<CursorRecordingSample>;
	const interactionType =
		point.interactionType === "click" ||
		point.interactionType === "mouseup" ||
		point.interactionType === "move"
			? point.interactionType
			: "move";
	return {
		timeMs:
			typeof point.timeMs === "number" && Number.isFinite(point.timeMs)
				? Math.max(0, point.timeMs)
				: 0,
		cx: typeof point.cx === "number" && Number.isFinite(point.cx) ? point.cx : 0.5,
		cy: typeof point.cy === "number" && Number.isFinite(point.cy) ? point.cy : 0.5,
		assetId: typeof point.assetId === "string" ? point.assetId : null,
		visible: typeof point.visible === "boolean" ? point.visible : true,
		cursorType: typeof point.cursorType === "string" ? point.cursorType : null,
		interactionType,
	};
}

function normalizeCursorAsset(asset: unknown): NativeCursorAsset | null {
	if (!asset || typeof asset !== "object") {
		return null;
	}

	const candidate = asset as Partial<NativeCursorAsset>;
	if (typeof candidate.id !== "string" || typeof candidate.imageDataUrl !== "string") {
		return null;
	}

	return {
		id: candidate.id,
		platform:
			candidate.platform === "win32" ? "win32" : process.platform === "darwin" ? "darwin" : "linux",
		imageDataUrl: candidate.imageDataUrl,
		width:
			typeof candidate.width === "number" && Number.isFinite(candidate.width)
				? Math.max(1, Math.round(candidate.width))
				: 1,
		height:
			typeof candidate.height === "number" && Number.isFinite(candidate.height)
				? Math.max(1, Math.round(candidate.height))
				: 1,
		hotspotX:
			typeof candidate.hotspotX === "number" && Number.isFinite(candidate.hotspotX)
				? Math.max(0, Math.round(candidate.hotspotX))
				: 0,
		hotspotY:
			typeof candidate.hotspotY === "number" && Number.isFinite(candidate.hotspotY)
				? Math.max(0, Math.round(candidate.hotspotY))
				: 0,
		scaleFactor:
			typeof candidate.scaleFactor === "number" && Number.isFinite(candidate.scaleFactor)
				? Math.max(0.1, candidate.scaleFactor)
				: undefined,
		cursorType: typeof candidate.cursorType === "string" ? candidate.cursorType : null,
	};
}

async function readCursorRecordingFile(targetVideoPath: string): Promise<CursorRecordingData> {
	const telemetryPath = `${targetVideoPath}.cursor.json`;
	try {
		const content = await fs.readFile(telemetryPath, "utf-8");
		const parsed = JSON.parse(content);
		const rawSamples = Array.isArray(parsed)
			? parsed
			: Array.isArray(parsed?.samples)
				? parsed.samples
				: [];
		const rawAssets = Array.isArray(parsed?.assets) ? parsed.assets : [];

		const samples = rawSamples
			.map((sample: unknown) => normalizeCursorSample(sample))
			.filter((sample: CursorRecordingSample | null): sample is CursorRecordingSample =>
				Boolean(sample),
			)
			.sort((a: CursorRecordingSample, b: CursorRecordingSample) => a.timeMs - b.timeMs);

		const assets = rawAssets
			.map((asset: unknown) => normalizeCursorAsset(asset))
			.filter((asset: NativeCursorAsset | null): asset is NativeCursorAsset => Boolean(asset));

		return {
			version:
				typeof parsed?.version === "number" && Number.isFinite(parsed.version) ? parsed.version : 1,
			provider: parsed?.provider === "native" ? "native" : "none",
			samples,
			assets,
		};
	} catch (error) {
		const nodeError = error as NodeJS.ErrnoException;
		if (nodeError.code === "ENOENT") {
			return {
				version: CURSOR_TELEMETRY_VERSION,
				provider: "none",
				samples: [],
				assets: [],
			};
		}

		console.error("Failed to load cursor telemetry:", error);
		throw error;
	}
}

async function readCursorTelemetryFile(targetVideoPath: string) {
	try {
		const recordingData = await readCursorRecordingFile(targetVideoPath);
		return {
			success: true,
			samples: recordingData.samples.map((sample) => ({
				timeMs: sample.timeMs,
				cx: sample.cx,
				cy: sample.cy,
			})),
		};
	} catch (error) {
		console.error("Failed to load cursor telemetry:", error);
		return {
			success: false,
			message: "Failed to load cursor telemetry",
			error: String(error),
			samples: [],
		};
	}
}

function resolveAssetBasePath() {
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
}

function getSelectedSourceBounds() {
	const cursor = screen.getCursorScreenPoint();
	const sourceDisplayId = Number(selectedSource?.display_id);
	const sourceDisplay = Number.isFinite(sourceDisplayId)
		? (screen.getAllDisplays().find((display) => display.id === sourceDisplayId) ?? null)
		: null;
	return (sourceDisplay ?? screen.getDisplayNearestPoint(cursor)).bounds;
}

function getSelectedSourceId() {
	return typeof selectedSource?.id === "string" ? selectedSource.id : null;
}

function getSelectedDisplay() {
	const sourceDisplayId = Number(selectedSource?.display_id);
	if (!Number.isFinite(sourceDisplayId)) {
		return null;
	}

	return screen.getAllDisplays().find((display) => display.id === sourceDisplayId) ?? null;
}

function resolveUnpackedAppPath(...segments: string[]) {
	const resolved = path.join(app.getAppPath(), ...segments);
	if (app.isPackaged) {
		return resolved.replace(/\.asar([/\\])/, ".asar.unpacked$1");
	}

	return resolved;
}

function resolvePackagedResourcePath(...segments: string[]) {
	if (!app.isPackaged) {
		return null;
	}

	return path.join(process.resourcesPath, ...segments);
}

// ── System-cursor hide / restore (Windows only) ──────────────────────────────
// When recording in editable-overlay mode via getUserMedia, Chromium bakes the
// OS cursor into every captured frame regardless of the `cursor` constraint.
// We work around this by replacing every system cursor with a 32×32 fully
// transparent cursor bitmap so the OS cursor is invisible (and therefore absent
// from the footage), while a virtual SVG cursor rendered in the excluded HUD
// gives the user visual feedback.  On recording stop we restore all cursors
// from the registry with SPI_SETCURSORS (87).

function runPowerShellOneShot(script: string): Promise<void> {
	return new Promise((resolve) => {
		if (process.platform !== "win32") {
			resolve();
			return;
		}
		const proc = spawn(
			"powershell.exe",
			[
				"-NoLogo",
				"-NoProfile",
				"-NonInteractive",
				"-ExecutionPolicy",
				"Bypass",
				"-Command",
				script,
			],
			{ stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
		);
		const timer = setTimeout(() => {
			try {
				proc.kill();
			} catch {
				// best-effort process kill — ignore ESRCH / already-dead errors
			}
			resolve();
		}, 5_000);
		proc.once("exit", () => {
			clearTimeout(timer);
			resolve();
		});
		proc.once("error", (err) => {
			clearTimeout(timer);
			console.error("[cursor-hide] PowerShell error:", err.message);
			resolve(); // best-effort — never block recording on this
		});
	});
}

const HIDE_CURSOR_SCRIPT = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class OpenScreenCursorHider {
    [DllImport("user32.dll")] public static extern bool SetSystemCursor(IntPtr hcur, uint id);
    [DllImport("user32.dll")] public static extern IntPtr CreateCursor(IntPtr hInst, int xHotspot, int yHotspot, int nWidth, int nHeight, byte[] pvANDPlane, byte[] pvXORPlane);
    public static readonly uint[] Ids = new uint[]{32512,32513,32514,32515,32516,32640,32641,32642,32643,32644,32645,32646,32648,32649,32650,32651};
    public static void HideAll() {
        byte[] andMask = new byte[128]; byte[] xorMask = new byte[128];
        for (int i = 0; i < 128; i++) { andMask[i] = 0xFF; xorMask[i] = 0x00; }
        foreach (uint id in Ids) {
            IntPtr h = CreateCursor(IntPtr.Zero, 0, 0, 32, 32, andMask, xorMask);
            if (h != IntPtr.Zero) SetSystemCursor(h, id);
        }
    }
}
"@
[OpenScreenCursorHider]::HideAll()
`;

const RESTORE_CURSOR_SCRIPT = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class OpenScreenCursorRestorer {
    [DllImport("user32.dll")] public static extern bool SystemParametersInfo(uint uiAction, uint uiParam, IntPtr pvParam, uint fWinIni);
}
"@
[OpenScreenCursorRestorer]::SystemParametersInfo(87, 0, [IntPtr]::Zero, 0)
`;

async function hideSystemCursor(): Promise<void> {
	if (process.platform !== "win32") return;
	console.info("[cursor-hide] hiding OS cursor for editable-overlay recording");
	await runPowerShellOneShot(HIDE_CURSOR_SCRIPT);
}

async function restoreSystemCursor(): Promise<void> {
	if (process.platform !== "win32") return;
	console.info("[cursor-hide] restoring OS cursor");
	await runPowerShellOneShot(RESTORE_CURSOR_SCRIPT);
}

function getNativeWindowsCaptureHelperCandidates() {
	const envPath = process.env.OPENSCREEN_WGC_CAPTURE_EXE?.trim();
	const archTag = process.arch === "arm64" ? "win32-arm64" : "win32-x64";
	return [
		envPath,
		resolveUnpackedAppPath(
			"electron",
			"native",
			"wgc-capture",
			"build",
			"Release",
			"wgc-capture.exe",
		),
		resolveUnpackedAppPath("electron", "native", "wgc-capture", "build", "wgc-capture.exe"),
		resolveUnpackedAppPath("electron", "native", "bin", archTag, "wgc-capture.exe"),
		resolvePackagedResourcePath("electron", "native", "bin", archTag, "wgc-capture.exe"),
	].filter((candidate): candidate is string => Boolean(candidate));
}

async function findNativeWindowsCaptureHelperPath() {
	if (process.platform !== "win32") {
		return null;
	}

	for (const candidate of getNativeWindowsCaptureHelperCandidates()) {
		try {
			await fs.access(candidate, fsConstants.X_OK);
			return candidate;
		} catch {
			// Try the next configured helper location.
		}
	}

	return null;
}

function isWindowsGraphicsCaptureOsSupported() {
	if (process.platform !== "win32") {
		return false;
	}

	const [, , build] = process.getSystemVersion().split(".").map(Number);
	return Number.isFinite(build) && build >= 19041;
}

function normalizeNativeDeviceName(value: string) {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}

function scoreNativeDeviceName(candidateName: string, candidateId: string, requestedName?: string) {
	const candidate = normalizeNativeDeviceName(candidateName);
	const id = normalizeNativeDeviceName(candidateId);
	const requested = normalizeNativeDeviceName(requestedName ?? "");
	if (!requested) {
		return 0;
	}
	if (candidate === requested) {
		return 1000;
	}
	if (candidate.includes(requested) || requested.includes(candidate)) {
		return 900;
	}
	if (id.includes(requested) || requested.includes(id)) {
		return 800;
	}

	return requested
		.split(/\s+/)
		.filter((word) => word.length > 1 && !["camera", "webcam", "video", "input"].includes(word))
		.reduce((score, word) => {
			if (candidate.includes(word)) return score + 100;
			if (id.includes(word)) return score + 50;
			return score;
		}, 0);
}

function queryDirectShowVideoInputRegistry() {
	return new Promise<string>((resolve) => {
		const proc = spawn(
			"reg.exe",
			["query", "HKCR\\CLSID\\{860BB310-5D01-11D0-BD3B-00A0C911CE86}\\Instance", "/s"],
			{ windowsHide: true },
		);
		let stdout = "";
		proc.stdout.on("data", (chunk: Buffer) => {
			stdout += chunk.toString("utf16le").includes("\u0000")
				? chunk.toString("utf16le")
				: chunk.toString();
		});
		proc.on("close", () => resolve(stdout));
		proc.on("error", () => resolve(""));
	});
}

async function resolveDirectShowWebcamClsid(deviceName?: string) {
	if (process.platform !== "win32" || !deviceName?.trim()) {
		return null;
	}

	const output = await queryDirectShowVideoInputRegistry();
	let current: { friendlyName?: string; clsid?: string } = {};
	const entries: Array<{ friendlyName?: string; clsid?: string }> = [];
	for (const rawLine of output.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line) continue;
		if (/^HKEY_/i.test(line)) {
			if (current.friendlyName || current.clsid) entries.push(current);
			current = {};
			continue;
		}
		const match = line.match(/^(\S+)\s+REG_SZ\s+(.+)$/);
		if (!match) continue;
		if (match[1] === "FriendlyName") current.friendlyName = match[2].trim();
		if (match[1] === "CLSID") current.clsid = match[2].trim();
	}
	if (current.friendlyName || current.clsid) entries.push(current);

	let best: { clsid: string; friendlyName?: string; score: number } | null = null;
	for (const entry of entries) {
		if (!entry.clsid) continue;
		const score = scoreNativeDeviceName(entry.friendlyName ?? "", entry.clsid, deviceName);
		if (!best || score > best.score) {
			best = { clsid: entry.clsid, friendlyName: entry.friendlyName, score };
		}
	}

	if (!best || best.score <= 0) {
		return null;
	}

	console.info("[native-wgc] resolved DirectShow webcam filter", {
		requestedName: deviceName,
		filterName: best.friendlyName,
		clsid: best.clsid,
		score: best.score,
	});
	return best.clsid;
}

async function startCursorRecording(recordingId?: number) {
	if (cursorRecordingSession) {
		pendingCursorRecordingData = await cursorRecordingSession.stop();
		cursorRecordingSession = null;
	}

	pendingCursorRecordingData = null;
	cursorRecordingSession = createCursorRecordingSession({
		getDisplayBounds: getSelectedSourceBounds,
		maxSamples: MAX_CURSOR_SAMPLES,
		platform: process.platform,
		sampleIntervalMs: CURSOR_SAMPLE_INTERVAL_MS,
		sourceId: getSelectedSourceId(),
		startTimeMs:
			typeof recordingId === "number" && Number.isFinite(recordingId) ? recordingId : undefined,
	});

	try {
		await cursorRecordingSession.start();
	} catch (error) {
		console.error("Failed to start cursor recording session:", error);
		cursorRecordingSession = null;
	}
}

async function stopCursorRecording() {
	if (!cursorRecordingSession) {
		return;
	}

	try {
		pendingCursorRecordingData = await cursorRecordingSession.stop();
	} catch (error) {
		console.error("Failed to stop cursor recording session:", error);
		pendingCursorRecordingData = null;
	} finally {
		cursorRecordingSession = null;
	}
}

async function writePendingCursorTelemetry(videoPath: string) {
	const telemetryPath = `${videoPath}.cursor.json`;
	if (pendingCursorRecordingData && pendingCursorRecordingData.samples.length > 0) {
		await fs.writeFile(telemetryPath, JSON.stringify(pendingCursorRecordingData, null, 2), "utf-8");
	}
	pendingCursorRecordingData = null;
}

function shiftPendingCursorTelemetry(offsetMs: number) {
	if (!pendingCursorRecordingData || !Number.isFinite(offsetMs) || offsetMs <= 0) {
		return;
	}

	pendingCursorRecordingData = {
		...pendingCursorRecordingData,
		samples: pendingCursorRecordingData.samples
			.map((sample) => ({
				...sample,
				timeMs: Math.max(0, sample.timeMs - offsetMs),
			}))
			.sort((a, b) => a.timeMs - b.timeMs),
	};
}

function waitForNativeWindowsCaptureStart(proc: ChildProcessWithoutNullStreams) {
	return new Promise<void>((resolve, reject) => {
		const timer = setTimeout(() => {
			cleanup();
			reject(new Error("Timed out waiting for native Windows capture to start"));
		}, 12000);

		const onOutput = (chunk: Buffer) => {
			nativeWindowsCaptureOutput += chunk.toString();
			if (nativeWindowsCaptureOutput.includes("Recording started")) {
				cleanup();
				resolve();
			}
		};
		const onError = (error: Error) => {
			cleanup();
			reject(error);
		};
		const onExit = (code: number | null) => {
			cleanup();
			reject(
				new Error(
					nativeWindowsCaptureOutput.trim() ||
						`Native Windows capture exited before recording started (code=${code ?? "unknown"})`,
				),
			);
		};
		const cleanup = () => {
			clearTimeout(timer);
			proc.stdout.off("data", onOutput);
			proc.stderr.off("data", onOutput);
			proc.off("error", onError);
			proc.off("exit", onExit);
		};

		proc.stdout.on("data", onOutput);
		proc.stderr.on("data", onOutput);
		proc.once("error", onError);
		proc.once("exit", onExit);
	});
}

function waitForNativeWindowsCaptureStop(proc: ChildProcessWithoutNullStreams) {
	return new Promise<string>((resolve, reject) => {
		const timer = setTimeout(() => {
			cleanup();
			if (!proc.killed) {
				proc.kill();
			}
			reject(
				new Error(
					`Timed out waiting for native Windows capture to stop. Output path: ${
						nativeWindowsCaptureTargetPath ?? "unknown"
					}. Output: ${nativeWindowsCaptureOutput.trim()}`,
				),
			);
		}, NATIVE_WINDOWS_CAPTURE_STOP_TIMEOUT_MS);
		const onOutput = (chunk: Buffer) => {
			nativeWindowsCaptureOutput += chunk.toString();
		};
		const onClose = (code: number | null) => {
			cleanup();
			const match = nativeWindowsCaptureOutput.match(/Recording stopped\. Output path: (.+)/);
			if (match?.[1]) {
				resolve(match[1].trim());
				return;
			}
			if (code === 0 && nativeWindowsCaptureTargetPath) {
				resolve(nativeWindowsCaptureTargetPath);
				return;
			}
			reject(
				new Error(
					nativeWindowsCaptureOutput.trim() ||
						`Native Windows capture exited with code=${code ?? "unknown"}`,
				),
			);
		};
		const onError = (error: Error) => {
			cleanup();
			reject(error);
		};
		const cleanup = () => {
			clearTimeout(timer);
			proc.stdout.off("data", onOutput);
			proc.stderr.off("data", onOutput);
			proc.off("close", onClose);
			proc.off("error", onError);
		};

		proc.stdout.on("data", onOutput);
		proc.stderr.on("data", onOutput);
		proc.once("close", onClose);
		proc.once("error", onError);
	});
}

function readNativeWindowsWebcamFormat(output: string) {
	const lines = output.split(/\r?\n/).filter((line) => line.includes('"event":"webcam-format"'));
	const lastLine = lines.at(-1);
	if (!lastLine) {
		return null;
	}

	try {
		return JSON.parse(lastLine) as {
			width?: number;
			height?: number;
			fps?: number;
			deviceName?: string;
		};
	} catch {
		return null;
	}
}

function setCurrentRecordingSessionState(session: RecordingSession | null) {
	currentRecordingSession = session;
	currentVideoPath = session?.screenVideoPath ?? null;
}

function getSessionManifestPathForVideo(videoPath: string) {
	const parsedPath = path.parse(videoPath);
	const baseName = parsedPath.name.endsWith("-webcam")
		? parsedPath.name.slice(0, -"-webcam".length)
		: parsedPath.name;
	return path.join(parsedPath.dir, `${baseName}${RECORDING_SESSION_SUFFIX}`);
}

async function loadRecordedSessionForVideoPath(
	videoPath: string,
): Promise<RecordingSession | null> {
	try {
		const manifestPath = getSessionManifestPathForVideo(videoPath);
		if (!isPathAllowed(manifestPath)) {
			const parsedVideoPath = path.parse(videoPath);
			if (!isPathWithinDir(path.resolve(manifestPath), parsedVideoPath.dir)) {
				return null;
			}
		}

		const content = await fs.readFile(manifestPath, "utf-8");
		const session = normalizeRecordingSession(JSON.parse(content));
		if (!session) {
			return null;
		}

		const normalizedVideoPath = normalizePath(videoPath);
		const matchesScreen = normalizePath(session.screenVideoPath) === normalizedVideoPath;
		const matchesWebcam =
			typeof session.webcamVideoPath === "string" &&
			normalizePath(session.webcamVideoPath) === normalizedVideoPath;
		if (!matchesScreen && !matchesWebcam) {
			return null;
		}

		if (!isPathAllowed(session.screenVideoPath)) {
			const approvedScreen = await approveReadableVideoPath(session.screenVideoPath, [
				path.dirname(manifestPath),
				RECORDINGS_DIR,
			]);
			if (!approvedScreen) {
				return null;
			}
			session.screenVideoPath = approvedScreen;
		}

		if (session.webcamVideoPath && !isPathAllowed(session.webcamVideoPath)) {
			const approvedWebcam = await approveReadableVideoPath(session.webcamVideoPath, [
				path.dirname(manifestPath),
				RECORDINGS_DIR,
			]);
			if (!approvedWebcam) {
				session.webcamVideoPath = undefined;
			} else {
				session.webcamVideoPath = approvedWebcam;
			}
		}

		approveFilePath(session.screenVideoPath);
		if (session.webcamVideoPath) {
			approveFilePath(session.webcamVideoPath);
		}
		return session;
	} catch (error) {
		const nodeError = error as NodeJS.ErrnoException;
		if (nodeError.code !== "ENOENT") {
			console.error("Failed to restore recording session manifest:", error);
		}
		return null;
	}
}

export function registerIpcHandlers(
	createEditorWindow: () => void,
	createSourceSelectorWindow: () => BrowserWindow,
	createCountdownOverlayWindow: () => BrowserWindow,
	getMainWindow: () => BrowserWindow | null,
	getSourceSelectorWindow: () => BrowserWindow | null,
	getCountdownOverlayWindow?: () => BrowserWindow | null,
	onRecordingStateChange?: (recording: boolean, sourceName: string) => void,
	_switchToHud?: () => void,
) {
	ipcMain.handle("get-sources", async (_, opts) => {
		const sources = await desktopCapturer.getSources(opts);
		lastEnumeratedSources = new Map(sources.map((source) => [source.id, source]));
		return sources.map((source) => ({
			id: source.id,
			name: source.name,
			display_id: source.display_id,
			thumbnail: source.thumbnail ? source.thumbnail.toDataURL() : null,
			appIcon: source.appIcon ? source.appIcon.toDataURL() : null,
		}));
	});

	ipcMain.handle("select-source", async (_, source: SelectedSource) => {
		selectedSource = source;
		// Reuse the exact source object returned during enumeration to avoid
		// Windows window-source id mismatches across separate getSources() calls.
		selectedDesktopSource =
			typeof source.id === "string" ? (lastEnumeratedSources.get(source.id) ?? null) : null;

		if (!selectedDesktopSource && typeof source.id === "string") {
			try {
				const sources = await desktopCapturer.getSources({
					types: ["screen", "window"],
					thumbnailSize: { width: 0, height: 0 },
					fetchWindowIcons: true,
				});
				lastEnumeratedSources = new Map(sources.map((candidate) => [candidate.id, candidate]));
				selectedDesktopSource = lastEnumeratedSources.get(source.id) ?? null;
			} catch {
				selectedDesktopSource = null;
			}
		}
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

	ipcMain.handle("request-screen-access", async () => {
		if (process.platform !== "darwin") {
			return { success: true, granted: true, status: "granted" };
		}

		try {
			const status = systemPreferences.getMediaAccessStatus("screen");
			if (status === "granted") {
				return { success: true, granted: true, status };
			}

			// Screen recording has no askForMediaAccess equivalent — the TCC prompt
			// is triggered by desktopCapturer.getSources(). Fire it and return so
			// the renderer can re-check status after the user responds.
			if (status === "not-determined") {
				desktopCapturer.getSources({ types: ["screen"] }).catch(() => {
					// Permission probing failure is reported by the explicit status check below.
				});
				return { success: true, granted: false, status: "not-determined" };
			}

			return { success: true, granted: false, status };
		} catch (error) {
			console.error("Failed to request screen access:", error);
			return { success: false, granted: false, status: "unknown", error: String(error) };
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
		// createEditorWindow is createEditorWindowWrapper — it already closes
		// the current mainWindow (the HUD) before opening the editor. Closing
		// it here too causes a double-close which leaves ghost transparent
		// windows and makes the HUD shadow compound on each cycle.
		createEditorWindow();
	});

	ipcMain.handle("start-new-recording", () => {
		if (_switchToHud) {
			_switchToHud();
		}
		return { success: true };
	});

	ipcMain.handle("countdown-overlay-show", async (_, value: number, runId: number) => {
		const overlayWindow = getCountdownOverlayWindow?.() ?? createCountdownOverlayWindow();
		if (overlayWindow.isDestroyed()) {
			return;
		}

		// Wait for the first frame to be painted before showing the window.
		// Showing before ready-to-show produces a black rectangle flash because
		// Chromium hasn't rendered any pixels yet.
		if (overlayWindow.webContents.isLoading()) {
			await new Promise<void>((resolve) => {
				overlayWindow.once("ready-to-show", resolve);
			});
		}

		if (!overlayWindow.isVisible()) {
			overlayWindow.showInactive();
		}

		overlayWindow.webContents.send("countdown-overlay-value", value, runId);
	});

	ipcMain.handle("countdown-overlay-set-value", (_, value: number, runId: number) => {
		const overlayWindow = getCountdownOverlayWindow?.();
		if (!overlayWindow || overlayWindow.isDestroyed()) {
			return;
		}

		overlayWindow.webContents.send("countdown-overlay-value", value, runId);
	});

	ipcMain.handle("countdown-overlay-hide", (_, runId: number) => {
		const overlayWindow = getCountdownOverlayWindow?.();
		if (!overlayWindow || overlayWindow.isDestroyed()) {
			return;
		}

		overlayWindow.webContents.send("countdown-overlay-value", null, runId);
		overlayWindow.hide();
	});

	ipcMain.handle("is-native-windows-capture-available", async () => {
		if (!isWindowsGraphicsCaptureOsSupported()) {
			return { success: true, available: false, reason: "unsupported-os" };
		}

		const helperPath = await findNativeWindowsCaptureHelperPath();
		return helperPath
			? { success: true, available: true, helperPath }
			: { success: true, available: false, reason: "missing-helper" };
	});

	ipcMain.handle(
		"start-native-windows-recording",
		async (_, request: NativeWindowsRecordingRequest) => {
			try {
				if (!isWindowsGraphicsCaptureOsSupported()) {
					return {
						success: false,
						error: "Windows Graphics Capture requires Windows 10 build 19041 or newer.",
					};
				}
				if (nativeWindowsCaptureProcess) {
					return { success: false, error: "Native Windows capture is already running." };
				}

				const helperPath = await findNativeWindowsCaptureHelperPath();
				if (!helperPath) {
					return { success: false, error: "Native Windows capture helper is not available." };
				}

				if (!request?.source?.sourceId) {
					return {
						success: false,
						error: "Native Windows capture request is missing a source.",
					};
				}

				const recordingId =
					typeof request.recordingId === "number" && Number.isFinite(request.recordingId)
						? request.recordingId
						: Date.now();
				const outputPath = path.join(RECORDINGS_DIR, `${RECORDING_FILE_PREFIX}${recordingId}.mp4`);
				const webcamOutputPath = path.join(
					RECORDINGS_DIR,
					`${RECORDING_FILE_PREFIX}${recordingId}-webcam.mp4`,
				);
				const sourceDisplay =
					request.source.type === "display" && typeof request.source.displayId === "number"
						? (screen.getAllDisplays().find((display) => display.id === request.source.displayId) ??
							null)
						: getSelectedDisplay();
				const bounds = sourceDisplay?.bounds ?? getSelectedSourceBounds();
				const displayId =
					typeof request.source.displayId === "number" && Number.isFinite(request.source.displayId)
						? request.source.displayId
						: Number(selectedSource?.display_id);
				const webcamDirectShowClsid = request.webcam.enabled
					? await resolveDirectShowWebcamClsid(request.webcam.deviceName)
					: null;
				const cursorCaptureMode =
					normalizeCursorCaptureMode(request.cursor?.mode) ?? "editable-overlay";
				const config = {
					schemaVersion: 2,
					recordingId,
					outputPath,
					sourceType: request.source.type,
					sourceId: request.source.sourceId,
					displayId: Number.isFinite(displayId) ? displayId : 0,
					windowHandle: request.source.windowHandle ?? null,
					fps: request.video.fps,
					videoWidth: request.video.width,
					videoHeight: request.video.height,
					displayX: bounds.x,
					displayY: bounds.y,
					displayW: bounds.width,
					displayH: bounds.height,
					hasDisplayBounds: true,
					captureSystemAudio: request.audio.system.enabled,
					captureMic: request.audio.microphone.enabled,
					microphoneDeviceId: request.audio.microphone.deviceId ?? null,
					microphoneDeviceName: request.audio.microphone.deviceName ?? null,
					microphoneGain: request.audio.microphone.gain,
					webcamEnabled: request.webcam.enabled,
					webcamDeviceId: request.webcam.deviceId ?? null,
					webcamDeviceName: request.webcam.deviceName ?? null,
					webcamDirectShowClsid,
					webcamWidth: request.webcam.width,
					webcamHeight: request.webcam.height,
					webcamFps: request.webcam.fps,
					captureCursor: cursorCaptureMode === "system",
					cursorCaptureMode,
					outputs: {
						screenPath: outputPath,
						webcamPath: webcamOutputPath,
					},
					source: {
						type: request.source.type,
						sourceId: request.source.sourceId,
						displayId: Number.isFinite(displayId) ? displayId : null,
						windowHandle: request.source.windowHandle ?? null,
						bounds,
					},
					video: request.video,
					audio: request.audio,
					webcam: request.webcam,
					cursor: {
						mode: cursorCaptureMode,
					},
				};

				console.info("[native-wgc] starting Windows capture", {
					helperPath,
					source: request.source,
					audio: request.audio,
					webcam: request.webcam,
					cursor: { mode: cursorCaptureMode },
					bounds,
					sourceId: selectedSource?.id ?? null,
					usedDisplayMatch: Boolean(sourceDisplay),
					outputPath,
				});

				await fs.mkdir(RECORDINGS_DIR, { recursive: true });
				nativeWindowsCaptureOutput = "";
				nativeWindowsCaptureTargetPath = outputPath;
				nativeWindowsCaptureWebcamTargetPath = request.webcam.enabled ? webcamOutputPath : null;
				nativeWindowsCaptureRecordingId = recordingId;
				nativeWindowsCursorOffsetMs = 0;
				nativeWindowsCursorCaptureMode = cursorCaptureMode;

				const cursorStartTimeMs = Date.now();
				if (cursorCaptureMode === "editable-overlay") {
					await startCursorRecording(cursorStartTimeMs);
					console.info("[native-wgc] cursor sampler ready", {
						cursorStartTimeMs,
						warmupMs: Date.now() - cursorStartTimeMs,
					});
				} else {
					pendingCursorRecordingData = null;
				}

				const proc = spawn(helperPath, [JSON.stringify(config)], {
					cwd: RECORDINGS_DIR,
					stdio: ["pipe", "pipe", "pipe"],
					windowsHide: true,
				});
				nativeWindowsCaptureProcess = proc;

				await waitForNativeWindowsCaptureStart(proc);
				const captureStartedAtMs = Date.now();
				nativeWindowsCursorOffsetMs =
					cursorCaptureMode === "editable-overlay"
						? Math.max(0, captureStartedAtMs - cursorStartTimeMs)
						: 0;
				const webcamFormat = readNativeWindowsWebcamFormat(nativeWindowsCaptureOutput);
				console.info("[native-wgc] capture started", {
					captureStartedAtMs,
					cursorOffsetMs: nativeWindowsCursorOffsetMs,
					webcamFormat,
				});

				const source = selectedSource || { name: "Screen" };
				if (onRecordingStateChange) {
					onRecordingStateChange(true, source.name);
				}

				return {
					success: true,
					recordingId,
					path: outputPath,
					helperPath,
				};
			} catch (error) {
				console.error("Failed to start native Windows recording:", error);
				nativeWindowsCaptureProcess?.kill();
				nativeWindowsCaptureProcess = null;
				nativeWindowsCaptureTargetPath = null;
				nativeWindowsCaptureWebcamTargetPath = null;
				nativeWindowsCaptureRecordingId = null;
				nativeWindowsCursorOffsetMs = 0;
				nativeWindowsCursorCaptureMode = "editable-overlay";
				await stopCursorRecording();
				return { success: false, error: String(error) };
			}
		},
	);

	ipcMain.handle("stop-native-windows-recording", async (_, discard?: boolean) => {
		const proc = nativeWindowsCaptureProcess;
		const preferredPath = nativeWindowsCaptureTargetPath;
		const preferredWebcamPath = nativeWindowsCaptureWebcamTargetPath;
		const recordingId = nativeWindowsCaptureRecordingId ?? Date.now();
		const cursorCaptureMode = nativeWindowsCursorCaptureMode;

		if (!proc) {
			return { success: false, error: "Native Windows capture is not running." };
		}

		try {
			const stoppedPathPromise = waitForNativeWindowsCaptureStop(proc);
			proc.stdin.write("stop\n");
			const stoppedPath = await stoppedPathPromise;
			const screenVideoPath = stoppedPath || preferredPath;
			if (!screenVideoPath) {
				throw new Error("Native Windows capture did not return an output path.");
			}

			if (cursorCaptureMode === "editable-overlay") {
				await stopCursorRecording();
			} else {
				pendingCursorRecordingData = null;
			}
			if (discard) {
				pendingCursorRecordingData = null;
				await Promise.all([
					fs.rm(screenVideoPath, { force: true }),
					preferredWebcamPath ? fs.rm(preferredWebcamPath, { force: true }) : Promise.resolve(),
					fs.rm(`${screenVideoPath}.cursor.json`, { force: true }),
				]);
				return { success: true, discarded: true };
			}

			if (cursorCaptureMode === "editable-overlay") {
				shiftPendingCursorTelemetry(nativeWindowsCursorOffsetMs);
				await writePendingCursorTelemetry(screenVideoPath);
			}
			let webcamVideoPath: string | undefined;
			if (preferredWebcamPath) {
				try {
					await fs.access(preferredWebcamPath, fsConstants.R_OK);
					webcamVideoPath = preferredWebcamPath;
				} catch {
					webcamVideoPath = undefined;
				}
			}
			const session: RecordingSession = webcamVideoPath
				? { screenVideoPath, webcamVideoPath, createdAt: recordingId, cursorCaptureMode }
				: { screenVideoPath, createdAt: recordingId, cursorCaptureMode };
			setCurrentRecordingSessionState(session);
			currentProjectPath = null;

			const sessionManifestPath = path.join(
				RECORDINGS_DIR,
				`${path.parse(screenVideoPath).name}${RECORDING_SESSION_SUFFIX}`,
			);
			await fs.writeFile(sessionManifestPath, JSON.stringify(session, null, 2), "utf-8");

			return {
				success: true,
				path: screenVideoPath,
				session,
				message: "Native Windows recording session stored successfully",
			};
		} catch (error) {
			console.error("Failed to stop native Windows recording:", error);
			await stopCursorRecording();
			return { success: false, error: String(error) };
		} finally {
			nativeWindowsCaptureProcess = null;
			nativeWindowsCaptureTargetPath = null;
			nativeWindowsCaptureWebcamTargetPath = null;
			nativeWindowsCaptureRecordingId = null;
			nativeWindowsCursorOffsetMs = 0;
			nativeWindowsCursorCaptureMode = "editable-overlay";
			const source = selectedSource || { name: "Screen" };
			if (onRecordingStateChange) {
				onRecordingStateChange(false, source.name);
			}
		}
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

	async function storeRecordedSessionFiles(payload: StoreRecordedSessionInput) {
		const createdAt =
			typeof payload.createdAt === "number" && Number.isFinite(payload.createdAt)
				? payload.createdAt
				: Date.now();
		const cursorCaptureMode = normalizeCursorCaptureMode(payload.cursorCaptureMode);
		const screenVideoPath = resolveRecordingOutputPath(payload.screen.fileName);
		await fs.writeFile(screenVideoPath, Buffer.from(payload.screen.videoData));

		let webcamVideoPath: string | undefined;
		if (payload.webcam) {
			webcamVideoPath = resolveRecordingOutputPath(payload.webcam.fileName);
			await fs.writeFile(webcamVideoPath, Buffer.from(payload.webcam.videoData));
		}

		const session: RecordingSession = webcamVideoPath
			? {
					screenVideoPath,
					webcamVideoPath,
					createdAt,
					...(cursorCaptureMode ? { cursorCaptureMode } : {}),
				}
			: { screenVideoPath, createdAt, ...(cursorCaptureMode ? { cursorCaptureMode } : {}) };
		setCurrentRecordingSessionState(session);
		currentProjectPath = null;

		await writePendingCursorTelemetry(screenVideoPath);

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

	ipcMain.handle(
		"set-recording-state",
		async (_, recording: boolean, recordingId?: number, cursorCaptureMode?: CursorCaptureMode) => {
			const normalizedCursorCaptureMode =
				normalizeCursorCaptureMode(cursorCaptureMode) ?? "editable-overlay";
			if (recording && normalizedCursorCaptureMode === "editable-overlay") {
				await startCursorRecording(recordingId);
				// Drive HUD interactivity from the main process so stop/pause/discard
				// remain responsive even when the OS cursor is transparent.
				startHudCursorPolling();
				// Hide the OS cursor so getUserMedia stops baking it into raw frames.
				// A virtual cursor rendered in the excluded overlay window gives the
				// user visual feedback without appearing in the recorded footage.
				await hideSystemCursor();
				createCursorOverlayWindow();
			} else {
				// Restore cursor first so the user regains visual feedback immediately.
				destroyCursorOverlayWindow();
				await restoreSystemCursor();
				await stopCursorRecording();
				stopHudCursorPolling();
			}

			const source = selectedSource || { name: "Screen" };
			if (onRecordingStateChange) {
				onRecordingStateChange(recording, source.name);
			}
		},
	);

	ipcMain.handle("get-cursor-telemetry", async (_, videoPath?: string) => {
		const targetVideoPath = resolveApprovedVideoPath(
			videoPath ?? currentRecordingSession?.screenVideoPath,
		);
		if (!targetVideoPath) {
			return { success: true, samples: [] };
		}

		return readCursorTelemetryFile(targetVideoPath);
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
		return resolveAssetBasePath();
	});

	ipcMain.handle("pick-export-save-path", async (_, fileName: string, exportFolder?: string) => {
		try {
			const isGif = fileName.toLowerCase().endsWith(".gif");
			const filters = isGif
				? [{ name: mainT("dialogs", "fileDialogs.gifImage"), extensions: ["gif"] }]
				: [{ name: mainT("dialogs", "fileDialogs.mp4Video"), extensions: ["mp4"] }];

			// Prefer the user's last export folder if it still exists, otherwise fall
			// back to ~/Downloads. Validation must happen here because the renderer
			// can't stat the filesystem.
			let defaultDir = app.getPath("downloads");
			if (exportFolder) {
				try {
					const stats = await fs.stat(exportFolder);
					if (stats.isDirectory()) {
						defaultDir = exportFolder;
					}
				} catch (err) {
					console.warn(
						`Could not access remembered export folder "${exportFolder}", falling back to Downloads:`,
						err,
					);
				}
			}
			const dialogOptions = buildDialogOptions(
				{
					title: isGif
						? mainT("dialogs", "fileDialogs.saveGif")
						: mainT("dialogs", "fileDialogs.saveVideo"),
					defaultPath: path.join(defaultDir, fileName),
					filters,
					properties: ["createDirectory", "showOverwriteConfirmation"],
				},
				getMainWindow(),
			);
			const result = await dialog.showSaveDialog(dialogOptions);

			if (result.canceled || !result.filePath) {
				return { success: false, canceled: true, message: "Export canceled" };
			}

			return { success: true, path: path.normalize(result.filePath) };
		} catch (error) {
			console.error("Failed to show save dialog:", error);
			return {
				success: false,
				message: "Failed to show save dialog",
				error: String(error),
			};
		}
	});

	ipcMain.handle("write-export-to-path", async (_, videoData: ArrayBuffer, filePath: string) => {
		try {
			// Sanity-check the path. The renderer is trusted (contextIsolation is on),
			// but a stale state bug shouldn't be able to clobber arbitrary files.
			if (typeof filePath !== "string" || !path.isAbsolute(filePath)) {
				return { success: false, message: "Invalid path" };
			}
			const lower = filePath.toLowerCase();
			if (!lower.endsWith(".mp4") && !lower.endsWith(".gif")) {
				return { success: false, message: "Invalid file type" };
			}

			const normalizedPath = path.normalize(filePath);
			await fs.mkdir(path.dirname(normalizedPath), { recursive: true });
			await fs.writeFile(normalizedPath, Buffer.from(videoData));

			return {
				success: true,
				path: normalizedPath,
				message: "Video exported successfully",
			};
		} catch (error) {
			console.error("Failed to write exported video:", error);
			return {
				success: false,
				message: "Failed to save exported video",
				error: String(error),
			};
		}
	});

	ipcMain.handle("open-video-file-picker", async () => {
		try {
			const dialogOptions = buildDialogOptions(
				{
					title: mainT("dialogs", "fileDialogs.selectVideo"),
					defaultPath: RECORDINGS_DIR,
					filters: [
						{
							name: mainT("dialogs", "fileDialogs.videoFiles"),
							extensions: ["webm", "mp4", "mov", "avi", "mkv", "m4v", "wmv", "flv", "ts"],
						},
						{ name: mainT("dialogs", "fileDialogs.allFiles"), extensions: ["*"] },
					],
					properties: ["openFile"],
				},
				getMainWindow(),
			);
			const result = await dialog.showOpenDialog(dialogOptions);

			if (result.canceled || result.filePaths.length === 0) {
				return { success: false, canceled: true };
			}

			const normalizedPath = await approveReadableVideoPath(result.filePaths[0]);
			if (!normalizedPath) {
				return {
					success: false,
					message: "Selected file is not a supported readable video file",
				};
			}

			currentProjectPath = null;
			return {
				success: true,
				path: normalizedPath,
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

	ipcMain.handle("read-binary-file", async (_, filePath: string) => {
		try {
			const normalizedPath = await approveReadableVideoPath(filePath);
			if (!normalizedPath) {
				return {
					success: false,
					message: "File path is not approved or is not a supported video file",
				};
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

	ipcMain.handle(
		"save-project-file",
		async (_, projectData: unknown, suggestedName?: string, existingProjectPath?: string) => {
			return saveProjectFile(projectData, suggestedName, existingProjectPath);
		},
	);

	async function saveProjectFile(
		projectData: unknown,
		suggestedName?: string,
		existingProjectPath?: string,
	): Promise<ProjectFileResult> {
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

			const dialogOptions = buildDialogOptions(
				{
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
				},
				getMainWindow(),
			);
			const result = await dialog.showSaveDialog(dialogOptions);

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
	}

	ipcMain.handle("load-project-file", async () => {
		return loadProjectFile();
	});

	async function loadProjectFile(): Promise<ProjectFileResult> {
		try {
			const dialogOptions = buildDialogOptions(
				{
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
				},
				getMainWindow(),
			);
			const result = await dialog.showOpenDialog(dialogOptions);

			if (result.canceled || result.filePaths.length === 0) {
				return { success: false, canceled: true, message: "Open project canceled" };
			}

			const filePath = result.filePaths[0];
			const content = await fs.readFile(filePath, "utf-8");
			const project = JSON.parse(content);
			currentProjectPath = filePath;
			setCurrentRecordingSessionState(await getApprovedProjectSession(project, filePath));

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
	}

	ipcMain.handle("load-project-file-from-path", async (_event, filePath: string) => {
		return loadProjectFileFromPath(filePath);
	});

	async function loadProjectFileFromPath(filePath: string): Promise<ProjectFileResult> {
		try {
			if (!filePath || typeof filePath !== "string") {
				return { success: false, message: "Invalid file path" };
			}
			// Validate extension and readability
			if (path.extname(filePath).toLowerCase() !== `.${PROJECT_FILE_EXTENSION}`) {
				return { success: false, message: "Not an Openscreen project file" };
			}
			const stats = await fs.stat(filePath).catch(() => null);
			if (!stats?.isFile()) {
				return { success: false, message: "File not found" };
			}
			const content = await fs.readFile(filePath, "utf-8");
			const project = JSON.parse(content);
			currentProjectPath = filePath;

			// Approve session paths; tolerate failures (e.g. video moved outside
			// trusted dirs) so the project still loads and the renderer can surface
			// a "video not found" error rather than a generic load failure.
			let session: import("../../src/lib/recordingSession").RecordingSession | null = null;
			try {
				session = await getApprovedProjectSession(project, filePath);
			} catch (sessionError) {
				console.warn(
					"[loadProjectFileFromPath] Could not approve session paths, proceeding without session:",
					sessionError,
				);
			}
			setCurrentRecordingSessionState(session);
			return { success: true, path: filePath, project };
		} catch (error) {
			console.error("Failed to load project file from path:", error);
			return {
				success: false,
				message: "Failed to load project file",
				error: String(error),
			};
		}
	}

	ipcMain.handle("load-current-project-file", async () => {
		return loadCurrentProjectFile();
	});

	async function loadCurrentProjectFile(): Promise<ProjectFileResult> {
		try {
			if (!currentProjectPath) {
				return { success: false, message: "No active project" };
			}

			const content = await fs.readFile(currentProjectPath, "utf-8");
			const project = JSON.parse(content);
			setCurrentRecordingSessionState(await getApprovedProjectSession(project, currentProjectPath));
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
	}

	ipcMain.handle("set-current-video-path", async (_, path: string) => {
		return setCurrentVideoPath(path);
	});

	ipcMain.handle("set-current-recording-session", (_, session: RecordingSession | null) => {
		const normalizedSession = normalizeRecordingSession(session);
		setCurrentRecordingSessionState(normalizedSession);
		currentVideoPath = normalizedSession?.screenVideoPath ?? null;
		currentProjectPath = null;
		return { success: true, session: currentRecordingSession };
	});

	ipcMain.handle("get-current-recording-session", () => {
		return currentRecordingSession
			? { success: true, session: currentRecordingSession }
			: { success: false };
	});

	async function setCurrentVideoPath(path: string): Promise<ProjectPathResult> {
		const normalizedPath = normalizeVideoSourcePath(path);
		if (!normalizedPath || !isPathAllowed(normalizedPath)) {
			return {
				success: false,
				message: "Video path has not been approved",
			};
		}

		const restoredSession = await loadRecordedSessionForVideoPath(normalizedPath);
		if (restoredSession) {
			setCurrentRecordingSessionState(restoredSession);
		} else {
			setCurrentRecordingSessionState({
				screenVideoPath: normalizedPath,
				createdAt: Date.now(),
			});
		}
		currentProjectPath = null;
		return { success: true, path: currentVideoPath ?? normalizedPath };
	}

	ipcMain.handle("get-current-video-path", () => {
		return getCurrentVideoPathResult();
	});

	function getCurrentVideoPathResult(): ProjectPathResult {
		return currentVideoPath ? { success: true, path: currentVideoPath } : { success: false };
	}

	ipcMain.handle("clear-current-video-path", () => {
		return clearCurrentVideoPath();
	});

	function clearCurrentVideoPath(): ProjectPathResult {
		currentVideoPath = null;
		currentProjectPath = null;
		setCurrentRecordingSessionState(null);
		return { success: true };
	}

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

	ipcMain.handle(
		"save-diagnostic",
		async (
			_,
			payload: { error: string; stack?: string; projectState: unknown; logs: string[] },
		) => {
			const { filePath, canceled } = await dialog.showSaveDialog({
				title: "Save Diagnostic File",
				defaultPath: `openscreen-diagnostic-${Date.now()}.json`,
				filters: [{ name: "JSON", extensions: ["json"] }],
			});

			if (canceled || !filePath) return { success: false, canceled: true };

			const diagnostic = {
				timestamp: new Date().toISOString(),
				appVersion: app.getVersion(),
				platform: process.platform,
				arch: process.arch,
				osRelease: os.release(),
				osVersion: os.version(),
				totalMemoryMB: Math.round(os.totalmem() / 1024 / 1024),
				nodeVersion: process.versions.node,
				electronVersion: process.versions.electron,
				chromeVersion: process.versions.chrome,
				error: payload.error,
				stack: payload.stack,
				projectState: payload.projectState,
				recentLogs: payload.logs,
			};

			try {
				await fs.writeFile(filePath, JSON.stringify(diagnostic, null, 2), "utf-8");
				return { success: true, path: filePath };
			} catch (error) {
				console.error("Failed to write diagnostic file:", error);
				return { success: false, error: String(error) };
			}
		},
	);

	// Safety net: always restore the OS cursor on quit in case recording was
	// active and the user closed the app without stopping it first.
	if (process.platform === "win32") {
		app.once("before-quit", () => {
			destroyCursorOverlayWindow();
			const { spawnSync } = require("node:child_process") as typeof import("node:child_process");
			try {
				spawnSync(
					"powershell.exe",
					[
						"-NoLogo",
						"-NoProfile",
						"-NonInteractive",
						"-ExecutionPolicy",
						"Bypass",
						"-Command",
						RESTORE_CURSOR_SCRIPT,
					],
					{ windowsHide: true, timeout: 3_000 },
				);
			} catch {
				// best-effort — don't crash the quit sequence
			}
		});
	}

	registerNativeBridgeHandlers({
		getPlatform: () => process.platform,
		getCurrentProjectPath: () => currentProjectPath,
		getCurrentVideoPath: () => currentVideoPath,
		saveProjectFile,
		loadProjectFile,
		loadCurrentProjectFile,
		loadProjectFileFromPath,
		setCurrentVideoPath,
		getCurrentVideoPathResult,
		clearCurrentVideoPath,
		resolveAssetBasePath,
		resolveVideoPath: (videoPath?: string | null) =>
			normalizeVideoSourcePath(videoPath ?? currentVideoPath),
		loadCursorRecordingData: readCursorRecordingFile,
		loadCursorTelemetry: readCursorTelemetryFile,
	});
}
