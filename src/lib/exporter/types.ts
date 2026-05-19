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
	warnings?: string[];
}

export interface VideoFrameData {
	frame: VideoFrame;
	timestamp: number; // in microseconds
	duration: number; // in microseconds
}

export type ExportQuality = "medium" | "good" | "source";

// GIF Export Types
export type ExportFormat = "mp4" | "gif" | "frame";

export type GifFrameRate = 15 | 20 | 25 | 30;

export type GifSizePreset = "medium" | "large" | "original";

export interface GifExportConfig {
	frameRate: GifFrameRate;
	loop: boolean;
	sizePreset: GifSizePreset;
	width: number;
	height: number;
}

// Frame Export Types
export type FrameFormat = "png" | "jpeg";
export type JpegQuality = "low" | "medium" | "high";
export type FrameSizePreset = "medium" | "large" | "original";

export const JPEG_QUALITY_MAP: Record<JpegQuality, number> = {
	low: 0.6,
	medium: 0.8,
	high: 0.95,
};

export const FRAME_SIZE_PRESETS: Record<FrameSizePreset, { maxHeight: number; label: string }> = {
	medium: { maxHeight: 720, label: "Medium (720p)" },
	large: { maxHeight: 1080, label: "Large (1080p)" },
	original: { maxHeight: Infinity, label: "Original" },
};

export interface FrameExportConfig {
	format: FrameFormat;
	jpegQuality: JpegQuality;
	sizePreset: FrameSizePreset;
	includeOverlays: boolean;
	removeBackground: boolean;
	timestamp: number; // milliseconds (playhead position)
}

export interface ExportSettings {
	format: ExportFormat;
	// MP4 settings
	quality?: ExportQuality;
	// GIF settings
	gifConfig?: GifExportConfig;
	// Frame settings
	frameConfig?: FrameExportConfig;
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
