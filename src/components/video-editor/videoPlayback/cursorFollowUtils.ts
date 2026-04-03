import type { CursorTelemetryPoint, ZoomFocus } from "../types";

/**
 * Binary-search the sorted telemetry array and linearly interpolate
 * the cursor position at the given playback time.
 */
export function interpolateCursorAt(
	telemetry: CursorTelemetryPoint[],
	timeMs: number,
): ZoomFocus | null {
	if (telemetry.length === 0) return null;

	if (timeMs <= telemetry[0].timeMs) {
		return { cx: telemetry[0].cx, cy: telemetry[0].cy };
	}

	const last = telemetry[telemetry.length - 1];
	if (timeMs >= last.timeMs) {
		return { cx: last.cx, cy: last.cy };
	}

	let lo = 0;
	let hi = telemetry.length - 1;

	while (lo < hi - 1) {
		const mid = (lo + hi) >>> 1;
		if (telemetry[mid].timeMs <= timeMs) {
			lo = mid;
		} else {
			hi = mid;
		}
	}

	const before = telemetry[lo];
	const after = telemetry[hi];
	const span = after.timeMs - before.timeMs;
	const t = span > 0 ? (timeMs - before.timeMs) / span : 0;

	return {
		cx: before.cx + (after.cx - before.cx) * t,
		cy: before.cy + (after.cy - before.cy) * t,
	};
}

/**
 * Exponential smoothing to reduce jitter from high-frequency cursor data.
 * Lower factor = smoother / more lag, higher = more responsive.
 */
export function smoothCursorFocus(raw: ZoomFocus, prev: ZoomFocus, factor: number): ZoomFocus {
	return {
		cx: prev.cx + (raw.cx - prev.cx) * factor,
		cy: prev.cy + (raw.cy - prev.cy) * factor,
	};
}
