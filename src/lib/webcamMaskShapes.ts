import type { WebcamMaskShape } from "@/components/video-editor/types";

/**
 * Returns a CSS clip-path value for the given shape, or null if borderRadius alone suffices.
 */
export function getCssClipPath(shape: WebcamMaskShape): string | null {
	switch (shape) {
		case "circle":
			return "circle(50% at 50% 50%)";
		case "rectangle":
		case "rounded":
		case "square":
		default:
			return null;
	}
}

/**
 * Draws a Canvas 2D clip path for the given webcam mask shape.
 * Call ctx.beginPath() is handled internally; caller should call ctx.clip() after.
 */
export function drawCanvasClipPath(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	shape: WebcamMaskShape,
	borderRadius: number,
): void {
	ctx.beginPath();
	switch (shape) {
		case "circle": {
			const cx = x + w / 2;
			const cy = y + h / 2;
			const r = Math.min(w, h) / 2;
			ctx.arc(cx, cy, r, 0, Math.PI * 2);
			break;
		}
		case "rectangle":
		case "rounded":
		case "square":
		default:
			ctx.roundRect(x, y, w, h, borderRadius);
			break;
	}
	ctx.closePath();
}
