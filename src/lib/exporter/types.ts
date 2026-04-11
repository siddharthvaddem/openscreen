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

export interface ExportResult {
	success: boolean;
	blob?: Blob;
	error?: string;
}

export interface VideoFrameData {
	frame: VideoFrame;
	timestamp: number; // in microseconds
	duration: number; // in microseconds
}

export type ExportQuality = "medium" | "good" | "source";

// GIF Export Types
export type ExportFormat = "mp4" | "gif";

export type GifFrameRate = 15 | 20 | 25 | 30;

export type Mp4FrameRate = 24 | 30 | 60;

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

/** Display metadata for each GIF size preset, mapping preset name to max height and label. */
export const GIF_SIZE_PRESETS: Record<GifSizePreset, { maxHeight: number; label: string }> = {
	medium: { maxHeight: 720, label: "Medium (720p)" },
	large: { maxHeight: 1080, label: "Large (1080p)" },
	original: { maxHeight: Infinity, label: "Original" },
};

/** Display metadata for each supported MP4 frame rate option. */
export const MP4_FRAME_RATES: { value: Mp4FrameRate; label: string }[] = [
	{ value: 24, label: "24 FPS" },
	{ value: 30, label: "30 FPS" },
	{ value: 60, label: "60 FPS" },
];

/** Tuple of every valid MP4 frame rate value used for runtime validation. */
export const VALID_MP4_FRAME_RATES: readonly Mp4FrameRate[] = [24, 30, 60] as const;

/**
 * Type guard that checks whether a number is a valid {@link Mp4FrameRate}.
 *
 * @param rate - The frame rate value to test.
 * @returns `true` if `rate` is 24, 30, or 60; `false` otherwise.
 */
export function isValidMp4FrameRate(rate: number): rate is Mp4FrameRate {
	return VALID_MP4_FRAME_RATES.includes(rate as Mp4FrameRate);
}

/** Display metadata for each supported GIF frame rate option. */
export const GIF_FRAME_RATES: { value: GifFrameRate; label: string }[] = [
	{ value: 15, label: "15 FPS - Balanced" },
	{ value: 20, label: "20 FPS - Smooth" },
	{ value: 25, label: "25 FPS - Very smooth" },
	{ value: 30, label: "30 FPS - Maximum" },
];

/** Tuple of every valid GIF frame rate value used for runtime validation. */
export const VALID_GIF_FRAME_RATES: readonly GifFrameRate[] = [15, 20, 25, 30] as const;

/**
 * Type guard that checks whether a number is a valid {@link GifFrameRate}.
 *
 * @param rate - The frame rate value to test.
 * @returns `true` if `rate` is 15, 20, 25, or 30; `false` otherwise.
 */
export function isValidGifFrameRate(rate: number): rate is GifFrameRate {
	return VALID_GIF_FRAME_RATES.includes(rate as GifFrameRate);
}
