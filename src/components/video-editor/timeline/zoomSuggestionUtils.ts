import type { CursorTelemetryPoint, ZoomFocus } from "../types";

export const MIN_DWELL_DURATION_MS = 600; // Increased to require more intent
export const MAX_DWELL_DURATION_MS = 5000;
export const DWELL_MOVE_THRESHOLD = 0.025; // Higher tolerance for tremors in WQHD
export const GROUPING_THRESHOLD_MS = 1000;
export const ZOOM_REACTION_DELAY_MS = 300; // Zoom starts AFTER you stopped

export interface ZoomDwellCandidate {
	centerTimeMs: number; // Kept for interface compatibility, but ignored in new logic
	startTimeMs: number;
	endTimeMs: number;
	focus: ZoomFocus;
	strength: number;
	depth: number;
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

function calculateAdaptiveDepth(cx: number, cy: number, durationMs: number): number {
	const distFromCenter = Math.hypot(cx - 0.5, cy - 0.5);
	let depth = 2;
	if (distFromCenter < 0.2) depth += 1;
	if (durationMs > 2000) depth += 1;
	return Math.min(4, depth);
}

export function detectZoomDwellCandidates(samples: CursorTelemetryPoint[]): ZoomDwellCandidate[] {
	if (samples.length < 2) return [];

	const rawDwells: ZoomDwellCandidate[] = [];
	let runStart = 0;

	for (let index = 1; index < samples.length; index += 1) {
		const prev = samples[index - 1];
		const curr = samples[index];
		const distance = Math.hypot(curr.cx - prev.cx, curr.cy - prev.cy);

		if (distance > DWELL_MOVE_THRESHOLD) {
			const start = samples[runStart];
			const end = samples[index - 1];
			const duration = end.timeMs - start.timeMs;

			if (duration >= MIN_DWELL_DURATION_MS) {
				const runSamples = samples.slice(runStart, index);
				const avgCx = runSamples.reduce((sum, s) => sum + s.cx, 0) / runSamples.length;
				const avgCy = runSamples.reduce((sum, s) => sum + s.cy, 0) / runSamples.length;

				rawDwells.push({
					startTimeMs: start.timeMs + ZOOM_REACTION_DELAY_MS, // Applies reaction delay
					endTimeMs: end.timeMs,
					centerTimeMs: Math.round((start.timeMs + end.timeMs) / 2),
					focus: { cx: avgCx, cy: avgCy },
					strength: duration,
					depth: calculateAdaptiveDepth(avgCx, avgCy, duration),
				});
			}
			runStart = index;
		}
	}

	// Flush the last run if it's a valid dwell
	const lastStart = samples[runStart];
	const lastEnd = samples[samples.length - 1];
	const lastDuration = lastEnd.timeMs - lastStart.timeMs;

	if (lastDuration >= MIN_DWELL_DURATION_MS) {
		const runSamples = samples.slice(runStart);
		const avgCx = runSamples.reduce((sum, s) => sum + s.cx, 0) / runSamples.length;
		const avgCy = runSamples.reduce((sum, s) => sum + s.cy, 0) / runSamples.length;

		rawDwells.push({
			startTimeMs: lastStart.timeMs + ZOOM_REACTION_DELAY_MS,
			endTimeMs: lastEnd.timeMs,
			centerTimeMs: Math.round((lastStart.timeMs + lastEnd.timeMs) / 2),
			focus: { cx: avgCx, cy: avgCy },
			strength: lastDuration,
			depth: calculateAdaptiveDepth(avgCx, avgCy, lastDuration),
		});
	}

	if (rawDwells.length === 0) return [];

	const groupedDwells: ZoomDwellCandidate[] = [];
	let currentGroup: ZoomDwellCandidate[] = [rawDwells[0]];

	for (let i = 1; i < rawDwells.length; i++) {
		const prev = rawDwells[i - 1];
		const curr = rawDwells[i];

		if (curr.startTimeMs - prev.endTimeMs < GROUPING_THRESHOLD_MS) {
			currentGroup.push(curr);
		} else {
			groupedDwells.push(mergeDwellGroup(currentGroup));
			currentGroup = [curr];
		}
	}
	groupedDwells.push(mergeDwellGroup(currentGroup));

	return groupedDwells;
}

function mergeDwellGroup(group: ZoomDwellCandidate[]): ZoomDwellCandidate {
	if (group.length === 1) return group[0];

	const totalStrength = group.reduce((sum, d) => sum + d.strength, 0);
	const startTimeMs = group[0].startTimeMs;
	const endTimeMs = group[group.length - 1].endTimeMs;

	const avgCx = group.reduce((sum, d) => sum + d.focus.cx * d.strength, 0) / totalStrength;
	const avgCy = group.reduce((sum, d) => sum + d.focus.cy * d.strength, 0) / totalStrength;
	const maxDepth = Math.max(...group.map((d) => d.depth));

	return {
		startTimeMs,
		endTimeMs,
		centerTimeMs: Math.round((startTimeMs + endTimeMs) / 2),
		focus: { cx: avgCx, cy: avgCy },
		strength: totalStrength,
		depth: maxDepth,
	};
}
