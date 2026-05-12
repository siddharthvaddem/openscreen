import { type Container, Point } from "pixi.js";
import arrowUrl from "@/assets/cursors/Cursor=AeroDefault.svg";
import appStartingUrl from "@/assets/cursors/Cursor=App-Starting.svg";
import crosshairUrl from "@/assets/cursors/Cursor=Cross.svg";
import closedHandUrl from "@/assets/cursors/Cursor=Hand-(Grabbing).svg";
import openHandUrl from "@/assets/cursors/Cursor=Hand-(Open).svg";
import pointerUrl from "@/assets/cursors/Cursor=Hand-(Pointing).svg";
import helpUrl from "@/assets/cursors/Cursor=Help.svg";
import moveUrl from "@/assets/cursors/Cursor=Move.svg";
import notAllowedUrl from "@/assets/cursors/Cursor=Not-Allowed.svg";
import resizeNeswUrl from "@/assets/cursors/Cursor=Resize-North-East-South-West.svg";
import resizeNsUrl from "@/assets/cursors/Cursor=Resize-North-South.svg";
import resizeNwseUrl from "@/assets/cursors/Cursor=Resize-North-West-South-East.svg";
import resizeEwUrl from "@/assets/cursors/Cursor=Resize-West-East.svg";
import textUrl from "@/assets/cursors/Cursor=Text-Cursor.svg";
import upArrowUrl from "@/assets/cursors/Cursor=Up-Arrow.svg";
import waitUrl from "@/assets/cursors/Cursor=Wait.svg";
import type { CropRegion } from "@/components/video-editor/types";
import type {
	CursorRecordingData,
	CursorRecordingSample,
	NativeCursorAsset,
	NativeCursorType,
} from "@/native/contracts";

export interface ActiveNativeCursorFrame {
	asset: NativeCursorAsset;
	sample: CursorRecordingSample;
}

export interface NativeCursorSmoothingState {
	cx: number;
	cy: number;
	lastTimeMs: number | null;
	initialized: boolean;
}

export interface NativeCursorMotionBlurState {
	x: number;
	y: number;
	lastTimeMs: number | null;
	initialized: boolean;
}

interface ProjectNativeCursorOptions {
	cropRegion: CropRegion;
	maskRect: { x: number; y: number; width: number; height: number };
	sample: CursorRecordingSample;
}

interface ProjectNativeCursorToStageOptions extends ProjectNativeCursorOptions {
	cameraContainer: Container;
	videoContainerPosition: { x: number; y: number };
}

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

const NATIVE_CURSOR_CLICK_ANIMATION_MS = 260;
const NATIVE_CURSOR_MOTION_BLUR_MAX_PX = 6;
const nativeCursorAssetMapCache = new WeakMap<
	CursorRecordingData,
	Map<string, NativeCursorAsset>
>();

function findNativeCursorSampleIndexAtOrBefore(samples: CursorRecordingSample[], timeMs: number) {
	let low = 0;
	let high = samples.length - 1;
	let result = -1;

	while (low <= high) {
		const middle = low + Math.floor((high - low) / 2);
		if (samples[middle].timeMs <= timeMs) {
			result = middle;
			low = middle + 1;
		} else {
			high = middle - 1;
		}
	}

	return result;
}

function getNativeCursorAssetMap(recordingData: CursorRecordingData) {
	const cached = nativeCursorAssetMapCache.get(recordingData);
	if (cached) {
		return cached;
	}

	const assetMap = new Map(recordingData.assets.map((asset) => [asset.id, asset]));
	nativeCursorAssetMapCache.set(recordingData, assetMap);
	return assetMap;
}

function getNativeCursorAsset(recordingData: CursorRecordingData, assetId: string) {
	return getNativeCursorAssetMap(recordingData).get(assetId) ?? null;
}

export interface PrettyNativeCursorAsset {
	imageDataUrl: string;
	width: number;
	height: number;
	hotspotX: number;
	hotspotY: number;
}

export const PRETTY_NATIVE_CURSOR_ASSETS: Partial<
	Record<NativeCursorType, PrettyNativeCursorAsset>
