export interface RenderRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface StyledRenderRect extends RenderRect {
	borderRadius: number;
	maskShape?: import("@/components/video-editor/types").WebcamMaskShape;
}

export interface Size {
	width: number;
	height: number;
}

export type WebcamLayoutPreset =
	| "picture-in-picture"
	| "vertical-stack"
	| "dual-frame"
	| "no-webcam";
/** Webcam size as a percentage of the canvas reference dimension (10–50). */
export type WebcamSizePreset = number;

export interface WebcamLayoutShadow {
	color: string;
	blur: number;
	offsetX: number;
	offsetY: number;
}

interface BorderRadiusRule {
	max: number;
	min: number;
	fraction: number;
}

interface OverlayTransform {
	type: "overlay";
	marginFraction: number;
	minMargin: number;
	minSize: number;
}

interface StackTransform {
	type: "stack";
	gap: number;
}

interface SplitTransform {
	type: "split";
	gapFraction: number;
	minGap: number;
	screenUnits: number;
	webcamUnits: number;
}

export interface WebcamLayoutPresetDefinition {
	label: string;
	transform: OverlayTransform | StackTransform | SplitTransform;
	borderRadius: BorderRadiusRule;
	shadow: WebcamLayoutShadow | null;
}

export interface WebcamCompositeLayout {
	screenRect: RenderRect;
	webcamRect: StyledRenderRect | null;
	screenBorderRadius?: number;
	/** When true, the video should be scaled to cover screenRect (cropping overflow). */
	screenCover?: boolean;
}

/** Convert a webcam size percentage (10–50) to a fraction of the reference dimension. */
function webcamSizeToFraction(percent: number): number {
	const safe = Number.isFinite(percent) ? percent : 25;
	const clamped = Math.max(10, Math.min(50, safe));
	return clamped / 100;
}

const MARGIN_FRACTION = 0.02;
const MAX_BORDER_RADIUS = 24;
const WEBCAM_LAYOUT_PRESET_MAP: Record<WebcamLayoutPreset, WebcamLayoutPresetDefinition> = {
	"picture-in-picture": {
		label: "Picture in Picture",
		transform: {
			type: "overlay",
			marginFraction: MARGIN_FRACTION,
			minMargin: 0,
			minSize: 0,
		},
		borderRadius: {
			max: MAX_BORDER_RADIUS,
			min: 12,
			fraction: 0.12,
		},
		shadow: {
			color: "rgba(0,0,0,0.35)",
			blur: 24,
			offsetX: 0,
			offsetY: 10,
		},
	},
	"vertical-stack": {
		label: "Vertical Stack",
		transform: {
			type: "stack",
			gap: 0,
		},
		borderRadius: {
			max: 0,
			min: 0,
			fraction: 0,
		},
		shadow: null,
	},
	"dual-frame": {
		label: "Dual Frame",
		transform: {
			type: "split",
			gapFraction: 0.02,
			minGap: 12,
			screenUnits: 2,
			webcamUnits: 1,
		},
		borderRadius: {
			max: MAX_BORDER_RADIUS,
			min: 12,
			fraction: 0.06,
		},
		shadow: null,
	},
	"no-webcam": {
		label: "No Webcam",
		transform: {
			type: "overlay",
			marginFraction: 0,
			minMargin: 0,
			minSize: 0,
		},
		borderRadius: {
			max: 0,
			min: 0,
			fraction: 0,
		},
		shadow: null,
	},
};

export const WEBCAM_LAYOUT_PRESETS = Object.entries(WEBCAM_LAYOUT_PRESET_MAP).map(
	([value, preset]) => ({
		value: value as WebcamLayoutPreset,
		label: preset.label,
	}),
);

export function getWebcamLayoutPresetDefinition(
	preset: WebcamLayoutPreset = "picture-in-picture",
): WebcamLayoutPresetDefinition {
	return WEBCAM_LAYOUT_PRESET_MAP[preset];
}

export function getWebcamLayoutCssBoxShadow(
	preset: WebcamLayoutPreset = "picture-in-picture",
): string {
	const shadow = getWebcamLayoutPresetDefinition(preset).shadow;
	return shadow
		? `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${shadow.color}`
		: "none";
}

