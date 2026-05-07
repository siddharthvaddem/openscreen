import type { Graphics } from "pixi.js";

export type CursorHighlightStyle = "dot" | "ring";

export interface CursorHighlightConfig {
	enabled: boolean;
	style: CursorHighlightStyle;
	sizePx: number;
	color: string;
	opacity: number;
	// Show only on clicks (macOS — depends on click telemetry from uiohook).
	onlyOnClicks: boolean;
	clickEmphasisDurationMs: number;
	// Per-recording manual nudge. Cursor telemetry is normalized to the display,
	// but window recordings frame a subset of the display so the highlight
	// lands offset. Users dial these in once to align with the actual cursor.
	offsetXNorm: number;
	offsetYNorm: number;
}

export const CURSOR_HIGHLIGHT_MIN_SIZE_PX = 10;
export const CURSOR_HIGHLIGHT_MAX_SIZE_PX = 36;

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

export const CURSOR_HIGHLIGHT_OFFSET_RANGE = 0.25; // ±25% of recorded surface

// Alpha multiplier for the highlight at `timeMs`. Returns 1 when not in
// click-only mode; in click-only mode fades 1→0 across each click's window.
export function clickEmphasisAlpha(
	timeMs: number,
	clickTimestampsMs: number[] | undefined,
	config: CursorHighlightConfig,
): number {
	if (!config.onlyOnClicks) return 1;
	if (!clickTimestampsMs || clickTimestampsMs.length === 0) return 0;
	const window = Math.max(1, config.clickEmphasisDurationMs);
	for (let i = 0; i < clickTimestampsMs.length; i++) {
		const dt = timeMs - clickTimestampsMs[i];
		if (dt >= 0 && dt <= window) {
			return 1 - dt / window;
		}
	}
	return 0;
}

function parseHexColor(hex: string): number {
	const cleaned = hex.replace("#", "");
	if (cleaned.length === 3) {
		const r = cleaned[0];
		const g = cleaned[1];
		const b = cleaned[2];
		return Number.parseInt(`${r}${r}${g}${g}${b}${b}`, 16);
	}
	return Number.parseInt(cleaned.slice(0, 6), 16);
}

export function drawCursorHighlightGraphics(g: Graphics, config: CursorHighlightConfig): void {
	g.clear();
	if (!config.enabled) return;

	const color = parseHexColor(config.color);
	const radius = Math.max(1, config.sizePx / 2);
	const alpha = Math.max(0, Math.min(1, config.opacity));

	switch (config.style) {
		case "dot": {
			g.circle(0, 0, radius);
			g.fill({ color, alpha });
			break;
		}
		case "ring": {
			g.circle(0, 0, radius);
			g.stroke({ color, alpha, width: Math.max(2, radius * 0.18) });
			break;
		}
	}
}

export function drawCursorHighlightCanvas(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	config: CursorHighlightConfig,
	pixelScale = 1,
): void {
	if (!config.enabled) return;

	const radius = Math.max(1, (config.sizePx / 2) * pixelScale);
	const alpha = Math.max(0, Math.min(1, config.opacity));
	const color = config.color;

	ctx.save();
	ctx.globalAlpha = alpha;

	switch (config.style) {
		case "dot": {
			ctx.fillStyle = color;
			ctx.beginPath();
			ctx.arc(cx, cy, radius, 0, Math.PI * 2);
			ctx.fill();
			break;
		}
		case "ring": {
			ctx.beginPath();
			ctx.arc(cx, cy, radius, 0, Math.PI * 2);
			ctx.strokeStyle = color;
			ctx.lineWidth = Math.max(2, radius * 0.18);
			ctx.stroke();
			break;
		}
	}

	ctx.restore();
}
