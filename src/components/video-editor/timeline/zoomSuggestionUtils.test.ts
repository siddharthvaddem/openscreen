import { describe, expect, it } from "vitest";
import type { CursorTelemetryPoint } from "../types";
import { detectZoomCandidates, detectZoomClickCandidates } from "./zoomSuggestionUtils";

describe("detectZoomClickCandidates", () => {
	it("returns no candidates when there are no click samples", () => {
		const samples: CursorTelemetryPoint[] = [
			{ timeMs: 0, cx: 0.1, cy: 0.1, interactionType: "move" },
			{ timeMs: 100, cx: 0.2, cy: 0.2, interactionType: "move" },
		];
		expect(detectZoomClickCandidates(samples)).toEqual([]);
	});

	it("creates one candidate per isolated click", () => {
		const samples: CursorTelemetryPoint[] = [
			{ timeMs: 1000, cx: 0.3, cy: 0.4, interactionType: "click" },
			{ timeMs: 5000, cx: 0.7, cy: 0.8, interactionType: "click" },
		];
		const candidates = detectZoomClickCandidates(samples);
		expect(candidates).toHaveLength(2);
		expect(candidates[0].focus).toEqual({ cx: 0.3, cy: 0.4 });
		expect(candidates[1].focus).toEqual({ cx: 0.7, cy: 0.8 });
		expect(candidates[0].source).toBe("click");
	});

	it("clusters rapid successive clicks (double-click) into a single candidate", () => {
		const samples: CursorTelemetryPoint[] = [
			{ timeMs: 1000, cx: 0.5, cy: 0.5, interactionType: "click" },
			{ timeMs: 1200, cx: 0.5, cy: 0.5, interactionType: "click" },
			{ timeMs: 1400, cx: 0.5, cy: 0.5, interactionType: "click" },
		];
		const candidates = detectZoomClickCandidates(samples);
		expect(candidates).toHaveLength(1);
		expect(candidates[0].centerTimeMs).toBe(1200);
	});

	it("treats double-click and right-click as click interactions", () => {
		const samples: CursorTelemetryPoint[] = [
			{ timeMs: 1000, cx: 0.2, cy: 0.2, interactionType: "double-click" },
			{ timeMs: 5000, cx: 0.8, cy: 0.8, interactionType: "right-click" },
		];
		expect(detectZoomClickCandidates(samples)).toHaveLength(2);
	});
});

describe("detectZoomCandidates", () => {
	it("returns click candidates ahead of dwell candidates", () => {
		const samples: CursorTelemetryPoint[] = [
			{ timeMs: 0, cx: 0.1, cy: 0.1, interactionType: "move" },
			{ timeMs: 500, cx: 0.1, cy: 0.1, interactionType: "move" },
			{ timeMs: 1000, cx: 0.1, cy: 0.1, interactionType: "move" },
			{ timeMs: 2000, cx: 0.9, cy: 0.9, interactionType: "click" },
		];
		const candidates = detectZoomCandidates(samples);
		const clickIndex = candidates.findIndex((c) => c.source === "click");
		const dwellIndex = candidates.findIndex((c) => c.source === "dwell");
		expect(clickIndex).toBeGreaterThanOrEqual(0);
		expect(dwellIndex).toBeGreaterThanOrEqual(0);
		expect(clickIndex).toBeLessThan(dwellIndex);
	});
});
