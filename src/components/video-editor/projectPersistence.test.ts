import { describe, expect, it } from "vitest";
import {
	createProjectData,
	createProjectSnapshot,
	hasProjectUnsavedChanges,
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
				webcamLayoutPreset: "picture-in-picture",
				webcamMaskShape: "circle",
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

	it("normalizes webcam mask shape values safely", () => {
		expect(normalizeProjectEditor({ webcamMaskShape: "rounded" }).webcamMaskShape).toBe("rounded");
		expect(
			normalizeProjectEditor({ webcamMaskShape: "not-a-real-shape" as never }).webcamMaskShape,
		).toBe("rectangle");
	});
});

it("creates stable snapshots for identical project state", () => {
	const media = {
		screenVideoPath: "/tmp/screen.webm",
		webcamVideoPath: "/tmp/webcam.webm",
	};
	const editor = normalizeProjectEditor({
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
		webcamLayoutPreset: "picture-in-picture",
		webcamMaskShape: "circle",
		exportQuality: "good",
		exportFormat: "mp4",
		gifFrameRate: 15,
		gifLoop: true,
		gifSizePreset: "medium",
	});

	expect(createProjectSnapshot(media, editor)).toBe(createProjectSnapshot(media, editor));
});

it("detects unsaved changes from differing snapshots", () => {
	expect(hasProjectUnsavedChanges(null, null)).toBe(false);
	expect(hasProjectUnsavedChanges("same", "same")).toBe(false);
	expect(hasProjectUnsavedChanges("current", "baseline")).toBe(true);
});
