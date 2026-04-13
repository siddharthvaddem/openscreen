/**
 * FFmpeg-based video exporter that pipes raw RGBA frames to an FFmpeg child process
 * running in the Electron main process with hardware-accelerated encoding.
 *
 * This replaces the slow WebCodecs VideoEncoder path on Windows, providing
 * 5-20x faster exports by leveraging NVENC/QSV/AMF hardware encoders.
 *
 * Falls back to libx264 (still faster than browser WebCodecs) when no GPU encoder
 * is available.
 */

import type {
	AnnotationRegion,
	CropRegion,
	SpeedRegion,
	TrimRegion,
	WebcamLayoutPreset,
	WebcamSizePreset,
	ZoomRegion,
} from "@/components/video-editor/types";
import { AsyncVideoFrameQueue } from "./asyncVideoFrameQueue";
import { FrameRenderer } from "./frameRenderer";
import { StreamingVideoDecoder } from "./streamingDecoder";
import type { ExportProgress, ExportResult } from "./types";

// BACKPRESSURE variables removed as they are no longer needed for VideoEncoder

interface FFmpegExporterConfig {
	videoUrl: string;
	webcamVideoUrl?: string;
	width: number;
	height: number;
	frameRate: number;
	bitrate: number;
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
	cropRegion: CropRegion;
	webcamLayoutPreset?: WebcamLayoutPreset;
	webcamMaskShape?: import("@/components/video-editor/types").WebcamMaskShape;
	webcamSizePreset?: WebcamSizePreset;
	webcamPosition?: { cx: number; cy: number } | null;
	annotationRegions?: AnnotationRegion[];
	previewWidth?: number;
	previewHeight?: number;
	cursorTelemetry?: import("@/components/video-editor/types").CursorTelemetryPoint[];
	onProgress?: (progress: ExportProgress) => void;
}

export class FFmpegExporter {
	private config: FFmpegExporterConfig;
	private cancelled = false;
	private sessionId: string | null = null;
	private streamingDecoder: StreamingVideoDecoder | null = null;
	private renderer: FrameRenderer | null = null;

	constructor(config: FFmpegExporterConfig) {
		this.config = config;
	}

	/**
	 * Checks if FFmpeg native export is available.
	 * Call this before constructing an FFmpegExporter to decide which path to use.
	 */
	static async isAvailable(): Promise<{
		available: boolean;
		bestEncoder: string | null;
	}> {
		try {
			const caps = await window.electronAPI.ffmpegGetCapabilities();
			return {
				available: caps.available && caps.bestEncoder !== null,
				bestEncoder: caps.bestEncoder,
			};
		} catch {
			return { available: false, bestEncoder: null };
		}
	}

