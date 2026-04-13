/**
 * Thin wrapper around frameRendererWorker.ts.
 *
 * Computes animation state (zoom, layout) on the main thread using existing
 * helpers, then sends VideoFrames + pre-computed transform to a Web Worker
 * that does all compositing via OffscreenCanvas + Canvas 2D (no Pixi.js).
 *
 * Public API is identical to the previous Pixi.js implementation so
 * videoExporter.ts requires zero changes.
 */

import type {
	AnnotationRegion,
	CropRegion,
	SpeedRegion,
	WebcamLayoutPreset,
	WebcamSizePreset,
	ZoomDepth,
	ZoomRegion,
} from "@/components/video-editor/types";
import { ZOOM_DEPTH_SCALES } from "@/components/video-editor/types";
import {
	AUTO_FOLLOW_RAMP_DISTANCE,
	AUTO_FOLLOW_SMOOTHING_FACTOR,
	AUTO_FOLLOW_SMOOTHING_FACTOR_MAX,
	DEFAULT_FOCUS,
	ZOOM_SCALE_DEADZONE,
	ZOOM_TRANSLATION_DEADZONE_PX,
} from "@/components/video-editor/videoPlayback/constants";
import {
	adaptiveSmoothFactor,
	smoothCursorFocus,
} from "@/components/video-editor/videoPlayback/cursorFollowUtils";
import { clampFocusToStage as clampFocusToStageUtil } from "@/components/video-editor/videoPlayback/focusUtils";
import { findDominantRegion } from "@/components/video-editor/videoPlayback/zoomRegionUtils";
import {
	computeFocusFromTransform,
	computeZoomTransform,
} from "@/components/video-editor/videoPlayback/zoomTransform";
import { computeCompositeLayout, type Size, type StyledRenderRect } from "@/lib/compositeLayout";

// ---------- Types matching the worker ----------

interface WorkerZoomRegion {
	id: string;
	startMs: number;
	endMs: number;
	depth: number;
	focus: { cx: number; cy: number };
	focusMode?: "manual" | "auto";
	zoomInDurationMs?: number;
	zoomOutDurationMs?: number;
}

interface WorkerCropRegion {
	x: number;
	y: number;
	width: number;
	height: number;
}

interface WorkerAnnotationRegion {
	id: string;
	startMs: number;
	endMs: number;
	type: "text" | "image" | "figure" | "blur";
	content: string;
	textContent?: string;
	imageContent?: string;
	position: { x: number; y: number };
	size: { width: number; height: number };
	style: {
		color: string;
		backgroundColor: string;
		fontSize: number;
		fontFamily: string;
		fontWeight: "normal" | "bold";
		fontStyle: "normal" | "italic";
		textDecoration: "none" | "underline";
		textAlign: "left" | "center" | "right";
	};
	zIndex: number;
	figureData?: {
		arrowDirection: string;
		color: string;
		strokeWidth: number;
	};
	blurData?: {
		shape: "rectangle" | "oval" | "freehand";
		intensity: number;
		freehandPoints?: Array<{ x: number; y: number }>;
	};
}

interface WorkerConfig {
	width: number;
	height: number;
	wallpaper: string;
	zoomRegions: WorkerZoomRegion[];
	showShadow: boolean;
	shadowIntensity: number;
	showBlur: boolean;
	motionBlurAmount: number;
	borderRadius: number;
	padding: number;
	cropRegion: WorkerCropRegion;
	videoWidth: number;
	videoHeight: number;
	webcamSize?: { width: number; height: number } | null;
	webcamLayoutPreset?: "picture-in-picture" | "vertical-stack" | "dual-frame";
	webcamMaskShape?: "rectangle" | "circle" | "square" | "rounded";
	webcamSizePreset?: number;
	webcamPosition?: { cx: number; cy: number } | null;
	annotationRegions?: WorkerAnnotationRegion[];
	previewWidth?: number;
	previewHeight?: number;
}

// ---------- Public interface (unchanged) ----------

