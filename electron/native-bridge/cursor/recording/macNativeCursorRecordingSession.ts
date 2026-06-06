import { type ChildProcessByStdio, spawn } from "node:child_process";
import { accessSync, constants as fsConstants } from "node:fs";
import path from "node:path";
import type { Readable } from "node:stream";
import { type Rectangle, screen, systemPreferences } from "electron";
import type {
	CursorRecordingData,
	CursorRecordingSample,
	NativeCursorAsset,
	NativeCursorType,
} from "../../../../src/native/contracts";
import type { CursorRecordingSession } from "./session";

interface MacCursorAssetPayload {
	id: string;
	imageDataUrl: string;
	width: number;
	height: number;
	hotspotX: number;
	hotspotY: number;
	scaleFactor?: number;
}

interface MacNativeCursorRecordingSessionOptions {
	getDisplayBounds: () => Rectangle | null;
	maxSamples: number;
	sampleIntervalMs: number;
	startTimeMs?: number;
}

type MacCursorEvent =
	| {
			type: "ready";
			timestampMs: number;
			accessibilityTrusted?: boolean;
			mouseTapReady?: boolean;
	  }
	| {
			type: "sample";
			timestampMs: number;
			cursorType?: NativeCursorType | null;
			assetId?: string | null;
			asset?: MacCursorAssetPayload | null;
			leftButtonDown?: boolean;
			leftButtonPressed?: boolean;
			leftButtonReleased?: boolean;
	  };

const HELPER_NAME = "openscreen-macos-cursor-helper";
const READY_TIMEOUT_MS = 5_000;

function helperCandidates() {
	const envPath = process.env.OPENSCREEN_MAC_CURSOR_HELPER_EXE?.trim();
	const appRoot = process.env.APP_ROOT ? path.resolve(process.env.APP_ROOT) : process.cwd();
	const archTag = process.arch === "arm64" ? "darwin-arm64" : "darwin-x64";
	const resourceRoot =
		typeof process.resourcesPath === "string"
			? process.resourcesPath
			: path.join(appRoot, "resources");

	return [
		envPath,
		path.join(appRoot, "electron", "native", "screencapturekit", "build", HELPER_NAME),
		path.join(appRoot, "electron", "native", "bin", archTag, HELPER_NAME),
		path.join(resourceRoot, "electron", "native", "bin", archTag, HELPER_NAME),
	].filter((candidate): candidate is string => Boolean(candidate));
}

export function findMacCursorHelperPath() {
	for (const candidate of helperCandidates()) {
		try {
			accessSync(candidate, fsConstants.X_OK);
			return candidate;
		} catch {
			// Try the next helper location.
		}
	}

	return null;
}

export async function requestMacCursorAccessibilityAccess() {
	if (process.platform !== "darwin") {
		return { success: true, granted: true, status: "granted" };
	}

	try {
		systemPreferences.isTrustedAccessibilityClient(true);
	} catch {
		// Continue with helper probing; it can trigger the same macOS prompt.
	}

	const helperPath = findMacCursorHelperPath();
	if (!helperPath) {
		return { success: true, granted: false, status: "missing-helper" };
	}

	return new Promise<{ success: boolean; granted: boolean; status: string; error?: string }>(
		(resolve) => {
			const child = spawn(helperPath, [JSON.stringify({ sampleIntervalMs: 250 })], {
				stdio: ["ignore", "pipe", "pipe"],
			});
			let settled = false;
			let lineBuffer = "";
			const finish = (result: {
				success: boolean;
				granted: boolean;
				status: string;
				error?: string;
			}) => {
				if (settled) {
					return;
				}
				settled = true;
				clearTimeout(timer);
				if (!child.killed) {
					child.kill("SIGTERM");
				}
				resolve(result);
			};
			const timer = setTimeout(() => {
				finish({
					success: false,
					granted: false,
					status: "timeout",
					error: "Timed out waiting for macOS cursor helper",
				});
			}, READY_TIMEOUT_MS);

			child.stdout.setEncoding("utf8");
			child.stdout.on("data", (chunk: string) => {
				lineBuffer += chunk;
				const lines = lineBuffer.split(/\r?\n/);
				lineBuffer = lines.pop() ?? "";
				for (const line of lines) {
					const trimmed = line.trim();
					if (!trimmed) {
						continue;
					}
					try {
						const event = JSON.parse(trimmed) as MacCursorEvent;
						if (event.type === "ready") {
							finish({
								success: true,
								granted: event.accessibilityTrusted === true,
								status: event.accessibilityTrusted === true ? "granted" : "not-determined",
							});
							return;
						}
					} catch {
						// Ignore non-JSON helper output.
					}
				}
			});

			child.once("error", (error) => {
				finish({
					success: false,
					granted: false,
					status: "error",
					error: error.message,
				});
			});
			child.once("exit", (code, signal) => {
				finish({
					success: false,
					granted: false,
					status: "exited",
					error: `macOS cursor helper exited before ready (code=${code}, signal=${signal})`,
				});
			});
		},
	);
}

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