> = {
	arrow: {
		imageDataUrl: arrowUrl,
		// Cursor=AeroDefault.svg viewBox is "0 0 36.7 56.2" (portrait, 1:1.53 ratio).
		// At width=32 CSS px: height = 32 × 56.2/36.7 ≈ 49.
		// Tip polygon vertex is at SVG (0.8, 1.8) → hotspot ≈ (1, 2) at 32px render.
		width: 32,
		height: 49,
		hotspotX: 1,
		hotspotY: 2,
	},
	text: {
		imageDataUrl: textUrl,
		width: 32,
		height: 32,
		hotspotX: 16,
		hotspotY: 16,
	},
	pointer: {
		imageDataUrl: pointerUrl,
		width: 32,
		height: 33,
		hotspotX: 16.65,
		hotspotY: 14.24,
	},
	crosshair: {
		imageDataUrl: crosshairUrl,
		width: 32,
		height: 32,
		hotspotX: 16,
		hotspotY: 16,
	},
	"open-hand": {
		imageDataUrl: openHandUrl,
		width: 32,
		height: 32,
		hotspotX: 16,
		hotspotY: 9,
	},
	"closed-hand": {
		imageDataUrl: closedHandUrl,
		width: 32,
		height: 32,
		hotspotX: 16,
		hotspotY: 9,
	},
	"resize-ew": {
		imageDataUrl: resizeEwUrl,
		width: 32,
		height: 32,
		hotspotX: 16,
		hotspotY: 16,
	},
	"resize-ns": {
		imageDataUrl: resizeNsUrl,
		width: 32,
		height: 32,
		hotspotX: 16,
		hotspotY: 16,
	},
	"resize-nesw": {
		imageDataUrl: resizeNeswUrl,
		width: 32,
		height: 32,
		hotspotX: 16,
		hotspotY: 16,
	},
	"resize-nwse": {
		imageDataUrl: resizeNwseUrl,
		width: 32,
		height: 32,
		hotspotX: 16,
		hotspotY: 16,
	},
	move: {
		imageDataUrl: moveUrl,
		width: 32,
		height: 32,
		hotspotX: 16,
		hotspotY: 16,
	},
	"not-allowed": {
		imageDataUrl: notAllowedUrl,
		width: 32,
		height: 32,
		hotspotX: 16,
		hotspotY: 16,
	},
	wait: {
		imageDataUrl: waitUrl,
		width: 32,
		height: 32,
		hotspotX: 16,
		hotspotY: 16,
	},
	"app-starting": {
		imageDataUrl: appStartingUrl,
		width: 32,
		height: 32,
		hotspotX: 7.25,
		hotspotY: 4.03,
	},
	help: {
		imageDataUrl: helpUrl,
		width: 32,
		height: 32,
		hotspotX: 7.25,
		hotspotY: 4.03,
	},
	"up-arrow": {
		imageDataUrl: upArrowUrl,
		width: 32,
		height: 32,
		hotspotX: 16,
		hotspotY: 3,
	},
};

function resolveUntypedPrettyNativeCursorAsset(asset: NativeCursorAsset) {
	if (
		asset.cursorType ||
		asset.width < 24 ||
		asset.width > 64 ||
		asset.height < 24 ||
		asset.height > 64
	) {
		return null;
	}

	const hotspotXNorm = asset.hotspotX / asset.width;
	const hotspotYNorm = asset.hotspotY / asset.height;
	const looksLikeChromiumGrabCursor =
		hotspotXNorm >= 0.22 && hotspotXNorm <= 0.55 && hotspotYNorm >= 0.2 && hotspotYNorm <= 0.45;

	return looksLikeChromiumGrabCursor ? (PRETTY_NATIVE_CURSOR_ASSETS["open-hand"] ?? null) : null;
}

export function hasNativeCursorRecordingData(
	recordingData: CursorRecordingData | null | undefined,
): recordingData is CursorRecordingData {
	// assets.length is intentionally NOT required here: editable-overlay recordings
	// hide the OS cursor with SetSystemCursor so every captured bitmap is transparent
	// and no assets are stored, but the samples still carry cursor-type and position
	// data that the editor can render using the pretty SVG cursor assets.
	return Boolean(
		recordingData && recordingData.provider === "native" && recordingData.samples.length > 0,
	);
}

export function createNativeCursorSmoothingState(): NativeCursorSmoothingState {
	return {
		cx: 0,
		cy: 0,
		lastTimeMs: null,
		initialized: false,
	};
}

export function resetNativeCursorSmoothingState(state: NativeCursorSmoothingState) {
	state.cx = 0;
	state.cy = 0;
	state.lastTimeMs = null;
	state.initialized = false;
}