export interface FrameRenderConfig {
	width: number;
	height: number;
	wallpaper: string;
	zoomRegions: ZoomRegion[];
	showShadow: boolean;
	shadowIntensity: number;
	showBlur: boolean;
	motionBlurAmount?: number;
	borderRadius?: number;
	padding?: number;
	cropRegion: CropRegion;
	videoWidth: number;
	videoHeight: number;
	webcamSize?: Size | null;
	webcamLayoutPreset?: WebcamLayoutPreset;
	webcamMaskShape?: import("@/components/video-editor/types").WebcamMaskShape;
	webcamSizePreset?: WebcamSizePreset;
	webcamPosition?: { cx: number; cy: number } | null;
	annotationRegions?: AnnotationRegion[];
	speedRegions?: SpeedRegion[];
	previewWidth?: number;
	previewHeight?: number;
	cursorTelemetry?: import("@/components/video-editor/types").CursorTelemetryPoint[];
}

// ---------- Animation state (same as original) ----------

interface AnimationState {
	scale: number;
	focusX: number;
	focusY: number;
	progress: number;
	x: number;
	y: number;
	appliedScale: number;
}

interface LayoutCache {
	stageSize: { width: number; height: number };
	videoSize: { width: number; height: number };
	baseScale: number;
	baseOffset: { x: number; y: number };
	maskRect: { x: number; y: number; width: number; height: number };
	webcamRect: StyledRenderRect | null;
}

// ---------- Worker messages ----------

interface InitMessage {
	type: "init";
	config: WorkerConfig;
	wallpaperBitmap?: ImageBitmap;
}

interface RenderMessage {
	type: "render";
	frame: VideoFrame;
	timestamp: number;
	webcamFrame?: VideoFrame | null;
	zoomTransform: {
		scale: number;
		x: number;
		y: number;
		focusX: number;
		focusY: number;
		progress: number;
	};
	layoutInfo: {
		stageWidth: number;
		stageHeight: number;
		videoWidth: number;
		videoHeight: number;
		baseScale: number;
		baseOffsetX: number;
		baseOffsetY: number;
		maskX: number;
		maskY: number;
		maskWidth: number;
		maskHeight: number;
		scaledBorderRadius: number;
		webcamRect?: {
			x: number;
			y: number;
			width: number;
			height: number;
			borderRadius: number;
			maskShape: "rectangle" | "circle" | "square" | "rounded";
		} | null;
		screenCover: boolean;
	};
}

interface DisposeMessage {
	type: "dispose";
}

interface FrameReadyMessage {
	type: "frame-ready";
	bitmap: ImageBitmap;
}

interface ErrorMessage {
	type: "error";
	error: string;
}

interface ReadyMessage {
	type: "ready";
}

type WorkerOutgoing = FrameReadyMessage | ErrorMessage | ReadyMessage;

// ---------- FrameRenderer ----------

export class FrameRenderer {
	private worker: Worker | null = null;
	private proxyCanvas: HTMLCanvasElement | null = null;
	private proxyCtx: CanvasRenderingContext2D | null = null;
	private config: FrameRenderConfig;
	private animationState: AnimationState;
	private layoutCache: LayoutCache | null = null;
	private currentVideoTime = 0;
	private smoothedAutoFocus: { cx: number; cy: number } | null = null;
	private prevAnimationTimeMs: number | null = null;
	private prevTargetProgress = 0;
	private readyPromise: Promise<void>;
	private readyResolve!: () => void;
	private pendingRender: {
		resolve: () => void;
		reject: (err: Error) => void;
	} | null = null;
	private disposed = false;

	constructor(config: FrameRenderConfig) {
		this.config = config;
		this.animationState = {
			scale: 1,
			focusX: DEFAULT_FOCUS.cx,
			focusY: DEFAULT_FOCUS.cy,
			progress: 0,
			x: 0,
			y: 0,
			appliedScale: 1,
		};
		this.readyPromise = new Promise<void>((resolve) => {
			this.readyResolve = resolve;
		});
	}

