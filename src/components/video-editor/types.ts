import type { WebcamLayoutPreset } from "@/lib/compositeLayout";

export type ZoomDepth = 1 | 2 | 3 | 4 | 5 | 6;
export type ZoomFocusMode = "manual" | "auto";
export type EditMode = "manual" | "auto";
export type AutoEditStyle = "calm" | "balanced" | "emphasis";
export type AutoEditFocusStrategy = "cursor" | "activity";
export type AutoEditBackgroundMode = "keep" | "remove";
export type AutoEditPauseMode = "off" | "light" | "balanced" | "aggressive";
export type { WebcamLayoutPreset };

export const DEFAULT_WEBCAM_LAYOUT_PRESET: WebcamLayoutPreset = "picture-in-picture";

export type WebcamMaskShape = "rectangle" | "circle" | "square" | "rounded";

export const DEFAULT_WEBCAM_MASK_SHAPE: WebcamMaskShape = "rectangle";

export interface WebcamPosition {
	cx: number; // normalized horizontal center (0-1)
	cy: number; // normalized vertical center (0-1)
}

export const DEFAULT_WEBCAM_POSITION: WebcamPosition | null = null;

export interface ZoomFocus {
	cx: number; // normalized horizontal center (0-1)
	cy: number; // normalized vertical center (0-1)
}

export interface ZoomRegion {
	id: string;
	startMs: number;
	endMs: number;
	depth: ZoomDepth;
	focus: ZoomFocus;
	focusMode?: ZoomFocusMode;
}

export interface CursorTelemetryPoint {
	timeMs: number;
	cx: number;
	cy: number;
}

export interface TrimRegion {
	id: string;
	startMs: number;
	endMs: number;
}

export type AnnotationType = "text" | "image" | "figure";

export type ArrowDirection =
	| "up"
	| "down"
	| "left"
	| "right"
	| "up-right"
	| "up-left"
	| "down-right"
	| "down-left";

export interface FigureData {
	arrowDirection: ArrowDirection;
	color: string;
	strokeWidth: number;
}

export interface AnnotationPosition {
	x: number;
	y: number;
}

export interface AnnotationSize {
	width: number;
	height: number;
}

export interface AnnotationTextStyle {
	color: string;
	backgroundColor: string;
	fontSize: number; // pixels
	fontFamily: string;
	fontWeight: "normal" | "bold";
	fontStyle: "normal" | "italic";
	textDecoration: "none" | "underline";
	textAlign: "left" | "center" | "right";
}

export interface AnnotationRegion {
	id: string;
	startMs: number;
	endMs: number;
	type: AnnotationType;
	content: string; // Legacy - still used for current type
	textContent?: string; // Separate storage for text
	imageContent?: string; // Separate storage for image data URL
	position: AnnotationPosition;
	size: AnnotationSize;
	style: AnnotationTextStyle;
	zIndex: number;
	figureData?: FigureData;
}

export const DEFAULT_ANNOTATION_POSITION: AnnotationPosition = {
	x: 50,
	y: 50,
};

export const DEFAULT_ANNOTATION_SIZE: AnnotationSize = {
	width: 30,
	height: 20,
};

export const DEFAULT_ANNOTATION_STYLE: AnnotationTextStyle = {
	color: "#ffffff",
	backgroundColor: "transparent",
	fontSize: 32,
	fontFamily: "Inter",
	fontWeight: "bold",
	fontStyle: "normal",
	textDecoration: "none",
	textAlign: "center",
};

export const DEFAULT_FIGURE_DATA: FigureData = {
	arrowDirection: "right",
	color: "#34B27B",
	strokeWidth: 4,
};

export interface CropRegion {
	x: number;
	y: number;
	width: number;
	height: number;
}

export const DEFAULT_CROP_REGION: CropRegion = {
	x: 0,
	y: 0,
	width: 1,
	height: 1,
};

export type PlaybackSpeed = number;
export type SmartSpeedIntensity = "light" | "balanced" | "aggressive";

export const MIN_PLAYBACK_SPEED = 0.1;
// Anything above 16x causes the playhead to stall during preview
// due to the video decoder not being able to keep up.
export const MAX_PLAYBACK_SPEED = 16;

export function clampPlaybackSpeed(speed: number): PlaybackSpeed {
	return Math.round(Math.min(MAX_PLAYBACK_SPEED, Math.max(MIN_PLAYBACK_SPEED, speed)) * 100) / 100;
}

export interface SpeedRegion {
	id: string;
	startMs: number;
	endMs: number;
	speed: PlaybackSpeed;
}

export const SPEED_OPTIONS: Array<{ speed: PlaybackSpeed; label: string }> = [
	{ speed: 0.25, label: "0.25×" },
	{ speed: 0.5, label: "0.5×" },
	{ speed: 0.75, label: "0.75×" },
	{ speed: 1.25, label: "1.25×" },
	{ speed: 1.5, label: "1.5×" },
	{ speed: 1.75, label: "1.75×" },
	{ speed: 2, label: "2×" },
	{ speed: 3, label: "3×" },
	{ speed: 4, label: "4×" },
	{ speed: 5, label: "5×" },
];

export const DEFAULT_PLAYBACK_SPEED: PlaybackSpeed = 1.5;

export const ZOOM_DEPTH_SCALES: Record<ZoomDepth, number> = {
	1: 1.25,
	2: 1.5,
	3: 1.8,
	4: 2.2,
	5: 3.5,
	6: 5.0,
};

export const DEFAULT_ZOOM_DEPTH: ZoomDepth = 3;
export const DEFAULT_EDIT_MODE: EditMode = "manual";

export function clampFocusToDepth(focus: ZoomFocus, _depth: ZoomDepth): ZoomFocus {
	return {
		cx: clamp(focus.cx, 0, 1),
		cy: clamp(focus.cy, 0, 1),
	};
}

function clamp(value: number, min: number, max: number) {
	if (Number.isNaN(value)) return (min + max) / 2;
	return Math.min(max, Math.max(min, value));
}
