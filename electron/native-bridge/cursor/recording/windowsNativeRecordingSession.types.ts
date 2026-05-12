import type { Rectangle } from "electron";
import type { NativeCursorType } from "../../../../src/native/contracts";

export interface WindowsCursorSampleEvent {
	type: "sample";
	timestampMs: number;
	x: number;
	y: number;
	visible: boolean;
	/**
	 * True when GetCursorInfo reports the OS cursor as hidden (an app called
	 * ShowCursor(false)).  Independent of SetSystemCursor(transparent) we do
	 * for capture, so it specifically signals an app's intent to hide the
	 * cursor.  Helper / editor / exporter skip rendering when this is true.
	 */
	osCursorHidden?: boolean;
	handle: string | null;
	cursorType?: NativeCursorType | null;
	leftButtonDown?: boolean;
	leftButtonPressed?: boolean;
	leftButtonReleased?: boolean;
	bounds?: {
		x: number;
		y: number;
		width: number;
		height: number;
	} | null;
	asset: WindowsCursorAssetPayload | null;
}

export interface WindowsCursorReadyEvent {
	type: "ready";
	timestampMs: number;
}

export interface WindowsCursorErrorEvent {
	type: "error";
	timestampMs: number;
	message: string;
}

export interface WindowsCursorAssetPayload {
	id: string;
	imageDataUrl: string;
	width: number;
	height: number;
	hotspotX: number;
	hotspotY: number;
	cursorType?: NativeCursorType | null;
}

export type WindowsCursorEvent =
	| WindowsCursorSampleEvent
	| WindowsCursorReadyEvent
	| WindowsCursorErrorEvent;

export interface CursorOverlayAsset {
	imageDataUrl: string;
	hotspotX: number;
	hotspotY: number;
	width: number;
	height: number;
}

export interface WindowsNativeRecordingSessionOptions {
	getDisplayBounds: () => Rectangle | null;
	maxSamples: number;
	sampleIntervalMs: number;
	sourceId?: string | null;
	startTimeMs?: number;
	/**
	 * Called whenever the active cursor shape changes during recording, OR
	 * when the OS cursor is hidden/un-hidden by an app (Figma etc.).
	 *
	 * `asset` carries the actual captured cursor bitmap + hotspot so the
	 * overlay window can render the real OS cursor image instead of an SVG
	 * approximation.  May be null if the bitmap hasn't been captured yet.
	 *
	 * `osCursorHidden` mirrors GetCursorInfo's CURSOR_SHOWING flag: when
	 * true, an app has hidden the OS cursor and the helper should not draw
	 * a virtual cursor on top (avoids the double-cursor issue in Figma /
	 * Photoshop / games that draw their own cursors).
	 */
	onCursorTypeChange?: (
		cursorType: NativeCursorType | null,
		asset: CursorOverlayAsset | null,
		osCursorHidden: boolean,
	) => void;
}
