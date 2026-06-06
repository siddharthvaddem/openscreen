import { describe, expect, it } from "vitest";
import {
	createRecordingAnnotationElement,
	isRecordingAnnotationTool,
	type RecordingAnnotationPoint,
	removeRecordingAnnotationsAtPoint,
} from "./recordingAnnotations";

const start: RecordingAnnotationPoint = { x: 10, y: 20 };
const end: RecordingAnnotationPoint = { x: 110, y: 80 };

describe("recording annotation tools", () => {
	it("validates the built-in recording annotation tools", () => {
		expect(isRecordingAnnotationTool("pen")).toBe(true);
		expect(isRecordingAnnotationTool("arrow")).toBe(true);
		expect(isRecordingAnnotationTool("rectangle")).toBe(true);
		expect(isRecordingAnnotationTool("ellipse")).toBe(true);
		expect(isRecordingAnnotationTool("highlight")).toBe(true);
		expect(isRecordingAnnotationTool("text")).toBe(true);
		expect(isRecordingAnnotationTool("crop")).toBe(false);
	});

	it("creates a freehand pen element from sampled points", () => {
		const element = createRecordingAnnotationElement({
			id: "annotation-1",
			tool: "pen",
			points: [start, { x: 45, y: 52 }, end],
		});

		expect(element).toMatchObject({
			id: "annotation-1",
			tool: "pen",
			points: [start, { x: 45, y: 52 }, end],
			stroke: "#ff3b30",
			strokeWidth: 5,
		});
	});

	it("creates arrow, shape, highlight, and text elements with tool-specific defaults", () => {
		expect(
			createRecordingAnnotationElement({
				id: "arrow-1",
				tool: "arrow",
				points: [start, end],
			}),
		).toMatchObject({ tool: "arrow", strokeWidth: 7 });

		expect(
			createRecordingAnnotationElement({
				id: "rect-1",
				tool: "rectangle",
				points: [start, end],
			}),
		).toMatchObject({ tool: "rectangle", fill: "transparent", strokeWidth: 5 });

		expect(
			createRecordingAnnotationElement({
				id: "highlight-1",
				tool: "highlight",
				points: [start, end],
			}),
		).toMatchObject({ tool: "highlight", stroke: "rgba(255, 214, 10, 0.48)", strokeWidth: 28 });

		expect(
			createRecordingAnnotationElement({
				id: "text-1",
				tool: "text",
				points: [start],
				text: "Ship this",
			}),
		).toMatchObject({ tool: "text", text: "Ship this", fontSize: 32 });
	});

	it("removes annotations hit by a right-button erase point", () => {
		const pen = createRecordingAnnotationElement({
			id: "pen-1",
			tool: "pen",
			points: [
				{ x: 10, y: 10 },
				{ x: 80, y: 10 },
			],
		});
		const arrow = createRecordingAnnotationElement({
			id: "arrow-1",
			tool: "arrow",
			points: [
				{ x: 200, y: 200 },
				{ x: 260, y: 260 },
			],
		});

		const next = removeRecordingAnnotationsAtPoint([pen, arrow], { x: 42, y: 13 });

		expect(next.map((element) => element.id)).toEqual(["arrow-1"]);
	});
});
