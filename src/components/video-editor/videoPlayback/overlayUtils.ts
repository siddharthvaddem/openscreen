import { getAspectRatioValue } from "@/utils/aspectRatioUtils";
import { getZoomScale, type ZoomFocus, type ZoomRegion } from "../types";

interface OverlayUpdateParams {
	overlayEl: HTMLDivElement;
	indicatorEl: HTMLDivElement;
	region: ZoomRegion | null;
	focusOverride?: ZoomFocus;
	videoSize: { width: number; height: number };
	baseScale: number;
	isPlaying: boolean;
}

export function updateOverlayIndicator(params: OverlayUpdateParams) {
	const { overlayEl, indicatorEl, region, focusOverride, videoSize, baseScale, isPlaying } = params;

	if (!region || region.focusMode === "auto") {
		indicatorEl.style.display = "none";
		overlayEl.style.pointerEvents = "none";
		return;
	}

	const stageWidth = overlayEl.clientWidth;
	const stageHeight = overlayEl.clientHeight;

	if (!stageWidth || !stageHeight) {
		indicatorEl.style.display = "none";
		overlayEl.style.pointerEvents = "none";
		return;
	}

	if (!videoSize.width || !videoSize.height || baseScale <= 0) {
		indicatorEl.style.display = "none";
		overlayEl.style.pointerEvents = isPlaying ? "none" : "auto";
		return;
	}

	const zoomScale = getZoomScale(region);

	// Compute indicator dimensions, respecting a custom zoom aspect ratio if set.
	const zoomAR = region.zoomAspectRatio
		? getAspectRatioValue(region.zoomAspectRatio)
		: stageWidth / stageHeight;
	const canvasAR = stageWidth / stageHeight;

	let indicatorWidth: number;
	let indicatorHeight: number;

	if (Math.abs(zoomAR - canvasAR) < 0.01) {
		indicatorWidth = stageWidth / zoomScale;
		indicatorHeight = stageHeight / zoomScale;
	} else if (zoomAR < canvasAR) {
		// Portrait indicator inside landscape canvas — constrain by height
		indicatorHeight = stageHeight / zoomScale;
		indicatorWidth = indicatorHeight * zoomAR;
	} else {
		// Wider indicator — constrain by width
		indicatorWidth = stageWidth / zoomScale;
		indicatorHeight = indicatorWidth / zoomAR;
	}

	// Clamp focus center so the indicator box stays within stage bounds.
	const rawFocus = focusOverride ?? region.focus;
	const halfFocusX = indicatorWidth / (2 * stageWidth);
	const halfFocusY = indicatorHeight / (2 * stageHeight);
	const focus = {
		cx: Math.max(halfFocusX, Math.min(1 - halfFocusX, rawFocus.cx)),
		cy: Math.max(halfFocusY, Math.min(1 - halfFocusY, rawFocus.cy)),
	};

	const rawLeft = focus.cx * stageWidth - indicatorWidth / 2;
	const rawTop = focus.cy * stageHeight - indicatorHeight / 2;

	const adjustedLeft =
		indicatorWidth >= stageWidth
			? (stageWidth - indicatorWidth) / 2
			: Math.max(0, Math.min(stageWidth - indicatorWidth, rawLeft));

	const adjustedTop =
		indicatorHeight >= stageHeight
			? (stageHeight - indicatorHeight) / 2
			: Math.max(0, Math.min(stageHeight - indicatorHeight, rawTop));

	indicatorEl.style.display = "block";
	indicatorEl.style.width = `${indicatorWidth}px`;
	indicatorEl.style.height = `${indicatorHeight}px`;
	indicatorEl.style.left = `${adjustedLeft}px`;
	indicatorEl.style.top = `${adjustedTop}px`;
	overlayEl.style.pointerEvents = isPlaying ? "none" : "auto";
}
