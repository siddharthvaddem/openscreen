import { useEffect, useRef } from "react";
import { calculateOutputDimensions, GifExporter } from "@/lib/exporter/gifExporter";
import { VideoExporter } from "@/lib/exporter/videoExporter";
import { getAspectRatioValue, getNativeAspectRatioValue } from "@/shared/aspect-ratios";
import type { ExportFormat, ExportProgress, ExportQuality } from "@/shared/export-types";
import { calculateMp4Dimensions, GIF_SIZE_PRESETS } from "@/shared/export-types";
import {
	normalizeProjectEditor,
	type ProjectEditorState,
	toFileUrl,
} from "@/shared/project-schema";
import type { ProjectMedia } from "@/shared/recording-session";
import type { CursorTelemetryPoint } from "@/shared/types";

interface CliExportConfig {
	project: {
		media: ProjectMedia;
		editor: ProjectEditorState;
	};
	output: string;
	format: ExportFormat;
	quality?: ExportQuality;
	gifFrameRate?: number;
	gifSizePreset?: string;
	gifLoop?: boolean;
}

function sendToMain(type: string, data: unknown) {
	try {
		(
			window as {
				electronAPI?: { cliExportMessage?: (msg: { type: string; data: unknown }) => void };
			}
		).electronAPI?.cliExportMessage?.({ type, data });
	} catch {
		console.log(JSON.stringify({ __cli: true, type, data }));
	}
}

export function CliExportRenderer() {
	const started = useRef(false);

	useEffect(() => {
		if (started.current) return;
		started.current = true;

		const params = new URLSearchParams(window.location.search);
		const configPath = params.get("configPath");
		if (configPath) {
			loadAndRunExport(configPath).catch((err) => {
				sendToMain("error", { message: String(err) });
			});
		}
	}, []);

	return <div style={{ display: "none" }} />;
}

async function loadAndRunExport(configPath: string) {
	const result = await window.electronAPI.readBinaryFile(configPath);
	if (!result.success || !result.data) {
		sendToMain("error", { message: "Failed to read CLI export config" });
		return;
	}

	const text = new TextDecoder().decode(result.data);
	const config: CliExportConfig = JSON.parse(text);
	await runExport(config);
}

async function loadVideoMetadata(videoUrl: string): Promise<{ width: number; height: number }> {
	const videoEl = document.createElement("video");
	videoEl.src = videoUrl;
	videoEl.preload = "metadata";

	try {
		await new Promise<void>((resolve, reject) => {
			let timer: ReturnType<typeof setTimeout> | undefined;
			videoEl.onloadedmetadata = () => {
				clearTimeout(timer);
				resolve();
			};
			videoEl.onerror = () => {
				clearTimeout(timer);
				reject(new Error("Failed to load video metadata"));
			};
			timer = setTimeout(() => reject(new Error("Video metadata load timeout")), 30000);
		});
		return {
			width: videoEl.videoWidth || 1920,
			height: videoEl.videoHeight || 1080,
		};
	} finally {
		videoEl.src = "";
		videoEl.load();
	}
}

function buildBaseExportConfig(
	editor: ProjectEditorState,
	shared: {
		videoUrl: string;
		webcamVideoUrl?: string;
		previewWidth: number;
		previewHeight: number;
		cursorTelemetry: CursorTelemetryPoint[];
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
		cropRegion: editor.cropRegion,
		annotationRegions: editor.annotationRegions,
		webcamLayoutPreset: editor.webcamLayoutPreset,
		webcamMaskShape: editor.webcamMaskShape,
		webcamPosition: editor.webcamPosition,
		previewWidth: shared.previewWidth,
		previewHeight: shared.previewHeight,
		cursorTelemetry: shared.cursorTelemetry,
		onProgress: shared.onProgress,
	};
}

async function runExport(config: CliExportConfig) {
	const { project, format, quality, gifFrameRate, gifSizePreset, gifLoop } = config;
	// Skip re-normalization if data was already normalized by loadProject in the CLI
	const editor = normalizeProjectEditor(project.editor);
	const media = project.media;

	sendToMain("status", { phase: "loading", message: "Loading video..." });

	const videoUrl = toFileUrl(media.screenVideoPath);
	const webcamVideoUrl = media.webcamVideoPath ? toFileUrl(media.webcamVideoPath) : undefined;

	let cursorTelemetry: CursorTelemetryPoint[] = [];
	try {
		const telemetryResult = await window.electronAPI.getCursorTelemetry(media.screenVideoPath);
		if (telemetryResult.success && telemetryResult.samples) {
			cursorTelemetry = telemetryResult.samples;
		}
	} catch {
		// Cursor telemetry is optional
	}

	const { width: sourceWidth, height: sourceHeight } = await loadVideoMetadata(videoUrl);

	const aspectRatioValue =
		editor.aspectRatio === "native"
			? getNativeAspectRatioValue(sourceWidth, sourceHeight, editor.cropRegion)
			: getAspectRatioValue(editor.aspectRatio);

	const previewWidth = 1920;
	const previewHeight = Math.round(1920 / aspectRatioValue);

	sendToMain("status", { phase: "exporting", message: "Starting export..." });

	const onProgress = (progress: ExportProgress) => sendToMain("progress", progress);
	const base = buildBaseExportConfig(editor, {
		videoUrl,
		webcamVideoUrl,
		previewWidth,
		previewHeight,
		cursorTelemetry,
		onProgress,
	});

	if (format === "gif") {
		const frameRate = gifFrameRate ?? editor.gifFrameRate ?? 15;
		const sizePreset = (gifSizePreset ?? editor.gifSizePreset ?? "medium") as
			| "medium"
			| "large"
			| "original";
		const loop = gifLoop ?? editor.gifLoop ?? true;

		const { width, height } = calculateOutputDimensions(
			sourceWidth,
			sourceHeight,
			sizePreset,
			GIF_SIZE_PRESETS,
			aspectRatioValue,
		);

		const gifExporter = new GifExporter({
			...base,
			width,
			height,
			frameRate: frameRate as 15 | 20 | 25 | 30,
			loop,
			sizePreset,
			videoPadding: editor.padding,
		});

		const result = await gifExporter.export();
		await handleExportResult(result, config.output, "gif");
	} else {
		const effectiveQuality = quality ?? editor.exportQuality ?? "good";
		const { exportWidth, exportHeight, bitrate } = calculateMp4Dimensions(
			sourceWidth,
			sourceHeight,
			aspectRatioValue,
			effectiveQuality,
		);

		const exporter = new VideoExporter({
			...base,
			width: exportWidth,
			height: exportHeight,
			frameRate: 60,
			bitrate,
			codec: "avc1.640033",
		});

		const result = await exporter.export();
		await handleExportResult(result, config.output, "mp4");
	}
}

async function handleExportResult(
	result: { success: boolean; blob?: Blob; error?: string },
	outputPath: string,
	format: string,
) {
	if (!result.success || !result.blob) {
		sendToMain("error", { message: result.error || `${format.toUpperCase()} export failed` });
		return;
	}

	const arrayBuffer = await result.blob.arrayBuffer();
	const saveResult = await window.electronAPI.saveExportedVideo(arrayBuffer, outputPath);

	if (saveResult.success) {
		sendToMain("done", {
			path: saveResult.path || outputPath,
			format,
			size: arrayBuffer.byteLength,
		});
	} else {
		sendToMain("error", { message: saveResult.message || "Failed to write output file" });
	}
}
