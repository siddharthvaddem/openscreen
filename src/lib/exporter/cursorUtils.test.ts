import { describe, expect, it } from "vitest";
import type { CursorTelemetryPoint } from "@/components/video-editor/types";
import { hexToRgba, interpolateCursorPosition } from "./frameRenderer";

describe("interpolateCursorPosition", () => {
	it("returns null for empty array", () => {
		expect(interpolateCursorPosition([], 100)).toBeNull();
	});

	it("returns null for undefined", () => {
		expect(interpolateCursorPosition(undefined, 100)).toBeNull();
	});

	it("returns the single sample for a one-element array", () => {
		const samples: CursorTelemetryPoint[] = [{ timeMs: 500, cx: 0.3, cy: 0.7 }];
		expect(interpolateCursorPosition(samples, 0)).toEqual({ cx: 0.3, cy: 0.7 });
		expect(interpolateCursorPosition(samples, 500)).toEqual({ cx: 0.3, cy: 0.7 });
		expect(interpolateCursorPosition(samples, 1000)).toEqual({ cx: 0.3, cy: 0.7 });
	});

	it("clamps to first sample when timeMs is before range", () => {
		const samples: CursorTelemetryPoint[] = [
			{ timeMs: 100, cx: 0.1, cy: 0.2 },
			{ timeMs: 200, cx: 0.5, cy: 0.6 },
		];
		expect(interpolateCursorPosition(samples, 0)).toEqual({ cx: 0.1, cy: 0.2 });
		expect(interpolateCursorPosition(samples, 50)).toEqual({ cx: 0.1, cy: 0.2 });
	});

	it("clamps to last sample when timeMs is after range", () => {
		const samples: CursorTelemetryPoint[] = [
			{ timeMs: 100, cx: 0.1, cy: 0.2 },
			{ timeMs: 200, cx: 0.5, cy: 0.6 },
		];
		expect(interpolateCursorPosition(samples, 300)).toEqual({ cx: 0.5, cy: 0.6 });
		expect(interpolateCursorPosition(samples, 200)).toEqual({ cx: 0.5, cy: 0.6 });
	});

	it("returns exact sample when timeMs matches exactly", () => {
		const samples: CursorTelemetryPoint[] = [
			{ timeMs: 0, cx: 0.0, cy: 0.0 },
			{ timeMs: 100, cx: 0.5, cy: 0.5 },
			{ timeMs: 200, cx: 1.0, cy: 1.0 },
		];
		expect(interpolateCursorPosition(samples, 100)).toEqual({ cx: 0.5, cy: 0.5 });
	});

	it("interpolates linearly between two samples", () => {
		const samples: CursorTelemetryPoint[] = [
			{ timeMs: 0, cx: 0.0, cy: 0.0 },
			{ timeMs: 100, cx: 1.0, cy: 0.5 },
		];
		const result = interpolateCursorPosition(samples, 50);
		expect(result).not.toBeNull();
		expect(result!.cx).toBeCloseTo(0.5, 5);
		expect(result!.cy).toBeCloseTo(0.25, 5);
	});

	it("handles duplicate timestamps gracefully", () => {
		const samples: CursorTelemetryPoint[] = [
			{ timeMs: 100, cx: 0.2, cy: 0.3 },
			{ timeMs: 100, cx: 0.8, cy: 0.9 },
			{ timeMs: 200, cx: 0.5, cy: 0.5 },
		];
		// Should not throw or return NaN
		const result = interpolateCursorPosition(samples, 100);
		expect(result).not.toBeNull();
		expect(Number.isFinite(result!.cx)).toBe(true);
		expect(Number.isFinite(result!.cy)).toBe(true);
	});
});

describe("hexToRgba", () => {
	it("converts valid hex color with alpha", () => {
		expect(hexToRgba("#ff0000", 0.5)).toBe("rgba(255,0,0,0.5)");
		expect(hexToRgba("#00ff00", 1)).toBe("rgba(0,255,0,1)");
		expect(hexToRgba("#0000ff", 0)).toBe("rgba(0,0,255,0)");
	});

	it("handles white and black", () => {
		expect(hexToRgba("#ffffff", 0.6)).toBe("rgba(255,255,255,0.6)");
		expect(hexToRgba("#000000", 0.6)).toBe("rgba(0,0,0,0.6)");
	});

	it("returns fallback for invalid hex", () => {
		expect(hexToRgba("not-a-color", 0.5)).toBe("rgba(255,255,255,0.5)");
		expect(hexToRgba("", 0.5)).toBe("rgba(255,255,255,0.5)");
		expect(hexToRgba("#gg0000", 0.5)).toBe("rgba(255,255,255,0.5)");
	});
});