export function createNativeCursorMotionBlurState(): NativeCursorMotionBlurState {
	return {
		x: 0,
		y: 0,
		lastTimeMs: null,
		initialized: false,
	};
}

export function resetNativeCursorMotionBlurState(state: NativeCursorMotionBlurState) {
	state.x = 0;
	state.y = 0;
	state.lastTimeMs = null;
	state.initialized = false;
}

export function smoothNativeCursorSample({
	forceSnap = false,
	sample,
	smoothing,
	state,
	timeMs,
}: {
	forceSnap?: boolean;
	sample: CursorRecordingSample;
	smoothing: number;
	state: NativeCursorSmoothingState;
	timeMs: number;
}): CursorRecordingSample {
	const clampedSmoothing = clamp(Number.isFinite(smoothing) ? smoothing : 0, 0, 0.98);
	const previousTimeMs = state.lastTimeMs;
	const shouldSnap =
		forceSnap ||
		clampedSmoothing <= 0 ||
		!state.initialized ||
		previousTimeMs === null ||
		timeMs <= previousTimeMs;

	if (shouldSnap) {
		state.cx = sample.cx;
		state.cy = sample.cy;
		state.lastTimeMs = timeMs;
		state.initialized = true;
		return sample;
	}

	const frameCount = Math.max(1, (timeMs - previousTimeMs) / (1000 / 60));
	const alpha = 1 - Math.pow(clampedSmoothing, frameCount);
	state.cx += (sample.cx - state.cx) * alpha;
	state.cy += (sample.cy - state.cy) * alpha;
	state.lastTimeMs = timeMs;

	return {
		...sample,
		cx: state.cx,
		cy: state.cy,
	};
}

export function getNativeCursorClickBounceProgress(
	recordingData: CursorRecordingData | null | undefined,
	timeMs: number,
) {
	if (!recordingData || recordingData.provider !== "native" || recordingData.samples.length === 0) {
		return 0;
	}

	for (
		let index = findNativeCursorSampleIndexAtOrBefore(recordingData.samples, timeMs);
		index >= 0;
		index -= 1
	) {
		const sample = recordingData.samples[index];
		const ageMs = timeMs - sample.timeMs;
		if (ageMs > NATIVE_CURSOR_CLICK_ANIMATION_MS) {
			return 0;
		}

		if (sample.interactionType === "click") {
			return 1 - ageMs / NATIVE_CURSOR_CLICK_ANIMATION_MS;
		}
	}

	return 0;
}

export function getNativeCursorClickBounceScale(clickBounce: number, progress: number) {
	if (progress <= 0 || clickBounce <= 0) {
		return 1;
	}

	const intensity = clamp(clickBounce, 0, 5) / 5;
	const elapsed = 1 - clamp(progress, 0, 1);
	if (elapsed < 0.38) {
		const pressProgress = Math.sin((elapsed / 0.38) * Math.PI);
		return 1 - pressProgress * intensity * 0.24;
	}

	const reboundProgress = Math.sin(((elapsed - 0.38) / 0.62) * Math.PI);
	return 1 + reboundProgress * intensity * 0.16;
}

export function getNativeCursorMotionBlurPx({
	motionBlur,
	point,
	state,
	timeMs,
}: {
	motionBlur: number;
	point: { x: number; y: number };
	state: NativeCursorMotionBlurState;
	timeMs: number;
}) {
	const clampedMotionBlur = clamp(Number.isFinite(motionBlur) ? motionBlur : 0, 0, 1);
	const previousTimeMs = state.lastTimeMs;
	const shouldSnap =
		clampedMotionBlur <= 0 ||
		!state.initialized ||
		previousTimeMs === null ||
		timeMs <= previousTimeMs;

	if (shouldSnap) {
		state.x = point.x;
		state.y = point.y;
		state.lastTimeMs = timeMs;
		state.initialized = true;
		return 0;
	}

	const deltaMs = Math.max(1, timeMs - previousTimeMs);
	const distance = Math.hypot(point.x - state.x, point.y - state.y);
	const speedPxPerSecond = (distance / deltaMs) * 1000;
	state.x = point.x;
	state.y = point.y;
	state.lastTimeMs = timeMs;

	return clamp(speedPxPerSecond * clampedMotionBlur * 0.004, 0, NATIVE_CURSOR_MOTION_BLUR_MAX_PX);
}

