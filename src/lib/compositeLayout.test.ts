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

	it("keeps the overlay within the configured stage fraction while preserving aspect ratio", () => {
		const layout = computeCompositeLayout({
			canvasSize: { width: 1280, height: 720 },
			screenSize: { width: 1280, height: 720 },
			webcamSize: { width: 1920, height: 1080 },
		});

		expect(layout).not.toBeNull();
		expect(layout!.webcamRect).not.toBeNull();
		expect(layout!.webcamRect!.width).toBeLessThanOrEqual(Math.round(1280 * 0.18) + 1);
		expect(layout!.webcamRect!.height).toBeLessThanOrEqual(Math.round(720 * 0.18) + 1);
		expect(
			Math.abs(layout!.webcamRect!.width * 1080 - layout!.webcamRect!.height * 1920),
		).toBeLessThanOrEqual(1920);
	});

	it("uses cover-style full-width stacking in vertical stack mode", () => {
		const layout = computeCompositeLayout({
			canvasSize: { width: 1920, height: 1080 },
			maxContentSize: { width: 1536, height: 864 },
			screenSize: { width: 1920, height: 1080 },
			webcamSize: { width: 1280, height: 720 },
			layoutPreset: "vertical-stack",
		});

		expect(layout).not.toBeNull();
		expect(layout?.screenRect).toEqual({
			x: 0,
			y: 0,
			width: 1920,
			height: 0,
		});
		expect(layout?.webcamRect).toEqual({
			x: 0,
			y: 0,
			width: 1920,
			height: 1080,
			borderRadius: 0,
		});
		expect(layout?.screenCover).toBe(true);
	});

	it("fills the canvas with the screen when vertical stack has no webcam", () => {
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
