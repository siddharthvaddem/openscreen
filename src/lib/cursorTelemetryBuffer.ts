/**
 * A single cursor telemetry sample. cx/cy are clamped [0,1] ratios of the
 * captured surface (normalised in the main process by sampleCursorPoint).
 * timeMs is the offset from recording start.
 */
export interface CursorTelemetryPoint {
	timeMs: number;
	cx: number;
	cy: number;
}

/**
 * A completed batch of cursor samples, tagged with its recording id. The id
 * (from startSession) travels with the batch through the queue, retries, and
 * discards.
 */
export interface CursorTelemetryBatch {
	recordingId: number;
	samples: CursorTelemetryPoint[];
}

/**
 * Per-session cursor telemetry buffer with bounded memory.
 *
 * Flow: startSession(recordingId), push(point) N times, endSession() enqueues
 * the samples as a batch tagged with that id. The main process drains batches
 * FIFO via takeNextBatch() to persist, and prependBatch() on write failure to
 * retry without losing order. Discard keys on the recording id so an async
 * "discard recording A" that arrives after recording B has enqueued still
 * drops the right batch.
 *
 * Memory bounded by maxActiveSamples (ring buffer on the in-progress batch)
 * and maxPendingBatches (FIFO cap across completed batches).
 */
export interface CursorTelemetryBuffer {
	/**
	 * Begin a new recording session. Clears in-progress active samples but
	 * leaves completed pending batches. Safe to call repeatedly (e.g. a rapid
	 * Stop then Record); the most recent id wins.
	 */
	startSession(recordingId: number): void;

	/**
	 * Append a sample to the active session. Over maxActiveSamples, the oldest
	 * sample is dropped (ring behaviour).
	 */
	push(point: CursorTelemetryPoint): void;

	/**
	 * Finalize the active session into a single pending batch tagged with the
	 * current recording id. Empty sessions enqueue nothing. Over
	 * maxPendingBatches, oldest batches are evicted and a warn is logged so
	 * pathological rapid-restart cases are observable.
	 *
	 * @returns the number of pending batches dropped (0 normally).
	 */
	endSession(): number;

	/** Remove and return the oldest pending batch, or null if empty. */
	takeNextBatch(): CursorTelemetryBatch | null;

	/**
	 * Re-insert a batch at the front, preserving FIFO order on retry (e.g.
	 * persisting failed and the next takeNextBatch() should yield it again).
	 * Empty batches are ignored. The pending cap is enforced defensively; in
	 * normal retry usage the trim is a no-op since the caller just took it.
	 */
	prependBatch(batch: CursorTelemetryBatch): void;

	/**
	 * Drop the pending batch for the given recordingId, when a recording is
	 * discarded after endSession() but before persistence. Returns true if a
	 * batch was removed.
	 *
	 * Keys on the recording id rather than "the latest pending batch" to avoid
	 * a bug: async finalize work (fixWebmDuration) means a quick Stop, Record,
	 * Discard can leave the latest pending batch belonging to a later recording
	 * than the one being discarded.
	 */
	discardBatch(recordingId: number): boolean;

	/** Clear active and pending state. For tests and full teardown. */
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
 * Create a cursor telemetry buffer. Options are sanitized so a bad caller
 * cannot disable the memory bounds (which would make the trim loops infinite).
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
