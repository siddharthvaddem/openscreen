/** Duration of a single frame in seconds at 60 FPS (~16.67ms). */
export const FRAME_DURATION_SEC = 1 / 60;

/**
 * Compute the new playhead time after stepping one frame forward or backward.
 * The result is clamped to the range [0, duration].
 */
export function computeFrameStepTime(
	currentTime: number,
	duration: number,
	direction: "forward" | "backward",
): number {
	const delta = direction === "forward" ? FRAME_DURATION_SEC : -FRAME_DURATION_SEC;
	return Math.min(duration, Math.max(0, currentTime + delta));
}
