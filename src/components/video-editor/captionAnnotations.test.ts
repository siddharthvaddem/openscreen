import { describe, expect, it } from "vitest";
import { createCaptionAnnotations } from "./captionAnnotations";

describe("createCaptionAnnotations", () => {
	it("maps caption segments to bottom-centered text annotations", () => {
		const annotations = createCaptionAnnotations(
			[
				{ id: "caption-1", startMs: 100, endMs: 1200, text: "First line" },
				{ id: "caption-2", startMs: 1300, endMs: 2600, text: "Second line" },
			],
			{ existingIds: [], startZIndex: 7 },
		);

		expect(annotations).toHaveLength(2);
		expect(annotations[0]).toMatchObject({
			id: "caption-1",
			type: "text",
			content: "First line",
			textContent: "First line",
			startMs: 100,
			endMs: 1200,
			position: { x: 10, y: 78 },
			size: { width: 80, height: 14 },
			zIndex: 7,
		});
		expect(annotations[0].style).toMatchObject({
			color: "#ffffff",
			backgroundColor: "rgba(0, 0, 0, 0.58)",
			fontWeight: "bold",
			textAlign: "center",
		});
		expect(annotations[1].zIndex).toBe(8);
	});

	it("keeps generated IDs unique when a project already contains caption IDs", () => {
		const annotations = createCaptionAnnotations(
			[{ id: "caption-1", startMs: 0, endMs: 1000, text: "Generated" }],
			{ existingIds: ["caption-1"], startZIndex: 1 },
		);

		expect(annotations[0].id).toBe("caption-2");
	});
});
