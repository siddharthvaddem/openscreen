import { useEffect, useRef } from "react";
import type { PreviewStreams } from "@/hooks/usePreviewStream";

const PIP_SIZE_RATIO = 0.22;
const PIP_MARGIN = 12;
const PREVIEW_FPS_INTERVAL = 1000 / 30;

interface LivePreviewProps {
	streams: PreviewStreams | null;
	className?: string;
}

export function LivePreview({ streams, className }: LivePreviewProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const screenVideoRef = useRef<HTMLVideoElement | null>(null);
	const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
	const animFrameRef = useRef<number>(0);
	const lastDrawRef = useRef<number>(0);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || !streams) return;

		const ctx = canvas.getContext("2d", { alpha: false });
		if (!ctx) return;

		// Create hidden video elements for decoding
		const screenVideo = document.createElement("video");
		screenVideo.muted = true;
		screenVideo.playsInline = true;
		screenVideo.srcObject = streams.screen;
		screenVideo.play().catch(() => {
			// Autoplay may be blocked; preview still works on next user interaction
		});
		screenVideoRef.current = screenVideo;

		let webcamVideo: HTMLVideoElement | null = null;
		if (streams.webcam) {
			webcamVideo = document.createElement("video");
			webcamVideo.muted = true;
			webcamVideo.playsInline = true;
			webcamVideo.srcObject = streams.webcam;
			webcamVideo.play().catch(() => {
				// Autoplay may be blocked; preview still works on next user interaction
			});
			webcamVideoRef.current = webcamVideo;
		}

		let running = true;

		const draw = (timestamp: number) => {
			if (!running) return;

			// Throttle to ~30fps
			if (timestamp - lastDrawRef.current < PREVIEW_FPS_INTERVAL) {
				animFrameRef.current = requestAnimationFrame(draw);
				return;
			}
			lastDrawRef.current = timestamp;

			// Match canvas internal resolution to the video's natural size, capped for performance
			const videoWidth = screenVideo.videoWidth || 960;
			const videoHeight = screenVideo.videoHeight || 540;
			const scale = Math.min(1, 960 / videoWidth);
			const drawWidth = Math.round(videoWidth * scale);
			const drawHeight = Math.round(videoHeight * scale);

			if (canvas.width !== drawWidth || canvas.height !== drawHeight) {
				canvas.width = drawWidth;
				canvas.height = drawHeight;
			}

			// Draw screen capture
			if (screenVideo.readyState >= 2) {
				ctx.drawImage(screenVideo, 0, 0, drawWidth, drawHeight);
			} else {
				// Show dark background while waiting for first frame
				ctx.fillStyle = "#18181b";
				ctx.fillRect(0, 0, drawWidth, drawHeight);
			}

			// Draw webcam PiP overlay (circular, bottom-right)
			if (webcamVideo && webcamVideo.readyState >= 2) {
				const pipDiameter = Math.min(drawWidth, drawHeight) * PIP_SIZE_RATIO;
				const pipX = drawWidth - pipDiameter - PIP_MARGIN;
				const pipY = drawHeight - pipDiameter - PIP_MARGIN;
				const radius = pipDiameter / 2;
				const centerX = pipX + radius;
				const centerY = pipY + radius;

				ctx.save();

				// Shadow behind PiP
				ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
				ctx.shadowBlur = 8;
				ctx.shadowOffsetX = 0;
				ctx.shadowOffsetY = 2;

				// Circular clip
				ctx.beginPath();
				ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
				ctx.clip();

				// Draw webcam (cover-fit into circle)
				const ww = webcamVideo.videoWidth;
				const wh = webcamVideo.videoHeight;
				const aspectRatio = ww / wh;
				let sx = 0;
				let sy = 0;
				let sw = ww;
				let sh = wh;

				if (aspectRatio > 1) {
					// Wider than tall: crop sides
					sw = wh;
					sx = (ww - sw) / 2;
				} else {
					// Taller than wide: crop top/bottom
					sh = ww;
					sy = (wh - sh) / 2;
				}

				ctx.drawImage(webcamVideo, sx, sy, sw, sh, pipX, pipY, pipDiameter, pipDiameter);
				ctx.restore();

				// Draw border ring
				ctx.beginPath();
				ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
				ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
				ctx.lineWidth = 2;
				ctx.stroke();
			}

			animFrameRef.current = requestAnimationFrame(draw);
		};

		animFrameRef.current = requestAnimationFrame(draw);

		return () => {
			running = false;
			cancelAnimationFrame(animFrameRef.current);
			screenVideo.srcObject = null;
			screenVideoRef.current = null;
			if (webcamVideo) {
				webcamVideo.srcObject = null;
			}
			webcamVideoRef.current = null;
		};
	}, [streams]);

	// Update webcam video element when webcam stream changes
	useEffect(() => {
		if (!webcamVideoRef.current && streams?.webcam) {
			const webcamVideo = document.createElement("video");
			webcamVideo.muted = true;
			webcamVideo.playsInline = true;
			webcamVideo.srcObject = streams.webcam;
			webcamVideo.play().catch(() => {
				// Autoplay may be blocked; preview still works on next user interaction
			});
			webcamVideoRef.current = webcamVideo;
		}
	}, [streams?.webcam]);

	if (!streams) {
		return (
			<div
				className={`flex items-center justify-center bg-[#18181b] rounded-xl ${className ?? ""}`}
			>
				<div className="text-center">
					<div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-white/5 flex items-center justify-center">
						<svg
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
							className="text-white/20"
						>
							<rect x="2" y="3" width="20" height="14" rx="2" />
							<path d="M8 21h8" />
							<path d="M12 17v4" />
						</svg>
					</div>
					<p className="text-xs text-white/30">Select a source to preview</p>
				</div>
			</div>
		);
	}

	return (
		<div className={`relative overflow-hidden rounded-xl bg-[#18181b] ${className ?? ""}`}>
			<canvas
				ref={canvasRef}
				className="w-full h-full object-contain"
				style={{ imageRendering: "auto" }}
			/>
		</div>
	);
}
