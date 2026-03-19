import type {
	AnnotationRegion,
	CropRegion,
	CursorStyle,
	CursorTelemetryPoint,
	SpeedRegion,
	TrimRegion,
	ZoomRegion,
} from "@/components/video-editor/types";
import { AsyncVideoFrameQueue } from "./asyncVideoFrameQueue";
import { AudioProcessor } from "./audioEncoder";
import { FrameRenderer } from "./frameRenderer";
import { VideoMuxer } from "./muxer";
import { StreamingVideoDecoder } from "./streamingDecoder";
import type { ExportConfig, ExportProgress, ExportResult } from "./types";

interface VideoExporterConfig extends ExportConfig {
	videoUrl: string;
	webcamVideoUrl?: string;
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
	annotationRegions?: AnnotationRegion[];
	previewWidth?: number;
	previewHeight?: number;
	// Cursor overlay
	cursorTelemetry?: CursorTelemetryPoint[];
	showCursorHighlight?: boolean;
	cursorStyle?: CursorStyle;
	cursorColor?: string;
	cursorSize?: number;
	cursorOpacity?: number;
	cursorStrokeWidth?: number;
	cursorDisplayInfo?: {
		boundsX: number;
		boundsY: number;
		boundsWidth: number;
		boundsHeight: number;
		workAreaX: number;
		workAreaY: number;
		workAreaWidth: number;
		workAreaHeight: number;
	} | null;
	onProgress?: (progress: ExportProgress) => void;
}

export class VideoExporter {
	private config: VideoExporterConfig;
	private streamingDecoder: StreamingVideoDecoder | null = null;
	private renderer: FrameRenderer | null = null;
	private encoder: VideoEncoder | null = null;
	private muxer: VideoMuxer | null = null;
	private audioProcessor: AudioProcessor | null = null;
	private webcamDecoder: StreamingVideoDecoder | null = null;
	private cancelled = false;
	private encodeQueue = 0;
	// Increased queue size for better throughput with hardware encoding
	private readonly MAX_ENCODE_QUEUE = 120;
	private videoDescription: Uint8Array | undefined;
	private videoColorSpace: VideoColorSpaceInit | undefined;
	// Track muxing promises for parallel processing
	private muxingPromises: Promise<void>[] = [];
	private chunkCount = 0;

	constructor(config: VideoExporterConfig) {
		this.config = config;
	}

	async export(): Promise<ExportResult> {
		let webcamFrameQueue: AsyncVideoFrameQueue | null = null;
		try {
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
				webcamWidth: webcamInfo?.width,
				webcamHeight: webcamInfo?.height,
				annotationRegions: this.config.annotationRegions,
				speedRegions: this.config.speedRegions,
				previewWidth: this.config.previewWidth,
				previewHeight: this.config.previewHeight,
				cursorTelemetry: this.config.cursorTelemetry,
				showCursorHighlight: this.config.showCursorHighlight,
				cursorStyle: this.config.cursorStyle,
				cursorColor: this.config.cursorColor,
				cursorSize: this.config.cursorSize,
				cursorOpacity: this.config.cursorOpacity,
				cursorStrokeWidth: this.config.cursorStrokeWidth,
				cursorDisplayInfo: this.config.cursorDisplayInfo,
			});
			await this.renderer.initialize();

			// Initialize video encoder
			await this.initializeEncoder();

			// Initialize muxer (with audio if source has an audio track)
			const hasAudio = videoInfo.hasAudio;
			this.muxer = new VideoMuxer(this.config, hasAudio);
			await this.muxer.initialize();

			// Calculate effective duration and frame count (excluding trim regions)
			const effectiveDuration = this.streamingDecoder.getEffectiveDuration(
				this.config.trimRegions,
				this.config.speedRegions,
			);
			const totalFrames = Math.ceil(effectiveDuration * this.config.frameRate);
			const readEndSec = Math.max(videoInfo.duration, videoInfo.streamDuration ?? 0) + 0.5;

			console.log("[VideoExporter] Original duration:", videoInfo.duration, "s");
			console.log("[VideoExporter] Effective duration:", effectiveDuration, "s");
			console.log("[VideoExporter] Total frames to export:", totalFrames);
			console.log("[VideoExporter] Using streaming decode (web-demuxer + VideoDecoder)");

			const frameDuration = 1_000_000 / this.config.frameRate; // in microseconds
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

						const timestamp = frameIndex * frameDuration;
						webcamFrame = webcamFrameQueue ? await webcamFrameQueue.dequeue() : null;
						const renderer = this.renderer;
						if (this.cancelled || !renderer) {
							return;
						}

						// Render the frame with all effects using source timestamp
						const sourceTimestampUs = sourceTimestampMs * 1000; // Convert to microseconds
						await renderer.renderFrame(videoFrame, sourceTimestampUs, webcamFrame);

						const canvas = renderer.getCanvas();

						// Create VideoFrame from canvas on GPU without reading pixels
						// @ts-expect-error - colorSpace not in TypeScript definitions but works at runtime
						const exportFrame = new VideoFrame(canvas, {
							timestamp,
							duration: frameDuration,
							colorSpace: {
								primaries: "bt709",
								transfer: "iec61966-2-1",
								matrix: "rgb",
								fullRange: true,
							},
						});

						// Check encoder queue before encoding to keep it full
						while (
							this.encoder &&
							this.encoder.encodeQueueSize >= this.MAX_ENCODE_QUEUE &&
							!this.cancelled
						) {
							await new Promise((resolve) => setTimeout(resolve, 5));
						}

