import { describe, expect, it } from "vitest";
import type { CursorTelemetryPoint } from "../types";
import { detectZoomDwellCandidates } from "./zoomSuggestionUtils";

function makeSamples(points: Array<[number, number, number]>): CursorTelemetryPoint[] {
	return points.map(([timeMs, cx, cy]) => ({ timeMs, cx, cy }));
}

describe("zoomSuggestionUtils", () => {
	it("merges nearby dwell candidates with similar focus", () => {
		const samples = makeSamples([
			[0, 0.4, 0.4],
			[300, 0.401, 0.401],
			[700, 0.402, 0.4],
			[900, 0.44, 0.44],
			[1200, 0.404, 0.402],
			[1500, 0.403, 0.401],
			[1900, 0.404, 0.4],
			[2300, 0.405, 0.401],
		]);

		const candidates = detectZoomDwellCandidates(samples);
		expect(candidates).toHaveLength(1);
		expect(candidates[0].centerTimeMs).toBeGreaterThan(900);
		expect(candidates[0].centerTimeMs).toBeLessThan(1500);
	});

	it("keeps separate dwell candidates when focus changes significantly", () => {
		const samples = makeSamples([
			[0, 0.2, 0.2],
			[300, 0.201, 0.201],
			[700, 0.2, 0.202],
			[1000, 0.2, 0.201],
			[1400, 0.8, 0.8],
			[1700, 0.801, 0.8],
			[2100, 0.802, 0.801],
			[2500, 0.801, 0.8],
		]);

		const candidates = detectZoomDwellCandidates(samples);
		expect(candidates).toHaveLength(2);
	});
});
