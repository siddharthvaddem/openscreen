import { describe, expect, it } from "vitest";
import { deriveNextId } from "@/shared/project-schema";
import { DEFAULT_SHORTCUTS, mergeWithDefaults } from "@/shared/shortcuts";
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
				webcamPosition: null,
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

	it("accepts the dual frame webcam layout preset", () => {
		expect(normalizeProjectEditor({ webcamLayoutPreset: "dual-frame" }).webcamLayoutPreset).toBe(
			"dual-frame",
		);
	});

	it("falls back from dual frame to picture in picture for portrait aspect ratios", () => {
		expect(
			normalizeProjectEditor({
				aspectRatio: "9:16",
				webcamLayoutPreset: "dual-frame",
			}).webcamLayoutPreset,
		).toBe("picture-in-picture");
	});

	it("clears webcamPosition when the normalized preset is not picture in picture", () => {
		expect(
			normalizeProjectEditor({
				webcamLayoutPreset: "dual-frame",
				webcamPosition: { cx: 0.2, cy: 0.8 },
			}).webcamPosition,
		).toBeNull();
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

describe("normalizeProjectEditor invariants", () => {
	it("preserves zoomInDurationMs and zoomOutDurationMs on round-trip", () => {
		const normalized = normalizeProjectEditor({
			zoomRegions: [
				{
					id: "zoom-1",
					startMs: 1000,
					endMs: 5000,
					depth: 3,
					focus: { cx: 0.5, cy: 0.5 },
					focusMode: "manual",
					zoomInDurationMs: 400,
					zoomOutDurationMs: 600,
				},
			],
		});
		expect(normalized.zoomRegions[0].zoomInDurationMs).toBe(400);
		expect(normalized.zoomRegions[0].zoomOutDurationMs).toBe(600);
	});

	it("omits zoom durations when not provided (no injected zeroes)", () => {
		const normalized = normalizeProjectEditor({
			zoomRegions: [
				{
					id: "zoom-2",
					startMs: 1000,
					endMs: 5000,
					depth: 3,
					focus: { cx: 0.5, cy: 0.5 },
					focusMode: "manual",
				},
			],
		});
		expect(normalized.zoomRegions[0].zoomInDurationMs).toBeUndefined();
		expect(normalized.zoomRegions[0].zoomOutDurationMs).toBeUndefined();
	});

	it("enforces the MIN_CROP invariant even at x=1 / y=1", () => {
		const normalized = normalizeProjectEditor({
			cropRegion: { x: 1, y: 1, width: 1, height: 1 },
		});
		expect(normalized.cropRegion.x).toBeLessThan(1);
		expect(normalized.cropRegion.y).toBeLessThan(1);
		expect(normalized.cropRegion.width).toBeGreaterThanOrEqual(0.01);
		expect(normalized.cropRegion.height).toBeGreaterThanOrEqual(0.01);
	});

	it("keeps a valid crop region unchanged", () => {
		const normalized = normalizeProjectEditor({
			cropRegion: { x: 0.1, y: 0.2, width: 0.8, height: 0.7 },
		});
		expect(normalized.cropRegion).toEqual({ x: 0.1, y: 0.2, width: 0.8, height: 0.7 });
	});
});

describe("deriveNextId", () => {
	it("returns 1 for an empty list", () => {
		expect(deriveNextId("zoom", [])).toBe(1);
	});

	it("handles consecutive ids", () => {
		expect(deriveNextId("zoom", ["zoom-1", "zoom-2", "zoom-3"])).toBe(4);
	});

	it("ignores ids that do not match the prefix", () => {
		expect(deriveNextId("zoom", ["trim-5", "zoom-2", "speed-99"])).toBe(3);
	});

	it("escapes regex metacharacters in the prefix", () => {
		// `.` would otherwise match any character, so "my.prefix-5" could match
		// a prefix of "myxprefix". The escape ensures only literal dots match.
		expect(deriveNextId("my.prefix", ["myxprefix-99", "my.prefix-2"])).toBe(3);
	});
});

describe("mergeWithDefaults deep-clone isolation", () => {
	it("returns bindings that are not references into DEFAULT_SHORTCUTS", () => {
		const merged = mergeWithDefaults({});
		merged.addZoom.key = "x";
		expect(DEFAULT_SHORTCUTS.addZoom.key).toBe("z");
	});

	it("overrides with the partial value when provided", () => {
		const merged = mergeWithDefaults({ addTrim: { key: "q" } });
		expect(merged.addTrim.key).toBe("q");
		// Other actions still come from defaults but as fresh objects.
		expect(merged.addZoom.key).toBe("z");
		expect(merged.addZoom).not.toBe(DEFAULT_SHORTCUTS.addZoom);
	});
});
