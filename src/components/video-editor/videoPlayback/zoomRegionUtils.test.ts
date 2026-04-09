import { describe, expect, it } from "vitest";
import type { ZoomRegion } from "../types";
import { computeRegionStrength, findDominantRegion } from "./zoomRegionUtils";

function createRegion(overrides: Partial<ZoomRegion>): ZoomRegion {
	return {
		id: "zoom-1",
		startMs: 1000,
		endMs: 2200,
		depth: 2,
		focus: { cx: 0.5, cy: 0.5 },
		focusMode: "manual",
		...overrides,
	};
}

describe("zoomRegionUtils", () => {
	it("uses a springier zoom-in curve that ramps up quickly", () => {
		const region = createRegion({});
		const leadInStart = region.startMs + 500 - 1015.05 * 1.5;
		const halfwayTime = leadInStart + (1015.05 * 1.5) / 2;

		const strength = computeRegionStrength(region, halfwayTime);
		expect(strength).toBeGreaterThan(0.7);
		expect(strength).toBeLessThan(1);
	});

	it("creates a connected transition for nearby compatible regions", () => {
		const regions: ZoomRegion[] = [
			createRegion({ id: "a", startMs: 1000, endMs: 1800, focus: { cx: 0.42, cy: 0.48 } }),
			createRegion({ id: "b", startMs: 2300, endMs: 3200, focus: { cx: 0.5, cy: 0.52 } }),
		];

		const result = findDominantRegion(regions, 2000, { connectZooms: true });
		expect(result.transition).not.toBeNull();
		expect(result.strength).toBe(1);
		expect(result.region?.id).toBe("b");
	});

	it("does not connect distant manual focus regions just because the gap is short", () => {
		const regions: ZoomRegion[] = [
			createRegion({ id: "a", startMs: 1000, endMs: 1800, focus: { cx: 0.1, cy: 0.1 } }),
			createRegion({ id: "b", startMs: 2300, endMs: 3200, focus: { cx: 0.9, cy: 0.9 } }),
		];

		const result = findDominantRegion(regions, 2000, { connectZooms: true });
		expect(result.transition).toBeNull();
	});
});
