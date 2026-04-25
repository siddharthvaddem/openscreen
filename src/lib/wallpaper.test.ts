import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssetBaseUnavailableError, UnsafeAssetPathError } from "./assetPath";
import {
	BackgroundLoadError,
	classifyWallpaper,
	DEFAULT_WALLPAPER,
	resolveImageWallpaperUrl,
	UnsafeImagePrefixError,
	WALLPAPER_COUNT,
	WALLPAPER_PATHS,
} from "./wallpaper";

describe("WALLPAPER_PATHS", () => {
	it("contains WALLPAPER_COUNT entries", () => {
		expect(WALLPAPER_PATHS).toHaveLength(WALLPAPER_COUNT);
	});

	it("DEFAULT_WALLPAPER is WALLPAPER_PATHS[0]", () => {
		expect(DEFAULT_WALLPAPER).toBe(WALLPAPER_PATHS[0]);
	});
});

describe("classifyWallpaper", () => {
	it("hex color", () => {
		expect(classifyWallpaper("#1a1a2e")).toEqual({ kind: "color", value: "#1a1a2e" });
	});

	it("rgb() color", () => {
		expect(classifyWallpaper("rgb(1, 2, 3)")).toEqual({ kind: "color", value: "rgb(1, 2, 3)" });
	});

	it("rgba() color", () => {
		expect(classifyWallpaper("rgba(1, 2, 3, 0.5)")).toEqual({
			kind: "color",
			value: "rgba(1, 2, 3, 0.5)",
		});
	});

	it("hsl() color", () => {
		expect(classifyWallpaper("hsl(180, 50%, 50%)")).toEqual({
			kind: "color",
			value: "hsl(180, 50%, 50%)",
		});
	});

	it("oklch() color", () => {
		expect(classifyWallpaper("oklch(50% 0.1 180)")).toEqual({
			kind: "color",
			value: "oklch(50% 0.1 180)",
		});
	});

	it("linear gradient", () => {
		const v = "linear-gradient(90deg, red, blue)";
		expect(classifyWallpaper(v)).toEqual({ kind: "gradient", value: v });
	});

	it("radial gradient", () => {
		const v = "radial-gradient(circle, red, blue)";
		expect(classifyWallpaper(v)).toEqual({ kind: "gradient", value: v });
	});

	it("conic gradient", () => {
		const v = "conic-gradient(red, blue)";
		expect(classifyWallpaper(v)).toEqual({ kind: "gradient", value: v });
	});

	it("repeating-linear gradient", () => {
		const v = "repeating-linear-gradient(45deg, red 0 10px, blue 10px 20px)";
		expect(classifyWallpaper(v)).toEqual({ kind: "gradient", value: v });
	});

	it("repeating-radial gradient", () => {
		const v = "repeating-radial-gradient(circle, red, blue 20px)";
		expect(classifyWallpaper(v)).toEqual({ kind: "gradient", value: v });
	});

	it("leading-slash image path", () => {
		expect(classifyWallpaper("/wallpapers/wallpaper1.jpg")).toEqual({
			kind: "image",
			path: "/wallpapers/wallpaper1.jpg",
		});
	});

	it("http URL as image", () => {
		expect(classifyWallpaper("https://example.com/bg.jpg")).toEqual({
			kind: "image",
			path: "https://example.com/bg.jpg",
		});
	});

	it("file:// URL as image", () => {
		expect(classifyWallpaper("file:///tmp/bg.jpg")).toEqual({
			kind: "image",
			path: "file:///tmp/bg.jpg",
		});
	});

	it("data URI as image", () => {
		expect(classifyWallpaper("data:image/png;base64,AAA")).toEqual({
			kind: "image",
			path: "data:image/png;base64,AAA",
		});
	});

	it("named color falls back to color", () => {
		expect(classifyWallpaper("red")).toEqual({ kind: "color", value: "red" });
	});

	it("empty string falls back to black", () => {
		expect(classifyWallpaper("")).toEqual({ kind: "color", value: "#000000" });
	});

	it("trims whitespace", () => {
		expect(classifyWallpaper("  #abcdef  ")).toEqual({ kind: "color", value: "#abcdef" });
	});

	it("DEFAULT_WALLPAPER classifies as image", () => {
		expect(classifyWallpaper(DEFAULT_WALLPAPER)).toEqual({
			kind: "image",
			path: DEFAULT_WALLPAPER,
		});
	});
});

