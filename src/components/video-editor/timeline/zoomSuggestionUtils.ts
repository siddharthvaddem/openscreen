import type { CursorTelemetryPoint, ZoomFocus } from "../types";

export const MIN_DWELL_DURATION_MS = 450;
export const MAX_DWELL_DURATION_MS = 2600;
export const DWELL_MOVE_THRESHOLD = 0.02;

export const CLICK_CLUSTER_WINDOW_MS = 700;
export const CLICK_STRENGTH_BASE_MS = 3000;
export const CLICK_STRENGTH_PER_EVENT_MS = 600;

export interface ZoomDwellCandidate {
	centerTimeMs: number;
	focus: ZoomFocus;
	strength: number;
	source?: "dwell" | "click";
}

function normalizeTelemetrySample(
	sample: CursorTelemetryPoint,
	totalMs: number,
): CursorTelemetryPoint {
	return {
		timeMs: Math.max(0, Math.min(sample.timeMs, totalMs)),
		cx: Math.max(0, Math.min(sample.cx, 1)),
		cy: Math.max(0, Math.min(sample.cy, 1)),
		...(sample.interactionType ? { interactionType: sample.interactionType } : {}),
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

	return dwellCandidates.map((candidate) => ({ ...candidate, source: "dwell" as const }));
}

const CLICK_INTERACTIONS = new Set(["click", "double-click", "right-click", "middle-click"]);

export function detectZoomClickCandidates(samples: CursorTelemetryPoint[]): ZoomDwellCandidate[] {
	if (samples.length === 0) {
		return [];
	}

	const clickSamples = samples.filter(
		(sample) => sample.interactionType && CLICK_INTERACTIONS.has(sample.interactionType),
	);

	if (clickSamples.length === 0) {
		return [];
	}

	const clusters: CursorTelemetryPoint[][] = [];
	let currentCluster: CursorTelemetryPoint[] = [];

	for (const click of clickSamples) {
		if (currentCluster.length === 0) {
			currentCluster.push(click);
			continue;
		}
		const lastClick = currentCluster[currentCluster.length - 1];
		if (click.timeMs - lastClick.timeMs <= CLICK_CLUSTER_WINDOW_MS) {
			currentCluster.push(click);
		} else {
			clusters.push(currentCluster);
			currentCluster = [click];
		}
	}
	if (currentCluster.length > 0) {
		clusters.push(currentCluster);
	}

	return clusters.map((cluster) => {
		const centerTimeMs = Math.round(cluster.reduce((sum, c) => sum + c.timeMs, 0) / cluster.length);
		const avgCx = cluster.reduce((sum, c) => sum + c.cx, 0) / cluster.length;
		const avgCy = cluster.reduce((sum, c) => sum + c.cy, 0) / cluster.length;
		const strength = CLICK_STRENGTH_BASE_MS + cluster.length * CLICK_STRENGTH_PER_EVENT_MS;
		return {
			centerTimeMs,
			focus: { cx: avgCx, cy: avgCy },
			strength,
			source: "click" as const,
		};
	});
}

export function detectZoomCandidates(samples: CursorTelemetryPoint[]): ZoomDwellCandidate[] {
	const clickCandidates = detectZoomClickCandidates(samples);
	const dwellCandidates = detectZoomDwellCandidates(samples);
	return [...clickCandidates, ...dwellCandidates];
}
