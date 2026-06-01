import { readFile, rm, stat } from "node:fs/promises";
import path from "node:path";

// Minimal subset of Electron's WebContents that we use. Kept narrow so tests
// can stub it with a plain object.
export interface BridgeWebContents {
	send: (channel: string, ...args: unknown[]) => void;
}

export type IpcListener = (...args: unknown[]) => void;

export interface BridgeDeps {
	webContents: BridgeWebContents;
	/** Subscribe persistently to a renderer→main ipc event. */
	ipcOn: (channel: string, listener: IpcListener) => void;
	/** Subscribe one-shot to a renderer→main ipc event. Returns disposer. */
	ipcOnce: (channel: string, listener: IpcListener) => () => void;
	/** Directory where recording files live. */
	recordingsDir: string;
	/** Optional override of `Date.now()` for deterministic tests. */
	now?: () => number;
}

export type RecorderState = "idle" | "recording" | "encoding";

export interface StartParams {
	cursorCaptureMode?: string;
}

export interface StartResult {
	session_id: string;
	state: "recording";
	out_dir: string;
}

export interface StopParams {
	session_id?: string;
}

export interface StopResult {
	session_id: string;
	path: string;
	duration_ms: number;
	cursor_log_path: string;
	click_count: number;
	bytes: number;
}

export interface StatusResult {
	state: RecorderState;
	session_id?: string;
	elapsed_ms?: number;
}

export interface CleanupParams {
	session_id: string;
}

export interface CleanupResult {
	session_id: string;
	deleted: boolean;
	freed_bytes: number;
}

// Filename helpers (mirror handlers.ts conventions).
const RECORDING_FILE_PREFIX = "recording-";
const VIDEO_EXT = ".webm";
const CURSOR_SIDECAR_SUFFIX = ".cursor.json";
const SESSION_MANIFEST_SUFFIX = ".session.json";

interface PendingStart {
	resolve: (id: string) => void;
	reject: (err: Error) => void;
	timer: ReturnType<typeof setTimeout>;
}

interface PendingStop {
	resolve: (payload: StopRecordedPayload) => void;
	reject: (err: Error) => void;
	timer: ReturnType<typeof setTimeout>;
}

interface StopRecordedPayload {
	screenVideoPath?: string;
	cursorTelemetryPath?: string;
	durationMs?: number;
}

export class RecorderBridge {
	private state: RecorderState = "idle";
	private currentSessionId: string | null = null;
	private startedAt: number | null = null;
	private latestStopResult: StopResult | null = null;
	private pendingStart: PendingStart | null = null;
	private pendingStop: PendingStop | null = null;
	private readonly now: () => number;

	constructor(private readonly deps: BridgeDeps) {
		this.now = deps.now ?? (() => Date.now());

		// Renderer notifies main when a CLI-initiated recording has truly started.
		this.deps.ipcOn("cli-recording-started", (...args) => {
			const payload = (args[1] ?? args[0]) as { recordingId?: number | string } | undefined;
			const id = String(payload?.recordingId ?? "");
			if (!id) {
				if (this.pendingStart) {
					clearTimeout(this.pendingStart.timer);
					this.pendingStart.reject(new Error("renderer reported start without recordingId"));
					this.pendingStart = null;
				}
				return;
			}
			this.state = "recording";
			this.currentSessionId = id;
			this.startedAt = this.now();
			if (this.pendingStart) {
				clearTimeout(this.pendingStart.timer);
				this.pendingStart.resolve(id);
				this.pendingStart = null;
			}
		});

		// Renderer notifies main when a recording has been finalized (file written
		// and store-recorded-session has resolved).
		this.deps.ipcOn("cli-recording-finalized", (...args) => {
			const payload = (args[1] ?? args[0]) as StopRecordedPayload | undefined;
			if (this.pendingStop) {
				clearTimeout(this.pendingStop.timer);
				this.pendingStop.resolve(payload ?? {});
				this.pendingStop = null;
			}
			this.state = "idle";
		});
	}

	async start(params: StartParams = {}): Promise<StartResult> {
		if (this.state !== "idle") {
			throw Object.assign(new Error("already recording or finalizing"), { code: -32000 });
		}
		if (this.pendingStart) {
			throw Object.assign(new Error("a start is already in flight"), { code: -32000 });
		}

		const startPromise = new Promise<string>((resolve, reject) => {
			const timer = setTimeout(() => {
				this.pendingStart = null;
				reject(new Error("timed out waiting for renderer to ack recording start"));
			}, 10_000);
			this.pendingStart = { resolve, reject, timer };
		});

		this.deps.webContents.send("cli-start-recording", {
			cursorCaptureMode: params.cursorCaptureMode ?? "editable-overlay",
		});

		const id = await startPromise;
		return {
			session_id: id,
			state: "recording",
			out_dir: this.deps.recordingsDir,
		};
	}