function getCroppedCursorPosition(sample: CursorRecordingSample, cropRegion: CropRegion) {
	if (cropRegion.width <= 0 || cropRegion.height <= 0) {
		return null;
	}

	const croppedCx = (sample.cx - cropRegion.x) / cropRegion.width;
	const croppedCy = (sample.cy - cropRegion.y) / cropRegion.height;

	if (croppedCx < 0 || croppedCx > 1 || croppedCy < 0 || croppedCy > 1) {
		return null;
	}

	return {
		cx: clamp(croppedCx, 0, 1),
		cy: clamp(croppedCy, 0, 1),
	};
}

function getNativeCursorMaskPoint(sample: CursorRecordingSample, cropRegion: CropRegion) {
	const croppedPosition = getCroppedCursorPosition(sample, cropRegion);
	if (!croppedPosition) {
		return null;
	}

	return new Point(croppedPosition.cx, croppedPosition.cy);
}

/**
 * Synthesises a NativeCursorAsset from the pretty-cursor SVG library for
 * samples that have a known cursor type but no captured bitmap (e.g. every
 * editable-overlay recording where SetSystemCursor makes all OS bitmaps
 * transparent and no assets are stored).
 */
function syntheticAssetForCursorType(
	cursorType: NativeCursorType | null | undefined,
): NativeCursorAsset | null {
	const type = cursorType ?? "arrow";
	const pretty = PRETTY_NATIVE_CURSOR_ASSETS[type] ?? PRETTY_NATIVE_CURSOR_ASSETS.arrow;
	if (!pretty) return null;
	return {
		id: `type-only:${type}`,
		platform: "win32",
		imageDataUrl: pretty.imageDataUrl,
		width: pretty.width,
		height: pretty.height,
		hotspotX: pretty.hotspotX,
		hotspotY: pretty.hotspotY,
		scaleFactor: 1,
		cursorType: type,
	};
}

export function resolveActiveNativeCursorFrame(
	recordingData: CursorRecordingData | null | undefined,
	timeMs: number,
): ActiveNativeCursorFrame | null {
	if (!hasNativeCursorRecordingData(recordingData)) {
		return null;
	}

	const index = findNativeCursorSampleIndexAtOrBefore(recordingData.samples, timeMs);
	if (index >= 0) {
		const sample = recordingData.samples[index];

		if (sample.visible === false) {
			return null;
		}

		if (sample.assetId) {
			const asset = getNativeCursorAsset(recordingData, sample.assetId);
			return asset ? { sample, asset } : null;
		}

		// No captured bitmap asset — editable-overlay recording.
		// Fall back to the pretty SVG asset for the detected cursor type.
		const asset = syntheticAssetForCursorType(sample.cursorType);
		return asset ? { sample, asset } : null;
	}

	return null;
}

export function resolveInterpolatedNativeCursorFrame(
	recordingData: CursorRecordingData | null | undefined,
	timeMs: number,
): ActiveNativeCursorFrame | null {
	if (!hasNativeCursorRecordingData(recordingData)) {
		return null;
	}

	const samples = recordingData.samples;
	const activeIndex = findNativeCursorSampleIndexAtOrBefore(samples, timeMs);

	if (activeIndex < 0) {
		return null;
	}

	const activeSample = samples[activeIndex];
	if (activeSample.visible === false) {
		return null;
	}

	// Resolve or synthesise the cursor asset for this sample.
	let asset: NativeCursorAsset | null;
	if (activeSample.assetId) {
		asset = getNativeCursorAsset(recordingData, activeSample.assetId);
	} else {
		// No captured bitmap — editable-overlay recording.
		// Use the pretty SVG for the detected cursor type so the cursor is
		// always visible and matches the Windows Aero aesthetic.
		asset = syntheticAssetForCursorType(activeSample.cursorType);
	}
	if (!asset) {
		return null;
	}

	const nextSample = samples[activeIndex + 1];

	// For interpolation, the assets must match so we're sliding between two
	// positions of the same visual cursor.  For type-only samples we match by
	// cursorType instead of assetId.
	const assetsMatch = activeSample.assetId
		? nextSample?.assetId === activeSample.assetId
		: nextSample?.cursorType === activeSample.cursorType;

	if (
		!nextSample ||
		nextSample.timeMs <= activeSample.timeMs ||
		nextSample.visible === false ||
		!assetsMatch ||
		timeMs <= activeSample.timeMs
	) {
		return { asset, sample: activeSample };
	}

	const interpolation = clamp(
		(timeMs - activeSample.timeMs) / (nextSample.timeMs - activeSample.timeMs),
		0,
		1,
	);

	return {
		asset,
		sample: {
			...activeSample,
			cx: activeSample.cx + (nextSample.cx - activeSample.cx) * interpolation,
			cy: activeSample.cy + (nextSample.cy - activeSample.cy) * interpolation,
		},
	};
}

