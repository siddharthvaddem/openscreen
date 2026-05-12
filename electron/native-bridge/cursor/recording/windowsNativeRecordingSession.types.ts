import type { Rectangle } from "electron";
import type { NativeCursorType } from "../../../../src/native/contracts";

export interface WindowsCursorSampleEvent {
	type: "sample";
	timestampMs: number;
	x: number;
	y: number;
	visible: boolean;
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
	/** Display scale factor (devicePixelRatio) of the screen where the cursor was captured. */
	scaleFactor: number;
}

export interface WindowsNativeRecordingSessionOptions {
	getDisplayBounds: () => Rectangle | null;
	maxSamples: number;
	sampleIntervalMs: number;
	sourceId?: string | null;
	startTimeMs?: number;
	/**
	 * Called whenever the active cursor shape changes during recording.
	 * `asset` carries the actual captured cursor bitmap + hotspot so the
	 * overlay window can render the real OS cursor image instead of an SVG
	 * approximation. May be null if the bitmap hasn't been captured yet.
	 */
	onCursorTypeChange?: (
		cursorType: NativeCursorType | null,
		asset: CursorOverlayAsset | null,
	) => void;
}
