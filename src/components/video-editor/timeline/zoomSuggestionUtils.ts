import type { CursorTelemetryPoint, ZoomFocus } from "../types";
import { interpolateCursorAt } from "../videoPlayback/cursorFollowUtils";

export const MIN_DWELL_DURATION_MS = 120;
export const MAX_DWELL_DURATION_MS = 2600;
export const DWELL_MOVE_THRESHOLD = 0.02;

export interface ZoomDwellCandidate {
	centerTimeMs: number;
	focus: ZoomFocus;
	strength: number;
	/** Fixed duration for this region; overrides the timeline's defaultRegionDurationMs */
	durationMs?: number;
	/** ms offset from centerTimeMs to compute region start (default: -durationMs/2, i.e. centered) */
	startOffsetMs?: number;
}

function normalizeTelemetrySample(
	sample: CursorTelemetryPoint,
	totalMs: number,
): CursorTelemetryPoint {
	return {
		timeMs: Math.max(0, Math.min(sample.timeMs, totalMs)),
		cx: Math.max(0, Math.min(sample.cx, 1)),
		cy: Math.max(0, Math.min(sample.cy, 1)),
	};
}

export function normalizeCursorTelemetry(
	telemetry: CursorTelemetryPoint[],
	totalMs: number,
): CursorTelemetryPoint[] {
	return [...telemetry]
		.filter(
			(sample) =>
				Number.isFinite(sample.timeMs) && Number.isFinite(sample.cx) && Number.isFinite(sample.cy),
		)
		.sort((a, b) => a.timeMs - b.timeMs)
		.map((sample) => normalizeTelemetrySample(sample, totalMs));
}

export function detectZoomDwellCandidates(samples: CursorTelemetryPoint[]): ZoomDwellCandidate[] {
	if (samples.length < 2) {
		return [];
	}

	const dwellCandidates: ZoomDwellCandidate[] = [];
	let runStart = 0;

	const pushRunIfDwell = (startIndex: number, endIndexExclusive: number) => {
		if (endIndexExclusive - startIndex < 2) {
			return;
		}

		const start = samples[startIndex];
		const end = samples[endIndexExclusive - 1];
		const runDuration = end.timeMs - start.timeMs;
		if (runDuration < MIN_DWELL_DURATION_MS || runDuration > MAX_DWELL_DURATION_MS) {
			return;
		}

		const runSamples = samples.slice(startIndex, endIndexExclusive);
		const avgCx = runSamples.reduce((sum, sample) => sum + sample.cx, 0) / runSamples.length;
		const avgCy = runSamples.reduce((sum, sample) => sum + sample.cy, 0) / runSamples.length;

		dwellCandidates.push({
			centerTimeMs: Math.round((start.timeMs + end.timeMs) / 2),
			focus: { cx: avgCx, cy: avgCy },
			strength: runDuration,
		});
	};

	for (let index = 1; index < samples.length; index += 1) {
		const prev = samples[index - 1];
		const curr = samples[index];
		const distance = Math.hypot(curr.cx - prev.cx, curr.cy - prev.cy);

		if (distance > DWELL_MOVE_THRESHOLD) {
			pushRunIfDwell(runStart, index);
			runStart = index;
		}
	}
	pushRunIfDwell(runStart, samples.length);

	return dwellCandidates;
}

export const MIN_CLICK_GAP_MS = 50;
export const CLICK_CANDIDATE_STRENGTH = 300;
export const CLICK_REGION_DURATION_MS = 1000;
// Anchor slightly before the click so the zoom captures the result of the tap, not what came before.
export const CLICK_REGION_START_OFFSET_MS = -100;

export function detectClickCandidates(
	telemetry: CursorTelemetryPoint[],
	clickTimestamps: number[],
): ZoomDwellCandidate[] {
	if (telemetry.length === 0 || clickTimestamps.length === 0) return [];

	const sorted = [...clickTimestamps].sort((a, b) => a - b);
	const candidates: ZoomDwellCandidate[] = [];

	for (const timeMs of sorted) {
		const lastMs = candidates.length > 0 ? candidates[candidates.length - 1].centerTimeMs : -Infinity;
		if (timeMs - lastMs < MIN_CLICK_GAP_MS) continue;

		const focus = interpolateCursorAt(telemetry, timeMs);
		if (!focus) continue;

		candidates.push({
			centerTimeMs: timeMs,
			focus,
			strength: CLICK_CANDIDATE_STRENGTH,
			durationMs: CLICK_REGION_DURATION_MS,
			startOffsetMs: CLICK_REGION_START_OFFSET_MS,
		});
	}

	return candidates;
}
