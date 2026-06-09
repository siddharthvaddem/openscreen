import { type ChildProcessByStdio, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Readable } from "node:stream";
import { app, screen } from "electron";
import { parseWindowHandleFromSourceId } from "../../../../src/lib/nativeWindowsRecording";
import type {
	CursorRecordingData,
	CursorRecordingSample,
	NativeCursorAsset,
} from "../../../../src/native/contracts";
import type { CursorRecordingSession } from "./session";
import type {
	WindowsCursorEvent,
	WindowsNativeRecordingSessionOptions,
} from "./windowsNativeRecordingSession.types";

function getCursorSamplerCandidates(): string[] {
	const envPath = process.env.OPENSCREEN_CURSOR_SAMPLER_EXE?.trim();
	const archTag = process.arch === "arm64" ? "win32-arm64" : "win32-x64";
	const resolve = (...segs: string[]) => {
		const p = join(app.getAppPath(), ...segs);
		return app.isPackaged ? p.replace(/\.asar([/\\])/, ".asar.unpacked$1") : p;
	};
	const resolvePackaged = (...segs: string[]) => {
		return app.isPackaged ? join(process.resourcesPath, ...segs) : null;
	};
	return [
		envPath,
		resolve("electron", "native", "wgc-capture", "build", "cursor-sampler.exe"),
		resolve("electron", "native", "bin", archTag, "cursor-sampler.exe"),
		resolvePackaged("electron", "native", "bin", archTag, "cursor-sampler.exe"),
	].filter((c): c is string => Boolean(c));
}

function findCursorSamplerPath(): string | null {
	for (const candidate of getCursorSamplerCandidates()) {
		if (existsSync(candidate)) return candidate;
	}
	return null;
}

const READY_TIMEOUT_MS = 5_000;

interface NormalizedSample {
	sample: CursorRecordingSample;
	withinBounds: boolean;
}

export class WindowsNativeRecordingSession implements CursorRecordingSession {
	private assets = new Map<string, NativeCursorAsset>();
	private samples: CursorRecordingSample[] = [];
	private process: ChildProcessByStdio<null, Readable, Readable> | null = null;
	private lineBuffer = "";
	private startTimeMs = 0;
	private readyResolve: (() => void) | null = null;
	private readyReject: ((error: Error) => void) | null = null;
	private readyTimer: NodeJS.Timeout | null = null;
	private sampleCount = 0;
	private outOfBoundsSampleCount = 0;
	private previousLeftButtonDown = false;

	constructor(private readonly options: WindowsNativeRecordingSessionOptions) {}

	async start(): Promise<void> {
		this.assets.clear();
		this.samples = [];
		this.lineBuffer = "";
		this.startTimeMs = this.options.startTimeMs ?? Date.now();
		this.sampleCount = 0;
		this.outOfBoundsSampleCount = 0;
		this.previousLeftButtonDown = false;

		const helperPath = findCursorSamplerPath();
		if (!helperPath) {
			throw new Error("Windows cursor sampler helper is not available.");
		}

		const windowHandle = parseWindowHandleFromSourceId(this.options.sourceId);
		const args = [String(this.options.sampleIntervalMs)];
		if (windowHandle) args.push(windowHandle);

		const child = spawn(helperPath, args, {
			stdio: ["ignore", "pipe", "pipe"],
			windowsHide: true,
		});

		this.process = child;
		this.logDiagnostic("spawn", {
			pid: child.pid ?? null,
			sampleIntervalMs: this.options.sampleIntervalMs,
			sourceId: this.options.sourceId ?? null,
			windowHandle,
		});

		child.stdout.setEncoding("utf8");
		child.stdout.on("data", (chunk: string) => {
			this.handleStdoutChunk(chunk);
		});
		child.stderr.setEncoding("utf8");
		child.stderr.on("data", (chunk: string) => {
			const message = chunk.trim();
			if (message) {
				this.logDiagnostic("stderr", { message });
			}
			console.error("[cursor-native]", message);
		});
		child.once("exit", (code, signal) => {
			this.logDiagnostic("exit", {
				code,
				signal,
				sampleCount: this.sampleCount,
				assetCount: this.assets.size,
				outOfBoundsSampleCount: this.outOfBoundsSampleCount,
			});
			this.rejectReady(
				new Error(`Windows cursor helper exited before ready (code=${code}, signal=${signal})`),
			);
		});
		child.once("error", (error) => {
			this.logDiagnostic("process-error", { message: error.message });
			this.rejectReady(error);
		});

		try {
			await this.waitUntilReady();
		} catch (error) {
			this.terminateHelperProcess();
			throw error;
		}
	}

