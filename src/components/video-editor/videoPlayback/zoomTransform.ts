import { BlurFilter, Container } from "pixi.js";
import { MotionBlurFilter } from "pixi-filters/motion-blur";

const PEAK_VELOCITY_PPS = 1400;
const MAX_BLUR_PX = 14;
const VELOCITY_THRESHOLD_PPS = 12;
const MAX_AMOUNT_BOOST = 2.2;

function getMotionBlurAmountResponse(motionBlurAmount: number) {
	const clampedAmount = Math.min(1, Math.max(0, motionBlurAmount));
	// Keep the low end usable while giving the top of the slider more headroom.
	return clampedAmount * (1 + (MAX_AMOUNT_BOOST - 1) * clampedAmount);
}

export interface MotionBlurState {
	lastFrameTimeMs: number;
	prevCamX: number;
	prevCamY: number;
	prevCamScale: number;
	initialized: boolean;
}

export function createMotionBlurState(): MotionBlurState {
	return {
		lastFrameTimeMs: 0,
		prevCamX: 0,
		prevCamY: 0,
		prevCamScale: 1,
		initialized: false,
	};
}

interface TransformParams {
	cameraContainer: Container;
	blurFilter: BlurFilter | null;
	motionBlurFilter?: MotionBlurFilter | null;
	stageSize: { width: number; height: number };
	baseMask: { x: number; y: number; width: number; height: number };
	zoomScale: number;
	zoomProgress?: number;
	focusX: number;
	focusY: number;
	motionIntensity: number;
	motionVector?: { x: number; y: number };
	isPlaying: boolean;
	motionBlurAmount?: number;
	transformOverride?: AppliedTransform;
	motionBlurState?: MotionBlurState;
	frameTimeMs?: number;
}

interface AppliedTransform {
	scale: number;
	x: number;
	y: number;
}

interface FocusFromTransformGeometry {
	stageSize: { width: number; height: number };
	baseMask: { x: number; y: number; width: number; height: number };
	zoomScale: number;
	x: number;
	y: number;
}

interface ZoomTransformGeometry {
	stageSize: { width: number; height: number };
	baseMask: { x: number; y: number; width: number; height: number };
	zoomScale: number;
	zoomProgress?: number;
	focusX: number;
	focusY: number;
}

export function computeZoomTransform({
	stageSize,
	baseMask,
	zoomScale,
	zoomProgress = 1,
	focusX,
	focusY,
}: ZoomTransformGeometry): AppliedTransform {
	if (
		stageSize.width <= 0 ||
		stageSize.height <= 0 ||
		baseMask.width <= 0 ||
		baseMask.height <= 0
	) {
		return { scale: 1, x: 0, y: 0 };
	}

	const progress = Math.min(1, Math.max(0, zoomProgress));
	// Focus coords are stage-normalized (0-1 of full canvas), so map directly to stage pixels, not via baseMask.
	const focusStagePxX = focusX * stageSize.width;
	const focusStagePxY = focusY * stageSize.height;
	const stageCenterX = stageSize.width / 2;
	const stageCenterY = stageSize.height / 2;
	const scale = 1 + (zoomScale - 1) * progress;
	const finalX = stageCenterX - focusStagePxX * zoomScale;
	const finalY = stageCenterY - focusStagePxY * zoomScale;

	return {
		scale,
		x: finalX * progress,
		y: finalY * progress,
	};
}

export function computeFocusFromTransform({
	stageSize,
	baseMask,
	zoomScale,
	x,
	y,
}: FocusFromTransformGeometry) {
	if (
		stageSize.width <= 0 ||
		stageSize.height <= 0 ||
		baseMask.width <= 0 ||
		baseMask.height <= 0 ||
		zoomScale <= 0
	) {
		return { cx: 0.5, cy: 0.5 };
	}

	const stageCenterX = stageSize.width / 2;
	const stageCenterY = stageSize.height / 2;
	const focusStagePxX = (stageCenterX - x) / zoomScale;
	const focusStagePxY = (stageCenterY - y) / zoomScale;

	return {
		cx: focusStagePxX / stageSize.width,
		cy: focusStagePxY / stageSize.height,
	};
}