	async stop(_params: StopParams = {}): Promise<StopResult> {
		if (this.state === "idle") {
			if (this.latestStopResult) return this.latestStopResult;
			throw Object.assign(new Error("no active recording"), { code: -32000 });
		}
		if (this.pendingStop) {
			throw Object.assign(new Error("a stop is already in flight"), { code: -32000 });
		}

		this.state = "encoding";

		const stopPromise = new Promise<StopRecordedPayload>((resolve, reject) => {
			const timer = setTimeout(() => {
				this.pendingStop = null;
				reject(new Error("timed out waiting for renderer to finalize recording"));
			}, 30_000);
			this.pendingStop = { resolve, reject, timer };
		});

		this.deps.webContents.send("stop-recording-from-tray");

		const payload = await stopPromise;

		const sessionId = this.currentSessionId ?? "unknown";
		const screenVideoPath =
			payload.screenVideoPath ??
			path.join(this.deps.recordingsDir, `${RECORDING_FILE_PREFIX}${sessionId}${VIDEO_EXT}`);
		const cursorLogPath =
			payload.cursorTelemetryPath ?? `${screenVideoPath}${CURSOR_SIDECAR_SUFFIX}`;
		const durationMs = payload.durationMs ?? (this.startedAt ? this.now() - this.startedAt : 0);

		const result: StopResult = {
			session_id: sessionId,
			path: screenVideoPath,
			duration_ms: durationMs,
			cursor_log_path: cursorLogPath,
			click_count: 0,
			bytes: 0,
		};

		// Hydrate bytes from disk.
		try {
			const st = await stat(screenVideoPath);
			result.bytes = st.size;
		} catch {
			/* ignore — file may not exist if discard path was taken */
		}

		// Hydrate click_count from cursor.json sidecar.
		try {
			const raw = await readFile(cursorLogPath, "utf8");
			const parsed = JSON.parse(raw);
			if (Array.isArray(parsed)) {
				result.click_count = parsed.filter(
					(s: unknown) =>
						typeof s === "object" &&
						s !== null &&
						"type" in (s as Record<string, unknown>) &&
						(s as Record<string, unknown>).type === "click",
				).length;
			} else if (parsed && typeof parsed === "object") {
				const obj = parsed as { clicks?: unknown; samples?: unknown };
				if (Array.isArray(obj.clicks)) {
					result.click_count = obj.clicks.length;
				} else if (Array.isArray(obj.samples)) {
					result.click_count = (obj.samples as unknown[]).filter(
						(s) =>
							typeof s === "object" &&
							s !== null &&
							"type" in (s as Record<string, unknown>) &&
							(s as Record<string, unknown>).type === "click",
					).length;
				}
			}
		} catch {
			/* ignore — sidecar may not exist */
		}

		this.latestStopResult = result;
		this.currentSessionId = null;
		this.startedAt = null;
		return result;
	}

	status(): StatusResult {
		const out: StatusResult = { state: this.state };
		if (this.currentSessionId) out.session_id = this.currentSessionId;
		if (this.startedAt !== null && this.state === "recording") {
			out.elapsed_ms = this.now() - this.startedAt;
		}
		return out;
	}

	async cleanup(params: CleanupParams): Promise<CleanupResult> {
		const sessionId = params?.session_id;
		if (!sessionId || typeof sessionId !== "string") {
			throw Object.assign(new Error("cleanup requires { session_id: string }"), { code: -32602 });
		}
		const base = path.join(this.deps.recordingsDir, `${RECORDING_FILE_PREFIX}${sessionId}`);
		const candidates = [
			`${base}${VIDEO_EXT}`,
			`${base}${VIDEO_EXT}${CURSOR_SIDECAR_SUFFIX}`,
			`${base}${SESSION_MANIFEST_SUFFIX}`,
			`${base}-webcam${VIDEO_EXT}`,
		];
		let freed = 0;
		for (const p of candidates) {
			try {
				const st = await stat(p);
				freed += st.size;
				await rm(p, { force: true });
			} catch {
				/* file missing — ignore */
			}
		}
		return { session_id: sessionId, deleted: freed > 0, freed_bytes: freed };
	}

	/**
	 * Internal: expose state mutation for the main process to feed back state
	 * from the existing `onRecordingStateChange` callback. Useful when recording
	 * is initiated by GUI (not CLI) so status() still reflects reality.
	 */
	notifyRecordingState(recording: boolean, recordingId?: number | string): void {
		if (recording) {
			this.state = "recording";
			if (recordingId !== undefined) {
				this.currentSessionId = String(recordingId);
			}
			this.startedAt = this.now();
		} else if (this.state === "recording") {
			this.state = "encoding";
		}
	}
}
