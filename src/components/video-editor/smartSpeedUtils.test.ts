import { describe, expect, it } from "vitest";
import { detectSmartSpeedRegions } from "./smartSpeedUtils";

// Balanced profile constants used in assertions:
//   leadInMs = 220, tailOutMs = 220, minIdleMs = 1900, speed = 2
// SPEECH_BREATH_BUFFER_MS = 200

describe("smartSpeedUtils", () => {
	it("detects long cursor idle runs and converts them into smart speed regions", () => {
		const regions = detectSmartSpeedRegions({
			cursorTelemetry: [
				{ timeMs: 0, cx: 0.2, cy: 0.2 },
				{ timeMs: 500, cx: 0.201, cy: 0.201 },
				{ timeMs: 1200, cx: 0.202, cy: 0.201 },
				{ timeMs: 2500, cx: 0.202, cy: 0.202 },
				{ timeMs: 3200, cx: 0.202, cy: 0.202 },
				{ timeMs: 3600, cx: 0.4, cy: 0.4 },
			],
			silentIntervals: [{ startMs: 800, endMs: 3400 }],
			zoomRegions: [],
			trimRegions: [],
			speedRegions: [],
			totalMs: 5000,
			enabled: true,
			intensity: "balanced",
		});

		expect(regions.length).toBe(1);
		expect(regions[0].id.startsWith("smart-speed-")).toBe(true);
		expect(regions[0].speed).toBe(2);
	});

	it("avoids creating smart speed regions when overlapping zoom or manual speed regions exist", () => {
		const regions = detectSmartSpeedRegions({
			cursorTelemetry: [
				{ timeMs: 0, cx: 0.2, cy: 0.2 },
				{ timeMs: 600, cx: 0.201, cy: 0.201 },
				{ timeMs: 1400, cx: 0.202, cy: 0.201 },
				{ timeMs: 2600, cx: 0.202, cy: 0.202 },
				{ timeMs: 3200, cx: 0.202, cy: 0.202 },
			],
			zoomRegions: [
				{
					id: "z1",
					startMs: 1200,
					endMs: 2600,
					depth: 2,
					focus: { cx: 0.2, cy: 0.2 },
					focusMode: "manual",
				},
			],
			trimRegions: [],
			speedRegions: [],
			totalMs: 5000,
			enabled: true,
			intensity: "balanced",
		});

		expect(regions).toHaveLength(0);
	});

	// --- breath-safe silence clamping ---

	it("clamps speed region inside silence boundaries with SPEECH_BREATH_BUFFER_MS margin on each side", () => {
		// Cursor is idle 0→4000 ms; silence is [1000, 3000].
		// leadIn=220 → raw startMs=220, tailOut=220 → raw endMs=3780.
		// Best silence overlap: [1000,3000].
		// After breath buffer: startMs = max(220, 1000+200) = 1200
		//                      endMs   = min(3780, 3000-200) = 2800
		const regions = detectSmartSpeedRegions({
			cursorTelemetry: [
				{ timeMs: 0, cx: 0.2, cy: 0.2 },
				{ timeMs: 500, cx: 0.201, cy: 0.201 },
				{ timeMs: 4000, cx: 0.202, cy: 0.202 },
				{ timeMs: 5000, cx: 0.8, cy: 0.8 },
			],
			silentIntervals: [{ startMs: 1000, endMs: 3000 }],
			zoomRegions: [],
			trimRegions: [],
			speedRegions: [],
			totalMs: 6000,
			enabled: true,
			intensity: "balanced",
		});

		expect(regions).toHaveLength(1);
		expect(regions[0].startMs).toBe(1200);
		expect(regions[0].endMs).toBe(2800);
	});

	it("rejects a speed region whose silence overlap is too small to survive the breath buffer", () => {
		// Cursor is idle 0→2500 ms; silence only starts at 2200 (tiny overlap).
		// leadIn=220 → raw startMs=220, tailOut=220 → raw endMs=2280.
		// Best silence overlap: [2200,3500]; overlap = 2280-2200 = 80 ms.
		// After breath buffer: startMs = max(220, 2200+200) = 2400
		//                      endMs   = min(2280, 3500-200) = 2280  → endMs < startMs → reject.
		const regions = detectSmartSpeedRegions({
			cursorTelemetry: [
				{ timeMs: 0, cx: 0.2, cy: 0.2 },
				{ timeMs: 500, cx: 0.201, cy: 0.201 },
				{ timeMs: 2500, cx: 0.202, cy: 0.202 },
				{ timeMs: 3000, cx: 0.8, cy: 0.8 },
			],
			silentIntervals: [{ startMs: 2200, endMs: 3500 }],
			zoomRegions: [],
			trimRegions: [],
			speedRegions: [],
			totalMs: 4000,
			enabled: true,
			intensity: "balanced",
		});

		expect(regions).toHaveLength(0);
	});

	it("rejects a speed region that has no silence overlap when silentIntervals are provided", () => {
		// Silence is entirely after the cursor idle run.
		const regions = detectSmartSpeedRegions({
			cursorTelemetry: [
				{ timeMs: 0, cx: 0.2, cy: 0.2 },
				{ timeMs: 500, cx: 0.201, cy: 0.201 },
				{ timeMs: 2500, cx: 0.202, cy: 0.202 },
				{ timeMs: 3000, cx: 0.8, cy: 0.8 },
			],
			silentIntervals: [{ startMs: 3500, endMs: 5000 }],
			zoomRegions: [],
			trimRegions: [],
			speedRegions: [],
			totalMs: 6000,
			enabled: true,
			intensity: "balanced",
		});

		expect(regions).toHaveLength(0);
	});

	it("creates a speed region without silence constraints when silentIntervals is not provided", () => {
		// No silentIntervals → cursor idle alone determines the region.
		// Idle 0→3200 ms; leadIn=220 → startMs=220, tailOut=220 → endMs=2980.
		const regions = detectSmartSpeedRegions({
			cursorTelemetry: [
				{ timeMs: 0, cx: 0.2, cy: 0.2 },
				{ timeMs: 500, cx: 0.201, cy: 0.201 },
				{ timeMs: 3200, cx: 0.202, cy: 0.202 },
				{ timeMs: 4000, cx: 0.8, cy: 0.8 },
			],
			zoomRegions: [],
			trimRegions: [],
			speedRegions: [],
			totalMs: 5000,
			enabled: true,
			intensity: "balanced",
		});

		expect(regions).toHaveLength(1);
		expect(regions[0].startMs).toBe(220);
		expect(regions[0].endMs).toBe(2980);
		expect(regions[0].speed).toBe(2);
	});

	it("protects key-sample timestamps even when silence would otherwise allow a speed region", () => {
		// Key press at 1500 ms is protected ±250/500 ms → [1250, 2000].
		// Speed region would otherwise be [1200, 2800] after breath buffer.
		// Since [1200,2800] overlaps [1250,2000] → rejected.
		const regions = detectSmartSpeedRegions({
			cursorTelemetry: [
				{ timeMs: 0, cx: 0.2, cy: 0.2 },
				{ timeMs: 500, cx: 0.201, cy: 0.201 },
				{ timeMs: 4000, cx: 0.202, cy: 0.202 },
				{ timeMs: 5000, cx: 0.8, cy: 0.8 },
			],
			silentIntervals: [{ startMs: 1000, endMs: 3000 }],
			keySamples: [{ timeMs: 1500, key: "a", type: "keydown" }],
			zoomRegions: [],
			trimRegions: [],
			speedRegions: [],
			totalMs: 6000,
			enabled: true,
			intensity: "balanced",
		});

		expect(regions).toHaveLength(0);
	});
});
