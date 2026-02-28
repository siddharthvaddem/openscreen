import type { CursorTelemetryPoint, ZoomFocus } from "../types";

export const MIN_DWELL_DURATION_MS = 450;
export const MAX_DWELL_DURATION_MS = 2600;
export const DWELL_MOVE_THRESHOLD = 0.02;

export interface ZoomDwellCandidate {
  centerTimeMs: number;
  focus: ZoomFocus;
  strength: number;
}

function normalizeTelemetrySample(sample: CursorTelemetryPoint, totalMs: number): CursorTelemetryPoint {
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
    .filter((sample) => Number.isFinite(sample.timeMs) && Number.isFinite(sample.cx) && Number.isFinite(sample.cy))
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
