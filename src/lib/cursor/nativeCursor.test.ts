import { describe, expect, it } from "vitest";
import type { NativeCursorAsset } from "@/native/contracts";
import {
	getNativeCursorClickBounceProgress,
	getNativeCursorClickBounceScale,
	hasNativeCursorRecordingData,
	resolveInterpolatedNativeCursorFrame,
	resolveNativeCursorRenderAsset,
} from "./nativeCursor";

describe("native cursor click bounce", () => {
	it("keeps click progress visible across several frames", () => {
		const recordingData = {
			version: 2,
			provider: "native" as const,
			assets: [],
			samples: [
				{ timeMs: 0, cx: 0.5, cy: 0.5, interactionType: "move" as const },
				{ timeMs: 100, cx: 0.5, cy: 0.5, interactionType: "click" as const },
				{ timeMs: 133, cx: 0.5, cy: 0.5, interactionType: "move" as const },
				{ timeMs: 166, cx: 0.5, cy: 0.5, interactionType: "move" as const },
				{ timeMs: 200, cx: 0.5, cy: 0.5, interactionType: "move" as const },
				{ timeMs: 300, cx: 0.5, cy: 0.5, interactionType: "move" as const },
			],
		};

		expect(getNativeCursorClickBounceProgress(recordingData, 133)).toBeGreaterThan(0);
		expect(getNativeCursorClickBounceProgress(recordingData, 200)).toBeGreaterThan(0);
		expect(getNativeCursorClickBounceProgress(recordingData, 400)).toBe(0);
	});

	it("applies a visible press and rebound scale at high intensity", () => {
		expect(getNativeCursorClickBounceScale(5, 1)).toBe(1);
		expect(getNativeCursorClickBounceScale(5, 0.82)).toBeLessThan(0.9);
		expect(getNativeCursorClickBounceScale(5, 0.28)).toBeGreaterThan(1.05);
		expect(getNativeCursorClickBounceScale(5, 0)).toBe(1);
	});

	it("uses the default cursor asset for telemetry-only macOS recordings", () => {
		const recordingData = {
			version: 2,
			provider: "none" as const,
			assets: [],
			samples: [
				{ timeMs: 0, cx: 0.25, cy: 0.4, visible: true },
				{ timeMs: 100, cx: 0.75, cy: 0.6, visible: true },
			],
		};

		expect(hasNativeCursorRecordingData(recordingData)).toBe(true);
		const frame = resolveInterpolatedNativeCursorFrame(recordingData, 50);
		expect(frame?.asset.cursorType).toBe("arrow");
		expect(frame?.sample.cx).toBeCloseTo(0.5);
		expect(frame?.sample.cy).toBeCloseTo(0.5);
	});

	it("renders the natively captured cursor bitmap for untyped macOS samples", () => {
		const capturedAsset: NativeCursorAsset = {
			id: "sha-custom",
			platform: "darwin",
			imageDataUrl: "data:image/png;base64,CUSTOMCURSOR",
			width: 48,
			height: 48,
			hotspotX: 8,
			hotspotY: 8,
			scaleFactor: 2,
		};
		const recordingData = {
			version: 2,
			provider: "native" as const,
			assets: [capturedAsset],
			samples: [
				{ timeMs: 0, cx: 0.4, cy: 0.4, visible: true, assetId: "sha-custom" },
				{ timeMs: 100, cx: 0.6, cy: 0.6, visible: true, assetId: "sha-custom" },
			],
		};

		const frame = resolveInterpolatedNativeCursorFrame(recordingData, 50);
		expect(frame?.asset.id).toBe("sha-custom");

		// No cursorType => no bundled pretty SVG substitution => real captured bitmap,
		// downscaled from pixels to points via the asset scale factor.
		const rendered = resolveNativeCursorRenderAsset(capturedAsset, 1, frame?.sample);
		expect(rendered.imageDataUrl).toBe("data:image/png;base64,CUSTOMCURSOR");
		expect(rendered.width).toBe(24);
		expect(rendered.hotspotX).toBe(4);
	});

	it("applies click bounce to telemetry-only macOS recordings", () => {
		const recordingData = {
			version: 2,
			provider: "none" as const,
			assets: [],
			samples: [
				{ timeMs: 0, cx: 0.5, cy: 0.5, visible: true, interactionType: "move" as const },
				{ timeMs: 100, cx: 0.5, cy: 0.5, visible: true, interactionType: "click" as const },
				{ timeMs: 133, cx: 0.5, cy: 0.5, visible: true, interactionType: "move" as const },
			],
		};

		expect(getNativeCursorClickBounceProgress(recordingData, 133)).toBeGreaterThan(0);
	});
});