	async initialize(): Promise<void> {
		// Create proxy canvas for getCanvas() compatibility
		this.proxyCanvas = document.createElement("canvas");
		this.proxyCanvas.width = this.config.width;
		this.proxyCanvas.height = this.config.height;
		this.proxyCtx = this.proxyCanvas.getContext("2d")!;

		if (!this.proxyCtx) {
			throw new Error("Failed to get 2D context for proxy canvas");
		}

		// Create worker — Vite bundles this automatically
		// TODO: In production builds with certain Vite configs, worker
		// bundling may need the `?worker` suffix. If the worker fails
		// to load, switch to: `import FrameWorker from './frameRendererWorker?worker'`
		const workerUrl = new URL("./frameRendererWorker.ts", import.meta.url);
		this.worker = new Worker(workerUrl, { type: "module" });

		this.worker.onmessage = (e: MessageEvent<WorkerOutgoing>) => {
			this.handleWorkerMessage(e.data);
		};

		this.worker.onerror = (err: ErrorEvent) => {
			console.error("[FrameRenderer] Worker error:", err.message);
			if (this.pendingRender) {
				this.pendingRender.reject(new Error(`Worker error: ${err.message}`));
				this.pendingRender = null;
			}
		};

		// Pre-load wallpaper for file:// URLs that the worker may not be able to fetch
		let wallpaperBitmap: ImageBitmap | undefined;
		const wallpaper = this.config.wallpaper;
		try {
			if (
				wallpaper.startsWith("file://") ||
				(wallpaper.startsWith("/") && !wallpaper.startsWith("//"))
			) {
				// Try to load via fetch and transfer as ImageBitmap
				const response = await fetch(wallpaper);
				if (response.ok) {
					const blob = await response.blob();
					wallpaperBitmap = await createImageBitmap(blob);
				}
			} else if (wallpaper.startsWith("data:")) {
				const response = await fetch(wallpaper);
				if (response.ok) {
					const blob = await response.blob();
					wallpaperBitmap = await createImageBitmap(blob);
				}
			}
		} catch {
			// Worker will attempt its own loading or fall back
		}

		// Send init config
		const workerConfig: WorkerConfig = {
			width: this.config.width,
			height: this.config.height,
			wallpaper: this.config.wallpaper,
			zoomRegions: this.config.zoomRegions.map((z) => ({ ...z })),
			showShadow: this.config.showShadow,
			shadowIntensity: this.config.shadowIntensity,
			showBlur: this.config.showBlur,
			motionBlurAmount: this.config.motionBlurAmount ?? 0,
			borderRadius: this.config.borderRadius ?? 0,
			padding: this.config.padding ?? 0,
			cropRegion: { ...this.config.cropRegion },
			videoWidth: this.config.videoWidth,
			videoHeight: this.config.videoHeight,
			webcamSize: this.config.webcamSize
				? { width: this.config.webcamSize.width, height: this.config.webcamSize.height }
				: null,
			webcamLayoutPreset: this.config.webcamLayoutPreset,
			webcamMaskShape: this.config.webcamMaskShape,
			webcamSizePreset: this.config.webcamSizePreset,
			webcamPosition: this.config.webcamPosition,
			annotationRegions: this.config.annotationRegions?.map((a) => ({ ...a })),
			previewWidth: this.config.previewWidth,
			previewHeight: this.config.previewHeight,
		};

		const initMsg: InitMessage = {
			type: "init",
			config: workerConfig,
			wallpaperBitmap,
		};

		const transferList: Transferable[] = [];
		if (wallpaperBitmap) transferList.push(wallpaperBitmap as Transferable);

		this.worker.postMessage(initMsg, transferList);

		// Wait for worker to acknowledge ready
		await this.readyPromise;
	}

	private handleWorkerMessage(msg: WorkerOutgoing): void {
		switch (msg.type) {
			case "ready":
				this.readyResolve();
				break;
			case "frame-ready": {
				// Draw bitmap onto proxy canvas
				if (this.proxyCtx && this.proxyCanvas) {
					this.proxyCtx.clearRect(0, 0, this.proxyCanvas.width, this.proxyCanvas.height);
					this.proxyCtx.drawImage(msg.bitmap, 0, 0);
				}
				msg.bitmap.close();

				if (this.pendingRender) {
					this.pendingRender.resolve();
					this.pendingRender = null;
				}
				break;
			}
			case "error": {
				console.error("[FrameRenderer] Worker error:", msg.error);
				if (this.pendingRender) {
					this.pendingRender.reject(new Error(msg.error));
					this.pendingRender = null;
				}
				break;
			}
		}
	}