export function projectNativeCursorToLocal({
	cropRegion,
	maskRect,
	sample,
}: ProjectNativeCursorOptions) {
	const maskPoint = getNativeCursorMaskPoint(sample, cropRegion);
	if (!maskPoint) {
		return null;
	}

	return new Point(
		maskRect.x + maskPoint.x * maskRect.width,
		maskRect.y + maskPoint.y * maskRect.height,
	);
}

export function projectNativeCursorToStage({
	cameraContainer,
	videoContainerPosition,
	...options
}: ProjectNativeCursorToStageOptions) {
	const localPoint = projectNativeCursorToLocal(options);
	if (!localPoint) {
		return null;
	}

	return cameraContainer.toGlobal(
		new Point(localPoint.x + videoContainerPosition.x, localPoint.y + videoContainerPosition.y),
	);
}

export function getNativeCursorDisplayMetrics(asset: NativeCursorAsset, deviceScaleFactor: number) {
	const scaleFactor = asset.scaleFactor ?? deviceScaleFactor ?? 1;
	return {
		width: asset.width / scaleFactor,
		height: asset.height / scaleFactor,
		hotspotX: asset.hotspotX / scaleFactor,
		hotspotY: asset.hotspotY / scaleFactor,
	};
}

export function resolvePrettyNativeCursorAsset(
	asset: NativeCursorAsset,
	sample?: CursorRecordingSample,
) {
	const cursorType = sample?.cursorType ?? asset.cursorType ?? null;
	return cursorType
		? (PRETTY_NATIVE_CURSOR_ASSETS[cursorType] ?? null)
		: resolveUntypedPrettyNativeCursorAsset(asset);
}

export function resolveNativeCursorRenderAsset(
	asset: NativeCursorAsset,
	deviceScaleFactor: number,
	sample?: CursorRecordingSample,
) {
	// Prefer the pretty SVG asset (from cursor-type lookup or shape heuristic).
	// Fall back to the arrow SVG when the cursor type is unknown or the captured
	// bitmap is transparent (e.g. editable-overlay recordings where SetSystemCursor
	// replaces every OS handle with a transparent 32×32 bitmap).  This guarantees
	// the cursor is always visible even when the bitmap can't be classified.
	const prettyAsset =
		resolvePrettyNativeCursorAsset(asset, sample) ?? PRETTY_NATIVE_CURSOR_ASSETS.arrow;
	if (prettyAsset) {
		// Scale the SVG artwork to match the actual logical cursor size captured from
		// the OS.  asset.width / scaleFactor gives the logical-pixel width the cursor
		// occupies on the recording display — that is the size VideoPlayback should
		// render it at (before the camera container zoom is applied).  Hotspots are
		// scaled proportionally so the active point stays accurate.
		const effectiveScaleFactor = asset.scaleFactor ?? deviceScaleFactor;
		const logicalWidth = asset.width / effectiveScaleFactor;
		const sizeRatio = logicalWidth / prettyAsset.width;
		return {
			id: `pretty:${sample?.cursorType ?? asset.cursorType ?? "arrow"}`,
			imageDataUrl: prettyAsset.imageDataUrl,
			width: logicalWidth,
			height: prettyAsset.height * sizeRatio,
			hotspotX: prettyAsset.hotspotX * sizeRatio,
			hotspotY: prettyAsset.hotspotY * sizeRatio,
		};
	}

	const metrics = getNativeCursorDisplayMetrics(asset, deviceScaleFactor);
	return {
		id: asset.id,
		imageDataUrl: asset.imageDataUrl,
		width: metrics.width,
		height: metrics.height,
		hotspotX: metrics.hotspotX,
		hotspotY: metrics.hotspotY,
	};
}
