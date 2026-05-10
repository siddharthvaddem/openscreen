import {
	type BlurColor,
	type BlurData,
	type BlurType,
	DEFAULT_BLUR_BLOCK_SIZE,
	DEFAULT_BLUR_INTENSITY,
	MAX_BLUR_BLOCK_SIZE,
	MAX_BLUR_INTENSITY,
	MIN_BLUR_BLOCK_SIZE,
	MIN_BLUR_INTENSITY,
} from "@/components/video-editor/types";

function clamp(value: number, min: number, max: number) {
	if (!Number.isFinite(value)) return min;
	return Math.min(max, Math.max(min, value));
}

export function normalizeBlurType(value: unknown): BlurType {
	void value;
	return "mosaic";
}

export function normalizeBlurColor(value: unknown): BlurColor {
	return value === "black" ? "black" : "white";
}

export function getNormalizedBlurIntensity(blurData?: BlurData | null): number {
	return clamp(
		blurData?.intensity ?? DEFAULT_BLUR_INTENSITY,
		MIN_BLUR_INTENSITY,
		MAX_BLUR_INTENSITY,
	);
}

export function getNormalizedMosaicBlockSize(blurData?: BlurData | null, scaleFactor = 1): number {
	const rawBlockSize = clamp(
		blurData?.blockSize ?? DEFAULT_BLUR_BLOCK_SIZE,
		MIN_BLUR_BLOCK_SIZE,
		MAX_BLUR_BLOCK_SIZE,
	);
	return Math.max(1, Math.round(rawBlockSize * Math.max(scaleFactor, 0.01)));
}

export function getBlurOverlayColor(blurData?: BlurData | null): string {
	const blurColor = normalizeBlurColor(blurData?.color);

	return blurColor === "black" ? "rgba(0, 0, 0, 0.72)" : "rgba(255, 255, 255, 0.06)";
}

export function getMosaicGridOverlayColor(blurData?: BlurData | null): string {
	return normalizeBlurColor(blurData?.color) === "black"
		? "rgba(255,255,255,0.05)"
		: "rgba(255,255,255,0.04)";
}

export function applyMosaicToImageData(imageData: ImageData, blockSize: number): ImageData {
	const width = imageData.width;
	const height = imageData.height;
	const data = imageData.data;
	const normalizedBlockSize = Math.max(1, Math.floor(blockSize));

	if (width <= 0 || height <= 0 || normalizedBlockSize <= 1) {
		return imageData;
	}

	for (let blockY = 0; blockY < height; blockY += normalizedBlockSize) {
		for (let blockX = 0; blockX < width; blockX += normalizedBlockSize) {
			const blockWidth = Math.min(normalizedBlockSize, width - blockX);
			const blockHeight = Math.min(normalizedBlockSize, height - blockY);
			const pixelCount = blockWidth * blockHeight;

			if (pixelCount <= 0) {
				continue;
			}

			let redTotal = 0;
			let greenTotal = 0;
			let blueTotal = 0;
			let alphaTotal = 0;

			for (let y = blockY; y < blockY + blockHeight; y++) {
				for (let x = blockX; x < blockX + blockWidth; x++) {
					const offset = (y * width + x) * 4;
					redTotal += data[offset];
					greenTotal += data[offset + 1];
					blueTotal += data[offset + 2];
					alphaTotal += data[offset + 3];
				}
			}

			const averageRed = Math.round(redTotal / pixelCount);
			const averageGreen = Math.round(greenTotal / pixelCount);
			const averageBlue = Math.round(blueTotal / pixelCount);
			const averageAlpha = Math.round(alphaTotal / pixelCount);

			for (let y = blockY; y < blockY + blockHeight; y++) {
				for (let x = blockX; x < blockX + blockWidth; x++) {
					const offset = (y * width + x) * 4;
					data[offset] = averageRed;
					data[offset + 1] = averageGreen;
					data[offset + 2] = averageBlue;
					data[offset + 3] = averageAlpha;
				}
			}
		}
	}

	return imageData;
}
