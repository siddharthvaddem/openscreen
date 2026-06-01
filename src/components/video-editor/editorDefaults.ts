import type { ExportFormat, ExportQuality, GifFrameRate, GifSizePreset } from "@/lib/exporter";
import { DEFAULT_WALLPAPER } from "@/lib/wallpaper";
import type { AspectRatio } from "@/utils/aspectRatioUtils";
import {
	type CursorVisualSettings,
	DEFAULT_CROP_REGION,
	DEFAULT_CURSOR_CLICK_BOUNCE,
	DEFAULT_CURSOR_CLIP_TO_BOUNDS,
	DEFAULT_CURSOR_MOTION_BLUR,
	DEFAULT_CURSOR_SIZE,
	DEFAULT_CURSOR_SMOOTHING,
	DEFAULT_WEBCAM_LAYOUT_PRESET,
	DEFAULT_WEBCAM_MASK_SHAPE,
	DEFAULT_WEBCAM_POSITION,
	DEFAULT_WEBCAM_SIZE_PRESET,
	type WebcamLayoutPreset,
	type WebcamMaskShape,
	type WebcamPosition,
	type WebcamSizePreset,
} from "./types";

export const DEFAULT_SOURCE_DIMENSIONS = {
	width: 1920,
	height: 1080,
} as const;

export const DEFAULT_GIF_OUTPUT_DIMENSIONS = {
	width: 1280,
	height: 720,
} as const;

export const DEFAULT_EDITOR_APPEARANCE_SETTINGS: {
	shadowIntensity: number;
	showBlur: boolean;
	motionBlurAmount: number;
	borderRadius: number;
	showTrimWaveform: boolean;
} = {
	shadowIntensity: 0,
	showBlur: false,
	motionBlurAmount: 0,
	borderRadius: 0,
	showTrimWaveform: false,
};

export const DEFAULT_EDITOR_LAYOUT_SETTINGS: {
	padding: number;
	aspectRatio: AspectRatio;
	cropRegion: typeof DEFAULT_CROP_REGION;
	wallpaper: string;
} = {
	padding: 50,
	aspectRatio: "16:9",
	cropRegion: DEFAULT_CROP_REGION,
	wallpaper: DEFAULT_WALLPAPER,
};

export const DEFAULT_WEBCAM_SETTINGS = {
	layoutPreset: DEFAULT_WEBCAM_LAYOUT_PRESET,
	maskShape: DEFAULT_WEBCAM_MASK_SHAPE,
	sizePreset: DEFAULT_WEBCAM_SIZE_PRESET,
	position: DEFAULT_WEBCAM_POSITION,
} as const satisfies {
	layoutPreset: WebcamLayoutPreset;
	maskShape: WebcamMaskShape;
	sizePreset: WebcamSizePreset;
	position: WebcamPosition | null;
};

export const DEFAULT_CURSOR_SETTINGS: CursorVisualSettings & { show: boolean } = {
	show: true,
	size: DEFAULT_CURSOR_SIZE,
	smoothing: DEFAULT_CURSOR_SMOOTHING,
	motionBlur: DEFAULT_CURSOR_MOTION_BLUR,
	clickBounce: DEFAULT_CURSOR_CLICK_BOUNCE,
	clipToBounds: DEFAULT_CURSOR_CLIP_TO_BOUNDS,
};

export const DEFAULT_EXPORT_SETTINGS: {
	quality: ExportQuality;
	format: ExportFormat;
} = {
	quality: "good",
	format: "mp4",
};

export const DEFAULT_GIF_SETTINGS: {
	frameRate: GifFrameRate;
	loop: boolean;
	sizePreset: GifSizePreset;
	outputDimensions: typeof DEFAULT_GIF_OUTPUT_DIMENSIONS;
} = {
	frameRate: 15,
	loop: true,
	sizePreset: "medium",
	outputDimensions: DEFAULT_GIF_OUTPUT_DIMENSIONS,
};
