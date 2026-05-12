import { useEffect, useRef, useState } from "react";
import arrowUrl from "@/assets/cursors/Cursor=AeroDefault.svg";
import crosshairUrl from "@/assets/cursors/Cursor=Cross.svg";
import closedHandUrl from "@/assets/cursors/Cursor=Hand-(Grabbing).svg";
import openHandUrl from "@/assets/cursors/Cursor=Hand-(Open).svg";
import pointerUrl from "@/assets/cursors/Cursor=Hand-(Pointing).svg";
import notAllowedUrl from "@/assets/cursors/Cursor=Not-Allowed.svg";
import resizeNeswUrl from "@/assets/cursors/Cursor=Resize-North-East-South-West.svg";
import resizeNsUrl from "@/assets/cursors/Cursor=Resize-North-South.svg";
import resizeNwseUrl from "@/assets/cursors/Cursor=Resize-North-West-South-East.svg";
import resizeEwUrl from "@/assets/cursors/Cursor=Resize-West-East.svg";
import textUrl from "@/assets/cursors/Cursor=Text-Cursor.svg";
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
 *
 * We use the same cursor SVG assets as the editor's native-os preview so the
 * recording helper and the editor look identical.  The raw bitmap asset from the
 * PowerShell sampler is deliberately ignored: during editable-overlay recording
 * SetSystemCursor replaces every OS cursor handle with a transparent 32×32
 * bitmap, and even Chrome's private handles are only available while the cursor
 * is over a Chrome window.  Relying on the bitmap would cause the cursor to
 * vanish whenever a transparent handle is captured (e.g. the brief wait /
 * app-starting cursor triggered by clicking a link).  The SVG approach is
 * always opaque and always correct.
 */

interface CursorAsset {
	/** Vite-resolved URL of the cursor SVG. */
	url: string;
	/** Hotspot X within the 32×32 SVG coordinate space. */
	hotspotX: number;
	/** Hotspot Y within the 32×32 SVG coordinate space. */
	hotspotY: number;
	/** Rendered CSS width in pixels. */
	width: number;
	/** Rendered CSS height in pixels. */
	height: number;
}

// These dimensions and hotspots mirror PRETTY_NATIVE_CURSOR_ASSETS in
// src/lib/cursor/nativeCursor.ts so the recording overlay and the editor
// preview use identical cursor geometry.
const ARROW: CursorAsset = {
	url: arrowUrl,
	// Cursor=AeroDefault.svg viewBox is "0 0 36.7 56.2" (portrait, 1:1.53 ratio).
	// At width=32: height ≈ 49. Tip at SVG (0.8, 1.8) → hotspot (1, 2).
	width: 32,
	height: 49,
	hotspotX: 1,
	hotspotY: 2,
};
const POINTER: CursorAsset = {
	url: pointerUrl,
	hotspotX: 16.65,
	hotspotY: 14.24,
	width: 32,
	height: 33,
};
const TEXT: CursorAsset = {
	url: textUrl,
	hotspotX: 16,
	hotspotY: 16,
	width: 32,
	height: 32,
};
const CROSSHAIR: CursorAsset = {
	url: crosshairUrl,
	hotspotX: 16,
	hotspotY: 16,
	width: 32,
	height: 32,
};
const RESIZE_EW: CursorAsset = {
	url: resizeEwUrl,
	hotspotX: 16,
	hotspotY: 16,
	width: 32,
	height: 32,
};
const RESIZE_NS: CursorAsset = {
	url: resizeNsUrl,
	hotspotX: 16,
	hotspotY: 16,
	width: 32,
	height: 32,
};
const RESIZE_NESW: CursorAsset = {
	url: resizeNeswUrl,
	hotspotX: 16,
	hotspotY: 16,
	width: 32,
	height: 32,
};
const RESIZE_NWSE: CursorAsset = {
	url: resizeNwseUrl,
	hotspotX: 16,
	hotspotY: 16,
	width: 32,
	height: 32,
};
const NOT_ALLOWED: CursorAsset = {
	url: notAllowedUrl,
	hotspotX: 16,
	hotspotY: 16,
	width: 32,
	height: 32,
};
const OPEN_HAND: CursorAsset = {
	url: openHandUrl,
	hotspotX: 16,
	hotspotY: 9,
	width: 32,
	height: 32,
};
const CLOSED_HAND: CursorAsset = {
	url: closedHandUrl,
	hotspotX: 16,
	hotspotY: 9,
	width: 32,
	height: 32,
};

const CURSOR_MAP: Partial<Record<NativeCursorType, CursorAsset>> & { default: CursorAsset } = {
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
	"closed-hand": CLOSED_HAND,
};

function getCursorAsset(cursorType: NativeCursorType | null): CursorAsset {
	if (!cursorType) return CURSOR_MAP.default;
	return CURSOR_MAP[cursorType] ?? CURSOR_MAP.default;
}

export function CursorOverlay() {
	const cursorRef = useRef<HTMLDivElement>(null);
	const [cursorType, setCursorType] = useState<NativeCursorType | null>(null);
	// Logical CSS pixel size for the cursor SVG, derived from the captured asset:
	//   asset.width / asset.scaleFactor
	// Defaults to 32 / devicePixelRatio as a best-guess before the first IPC
	// message arrives.
	const [logicalSize, setLogicalSize] = useState<number>(() => 32 / (window.devicePixelRatio || 1));

	// ── Listen for real-time cursor type from the main process ──────────────────
	// We use SVG cursor assets (not the raw bitmap) so the overlay is always
	// opaque and always visible regardless of what SetSystemCursor returns.
	// The IPC asset carries width + scaleFactor so we can derive the correct
	// logical cursor size and render the SVG at exactly the right CSS dimensions.
	useEffect(() => {
		const cleanup = window.electronAPI?.onCursorTypeChange?.((type, asset) => {
			setCursorType(type);
			if (asset && asset.scaleFactor > 0) {
				// Logical size = physical pixel width ÷ display scale factor.
				setLogicalSize(asset.width / asset.scaleFactor);
			}
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

	const svgAsset = getCursorAsset(cursorType);
	// Scale the SVG to match the OS cursor's logical pixel size.
	// sizeRatio maps the SVG's natural design size (32px) to the actual
	// logical size derived from the IPC asset.
	const sizeRatio = logicalSize / svgAsset.width;
	const renderedWidth = svgAsset.width * sizeRatio; // = logicalSize
	const renderedHeight = svgAsset.height * sizeRatio;
	const renderedHotspotX = svgAsset.hotspotX * sizeRatio;
	const renderedHotspotY = svgAsset.hotspotY * sizeRatio;

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
				 * Cursor SVG rendered as an <img> so it uses the same pixel-perfect
				 * Windows Aero cursor artwork as the editor's native-os preview.
				 *
				 * The image is offset by its hotspot so the active pixel of the cursor
				 * (tip of the arrow, fingertip of the hand, etc.) is exactly at the
				 * mouse position tracked by the mousemove listener above.
				 *
				 * Dimensions are scaled from the SVG's natural 32px design size to the
				 * logical cursor size derived from the recorded OS cursor bitmap
				 * (asset.width / asset.scaleFactor).
				 */}
				<img
					src={svgAsset.url}
					width={renderedWidth}
					height={renderedHeight}
					alt=""
					draggable={false}
					style={{
						display: "block",
						transform: `translate(${-renderedHotspotX}px, ${-renderedHotspotY}px)`,
						imageRendering: "pixelated",
						userSelect: "none",
					}}
				/>
			</div>
		</div>
	);
}
