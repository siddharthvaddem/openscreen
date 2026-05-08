import { useEffect, useRef } from "react";
import {
	calculateOutputDimensions,
	type ExportProgress,
	type ExportQuality,
	GIF_SIZE_PRESETS,
	GifExporter,
	type GifFrameRate,
	type GifSizePreset,
	VideoExporter,
} from "@/lib/exporter";
import type { ProjectMedia } from "@/lib/recordingSession";
import { getAspectRatioValue, getNativeAspectRatioValue } from "@/utils/aspectRatioUtils";
import {
	normalizeProjectEditor,
	type ProjectEditorState,
	resolveProjectMedia,
	toFileUrl,
} from "../video-editor/projectPersistence";

type CliRenderConfig = Awaited<ReturnType<typeof window.electronAPI.getCliRenderConfig>>;

function sendToMain(type: string, data: unknown) {
	window.electronAPI?.cliRenderMessage?.({ type, data });
}

async function loadVideoMetadata(videoUrl: string): Promise<{ width: number; height: number }> {
	const video = document.createElement("video");
	video.src = videoUrl;
	video.preload = "metadata";

	try {
		await new Promise<void>((resolve, reject) => {
			let timer: ReturnType<typeof setTimeout> | undefined;
			video.onloadedmetadata = () => {
				clearTimeout(timer);
				resolve();
			};
			video.onerror = () => {
				clearTimeout(timer);
				reject(new Error("Failed to load video metadata"));
			};
			timer = setTimeout(() => reject(new Error("Video metadata load timeout")), 30_000);
		});

		return {
			width: video.videoWidth || 1920,
			height: video.videoHeight || 1080,
		};
	} finally {
		video.src = "";
		video.load();
	}
}

function even(value: number) {
	return Math.max(2, Math.floor(value / 2) * 2);
}

function calculateMp4Dimensions(
	sourceWidth: number,
	sourceHeight: number,
	aspectRatioValue: number,
	quality: ExportQuality,
) {
	if (quality === "source") {
		let exportWidth = sourceWidth;
		let exportHeight = sourceHeight;

		if (aspectRatioValue === 1) {
			const baseDimension = even(Math.min(sourceWidth, sourceHeight));
			exportWidth = baseDimension;
			exportHeight = baseDimension;
		} else if (aspectRatioValue > 1) {
			const baseWidth = even(sourceWidth);
			let found = false;
			for (let width = baseWidth; width >= 100 && !found; width -= 2) {
				const height = Math.round(width / aspectRatioValue);
				if (height % 2 === 0 && Math.abs(width / height - aspectRatioValue) < 0.0001) {
					exportWidth = width;
					exportHeight = height;
					found = true;
				}
			}
			if (!found) {
				exportWidth = baseWidth;
				exportHeight = even(baseWidth / aspectRatioValue);
			}
		} else {
			const baseHeight = even(sourceHeight);
			let found = false;
			for (let height = baseHeight; height >= 100 && !found; height -= 2) {
				const width = Math.round(height * aspectRatioValue);
				if (width % 2 === 0 && Math.abs(width / height - aspectRatioValue) < 0.0001) {
					exportWidth = width;
					exportHeight = height;
					found = true;
				}
			}
			if (!found) {
				exportHeight = baseHeight;
				exportWidth = even(baseHeight * aspectRatioValue);
			}
		}

		const pixels = exportWidth * exportHeight;
		const bitrate =
			pixels > 2560 * 1440 ? 80_000_000 : pixels > 1920 * 1080 ? 50_000_000 : 30_000_000;
		return { width: exportWidth, height: exportHeight, bitrate };
	}

	const targetHeight = quality === "medium" ? 720 : 1080;
	const height = even(targetHeight);
	const width = even(height * aspectRatioValue);
	const pixels = width * height;
	const bitrate =
		pixels <= 1280 * 720 ? 10_000_000 : pixels <= 1920 * 1080 ? 20_000_000 : 30_000_000;

	return { width, height, bitrate };
}

