import { describe, expect, it } from "vitest";
import type { CursorRecordingData, CursorRecordingSample } from "@/native/contracts";
import { getSmoothedCursorPath } from "./cursorPathSmoothing";

function makeRecording(samples: CursorRecordingSample[]): CursorRecordingData {
	return { version: 2, provider: "native", assets: [], samples };
}

/** Roughness proxy: sum of squared second differences of x on a uniform grid. */
function roughness(
	sampleAt: (t: number) => { cx: number; cy: number } | null,
	t0: number,
	t1: number,
) {
	const xs: number[] = [];
	for (let t = t0; t <= t1; t += 5) {
		const p = sampleAt(t);
		if (p) xs.push(p.cx);
	}
	let acc = 0;
	for (let i = 2; i < xs.length; i++) {
		const d2 = xs[i] - 2 * xs[i - 1] + xs[i - 2];
		acc += d2 * d2;
	}
	return acc;
}

describe("cursor path smoothing", () => {
	it("removes high-frequency jitter while tracking the overall path", () => {
		// A rightward drift with alternating zig-zag noise on cy, then a dwell at the end.
		const samples: CursorRecordingSample[] = [];
		for (let i = 0; i <= 40; i++) {
			samples.push({
				timeMs: i * 33,
				cx: 0.2 + (i / 40) * 0.6,
				cy: 0.5 + (i % 2 === 0 ? 0.05 : -0.05),
				visible: true,
			});
		}
		const driftEnd = samples[samples.length - 1].timeMs;
		for (let i = 1; i <= 60; i++) {
			samples.push({ timeMs: driftEnd + i * 33, cx: 0.8, cy: 0.5, visible: true });
		}
		const data = makeRecording(samples);
		const smoothed = getSmoothedCursorPath(data, 0.7)!;
		const raw = getSmoothedCursorPath(makeRecording(samples), 0)!;

		// Compare jitter on the cy channel (where the zig-zag lives) over the moving portion.
		const cyAt = (path: typeof smoothed) => (t: number) => {
			const p = path.sampleAt(t);
			return p ? { cx: p.cy, cy: p.cx } : null;
		};
		const smoothRough = roughness(cyAt(smoothed), 0, driftEnd);
		const rawRough = roughness(cyAt(raw), 0, driftEnd);
		expect(smoothRough).toBeLessThan(rawRough * 0.25);

		// After the cursor rests, the spring settles onto the true target (click accuracy).
		const end = samples[samples.length - 1].timeMs;
		const last = smoothed.sampleAt(end)!;
		expect(last.cx).toBeCloseTo(0.8, 2);
		expect(last.cy).toBeCloseTo(0.5, 2);
	});

	it("is a passthrough at smoothing 0", () => {
		const samples: CursorRecordingSample[] = [
			{ timeMs: 0, cx: 0.1, cy: 0.1, visible: true },
			{ timeMs: 100, cx: 0.9, cy: 0.4, visible: true },
		];
		const path = getSmoothedCursorPath(makeRecording(samples), 0)!;
		expect(path.sampleAt(0)).toEqual({ cx: 0.1, cy: 0.1 });
		expect(path.sampleAt(50)!.cx).toBeCloseTo(0.5, 5);
		expect(path.sampleAt(100)).toEqual({ cx: 0.9, cy: 0.4 });
	});

	it("respects visibility gaps and never smooths across them", () => {
		const samples: CursorRecordingSample[] = [
			{ timeMs: 0, cx: 0.2, cy: 0.2, visible: true },
			{ timeMs: 100, cx: 0.3, cy: 0.3, visible: true },
			{ timeMs: 150, cx: 0.3, cy: 0.3, visible: false },
			{ timeMs: 200, cx: 0.8, cy: 0.8, visible: true },
			{ timeMs: 300, cx: 0.9, cy: 0.9, visible: true },
		];
		const path = getSmoothedCursorPath(makeRecording(samples), 0.6)!;
		expect(path.sampleAt(50)).not.toBeNull();
		expect(path.sampleAt(160)).toBeNull(); // inside the hidden gap
		expect(path.sampleAt(250)).not.toBeNull();
	});

	it("is deterministic for identical inputs", () => {
		const build = () =>
			getSmoothedCursorPath(
				makeRecording([
					{ timeMs: 0, cx: 0.1, cy: 0.5, visible: true },
					{ timeMs: 50, cx: 0.4, cy: 0.55, visible: true },
					{ timeMs: 120, cx: 0.7, cy: 0.45, visible: true },
				]),
				0.65,
			)!;
		const a = build();
		const b = build();
		for (const t of [0, 25, 60, 90, 120]) {
			expect(a.sampleAt(t)).toEqual(b.sampleAt(t));
		}
	});

	it("returns null when there is no cursor data", () => {
		expect(getSmoothedCursorPath(null, 0.5)).toBeNull();
		expect(getSmoothedCursorPath(makeRecording([]), 0.5)).toBeNull();
	});
});
