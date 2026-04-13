import { useEffect, useRef, useState } from "react";

/**
 * Floating camera preview window — shown whenever the webcam is enabled,
 * both before and during recording. Renders the live feed in a draggable
 * circle. On hover, a collapse button appears so the user can tuck it away
 * without turning off the webcam.
 */
export function CameraPreviewWindow() {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [collapsed, setCollapsed] = useState(false);
	const [hovered, setHovered] = useState(false);

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const deviceId = params.get("deviceId") ?? "";

		const constraints: MediaStreamConstraints = {
			video: deviceId
				? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
				: { width: { ideal: 1280 }, height: { ideal: 720 } },
			audio: false,
		};

		let stream: MediaStream | null = null;

		navigator.mediaDevices
			.getUserMedia(constraints)
			.then((s) => {
				stream = s;
				if (videoRef.current) {
					videoRef.current.srcObject = s;
				}
			})
			.catch(console.error);

		return () => {
			stream?.getTracks().forEach((t) => t.stop());
		};
	}, []);

	if (collapsed) {
		return (
			<div
				style={{
					width: "100vw",
					height: "100vh",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					background: "transparent",
				}}
			>
				{/* Collapsed pill — click to expand */}
				<button
					onClick={() => setCollapsed(false)}
					title="Show camera preview"
					style={{
						display: "flex",
						alignItems: "center",
						gap: 6,
						padding: "6px 12px",
						borderRadius: 999,
						background: "rgba(20,20,28,0.88)",
						border: "1.5px solid rgba(255,255,255,0.15)",
						boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
						color: "rgba(255,255,255,0.75)",
						fontSize: 12,
						fontFamily: "system-ui, sans-serif",
						cursor: "pointer",
						// @ts-expect-error Electron drag
						WebkitAppRegion: "no-drag",
					}}
				>
					{/* Camera icon */}
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<path d="M23 7l-7 5 7 5V7z"/>
						<rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
					</svg>
					Show
				</button>
			</div>
		);
	}

	return (
		<div
			style={{
				width: "100vw",
				height: "100vh",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				background: "transparent",
				// @ts-expect-error Electron drag
				WebkitAppRegion: "drag",
				cursor: "grab",
			}}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
		>
			{/* Circle video frame */}
			<div style={{ position: "relative", width: 196, height: 196, flexShrink: 0 }}>
				<div
					style={{
						width: 196,
						height: 196,
						borderRadius: "50%",
						overflow: "hidden",
						border: "3px solid rgba(255,255,255,0.22)",
						boxShadow:
							"0 8px 32px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.08), inset 0 0 0 1px rgba(0,0,0,0.3)",
						background: "#111",
					}}
				>
					<video
						ref={videoRef}
						autoPlay
						muted
						playsInline
						style={{
							width: "100%",
							height: "100%",
							objectFit: "cover",
							transform: "scaleX(-1)",
							display: "block",
						}}
					/>
				</div>

				{/* Hover controls */}
				{hovered && (
					<button
						onClick={() => setCollapsed(true)}
						title="Hide camera preview"
						style={{
							position: "absolute",
							top: 8,
							right: 8,
							width: 28,
							height: 28,
							borderRadius: "50%",
							background: "rgba(0,0,0,0.65)",
							border: "1px solid rgba(255,255,255,0.2)",
							color: "rgba(255,255,255,0.85)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							cursor: "pointer",
							// @ts-expect-error Electron drag
							WebkitAppRegion: "no-drag",
							backdropFilter: "blur(6px)",
						}}
					>
						{/* Eye-off icon */}
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
							<path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
							<line x1="1" y1="1" x2="23" y2="23"/>
						</svg>
					</button>
				)}
			</div>
		</div>
	);
}