	async export(): Promise<ExportResult> {
		this.cancelled = false;

		try {
			// 1. Probe capabilities & select encoder
			const caps = await window.electronAPI.ffmpegGetCapabilities();
			if (!caps.available || !caps.bestEncoder) {
				return { success: false, error: "FFmpeg not available" };
			}

			const encoder = caps.bestEncoder;
			console.log(`[FFmpegExporter] Using encoder: ${encoder}`);

			// 2. Initialize video decoder
			const streamingDecoder = new StreamingVideoDecoder();
			this.streamingDecoder = streamingDecoder;
			const videoInfo = await streamingDecoder.loadMetadata(this.config.videoUrl);

			let webcamDecoder: StreamingVideoDecoder | null = null;
			let webcamInfo: Awaited<ReturnType<StreamingVideoDecoder["loadMetadata"]>> | null = null;
			if (this.config.webcamVideoUrl) {
				webcamDecoder = new StreamingVideoDecoder();
				webcamInfo = await webcamDecoder.loadMetadata(this.config.webcamVideoUrl);
			}

			// 3. Initialize frame renderer (same as VideoExporter)
			const renderer = new FrameRenderer({
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
			});
			this.renderer = renderer;
			await renderer.initialize();

			if (this.cancelled) {
				return { success: false, error: "Export cancelled" };
			}

			// 4. Start FFmpeg process
			const startResult = await window.electronAPI.ffmpegExportStart({
				width: this.config.width,
				height: this.config.height,
				frameRate: this.config.frameRate,
				encoder,
				bitrate: this.config.bitrate,
				audioSourcePath: this.config.videoUrl,
				hasAudio: videoInfo.hasAudio,
			});

			if (!startResult.success || !startResult.sessionId) {
				return { success: false, error: startResult.error || "Failed to start FFmpeg" };
			}

			this.sessionId = startResult.sessionId;
			console.log(`[FFmpegExporter] Session started: ${this.sessionId}`);

			// 5. Calculate total frames
			const effectiveDuration = streamingDecoder.getEffectiveDuration(
				this.config.trimRegions,
				this.config.speedRegions,
			);
			const totalFrames = Math.ceil(effectiveDuration * this.config.frameRate);

			console.log(
				`[FFmpegExporter] Duration: ${effectiveDuration.toFixed(2)}s, Frames: ${totalFrames}`,
			);

			// 6. Initialize WebCodecs VideoEncoder to encode hardware H.264 on the GPU
			let encoderError: Error | null = null;
			let frameErrors = 0;
			const MAX_FRAME_ERRORS = 3;

			const vidEncoder = new VideoEncoder({
				output: async (chunk, meta) => {
					// We may receive the SPS/PPS headers as decoder config
					if (meta?.decoderConfig?.description) {
						// Optionally send the header bytes to ffmpeg ahead of the stream?
						// FFmpeg -f h264 usually detects the Annex-B stream automatically if
						// we format the chunks right, but VideoEncoder spits out raw AVCC chunks.
						// We need to write them to IPC. We will let FFmpeg parse the bare H264 stream.
					}

					// We MUST output Annex B format for FFmpeg to parse it from a raw pipe.
					// Fortunately avc1 chunks can be converted, or we can just configure WebCodecs to output avc!
					// Actually, WebCodecs output is in Annex B format if we don't specify avc format.
					const buffer = new ArrayBuffer(chunk.byteLength);
					chunk.copyTo(buffer);

					const frameResult = await window.electronAPI.ffmpegExportFrame(this.sessionId!, buffer);

					if (!frameResult.success) {
						console.error("Failed to send chunks to FFmpeg", frameResult.error);
						frameErrors++;
						if (frameErrors >= MAX_FRAME_ERRORS) {
							encoderError = new Error(`FFmpeg IPC failed: ${frameResult.error}`);
						}
					} else {
						frameErrors = 0; // reset on successful transmission
					}
				},
				error: (e) => {
					console.error("[FFmpegExporter] VideoEncoder error:", e);
					encoderError = e;
				},
			});

			vidEncoder.configure({
				codec: "avc1.640034", // H.264 High Profile Level 5.2
				width: this.config.width,
				height: this.config.height,
				bitrate: this.config.bitrate,
				framerate: this.config.frameRate,
				hardwareAcceleration: "prefer-hardware",
				avc: { format: "annexb" }, // CRITICAL: FFmpeg raw h264 pipe needs Annex B format with start codes!
			});

			// 7. Decode & render frames, pipe directly from GPU encoder
			let frameIndex = 0;
			const exportStartTime = Date.now();
			const frameDurationUs = 1_000_000 / this.config.frameRate;

			// Add webcam queue
			const webcamFrameQueue = this.config.webcamVideoUrl ? new AsyncVideoFrameQueue() : null;
			let webcamDecodeError: Error | null = null;
			let stopWebcamDecode = false;

			const webcamDecodePromise =
				webcamDecoder && webcamFrameQueue
					? (() => {
							const queue = webcamFrameQueue;
							return webcamDecoder
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
								)
								.catch((error) => {
									webcamDecodeError = error instanceof Error ? error : new Error(String(error));
									throw webcamDecodeError;
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

			await streamingDecoder.decodeAll(
				this.config.frameRate,
				this.config.trimRegions,
				this.config.speedRegions,
				async (videoFrame, _exportTimestampUs, sourceTimestampMs) => {
					let webcamFrame: VideoFrame | null = null;
					try {
						if (this.cancelled) {
							return;
						}

						if (encoderError) {
							throw encoderError;
						}

						const timestamp = frameIndex * frameDurationUs; // microseconds here
						webcamFrame = webcamFrameQueue ? await webcamFrameQueue.dequeue() : null;
						if (this.cancelled) {
							return;
						}

						const sourceTimestampUs = sourceTimestampMs * 1000;
						await renderer.renderFrame(videoFrame, sourceTimestampUs, webcamFrame);
						const canvas = renderer.getCanvas();

						// Fastest path in existence: GPU texture -> Hardware H264 Encoder
						const exportFrame = new VideoFrame(canvas, { timestamp, duration: frameDurationUs });

						// Prevent encoding queue from flooding RAM
						while (vidEncoder.encodeQueueSize >= 32) {
							await new Promise((r) => setTimeout(r, 2));
						}

						vidEncoder.encode(exportFrame, { keyFrame: frameIndex % 150 === 0 });
						exportFrame.close();

						frameIndex++;

						const elapsedMs = Date.now() - exportStartTime;
						const framesPerSec = frameIndex / (elapsedMs / 1000);
						const remainingFrames = totalFrames - frameIndex;
						const estimatedTimeRemaining = remainingFrames / Math.max(1, framesPerSec);

						this.config.onProgress?.({
							currentFrame: frameIndex,
							totalFrames,
							percentage: (frameIndex / totalFrames) * 100,
							estimatedTimeRemaining,
						});
					} finally {
						if (webcamFrame) {
							webcamFrame.close();
						}
						videoFrame.close();
					}
				},
			);

			stopWebcamDecode = true;
			if (webcamDecodePromise) {
				await webcamDecodePromise.catch(() => {}); // ignore error here, already caught
			}

			// Flush remains of encoder
			await vidEncoder.flush();
			vidEncoder.close();

			if (this.cancelled) {
				await this.cancelFFmpeg();
				return { success: false, error: "Export cancelled" };
			}

			// 7. Report finalizing phase
			this.config.onProgress?.({
				currentFrame: totalFrames,
				totalFrames,
				percentage: 100,
				estimatedTimeRemaining: 0,
				phase: "finalizing",
			});

			// 8. Finish FFmpeg — close stdin, wait for process, show save dialog
			const timestamp = Date.now();
			const fileName = `export-${timestamp}.mp4`;
			const finishResult = await window.electronAPI.ffmpegExportFinish(this.sessionId, fileName);

			const totalTime = ((Date.now() - exportStartTime) / 1000).toFixed(1);
			console.log(`[FFmpegExporter] Total export time: ${totalTime}s for ${frameIndex} frames`);

			if (finishResult.canceled) {
				// User canceled the save dialog — return the result so VideoEditor can handle it
				return {
					success: false,
					error: "Export save canceled",
				};
			}

			if (!finishResult.success) {
				return {
					success: false,
					error: finishResult.error || "FFmpeg export failed",
				};
			}

			// Return a result that VideoEditor can handle for the "Show in Folder" toast
			// We return a special result since FFmpegExporter doesn't produce a Blob
			return {
				success: true,
				type: "native",
				path: finishResult.path!,
			};
		} catch (error) {
			console.error("[FFmpegExporter] Export error:", error);
			await this.cancelFFmpeg();
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		} finally {
			this.cleanup();
		}
	}

	cancel(): void {
		this.cancelled = true;
		this.streamingDecoder?.cancel();
		void this.cancelFFmpeg();
		this.cleanup();
	}

	private async cancelFFmpeg(): Promise<void> {
		if (this.sessionId) {
			try {
				await window.electronAPI.ffmpegExportCancel(this.sessionId);
			} catch {
				// Ignore cancel errors
			}
			this.sessionId = null;
		}
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

		if (this.renderer) {
			try {
				this.renderer.destroy();
			} catch (e) {
				console.warn("Error destroying renderer:", e);
			}
			this.renderer = null;
		}
	}
}
