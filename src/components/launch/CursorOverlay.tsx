import { useEffect, useRef, useState } from "react";
import type { CursorOverlayAsset } from "../../../electron/native-bridge/cursor/recording/windowsNativeRecordingSession.types";
import type { NativeCursorType } from "../../native/contracts";

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
 * renders a platform-accurate cursor so the user still has visual feedback.
 *
 * Cursor hiding is Windows-only (SetSystemCursor), so this overlay is only ever
 * shown on Windows.
 *
 * The active cursor shape changes in real time as the OS cursor type changes —
 * the main process relays `cursor-type-change` IPC messages from the PowerShell
 * sampler which reads the current Win32 cursor handle on every sample interval.
 */

// ── Cursor shape definitions ─────────────────────────────────────────────────
// Each entry provides an SVG path, the hotspot position within the viewBox
// (the pixel that should align with the real mouse pointer position), and
// the SVG viewport size.
//
// All shapes are drawn as white fill + black stroke, matching the Windows
// 10/11 Aero cursor aesthetic.

interface CursorDef {
	/** SVG path data (may be multiple paths separated by spaces — use separate <path> elements). */
	paths: string[];
	/** X coordinate of the hotspot in viewBox units. */
	hotspotX: number;
	/** Y coordinate of the hotspot in viewBox units. */
	hotspotY: number;
	/** viewBox attribute value. */
	viewBox: string;
	/** CSS width of the rendered SVG element. */
	width: number;
	/** CSS height of the rendered SVG element. */
	height: number;
}

/**
 * Windows 10/11 Aero arrow cursor.
 * Hotspot: top-left tip at (3, 2).
 */
const ARROW: CursorDef = {
	paths: ["M 3 2 L 3 23 L 7 19 L 10 27 L 13 25.5 L 10 17.5 L 17 17.5 Z"],
	hotspotX: 3,
	hotspotY: 2,
	viewBox: "0 0 32 32",
	width: 32,
	height: 36,
};

/**
 * Pointer (link hand) cursor.
 * Simplified pointing-hand with the index finger extended upward.
 * Hotspot: fingertip at (9, 1).
 */
const POINTER: CursorDef = {
	paths: [
		// Index finger (vertical bar)
		"M 7 1 L 11 1 L 11 16 L 14 16 Q 16 16 16 18 L 16 19 Q 16 17 18 17 Q 20 17 20 19 L 20 20 Q 20 18 22 18 Q 24 18 24 21 L 24 25 Q 23 30 17 30 L 11 30 Q 5 28 5 23 L 5 19 Q 5 17 7 17 L 7 1 Z",
	],
	hotspotX: 9,
	hotspotY: 1,
	viewBox: "0 0 30 32",
	width: 30,
	height: 34,
};

/**
 * Text (I-beam) cursor.
 * Hotspot: vertical center at (12, 16).
 */
const TEXT: CursorDef = {
	paths: [
		// Top serif + stem + bottom serif as a single filled shape
		"M 6 4 L 18 4 L 18 7 L 14 7 L 14 25 L 18 25 L 18 28 L 6 28 L 6 25 L 10 25 L 10 7 L 6 7 Z",
	],
	hotspotX: 12,
	hotspotY: 16,
	viewBox: "0 0 24 32",
	width: 24,
	height: 34,
};

/**
 * Crosshair cursor.
 * Hotspot: center at (16, 16).
 */
const CROSSHAIR: CursorDef = {
	paths: [
		// Plus/cross shape
		"M 14 2 L 18 2 L 18 14 L 30 14 L 30 18 L 18 18 L 18 30 L 14 30 L 14 18 L 2 18 L 2 14 L 14 14 Z",
	],
	hotspotX: 16,
	hotspotY: 16,
	viewBox: "0 0 32 32",
	width: 32,
	height: 32,
};

/**
 * Horizontal resize (↔) cursor.
 * Hotspot: center at (16, 16).
 */
const RESIZE_EW: CursorDef = {
	paths: ["M 2 16 L 8 10 L 8 13 L 24 13 L 24 10 L 30 16 L 24 22 L 24 19 L 8 19 L 8 22 Z"],
	hotspotX: 16,
	hotspotY: 16,
	viewBox: "0 0 32 32",
	width: 32,
	height: 32,
};

/**
 * Vertical resize (↕) cursor.
 * Hotspot: center at (16, 16).
 */
const RESIZE_NS: CursorDef = {
	paths: ["M 16 2 L 22 8 L 19 8 L 19 24 L 22 24 L 16 30 L 10 24 L 13 24 L 13 8 L 10 8 Z"],
	hotspotX: 16,
	hotspotY: 16,
	viewBox: "0 0 32 32",
	width: 32,
	height: 32,
};

/**
 * Diagonal resize NE↔SW cursor.
 * Hotspot: center at (16, 16).
 */
const RESIZE_NESW: CursorDef = {
	paths: [
		// NE arrowhead
		"M 20 2 L 30 2 L 30 12 L 26 9 L 19 16 L 16 13 L 23 6 Z",
		// SW arrowhead
		"M 12 19 L 9 22 L 6 26 L 2 30 L 12 30 L 9 26 L 16 19 Z",
	],
	hotspotX: 16,
	hotspotY: 16,
	viewBox: "0 0 32 32",
	width: 32,
	height: 32,
};

/**
 * Diagonal resize NW↔SE cursor.
 * Hotspot: center at (16, 16).
 */
