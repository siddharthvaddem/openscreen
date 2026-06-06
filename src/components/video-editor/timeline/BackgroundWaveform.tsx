import { useTimelineContext } from "dnd-timeline";
import { useEffect, useMemo, useRef, useState } from "react";

// Perceptual curve on normalized amplitude; exponent < 1 lifts quiet passages so
// one loud spike doesn't flatten the rest.
const WAVEFORM_GAMMA = 0.6;

export interface BackgroundWaveformProps {
	/** Pre-computed peaks: pairs of [min, max] per block (length = 2 * N). */
	peaks: Float32Array | null;
	videoDurationMs: number;
	/** Inset from canvas top so the waveform aligns with item content top. Defaults to 0. */
	topInset?: number;
	/** Inset from canvas bottom so the waveform aligns with item content bottom. Defaults to 0. */
	bottomInset?: number;
}

/**
 * Renders a rectified (half-wave) audio waveform on a canvas filling its block.
 * Pass as the `background` prop of `<Row>`, which already provides
 * `relative overflow-hidden`.
 *
 * Canvas is always `inset-0` (full row height); vertical alignment comes from
 * `topInset`/`bottomInset` in the draw calls, not CSS, so it's immune to
 * sub-pixel layout rounding. `pointer-events: none` keeps drag-to-create working.
 */
export default function BackgroundWaveform({
	peaks,
	videoDurationMs,
	topInset = 0,
	bottomInset = 0,
}: BackgroundWaveformProps) {
	const { range } = useTimelineContext();
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });

	// Normalize against the track's own loudest peak so quiet recordings (mic/system
	// audio rarely hit full scale) still fill the row. Recomputed only on peaks change,
	// not zoom/pan, so height stays stable while scrolling.
	const normFactor = useMemo(() => {
		if (!peaks || peaks.length === 0) return 0;
		let globalMax = 0;
		for (let i = 0; i < peaks.length; i++) {
			const a = Math.abs(peaks[i]);
			if (a > globalMax) globalMax = a;
		}
		return globalMax > 0 ? 1 / globalMax : 0;
	}, [peaks]);

	// Observe the canvas directly; Row's `relative overflow-hidden` parent makes
	// it fill the row exactly, so no wrapper div is needed.
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ro = new ResizeObserver((entries) => {
			const { width, height } = entries[0].contentRect;
			setCanvasSize({ w: width, h: height });
		});
		ro.observe(canvas);
		return () => ro.disconnect();
	}, []);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || canvasSize.w <= 0 || canvasSize.h <= 0) return;

		const dpr = window.devicePixelRatio || 1;
		canvas.width = Math.round(canvasSize.w * dpr);
		canvas.height = Math.round(canvasSize.h * dpr);

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		ctx.scale(dpr, dpr);
		ctx.clearRect(0, 0, canvasSize.w, canvasSize.h);

		if (!peaks || peaks.length === 0 || normFactor === 0) return;

		const W = canvasSize.w;
		const H = canvasSize.h;
		const rangeMs = range.end - range.start;
		if (rangeMs <= 0 || videoDurationMs <= 0) return;

		// Draw within [topY, bottomY] so the waveform aligns with item bounds
		// regardless of sub-pixel rounding on the canvas element.
		const topY = topInset;
		const bottomY = H - bottomInset;
		const drawHeight = bottomY - topY;
		if (drawHeight <= 0) return;

		const N = peaks.length / 2;
		const amp = drawHeight * 0.9;

		// Rectified: amplitude = max(|min|, |max|), normalized to the loudest peak
		// and gamma-curved, drawn upward from bottomY.
		const colY = new Float32Array(W);
		for (let x = 0; x < W; x++) {
			const startMs = range.start + (x / W) * rangeMs;
			const endMs = range.start + ((x + 1) / W) * rangeMs;
			const lo = Math.max(0, Math.floor((startMs / videoDurationMs) * N));
			const hi = Math.min(N - 1, Math.ceil((endMs / videoDurationMs) * N));

			let absMax = 0;
			for (let i = lo; i <= hi; i++) {
				const a = Math.abs(peaks[i * 2]);
				const b = Math.abs(peaks[i * 2 + 1]);
				if (a > absMax) absMax = a;
				if (b > absMax) absMax = b;
			}
			const normalized = Math.min(1, absMax * normFactor);
			const display = normalized > 0 ? normalized ** WAVEFORM_GAMMA : 0;
			colY[x] = bottomY - display * amp;
		}

		// Filled polygon: bottom-left, up over the silhouette, down to bottom-right.
		ctx.beginPath();
		ctx.moveTo(0, bottomY);
		for (let x = 0; x < W; x++) {
			ctx.lineTo(x, colY[x]);
		}
		ctx.lineTo(W, bottomY);
		ctx.closePath();
		ctx.fillStyle = "rgba(74, 222, 128, 0.55)";
		ctx.fill();

		// Crisp top-edge stroke.
		ctx.beginPath();
		ctx.moveTo(0, colY[0]);
		for (let x = 1; x < W; x++) {
			ctx.lineTo(x, colY[x]);
		}
		ctx.strokeStyle = "rgba(74, 222, 128, 0.85)";
		ctx.lineWidth = 1;
		ctx.stroke();
	}, [peaks, normFactor, range, canvasSize, videoDurationMs, topInset, bottomInset]);

	return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none w-full h-full" />;
}
