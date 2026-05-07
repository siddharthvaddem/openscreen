import GIF from "gif.js";
import type {
	AnnotationRegion,
	CropRegion,
	SpeedRegion,
	TrimRegion,
	WebcamLayoutPreset,
	WebcamSizePreset,
	ZoomRegion,
} from "@/components/video-editor/types";
import { BackgroundLoadError } from "@/lib/wallpaper";
import { getPlatform } from "@/utils/platformUtils";
import { AsyncVideoFrameQueue } from "./asyncVideoFrameQueue";
import { FrameRenderer } from "./frameRenderer";
import { StreamingVideoDecoder } from "./streamingDecoder";
import type {
	ExportProgress,
	ExportResult,
	GIF_SIZE_PRESETS,
	GifFrameRate,
	GifSizePreset,
} from "./types";

const GIF_WORKER_URL = new URL("gif.js/dist/gif.worker.js", import.meta.url).toString();

interface GifExporterConfig {
	videoUrl: string;
	webcamVideoUrl?: string;
	width: number;
	height: number;
	frameRate: GifFrameRate;
	loop: boolean;
	sizePreset: GifSizePreset;
	wallpaper: string;
	zoomRegions: ZoomRegion[];
	trimRegions?: TrimRegion[];
	speedRegions?: SpeedRegion[];
	showShadow: boolean;
	shadowIntensity: number;
	showBlur: boolean;
	motionBlurAmount?: number;
	borderRadius?: number;
	padding?: number;
	videoPadding?: number;
	cropRegion: CropRegion;
	webcamLayoutPreset?: WebcamLayoutPreset;
	webcamMaskShape?: import("@/components/video-editor/types").WebcamMaskShape;
	webcamSizePreset?: WebcamSizePreset;
	webcamPosition?: { cx: number; cy: number } | null;
	annotationRegions?: AnnotationRegion[];
	previewWidth?: number;
	previewHeight?: number;
	cursorTelemetry?: import("@/components/video-editor/types").CursorTelemetryPoint[];
	cursorHighlight?: import("@/components/video-editor/videoPlayback/cursorHighlight").CursorHighlightConfig;
	cursorClickTimestamps?: number[];
	onProgress?: (progress: ExportProgress) => void;
}

/**
 * Calculate output dimensions based on size preset and source dimensions while preserving aspect ratio.
 * @param sourceWidth - Original video width
 * @param sourceHeight - Original video height
 * @param sizePreset - The size preset to use
 * @param sizePresets - The size presets configuration
 * @returns The calculated output dimensions
 */
export function calculateOutputDimensions(
	sourceWidth: number,
	sourceHeight: number,
	sizePreset: GifSizePreset,
	sizePresets: typeof GIF_SIZE_PRESETS,
	targetAspectRatio = sourceWidth / sourceHeight,
): { width: number; height: number } {
	const preset = sizePresets[sizePreset];
	const maxHeight = preset.maxHeight;
	const aspectRatio =
		Number.isFinite(targetAspectRatio) && targetAspectRatio > 0
			? targetAspectRatio
			: sourceWidth / sourceHeight;

	const toEven = (value: number) => {
		const evenValue = Math.max(2, Math.floor(value / 2) * 2);
		return evenValue;
	};

	if (sizePreset === "original") {
		const sourceAspect = sourceWidth / sourceHeight;
		if (aspectRatio >= sourceAspect) {
			const width = toEven(sourceWidth);
			const height = toEven(width / aspectRatio);
			return { width, height };
		}

		const height = toEven(sourceHeight);
		const width = toEven(height * aspectRatio);
		return { width, height };
	}

	const targetHeight = maxHeight;
	const targetWidth = Math.round(targetHeight * aspectRatio);

	return {
		width: toEven(targetWidth),
		height: toEven(targetHeight),
	};
}

export class GifExporter {
	private config: GifExporterConfig;
	private streamingDecoder: StreamingVideoDecoder | null = null;
	private webcamDecoder: StreamingVideoDecoder | null = null;
	private renderer: FrameRenderer | null = null;
	private gif: GIF | null = null;
	private cancelled = false;

	constructor(config: GifExporterConfig) {
		this.config = config;
	}

