import type { InteractionClickSample } from "@/lib/recordingSession";
import type { CursorTelemetryPoint } from "../types";
import { interpolateCursorAt } from "./cursorFollowUtils";

interface CursorStageTransform {
	scale: number;
	x: number;
	y: number;
}

interface MaskRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface CursorHighlightState {
	x: number;
	y: number;
	radius: number;
	coreRadius: number;
	opacity: number;
}

export interface CursorRippleState {
	x: number;
	y: number;
	radius: number;
	opacity: number;
}

function clamp01(value: number) {
	return Math.max(0, Math.min(1, value));
}

export function getCursorHighlightState({
	cursorTelemetry,
	timeMs,
	baseMask,
	transform,
	zoomProgress = 0,
}: {
	cursorTelemetry: CursorTelemetryPoint[];
	timeMs: number;
	baseMask: MaskRect;
	transform: CursorStageTransform;
	zoomProgress?: number;
}): CursorHighlightState | null {
	if (!cursorTelemetry.length || baseMask.width <= 0 || baseMask.height <= 0) {
		return null;
	}

	const cursor = interpolateCursorAt(cursorTelemetry, timeMs);
	if (!cursor) {
		return null;
	}

	const baseX = baseMask.x + cursor.cx * baseMask.width;
	const baseY = baseMask.y + cursor.cy * baseMask.height;
	const x = baseX * transform.scale + transform.x;
	const y = baseY * transform.scale + transform.y;
	const progress = clamp01(zoomProgress);

	return {
		x,
		y,
		radius: 18 + progress * 10,
		coreRadius: 4 + progress * 1.5,
		opacity: 0.42 + progress * 0.28,
	};
}

export function applyCursorHighlightElement(
	element: HTMLDivElement,
	highlight: CursorHighlightState | null,
) {
	if (!highlight) {
		element.style.display = "none";
		return;
	}

	element.style.display = "block";
	element.style.left = `${highlight.x}px`;
	element.style.top = `${highlight.y}px`;
	element.style.width = `${highlight.radius * 2}px`;
	element.style.height = `${highlight.radius * 2}px`;
	element.style.opacity = `${highlight.opacity}`;
}

export function getCursorRippleState({
	highlight,
	clicks = [],
	timeMs,
	zoomProgress = 0,
}: {
	highlight: CursorHighlightState | null;
	clicks?: InteractionClickSample[];
	timeMs?: number;
	zoomProgress?: number;
}): CursorRippleState | null {
	if (!highlight) {
		return null;
	}

	const progress = clamp01(zoomProgress);
	const recentClick =
		typeof timeMs === "number"
			? [...clicks].reverse().find((click) => Math.abs(click.timeMs - timeMs) <= 220)
			: undefined;
	if (recentClick) {
		return {
			x: highlight.x,
			y: highlight.y,
			radius: highlight.radius + 24,
			opacity: 0.36,
		};
	}
	const pulse = Math.sin(progress * Math.PI);
	if (pulse <= 0.02) {
		return null;
	}

	return {
		x: highlight.x,
		y: highlight.y,
		radius: highlight.radius + 10 + pulse * 18,
		opacity: 0.25 * pulse,
	};
}

export function applyCursorRippleElement(
	element: HTMLDivElement,
	ripple: CursorRippleState | null,
) {
	if (!ripple) {
		element.style.display = "none";
		return;
	}

	element.style.display = "block";
	element.style.left = `${ripple.x}px`;
	element.style.top = `${ripple.y}px`;
	element.style.width = `${ripple.radius * 2}px`;
	element.style.height = `${ripple.radius * 2}px`;
	element.style.opacity = `${ripple.opacity}`;
}

export function drawCursorHighlight(
	ctx: CanvasRenderingContext2D,
	highlight: CursorHighlightState | null,
) {
	if (!highlight) {
		return;
	}

	ctx.save();

	const halo = ctx.createRadialGradient(
		highlight.x,
		highlight.y,
		highlight.coreRadius,
		highlight.x,
		highlight.y,
		highlight.radius,
	);
	halo.addColorStop(0, `rgba(52, 178, 123, ${Math.min(0.9, highlight.opacity)})`);
	halo.addColorStop(0.45, `rgba(52, 178, 123, ${highlight.opacity * 0.45})`);
	halo.addColorStop(1, "rgba(52, 178, 123, 0)");

	ctx.fillStyle = halo;
	ctx.beginPath();
	ctx.arc(highlight.x, highlight.y, highlight.radius, 0, Math.PI * 2);
	ctx.fill();

	ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, highlight.opacity + 0.15)})`;
	ctx.beginPath();
	ctx.arc(highlight.x, highlight.y, highlight.coreRadius, 0, Math.PI * 2);
	ctx.fill();

	ctx.strokeStyle = `rgba(52, 178, 123, ${Math.min(0.95, highlight.opacity + 0.1)})`;
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	ctx.arc(highlight.x, highlight.y, highlight.coreRadius + 2.5, 0, Math.PI * 2);
	ctx.stroke();

	ctx.restore();
}

export function drawCursorRipple(ctx: CanvasRenderingContext2D, ripple: CursorRippleState | null) {
	if (!ripple) {
		return;
	}

	ctx.save();
	ctx.strokeStyle = `rgba(52, 178, 123, ${ripple.opacity})`;
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
	ctx.stroke();
	ctx.restore();
}