export function applyZoomTransform({
	cameraContainer,
	blurFilter,
	motionBlurFilter,
	stageSize,
	baseMask,
	zoomScale,
	zoomProgress = 1,
	focusX,
	focusY,
	motionIntensity: _motionIntensity,
	motionVector: _motionVector,
	isPlaying,
	motionBlurAmount = 0,
	transformOverride,
	motionBlurState,
	frameTimeMs,
}: TransformParams): AppliedTransform {
	if (
		stageSize.width <= 0 ||
		stageSize.height <= 0 ||
		baseMask.width <= 0 ||
		baseMask.height <= 0
	) {
		return { scale: 1, x: 0, y: 0 };
	}

	const transform =
		transformOverride ??
		computeZoomTransform({
			stageSize,
			baseMask,
			zoomScale,
			zoomProgress,
			focusX,
			focusY,
		});

	cameraContainer.scale.set(transform.scale);
	cameraContainer.position.set(transform.x, transform.y);

	if (motionBlurState && motionBlurFilter && motionBlurAmount > 0 && isPlaying) {
		const now = frameTimeMs ?? performance.now();

		if (!motionBlurState.initialized) {
			motionBlurState.prevCamX = transform.x;
			motionBlurState.prevCamY = transform.y;
			motionBlurState.prevCamScale = transform.scale;
			motionBlurState.lastFrameTimeMs = now;
			motionBlurState.initialized = true;
			motionBlurFilter.velocity = { x: 0, y: 0 };
			motionBlurFilter.kernelSize = 5;
			motionBlurFilter.offset = 0;
			if (blurFilter) blurFilter.blur = 0;
		} else {
			const dtMs = Math.min(80, Math.max(1, now - motionBlurState.lastFrameTimeMs));
			const dtSeconds = dtMs / 1000;
			motionBlurState.lastFrameTimeMs = now;
			const amountResponse = getMotionBlurAmountResponse(motionBlurAmount);

			// Camera displacement this frame (stage-px)
			const dx = transform.x - motionBlurState.prevCamX;
			const dy = transform.y - motionBlurState.prevCamY;
			const dScale = transform.scale - motionBlurState.prevCamScale;

			motionBlurState.prevCamX = transform.x;
			motionBlurState.prevCamY = transform.y;
			motionBlurState.prevCamScale = transform.scale;

			// Velocity in px/s (translation + scale-change contribution)
			const velocityX = dx / dtSeconds;
			const velocityY = dy / dtSeconds;
			const scaleVelocity =
				Math.abs(dScale / dtSeconds) * Math.max(stageSize.width, stageSize.height) * 0.5;
			const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY) + scaleVelocity;

			const normalised = Math.min(1, speed / PEAK_VELOCITY_PPS);
			const targetBlur =
				speed < VELOCITY_THRESHOLD_PPS ? 0 : normalised * normalised * MAX_BLUR_PX * amountResponse;

			const dirMag = Math.sqrt(velocityX * velocityX + velocityY * velocityY) || 1;
			const velocityScale = targetBlur * 2.4;
			motionBlurFilter.velocity =
				targetBlur > 0
					? { x: (velocityX / dirMag) * velocityScale, y: (velocityY / dirMag) * velocityScale }
					: { x: 0, y: 0 };
			motionBlurFilter.kernelSize = targetBlur > 8 ? 15 : targetBlur > 4 ? 11 : 7;
			motionBlurFilter.offset = targetBlur > 0.5 ? -0.2 : 0;

			if (blurFilter) {
				blurFilter.blur = 0;
			}
		}
	} else {
		if (motionBlurFilter) {
			motionBlurFilter.velocity = { x: 0, y: 0 };
			motionBlurFilter.kernelSize = 5;
			motionBlurFilter.offset = 0;
		}
		if (blurFilter) {
			blurFilter.blur = 0;
		}
		if (motionBlurState) {
			motionBlurState.initialized = false;
		}
	}

	return {
		scale: transform.scale,
		x: transform.x,
		y: transform.y,
	};
}
