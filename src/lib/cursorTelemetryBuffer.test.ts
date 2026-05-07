import { describe, expect, it, vi } from "vitest";
import { type CursorTelemetryPoint, createCursorTelemetryBuffer } from "./cursorTelemetryBuffer";

function sample(tag: number): CursorTelemetryPoint {
	// Decouple the timestamp tag from the coordinate fixture so cursor
	// points stay inside the normalized [0, 1] range that real samples use.
	const normalized = (tag % 100) / 100;
	return { timeMs: tag, cx: normalized, cy: normalized };
}

describe("createCursorTelemetryBuffer", () => {
	it("stores samples captured during an active session", () => {
		const buf = createCursorTelemetryBuffer({ maxActiveSamples: 10 });
		buf.startSession(1);
		for (let i = 0; i < 3; i++) buf.push(sample(i));
		buf.endSession();

		const batch = buf.takeNextBatch();
		expect(batch?.recordingId).toBe(1);
		expect(batch?.samples).toHaveLength(3);
		expect(batch?.samples[0]?.timeMs).toBe(0);
	});

	it("trims active samples past maxActiveSamples (ring behaviour)", () => {
		const buf = createCursorTelemetryBuffer({ maxActiveSamples: 2 });
		buf.startSession(1);
		buf.push(sample(1));
		buf.push(sample(2));
		buf.push(sample(3));
		buf.endSession();

		const batch = buf.takeNextBatch();
		expect(batch?.samples).toEqual([sample(2), sample(3)]);
	});

	it("preserves earlier pending batches when a new session starts before store", () => {
		const buf = createCursorTelemetryBuffer({ maxActiveSamples: 10 });

		// Recording 1
		buf.startSession(1);
		buf.push(sample(101));
		buf.push(sample(102));
		buf.endSession();

		// Recording 2 starts before recording 1's batch has been consumed
		buf.startSession(2);
		buf.push(sample(201));
		buf.endSession();

		const batch1 = buf.takeNextBatch();
		const batch2 = buf.takeNextBatch();
		expect(batch1?.recordingId).toBe(1);
		expect(batch1?.samples.map((s) => s.timeMs)).toEqual([101, 102]);
		expect(batch2?.recordingId).toBe(2);
		expect(batch2?.samples.map((s) => s.timeMs)).toEqual([201]);
	});

	it("returns null when nothing is pending", () => {
		const buf = createCursorTelemetryBuffer({ maxActiveSamples: 10 });
		expect(buf.takeNextBatch()).toBeNull();
	});

	it("drops empty sessions instead of queuing empty batches", () => {
		const buf = createCursorTelemetryBuffer({ maxActiveSamples: 10 });
		buf.startSession(1);
		buf.endSession();
		expect(buf.pendingCount).toBe(0);
		expect(buf.takeNextBatch()).toBeNull();
	});

	it("caps the pending queue at maxPendingBatches to bound memory", () => {
		const buf = createCursorTelemetryBuffer({ maxActiveSamples: 10, maxPendingBatches: 3 });

		for (let round = 1; round <= 5; round++) {
			buf.startSession(round);
			buf.push(sample(round));
			buf.endSession();
		}

		expect(buf.pendingCount).toBe(3);
		// Oldest two batches (rounds 1 and 2) should have been dropped
		expect(buf.takeNextBatch()?.recordingId).toBe(3);
		expect(buf.takeNextBatch()?.recordingId).toBe(4);
		expect(buf.takeNextBatch()?.recordingId).toBe(5);
	});

	it("starting a new session clears in-progress samples but keeps pending batches", () => {
		const buf = createCursorTelemetryBuffer({ maxActiveSamples: 10 });

		buf.startSession(1);
		buf.push(sample(1));
		buf.endSession();

		buf.startSession(2);
		buf.push(sample(99));
		// Simulate another startSession before endSession (e.g. rapid restart)
		buf.startSession(3);
		expect(buf.activeCount).toBe(0);
		expect(buf.pendingCount).toBe(1);

		const batch = buf.takeNextBatch();
		expect(batch?.recordingId).toBe(1);
		expect(batch?.samples.map((s) => s.timeMs)).toEqual([1]);
	});

	it("discardBatch(id) drops only the batch produced by that recording id", () => {
		const buf = createCursorTelemetryBuffer({ maxActiveSamples: 10 });

		buf.startSession(1);
		buf.push(sample(1));
		buf.endSession();

		buf.startSession(2);
		buf.push(sample(2));
		buf.endSession();

		expect(buf.pendingCount).toBe(2);
		expect(buf.discardBatch(1)).toBe(true);
		expect(buf.pendingCount).toBe(1);
		expect(buf.takeNextBatch()?.recordingId).toBe(2);
	});

	it("discardBatch(id) targets the correct batch even when a later recording sits in front of it", () => {
		// Regression test for the rapid Stop → Record → Discard sequence:
		// recording A's finalize callback does async work (fixWebmDuration),
		// recording B finishes in the meantime, then A's callback resolves
		// with discard intent. The discard must drop A — not B, which
		// happens to be the *latest* pending batch by the time discard runs.
		const buf = createCursorTelemetryBuffer({ maxActiveSamples: 10 });

		buf.startSession(1);
		buf.push(sample(11));
		buf.endSession();

		buf.startSession(2);
		buf.push(sample(22));
		buf.endSession();

		expect(buf.pendingCount).toBe(2);
		expect(buf.discardBatch(1)).toBe(true);

		const remaining = buf.takeNextBatch();
		expect(remaining?.recordingId).toBe(2);
		expect(remaining?.samples.map((s) => s.timeMs)).toEqual([22]);
		expect(buf.takeNextBatch()).toBeNull();
	});

	it("discardBatch(id) is a no-op (returns false) when the id is unknown or already drained", () => {
		const buf = createCursorTelemetryBuffer({ maxActiveSamples: 10 });
		expect(buf.discardBatch(42)).toBe(false);

		buf.startSession(1);
		buf.push(sample(1));
		buf.endSession();
		buf.takeNextBatch();
		expect(buf.discardBatch(1)).toBe(false);
		expect(buf.pendingCount).toBe(0);
	});

	it("prependBatch() re-inserts a batch at the front of the queue", () => {
		const buf = createCursorTelemetryBuffer({ maxActiveSamples: 10 });

		buf.startSession(1);
		buf.push(sample(1));
		buf.endSession();

		const batch = buf.takeNextBatch();
		expect(batch).not.toBeNull();
		expect(buf.pendingCount).toBe(0);

		if (batch) buf.prependBatch(batch);
		expect(buf.pendingCount).toBe(1);
		const next = buf.takeNextBatch();
		expect(next?.recordingId).toBe(1);
		expect(next?.samples.map((s) => s.timeMs)).toEqual([1]);
	});

	it("prependBatch() ignores empty batches", () => {
		const buf = createCursorTelemetryBuffer({ maxActiveSamples: 10 });
		buf.prependBatch({ recordingId: 1, samples: [] });
		expect(buf.pendingCount).toBe(0);
	});

	it("endSession() returns the number of dropped batches and warns when the cap is exceeded", () => {
		const buf = createCursorTelemetryBuffer({ maxActiveSamples: 10, maxPendingBatches: 2 });
		const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

		for (let round = 1; round <= 2; round++) {
			buf.startSession(round);
			buf.push(sample(round));
			expect(buf.endSession()).toBe(0);
		}
		expect(warn).not.toHaveBeenCalled();

		buf.startSession(3);
		buf.push(sample(3));
		const dropped = buf.endSession();
		expect(dropped).toBe(1);
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0]?.[0]).toMatch(/dropped 1 pending batch/);
		expect(buf.pendingCount).toBe(2);

		warn.mockRestore();
	});

	it("prependBatch() defensively trims and warns when it would exceed the cap", () => {
		const buf = createCursorTelemetryBuffer({ maxActiveSamples: 10, maxPendingBatches: 2 });
		const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

		// Fill the queue to the cap without dropping anything.
		for (let round = 1; round <= 2; round++) {
			buf.startSession(round);
			buf.push(sample(round));
			buf.endSession();
		}
		expect(buf.pendingCount).toBe(2);
		expect(warn).not.toHaveBeenCalled();

		// Simulate a misuse where a retry prepends without first draining:
		// queue would grow to 3, so the oldest-trailing entry must be evicted.
		buf.prependBatch({ recordingId: 99, samples: [sample(99)] });
		expect(buf.pendingCount).toBe(2);
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0]?.[0]).toMatch(/prependBatch trimmed 1 trailing batch/);

		// Front is the prepended batch; the preserved trailing batch is round 1.
		expect(buf.takeNextBatch()?.recordingId).toBe(99);
		expect(buf.takeNextBatch()?.recordingId).toBe(1);
		expect(buf.pendingCount).toBe(0);

		warn.mockRestore();
	});

	it("sanitizes non-finite or non-positive option values to safe defaults", () => {
		// Infinity / NaN / negative would otherwise turn the trim loops
		// into infinite loops. The buffer must fall back to defaults.
		const buf = createCursorTelemetryBuffer({
			maxActiveSamples: Number.POSITIVE_INFINITY,
			maxPendingBatches: Number.NaN,
		});

		buf.startSession(1);
		buf.push(sample(1));
		expect(() => buf.endSession()).not.toThrow();
		expect(buf.pendingCount).toBe(1);

		const buf2 = createCursorTelemetryBuffer({
			maxActiveSamples: -5,
			maxPendingBatches: 0,
		});
		buf2.startSession(2);
		buf2.push(sample(2));
		expect(() => buf2.endSession()).not.toThrow();
		expect(buf2.pendingCount).toBe(1);
	});

	it("reset() clears both active and pending state", () => {
		const buf = createCursorTelemetryBuffer({ maxActiveSamples: 10 });
		buf.startSession(1);
		buf.push(sample(1));
		buf.endSession();
		buf.startSession(2);
		buf.push(sample(2));

		buf.reset();

		expect(buf.activeCount).toBe(0);
		expect(buf.pendingCount).toBe(0);
		expect(buf.takeNextBatch()).toBeNull();
	});
});
