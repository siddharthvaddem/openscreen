import type { WebcamLayoutPreset } from "@/lib/compositeLayout";

export type ZoomDepth = 1 | 2 | 3 | 4 | 5 | 6;
export type ZoomFocusMode = "manual" | "auto";
export type { WebcamLayoutPreset };
/** Webcam size as a percentage of the canvas reference dimension (10–50). */
export type WebcamSizePreset = number;

export const DEFAULT_WEBCAM_SIZE_PRESET: WebcamSizePreset = 25;

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

export interface Rotation3D {
	rotationX: number;
	rotationY: number;
	rotationZ: number;
}

export const DEFAULT_ROTATION_3D: Rotation3D = {
	rotationX: 0,
	rotationY: 0,
	rotationZ: 0,
};

export type Rotation3DPreset = "iso" | "left" | "right";

export const ROTATION_3D_PRESETS: Record<Rotation3DPreset, Rotation3D> = {
	iso: { rotationX: -10, rotationY: -16, rotationZ: 0 },
	left: { rotationX: 0, rotationY: -22, rotationZ: 0 },
	right: { rotationX: 0, rotationY: 22, rotationZ: 0 },
};

export const ROTATION_3D_PRESET_ORDER: Rotation3DPreset[] = ["iso", "left", "right"];

/** Perspective distance in CSS px is computed at render-time as this factor times
 * min(viewport width, viewport height). Same factor used in preview and export so
 * the visual look is identical regardless of canvas resolution. */
export const ROTATION_3D_PERSPECTIVE_FACTOR = 2.6;

export function rotation3DPerspective(width: number, height: number): number {
	return Math.min(width, height) * ROTATION_3D_PERSPECTIVE_FACTOR;
}

export interface ZoomRegion {
	id: string;
	startMs: number;
	endMs: number;
	depth: ZoomDepth;
	focus: ZoomFocus;
	focusMode?: ZoomFocusMode;
	rotationPreset?: Rotation3DPreset;
	/** Custom scale overriding the preset depth (1.0–5.0, two decimal precision). */
	customScale?: number;
}

export function getRotation3D(region: Pick<ZoomRegion, "rotationPreset">): Rotation3D {
	if (!region.rotationPreset) return DEFAULT_ROTATION_3D;
	return ROTATION_3D_PRESETS[region.rotationPreset];
}

export function isRotation3DIdentity(r: Rotation3D, eps = 0.01): boolean {
	return Math.abs(r.rotationX) < eps && Math.abs(r.rotationY) < eps && Math.abs(r.rotationZ) < eps;
}

export function lerpRotation3D(a: Rotation3D, b: Rotation3D, t: number): Rotation3D {
	return {
		rotationX: a.rotationX + (b.rotationX - a.rotationX) * t,
		rotationY: a.rotationY + (b.rotationY - a.rotationY) * t,
		rotationZ: a.rotationZ + (b.rotationZ - a.rotationZ) * t,
	};
}

/**
 * Compute the maximum uniform scale that, when applied alongside `rot` and a perspective
 * of `perspective` CSS px, keeps the projected bounding box of a `width × height` element
 * inside its original `width × height` rectangle. Returns 1 when no scaling is needed.
 *
 * Math: project each rotated corner onto the screen via x' = x·P/(P−z); take the worst-case
 * |x'|/|y'| against the half-extents and return the limiting ratio. This makes the rotated
 * recording sit *inside* the zoom window instead of bleeding past it.
 */
