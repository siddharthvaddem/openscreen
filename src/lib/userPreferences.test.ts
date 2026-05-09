import { beforeEach, describe, expect, it } from "vitest";
import { loadUserPreferences, parentDirectoryOf, saveUserPreferences } from "./userPreferences";
import { DEFAULT_WALLPAPER } from "./wallpaper";

describe("userPreferences", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("returns visual editor defaults when no preferences have been stored", () => {
		expect(loadUserPreferences()).toMatchObject({
			wallpaper: DEFAULT_WALLPAPER,
			shadowIntensity: 0,
			showBlur: false,
			motionBlurAmount: 0,
			borderRadius: 0,
			padding: 50,
			aspectRatio: "16:9",
			customImages: [],
			exportQuality: "good",
			exportFormat: "mp4",
			autoSaveExportToDownloads: false,
			exportFolder: null,
		});
	});

	it("persists visual editor defaults and uploaded background images", () => {
		const uploadedBackground =
			"file:///Users/me/Library/Application%20Support/Openscreen/background-images/bg.png";

		saveUserPreferences({
			wallpaper: uploadedBackground,
			customImages: [uploadedBackground],
			shadowIntensity: 0.45,
			showBlur: true,
			motionBlurAmount: 0.25,
			borderRadius: 24,
			padding: 18,
			cropRegion: { x: 0.1, y: 0.2, width: 0.7, height: 0.6 },
			aspectRatio: "16:10",
			webcamLayoutPreset: "picture-in-picture",
			webcamMaskShape: "rounded",
			webcamSizePreset: 32,
			webcamPosition: { cx: 0.8, cy: 0.25 },
			exportQuality: "source",
			exportFormat: "gif",
			autoSaveExportToDownloads: true,
			exportFolder: "/Users/me/Movies",
			gifFrameRate: 30,
			gifLoop: false,
			gifSizePreset: "large",
		});

		expect(loadUserPreferences()).toMatchObject({
			wallpaper: uploadedBackground,
			customImages: [uploadedBackground],
			shadowIntensity: 0.45,
			showBlur: true,
			motionBlurAmount: 0.25,
			borderRadius: 24,
			padding: 18,
			cropRegion: { x: 0.1, y: 0.2, width: 0.7, height: 0.6 },
			aspectRatio: "16:10",
			webcamLayoutPreset: "picture-in-picture",
			webcamMaskShape: "rounded",
			webcamSizePreset: 32,
			webcamPosition: { cx: 0.8, cy: 0.25 },
			exportQuality: "source",
			exportFormat: "gif",
			autoSaveExportToDownloads: true,
			exportFolder: "/Users/me/Movies",
			gifFrameRate: 30,
			gifLoop: false,
			gifSizePreset: "large",
		});
	});

	it("returns fresh object and array instances for defaults", () => {
		const first = loadUserPreferences();
		first.customImages.push("file:///tmp/mutated.png");
		first.cropRegion.x = 0.5;
		first.cursorHighlight.enabled = !first.cursorHighlight.enabled;

		const second = loadUserPreferences();
		expect(second.customImages).toEqual([]);
		expect(second.cropRegion.x).toBe(0);
		expect(second.cursorHighlight.enabled).toBe(false);
	});
});

describe("parentDirectoryOf", () => {
	it("returns the directory for a POSIX path", () => {
		expect(parentDirectoryOf("/Users/me/Movies/clip.mp4")).toBe("/Users/me/Movies");
	});

	it("returns the directory for a Windows path", () => {
		expect(parentDirectoryOf("C:\\Users\\me\\Movies\\clip.mp4")).toBe("C:\\Users\\me\\Movies");
	});

	it("preserves the POSIX root when the file is at /", () => {
		expect(parentDirectoryOf("/video.mp4")).toBe("/");
	});

	it("preserves the Windows drive root with its trailing separator", () => {
		expect(parentDirectoryOf("C:\\video.mp4")).toBe("C:\\");
		expect(parentDirectoryOf("D:/video.mp4")).toBe("D:/");
	});

	it("returns null when no separator is present", () => {
		expect(parentDirectoryOf("video.mp4")).toBeNull();
		expect(parentDirectoryOf("")).toBeNull();
	});
});
