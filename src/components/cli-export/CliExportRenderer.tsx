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
		if (!configPath) {
			// Without an explicit error here the CLI-side electron-bridge would
			// sit on its 10-minute safetyTimer instead of surfacing the cause
			// of the hang. Emit a terminal error so the parent exits fast.
			sendToMain("error", {
				message: "CliExportRenderer launched without a configPath query parameter",
			});
			return;
		}
		loadAndRunExport(configPath).catch((err) => {
			sendToMain("error", { message: err instanceof Error ? err.message : String(err) });
		});
	}, []);

	return <div style={{ display: "none" }} />;
}

function validateCliExportConfig(value: unknown): CliExportConfig {
	// Manual schema check — intentionally not zod to avoid pulling another
	// dep into the renderer bundle. The CLI writes this file so the shape
	// should always be valid, but a corrupt disk / partial write would
	// otherwise surface as an opaque TypeError deep in runExport.
	if (!value || typeof value !== "object") {
		throw new Error("CLI export config must be a JSON object");
	}
	const c = value as Record<string, unknown>;

	if (!c.project || typeof c.project !== "object") {
		throw new Error("CLI export config: missing 'project'");
	}
	const project = c.project as Record<string, unknown>;
	if (!project.media || typeof project.media !== "object") {
		throw new Error("CLI export config: missing 'project.media'");
	}
	if (!project.editor || typeof project.editor !== "object") {
		throw new Error("CLI export config: missing 'project.editor'");
	}

	if (typeof c.output !== "string" || c.output.length === 0) {
		throw new Error("CLI export config: 'output' must be a non-empty string");
	}
	if (c.format !== "mp4" && c.format !== "gif") {
		throw new Error(`CLI export config: 'format' must be 'mp4' or 'gif', got ${String(c.format)}`);
	}
	if (
		c.quality !== undefined &&
		c.quality !== "medium" &&
		c.quality !== "good" &&
		c.quality !== "source"
	) {
		throw new Error(
			`CLI export config: 'quality' must be medium|good|source, got ${String(c.quality)}`,
		);
	}
	if (c.gifFrameRate !== undefined) {
		if (typeof c.gifFrameRate !== "number" || ![15, 20, 25, 30].includes(c.gifFrameRate)) {
			throw new Error(
				`CLI export config: 'gifFrameRate' must be 15, 20, 25, or 30; got ${String(c.gifFrameRate)}`,
			);
		}
	}
	if (c.gifSizePreset !== undefined) {
		if (
			typeof c.gifSizePreset !== "string" ||
			!["medium", "large", "original"].includes(c.gifSizePreset)
		) {
			throw new Error(
				`CLI export config: 'gifSizePreset' must be medium|large|original; got ${String(c.gifSizePreset)}`,
			);
		}
	}
	if (c.gifLoop !== undefined && typeof c.gifLoop !== "boolean") {
		throw new Error("CLI export config: 'gifLoop' must be a boolean");
	}

	return value as CliExportConfig;
}

async function loadAndRunExport(configPath: string) {
	const result = await window.electronAPI.readBinaryFile(configPath);
	if (!result.success || !result.data) {
		sendToMain("error", {
			message: `Failed to read CLI export config at ${configPath}${
				result.message ? `: ${result.message}` : ""
			}`,
		});
		return;
	}

	const text = new TextDecoder().decode(result.data);
	let config: CliExportConfig;
	try {
		config = validateCliExportConfig(JSON.parse(text));
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		sendToMain("error", { message: `CLI export config at ${configPath}: ${msg}` });
		return;
	}
	await runExport(config);
}

// Probed in order; first supported codec wins. Starts with H.264 High 5.1
// (our existing default), falls back to High 3.1 and Baseline 3.0 so older
// or software-only Chromium builds still have a path.
const H264_CODEC_CANDIDATES = ["avc1.640033", "avc1.64001F", "avc1.42E01E"] as const;

async function pickSupportedH264Codec(config: {
	width: number;
	height: number;
	bitrate: number;
	framerate: number;
}): Promise<string> {
	// WebCodecs may be unavailable in some Electron/Chromium builds (disabled
	// flag, stripped-down runtime). Surface that as a clear error instead of
	// letting a ReferenceError bubble out of the probe loop.
	if (typeof VideoEncoder === "undefined") {
		throw new Error("WebCodecs VideoEncoder API is not available in this Electron runtime");
	}
	for (const codec of H264_CODEC_CANDIDATES) {
		try {
			const probe = await VideoEncoder.isConfigSupported({
				codec,
				width: config.width,
				height: config.height,
				bitrate: config.bitrate,
				framerate: config.framerate,
			});
			if (probe.supported) return codec;
		} catch {
			// Probe can throw on truly broken configs; try the next candidate.
		}
	}
	throw new Error(
		`No supported H.264 codec for ${config.width}x${config.height}@${config.framerate} — tried ${H264_CODEC_CANDIDATES.join(", ")}`,
	);
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

		// Note: `base` already carries `padding: editor.padding`; we used to
		// pass it again as `videoPadding` but GifExporter never read that
		// field, so removing it here drops the dead prop.
		const gifExporter = new GifExporter({
			...base,
			width,
			height,
			frameRate: frameRate as 15 | 20 | 25 | 30,
			loop,
			sizePreset,
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

		const selectedCodec = await pickSupportedH264Codec({
			width: exportWidth,
			height: exportHeight,
			bitrate,
			framerate: 60,
		});

		const exporter = new VideoExporter({
			...base,
			width: exportWidth,
			height: exportHeight,
			frameRate: 60,
			bitrate,
			codec: selectedCodec,
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