	async renderFrame(
		videoFrame: VideoFrame,
		timestamp: number,
		webcamFrame?: VideoFrame | null,
	): Promise<void> {
		if (!this.worker || this.disposed) {
			throw new Error("Renderer not initialized or disposed");
		}

		// Wait for worker to be ready (first frame may arrive before init ack)
		await this.readyPromise;

		this.currentVideoTime = timestamp / 1_000_000;
		const timeMs = this.currentVideoTime * 1000;

		// Update layout (same logic as original updateLayout)
		this.updateLayout(webcamFrame);

		// Compute animation state (same as original updateAnimationState)
		const TICKS_PER_FRAME = 1;
		let maxMotionIntensity = 0;
		for (let i = 0; i < TICKS_PER_FRAME; i++) {
			const motionIntensity = this.updateAnimationState(timeMs);
			maxMotionIntensity = Math.max(maxMotionIntensity, motionIntensity);
		}

		const layoutCache = this.layoutCache;
		if (!layoutCache) {
			throw new Error("Layout cache not initialized");
		}

		// Compute zoom transform using the same math as computeZoomTransform
		const transform = computeZoomTransform({
			stageSize: layoutCache.stageSize,
			baseMask: layoutCache.maskRect,
			zoomScale: this.animationState.scale,
			zoomProgress: this.animationState.progress,
			focusX: this.animationState.focusX,
			focusY: this.animationState.focusY,
		});

		// Scale border radius (same logic as original updateLayout)
		const previewWidth = this.config.previewWidth || 1920;
		const previewHeight = this.config.previewHeight || 1080;
		const canvasScaleFactor = Math.min(
			this.config.width / previewWidth,
			this.config.height / previewHeight,
		);
		const borderRadius = this.config.borderRadius ?? 0;
		const scaledBorderRadius =
			layoutCache.webcamRect != null
				? 0 // screenBorderRadius was stored separately; we use mask border
				: borderRadius * canvasScaleFactor;

		// Build layout info for worker
		const layoutInfo = {
			stageWidth: layoutCache.stageSize.width,
			stageHeight: layoutCache.stageSize.height,
			videoWidth: layoutCache.videoSize.width,
			videoHeight: layoutCache.videoSize.height,
			baseScale: layoutCache.baseScale,
			baseOffsetX: layoutCache.baseOffset.x,
			baseOffsetY: layoutCache.baseOffset.y,
			maskX: layoutCache.maskRect.x,
			maskY: layoutCache.maskRect.y,
			maskWidth: layoutCache.maskRect.width,
			maskHeight: layoutCache.maskRect.height,
			scaledBorderRadius,
			webcamRect: layoutCache.webcamRect
				? {
						x: layoutCache.webcamRect.x,
						y: layoutCache.webcamRect.y,
						width: layoutCache.webcamRect.width,
						height: layoutCache.webcamRect.height,
						borderRadius: layoutCache.webcamRect.borderRadius,
						maskShape: layoutCache.webcamRect.maskShape ?? "rectangle",
					}
				: null,
			screenCover: this.config.webcamLayoutPreset === "vertical-stack",
		};

		// Create render message
		const renderMsg: RenderMessage = {
			type: "render",
			frame: videoFrame,
			timestamp,
			webcamFrame: webcamFrame || null,
			zoomTransform: {
				scale: transform.scale,
				x: transform.x,
				y: transform.y,
				focusX: this.animationState.focusX,
				focusY: this.animationState.focusY,
				progress: this.animationState.progress,
			},
			layoutInfo,
		};

		// Create a promise that resolves when worker sends back the composited frame
		const renderPromise = new Promise<void>((resolve, reject) => {
			this.pendingRender = { resolve, reject };
		});

		// Transfer frames to worker (zero-copy)
		const transferList: Transferable[] = [videoFrame as unknown as Transferable];
		if (webcamFrame) {
			transferList.push(webcamFrame as unknown as Transferable);
		}

		this.worker.postMessage(renderMsg, transferList);

		// Wait for worker to finish compositing
		await renderPromise;
	}

	// ---------- Animation state (same logic as original) ----------

