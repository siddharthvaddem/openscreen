import { describe, expect, it } from "vitest";
import { getNativeAspectRatioValue } from "./aspectRatioUtils";

const FALLBACK = 16 / 9;

describe("getNativeAspectRatioValue", () => {
	it("returns the natural video ratio for a standard HD frame", () => {
		expect(getNativeAspectRatioValue(1920, 1080)).toBeCloseTo(16 / 9);
	});

	it("applies the crop region when provided", () => {
		const crop = { x: 0, y: 0, width: 0.5, height: 0.5 };
		expect(getNativeAspectRatioValue(1920, 1080, crop)).toBeCloseTo(16 / 9);
	});

	it("falls back to 16/9 when video metadata is not yet loaded (height = 0)", () => {
		expect(getNativeAspectRatioValue(1920, 0)).toBe(FALLBACK);
	});

	it("falls back to 16/9 when both dimensions are zero", () => {
		expect(getNativeAspectRatioValue(0, 0)).toBe(FALLBACK);
	});

	it("falls back to 16/9 when the crop height collapses to zero", () => {
		const crop = { x: 0, y: 0, width: 0.5, height: 0 };
		expect(getNativeAspectRatioValue(1920, 1080, crop)).toBe(FALLBACK);
	});

	it("falls back to 16/9 when inputs are NaN", () => {
		expect(getNativeAspectRatioValue(Number.NaN, 1080)).toBe(FALLBACK);
		expect(getNativeAspectRatioValue(1920, Number.NaN)).toBe(FALLBACK);
	});

	it("falls back to 16/9 for non-positive dimensions", () => {
		expect(getNativeAspectRatioValue(-1920, 1080)).toBe(FALLBACK);
		expect(getNativeAspectRatioValue(1920, -1080)).toBe(FALLBACK);
	});

	it("never returns Infinity, NaN, or a non-positive ratio", () => {
		const pathologicalInputs: Array<[number, number]> = [
			[0, 0],
			[1920, 0],
			[0, 1080],
			[Number.POSITIVE_INFINITY, 1080],
			[1920, Number.POSITIVE_INFINITY],
			[Number.NaN, Number.NaN],
		];
		for (const [w, h] of pathologicalInputs) {
			const ratio = getNativeAspectRatioValue(w, h);
			expect(Number.isFinite(ratio)).toBe(true);
			expect(ratio).toBeGreaterThan(0);
		}
	});
});