function buildBaseConfig(
	editor: ProjectEditorState,
	shared: {
		videoUrl: string;
		webcamVideoUrl?: string;
		previewWidth: number;
		previewHeight: number;
		cursorTelemetry: import("../video-editor/types").CursorTelemetryPoint[];
		cursorClickTimestamps: number[];
		onProgress: (progress: ExportProgress) => void;
	},
) {
	return {
		videoUrl: shared.videoUrl,
		webcamVideoUrl: shared.webcamVideoUrl,
		wallpaper: editor.wallpaper,
		zoomRegions: editor.zoomRegions,
		trimRegions: editor.trimRegions,
		speedRegions: editor.speedRegions,
		showShadow: editor.shadowIntensity > 0,
		shadowIntensity: editor.shadowIntensity,
		showBlur: editor.showBlur,
		motionBlurAmount: editor.motionBlurAmount,
		borderRadius: editor.borderRadius,
		padding: editor.padding,
		videoPadding: editor.padding,
		cropRegion: editor.cropRegion,
		annotationRegions: editor.annotationRegions,
		webcamLayoutPreset: editor.webcamLayoutPreset,
		webcamMaskShape: editor.webcamMaskShape,
		webcamSizePreset: editor.webcamSizePreset,
		webcamPosition: editor.webcamPosition,
		previewWidth: shared.previewWidth,
		previewHeight: shared.previewHeight,
		cursorTelemetry: shared.cursorTelemetry,
		cursorClickTimestamps: shared.cursorClickTimestamps,
		cursorHighlight: editor.cursorHighlight,
		onProgress: shared.onProgress,
	};
}

async function saveExport(
	result: { success: boolean; blob?: Blob; error?: string; warnings?: string[] },
	output: string,
	format: "mp4" | "gif",
) {
	if (!result.success || !result.blob) {
		throw new Error(result.error || `${format.toUpperCase()} export failed`);
	}

	for (const warning of result.warnings ?? []) {
		sendToMain("warning", { message: warning });
	}

	const arrayBuffer = await result.blob.arrayBuffer();
	const saveResult = await window.electronAPI.saveExportedVideo(arrayBuffer, output);
	if (!saveResult.success) {
		throw new Error(saveResult.message || "Failed to save exported video");
	}

	sendToMain("done", {
		path: saveResult.path || output,
		format,
		size: arrayBuffer.byteLength,
	});
}

async function runRender(config: CliRenderConfig) {
	const media: ProjectMedia | null = resolveProjectMedia(config.project);
	if (!media) {
		throw new Error("Project does not reference a screen video.");
	}

	const editor = normalizeProjectEditor(config.project.editor as Partial<ProjectEditorState>);
	const videoUrl = toFileUrl(media.screenVideoPath);
	const webcamVideoUrl = media.webcamVideoPath ? toFileUrl(media.webcamVideoPath) : undefined;

	sendToMain("status", { message: "Loading video..." });
	const { width: sourceWidth, height: sourceHeight } = await loadVideoMetadata(videoUrl);
	const aspectRatioValue =
		editor.aspectRatio === "native"
			? getNativeAspectRatioValue(sourceWidth, sourceHeight, editor.cropRegion)
			: getAspectRatioValue(editor.aspectRatio);

	const previewWidth = 1920;
	const previewHeight = Math.round(1920 / aspectRatioValue);
	const telemetry = await window.electronAPI.getCursorTelemetry(media.screenVideoPath);
	const cursorTelemetry = telemetry.success ? telemetry.samples : [];
	const cursorClickTimestamps = telemetry.success ? telemetry.clicks : [];
	const onProgress = (progress: ExportProgress) => sendToMain("progress", progress);
	const base = buildBaseConfig(editor, {
		videoUrl,
		webcamVideoUrl,
		previewWidth,
		previewHeight,
		cursorTelemetry,
		cursorClickTimestamps,
		onProgress,
	});

	sendToMain("status", { message: `Rendering ${config.format.toUpperCase()}...` });
	if (config.format === "gif") {
		const frameRate = (config.gifFrameRate ?? editor.gifFrameRate) as GifFrameRate;
		const sizePreset = (config.gifSizePreset ?? editor.gifSizePreset) as GifSizePreset;
		const loop = config.gifLoop ?? editor.gifLoop;
		const dimensions = calculateOutputDimensions(
			sourceWidth,
			sourceHeight,
			sizePreset,
			GIF_SIZE_PRESETS,
			aspectRatioValue,
		);
		const exporter = new GifExporter({
			...base,
			width: dimensions.width,
			height: dimensions.height,
			frameRate,
			loop,
			sizePreset,
		});
		await saveExport(await exporter.export(), config.output, "gif");
		return;
	}

	const quality = config.quality ?? editor.exportQuality;
	const dimensions = calculateMp4Dimensions(sourceWidth, sourceHeight, aspectRatioValue, quality);
	const exporter = new VideoExporter({
		...base,
		width: dimensions.width,
		height: dimensions.height,
		frameRate: 60,
		bitrate: dimensions.bitrate,
		codec: "avc1.640033",
	});
	await saveExport(await exporter.export(), config.output, "mp4");
}

export function CliRenderRenderer() {
	const started = useRef(false);

	useEffect(() => {
		if (started.current) return;
		started.current = true;

		window.electronAPI
			.getCliRenderConfig()
			.then((config) => runRender(config))
			.catch((error) => {
				sendToMain("error", {
					message: error instanceof Error ? error.message : String(error),
				});
			});
	}, []);

	return <div style={{ display: "none" }} />;
}
