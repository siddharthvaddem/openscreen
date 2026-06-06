import { type Container, Point } from "pixi.js";
import appStartingUrl from "@/assets/cursors/Cursor=App-Starting.svg";
import crosshairUrl from "@/assets/cursors/Cursor=Cross.svg";
import arrowUrl from "@/assets/cursors/Cursor=Default.svg";
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
import { getAssetPath } from "@/lib/assetPath";
import { DEFAULT_CURSOR_THEME_ID, getCursorTheme } from "@/lib/cursor/cursorThemes";
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

interface PrettyNativeCursorAsset {
	imageDataUrl: string;
	width: number;
	height: number;
	hotspotX: number;
	hotspotY: number;
}

const PRETTY_NATIVE_CURSOR_ASSETS: Partial<Record<NativeCursorType, PrettyNativeCursorAsset>> = {
	arrow: {
		imageDataUrl: arrowUrl,
		width: 32,
		height: 32,
		hotspotX: 16.25,
		hotspotY: 15.03,
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

const TELEMETRY_CURSOR_ASSET: NativeCursorAsset = {
	id: "telemetry-arrow",
	platform: "darwin",
	imageDataUrl: arrowUrl,
	width: PRETTY_NATIVE_CURSOR_ASSETS.arrow?.width ?? 32,
	height: PRETTY_NATIVE_CURSOR_ASSETS.arrow?.height ?? 32,
	hotspotX: PRETTY_NATIVE_CURSOR_ASSETS.arrow?.hotspotX ?? 16,
	hotspotY: PRETTY_NATIVE_CURSOR_ASSETS.arrow?.hotspotY ?? 16,
	cursorType: "arrow",
};

function getTelemetryCursorAsset(sample?: CursorRecordingSample): NativeCursorAsset {
	const cursorType = sample?.cursorType ?? "arrow";
	const prettyAsset = PRETTY_NATIVE_CURSOR_ASSETS[cursorType] ?? PRETTY_NATIVE_CURSOR_ASSETS.arrow;

	return {
		...TELEMETRY_CURSOR_ASSET,
		id: `telemetry-${cursorType}`,
		imageDataUrl: prettyAsset?.imageDataUrl ?? TELEMETRY_CURSOR_ASSET.imageDataUrl,
		width: prettyAsset?.width ?? TELEMETRY_CURSOR_ASSET.width,
		height: prettyAsset?.height ?? TELEMETRY_CURSOR_ASSET.height,
		hotspotX: prettyAsset?.hotspotX ?? TELEMETRY_CURSOR_ASSET.hotspotX,
		hotspotY: prettyAsset?.hotspotY ?? TELEMETRY_CURSOR_ASSET.hotspotY,
		cursorType,
	};
}

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
	return Boolean(
		recordingData &&
			recordingData.samples.length > 0 &&
			(recordingData.assets.length > 0 || recordingData.provider === "none"),
	);
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

export function getNativeCursorClickBounceProgress(
	recordingData: CursorRecordingData | null | undefined,
	timeMs: number,
) {
	if (!recordingData || recordingData.samples.length === 0) {
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

		const asset = sample.assetId
			? getNativeCursorAsset(recordingData, sample.assetId)
			: getTelemetryCursorAsset(sample);
		if (!asset) {
			return null;
		}

		return { sample, asset };
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

	const asset = activeSample.assetId
		? getNativeCursorAsset(recordingData, activeSample.assetId)
		: getTelemetryCursorAsset(activeSample);
	if (!asset) {
		return null;
	}

	const nextSample = samples[activeIndex + 1];
	if (
		!nextSample ||
		nextSample.timeMs <= activeSample.timeMs ||
		nextSample.visible === false ||
		(nextSample.assetId ?? null) !== (activeSample.assetId ?? null) ||
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

/**
 * Infers "arrow" vs "pointer" from a captured bitmap's hotspot, for platforms (macOS)
 * that don't tag samples with a `cursorType`. Arrow's hotspot is in the top-left tip;
 * the pointing hand's fingertip is in the upper-center band. Anything else stays
 * unclassified so it keeps its real captured cursor instead of a themed arrow/pointer.
 */
function classifyCapturedCursorType(asset: NativeCursorAsset): NativeCursorType | null {
	if (asset.width <= 0 || asset.height <= 0) {
		return null;
	}
	const hotspotXNorm = asset.hotspotX / asset.width;
	const hotspotYNorm = asset.hotspotY / asset.height;
	if (hotspotXNorm < 0.33 && hotspotYNorm < 0.33) {
		return "arrow";
	}
	if (hotspotYNorm < 0.4 && hotspotXNorm >= 0.33 && hotspotXNorm <= 0.6) {
		return "pointer";
	}
	return null;
}

/**
 * Resolves the theme override for a cursor type, or null when the default theme is active
 * or has no art for that type. The asset URL resolves lazily (only when a theme is active)
 * so this is safe from tests and non-renderer contexts; a failure degrades to default art.
 */
function resolveThemedCursorAsset(
	themeId: string | null | undefined,
	cursorType: NativeCursorType,
): PrettyNativeCursorAsset | null {
	if (!themeId || themeId === DEFAULT_CURSOR_THEME_ID) {
		return null;
	}
	const themeAsset = getCursorTheme(themeId)?.assets[cursorType];
	if (!themeAsset) {
		return null;
	}
	try {
		return {
			imageDataUrl: getAssetPath(themeAsset.assetPath),
			width: themeAsset.width,
			height: themeAsset.height,
			hotspotX: themeAsset.hotspotX,
			hotspotY: themeAsset.hotspotY,
		};
	} catch {
		return null;
	}
}

export function resolveNativeCursorRenderAsset(
	asset: NativeCursorAsset,
	deviceScaleFactor: number,
	sample?: CursorRecordingSample,
	themeId?: string | null,
) {
	const cursorType = sample?.cursorType ?? asset.cursorType ?? null;
	if (themeId && themeId !== DEFAULT_CURSOR_THEME_ID) {
		// A known type uses its override when the theme provides one. Untyped samples
		// (common on macOS, where the type isn't tagged) are classified from the captured
		// bitmap's hotspot so arrow becomes themed-arrow and hand becomes themed-pointer.
		const themedType = cursorType ?? classifyCapturedCursorType(asset);
		const themedAsset = themedType ? resolveThemedCursorAsset(themeId, themedType) : null;
		if (themedAsset && themedType) {
			return {
				id: `theme:${themeId}:${themedType}`,
				imageDataUrl: themedAsset.imageDataUrl,
				width: themedAsset.width,
				height: themedAsset.height,
				hotspotX: themedAsset.hotspotX,
				hotspotY: themedAsset.hotspotY,
			};
		}
	}

	const prettyAsset = resolvePrettyNativeCursorAsset(asset, sample);
	if (prettyAsset) {
		return {
			id: `pretty:${sample?.cursorType ?? asset.cursorType}`,
			imageDataUrl: prettyAsset.imageDataUrl,
			width: prettyAsset.width,
			height: prettyAsset.height,
			hotspotX: prettyAsset.hotspotX,
			hotspotY: prettyAsset.hotspotY,
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
