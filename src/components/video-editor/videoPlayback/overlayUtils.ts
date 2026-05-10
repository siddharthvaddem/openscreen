import { getZoomScale, type ZoomFocus, type ZoomRegion } from "../types";
import { clampFocusToScale } from "./focusUtils";

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
	const focus = clampFocusToScale(focusOverride ?? region.focus, zoomScale);

	// Zoom window shows the stage area that will be visible after zooming (1/zoomScale of stage dimensions)
	const indicatorWidth = stageWidth / zoomScale;
	const indicatorHeight = stageHeight / zoomScale;

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
