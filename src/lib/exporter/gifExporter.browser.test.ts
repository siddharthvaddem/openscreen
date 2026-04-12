import { describe, expect, it } from "vitest";
import sampleVideoUrl from "../../../tests/fixtures/sample.webm?url";
import { GifExporter } from "./gifExporter";
import type { ExportProgress } from "./types";

const browserWorkerAvailable = typeof Worker !== "undefined";

describe("GifExporter (real browser)", () => {
	const testIfBrowserWorker = browserWorkerAvailable ? it : it.skip;

	testIfBrowserWorker("exports a valid GIF blob from a real video", async () => {
		const progressEvents: ExportProgress[] = [];

		const exporter = new GifExporter({
			videoUrl: sampleVideoUrl,
			width: 320,
			height: 180,
			frameRate: 15,
			loop: true,
			sizePreset: "medium",
			wallpaper: "#1a1a2e",
			zoomRegions: [],
			showShadow: false,
			shadowIntensity: 0,
			showBlur: false,
			cropRegion: { x: 0, y: 0, width: 1, height: 1 },
			onProgress: (p) => progressEvents.push(p),
		});

		const result = await exporter.export();

		expect(result.success, result.error).toBe(true);
		expect(result.blob).toBeInstanceOf(Blob);

		const buf = await result.blob!.arrayBuffer();
		const header = new TextDecoder().decode(new Uint8Array(buf, 0, 6));
		expect(header).toMatch(/^GIF8[79]a/);

		expect(result.blob!.size).toBeGreaterThan(1024);

		expect(progressEvents.length).toBeGreaterThan(0);

		const finalizing = progressEvents.filter((p) => p.phase === "finalizing");
		expect(finalizing.length).toBeGreaterThan(0);
		expect(finalizing.at(-1)!.percentage).toBe(100);
	});
});
