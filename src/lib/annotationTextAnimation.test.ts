import { describe, expect, it } from "vitest";
import { getTextAnimationState, normalizeTextAnimation } from "./annotationTextAnimation";

describe("annotation text animations", () => {
	it("normalizes unknown animation values to none", () => {
		expect(normalizeTextAnimation("rise")).toBe("rise");
		expect(normalizeTextAnimation("not-real")).toBe("none");
		expect(normalizeTextAnimation(undefined)).toBe("none");
	});

	it("returns a settled state when animation is disabled", () => {
		expect(
			getTextAnimationState(
				{
					startMs: 1000,
					style: { textAnimation: "none" },
				},
				1000,
			),
		).toEqual({
			opacity: 1,
			scale: 1,
			translateX: 0,
			translateY: 0,
			revealProgress: 1,
		});
	});

	it("eases rise animations into place over time", () => {
		const initial = getTextAnimationState(
			{
				startMs: 1000,
				style: { textAnimation: "rise" },
			},
			1000,
		);
		const settled = getTextAnimationState(
			{
				startMs: 1000,
				style: { textAnimation: "rise" },
			},
			2000,
		);

		expect(initial.opacity).toBe(0);
		expect(initial.translateY).toBeGreaterThan(0);
		expect(settled.opacity).toBe(1);
		expect(settled.translateY).toBe(0);
	});
});
