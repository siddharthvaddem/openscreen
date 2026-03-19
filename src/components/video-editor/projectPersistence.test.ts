import { describe, expect, it } from "vitest";
import {
	createProjectData,
	normalizeProjectEditor,
	PROJECT_VERSION,
	resolveProjectMedia,
	validateProjectData,
} from "./projectPersistence";

describe("projectPersistence media compatibility", () => {
	it("accepts legacy projects with a single videoPath", () => {
		const project = {
			version: 1,
			videoPath: "/tmp/screen.webm",
			editor: {},
		};

		expect(validateProjectData(project)).toBe(true);
		expect(resolveProjectMedia(project)).toEqual({
			screenVideoPath: "/tmp/screen.webm",
		});
	});

	it("creates version 2 projects with explicit media", () => {
		const project = createProjectData(
			{
				screenVideoPath: "/tmp/screen.webm",
				webcamVideoPath: "/tmp/webcam.webm",
			},
			{
				wallpaper: "/wallpapers/wallpaper1.jpg",
				shadowIntensity: 0,
				showBlur: false,
				motionBlurAmount: 0,
				borderRadius: 0,
				padding: 50,
				cropRegion: { x: 0, y: 0, width: 1, height: 1 },
				zoomRegions: [],
				trimRegions: [],
				speedRegions: [],
				annotationRegions: [],
				aspectRatio: "16:9",
				showCursorHighlight: false,
				cursorStyle: "glow",
				cursorColor: "#ffcc00",
				cursorSize: 53,
				cursorOpacity: 0.6,
				cursorStrokeWidth: 2,
				exportQuality: "good",
				exportFormat: "mp4",
				gifFrameRate: 15,
				gifLoop: true,
				gifSizePreset: "medium",
			},
		);

		expect(project.version).toBe(PROJECT_VERSION);
		expect(project.media).toEqual({
			screenVideoPath: "/tmp/screen.webm",
			webcamVideoPath: "/tmp/webcam.webm",
		});
		expect(validateProjectData(project)).toBe(true);
	});
});

describe("normalizeProjectEditor cursor fields", () => {
	it("provides defaults for missing cursor fields", () => {
		const result = normalizeProjectEditor({});
		expect(result.showCursorHighlight).toBe(false);
		expect(result.cursorStyle).toBe("glow");
		expect(result.cursorColor).toBe("#ffcc00");
		expect(result.cursorSize).toBe(53);
		expect(result.cursorOpacity).toBe(0.6);
		expect(result.cursorStrokeWidth).toBe(2);
	});

	it("passes through valid cursor fields", () => {
		const result = normalizeProjectEditor({
			showCursorHighlight: true,
			cursorStyle: "dot",
			cursorColor: "#ff0000",
			cursorSize: 48,
		});
		expect(result.showCursorHighlight).toBe(true);
		expect(result.cursorStyle).toBe("dot");
		expect(result.cursorColor).toBe("#ff0000");
		expect(result.cursorSize).toBe(48);
	});

	it("falls back on invalid cursor color", () => {
		const result = normalizeProjectEditor({
			cursorColor: "not-a-color",
		});
		expect(result.cursorColor).toBe("#ffcc00");
	});

	it("clamps out-of-range cursor size", () => {
		expect(normalizeProjectEditor({ cursorSize: 5 }).cursorSize).toBe(16);
		expect(normalizeProjectEditor({ cursorSize: 100 }).cursorSize).toBe(64);
	});

	it("falls back on invalid cursor style", () => {
		const result = normalizeProjectEditor({ cursorStyle: "invalid" as never });
		expect(result.cursorStyle).toBe("glow");
	});

	it("accepts glow as valid cursor style", () => {
		const result = normalizeProjectEditor({ cursorStyle: "glow" });
		expect(result.cursorStyle).toBe("glow");
	});
});
