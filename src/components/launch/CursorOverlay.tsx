import { useEffect, useRef } from "react";

/**
 * Full-screen virtual cursor rendered in the excluded cursor-overlay window.
 *
 * The cursor-overlay BrowserWindow is transparent, click-through, and excluded
 * from screen capture via setContentProtection(true).  When the OS cursor is
 * hidden during editable-overlay recording (so it doesn't appear in raw
 * footage), this component tracks the real mouse position and renders an SVG
 * arrow cursor so the user still has visual feedback.
 */
export function CursorOverlay() {
	const cursorRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		// Hide CSS cursor — the OS cursor is already transparent but belt-and-braces.
		document.documentElement.style.cursor = "none";
		document.body.style.cursor = "none";

		let rafId = 0;
		let pendingX = -200;
		let pendingY = -200;

		const handleMouseMove = (e: MouseEvent) => {
			pendingX = e.clientX;
			pendingY = e.clientY;
			cancelAnimationFrame(rafId);
			rafId = requestAnimationFrame(() => {
				if (cursorRef.current) {
					cursorRef.current.style.transform = `translate(${pendingX}px, ${pendingY}px)`;
				}
			});
		};

		window.addEventListener("mousemove", handleMouseMove);
		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
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
			{/* Cursor starts off-screen until first mousemove */}
			<div
				ref={cursorRef}
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					transform: "translate(-200px, -200px)",
					pointerEvents: "none",
					willChange: "transform",
					// The SVG arrow tip is at the top-left corner of the viewBox,
					// so no extra offset is needed to align hotspot with position.
				}}
			>
				{/* Standard Windows-style arrow cursor */}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="22"
					height="26"
					viewBox="0 0 22 26"
					style={{ display: "block" }}
				>
					{/* Drop shadow */}
					<path
						d="M 3.5 3 L 3.5 21 L 7 16.5 L 10 23 L 12.5 21.8 L 9.5 15 L 15.5 15 Z"
						fill="rgba(0,0,0,0.35)"
						transform="translate(1.5, 1.5)"
					/>
					{/* White fill */}
					<path
						d="M 3.5 3 L 3.5 21 L 7 16.5 L 10 23 L 12.5 21.8 L 9.5 15 L 15.5 15 Z"
						fill="white"
					/>
					{/* Black outline */}
					<path
						d="M 3.5 3 L 3.5 21 L 7 16.5 L 10 23 L 12.5 21.8 L 9.5 15 L 15.5 15 Z"
						fill="none"
						stroke="black"
						strokeWidth="1.5"
						strokeLinejoin="round"
						strokeLinecap="round"
					/>
				</svg>
			</div>
		</div>
	);
}
