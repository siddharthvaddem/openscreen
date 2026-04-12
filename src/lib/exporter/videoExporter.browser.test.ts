import { readFile } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ExportProgress } from "./types";
import { VideoExporter } from "./videoExporter";

const sampleVideoPath = path.resolve(process.cwd(), "tests/fixtures/sample.webm");

const windowWithElectron = window as Window & {
	electronAPI?: {
		readBinaryFile?: (
			path: string,
		) => Promise<{ success: boolean; data?: Uint8Array; path?: string; message?: string }>;
	};
};

const originalElectronAPI = windowWithElectron.electronAPI;
const browserWorkerAvailable = typeof Worker !== "undefined";

beforeAll(() => {
	windowWithElectron.electronAPI = {
		...windowWithElectron.electronAPI,
		readBinaryFile: async (path: string) => {
			if (path !== sampleVideoPath) {
				return { success: false, message: "Unexpected fixture path" };
			}

			const buffer = await readFile(path);
			return { success: true, data: new Uint8Array(buffer), path };
		},
	};
});

afterAll(() => {
	windowWithElectron.electronAPI = originalElectronAPI;
});

describe("VideoExporter (real browser)", () => {
	const testIfBrowserWorker = browserWorkerAvailable ? it : it.skip;

	testIfBrowserWorker("exports a valid MP4 blob from a real video", async () => {
		const progressEvents: ExportProgress[] = [];

		const exporter = new VideoExporter({
			videoUrl: sampleVideoPath,
			width: 320,
			height: 180,
			frameRate: 15,
			bitrate: 1_000_000,
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
		const bytes = new Uint8Array(buf);
		const ftyp = new TextDecoder().decode(bytes.slice(4, 8));
		expect(ftyp).toBe("ftyp");

		expect(result.blob!.size).toBeGreaterThan(1024);

		expect(progressEvents.length).toBeGreaterThan(0);

		const finalizing = progressEvents.filter((p) => p.phase === "finalizing");
		expect(finalizing.length).toBeGreaterThan(0);
		expect(finalizing.at(-1)!.percentage).toBe(100);
	});
});