						if (this.encoder && this.encoder.state === "configured") {
							this.encodeQueue++;
							this.encoder.encode(exportFrame, { keyFrame: frameIndex % 150 === 0 });
						} else {
							console.warn(
								`[Frame ${frameIndex}] Encoder not ready! State: ${this.encoder?.state}`,
							);
						}

						exportFrame.close();

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
			);

			if (this.cancelled) {
				return { success: false, error: "Export cancelled" };
			}

			stopWebcamDecode = true;
			webcamFrameQueue?.destroy();
			this.webcamDecoder?.cancel();
			await webcamDecodePromise;

			// Finalize encoding
			if (this.encoder && this.encoder.state === "configured") {
				await this.encoder.flush();
			}

			// Wait for all video muxing operations to complete
			await Promise.all(this.muxingPromises);

			if (this.config.onProgress) {
				this.config.onProgress({
					currentFrame: totalFrames,
					totalFrames,
					percentage: 100,
					estimatedTimeRemaining: 0,
					phase: "finalizing",
				});
			}

			// Process audio track if present
			if (hasAudio && !this.cancelled) {
				const demuxer = this.streamingDecoder!.getDemuxer();
				if (demuxer) {
					console.log("[VideoExporter] Processing audio track...");
					this.audioProcessor = new AudioProcessor();
					await this.audioProcessor.process(
						demuxer,
						this.muxer!,
						this.config.videoUrl,
						this.config.trimRegions,
						this.config.speedRegions,
						readEndSec,
					);
				}
			}

			// Finalize muxer and get output blob
			const blob = await this.muxer!.finalize();

			return { success: true, blob };
		} catch (error) {
			console.error("Export error:", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		} finally {
			webcamFrameQueue?.destroy();
			this.cleanup();
		}
	}

	private async initializeEncoder(): Promise<void> {
		this.encodeQueue = 0;
		this.muxingPromises = [];
		this.chunkCount = 0;
		let videoDescription: Uint8Array | undefined;

		this.encoder = new VideoEncoder({
			output: (chunk, meta) => {
				// Capture decoder config metadata from encoder output
				if (meta?.decoderConfig?.description && !videoDescription) {
					const desc = meta.decoderConfig.description;
					if (desc instanceof ArrayBuffer || desc instanceof SharedArrayBuffer) {
						videoDescription = new Uint8Array(desc);
					} else if (ArrayBuffer.isView(desc)) {
						videoDescription = new Uint8Array(desc.buffer, desc.byteOffset, desc.byteLength);
					}
					this.videoDescription = videoDescription;
				}
				// Capture colorSpace from encoder metadata if provided
				if (meta?.decoderConfig?.colorSpace && !this.videoColorSpace) {
					this.videoColorSpace = meta.decoderConfig.colorSpace;
				}

				// Stream chunk to muxer immediately (parallel processing)
				const isFirstChunk = this.chunkCount === 0;
				this.chunkCount++;

				const muxingPromise = (async () => {
					try {
						if (isFirstChunk && this.videoDescription) {
							// Add decoder config for the first chunk
							const colorSpace = this.videoColorSpace || {
								primaries: "bt709",
								transfer: "iec61966-2-1",
								matrix: "rgb",
								fullRange: true,
							};

							const metadata: EncodedVideoChunkMetadata = {
								decoderConfig: {
									codec: this.config.codec || "avc1.640033",
									codedWidth: this.config.width,
									codedHeight: this.config.height,
									description: this.videoDescription,
									colorSpace,
								},
							};

							await this.muxer!.addVideoChunk(chunk, metadata);
						} else {
							await this.muxer!.addVideoChunk(chunk, meta);
						}
					} catch (error) {
						console.error("Muxing error:", error);
					}
				})();

				this.muxingPromises.push(muxingPromise);
				this.encodeQueue--;
			},
			error: (error) => {
				console.error("[VideoExporter] Encoder error:", error);
				// Stop export encoding failed
				this.cancelled = true;
			},
		});

		const codec = this.config.codec || "avc1.640033";

		const encoderConfig: VideoEncoderConfig = {
			codec,
			width: this.config.width,
			height: this.config.height,
			bitrate: this.config.bitrate,
			framerate: this.config.frameRate,
			latencyMode: "quality", // Changed from 'realtime' to 'quality' for better throughput
			bitrateMode: "variable",
			hardwareAcceleration: "prefer-hardware",
		};

		// Check hardware support first
		const hardwareSupport = await VideoEncoder.isConfigSupported(encoderConfig);

		if (hardwareSupport.supported) {
			// Use hardware encoding
			console.log("[VideoExporter] Using hardware acceleration");
			this.encoder.configure(encoderConfig);
		} else {
			// Fall back to software encoding
			console.log("[VideoExporter] Hardware not supported, using software encoding");
			encoderConfig.hardwareAcceleration = "prefer-software";

			const softwareSupport = await VideoEncoder.isConfigSupported(encoderConfig);
			if (!softwareSupport.supported) {
				throw new Error("Video encoding not supported on this system");
			}

			this.encoder.configure(encoderConfig);
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
		if (this.audioProcessor) {
			this.audioProcessor.cancel();
		}
		this.cleanup();
	}

	private cleanup(): void {
		if (this.encoder) {
			try {
				if (this.encoder.state === "configured") {
					this.encoder.close();
				}
			} catch (e) {
				console.warn("Error closing encoder:", e);
			}
			this.encoder = null;
		}

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

		this.audioProcessor = null;
		this.muxer = null;
		this.encodeQueue = 0;
		this.muxingPromises = [];
		this.chunkCount = 0;
		this.videoDescription = undefined;
		this.videoColorSpace = undefined;
	}
}
