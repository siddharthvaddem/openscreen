import { describe, expect, it } from "vitest";
import { INITIAL_EDITOR_STATE } from "@/hooks/useEditorHistory";
import { DEFAULT_PREFS } from "@/lib/userPreferences";
import {
	DEFAULT_EDITOR_APPEARANCE_SETTINGS,
	DEFAULT_EDITOR_LAYOUT_SETTINGS,
	DEFAULT_EXPORT_SETTINGS,
	DEFAULT_GIF_SETTINGS,
	DEFAULT_WEBCAM_SETTINGS,
} from "./editorDefaults";
import { normalizeProjectEditor } from "./projectPersistence";

describe("editor defaults SSOT", () => {
	it("keeps history defaults aligned with editor defaults", () => {
		expect(INITIAL_EDITOR_STATE).toMatchObject({
			...DEFAULT_EDITOR_APPEARANCE_SETTINGS,
			padding: DEFAULT_EDITOR_LAYOUT_SETTINGS.padding,
			aspectRatio: DEFAULT_EDITOR_LAYOUT_SETTINGS.aspectRatio,
			cropRegion: DEFAULT_EDITOR_LAYOUT_SETTINGS.cropRegion,
			wallpaper: DEFAULT_EDITOR_LAYOUT_SETTINGS.wallpaper,
			webcamLayoutPreset: DEFAULT_WEBCAM_SETTINGS.layoutPreset,
			webcamMaskShape: DEFAULT_WEBCAM_SETTINGS.maskShape,
			webcamSizePreset: DEFAULT_WEBCAM_SETTINGS.sizePreset,
			webcamPosition: DEFAULT_WEBCAM_SETTINGS.position,
		});
	});

	it("keeps user preference defaults aligned with editor and export defaults", () => {
		expect(DEFAULT_PREFS).toMatchObject({
			padding: DEFAULT_EDITOR_LAYOUT_SETTINGS.padding,
			aspectRatio: DEFAULT_EDITOR_LAYOUT_SETTINGS.aspectRatio,
			exportQuality: DEFAULT_EXPORT_SETTINGS.quality,
			exportFormat: DEFAULT_EXPORT_SETTINGS.format,
		});
	});

	it("keeps project fallback normalization aligned with editor defaults", () => {
		expect(normalizeProjectEditor({})).toMatchObject({
			...DEFAULT_EDITOR_APPEARANCE_SETTINGS,
			padding: DEFAULT_EDITOR_LAYOUT_SETTINGS.padding,
			cropRegion: DEFAULT_EDITOR_LAYOUT_SETTINGS.cropRegion,
			wallpaper: DEFAULT_EDITOR_LAYOUT_SETTINGS.wallpaper,
			aspectRatio: DEFAULT_EDITOR_LAYOUT_SETTINGS.aspectRatio,
			webcamLayoutPreset: DEFAULT_WEBCAM_SETTINGS.layoutPreset,
			webcamMaskShape: DEFAULT_WEBCAM_SETTINGS.maskShape,
			webcamSizePreset: DEFAULT_WEBCAM_SETTINGS.sizePreset,
			webcamPosition: DEFAULT_WEBCAM_SETTINGS.position,
			exportQuality: DEFAULT_EXPORT_SETTINGS.quality,
			exportFormat: DEFAULT_EXPORT_SETTINGS.format,
			gifFrameRate: DEFAULT_GIF_SETTINGS.frameRate,
			gifLoop: DEFAULT_GIF_SETTINGS.loop,
			gifSizePreset: DEFAULT_GIF_SETTINGS.sizePreset,
		});
	});
});
