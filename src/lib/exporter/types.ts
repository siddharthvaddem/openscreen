export {
	type ExportConfig,
	type ExportFormat,
	type ExportProgress,
	type ExportQuality,
	type ExportSettings,
	GIF_FRAME_RATES,
	GIF_SIZE_PRESETS,
	type GifExportConfig,
	type GifFrameRate,
	type GifSizePreset,
	isValidGifFrameRate,
	VALID_GIF_FRAME_RATES,
} from "@/shared/export-types";

// Browser-only types — require WebCodecs (VideoFrame) and DOM (Blob) APIs.
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
