import { describe, expect, it } from "vitest";
import { getCursorHighlightState, getCursorRippleState } from "./cursorVisualUtils";

describe("cursorVisualUtils", () => {
	it("maps cursor telemetry into transformed stage coordinates", () => {
		const highlight = getCursorHighlightState({
			cursorTelemetry: [{ timeMs: 1000, cx: 0.5, cy: 0.25 }],
			timeMs: 1000,
			baseMask: { x: 100, y: 50, width: 400, height: 300 },
			transform: { scale: 1.5, x: 20, y: -10 },
			zoomProgress: 0.8,
		});

		expect(highlight).not.toBeNull();
		expect(highlight?.x).toBeCloseTo((100 + 0.5 * 400) * 1.5 + 20, 5);
		expect(highlight?.y).toBeCloseTo((50 + 0.25 * 300) * 1.5 - 10, 5);
		expect(highlight?.radius).toBeGreaterThan(18);
		expect(highlight?.opacity).toBeGreaterThan(0.42);
	});

	it("returns a ripple pulse during zoom transitions", () => {
		const highlight = getCursorHighlightState({
			cursorTelemetry: [{ timeMs: 1000, cx: 0.5, cy: 0.5 }],
			timeMs: 1000,
			baseMask: { x: 0, y: 0, width: 400, height: 300 },
			transform: { scale: 1, x: 0, y: 0 },
			zoomProgress: 0.5,
		});

		const ripple = getCursorRippleState({ highlight, zoomProgress: 0.5 });
		expect(ripple).not.toBeNull();
		expect(ripple?.radius).toBeGreaterThan(highlight!.radius);
	});

	it("prioritizes click ripple when a click happens near the current time", () => {
		const highlight = getCursorHighlightState({
			cursorTelemetry: [{ timeMs: 1000, cx: 0.5, cy: 0.5 }],
			timeMs: 1000,
			baseMask: { x: 0, y: 0, width: 400, height: 300 },
			transform: { scale: 1, x: 0, y: 0 },
		});

		const ripple = getCursorRippleState({
			highlight,
			clicks: [{ timeMs: 1080, cx: 0.5, cy: 0.5 }],
			timeMs: 1000,
			zoomProgress: 0,
		});

		expect(ripple).not.toBeNull();
		expect(ripple?.radius).toBeCloseTo(highlight!.radius + 24, 5);
		expect(ripple?.opacity).toBeCloseTo(0.36, 5);
	});

	it("returns null when telemetry is unavailable", () => {
		const highlight = getCursorHighlightState({
			cursorTelemetry: [],
			timeMs: 1000,
			baseMask: { x: 0, y: 0, width: 400, height: 300 },
			transform: { scale: 1, x: 0, y: 0 },
		});

		expect(highlight).toBeNull();
	});
});
