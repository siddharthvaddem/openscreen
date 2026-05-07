/**
 * A single cursor telemetry sample captured during a recording session.
 *
 * Coordinates (`cx`, `cy`) are clamped ratios in the `[0, 1]` range,
 * normalised against the captured surface's width and height by the
 * main-process `sampleCursorPoint()` before being pushed. `timeMs` is the
 * offset (in milliseconds) from the recording's start.
 */
export interface CursorTelemetryPoint {
	timeMs: number;
	cx: number;
	cy: number;
}

/**
 * A completed batch of cursor samples, tagged with the recording id that
 * produced them. The id is supplied at `startSession()` time and travels
 * with the batch through the pending queue, retries, and discards.
 */
export interface CursorTelemetryBatch {
	recordingId: number;
	samples: CursorTelemetryPoint[];
}

/**
 * Per-session cursor telemetry buffer with bounded memory.
 *
 * Flow: `startSession(recordingId)` → `push(point)` N times → `endSession()`
 * enqueues the collected samples as a completed batch tagged with that
 * `recordingId`. The main process later drains batches in FIFO order via
 * `takeNextBatch()` to persist them to disk, and can `prependBatch()` on
 * write failure to retry without losing order. A discard request keys on
 * the recording id so an asynchronous "discard recording A" decision that
 * arrives after recording B has already enqueued its batch still drops
 * the right one.
 *
 * Memory is bounded by `maxActiveSamples` (ring buffer on the in-progress
 * batch) and `maxPendingBatches` (FIFO cap across completed batches).
 */
export interface CursorTelemetryBuffer {
	/**
	 * Begin a new recording session under the given `recordingId`. Clears
	 * any in-progress active samples (without touching already-completed
	 * pending batches). Safe to call repeatedly — e.g. a rapid Stop →
	 * Record sequence — and the most recent id wins.
	 */
	startSession(recordingId: number): void;

	/**
	 * Append a telemetry sample to the current active session. When the
	 * active buffer exceeds `maxActiveSamples`, the oldest sample is
	 * dropped (ring behaviour).
	 */
	push(point: CursorTelemetryPoint): void;

	/**
	 * Finalize the active session, moving its samples into the pending
	 * queue as a single batch tagged with the current recording id. Empty
	 * sessions are dropped (no empty batch is enqueued).
	 *
	 * If the pending queue would exceed `maxPendingBatches`, the oldest
	 * batches are evicted to bound memory. A `console.warn` is emitted
	 * whenever at least one batch is dropped so that pathological rapid-
	 * restart scenarios are observable.
	 *
	 * @returns the number of pending batches dropped by this call (0 under
	 * normal operation).
	 */
	endSession(): number;

	/**
	 * Remove and return the oldest pending batch, or `null` if the queue
	 * is empty.
	 */
	takeNextBatch(): CursorTelemetryBatch | null;

	/**
	 * Re-insert a batch at the front of the queue, preserving FIFO order
	 * on retry paths (e.g. when persisting the batch failed and the
	 * caller wants the next `takeNextBatch()` to yield it again).
	 *
	 * Empty batches are ignored. The pending cap is enforced defensively
	 * — if prepending would push the queue past `maxPendingBatches`, the
	 * oldest entries are evicted and a `console.warn` is emitted. In
	 * normal retry usage this trim is a no-op because the caller has just
	 * removed the batch via `takeNextBatch()`.
	 */
	prependBatch(batch: CursorTelemetryBatch): void;

	/**
	 * Drop the pending batch produced by the given `recordingId`. Used
	 * when a recording is discarded after its `endSession()` has run but
	 * before it has been persisted. Returns `true` if a batch was
	 * removed, `false` otherwise (no matching id, or the batch was
	 * already drained).
	 *
	 * Keying on the recording id (rather than "the latest pending batch")
	 * avoids a real bug: when finalizing a recording does asynchronous
	 * work like `fixWebmDuration`, a quick Stop → Record → Discard
	 * sequence can interleave such that the latest pending batch belongs
	 * to a *later* recording than the one being discarded.
	 */
	discardBatch(recordingId: number): boolean;

	/**
	 * Clear both the active and pending state. Intended for tests and
	 * full teardown paths.
	 */
	reset(): void;

	readonly activeCount: number;
	readonly pendingCount: number;
}

export interface CursorTelemetryBufferOptions {
	maxActiveSamples: number;
	maxPendingBatches?: number;
}

const DEFAULT_MAX_PENDING_BATCHES = 8;
const DEFAULT_MAX_ACTIVE_SAMPLES = 10_000;

/** Coerce a numeric option into a safe, finite, positive integer. */
function sanitizeLimit(value: number | undefined, fallback: number): number {
	if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
	const floored = Math.floor(value);
	return floored >= 1 ? floored : fallback;
}

/**
 * Create a cursor telemetry buffer.
 *
 * Numeric options are sanitized: non-finite, negative, or zero values fall
 * back to safe defaults so a bad caller cannot disable the memory bounds
 * (which would turn the trim loops into infinite loops).
 *
 * @see CursorTelemetryBuffer for the full lifecycle contract.
 */
export function createCursorTelemetryBuffer(
	options: CursorTelemetryBufferOptions,
): CursorTelemetryBuffer {
	const maxActive = sanitizeLimit(options.maxActiveSamples, DEFAULT_MAX_ACTIVE_SAMPLES);
	const maxPending = sanitizeLimit(options.maxPendingBatches, DEFAULT_MAX_PENDING_BATCHES);

	let active: CursorTelemetryPoint[] = [];
	let activeRecordingId: number | null = null;
	let pending: CursorTelemetryBatch[] = [];

	return {
		startSession(recordingId) {
			active = [];
			activeRecordingId = recordingId;
		},
		push(point) {
			active.push(point);
			if (active.length > maxActive) {
				active.shift();
			}
		},
		endSession() {
			let dropped = 0;
			if (active.length > 0 && activeRecordingId !== null) {
				pending.push({ recordingId: activeRecordingId, samples: active });
				while (pending.length > maxPending) {
					pending.shift();
					dropped++;
				}
			}
			active = [];
			activeRecordingId = null;
			if (dropped > 0) {
				console.warn(
					`[cursorTelemetryBuffer] dropped ${dropped} pending batch(es) to stay within maxPendingBatches=${maxPending}`,
				);
			}
			return dropped;
		},
		takeNextBatch() {
			return pending.shift() ?? null;
		},
		prependBatch(batch) {
			if (batch.samples.length === 0) return;
			pending.unshift(batch);
			let dropped = 0;
			while (pending.length > maxPending) {
				pending.pop();
				dropped++;
			}
			if (dropped > 0) {
				console.warn(
					`[cursorTelemetryBuffer] prependBatch trimmed ${dropped} trailing batch(es) to stay within maxPendingBatches=${maxPending}`,
				);
			}
		},
		discardBatch(recordingId) {
			const idx = pending.findIndex((b) => b.recordingId === recordingId);
			if (idx === -1) return false;
			pending.splice(idx, 1);
			return true;
		},
		reset() {
			active = [];
			activeRecordingId = null;
			pending = [];
		},
		get activeCount() {
			return active.length;
		},
		get pendingCount() {
			return pending.length;
		},
	};
}