describe("resolveImageWallpaperUrl", () => {
	beforeEach(() => {
		vi.stubGlobal("window", {
			...globalThis.window,
			location: { protocol: "http:" },
			electronAPI: undefined,
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("passes through http URL", () => {
		expect(resolveImageWallpaperUrl("http://example.com/bg.jpg")).toBe("http://example.com/bg.jpg");
	});

	it("passes through https URL", () => {
		expect(resolveImageWallpaperUrl("https://example.com/bg.jpg")).toBe(
			"https://example.com/bg.jpg",
		);
	});

	it("passes through file:// URL", () => {
		expect(resolveImageWallpaperUrl("file:///tmp/bg.jpg")).toBe("file:///tmp/bg.jpg");
	});

	it("passes through data URI", () => {
		const uri = "data:image/png;base64,AAAA";
		expect(resolveImageWallpaperUrl(uri)).toBe(uri);
	});

	it("resolves leading-slash wallpaper path via http fallback", () => {
		expect(resolveImageWallpaperUrl("/wallpapers/wallpaper1.jpg")).toBe(
			"/wallpapers/wallpaper1.jpg",
		);
	});

	it("resolves bare relative wallpaper path", () => {
		expect(resolveImageWallpaperUrl("wallpapers/wallpaper1.jpg")).toBe(
			"/wallpapers/wallpaper1.jpg",
		);
	});

	it("encodes special characters in path segments", () => {
		expect(resolveImageWallpaperUrl("/wallpapers/my image.jpg")).toBe("/wallpapers/my%20image.jpg");
	});

	it("rejects image paths outside /wallpapers/ with UnsafeImagePrefixError as cause", () => {
		try {
			resolveImageWallpaperUrl("/etc/passwd");
			expect.fail("should have thrown");
		} catch (err) {
			if (!(err instanceof BackgroundLoadError)) throw err;
			expect(err.cause).toBeInstanceOf(UnsafeImagePrefixError);
		}
	});

	it("wraps traversal attempts in BackgroundLoadError (preserves UnsafeAssetPathError as cause)", () => {
		try {
			resolveImageWallpaperUrl("/wallpapers/../etc/passwd");
			expect.fail("should have thrown");
		} catch (err) {
			if (!(err instanceof BackgroundLoadError)) throw err;
			expect(err.cause).toBeInstanceOf(UnsafeAssetPathError);
		}
	});

	it("wraps percent-encoded traversal in BackgroundLoadError", () => {
		try {
			resolveImageWallpaperUrl("/wallpapers/%2e%2e/app.asar");
			expect.fail("should have thrown");
		} catch (err) {
			if (!(err instanceof BackgroundLoadError)) throw err;
			expect(err.cause).toBeInstanceOf(UnsafeAssetPathError);
		}
	});

	it("resolves via electronAPI.assetBaseUrl when not http", () => {
		vi.stubGlobal("window", {
			...globalThis.window,
			location: { protocol: "file:" },
			electronAPI: { assetBaseUrl: "file:///opt/app/public/" },
		});
		expect(resolveImageWallpaperUrl("/wallpapers/wallpaper1.jpg")).toBe(
			"file:///opt/app/public/wallpapers/wallpaper1.jpg",
		);
	});

	it("appends trailing slash to assetBaseUrl if missing", () => {
		vi.stubGlobal("window", {
			...globalThis.window,
			location: { protocol: "file:" },
			electronAPI: { assetBaseUrl: "file:///opt/app/public" },
		});
		expect(resolveImageWallpaperUrl("/wallpapers/wallpaper1.jpg")).toBe(
			"file:///opt/app/public/wallpapers/wallpaper1.jpg",
		);
	});

	it("wraps AssetBaseUnavailableError in BackgroundLoadError when assetBaseUrl is empty", () => {
		vi.stubGlobal("window", {
			...globalThis.window,
			location: { protocol: "file:" },
			electronAPI: { assetBaseUrl: "" },
		});
		try {
			resolveImageWallpaperUrl("/wallpapers/wallpaper1.jpg");
			expect.fail("should have thrown");
		} catch (err) {
			if (!(err instanceof BackgroundLoadError)) throw err;
			expect(err.cause).toBeInstanceOf(AssetBaseUnavailableError);
		}
	});
});

describe("BackgroundLoadError", () => {
	it("carries the failing URL and is instanceof Error", () => {
		const err = new BackgroundLoadError("/home/user/secret/wallpaper.jpg");
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(BackgroundLoadError);
		expect(err.url).toBe("/home/user/secret/wallpaper.jpg");
		expect(err.name).toBe("BackgroundLoadError");
	});

	it("displayUrl hides parent directories to avoid leaking PII", () => {
		const err = new BackgroundLoadError("file:///home/enrique/projects/openscreen/wallpaper1.jpg");
		expect(err.displayUrl).toBe("wallpaper1.jpg");
	});

	it("displayUrl abbreviates data URIs", () => {
		const err = new BackgroundLoadError("data:image/png;base64,AAA");
		expect(err.displayUrl).toBe("data:…");
	});

	it("displayUrl returns sentinel for empty-basename URLs", () => {
		const err = new BackgroundLoadError("file:///");
		expect(err.displayUrl).toBe("(unknown)");
	});

	it("displayUrl returns sentinel for unparseable bare slash", () => {
		const err = new BackgroundLoadError("/");
		expect(err.displayUrl).toBe("(unknown)");
	});

	it("preserves cause when provided", () => {
		const cause = new Error("inner");
		const err = new BackgroundLoadError("file:///missing.jpg", cause);
		expect(err.cause).toBe(cause);
	});
});
