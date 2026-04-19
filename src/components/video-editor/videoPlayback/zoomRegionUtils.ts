import type { CursorTelemetryPoint, ZoomFocus, ZoomRegion } from "../types";
import { ZOOM_DEPTH_SCALES } from "../types";
import { TRANSITION_WINDOW_MS, ZOOM_IN_TRANSITION_WINDOW_MS } from "./constants";
import { interpolateCursorAt } from "./cursorFollowUtils";
import { clampFocusToScale } from "./focusUtils";
import { clamp01, cubicBezier, easeOutScreenStudio } from "./mathUtils";

const CHAINED_ZOOM_PAN_GAP_MS = 1500;
const CONNECTED_ZOOM_PAN_DURATION_MS = 1000;

type DominantRegionOptions = {
	connectZooms?: boolean;
	cursorTelemetry?: CursorTelemetryPoint[];
	viewportRatio?: ViewportRatio;
};

type ConnectedRegionPair = {
	currentRegion: ZoomRegion;
	nextRegion: ZoomRegion;
	transitionStart: number;
	transitionEnd: number;
};

type ConnectedPanTransition = {
	progress: number;
	startFocus: ZoomFocus;
	endFocus: ZoomFocus;
	startScale: number;
	endScale: number;
};

function lerp(start: number, end: number, amount: number) {
	return start + (end - start) * amount;
}

function easeConnectedPan(value: number) {
	return cubicBezier(0.1, 0.0, 0.2, 1.0, value);
}

export const DEFAULT_ZOOM_OUT_MS = TRANSITION_WINDOW_MS;
export const DEFAULT_ZOOM_IN_MS = ZOOM_IN_TRANSITION_WINDOW_MS;

export function getDurations(region: {
	startMs: number;
	endMs: number;
	zoomInDurationMs?: number;
	zoomOutDurationMs?: number;
}) {
	let zoomIn = region.zoomInDurationMs ?? DEFAULT_ZOOM_IN_MS;
	let zoomOut = region.zoomOutDurationMs ?? DEFAULT_ZOOM_OUT_MS;

	const duration = region.endMs - region.startMs;
	if (zoomIn + zoomOut > duration) {
		const scale = duration / (zoomIn + zoomOut);
		zoomIn *= scale;
		zoomOut *= scale;
	}

	return { zoomIn, zoomOut };
}

export function computeRegionStrength(region: ZoomRegion, timeMs: number) {
	const { zoomIn, zoomOut } = getDurations(region);

	if (timeMs < region.startMs || timeMs > region.endMs) {
		return 0;
	}

	// Zooming in
	if (timeMs < region.startMs + zoomIn) {
		const progress = Math.max(0, Math.min(1, (timeMs - region.startMs) / zoomIn));
		return easeOutScreenStudio(progress);
	}

	// Zooming out
	if (timeMs > region.endMs - zoomOut) {
		const progress = Math.max(0, Math.min(1, (region.endMs - timeMs) / zoomOut));
		return easeOutScreenStudio(progress);
	}

	// Full zoom
	return 1;
}

function getLinearFocus(start: ZoomFocus, end: ZoomFocus, amount: number): ZoomFocus {
	return {
		cx: lerp(start.cx, end.cx, amount),
		cy: lerp(start.cy, end.cy, amount),
	};
}

interface ViewportRatio {
	widthRatio: number;
	heightRatio: number;
}

function getResolvedFocus(
	region: ZoomRegion,
	zoomScale: number,
	timeMs?: number,
	cursorTelemetry?: CursorTelemetryPoint[],
	viewportRatio?: ViewportRatio,
): ZoomFocus {
	let focus = region.focus;

	if (
		region.focusMode === "auto" &&
		cursorTelemetry &&
		cursorTelemetry.length > 0 &&
		timeMs !== undefined
	) {
		const cursorFocus = interpolateCursorAt(cursorTelemetry, timeMs);
		if (cursorFocus) {
			focus = cursorFocus;
		}
	}

	return clampFocusToScale(focus, zoomScale, viewportRatio);
}

function getConnectedRegionPairs(regions: ZoomRegion[]) {
	const sortedRegions = [...regions].sort((a, b) => a.startMs - b.startMs);
	const pairs: ConnectedRegionPair[] = [];

	for (let index = 0; index < sortedRegions.length - 1; index += 1) {
		const currentRegion = sortedRegions[index];
		const nextRegion = sortedRegions[index + 1];
		const gapMs = nextRegion.startMs - currentRegion.endMs;

		if (gapMs > CHAINED_ZOOM_PAN_GAP_MS) {
			continue;
		}

		pairs.push({
			currentRegion,
			nextRegion,
			transitionStart: currentRegion.endMs,
			transitionEnd: currentRegion.endMs + CONNECTED_ZOOM_PAN_DURATION_MS,
		});
	}

	return pairs;
}

