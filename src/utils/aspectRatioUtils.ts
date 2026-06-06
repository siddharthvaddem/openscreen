export const ASPECT_RATIOS = [
	"16:9",
	"9:16",
	"1:1",
	"4:3",
	"4:5",
	"16:10",
	"10:16",
	"native",
] as const;

export type AspectRatio = (typeof ASPECT_RATIOS)[number];

const NATIVE_ASPECT_RATIO_FALLBACK = 16 / 9;

/**
 * Numeric value of an aspect ratio. "native" returns the 16/9 fallback;
 * callers with source/crop context should use getNativeAspectRatioValue().
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
		case "native":
			return NATIVE_ASPECT_RATIO_FALLBACK;
		default: {
			const _exhaustiveCheck: never = aspectRatio;
			return _exhaustiveCheck;
		}
	}
}

export function getNativeAspectRatioValue(
	videoWidth: number,
	videoHeight: number,
	cropRegion?: { x: number; y: number; width: number; height: number },
): number {
	const cropW = cropRegion?.width ?? 1;
	const cropH = cropRegion?.height ?? 1;
	if (
		!Number.isFinite(videoWidth) ||
		!Number.isFinite(videoHeight) ||
		!Number.isFinite(cropW) ||
		!Number.isFinite(cropH) ||
		videoWidth <= 0 ||
		videoHeight <= 0 ||
		cropW <= 0 ||
		cropH <= 0
	) {
		return NATIVE_ASPECT_RATIO_FALLBACK;
	}

	const ratio = (videoWidth * cropW) / (videoHeight * cropH);
	return Number.isFinite(ratio) && ratio > 0 ? ratio : NATIVE_ASPECT_RATIO_FALLBACK;
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
	if (aspectRatio === "native") return "Original";
	return aspectRatio;
}

export function isPortraitAspectRatio(aspectRatio: AspectRatio): boolean {
	return getAspectRatioValue(aspectRatio) < 1;
}

export function formatAspectRatioForCSS(aspectRatio: AspectRatio, nativeRatio?: number): string {
	if (aspectRatio === "native") return String(nativeRatio ?? NATIVE_ASPECT_RATIO_FALLBACK);
	return aspectRatio.replace(":", "/");
}
