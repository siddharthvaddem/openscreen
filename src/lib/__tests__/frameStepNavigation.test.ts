import { describe, expect, it } from "vitest";

import { computeFrameStepTime, FRAME_DURATION_SEC } from "@/lib/frameStep";

describe("computeFrameStepTime", () => {
	const duration = 10;

	it("moves forward by one frame from the middle", () => {
		const result = computeFrameStepTime(5, duration, "forward");
		expect(result).toBeCloseTo(5 + FRAME_DURATION_SEC, 10);
	});

	it("moves backward by one frame from the middle", () => {
		const result = computeFrameStepTime(5, duration, "backward");
		expect(result).toBeCloseTo(5 - FRAME_DURATION_SEC, 10);
	});

	it("clamps to 0 when stepping backward at the beginning", () => {
		const result = computeFrameStepTime(0, duration, "backward");
		expect(result).toBe(0);
	});

	it("clamps to 0 when stepping backward near the beginning", () => {
		const result = computeFrameStepTime(FRAME_DURATION_SEC / 2, duration, "backward");
		expect(result).toBe(0);
	});

	it("clamps to duration when stepping forward at the end", () => {
		const result = computeFrameStepTime(duration, duration, "forward");
		expect(result).toBe(duration);
	});

	it("clamps to duration when stepping forward near the end", () => {
		const result = computeFrameStepTime(duration - FRAME_DURATION_SEC / 2, duration, "forward");
		expect(result).toBe(duration);
	});

	it("handles duration of 0 gracefully", () => {
		expect(computeFrameStepTime(0, 0, "forward")).toBe(0);
		expect(computeFrameStepTime(0, 0, "backward")).toBe(0);
	});
});