function getActiveRegion(
	regions: ZoomRegion[],
	timeMs: number,
	connectedPairs: ConnectedRegionPair[],
	cursorTelemetry?: CursorTelemetryPoint[],
	viewportRatio?: ViewportRatio,
) {
	const activeRegions = regions
		.map((region) => {
			const outgoingPair = connectedPairs.find((pair) => pair.currentRegion.id === region.id);
			if (outgoingPair && timeMs > outgoingPair.currentRegion.endMs) {
				return { region, strength: 0 };
			}

			const incomingPair = connectedPairs.find((pair) => pair.nextRegion.id === region.id);
			if (incomingPair && timeMs < incomingPair.transitionEnd) {
				return { region, strength: 0 };
			}

			return { region, strength: computeRegionStrength(region, timeMs) };
		})
		.filter((entry) => entry.strength > 0)
		.sort((left, right) => {
			if (right.strength !== left.strength) {
				return right.strength - left.strength;
			}

			return right.region.startMs - left.region.startMs;
		});

	if (activeRegions.length === 0) {
		return null;
	}

	const activeRegion = activeRegions[0].region;
	const activeScale = ZOOM_DEPTH_SCALES[activeRegion.depth];

	return {
		region: {
			...activeRegion,
			focus: getResolvedFocus(activeRegion, activeScale, timeMs, cursorTelemetry, viewportRatio),
		},
		strength: activeRegions[0].strength,
		blendedScale: null,
	};
}

function getConnectedRegionHold(
	timeMs: number,
	connectedPairs: ConnectedRegionPair[],
	cursorTelemetry?: CursorTelemetryPoint[],
	viewportRatio?: ViewportRatio,
) {
	for (const pair of connectedPairs) {
		if (timeMs > pair.transitionEnd && timeMs < pair.nextRegion.startMs) {
			const nextScale = ZOOM_DEPTH_SCALES[pair.nextRegion.depth];
			return {
				region: {
					...pair.nextRegion,
					focus: getResolvedFocus(
						pair.nextRegion,
						nextScale,
						timeMs,
						cursorTelemetry,
						viewportRatio,
					),
				},
				strength: 1,
				blendedScale: null,
			};
		}
	}

	return null;
}

function getConnectedRegionTransition(
	connectedPairs: ConnectedRegionPair[],
	timeMs: number,
	cursorTelemetry?: CursorTelemetryPoint[],
	viewportRatio?: ViewportRatio,
) {
	for (const pair of connectedPairs) {
		const { currentRegion, nextRegion, transitionStart, transitionEnd } = pair;

		if (timeMs < transitionStart || timeMs > transitionEnd) {
			continue;
		}

		const transitionProgress = easeConnectedPan(
			clamp01((timeMs - transitionStart) / Math.max(1, transitionEnd - transitionStart)),
		);
		const currentScale = ZOOM_DEPTH_SCALES[currentRegion.depth];
		const nextScale = ZOOM_DEPTH_SCALES[nextRegion.depth];
		const transitionScale = lerp(currentScale, nextScale, transitionProgress);
		// Both regions share the same timeMs, so interpolate cursor once and reuse.
		const sharedCursorFocus =
			cursorTelemetry && cursorTelemetry.length > 0
				? interpolateCursorAt(cursorTelemetry, timeMs)
				: null;
		const currentFocus = clampFocusToScale(
			currentRegion.focusMode === "auto" && sharedCursorFocus
				? sharedCursorFocus
				: currentRegion.focus,
			currentScale,
			viewportRatio,
		);
		const nextFocus = clampFocusToScale(
			nextRegion.focusMode === "auto" && sharedCursorFocus ? sharedCursorFocus : nextRegion.focus,
			nextScale,
			viewportRatio,
		);
		const transitionFocus = getLinearFocus(currentFocus, nextFocus, transitionProgress);

		return {
			region: {
				...nextRegion,
				focus: transitionFocus,
			},
			strength: 1,
			blendedScale: transitionScale,
			transition: {
				progress: transitionProgress,
				startFocus: currentFocus,
				endFocus: nextFocus,
				startScale: currentScale,
				endScale: nextScale,
			},
		};
	}

	return null;
}

export function findDominantRegion(
	regions: ZoomRegion[],
	timeMs: number,
	options: DominantRegionOptions = {},
): {
	region: ZoomRegion | null;
	strength: number;
	blendedScale: number | null;
	transition: ConnectedPanTransition | null;
} {
	const connectedPairs = options.connectZooms ? getConnectedRegionPairs(regions) : [];
	const telemetry = options.cursorTelemetry;
	const vr = options.viewportRatio;

	if (options.connectZooms) {
		const connectedTransition = getConnectedRegionTransition(connectedPairs, timeMs, telemetry, vr);
		if (connectedTransition) {
			return connectedTransition;
		}

		const connectedHold = getConnectedRegionHold(timeMs, connectedPairs, telemetry, vr);
		if (connectedHold) {
			return { ...connectedHold, transition: null };
		}
	}

	const activeRegion = getActiveRegion(regions, timeMs, connectedPairs, telemetry, vr);
	return activeRegion
		? { ...activeRegion, transition: null }
		: { region: null, strength: 0, blendedScale: null, transition: null };
}