function normalizeCursorType(value: unknown): NativeCursorType | null {
	return value === "arrow" || value === "pointer" || value === "text" ? value : null;
}

export class MacNativeCursorRecordingSession implements CursorRecordingSession {
	private samples: CursorRecordingSample[] = [];
	private assets = new Map<string, NativeCursorAsset>();
	private process: ChildProcessByStdio<null, Readable, Readable> | null = null;
	private lineBuffer = "";
	private startTimeMs = 0;
	private fallbackInterval: NodeJS.Timeout | null = null;
	private readyResolve: (() => void) | null = null;
	private readyReject: ((error: Error) => void) | null = null;
	private readyTimer: NodeJS.Timeout | null = null;
	private previousLeftButtonDown = false;
	private consecutiveOutsideSamples = 0;
	// Hide only after this many consecutive out-of-bounds samples (~100ms at 33ms interval).
	// Fast swipes that briefly exit the display are clipped by clip-path instead of disappearing.
	private static readonly OUTSIDE_HIDE_THRESHOLD = 3;

	constructor(private readonly options: MacNativeCursorRecordingSessionOptions) {}

	async start(): Promise<void> {
		this.samples = [];
		this.assets.clear();
		this.lineBuffer = "";
		this.startTimeMs = this.options.startTimeMs ?? Date.now();
		this.previousLeftButtonDown = false;
		this.consecutiveOutsideSamples = 0;

		try {
			systemPreferences.isTrustedAccessibilityClient(true);
		} catch {
			// Without Accessibility, text/pointer affordance detection is unavailable;
			// bitmaps are still captured natively via NSCursor.
		}

		const helperPath = findMacCursorHelperPath();
		if (!helperPath) {
			this.startPositionOnlyFallback();
			return;
		}

		const child = spawn(
			helperPath,
			[
				JSON.stringify({
					sampleIntervalMs: this.options.sampleIntervalMs,
				}),
			],
			{
				stdio: ["ignore", "pipe", "pipe"],
			},
		);
		this.process = child;

		child.stdout.setEncoding("utf8");
		child.stdout.on("data", (chunk: string) => this.handleStdoutChunk(chunk));
		child.stderr.setEncoding("utf8");
		child.stderr.on("data", (chunk: string) => {
			const message = chunk.trim();
			if (message) {
				console.error("[cursor-macos]", message);
			}
		});
		child.once("exit", (code, signal) => {
			this.rejectReady(
				new Error(`macOS cursor helper exited before ready (code=${code}, signal=${signal})`),
			);
			this.process = null;
		});
		child.once("error", (error) => {
			this.rejectReady(error);
			this.process = null;
		});

		try {
			await this.waitUntilReady();
		} catch (error) {
			this.killHelperProcess(child);
			this.process = null;
			console.warn("[cursor-macos] falling back to position-only cursor telemetry:", error);
			this.startPositionOnlyFallback();
		}
	}

	async stop(): Promise<CursorRecordingData> {
		const child = this.process;
		this.process = null;
		this.clearReadyState();

		if (this.fallbackInterval) {
			clearInterval(this.fallbackInterval);
			this.fallbackInterval = null;
		}

		if (child) {
			this.killHelperProcess(child);
		}

		return {
			version: 2,
			provider: this.assets.size > 0 ? "native" : "none",
			samples: this.samples,
			assets: [...this.assets.values()],
		};
	}

	private startPositionOnlyFallback() {
		this.captureSample(Date.now(), null, null, false, false, false);
		this.fallbackInterval = setInterval(() => {
			this.captureSample(Date.now(), null, null, false, false, false);
		}, this.options.sampleIntervalMs);
	}

	private rememberAsset(asset: MacCursorAssetPayload | null | undefined) {
		if (!asset?.id || this.assets.has(asset.id)) {
			return;
		}

		const cursor = screen.getCursorScreenPoint();
		const displayScaleFactor = screen.getDisplayNearestPoint(cursor).scaleFactor;
		this.assets.set(asset.id, {
			id: asset.id,
			platform: "darwin",
			imageDataUrl: asset.imageDataUrl,
			width: asset.width,
			height: asset.height,
			hotspotX: asset.hotspotX,
			hotspotY: asset.hotspotY,
			scaleFactor: asset.scaleFactor ?? displayScaleFactor,
		});
	}

