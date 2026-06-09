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
import type { CursorRecordingData } from "@/native/contracts";
import { getPlatform } from "@/utils/platformUtils";
import { AudioProcessor } from "./audioEncoder";
import { FrameRenderer } from "./frameRenderer";
import { VideoMuxer } from "./muxer";
import { StreamingVideoDecoder } from "./streamingDecoder";
import { TimestampedVideoFrameQueue } from "./timestampedVideoFrameQueue";
import type { ExportConfig, ExportProgress, ExportResult } from "./types";

const ENCODER_STALL_TIMEOUT_MS = 15_000;
const ENCODER_FLUSH_TIMEOUT_MS = 20_000;

export interface VideoExporterConfig extends ExportConfig {
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
	webcamLayoutPreset?: WebcamLayoutPreset;
	webcamMaskShape?: import("@/components/video-editor/types").WebcamMaskShape;
	webcamMirrored?: boolean;
	webcamReactiveZoom?: boolean;
	webcamSizePreset?: WebcamSizePreset;
	webcamPosition?: { cx: number; cy: number } | null;
	cursorRecordingData?: CursorRecordingData | null;
	cursorScale?: number;
	cursorSmoothing?: number;
	cursorMotionBlur?: number;
	cursorClickBounce?: number;
	cursorClipToBounds?: boolean;
	cursorTheme?: string;
	annotationRegions?: AnnotationRegion[];
	previewWidth?: number;
	previewHeight?: number;
	cursorTelemetry?: import("@/components/video-editor/types").CursorTelemetryPoint[];
	cursorClickTimestamps?: number[];
	onProgress?: (progress: ExportProgress) => void;
}

const SOURCE_COPY_EPSILON = 0.0001;

function hasActiveTimeRegions(regions?: Array<{ startMs: number; endMs: number }>) {
	return Boolean(regions?.some((region) => region.endMs - region.startMs > SOURCE_COPY_EPSILON));
}

function hasActiveSpeedRegions(regions?: SpeedRegion[]) {
	return Boolean(
		regions?.some(
			(region) =>
				region.endMs - region.startMs > SOURCE_COPY_EPSILON &&
				Math.abs(region.speed - 1) > SOURCE_COPY_EPSILON,
		),
	);
}

function hasNativeCursorOverlay(config: VideoExporterConfig) {
	return (config.cursorScale ?? 0) > 0;
}

function isDefaultCrop(cropRegion: CropRegion) {
	return (
		Math.abs(cropRegion.x) <= SOURCE_COPY_EPSILON &&
		Math.abs(cropRegion.y) <= SOURCE_COPY_EPSILON &&
		Math.abs(cropRegion.width - 1) <= SOURCE_COPY_EPSILON &&
		Math.abs(cropRegion.height - 1) <= SOURCE_COPY_EPSILON
	);
}

export function isSourceCopyFastPathEligible(
	config: VideoExporterConfig,
	videoInfo: { width: number; height: number },
) {
	return getSourceCopyFastPathBlockers(config, videoInfo).length === 0;
}

export function getSourceCopyFastPathBlockers(
	config: VideoExporterConfig,
	videoInfo: { width: number; height: number },
) {
	const blockers: string[] = [];

	if (config.width !== videoInfo.width || config.height !== videoInfo.height) {
		blockers.push(
			`output-size ${config.width}x${config.height} differs from source ${videoInfo.width}x${videoInfo.height}`,
		);
	}
	if (config.webcamVideoUrl) blockers.push("webcam overlay is enabled");
	if (hasActiveTimeRegions(config.trimRegions)) blockers.push("trim regions are present");
	if (hasActiveSpeedRegions(config.speedRegions)) blockers.push("speed regions are present");
	if (hasActiveTimeRegions(config.zoomRegions)) blockers.push("zoom regions are present");
	if (hasActiveTimeRegions(config.annotationRegions))
		blockers.push("annotation regions are present");
	if (hasNativeCursorOverlay(config)) blockers.push("editable cursor overlay is enabled");
	if (!isDefaultCrop(config.cropRegion)) blockers.push("crop is not default");
	if ((config.padding ?? 0) > SOURCE_COPY_EPSILON) blockers.push("padding is not zero");
	if ((config.videoPadding ?? 0) > SOURCE_COPY_EPSILON) blockers.push("video padding is not zero");
	if ((config.borderRadius ?? 0) > SOURCE_COPY_EPSILON) blockers.push("roundness is not zero");
	if (config.showShadow || config.shadowIntensity > SOURCE_COPY_EPSILON) {
		blockers.push("shadow is enabled");
	}
	if (config.showBlur) blockers.push("background blur is enabled");
	if ((config.motionBlurAmount ?? 0) > SOURCE_COPY_EPSILON) blockers.push("motion blur is enabled");

	return blockers;
}

