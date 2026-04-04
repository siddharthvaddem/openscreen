import { useTimelineContext } from "dnd-timeline";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface AudioWaveformProps {
	peaks: Float32Array | null;
	isLoading: boolean;
	videoDurationMs: number;
}

export function AudioWaveform({ peaks, isLoading, videoDurationMs }: AudioWaveformProps) {
	const { range, sidebarWidth } = useTimelineContext();
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

	// Watch container size changes (e.g., panel resize)
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				setContainerSize({
					width: Math.floor(entry.contentRect.width),
					height: Math.floor(entry.contentRect.height),
				});
			}
		});

		observer.observe(container);
		return () => observer.disconnect();
	}, []);

	// Redraw waveform whenever peaks, viewport, or container size changes
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const dpr = window.devicePixelRatio || 1;
		const width = containerSize.width;
		const height = containerSize.height;

		if (width <= 0 || height <= 0) return;

		// Set actual backbuffer size for HiDPI
		canvas.width = width * dpr;
		canvas.height = height * dpr;
		ctx.scale(dpr, dpr);
		ctx.clearRect(0, 0, width, height);

		if (!peaks || peaks.length === 0 || videoDurationMs <= 0) return;

		const startMs = range.start;
		const endMs = range.end;
		const visibleMs = endMs - startMs;
		if (visibleMs <= 0) return;

		const peaksPerMs = peaks.length / videoDurationMs;

		const barWidth = 2;
		const gap = 1;
		const totalBars = Math.max(1, Math.floor(width / (barWidth + gap)));
		const msPerBar = visibleMs / totalBars;

		// Draw a subtle background gradient
		const gradient = ctx.createLinearGradient(0, 0, 0, height);
		gradient.addColorStop(0, "rgba(52, 178, 123, 0.9)");
		gradient.addColorStop(0.5, "rgba(52, 178, 123, 0.6)");
		gradient.addColorStop(1, "rgba(52, 178, 123, 0.9)");
		ctx.fillStyle = gradient;

		for (let i = 0; i < totalBars; i++) {
			const barCenterMs = startMs + i * msPerBar + msPerBar / 2;
			const peakIndex = Math.floor(barCenterMs * peaksPerMs);

			if (peakIndex >= 0 && peakIndex < peaks.length) {
				const amplitude = peaks[peakIndex];
				const minH = 2;
				const barHeight = Math.max(minH, amplitude * height * 0.85);
				const x = i * (barWidth + gap);
				const y = (height - barHeight) / 2;

				ctx.beginPath();
				if (ctx.roundRect) {
					ctx.roundRect(x, y, barWidth, barHeight, 1);
				} else {
					ctx.rect(x, y, barWidth, barHeight);
				}
				ctx.fill();
			}
		}
	}, [peaks, range.start, range.end, videoDurationMs, containerSize.width, containerSize.height]);

	return (
		<div
			className="relative w-full flex items-center bg-[#0a0f0c] border-b border-[#34B27B]/20 group"
			style={{ height: 56 }}
		>
			{/* Sidebar label */}
			<div
				className="absolute left-0 top-0 bottom-0 flex items-center bg-[#111115]/90 border-r border-white/5 select-none z-10 shrink-0"
				style={{ width: sidebarWidth }}
			>
				<span className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest px-2">
					Audio
				</span>
			</div>

			{/* Waveform area */}
			<div
				ref={containerRef}
				className="absolute top-0 bottom-0 overflow-hidden"
				style={{ left: sidebarWidth, right: 0 }}
			>
				{isLoading ? (
					<div className="absolute inset-0 flex items-center justify-center gap-1.5 text-slate-600">
						<Loader2 className="w-3 h-3 animate-spin text-[#34B27B]/70" />
						<span className="text-[9px] font-medium text-slate-600">Processing waveform…</span>
					</div>
				) : (
					<canvas
						ref={canvasRef}
						className="absolute inset-0 w-full h-full opacity-75 group-hover:opacity-100 transition-opacity duration-200"
					/>
				)}
			</div>
		</div>
	);
}