const RESIZE_NWSE: CursorDef = {
	paths: [
		// NW arrowhead
		"M 2 2 L 12 2 L 9 6 L 16 13 L 13 16 L 6 9 L 2 12 Z",
		// SE arrowhead
		"M 19 16 L 16 19 L 23 26 L 26 22 L 30 30 L 20 30 L 23 26 L 16 19 Z",
	],
	hotspotX: 16,
	hotspotY: 16,
	viewBox: "0 0 32 32",
	width: 32,
	height: 32,
};

/**
 * Not-allowed cursor (circle with diagonal slash).
 * Hotspot: center at (16, 16).
 */
const NOT_ALLOWED: CursorDef = {
	paths: [
		// Outer ring (approximated as filled ring via two shapes — use stroke instead)
		// Diagonal bar across center
		"M 16 3 Q 26 3 29 13 L 25 17 Q 24 8 16 7 Q 8 7 7 15 L 3 19 Q 3 6 16 3 Z",
		"M 16 29 Q 6 29 3 19 L 7 15 Q 8 24 16 25 Q 24 25 25 17 L 29 13 Q 29 26 16 29 Z",
		// Diagonal slash (NW to SE)
		"M 25 7 L 28 10 L 7 29 L 4 26 Z",
	],
	hotspotX: 16,
	hotspotY: 16,
	viewBox: "0 0 32 32",
	width: 32,
	height: 32,
};

/**
 * Open hand cursor.
 * Hotspot: center of palm at (12, 14).
 */
const OPEN_HAND: CursorDef = {
	paths: [
		// Simplified open hand — five upward fingers + palm
		"M 8 3 L 10 3 L 10 17 L 8 17 Z" +
			" M 11 1 L 13 1 L 13 17 L 11 17 Z" +
			" M 14 3 L 16 3 L 16 17 L 14 17 Z" +
			" M 17 5 L 19 5 L 19 17 L 17 17 Z" +
			" M 5 8 L 7 8 L 7 17 L 5 17 Z" +
			" M 5 17 Q 4 17 4 19 L 4 23 Q 4 28 12 28 L 16 28 Q 22 26 22 22 L 22 18 Q 22 16 20 16 L 5 16 Z",
	],
	hotspotX: 12,
	hotspotY: 14,
	viewBox: "0 0 28 32",
	width: 28,
	height: 34,
};

const CURSOR_MAP: Partial<Record<NativeCursorType, CursorDef>> & { default: CursorDef } = {
	default: ARROW,
	arrow: ARROW,
	pointer: POINTER,
	text: TEXT,
	crosshair: CROSSHAIR,
	"resize-ew": RESIZE_EW,
	"resize-ns": RESIZE_NS,
	"resize-nesw": RESIZE_NESW,
	"resize-nwse": RESIZE_NWSE,
	"not-allowed": NOT_ALLOWED,
	"open-hand": OPEN_HAND,
	"closed-hand": OPEN_HAND, // reuse open-hand as fallback
};

function getCursorDef(cursorType: NativeCursorType | null): CursorDef {
	if (!cursorType) return CURSOR_MAP.default;
	return CURSOR_MAP[cursorType] ?? CURSOR_MAP.default;
}

export function CursorOverlay() {
	const cursorRef = useRef<HTMLDivElement>(null);
	const [cursorType, setCursorType] = useState<NativeCursorType | null>(null);
	// The live-captured OS cursor bitmap sent by the main process.
	// When present this is always preferred over the SVG fallbacks because it
	// shows the user's actual cursor (any theme, any DPI) pixel-perfectly.
	const [liveAsset, setLiveAsset] = useState<CursorOverlayAsset | null>(null);

	// ── Listen for real-time cursor type + bitmap from the main process ─────────
	useEffect(() => {
		const cleanup = window.electronAPI?.onCursorTypeChange?.((type, asset) => {
			setCursorType(type);
			if (asset) setLiveAsset(asset);
		});
		return () => {
			cleanup?.();
		};
	}, []);

	// ── Track mouse position via mousemove + rAF ─────────────────────────────
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

	// ── Prefer live OS bitmap; fall back to SVG approximation ────────────────
	const svgDef = getCursorDef(cursorType);

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
				{liveAsset ? (
					/*
					 * Live OS cursor bitmap captured by the PowerShell sampler.
					 * This is the user's actual cursor — whatever theme they have installed
					 * (Aero, custom, high-contrast, etc.) at the correct DPI.
					 * The image is offset so its hotspot aligns with the mouse position.
					 */
					<img
						src={liveAsset.imageDataUrl}
						width={liveAsset.width}
						height={liveAsset.height}
						alt=""
						style={{
							display: "block",
							// Offset so the cursor hotspot sits exactly at the mouse position
							transform: `translate(${-liveAsset.hotspotX}px, ${-liveAsset.hotspotY}px)`,
							imageRendering: "pixelated",
						}}
					/>
				) : (
					/*
					 * SVG fallback — shown on the very first frame before the first
					 * bitmap arrives from the sampler (typically < 1 sample interval).
					 * The SVG is offset so its hotspot aligns with the mouse position.
					 * overflow:visible lets the drop-shadow expand beyond element bounds.
					 */
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width={svgDef.width}
						height={svgDef.height}
						viewBox={svgDef.viewBox}
						style={{
							display: "block",
							overflow: "visible",
							transform: `translate(${-svgDef.hotspotX}px, ${-svgDef.hotspotY}px)`,
						}}
					>
						<defs>
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
						{svgDef.paths.map((d, i) => (
							<path
								key={i}
								d={d}
								fill="white"
								stroke="black"
								strokeWidth="1.8"
								strokeLinejoin="round"
								strokeLinecap="round"
								filter="url(#cursor-shadow)"
							/>
						))}
					</svg>
				)}
			</div>
		</div>
	);
}
