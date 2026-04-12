/** Duration of a single frame at 60 FPS (~16.67ms). */
export const FRAME_DURATION_SEC = 1 / 60;

/** Duration of a larger step (10 frames) at 60 FPS (~166.67ms). */
export const LARGE_FRAME_DURATION_SEC = 10 / 60;

/**
 * Compute the new playhead time after stepping one frame forward or backward.
 * The result is clamped to the range [0, duration].
 */
export function computeFrameStepTime(
	currentTime: number,
	duration: number,
	direction: "forward" | "backward",
	isFast: boolean = false,
): number {
	const step = isFast ? LARGE_FRAME_DURATION_SEC : FRAME_DURATION_SEC;
	const delta = direction === "forward" ? step : -step;
	return Math.min(duration, Math.max(0, currentTime + delta));
}
