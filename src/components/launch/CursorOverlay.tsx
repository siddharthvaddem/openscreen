import { useEffect, useRef } from "react";

/**
 * Full-screen virtual cursor rendered in the excluded cursor-overlay window.
 *
 * The cursor-overlay BrowserWindow is:
 *  - transparent + click-through with { forward: true } — DOM still receives mousemove
 *  - setContentProtection(true) — excluded from ALL screen capture APIs
 *  - screen-saver always-on-top — rendered above HUD and all other app windows
 *
 * When the OS cursor is hidden during editable-overlay recording (so it doesn't
 * appear in raw footage), this component tracks the real mouse position and
 * renders a platform-accurate arrow cursor so the user still has visual feedback.
 *
 * Cursor hiding is Windows-only (SetSystemCursor), so this overlay is only ever
 * shown on Windows. The SVG path matches the Windows 10/11 Aero default cursor.
 */

/**
 * Windows 10/11 Aero arrow cursor path in a 32×32 viewBox.
 * Hotspot is at the very tip (3, 2) — the top-left point of the arrow.
 *
 * Path traces the outer boundary clockwise:
 *   tip (3,2)
 *   → straight down the left edge to (3, 23)
 *   → diagonal up-right into the notch at (7, 19)
 *   → tail extends down to (10, 27)
 *   → across the tail bottom to (13, 25.5)
 *   → back up the tail right side to (10, 17.5)
 *   → horizontal right across the body base to (17, 17.5)
 *   → diagonal back up-left to tip (closes)
 */
const ARROW_PATH = "M 3 2 L 3 23 L 7 19 L 10 27 L 13 25.5 L 10 17.5 L 17 17.5 Z";

export function CursorOverlay() {
	const cursorRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		// Suppress any residual CSS cursor — belt-and-braces since the OS cursor
		// is already transparent, but prevents ghost outlines in some GPU paths.
		document.documentElement.style.cursor = "none";
		document.body.style.cursor = "none";

		let rafId = 0;
		let lastX = -200;
		let lastY = -200;

		const onMouseMove = (e: MouseEvent) => {
			lastX = e.clientX;
			lastY = e.clientY;
			cancelAnimationFrame(rafId);
			rafId = requestAnimationFrame(() => {
				if (cursorRef.current) {
					cursorRef.current.style.transform = `translate(${lastX}px, ${lastY}px)`;
				}
			});
		};

		window.addEventListener("mousemove", onMouseMove);
		return () => {
			window.removeEventListener("mousemove", onMouseMove);
			cancelAnimationFrame(rafId);
		};
	}, []);

	return (
		<div
			style={{
				position: "fixed",
				inset: 0,
				pointerEvents: "none",
				overflow: "hidden",
				background: "transparent",
			}}
		>
			{/*
			 * Wrapper div is translated to the exact cursor position each frame.
			 * Starts 200px off-screen until the first mousemove fires.
			 * willChange:transform promotes this to its own compositor layer so
			 * rAF position updates avoid triggering main-thread layout.
			 */}
			<div
				ref={cursorRef}
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					transform: "translate(-200px, -200px)",
					pointerEvents: "none",
					willChange: "transform",
				}}
			>
				{/*
				 * Windows 10/11 Aero arrow cursor (20×22 CSS px, 32×32 viewBox).
				 * overflow:visible lets the drop-shadow filter expand beyond the SVG
				 * element bounds without being clipped.
				 */}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="22"
					viewBox="0 0 32 32"
					style={{ display: "block", overflow: "visible" }}
				>
					<defs>
						{/* Soft drop shadow matching Windows cursor shadow */}
						<filter id="cursor-shadow" x="-30%" y="-30%" width="180%" height="180%">
							<feDropShadow
								dx="1.5"
								dy="1.5"
								stdDeviation="1.5"
								floodColor="#000000"
								floodOpacity="0.4"
							/>
						</filter>
					</defs>

					{/* Arrow body: white fill + black stroke + drop shadow */}
					<path
						d={ARROW_PATH}
						fill="white"
						stroke="black"
						strokeWidth="1.8"
						strokeLinejoin="round"
						strokeLinecap="round"
						filter="url(#cursor-shadow)"
					/>
				</svg>
			</div>
		</div>
	);
}