export function computeRotation3DContainScale(
	rot: Rotation3D,
	width: number,
	height: number,
	perspective: number,
): number {
	const a = (rot.rotationX * Math.PI) / 180;
	const b = (rot.rotationY * Math.PI) / 180;
	const g = (rot.rotationZ * Math.PI) / 180;
	const ca = Math.cos(a);
	const sa = Math.sin(a);
	const cb = Math.cos(b);
	const sb = Math.sin(b);
	const cg = Math.cos(g);
	const sg = Math.sin(g);
	const halfW = width / 2;
	const halfH = height / 2;
	const corners: Array<[number, number]> = [
		[-halfW, -halfH],
		[halfW, -halfH],
		[halfW, halfH],
		[-halfW, halfH],
	];

	let maxAbsX = 0;
	let maxAbsY = 0;

	for (const [x0, y0] of corners) {
		// CSS "rotateX(α) rotateY(β) rotateZ(γ)" reads right-to-left: Z first, then Y, then X.
		let px = x0;
		let py = y0;
		let pz = 0;

		// rotateZ
		const zx = px * cg - py * sg;
		const zy = px * sg + py * cg;
		px = zx;
		py = zy;

		// rotateY
		const yx = px * cb + pz * sb;
		const yz = -px * sb + pz * cb;
		px = yx;
		pz = yz;

		// rotateX
		const xy = py * ca - pz * sa;
		const xz = py * sa + pz * ca;
		py = xy;
		pz = xz;

		// Perspective projection: viewer at (0, 0, P), looking toward −z. A point at z=pz
		// is scaled by P / (P − pz). When perspective ≤ 0 we treat as orthographic.
		if (perspective > 0) {
			const denom = perspective - pz;
			if (denom <= 0) return 1; // pathological — skip scaling rather than crash
			const f = perspective / denom;
			px *= f;
			py *= f;
		}

		if (Math.abs(px) > maxAbsX) maxAbsX = Math.abs(px);
		if (Math.abs(py) > maxAbsY) maxAbsY = Math.abs(py);
	}

	if (maxAbsX === 0 || maxAbsY === 0) return 1;
	const sx = halfW / maxAbsX;
	const sy = halfH / maxAbsY;
	return Math.min(sx, sy, 1);
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

export type AnnotationType = "text" | "image" | "figure" | "blur";

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

export type BlurShape = "rectangle" | "oval" | "freehand";
export type BlurType = "blur" | "mosaic";
export type BlurColor = "white" | "black";

export const MIN_BLUR_INTENSITY = 2;
export const MAX_BLUR_INTENSITY = 40;
export const DEFAULT_BLUR_INTENSITY = 12;
export const MIN_BLUR_BLOCK_SIZE = 4;
export const MAX_BLUR_BLOCK_SIZE = 48;
export const DEFAULT_BLUR_BLOCK_SIZE = 12;

export interface BlurData {
	type: BlurType;
	shape: BlurShape;
	color: BlurColor;
	intensity: number;
	blockSize: number;
	// Points are normalized (0-100) within the annotation bounds.
	freehandPoints?: Array<{ x: number; y: number }>;
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
	blurData?: BlurData;
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

export const DEFAULT_BLUR_FREEHAND_POINTS: Array<{ x: number; y: number }> = [
	{ x: 10, y: 30 },
	{ x: 25, y: 10 },
	{ x: 55, y: 8 },
	{ x: 82, y: 20 },
	{ x: 90, y: 45 },
	{ x: 78, y: 72 },
	{ x: 52, y: 90 },
	{ x: 22, y: 84 },
	{ x: 8, y: 58 },
];

export const DEFAULT_BLUR_DATA: BlurData = {
	type: "mosaic",
	shape: "rectangle",
	color: "white",
	intensity: DEFAULT_BLUR_INTENSITY,
	blockSize: DEFAULT_BLUR_BLOCK_SIZE,
	freehandPoints: DEFAULT_BLUR_FREEHAND_POINTS,
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

export const MIN_ZOOM_SCALE = 1.0;
export const MAX_ZOOM_SCALE = 5.0;

export const DEFAULT_ZOOM_DEPTH: ZoomDepth = 3;

/** Returns the effective zoom scale for a region, preferring customScale over the preset. */
export function getZoomScale(region: ZoomRegion): number {
	if (region.customScale != null) {
		const clamped = Math.max(MIN_ZOOM_SCALE, Math.min(MAX_ZOOM_SCALE, region.customScale));
		if (Number.isFinite(clamped)) return clamped;
	}
	return ZOOM_DEPTH_SCALES[region.depth];
}

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
