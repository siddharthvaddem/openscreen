import { describe, expect, it } from "vitest";
import { getNativeAspectRatioValue } from "./aspectRatioUtils";

const FALLBACK = 16 / 9;

describe("getNativeAspectRatioValue", () => {
	it("returns the natural video ratio for a standard HD frame", () => {
		expect(getNativeAspectRatioValue(1920, 1080)).toBeCloseTo(16 / 9);
	});

	it("applies the crop region when provided", () => {
		// Use non-proportional crop dimensions so the ratio actually changes;
		// equal width/height would cancel out and silently pass even if the
		// crop were ignored.
		const crop = { x: 0, y: 0, width: 0.75, height: 0.5 };
		expect(getNativeAspectRatioValue(1920, 1080, crop)).toBeCloseTo((1920 * 0.75) / (1080 * 0.5));
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
		const pathologicalInputs: Array<
			[number, number, { x: number; y: number; width: number; height: number }?]
		> = [
			[0, 0],
			[1920, 0],
			[0, 1080],
			[Number.POSITIVE_INFINITY, 1080],
			[1920, Number.POSITIVE_INFINITY],
			[Number.NaN, Number.NaN],
			// Same idea, but exercising the crop-region branch so a future
			// regression there can't slip past the dimension-only cases above.
			[1920, 1080, { x: 0, y: 0, width: 0.5, height: 0 }],
			[1920, 1080, { x: 0, y: 0, width: 0, height: 0.5 }],
			[1920, 1080, { x: 0, y: 0, width: Number.NaN, height: 0.5 }],
			[1920, 1080, { x: 0, y: 0, width: 0.5, height: Number.NaN }],
			[1920, 1080, { x: 0, y: 0, width: Number.POSITIVE_INFINITY, height: 0.5 }],
			[1920, 1080, { x: 0, y: 0, width: 0.5, height: -1 }],
		];
		for (const [w, h, crop] of pathologicalInputs) {
			const ratio = getNativeAspectRatioValue(w, h, crop);
			expect(Number.isFinite(ratio)).toBe(true);
			expect(ratio).toBeGreaterThan(0);
		}
	});
});