	private handleStdoutChunk(chunk: string) {
		this.lineBuffer += chunk;
		const lines = this.lineBuffer.split(/\r?\n/);
		this.lineBuffer = lines.pop() ?? "";

		for (const line of lines) {
			const trimmedLine = line.trim();
			if (!trimmedLine) {
				continue;
			}

			try {
				this.handleEvent(JSON.parse(trimmedLine) as MacCursorEvent);
			} catch (error) {
				console.error("Failed to parse macOS cursor helper output:", error, trimmedLine);
			}
		}
	}

	private handleEvent(payload: MacCursorEvent) {
		if (payload.type === "ready") {
			if (payload.accessibilityTrusted === false) {
				console.warn(
					"[cursor-macos] Accessibility is not trusted; text/pointer affordance detection disabled (bitmap capture still active).",
				);
			}
			this.resolveReady();
			return;
		}

		if (payload.type === "sample") {
			this.rememberAsset(payload.asset);
			this.captureSample(
				payload.timestampMs,
				normalizeCursorType(payload.cursorType),
				payload.assetId ?? null,
				payload.leftButtonDown === true,
				payload.leftButtonPressed === true,
				payload.leftButtonReleased === true,
			);
		}
	}

	private captureSample(
		timestampMs: number,
		cursorType: NativeCursorType | null,
		assetId: string | null,
		leftButtonDown: boolean,
		leftButtonPressed: boolean,
		leftButtonReleased: boolean,
	) {
		const cursor = screen.getCursorScreenPoint();
		const bounds = this.options.getDisplayBounds() ?? screen.getDisplayNearestPoint(cursor).bounds;
		const width = Math.max(1, bounds.width);
		const height = Math.max(1, bounds.height);
		const normalizedX = (cursor.x - bounds.x) / width;
		const normalizedY = (cursor.y - bounds.y) / height;
		const isOutsideDisplay =
			normalizedX < 0 || normalizedX > 1 || normalizedY < 0 || normalizedY > 1;
		// Brief exits (under THRESHOLD samples) clip to the canvas edge via clip-path instead
		// of snapping invisible. Sustained exits (>=THRESHOLD, ~100ms) mark visible=false to
		// avoid ghost cursors and motion trails from multi-display movement.
		if (isOutsideDisplay) {
			this.consecutiveOutsideSamples++;
		} else {
			this.consecutiveOutsideSamples = 0;
		}
		const visible =
			this.consecutiveOutsideSamples < MacNativeCursorRecordingSession.OUTSIDE_HIDE_THRESHOLD;
		const interactionType =
			leftButtonPressed || (leftButtonDown && !this.previousLeftButtonDown)
				? "click"
				: leftButtonReleased || (!leftButtonDown && this.previousLeftButtonDown)
					? "mouseup"
					: "move";
		this.previousLeftButtonDown = leftButtonDown;

		this.samples.push({
			timeMs: Math.max(0, timestampMs - this.startTimeMs),
			cx: clamp(normalizedX, 0, 1),
			cy: clamp(normalizedY, 0, 1),
			visible,
			interactionType,
			...(assetId ? { assetId } : {}),
			...(cursorType ? { cursorType } : {}),
		});

		if (this.samples.length > this.options.maxSamples) {
			this.samples.shift();
		}
	}

	private waitUntilReady() {
		return new Promise<void>((resolve, reject) => {
			this.readyResolve = resolve;
			this.readyReject = reject;
			this.readyTimer = setTimeout(() => {
				this.rejectReady(new Error("Timed out waiting for macOS cursor helper"));
			}, READY_TIMEOUT_MS);
		});
	}

	private resolveReady() {
		const resolve = this.readyResolve;
		this.clearReadyState();
		resolve?.();
	}

	private rejectReady(error: Error) {
		const reject = this.readyReject;
		this.clearReadyState();
		reject?.(error);
	}

	private clearReadyState() {
		if (this.readyTimer) {
			clearTimeout(this.readyTimer);
			this.readyTimer = null;
		}
		this.readyResolve = null;
		this.readyReject = null;
	}

	private killHelperProcess(child: ChildProcessByStdio<null, Readable, Readable>) {
		if (child.killed) {
			return;
		}

		child.kill("SIGTERM");
		setTimeout(() => {
			if (!child.killed) {
				child.kill("SIGKILL");
			}
		}, 500).unref();
	}
}