	async export(): Promise<ExportResult> {
		let webcamFrameQueue: AsyncVideoFrameQueue | null = null;

		const warnings: string[] = [];
		const onWarning = (message: string) => warnings.push(message);

		try {
			const platform = await getPlatform();

			this.cleanup();
			this.cancelled = false;

			// Initialize streaming decoder and load video metadata
			this.streamingDecoder = new StreamingVideoDecoder();
			const videoInfo = await this.streamingDecoder.loadMetadata(this.config.videoUrl);
			let webcamInfo: Awaited<ReturnType<StreamingVideoDecoder["loadMetadata"]>> | null = null;
			if (this.config.webcamVideoUrl) {
				this.webcamDecoder = new StreamingVideoDecoder();
				webcamInfo = await this.webcamDecoder.loadMetadata(this.config.webcamVideoUrl);
			}

			// Initialize frame renderer
			this.renderer = new FrameRenderer({
				width: this.config.width,
				height: this.config.height,
				wallpaper: this.config.wallpaper,
				zoomRegions: this.config.zoomRegions,
				showShadow: this.config.showShadow,
				shadowIntensity: this.config.shadowIntensity,
				showBlur: this.config.showBlur,
				motionBlurAmount: this.config.motionBlurAmount,
				borderRadius: this.config.borderRadius,
				padding: this.config.padding,
				cropRegion: this.config.cropRegion,
				videoWidth: videoInfo.width,
				videoHeight: videoInfo.height,
				webcamSize: webcamInfo ? { width: webcamInfo.width, height: webcamInfo.height } : null,
				webcamLayoutPreset: this.config.webcamLayoutPreset,
				webcamMaskShape: this.config.webcamMaskShape,
				webcamSizePreset: this.config.webcamSizePreset,
				webcamPosition: this.config.webcamPosition,
				annotationRegions: this.config.annotationRegions,
				speedRegions: this.config.speedRegions,
				previewWidth: this.config.previewWidth,
				previewHeight: this.config.previewHeight,
				cursorTelemetry: this.config.cursorTelemetry,
				cursorClickTimestamps: this.config.cursorClickTimestamps,
				cursorHighlight: this.config.cursorHighlight,
				platform,
			});
			await this.renderer.initialize();

			// Initialize GIF encoder
			// Loop: 0 = infinite loop, 1 = play once (no loop)
			const repeat = this.config.loop ? 0 : 1;
			const cores = navigator.hardwareConcurrency || 4;
			const WORKER_COUNT = Math.max(1, Math.min(8, cores - 1));
			this.gif = new GIF({
				workers: WORKER_COUNT,
				quality: 10,
				width: this.config.width,
				height: this.config.height,
				workerScript: GIF_WORKER_URL,
				repeat,
				background: "#000000",
				transparent: null,
				dither: "FloydSteinberg",
			});

			// Calculate effective duration and frame count (excluding trim regions)
			const { effectiveDuration, totalFrames } = this.streamingDecoder.getExportMetrics(
				this.config.frameRate,
				this.config.trimRegions,
				this.config.speedRegions,
			);

			// Calculate frame delay in milliseconds (gif.js uses ms)
			const frameDelay = Math.round(1000 / this.config.frameRate);

			console.log("[GifExporter] Original duration:", videoInfo.duration, "s");
			console.log("[GifExporter] Effective duration:", effectiveDuration, "s");
			console.log("[GifExporter] Total frames to export:", totalFrames);
			console.log("[GifExporter] Frame rate:", this.config.frameRate, "FPS");
			console.log("[GifExporter] Frame delay:", frameDelay, "ms");
			console.log("[GifExporter] Loop:", this.config.loop ? "infinite" : "once");
			console.log("[GifExporter] Using streaming decode (web-demuxer + VideoDecoder)");

			let frameIndex = 0;
			webcamFrameQueue = this.config.webcamVideoUrl ? new AsyncVideoFrameQueue() : null;
			let stopWebcamDecode = false;
			let webcamDecodeError: Error | null = null;
			const webcamDecodePromise =
				this.webcamDecoder && webcamFrameQueue
					? (() => {
							const queue = webcamFrameQueue;
							return this.webcamDecoder
								.decodeAll(
									this.config.frameRate,
									this.config.trimRegions,
									this.config.speedRegions,
									async (webcamFrame) => {
										while (queue.length >= 12 && !this.cancelled && !stopWebcamDecode) {
											await new Promise((resolve) => setTimeout(resolve, 2));
										}
										if (this.cancelled || stopWebcamDecode) {
											webcamFrame.close();
											return;
										}
										queue.enqueue(webcamFrame);
									},
									onWarning,
								)
								.catch((error) => {
									webcamDecodeError = error instanceof Error ? error : new Error(String(error));
									throw error;
								})
								.finally(() => {
									if (webcamDecodeError) {
										queue.fail(webcamDecodeError);
									} else {
										queue.close();
									}
								});
						})()
					: null;

			// Stream decode and process frames — no seeking!
			await this.streamingDecoder.decodeAll(
				this.config.frameRate,
				this.config.trimRegions,
				this.config.speedRegions,
				async (videoFrame, _exportTimestampUs, sourceTimestampMs) => {
					let webcamFrame: VideoFrame | null = null;
					try {
						if (this.cancelled) {
							return;
						}

						webcamFrame = webcamFrameQueue ? await webcamFrameQueue.dequeue() : null;
						const renderer = this.renderer;
						if (this.cancelled || !renderer) {
							return;
						}

						// Render the frame with all effects using source timestamp
						const sourceTimestampUs = sourceTimestampMs * 1000; // Convert to microseconds
						await renderer.renderFrame(videoFrame, sourceTimestampUs, webcamFrame);

						// Get the rendered canvas and add to GIF
						const canvas = renderer.getCanvas();

						// Add frame to GIF encoder with delay
						this.gif!.addFrame(canvas, { delay: frameDelay, copy: true });

						frameIndex++;

						// Update progress
						if (this.config.onProgress) {
							this.config.onProgress({
								currentFrame: frameIndex,
								totalFrames,
								percentage: (frameIndex / totalFrames) * 100,
								estimatedTimeRemaining: 0,
							});
						}
					} finally {
						videoFrame.close();
						webcamFrame?.close();
					}
				},
				onWarning,
			);

			if (this.cancelled) {
				return { success: false, error: "Export cancelled" };
			}

			stopWebcamDecode = true;
			webcamFrameQueue?.destroy();
			this.webcamDecoder?.cancel();
			await webcamDecodePromise;

			// Update progress to show we're now in the finalizing phase
			if (this.config.onProgress) {
				this.config.onProgress({
					currentFrame: totalFrames,
					totalFrames,
					percentage: 100,
					estimatedTimeRemaining: 0,
					phase: "finalizing",
				});
			}

			// Render the GIF
			const blob = await new Promise<Blob>((resolve, _reject) => {
				this.gif!.on("finished", (blob: Blob) => {
					resolve(blob);
				});

				// Track rendering progress
				this.gif!.on("progress", (progress: number) => {
					if (this.config.onProgress) {
						this.config.onProgress({
							currentFrame: totalFrames,
							totalFrames,
							percentage: 100,
							estimatedTimeRemaining: 0,
							phase: "finalizing",
							renderProgress: Math.round(progress * 100),
						});
					}
				});

				// gif.js doesn't have a typed 'error' event, but we can catch errors in the try/catch
				this.gif!.render();
			});

			return { success: true, blob, warnings: warnings.length > 0 ? warnings : undefined };
		} catch (error) {
			if (error instanceof BackgroundLoadError) {
				throw error;
			}
			console.error("GIF Export error:", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		} finally {
			webcamFrameQueue?.destroy();
			this.cleanup();
		}
	}

	cancel(): void {
		this.cancelled = true;
		if (this.streamingDecoder) {
			this.streamingDecoder.cancel();
		}
		if (this.webcamDecoder) {
			this.webcamDecoder.cancel();
		}
		if (this.gif) {
			this.gif.abort();
		}
		this.cleanup();
	}

	private cleanup(): void {
		if (this.streamingDecoder) {
			try {
				this.streamingDecoder.destroy();
			} catch (e) {
				console.warn("Error destroying streaming decoder:", e);
			}
			this.streamingDecoder = null;
		}

		if (this.webcamDecoder) {
			try {
				this.webcamDecoder.destroy();
			} catch (e) {
				console.warn("Error destroying webcam decoder:", e);
			}
			this.webcamDecoder = null;
		}

		if (this.renderer) {
			try {
				this.renderer.destroy();
			} catch (e) {
				console.warn("Error destroying renderer:", e);
			}
			this.renderer = null;
		}

		this.gif = null;
	}
}