	private updateLayout(webcamFrame?: VideoFrame | null): void {
		const { width, height } = this.config;
		const { cropRegion, borderRadius = 0, padding = 0 } = this.config;
		const videoWidth = this.config.videoWidth;
		const videoHeight = this.config.videoHeight;

		const cropStartX = cropRegion.x;
		const cropStartY = cropRegion.y;
		const cropEndX = cropRegion.x + cropRegion.width;
		const cropEndY = cropRegion.y + cropRegion.height;

		const croppedVideoWidth = videoWidth * (cropEndX - cropStartX);
		const croppedVideoHeight = videoHeight * (cropEndY - cropStartY);

		const effectivePadding = this.config.webcamLayoutPreset === "vertical-stack" ? 0 : padding;
		const paddingScale = 1.0 - (effectivePadding / 100) * 0.4;
		const viewportWidth = width * paddingScale;
		const viewportHeight = height * paddingScale;

		const compositeLayout = computeCompositeLayout({
			canvasSize: { width, height },
			maxContentSize: { width: viewportWidth, height: viewportHeight },
			screenSize: { width: croppedVideoWidth, height: croppedVideoHeight },
			webcamSize: webcamFrame ? this.config.webcamSize : null,
			layoutPreset: this.config.webcamLayoutPreset,
			webcamSizePreset: this.config.webcamSizePreset,
			webcamPosition: this.config.webcamPosition,
			webcamMaskShape: this.config.webcamMaskShape,
		});
		if (!compositeLayout) return;

		const screenRect = compositeLayout.screenRect;

		let scale: number;
		if (compositeLayout.screenCover) {
			scale = Math.max(
				screenRect.width / croppedVideoWidth,
				screenRect.height / croppedVideoHeight,
			);
		} else {
			scale = screenRect.width / croppedVideoWidth;
		}

		const previewWidth = this.config.previewWidth || 1920;
		const previewHeight = this.config.previewHeight || 1080;
		const canvasScaleFactor = Math.min(width / previewWidth, height / previewHeight);
		const scaledBorderRadius =
			compositeLayout.screenBorderRadius != null
				? compositeLayout.screenBorderRadius
				: compositeLayout.screenCover
					? 0
					: borderRadius * canvasScaleFactor;

		// Cache layout info
		this.layoutCache = {
			stageSize: { width, height },
			videoSize: { width: croppedVideoWidth, height: croppedVideoHeight },
			baseScale: scale,
			baseOffset: { x: compositeLayout.screenRect.x, y: compositeLayout.screenRect.y },
			maskRect: compositeLayout.screenRect,
			webcamRect: compositeLayout.webcamRect
				? { ...compositeLayout.webcamRect, borderRadius: scaledBorderRadius }
				: null,
		};
	}

	private clampFocusToStage(
		focus: { cx: number; cy: number },
		depth: ZoomDepth,
	): { cx: number; cy: number } {
		if (!this.layoutCache) return focus;
		return clampFocusToStageUtil(focus, depth, this.layoutCache.stageSize);
	}

