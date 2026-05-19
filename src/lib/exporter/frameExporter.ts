import { FrameRenderer } from "./frameRenderer";
import type { FrameExportConfig } from "./types";
import { FRAME_SIZE_PRESETS, JPEG_QUALITY_MAP } from "./types";

export interface FrameExportResult {
	success: boolean;
	blob?: Blob;
	error?: string;
}

/**
 * The render config passed to exportFrame. Mirrors FrameRenderConfig from
 * frameRenderer.ts (which is not exported) minus width/height (computed from sizePreset).
 */
export type FrameExportRenderConfig = Omit<
	ConstructorParameters<typeof FrameRenderer>[0],
	"width" | "height"
>;

function calculateFrameDimensions(
	sourceWidth: number,
	sourceHeight: number,
	sizePreset: FrameExportConfig["sizePreset"],
): { width: number; height: number } {
	const preset = FRAME_SIZE_PRESETS[sizePreset];
	if (sourceHeight <= preset.maxHeight) {
		return { width: sourceWidth, height: sourceHeight };
	}
	const scale = preset.maxHeight / sourceHeight;
	const width = Math.round(sourceWidth * scale);
	const height = preset.maxHeight;
	return {
		width: width % 2 === 0 ? width : width + 1,
		height: height % 2 === 0 ? height : height + 1,
	};
}

export async function exportFrame(
	videoFrame: VideoFrame,
	config: FrameExportConfig,
	renderConfig: FrameExportRenderConfig,
	webcamFrame?: VideoFrame | null,
): Promise<FrameExportResult> {
	try {
		const { width, height } = calculateFrameDimensions(
			renderConfig.videoWidth,
			renderConfig.videoHeight,
			config.sizePreset,
		);

		const rendererConfig: ConstructorParameters<typeof FrameRenderer>[0] = {
			...renderConfig,
			width,
			height,
			wallpaper: config.removeBackground ? "" : renderConfig.wallpaper,
			annotationRegions: config.includeOverlays ? renderConfig.annotationRegions : undefined,
			cursorTelemetry: config.includeOverlays ? renderConfig.cursorTelemetry : undefined,
			cursorRecordingData: config.includeOverlays ? renderConfig.cursorRecordingData : undefined,
		};

		const renderer = new FrameRenderer(rendererConfig);
		await renderer.initialize();

		const timestampUs = config.timestamp * 1000;
		await renderer.renderFrame(videoFrame, timestampUs, webcamFrame);

		const canvas = renderer.getCanvas();

		const mimeType: string = config.format === "png" ? "image/png" : "image/jpeg";
		const quality = config.format === "jpeg" ? JPEG_QUALITY_MAP[config.jpegQuality] : undefined;

		const blob = await new Promise<Blob | null>((resolve) => {
			canvas.toBlob(resolve, mimeType, quality);
		});

		renderer.destroy();

		if (!blob) {
			return { success: false, error: "Failed to create image blob" };
		}

		return { success: true, blob };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown export error",
		};
	}
}