function isMp4Source(videoUrl: string, blob: Blob) {
	if (blob.type.toLowerCase().includes("mp4")) {
		return true;
	}

	try {
		const path = new URL(videoUrl, window.location.href).pathname;
		return path.toLowerCase().endsWith(".mp4");
	} catch {
		return videoUrl.toLowerCase().split(/[?#]/, 1)[0].endsWith(".mp4");
	}
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
	// Keep a smaller queue for software encoding so Windows does not balloon memory.
	private readonly MAX_ENCODE_QUEUE = 120;
	private videoDescription: Uint8Array | undefined;
	private videoColorSpace: VideoColorSpaceInit | undefined;
	private muxingPromises: Promise<void>[] = [];
	private chunkCount = 0;
	private lastEncoderOutputAt = 0;
	private fatalEncoderError: Error | null = null;

	constructor(config: VideoExporterConfig) {
		this.config = config;
	}

	async export(): Promise<ExportResult> {
		const encoderPreferences = this.getEncoderPreferences();
		let lastError: Error | null = null;

		for (const encoderPreference of encoderPreferences) {
			try {
				return await this.exportWithEncoderPreference(encoderPreference);
			} catch (error) {
				const normalizedError = error instanceof Error ? error : new Error(String(error));
				lastError = normalizedError;

				if (this.cancelled) {
					return { success: false, error: "Export cancelled" };
				}

				if (normalizedError instanceof BackgroundLoadError) {
					throw normalizedError;
				}

				if (encoderPreferences.length > 1) {
					console.warn(
						`[VideoExporter] ${encoderPreference} export attempt failed:`,
						normalizedError,
					);
				}
			} finally {
				this.cleanup();
			}
		}

		return {
			success: false,
			error: lastError?.message || "Export failed",
		};
	}

	private async exportWithEncoderPreference(
		encoderPreference: HardwareAcceleration,
	): Promise<ExportResult> {
		let webcamFrameQueue: TimestampedVideoFrameQueue | null = null;
		let stopWebcamDecode = false;
		let webcamDecodeError: Error | null = null;
		let webcamDecodePromise: Promise<void> | null = null;
		let webcamDecoder: StreamingVideoDecoder | null = null;
		const warnings: string[] = [];
		const onWarning = (message: string) => warnings.push(message);

		this.cleanup();
		this.cancelled = false;
		this.fatalEncoderError = null;

		try {
			const platform = await getPlatform();

			const streamingDecoder = new StreamingVideoDecoder();
			this.streamingDecoder = streamingDecoder;
			const videoInfo = await streamingDecoder.loadMetadata(this.config.videoUrl);
			const sourceCopyResult = await this.trySourceCopyFastPath(videoInfo);
			if (sourceCopyResult) {
				return sourceCopyResult;
			}

			let webcamInfo: Awaited<ReturnType<StreamingVideoDecoder["loadMetadata"]>> | null = null;
			if (this.config.webcamVideoUrl) {
				webcamDecoder = new StreamingVideoDecoder();
				this.webcamDecoder = webcamDecoder;
				webcamInfo = await webcamDecoder.loadMetadata(this.config.webcamVideoUrl);
			}

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
				cursorRecordingData: this.config.cursorRecordingData,
				cursorScale: this.config.cursorScale,
				cursorSmoothing: this.config.cursorSmoothing,
				cursorMotionBlur: this.config.cursorMotionBlur,
				cursorClickBounce: this.config.cursorClickBounce,
				cursorClipToBounds: this.config.cursorClipToBounds,
				cursorTheme: this.config.cursorTheme,
				videoWidth: videoInfo.width,
				videoHeight: videoInfo.height,
				webcamSize: webcamInfo ? { width: webcamInfo.width, height: webcamInfo.height } : null,
				webcamLayoutPreset: this.config.webcamLayoutPreset,
				webcamMaskShape: this.config.webcamMaskShape,
				webcamMirrored: this.config.webcamMirrored,
				webcamReactiveZoom: this.config.webcamReactiveZoom,
				webcamSizePreset: this.config.webcamSizePreset,
				webcamPosition: this.config.webcamPosition,
				annotationRegions: this.config.annotationRegions,
				speedRegions: this.config.speedRegions,
				previewWidth: this.config.previewWidth,
				previewHeight: this.config.previewHeight,
				cursorTelemetry: this.config.cursorTelemetry,
				cursorClickTimestamps: this.config.cursorClickTimestamps,
				platform,
			});
			this.renderer = renderer;
			await renderer.initialize();

			await this.initializeEncoder(encoderPreference);

			const sourceDemuxer = streamingDecoder.getDemuxer();
			const audioExportCodec =
				videoInfo.hasAudio && sourceDemuxer
					? await AudioProcessor.selectSupportedExportCodecForSource(sourceDemuxer)
					: null;
			if (videoInfo.hasAudio && !audioExportCodec) {
				console.warn("[VideoExporter] No supported audio export codec, exporting video-only.");
			}

			const hasAudio = Boolean(audioExportCodec);
			const muxer = new VideoMuxer(this.config, hasAudio, audioExportCodec?.muxerCodec);
			this.muxer = muxer;
			await muxer.initialize();

			const { totalFrames } = streamingDecoder.getExportMetrics(
				this.config.frameRate,
				this.config.trimRegions,
				this.config.speedRegions,
			);

			const frameDuration = 1_000_000 / this.config.frameRate;
			let frameIndex = 0;
			const maxEncodeQueue =
				encoderPreference === "prefer-software"
					? Math.min(this.MAX_ENCODE_QUEUE, 32)
					: this.MAX_ENCODE_QUEUE;

			webcamFrameQueue = this.config.webcamVideoUrl ? new TimestampedVideoFrameQueue() : null;
			webcamDecodePromise =
				webcamDecoder && webcamFrameQueue
					? (() => {
							const queue = webcamFrameQueue;
							return webcamDecoder
								.decodeAll(
									this.config.frameRate,
									this.config.trimRegions,
									this.config.speedRegions,
									async (webcamFrame, _exportTimestampUs, webcamSourceTimestampMs) => {
										while (queue.length >= 12 && !this.cancelled && !stopWebcamDecode) {
											await new Promise((resolve) => setTimeout(resolve, 2));
										}
										if (this.cancelled || stopWebcamDecode) {
											webcamFrame.close();
											return;
										}
										queue.enqueue(webcamFrame, webcamSourceTimestampMs);
									},
									onWarning,
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

						if (this.fatalEncoderError) {
							throw this.fatalEncoderError;
						}

						const timestamp = frameIndex * frameDuration;
						webcamFrame = webcamFrameQueue
							? await webcamFrameQueue.frameAt(sourceTimestampMs)
							: null;
						if (this.cancelled) {
							return;
						}

						const sourceTimestampUs = sourceTimestampMs * 1000;
						await renderer.renderFrame(videoFrame, sourceTimestampUs, webcamFrame);

						const canvas = renderer.getCanvas();

						let exportFrame: VideoFrame;

						// On some Linux systems the GPU shared-image path (EGL/Ozone) fails
						// silently, producing empty frames, so we force a CPU readback instead.
						if (platform === "linux") {
							const canvasCtx = canvas.getContext("2d")!;
							const imageData = canvasCtx.getImageData(0, 0, canvas.width, canvas.height);
							exportFrame = new VideoFrame(imageData.data.buffer, {
								format: "RGBA",
								codedWidth: canvas.width,
								codedHeight: canvas.height,
								timestamp,
								duration: frameDuration,
								colorSpace: {
									primaries: "bt709",
									transfer: "iec61966-2-1",
									matrix: "rgb",
									fullRange: true,
								},
							});
						} else {
							exportFrame = new VideoFrame(canvas, { timestamp, duration: frameDuration });
						}

						while (
							this.encoder &&
							this.encoder.encodeQueueSize >= maxEncodeQueue &&
							!this.cancelled
						) {
							if (Date.now() - this.lastEncoderOutputAt > ENCODER_STALL_TIMEOUT_MS) {
								exportFrame.close();
								throw new Error(
									encoderPreference === "prefer-hardware"
										? "The hardware video encoder stopped responding. Retrying with a safer encoder."
										: "The video encoder stopped responding during export.",
								);
							}
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

						this.reportProgress({
							currentFrame: frameIndex,
							totalFrames,
							percentage: (frameIndex / totalFrames) * 100,
							estimatedTimeRemaining: 0,
						});
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

			if (this.fatalEncoderError) {
				throw this.fatalEncoderError;
			}

			stopWebcamDecode = true;
			webcamFrameQueue?.destroy();
			webcamDecoder?.cancel();
			await webcamDecodePromise;

			if (this.encoder && this.encoder.state === "configured") {
				await this.withTimeout(
					this.encoder.flush(),
					ENCODER_FLUSH_TIMEOUT_MS,
					encoderPreference === "prefer-hardware"
						? "The hardware video encoder stopped responding while finalizing the export."
						: "The video encoder stopped responding while finalizing the export.",
				);
			}

			if (this.fatalEncoderError) {
				throw this.fatalEncoderError;
			}

			await Promise.all(this.muxingPromises);

			this.reportProgress({
				currentFrame: totalFrames,
				totalFrames,
				percentage: 100,
				estimatedTimeRemaining: 0,
				phase: "finalizing",
			});

			if (hasAudio && audioExportCodec && !this.cancelled) {
				const demuxer = streamingDecoder.getDemuxer();
				if (demuxer) {
					console.log("[VideoExporter] Processing audio track...");
					this.audioProcessor = new AudioProcessor();
					await this.audioProcessor.process(
						demuxer,
						muxer,
						this.config.videoUrl,
						this.config.trimRegions,
						this.config.speedRegions,
						videoInfo.duration,
						audioExportCodec,
					);
				}
			}

			const blob = await muxer.finalize();
			return { success: true, blob, warnings: warnings.length > 0 ? warnings : undefined };
		} finally {
			stopWebcamDecode = true;
			webcamFrameQueue?.destroy();
			webcamDecoder?.cancel();
			if (webcamDecodePromise) {
				await webcamDecodePromise.catch(() => undefined);
			}
		}
	}

	private async initializeEncoder(hardwareAcceleration: HardwareAcceleration): Promise<void> {
		this.encodeQueue = 0;
		this.muxingPromises = [];
		this.chunkCount = 0;
		this.lastEncoderOutputAt = Date.now();
		this.fatalEncoderError = null;
		let videoDescription: Uint8Array | undefined;

		this.encoder = new VideoEncoder({
			output: (chunk, meta) => {
				this.lastEncoderOutputAt = Date.now();

				if (meta?.decoderConfig?.description && !videoDescription) {
					const desc = meta.decoderConfig.description;
					if (desc instanceof ArrayBuffer || desc instanceof SharedArrayBuffer) {
						videoDescription = new Uint8Array(desc);
					} else if (ArrayBuffer.isView(desc)) {
						videoDescription = new Uint8Array(desc.buffer, desc.byteOffset, desc.byteLength);
					}
					this.videoDescription = videoDescription;
				}

				if (meta?.decoderConfig?.colorSpace && !this.videoColorSpace) {
					this.videoColorSpace = meta.decoderConfig.colorSpace;
				}

				const isFirstChunk = this.chunkCount === 0;
				this.chunkCount++;

				const muxingPromise = (async () => {
					try {
						if (isFirstChunk && this.videoDescription) {
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
				this.encodeQueue = Math.max(0, this.encodeQueue - 1);
			},
			error: (error) => {
				console.error("[VideoExporter] Encoder error:", error);
				this.fatalEncoderError =
					error instanceof Error ? error : new Error(`Video encoder error: ${String(error)}`);
				this.streamingDecoder?.cancel();
				this.webcamDecoder?.cancel();
			},
		});

		const encoderConfig: VideoEncoderConfig = {
			codec: this.config.codec || "avc1.640033",
			width: this.config.width,
			height: this.config.height,
			bitrate: this.config.bitrate,
			framerate: this.config.frameRate,
			latencyMode: "quality",
			bitrateMode: "variable",
			hardwareAcceleration,
		};

		const support = await VideoEncoder.isConfigSupported(encoderConfig);
		if (!support.supported) {
			throw new Error(
				hardwareAcceleration === "prefer-hardware"
					? "Hardware video encoding is not supported on this system."
					: "Software video encoding is not supported on this system.",
			);
		}

		console.log(
			`[VideoExporter] Using ${hardwareAcceleration === "prefer-hardware" ? "hardware" : "software"} acceleration`,
		);
		this.encoder.configure(encoderConfig);
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
		this.lastEncoderOutputAt = 0;
		this.fatalEncoderError = null;
	}

	private getEncoderPreferences(): HardwareAcceleration[] {
		if (typeof navigator !== "undefined" && /\bWindows\b/i.test(navigator.userAgent)) {
			return ["prefer-software", "prefer-hardware"];
		}
		return ["prefer-hardware", "prefer-software"];
	}

	private async trySourceCopyFastPath(videoInfo: { width: number; height: number }) {
		const blockers = getSourceCopyFastPathBlockers(this.config, videoInfo);
		if (blockers.length > 0) {
			console.info("[VideoExporter] source-copy fast path disabled", {
				blockers,
				output: { width: this.config.width, height: this.config.height },
				source: videoInfo,
			});
			return null;
		}

		const sourceBlob = await this.loadSourceBlob();
		if (!sourceBlob || !isMp4Source(this.config.videoUrl, sourceBlob)) {
			console.info("[VideoExporter] source-copy fast path disabled", {
				blockers: ["source is not a readable MP4"],
				source: videoInfo,
			});
			return null;
		}

		if (this.cancelled) {
			return { success: false, error: "Export cancelled" };
		}

		this.reportProgress({
			currentFrame: 1,
			totalFrames: 1,
			percentage: 100,
			estimatedTimeRemaining: 0,
			phase: "finalizing",
		});
		console.info("[VideoExporter] using source-copy fast path", {
			source: videoInfo,
			bytes: sourceBlob.size,
		});

		return {
			success: true,
			blob: sourceBlob.type ? sourceBlob : new Blob([sourceBlob], { type: "video/mp4" }),
		} satisfies ExportResult;
	}

	private async loadSourceBlob() {
		const videoUrl = this.config.videoUrl;
		const isRemoteUrl = /^(https?:|blob:|data:)/i.test(videoUrl);

		if (!isRemoteUrl && window.electronAPI?.readBinaryFile) {
			const result = await window.electronAPI.readBinaryFile(videoUrl);
			if (!result.success || !result.data) {
				return null;
			}

			const type = videoUrl.toLowerCase().split(/[?#]/, 1)[0].endsWith(".mp4") ? "video/mp4" : "";
			return new Blob([result.data], type ? { type } : undefined);
		}

		const response = await fetch(videoUrl);
		if (!response.ok) {
			return null;
		}

		return response.blob();
	}

	private reportProgress(progress: ExportProgress): void {
		this.config.onProgress?.(progress);
	}

	private withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const timer = window.setTimeout(() => reject(new Error(message)), timeoutMs);
			promise.then(
				(value) => {
					window.clearTimeout(timer);
					resolve(value);
				},
				(error) => {
					window.clearTimeout(timer);
					reject(error);
				},
			);
		});
	}
}
