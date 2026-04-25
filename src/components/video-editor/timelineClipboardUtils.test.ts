import { describe, expect, it } from "vitest";
import {
	cloneAnnotationRegion,
	getPastedAnnotationPosition,
	spansOverlap,
} from "./timelineClipboardUtils";
import type { AnnotationRegion } from "./types";

function createAnnotationRegion(overrides: Partial<AnnotationRegion> = {}): AnnotationRegion {
	return {
		id: "annotation-1",
		startMs: 100,
		endMs: 600,
		type: "blur",
		content: "",
		position: { x: 10, y: 15 },
		size: { width: 30, height: 20 },
		style: {
			color: "#fff",
			backgroundColor: "transparent",
			fontSize: 32,
			fontFamily: "Inter",
			fontWeight: "bold",
			fontStyle: "normal",
			textDecoration: "none",
			textAlign: "center",
		},
		zIndex: 1,
		blurData: {
			type: "mosaic",
			shape: "freehand",
			color: "white",
			intensity: 12,
			blockSize: 8,
			freehandPoints: [
				{ x: 10, y: 20 },
				{ x: 30, y: 40 },
			],
		},
		...overrides,
	};
}

describe("timelineClipboardUtils", () => {
	it("deep clones nested annotation data", () => {
		const original = createAnnotationRegion();
		const cloned = cloneAnnotationRegion(original);

		expect(cloned).toEqual(original);
		expect(cloned).not.toBe(original);
		expect(cloned.position).not.toBe(original.position);
		expect(cloned.size).not.toBe(original.size);
		expect(cloned.style).not.toBe(original.style);
		expect(cloned.blurData).not.toBe(original.blurData);
		expect(cloned.blurData?.freehandPoints).not.toBe(original.blurData?.freehandPoints);
		expect(cloned.blurData?.freehandPoints?.[0]).not.toBe(original.blurData?.freehandPoints?.[0]);
	});

	it("detects true overlaps but not adjacent spans", () => {
		expect(spansOverlap(100, 200, 150, 250)).toBe(true);
		expect(spansOverlap(100, 200, 200, 300)).toBe(false);
		expect(spansOverlap(100, 200, 0, 100)).toBe(false);
	});

	it("preserves pasted annotation positions when they are already in bounds", () => {
		expect(getPastedAnnotationPosition({ x: 10, y: 15 }, { width: 30, height: 20 })).toEqual({
			x: 10,
			y: 15,
		});
	});

	it("clamps pasted annotation positions when the source would overflow its bounds", () => {
		expect(getPastedAnnotationPosition({ x: 94, y: 93 }, { width: 12, height: 9 })).toEqual({
			x: 88,
			y: 91,
		});
	});

	it("pins oversized pasted annotations to the visible origin", () => {
		expect(getPastedAnnotationPosition({ x: 50, y: 50 }, { width: 140, height: 120 })).toEqual({
			x: 0,
			y: 0,
		});
	});
});