	private updateAnimationState(timeMs: number): number {
		if (!this.layoutCache) return 0;

		const { region, strength, blendedScale, transition } = findDominantRegion(
			this.config.zoomRegions,
			timeMs,
			{ connectZooms: true, cursorTelemetry: this.config.cursorTelemetry },
		);

		const defaultFocus = DEFAULT_FOCUS;
		let targetScaleFactor = 1;
		let targetFocus = { ...defaultFocus };
		let targetProgress = 0;

		if (region && strength > 0) {
			const zoomScale = blendedScale ?? ZOOM_DEPTH_SCALES[region.depth];
			const regionFocus = this.clampFocusToStage(region.focus, region.depth);

			targetScaleFactor = zoomScale;
			targetFocus = regionFocus;
			targetProgress = strength;

			if (region.focusMode === "auto" && !transition) {
				const raw = targetFocus;
				const dtMs = this.prevAnimationTimeMs != null ? timeMs - this.prevAnimationTimeMs : 0;
				const framesElapsed = dtMs > 0 ? dtMs / (1000 / 60) : 1;
				const isZoomingIn = targetProgress < 0.999 && targetProgress >= this.prevTargetProgress;
				if (targetProgress >= 0.999) {
					const prev = this.smoothedAutoFocus ?? raw;
					const baseFactor = adaptiveSmoothFactor(
						raw,
						prev,
						AUTO_FOLLOW_SMOOTHING_FACTOR,
						AUTO_FOLLOW_SMOOTHING_FACTOR_MAX,
						AUTO_FOLLOW_RAMP_DISTANCE,
					);
					const factor = 1 - Math.pow(1 - baseFactor, Math.max(1, framesElapsed));
					const smoothed = smoothCursorFocus(raw, prev, factor);
					this.smoothedAutoFocus = smoothed;
					targetFocus = smoothed;
				} else if (isZoomingIn) {
					this.smoothedAutoFocus = raw;
				} else {
					const prev = this.smoothedAutoFocus ?? raw;
					const baseFactor = adaptiveSmoothFactor(
						raw,
						prev,
						AUTO_FOLLOW_SMOOTHING_FACTOR,
						AUTO_FOLLOW_SMOOTHING_FACTOR_MAX,
						AUTO_FOLLOW_RAMP_DISTANCE,
					);
					const factor = 1 - Math.pow(1 - baseFactor, Math.max(1, framesElapsed));
					const smoothed = smoothCursorFocus(raw, prev, factor);
					this.smoothedAutoFocus = smoothed;
					targetFocus = smoothed;
				}
			} else if (region.focusMode !== "auto") {
				this.smoothedAutoFocus = null;
			}
			this.prevTargetProgress = targetProgress;

			if (transition) {
				const startTransform = computeZoomTransform({
					stageSize: this.layoutCache.stageSize,
					baseMask: this.layoutCache.maskRect,
					zoomScale: transition.startScale,
					zoomProgress: 1,
					focusX: transition.startFocus.cx,
					focusY: transition.startFocus.cy,
				});
				const endTransform = computeZoomTransform({
					stageSize: this.layoutCache.stageSize,
					baseMask: this.layoutCache.maskRect,
					zoomScale: transition.endScale,
					zoomProgress: 1,
					focusX: transition.endFocus.cx,
					focusY: transition.endFocus.cy,
				});

				const interpolatedTransform = {
					scale:
						startTransform.scale +
						(endTransform.scale - startTransform.scale) * transition.progress,
					x: startTransform.x + (endTransform.x - startTransform.x) * transition.progress,
					y: startTransform.y + (endTransform.y - startTransform.y) * transition.progress,
				};

				targetScaleFactor = interpolatedTransform.scale;
				targetFocus = computeFocusFromTransform({
					stageSize: this.layoutCache.stageSize,
					baseMask: this.layoutCache.maskRect,
					zoomScale: interpolatedTransform.scale,
					x: interpolatedTransform.x,
					y: interpolatedTransform.y,
				});
				targetProgress = 1;
			}
		}

		const state = this.animationState;
		const prevScale = state.appliedScale;
		const prevX = state.x;
		const prevY = state.y;

		state.scale = targetScaleFactor;
		state.focusX = targetFocus.cx;
		state.focusY = targetFocus.cy;
		state.progress = targetProgress;

		const projectedTransform = computeZoomTransform({
			stageSize: this.layoutCache.stageSize,
			baseMask: this.layoutCache.maskRect,
			zoomScale: state.scale,
			zoomProgress: state.progress,
			focusX: state.focusX,
			focusY: state.focusY,
		});

		const appliedScale =
			Math.abs(projectedTransform.scale - prevScale) < ZOOM_SCALE_DEADZONE
				? projectedTransform.scale
				: projectedTransform.scale;
		const appliedX =
			Math.abs(projectedTransform.x - prevX) < ZOOM_TRANSLATION_DEADZONE_PX
				? projectedTransform.x
				: projectedTransform.x;
		const appliedY =
			Math.abs(projectedTransform.y - prevY) < ZOOM_TRANSLATION_DEADZONE_PX
				? projectedTransform.y
				: projectedTransform.y;

		state.x = appliedX;
		state.y = appliedY;
		state.appliedScale = appliedScale;

		this.prevAnimationTimeMs = timeMs;

		return Math.max(
			Math.abs(appliedScale - prevScale),
			Math.abs(appliedX - prevX) / Math.max(1, this.layoutCache.stageSize.width),
			Math.abs(appliedY - prevY) / Math.max(1, this.layoutCache.stageSize.height),
		);
	}

	getCanvas(): HTMLCanvasElement {
		if (!this.proxyCanvas) {
			throw new Error("Renderer not initialized");
		}
		return this.proxyCanvas;
	}

	destroy(): void {
		this.disposed = true;
		if (this.worker) {
			this.worker.postMessage({ type: "dispose" } as DisposeMessage);
			this.worker.terminate();
			this.worker = null;
		}
		this.proxyCanvas = null;
		this.proxyCtx = null;
		this.layoutCache = null;
	}
}
