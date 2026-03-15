export const ASPECT_RATIOS = ["16:9", "9:16", "1:1", "4:3", "4:5", "16:10", "10:16"] as const;

type PresetAspectRatio = (typeof ASPECT_RATIOS)[number];
type CustomAspectRatio = `${number}:${number}`;

export type AspectRatio = PresetAspectRatio | CustomAspectRatio;

const CUSTOM_ASPECT_RATIO_REGEX = /^(\d+):(\d+)$/;

export function isCustomAspectRatio(aspectRatio: string): aspectRatio is CustomAspectRatio {
	if ((ASPECT_RATIOS as readonly string[]).includes(aspectRatio)) {
		return false;
	}
	const match = aspectRatio.match(CUSTOM_ASPECT_RATIO_REGEX);
	if (!match) {
		return false;
	}
	const width = Number(match[1]);
	const height = Number(match[2]);
	return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0;
}

function parseCustomAspectRatioValue(aspectRatio: string): number | null {
	if (!isCustomAspectRatio(aspectRatio)) {
		return null;
	}
	const [widthText, heightText] = aspectRatio.split(":");
	const width = Number(widthText);
	const height = Number(heightText);
	if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
		return null;
	}
	return width / height;
}

/**
 * Returns the numeric value of an aspect ratio.
 * Uses exhaustive type checking to ensure all AspectRatio cases are handled.
 * If TypeScript errors here, a new ratio was added to the type but not handled.
 */
export function getAspectRatioValue(aspectRatio: AspectRatio): number {
	switch (aspectRatio) {
		case "16:9":
			return 16 / 9;
		case "9:16":
			return 9 / 16;
		case "1:1":
			return 1;
		case "4:3":
			return 4 / 3;
		case "4:5":
			return 4 / 5;
		case "16:10":
			return 16 / 10;
		case "10:16":
			return 10 / 16;
		default:
			return parseCustomAspectRatioValue(aspectRatio) ?? 16 / 9;
	}
}

export function getAspectRatioDimensions(
	aspectRatio: AspectRatio,
	baseWidth: number,
): { width: number; height: number } {
	const ratio = getAspectRatioValue(aspectRatio);
	return {
		width: baseWidth,
		height: baseWidth / ratio,
	};
}

export function getAspectRatioLabel(aspectRatio: AspectRatio): string {
	if (isCustomAspectRatio(aspectRatio)) {
		return `Custom ${aspectRatio}`;
	}
	return aspectRatio;
}

export function formatAspectRatioForCSS(aspectRatio: AspectRatio): string {
	return aspectRatio.replace(":", "/");
}
