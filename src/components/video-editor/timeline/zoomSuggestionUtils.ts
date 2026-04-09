import type { CursorTelemetryPoint, ZoomFocus } from "../types";

export const MIN_DWELL_DURATION_MS = 450;
export const MAX_DWELL_DURATION_MS = 2600;
export const DWELL_MOVE_THRESHOLD = 0.02;
export const DWELL_MERGE_GAP_MS = 1500;
export const DWELL_MERGE_DISTANCE_THRESHOLD = 0.08;

export interface ZoomDwellCandidate {
	centerTimeMs: number;
	focus: ZoomFocus;
	strength: number;
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

	if (dwellCandidates.length <= 1) {
		return dwellCandidates;
	}

	const mergedCandidates: ZoomDwellCandidate[] = [];
	for (const candidate of dwellCandidates) {
		const previous = mergedCandidates[mergedCandidates.length - 1];
		if (!previous) {
			mergedCandidates.push(candidate);
			continue;
		}

		const timeGap = candidate.centerTimeMs - previous.centerTimeMs;
		const focusDistance = Math.hypot(
			candidate.focus.cx - previous.focus.cx,
			candidate.focus.cy - previous.focus.cy,
		);

		if (timeGap <= DWELL_MERGE_GAP_MS && focusDistance <= DWELL_MERGE_DISTANCE_THRESHOLD) {
			const totalStrength = previous.strength + candidate.strength;
			mergedCandidates[mergedCandidates.length - 1] = {
				centerTimeMs: Math.round(
					(previous.centerTimeMs * previous.strength +
						candidate.centerTimeMs * candidate.strength) /
						totalStrength,
				),
				focus: {
					cx:
						(previous.focus.cx * previous.strength + candidate.focus.cx * candidate.strength) /
						totalStrength,
					cy:
						(previous.focus.cy * previous.strength + candidate.focus.cy * candidate.strength) /
						totalStrength,
				},
				strength: totalStrength,
			};
			continue;
		}

		mergedCandidates.push(candidate);
	}

	return mergedCandidates;
}
