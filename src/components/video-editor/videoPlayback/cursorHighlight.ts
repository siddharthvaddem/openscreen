import type { CursorTelemetryPoint } from "../types";

export type CursorHighlightStyle = "dot" | "ring";

export interface CursorHighlightConfig {
	enabled: boolean;
	style: CursorHighlightStyle;
	sizePx: number;
	color: string;
	opacity: number;
	/** Show only while a click animation is active. */
	onlyOnClicks: boolean;
	clickEmphasisDurationMs: number;
	/** Per-recording position nudge (±CURSOR_HIGHLIGHT_OFFSET_RANGE, normalized). */
	offsetXNorm: number;
	offsetYNorm: number;
}

export const CURSOR_HIGHLIGHT_MIN_SIZE_PX = 10;
export const CURSOR_HIGHLIGHT_MAX_SIZE_PX = 36;
export const CURSOR_HIGHLIGHT_OFFSET_RANGE = 0.25;

export const DEFAULT_CURSOR_HIGHLIGHT: CursorHighlightConfig = {
	enabled: false,
	style: "ring",
	sizePx: 24,
	color: "#FFD700",
	opacity: 0.9,
	onlyOnClicks: false,
	clickEmphasisDurationMs: 350,
	offsetXNorm: 0,
	offsetYNorm: 0,
};

function isClickSample(sample: CursorTelemetryPoint): boolean {
	return (
		sample.interactionType === "click" ||
		sample.interactionType === "double-click" ||
		sample.interactionType === "right-click" ||
		sample.interactionType === "middle-click"
	);
}

/**
 * Returns the effective alpha for the highlight at `timeMs`.
 * - Always-on mode: returns `config.opacity`.
 * - Click-only mode: fades 1→0 over `clickEmphasisDurationMs` after each click.
 */
export function getHighlightAlpha(
	timeMs: number,
	samples: CursorTelemetryPoint[],
	config: CursorHighlightConfig,
): number {
	if (!config.enabled) return 0;
	if (!config.onlyOnClicks) return config.opacity;

	const window = Math.max(1, config.clickEmphasisDurationMs);
	for (let i = samples.length - 1; i >= 0; i--) {
		const sample = samples[i];
		if (sample.timeMs > timeMs) continue;
		if (!isClickSample(sample)) continue;
		const dt = timeMs - sample.timeMs;
		if (dt >= 0 && dt <= window) {
			return config.opacity * (1 - dt / window);
		}
		break;
	}
	return 0;
}

function parseHexColor(hex: string): { r: number; g: number; b: number } {
	const cleaned = hex.replace("#", "");
	const full =
		cleaned.length === 3
			? cleaned[0] + cleaned[0] + cleaned[1] + cleaned[1] + cleaned[2] + cleaned[2]
			: cleaned.slice(0, 6);
	const int = Number.parseInt(full, 16);
	return { r: (int >> 16) & 0xff, g: (int >> 8) & 0xff, b: int & 0xff };
}

/** Hex color → PixiJS number (e.g. "#FFD700" → 0xffd700). */
export function hexToPixiColor(hex: string): number {
	const { r, g, b } = parseHexColor(hex);
	return (r << 16) | (g << 8) | b;
}

/**
 * Draws the cursor highlight on a Canvas 2D context (used by the export renderer).
 * `cx`/`cy` are already in canvas pixel coordinates.
 */
export function drawCursorHighlightCanvas(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	alpha: number,
	config: CursorHighlightConfig,
	pixelScale = 1,
): void {
	if (alpha <= 0) return;

	const radius = Math.max(1, (config.sizePx / 2) * pixelScale);

	ctx.save();
	ctx.globalAlpha = alpha;

	switch (config.style) {
		case "dot": {
			ctx.fillStyle = config.color;
			ctx.beginPath();
			ctx.arc(cx, cy, radius, 0, Math.PI * 2);
			ctx.fill();
			break;
		}
		case "ring": {
			ctx.strokeStyle = config.color;
			ctx.lineWidth = Math.max(2, radius * 0.18);
			ctx.beginPath();
			ctx.arc(cx, cy, radius, 0, Math.PI * 2);
			ctx.stroke();
			break;
		}
	}

	ctx.restore();
}