export function computeCompositeLayout(params: {
	canvasSize: Size;
	maxContentSize?: Size;
	screenSize: Size;
	webcamSize?: Size | null;
	layoutPreset?: WebcamLayoutPreset;
	webcamSizePreset?: WebcamSizePreset;
	webcamPosition?: { cx: number; cy: number } | null;
	webcamMaskShape?: import("@/components/video-editor/types").WebcamMaskShape;
}): WebcamCompositeLayout | null {
	const {
		canvasSize,
		maxContentSize = canvasSize,
		screenSize,
		webcamSize,
		layoutPreset = "picture-in-picture",
		webcamSizePreset = 25,
		webcamPosition,
		webcamMaskShape = "rectangle",
	} = params;
	const { width: canvasWidth, height: canvasHeight } = canvasSize;
	const { width: screenWidth, height: screenHeight } = screenSize;

	// "no-webcam" preset: hide the webcam entirely, screen fills the canvas normally
	if (layoutPreset === "no-webcam") {
		const screenRect = centerRect({
			canvasSize,
			size: screenSize,
			maxSize: maxContentSize,
		});
		return { screenRect, webcamRect: null };
	}

	const webcamWidth = webcamSize?.width;
	const webcamHeight = webcamSize?.height;
	const preset = getWebcamLayoutPresetDefinition(layoutPreset);

	const MAX_STAGE_FRACTION = webcamSizeToFraction(webcamSizePreset);

	if (canvasWidth <= 0 || canvasHeight <= 0 || screenWidth <= 0 || screenHeight <= 0) {
		return null;
	}

	if (preset.transform.type === "stack") {
		if (!webcamWidth || !webcamHeight || webcamWidth <= 0 || webcamHeight <= 0) {
			// No webcam — screen fills the entire canvas (cover mode)
			return {
				screenRect: { x: 0, y: 0, width: canvasWidth, height: canvasHeight },
				webcamRect: null,
				screenCover: true,
			};
		}

		// Webcam: full width at the bottom, maintaining its aspect ratio
		const webcamAspect = webcamWidth / webcamHeight;
		const resolvedWebcamWidth = canvasWidth;
		const resolvedWebcamHeight = Math.round(canvasWidth / webcamAspect);

		// Screen: fills remaining space at the top (cover mode — may crop sides)
		const screenRectHeight = canvasHeight - resolvedWebcamHeight;

		return {
			screenRect: {
				x: 0,
				y: 0,
				width: canvasWidth,
				height: Math.max(0, screenRectHeight),
			},
			webcamRect: {
				x: 0,
				y: Math.max(0, screenRectHeight),
				width: resolvedWebcamWidth,
				height: resolvedWebcamHeight,
				borderRadius: 0,
			},
			screenCover: true,
		};
	}

	if (preset.transform.type === "split") {
		const screenRect = centerRect({
			canvasSize,
			size: screenSize,
			maxSize: maxContentSize,
		});

		if (!webcamWidth || !webcamHeight || webcamWidth <= 0 || webcamHeight <= 0) {
			return { screenRect, webcamRect: null };
		}

		const contentWidth = Math.min(canvasWidth, Math.max(1, Math.round(maxContentSize.width)));
		const contentHeight = Math.min(canvasHeight, Math.max(1, Math.round(maxContentSize.height)));
		const contentX = Math.max(0, Math.floor((canvasWidth - contentWidth) / 2));
		const contentY = Math.max(0, Math.floor((canvasHeight - contentHeight) / 2));
		const gap = Math.max(
			preset.transform.minGap,
			Math.round(contentWidth * preset.transform.gapFraction),
		);
		const totalUnits = preset.transform.screenUnits + preset.transform.webcamUnits;
		const availableWidth = Math.max(1, contentWidth - gap);
		const screenSlotWidth = Math.max(
			1,
			Math.round((availableWidth * preset.transform.screenUnits) / totalUnits),
		);
		const webcamSlotWidth = Math.max(1, availableWidth - screenSlotWidth);

		const screenSlot = {
			x: contentX,
			y: contentY,
			width: screenSlotWidth,
			height: contentHeight,
		};
		const webcamSlot = {
			x: contentX + screenSlotWidth + gap,
			y: contentY,
			width: webcamSlotWidth,
			height: contentHeight,
		};

		const webcamBorderRadius = Math.min(
			preset.borderRadius.max,
			Math.max(
				preset.borderRadius.min,
				Math.round(Math.min(webcamSlot.width, webcamSlot.height) * preset.borderRadius.fraction),
			),
		);

		return {
			screenRect: screenSlot,
			screenBorderRadius: webcamBorderRadius,
			webcamRect: {
				x: webcamSlot.x,
				y: webcamSlot.y,
				width: webcamSlot.width,
				height: webcamSlot.height,
				borderRadius: webcamBorderRadius,
				maskShape: "rectangle",
			},
			screenCover: true,
		};
	}

	const transform = preset.transform;
	const screenRect = centerRect({
		canvasSize,
		size: screenSize,
		maxSize: maxContentSize,
	});

	if (!webcamWidth || !webcamHeight || webcamWidth <= 0 || webcamHeight <= 0) {
		return { screenRect, webcamRect: null };
	}

	const margin = Math.max(
		transform.minMargin,
		Math.round(Math.min(canvasWidth, canvasHeight) * transform.marginFraction),
	);
	// Use geometric mean so the webcam occupies a consistent visual proportion
	// regardless of whether the canvas is portrait or landscape.
	const referenceDim = Math.sqrt(canvasWidth * canvasHeight);
	const maxWidth = Math.max(transform.minSize, referenceDim * MAX_STAGE_FRACTION);
	const maxHeight = Math.max(transform.minSize, referenceDim * MAX_STAGE_FRACTION);
	const scale = Math.min(maxWidth / webcamWidth, maxHeight / webcamHeight);
	let width = Math.round(webcamWidth * scale);
	let height = Math.round(webcamHeight * scale);

	// Shape-specific dimension adjustments
	if (webcamMaskShape === "circle" || webcamMaskShape === "square") {
		const side = Math.min(width, height);
		width = side;
		height = side;
	}

	let webcamX: number;
	let webcamY: number;

	if (webcamPosition) {
		// Custom position: cx/cy represent the center of the webcam as a fraction of the canvas
		webcamX = Math.round(webcamPosition.cx * canvasWidth - width / 2);
		webcamY = Math.round(webcamPosition.cy * canvasHeight - height / 2);
		// Clamp to stay within canvas bounds
		webcamX = Math.max(0, Math.min(canvasWidth - width, webcamX));
		webcamY = Math.max(0, Math.min(canvasHeight - height, webcamY));
	} else {
		// Default: bottom-right with margin
		webcamX = Math.max(0, Math.round(canvasWidth - margin - width));
		webcamY = Math.max(0, Math.round(canvasHeight - margin - height));
	}

	// Shape-specific border radius
	let borderRadius: number;
	if (webcamMaskShape === "rounded") {
		borderRadius = Math.round(Math.min(width, height) * 0.3);
	} else if (webcamMaskShape === "circle") {
		borderRadius = Math.round(Math.min(width, height) / 2);
	} else {
		borderRadius = Math.min(
			preset.borderRadius.max,
			Math.max(
				preset.borderRadius.min,
				Math.round(Math.min(width, height) * preset.borderRadius.fraction),
			),
		);
	}

	return {
		screenRect,
		webcamRect: {
			x: webcamX,
			y: webcamY,
			width,
			height,
			borderRadius,
			maskShape: webcamMaskShape,
		},
	};
}

function centerRect(params: { canvasSize: Size; size: Size; maxSize: Size }): RenderRect {
	const { canvasSize, size, maxSize } = params;
	return centerRectInBounds({
		bounds: { x: 0, y: 0, width: canvasSize.width, height: canvasSize.height },
		size,
		maxSize,
	});
}

function centerRectInBounds(params: { bounds: RenderRect; size: Size; maxSize: Size }): RenderRect {
	const { bounds, size, maxSize } = params;
	const { x: boundsX, y: boundsY, width: boundsWidth, height: boundsHeight } = bounds;
	const { width, height } = size;
	const { width: maxWidth, height: maxHeight } = maxSize;
	const scale = Math.min(maxWidth / width, maxHeight / height, 1);
	const resolvedWidth = Math.round(width * scale);
	const resolvedHeight = Math.round(height * scale);

	return {
		x: boundsX + Math.max(0, Math.floor((boundsWidth - resolvedWidth) / 2)),
		y: boundsY + Math.max(0, Math.floor((boundsHeight - resolvedHeight) / 2)),
		width: resolvedWidth,
		height: resolvedHeight,
	};
}
