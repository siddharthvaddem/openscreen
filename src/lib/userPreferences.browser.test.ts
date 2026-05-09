import { beforeEach, describe, expect, it } from "vitest";
import { loadUserPreferences, saveUserPreferences } from "./userPreferences";

describe("userPreferences browser persistence", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("round-trips uploaded backgrounds and visual defaults through browser localStorage", () => {
		const uploadedBackground =
			"file:///Users/me/Library/Application%20Support/Openscreen/background-images/bg.png";

		saveUserPreferences({
			wallpaper: uploadedBackground,
			customImages: [uploadedBackground],
			borderRadius: 31,
			shadowIntensity: 0.62,
			padding: 14,
			aspectRatio: "4:3",
			exportFormat: "gif",
			autoSaveExportToDownloads: true,
			gifFrameRate: 25,
		});

		const raw = localStorage.getItem("openscreen_user_preferences");
		expect(raw).toContain(uploadedBackground);
		expect(loadUserPreferences()).toMatchObject({
			wallpaper: uploadedBackground,
			customImages: [uploadedBackground],
			borderRadius: 31,
			shadowIntensity: 0.62,
			padding: 14,
			aspectRatio: "4:3",
			exportFormat: "gif",
			autoSaveExportToDownloads: true,
			gifFrameRate: 25,
		});
	});
});
