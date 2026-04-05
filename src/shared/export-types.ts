// Shared export types — pure TypeScript, no browser dependencies.
// Original source: src/lib/exporter/types.ts
// NOTE: VideoFrameData and ExportResult are NOT included here because they
// reference browser-only types (VideoFrame, Blob). They remain in the original file.

export interface ExportConfig {
	width: number;
	height: number;
	frameRate: number;
	bitrate: number;
	codec?: string;
}

export interface ExportProgress {
	currentFrame: number;
	totalFrames: number;
	percentage: number;
	estimatedTimeRemaining: number; // in seconds
	phase?: "extracting" | "finalizing"; // Phase of export
	renderProgress?: number; // 0-100, progress of GIF rendering phase
}

export type ExportQuality = "medium" | "good" | "source";

// GIF Export Types
export type ExportFormat = "mp4" | "gif";

export type GifFrameRate = 15 | 20 | 25 | 30;

export type GifSizePreset = "medium" | "large" | "original";

export interface GifExportConfig {
	frameRate: GifFrameRate;
	loop: boolean;
	sizePreset: GifSizePreset;
	width: number;
	height: number;
}

export interface ExportSettings {
	format: ExportFormat;
	// MP4 settings
	quality?: ExportQuality;
	// GIF settings
	gifConfig?: GifExportConfig;
}

export const GIF_SIZE_PRESETS: Record<GifSizePreset, { maxHeight: number; label: string }> = {
	medium: { maxHeight: 720, label: "Medium (720p)" },
	large: { maxHeight: 1080, label: "Large (1080p)" },
	original: { maxHeight: Infinity, label: "Original" },
};

export const GIF_FRAME_RATES: { value: GifFrameRate; label: string }[] = [
	{ value: 15, label: "15 FPS - Balanced" },
	{ value: 20, label: "20 FPS - Smooth" },
	{ value: 25, label: "25 FPS - Very smooth" },
	{ value: 30, label: "30 FPS - Maximum" },
];

// Valid frame rates for validation
export const VALID_GIF_FRAME_RATES: readonly GifFrameRate[] = [15, 20, 25, 30] as const;

export function isValidGifFrameRate(rate: number): rate is GifFrameRate {
	return VALID_GIF_FRAME_RATES.includes(rate as GifFrameRate);
}

/**
 * Calculate MP4 export dimensions and bitrate from source dimensions, aspect ratio, and quality.
 * Shared between VideoEditor (GUI) and CliExportRenderer (headless).
 */
export function calculateMp4Dimensions(
	sourceWidth: number,
	sourceHeight: number,
	aspectRatioValue: number,
	quality: ExportQuality,
): { exportWidth: number; exportHeight: number; bitrate: number } {
	let exportWidth: number;
	let exportHeight: number;
	let bitrate: number;

	if (quality === "source") {
		exportWidth = sourceWidth;
		exportHeight = sourceHeight;

		if (aspectRatioValue === 1) {
			const baseDimension = Math.floor(Math.min(sourceWidth, sourceHeight) / 2) * 2;
			exportWidth = baseDimension;
			exportHeight = baseDimension;
		} else if (aspectRatioValue > 1) {
			const baseWidth = Math.floor(sourceWidth / 2) * 2;
			let found = false;
			for (let w = baseWidth; w >= 100 && !found; w -= 2) {
				const h = Math.round(w / aspectRatioValue);
				if (h % 2 === 0 && Math.abs(w / h - aspectRatioValue) < 0.0001) {
					exportWidth = w;
					exportHeight = h;
					found = true;
				}
			}
			if (!found) {
				exportWidth = baseWidth;
				exportHeight = Math.floor(baseWidth / aspectRatioValue / 2) * 2;
			}
		} else {
			const baseHeight = Math.floor(sourceHeight / 2) * 2;
			let found = false;
			for (let h = baseHeight; h >= 100 && !found; h -= 2) {
				const w = Math.round(h * aspectRatioValue);
				if (w % 2 === 0 && Math.abs(w / h - aspectRatioValue) < 0.0001) {
					exportWidth = w;
					exportHeight = h;
					found = true;
				}
			}
			if (!found) {
				exportHeight = baseHeight;
				exportWidth = Math.floor((baseHeight * aspectRatioValue) / 2) * 2;
			}
		}

		const totalPixels = exportWidth * exportHeight;
		bitrate = 30_000_000;
		if (totalPixels > 1920 * 1080 && totalPixels <= 2560 * 1440) bitrate = 50_000_000;
		else if (totalPixels > 2560 * 1440) bitrate = 80_000_000;
	} else {
		const targetHeight = quality === "medium" ? 720 : 1080;
		exportHeight = Math.floor(targetHeight / 2) * 2;
		exportWidth = Math.floor((exportHeight * aspectRatioValue) / 2) * 2;

		const totalPixels = exportWidth * exportHeight;
		if (totalPixels <= 1280 * 720) bitrate = 10_000_000;
		else if (totalPixels <= 1920 * 1080) bitrate = 20_000_000;
		else bitrate = 30_000_000;
	}

	return { exportWidth, exportHeight, bitrate };
}
