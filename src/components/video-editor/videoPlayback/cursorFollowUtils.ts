import type { CursorTelemetryPoint, ZoomFocus } from "../types";

/** Binary-search the sorted telemetry and lerp the cursor position at the given playback time. */
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
 * Lower factor = smoother/more lag, higher = more responsive.
 */
export function smoothCursorFocus(raw: ZoomFocus, prev: ZoomFocus, factor: number): ZoomFocus {
	return {
		cx: prev.cx + (raw.cx - prev.cx) * factor,
		cy: prev.cy + (raw.cy - prev.cy) * factor,
	};
}

export interface FollowParams {
	minFactor: number;
	maxFactor: number;
	rampDistance: number;
	referenceMs: number;
}

/**
 * Advance the auto-follow focus from `prev` toward target `raw` over `dtMs` of content time. The
 * distance-adaptive factor is reframed against `referenceMs` so convergence is content-time based and
 * matches between preview and export. Returns `prev` unchanged when paused so the camera holds still.
 */
export function advanceFollowFocus(
	prev: ZoomFocus,
	raw: ZoomFocus,
	dtMs: number,
	params: FollowParams,
): ZoomFocus {
	if (!(dtMs > 0)) return prev;
	const base = adaptiveSmoothFactor(
		raw,
		prev,
		params.minFactor,
		params.maxFactor,
		params.rampDistance,
	);
	const factor = timeCorrectedFollowFactor(base, dtMs, params.referenceMs);
	return smoothCursorFocus(raw, prev, factor);
}

/**
 * Make a per-frame smoothing `baseFactor` frame-rate independent by reframing it in content time.
 * The camera converges as `(1 - baseFactor)^(dtMs / referenceMs)` regardless of frame chunking, so
 * preview (variable fps) and export (fixed fps) follow at the same speed. Larger `referenceMs` =
 * floatier. Returns 0 when paused so the camera holds still.
 */
export function timeCorrectedFollowFactor(
	baseFactor: number,
	dtMs: number,
	referenceMs: number,
): number {
	if (!(dtMs > 0) || !(referenceMs > 0)) return 0;
	return 1 - (1 - baseFactor) ** (dtMs / referenceMs);
}

/**
 * Adaptive smoothing factor that scales with distance: far from target = faster (maxFactor), close =
 * slower (minFactor). Replaces a hard deadzone with a natural deceleration curve.
 */
export function adaptiveSmoothFactor(
	raw: ZoomFocus,
	prev: ZoomFocus,
	minFactor: number,
	maxFactor: number,
	rampDistance: number,
): number {
	const dx = raw.cx - prev.cx;
	const dy = raw.cy - prev.cy;
	const distance = Math.sqrt(dx * dx + dy * dy);
	const t = Math.min(1, distance / rampDistance);
	return minFactor + (maxFactor - minFactor) * t;
}