	async stop(): Promise<CursorRecordingData> {
		const child = this.process;
		this.process = null;
		this.clearReadyState();

		this.killHelperProcess(child);

		this.logDiagnostic("stop", {
			sampleCount: this.sampleCount,
			assetCount: this.assets.size,
			outOfBoundsSampleCount: this.outOfBoundsSampleCount,
		});

		return {
			version: 2,
			provider: this.assets.size > 0 ? "native" : "none",
			samples: this.samples,
			assets: [...this.assets.values()],
		};
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
				const payload = JSON.parse(trimmedLine) as WindowsCursorEvent;
				this.handleEvent(payload);
			} catch (error) {
				console.error("Failed to parse Windows cursor helper output:", error, trimmedLine);
			}
		}
	}

	private handleEvent(payload: WindowsCursorEvent) {
		if (payload.type === "error") {
			this.logDiagnostic("helper-error", { message: payload.message });
			console.error("Windows cursor helper error:", payload.message);
			this.failHelper(new Error(payload.message));
			return;
		}

		if (payload.type === "ready") {
			this.logDiagnostic("ready", { timestampMs: payload.timestampMs });
			this.resolveReady();
			return;
		}

		if (payload.asset?.id && !this.assets.has(payload.asset.id)) {
			const assetDisplay = screen.getDisplayNearestPoint({ x: payload.x, y: payload.y });
			this.assets.set(payload.asset.id, {
				id: payload.asset.id,
				platform: "win32",
				imageDataUrl: payload.asset.imageDataUrl,
				width: payload.asset.width,
				height: payload.asset.height,
				hotspotX: payload.asset.hotspotX,
				hotspotY: payload.asset.hotspotY,
				scaleFactor: assetDisplay.scaleFactor,
				cursorType: payload.asset.cursorType ?? payload.cursorType ?? null,
			});
			this.logDiagnostic("asset", {
				id: payload.asset.id,
				width: payload.asset.width,
				height: payload.asset.height,
				hotspotX: payload.asset.hotspotX,
				hotspotY: payload.asset.hotspotY,
				scaleFactor: assetDisplay.scaleFactor,
			});
		}

		const normalized = this.normalizeSample(payload);
		this.sampleCount += 1;
		if (!normalized.withinBounds) {
			this.outOfBoundsSampleCount += 1;
		}

		this.samples.push(normalized.sample);

		if (this.samples.length > this.options.maxSamples) {
			this.samples.shift();
		}
	}

	private normalizeSample(
		payload: Extract<WindowsCursorEvent, { type: "sample" }>,
	): NormalizedSample {
		const bounds =
			payload.bounds ?? this.options.getDisplayBounds() ?? screen.getPrimaryDisplay().bounds;
		const width = Math.max(1, bounds.width);
		const height = Math.max(1, bounds.height);
		const normalizedX = (payload.x - bounds.x) / width;
		const normalizedY = (payload.y - bounds.y) / height;
		const withinBounds =
			normalizedX >= 0 && normalizedX <= 1 && normalizedY >= 0 && normalizedY <= 1;
		const leftButtonDown = payload.leftButtonDown === true;
		const leftButtonPressed = payload.leftButtonPressed === true;
		const leftButtonReleased = payload.leftButtonReleased === true;
		const interactionType =
			leftButtonPressed || (leftButtonDown && !this.previousLeftButtonDown)
				? "click"
				: leftButtonReleased || (!leftButtonDown && this.previousLeftButtonDown)
					? "mouseup"
					: "move";
		this.previousLeftButtonDown = leftButtonDown;

		if (this.sampleCount === 0 || (!withinBounds && this.outOfBoundsSampleCount === 0)) {
			this.logDiagnostic("sample", {
				rawX: payload.x,
				rawY: payload.y,
				normalizedX,
				normalizedY,
				visible: payload.visible,
				withinBounds,
				bounds,
				handle: payload.handle,
			});
		}

		return {
			withinBounds,
			sample: {
				timeMs: Math.max(0, payload.timestampMs - this.startTimeMs),
				cx: normalizedX,
				cy: normalizedY,
				assetId: payload.handle,
				visible: payload.visible && withinBounds,
				cursorType: payload.cursorType ?? payload.asset?.cursorType ?? null,
				interactionType,
			},
		};
	}

	private waitUntilReady() {
		return new Promise<void>((resolve, reject) => {
			this.readyResolve = resolve;
			this.readyReject = reject;
			this.readyTimer = setTimeout(() => {
				this.rejectReady(new Error("Timed out waiting for Windows cursor helper readiness"));
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

	private failHelper(error: Error) {
		this.rejectReady(error);
		this.terminateHelperProcess();
	}

	private terminateHelperProcess() {
		const child = this.process;
		this.process = null;
		this.killHelperProcess(child);
	}

	private killHelperProcess(child: ChildProcessByStdio<null, Readable, Readable> | null) {
		if (child && !child.killed) {
			child.kill();
		}
	}

	private clearReadyState() {
		if (this.readyTimer) {
			clearTimeout(this.readyTimer);
			this.readyTimer = null;
		}
		this.readyResolve = null;
		this.readyReject = null;
	}

	private logDiagnostic(event: string, data: Record<string, unknown>) {
		console.info(
			"[cursor-native][win32]",
			JSON.stringify({
				event,
				...data,
			}),
		);
	}
}
