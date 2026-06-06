import { describe, expect, it } from "vitest";
import { computeCompositeLayout } from "./compositeLayout";

describe("computeCompositeLayout", () => {
	it("anchors the overlay in the lower-right corner", () => {
		const layout = computeCompositeLayout({
			canvasSize: { width: 1920, height: 1080 },
			screenSize: { width: 1920, height: 1080 },
			webcamSize: { width: 1280, height: 720 },
		});

		expect(layout).not.toBeNull();
		expect(layout!.webcamRect).not.toBeNull();
		expect(layout!.webcamRect!.x + layout!.webcamRect!.width).toBeLessThanOrEqual(1920);
		expect(layout!.webcamRect!.y + layout!.webcamRect!.height).toBeLessThanOrEqual(1080);
		expect(layout!.webcamRect!.x).toBeGreaterThan(1920 / 2);
		expect(layout!.webcamRect!.y).toBeGreaterThan(1080 / 2);
	});

	it("scales small screen content up to the export canvas when no padding is applied", () => {
		const layout = computeCompositeLayout({
			canvasSize: { width: 1280, height: 720 },
			screenSize: { width: 854, height: 480 },
		});

		expect(layout).not.toBeNull();
		expect(layout!.screenRect).toEqual({
			x: 0,
			y: 0,
			width: 1280,
			height: 720,
		});
	});

	it("keeps the overlay within the configured stage fraction while preserving aspect ratio", () => {
		const layout = computeCompositeLayout({
			canvasSize: { width: 1280, height: 720 },
			screenSize: { width: 1280, height: 720 },
			webcamSize: { width: 1920, height: 1080 },
		});

		const refDim = Math.sqrt(1280 * 720);
		const defaultFraction = 25 / 100; // DEFAULT_WEBCAM_SIZE_PRESET = 25
		expect(layout).not.toBeNull();
		expect(layout!.webcamRect).not.toBeNull();
		expect(layout!.webcamRect!.width).toBeLessThanOrEqual(Math.round(refDim * defaultFraction) + 1);
		expect(layout!.webcamRect!.height).toBeLessThanOrEqual(
			Math.round(refDim * defaultFraction) + 1,
		);
		expect(
			Math.abs(layout!.webcamRect!.width * 1080 - layout!.webcamRect!.height * 1920),
		).toBeLessThanOrEqual(1920);
	});

	it("produces consistent webcam size across landscape and portrait aspect ratios", () => {
		const webcamSize = { width: 1280, height: 720 };
		const landscape = computeCompositeLayout({
			canvasSize: { width: 1920, height: 1080 },
			screenSize: { width: 1920, height: 1080 },
			webcamSize,
			webcamSizePreset: 50,
		});
		const portrait = computeCompositeLayout({
			canvasSize: { width: 1080, height: 1920 },
			screenSize: { width: 1080, height: 1920 },
			webcamSize,
			webcamSizePreset: 50,
		});

		expect(landscape).not.toBeNull();
		expect(portrait).not.toBeNull();
		// Same total pixel count, so webcam area should be comparable.
		const landscapeArea = landscape!.webcamRect!.width * landscape!.webcamRect!.height;
		const portraitArea = portrait!.webcamRect!.width * portrait!.webcamRect!.height;
		expect(landscapeArea).toBe(portraitArea);
	});

	it("scales the webcam proportionally as webcamSizePreset increases", () => {
		const canvasSize = { width: 1920, height: 1080 };
		const screenSize = { width: 1920, height: 1080 };
		const webcamSize = { width: 1280, height: 720 };

		const small = computeCompositeLayout({
			canvasSize,
			screenSize,
			webcamSize,
			webcamSizePreset: 10,
		});
		const medium = computeCompositeLayout({
			canvasSize,
			screenSize,
			webcamSize,
			webcamSizePreset: 25,
		});
		const large = computeCompositeLayout({
			canvasSize,
			screenSize,
			webcamSize,
			webcamSizePreset: 50,
		});

		expect(small!.webcamRect!.width).toBeLessThan(medium!.webcamRect!.width);
		expect(medium!.webcamRect!.width).toBeLessThan(large!.webcamRect!.width);
		expect(small!.webcamRect!.height).toBeLessThan(medium!.webcamRect!.height);
		expect(medium!.webcamRect!.height).toBeLessThan(large!.webcamRect!.height);
	});

	it("clamps webcamSizePreset to the valid range (10–50)", () => {
		const canvasSize = { width: 1920, height: 1080 };
		const screenSize = { width: 1920, height: 1080 };
		const webcamSize = { width: 1280, height: 720 };

		const atMin = computeCompositeLayout({
			canvasSize,
			screenSize,
			webcamSize,
			webcamSizePreset: 10,
		});
		const belowMin = computeCompositeLayout({
			canvasSize,
			screenSize,
			webcamSize,
			webcamSizePreset: 1,
		});
		const atMax = computeCompositeLayout({
			canvasSize,
			screenSize,
			webcamSize,
			webcamSizePreset: 50,
		});
		const aboveMax = computeCompositeLayout({
			canvasSize,
			screenSize,
			webcamSize,
			webcamSizePreset: 100,
		});

		expect(belowMin!.webcamRect!.width).toBe(atMin!.webcamRect!.width);
		expect(belowMin!.webcamRect!.height).toBe(atMin!.webcamRect!.height);
		expect(aboveMax!.webcamRect!.width).toBe(atMax!.webcamRect!.width);
		expect(aboveMax!.webcamRect!.height).toBe(atMax!.webcamRect!.height);
	});

	it("snaps rounding-only source aspect gaps to the full canvas", () => {
		const layout = computeCompositeLayout({
			canvasSize: { width: 319, height: 199 },
			maxContentSize: { width: 319, height: 199 },
			screenSize: { width: 1680, height: 1050 },
		});

		expect(layout?.screenRect).toEqual({
			x: 0,
			y: 0,
			width: 319,
			height: 199,
		});
	});

	it("centers the combined screen and webcam stack in vertical stack mode", () => {
		const layout = computeCompositeLayout({
			canvasSize: { width: 1920, height: 1080 },
			maxContentSize: { width: 1536, height: 864 },
			screenSize: { width: 1920, height: 1080 },
			webcamSize: { width: 1280, height: 720 },
			layoutPreset: "vertical-stack",
		});

		expect(layout).not.toBeNull();
		// Webcam is full-width at the bottom
		expect(layout!.webcamRect).not.toBeNull();
		expect(layout!.webcamRect!.x).toBe(0);
		expect(layout!.webcamRect!.width).toBe(1920);
		expect(layout!.webcamRect!.borderRadius).toBe(0);
		// Screen fills remaining space at the top (cover mode)
		expect(layout!.screenRect.x).toBe(0);
		expect(layout!.screenRect.y).toBe(0);
		expect(layout!.screenRect.width).toBe(1920);
		expect(layout!.screenCover).toBe(true);
	});

	it("keeps the screen full-canvas and omits the webcam when dimensions are unavailable in stack mode", () => {
		const layout = computeCompositeLayout({
			canvasSize: { width: 1920, height: 1080 },
			maxContentSize: { width: 1536, height: 864 },
			screenSize: { width: 1920, height: 1080 },
			layoutPreset: "vertical-stack",
		});

		expect(layout).not.toBeNull();
		expect(layout?.screenRect).toEqual({
			x: 0,
			y: 0,
			width: 1920,
			height: 1080,
		});
		expect(layout?.webcamRect).toBeNull();
		expect(layout?.screenCover).toBe(true);
	});

	it("uses a 2:1 split layout in dual frame mode", () => {
		const layout = computeCompositeLayout({
			canvasSize: { width: 1920, height: 1080 },
			maxContentSize: { width: 1536, height: 864 },
			screenSize: { width: 1920, height: 1080 },
			webcamSize: { width: 1280, height: 720 },
			layoutPreset: "dual-frame",
		});

		expect(layout).not.toBeNull();
		expect(layout?.webcamRect).not.toBeNull();
		expect(layout?.screenRect.y).toBe(108);
		expect(layout?.screenRect.height).toBe(864);
		expect(layout?.screenBorderRadius).toBe(layout?.webcamRect?.borderRadius);
		expect(layout?.webcamRect?.y).toBe(108);
		expect(layout?.webcamRect?.height).toBe(864);
		expect(layout?.webcamRect?.x).toBeGreaterThan(layout?.screenRect.x ?? 0);
		expect(
			Math.abs((layout?.screenRect.width ?? 0) - 2 * (layout?.webcamRect?.width ?? 0)),
		).toBeLessThanOrEqual(1);
		expect(layout?.screenCover).toBe(true);
	});

	it("forces circular and square masks to use square dimensions", () => {
		const circularLayout = computeCompositeLayout({
			canvasSize: { width: 1920, height: 1080 },
			screenSize: { width: 1920, height: 1080 },
			webcamSize: { width: 1280, height: 720 },
			webcamMaskShape: "circle",
		});
		const squareLayout = computeCompositeLayout({
			canvasSize: { width: 1920, height: 1080 },
			screenSize: { width: 1920, height: 1080 },
			webcamSize: { width: 1280, height: 720 },
			webcamMaskShape: "square",
		});

		expect(circularLayout?.webcamRect).not.toBeNull();
		expect(squareLayout?.webcamRect).not.toBeNull();
		expect(circularLayout?.webcamRect?.width).toBe(circularLayout?.webcamRect?.height);
		expect(squareLayout?.webcamRect?.width).toBe(squareLayout?.webcamRect?.height);
		expect(circularLayout?.webcamRect?.maskShape).toBe("circle");
		expect(squareLayout?.webcamRect?.maskShape).toBe("square");
	});

	it("applies larger rounding for the rounded webcam mask", () => {
		const roundedLayout = computeCompositeLayout({
			canvasSize: { width: 1920, height: 1080 },
			screenSize: { width: 1920, height: 1080 },
			webcamSize: { width: 1280, height: 720 },
			webcamMaskShape: "rounded",
		});
		const rectangleLayout = computeCompositeLayout({
			canvasSize: { width: 1920, height: 1080 },
			screenSize: { width: 1920, height: 1080 },
			webcamSize: { width: 1280, height: 720 },
			webcamMaskShape: "rectangle",
		});

		expect(roundedLayout?.webcamRect).not.toBeNull();
		expect(rectangleLayout?.webcamRect).not.toBeNull();
		expect(roundedLayout?.webcamRect?.borderRadius).toBeGreaterThan(
			rectangleLayout?.webcamRect?.borderRadius ?? 0,
		);
		expect(roundedLayout?.webcamRect?.maskShape).toBe("rounded");
	});
});
