import type { ZoomFocus } from "../types";

export const DEFAULT_FOCUS: ZoomFocus = { cx: 0.5, cy: 0.5 };
export const TRANSITION_WINDOW_MS = 1015.05;
export const ZOOM_IN_TRANSITION_WINDOW_MS = TRANSITION_WINDOW_MS * 1.5;
export const MIN_DELTA = 0.0001;
export const VIEWPORT_SCALE = 0.8;
export const SMOOTHING_FACTOR = 0.12;
export const ZOOM_TRANSLATION_DEADZONE_PX = 1.25;
export const ZOOM_SCALE_DEADZONE = 0.002;
export const AUTO_FOLLOW_SMOOTHING_FACTOR = 0.1;
export const AUTO_FOLLOW_SMOOTHING_FACTOR_MAX = 0.25;
export const AUTO_FOLLOW_RAMP_DISTANCE = 0.15;
// Reference frame interval so preview and export normalize their per-frame
// smoothing identically regardless of render fps. Lower fps = floatier follow
// (tuned to the live-preview feel).
export const AUTO_FOLLOW_REFERENCE_MS = 1000 / 40;
// Shared by preview and export so the camera follows the cursor identically.
export const AUTO_FOLLOW_PARAMS = {
	minFactor: AUTO_FOLLOW_SMOOTHING_FACTOR,
	maxFactor: AUTO_FOLLOW_SMOOTHING_FACTOR_MAX,
	rampDistance: AUTO_FOLLOW_RAMP_DISTANCE,
	referenceMs: AUTO_FOLLOW_REFERENCE_MS,
} as const;
