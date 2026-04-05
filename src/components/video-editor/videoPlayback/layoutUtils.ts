import { Application, Graphics, Sprite } from "pixi.js";
import {
	computeCompositeLayout,
	type RenderRect,
	type Size,
	type StyledRenderRect,
	type WebcamLayoutPreset,
} from "@/lib/compositeLayout";
import type { CropRegion, WebcamMaskShape } from "../types";

interface LayoutParams {
	container: HTMLDivElement;
	app: Application;
	videoSprite: Sprite;
	maskGraphics: Graphics;
	videoElement: HTMLVideoElement;
	cropRegion?: CropRegion;
	lockedVideoDimensions?: { width: number; height: number } | null;
	borderRadius?: number;
	padding?: number;
	webcamDimensions?: Size | null;
	webcamLayoutPreset?: WebcamLayoutPreset;
	webcamPosition?: { cx: number; cy: number } | null;
	webcamMaskShape?: WebcamMaskShape;
}

interface LayoutResult {
	stageSize: { width: number; height: number };
	videoSize: { width: number; height: number };
	baseScale: number;
	baseOffset: { x: number; y: number };
	maskRect: RenderRect;
	webcamRect: StyledRenderRect | null;
	cropBounds: { startX: number; endX: number; startY: number; endY: number };
}

export function layoutVideoContent(params: LayoutParams): LayoutResult | null {
	const {
		container,
		app,
		videoSprite,
		maskGraphics,
		videoElement,
		cropRegion,
		lockedVideoDimensions,
		borderRadius = 0,
		padding = 0,
		webcamDimensions,
		webcamLayoutPreset,
		webcamPosition,
		webcamMaskShape,
	} = params;

	const videoWidth = lockedVideoDimensions?.width || videoElement.videoWidth;
	const videoHeight = lockedVideoDimensions?.height || videoElement.videoHeight;

	if (!videoWidth || !videoHeight) {
		return null;
	}

	const width = container.clientWidth;
	const height = container.clientHeight;

	if (!width || !height) {
		return null;
	}

	app.renderer.resize(width, height);
	app.canvas.style.width = "100%";
	app.canvas.style.height = "100%";

	// Apply crop region
	const crop = cropRegion || { x: 0, y: 0, width: 1, height: 1 };

	// Calculate the cropped dimensions
	const croppedVideoWidth = videoWidth * crop.width;
	const croppedVideoHeight = videoHeight * crop.height;

	const cropStartX = crop.x * videoWidth;
	const cropStartY = crop.y * videoHeight;
	const cropEndX = cropStartX + croppedVideoWidth;
	const cropEndY = cropStartY + croppedVideoHeight;

	// Calculate scale to fit the cropped area in the viewport
	// Padding is a percentage (0-100), where 50 matches the original VIEWPORT_SCALE of 0.8
	// Vertical stack ignores padding — it's full-bleed
	const effectivePadding = webcamLayoutPreset === "vertical-stack" ? 0 : padding;
	const paddingScale = 1.0 - (effectivePadding / 100) * 0.4;
	const maxDisplayWidth = width * paddingScale;
	const maxDisplayHeight = height * paddingScale;

	const compositeLayout = computeCompositeLayout({
		canvasSize: { width, height },
		maxContentSize: { width: maxDisplayWidth, height: maxDisplayHeight },
		screenSize: { width: croppedVideoWidth, height: croppedVideoHeight },
		webcamSize: webcamDimensions,
		layoutPreset: webcamLayoutPreset,
		webcamPosition,
		webcamMaskShape,
	});

	if (!compositeLayout) {
		return null;
	}

	const screenRect = compositeLayout.screenRect;

	// Cover mode: scale to fill the rect (may crop), otherwise fit-to-width
	let scale: number;
	if (compositeLayout.screenCover) {
		scale = Math.max(screenRect.width / croppedVideoWidth, screenRect.height / croppedVideoHeight);
	} else {
		scale = screenRect.width / croppedVideoWidth;
	}

	videoSprite.scale.set(scale);

	// Calculate display size of the full video at this scale
	const fullVideoDisplayWidth = videoWidth * scale;
	const fullVideoDisplayHeight = videoHeight * scale;

	// Position the video so the cropped region is centered within the screenRect
	const croppedDisplayWidth = croppedVideoWidth * scale;
	const croppedDisplayHeight = croppedVideoHeight * scale;
	const offsetX = screenRect.x + (screenRect.width - croppedDisplayWidth) / 2;
	const offsetY = screenRect.y + (screenRect.height - croppedDisplayHeight) / 2;
	const spriteX = offsetX - crop.x * fullVideoDisplayWidth;
	const spriteY = offsetY - crop.y * fullVideoDisplayHeight;

	videoSprite.position.set(spriteX, spriteY);

	// Apply border radius — mask clips the video to the screenRect
	maskGraphics.clear();
	maskGraphics.roundRect(
		screenRect.x,
		screenRect.y,
		screenRect.width,
		screenRect.height,
		compositeLayout.screenCover ? 0 : borderRadius,
	);
	maskGraphics.fill({ color: 0xffffff });

	return {
		stageSize: { width, height },
		videoSize: { width: croppedVideoWidth, height: croppedVideoHeight },
		baseScale: scale,
		baseOffset: { x: spriteX, y: spriteY },
		maskRect: compositeLayout.screenRect,
		webcamRect: compositeLayout.webcamRect,
		cropBounds: { startX: cropStartX, endX: cropEndX, startY: cropStartY, endY: cropEndY },
	};
}
