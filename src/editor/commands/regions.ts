import {
	clampFocusToDepth,
	DEFAULT_PLAYBACK_SPEED,
	DEFAULT_ZOOM_DEPTH,
	type SpeedRegion,
	type TrimRegion,
	type ZoomRegion,
} from "@/components/video-editor/types";
import type {
	AddSpeedRegionInput,
	AddTrimRegionInput,
	AddZoomRegionInput,
} from "@/editor/commands/types";

function roundMs(value: number) {
	return Math.max(0, Math.round(value));
}

function normalizeRange(startMs: number, endMs: number) {
	const start = roundMs(Math.min(startMs, endMs));
	const end = roundMs(Math.max(startMs, endMs));
	if (end <= start) {
		throw new Error("endMs must be greater than startMs");
	}
	return { start, end };
}

export function createTrimRegion(id: string, input: AddTrimRegionInput): TrimRegion {
	const { start, end } = normalizeRange(input.startMs, input.endMs);
	return {
		id,
		startMs: start,
		endMs: end,
	};
}

export function createSpeedRegion(id: string, input: AddSpeedRegionInput): SpeedRegion {
	const { start, end } = normalizeRange(input.startMs, input.endMs);
	return {
		id,
		startMs: start,
		endMs: end,
		speed: input.speed ?? DEFAULT_PLAYBACK_SPEED,
	};
}

export function createZoomRegion(id: string, input: AddZoomRegionInput): ZoomRegion {
	const { start, end } = normalizeRange(input.startMs, input.endMs);
	const depth = input.depth ?? DEFAULT_ZOOM_DEPTH;
	const focus = clampFocusToDepth(input.focus ?? { cx: 0.5, cy: 0.5 }, depth);
	return {
		id,
		startMs: start,
		endMs: end,
		depth,
		focus,
		focusMode: input.focusMode,
	};
}
