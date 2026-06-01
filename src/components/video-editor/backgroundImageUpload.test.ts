import { describe, expect, it } from "vitest";
import { isSupportedBackgroundImageType } from "./backgroundImageUpload";

describe("background image upload validation", () => {
	it("accepts PNG images for custom backgrounds", () => {
		expect(isSupportedBackgroundImageType("image/png", "生成画像1.png")).toBe(true);
	});

	it("accepts PNG images by extension when the browser does not provide a MIME type", () => {
		expect(isSupportedBackgroundImageType("", "生成画像1.png")).toBe(true);
	});

	it("keeps rejecting non-image uploads", () => {
		expect(isSupportedBackgroundImageType("text/plain", "notes.txt")).toBe(false);
	});

	it("does not allow extension fallback for explicit unsupported MIME types", () => {
		expect(isSupportedBackgroundImageType("text/plain", "notes.png")).toBe(false);
	});
});
