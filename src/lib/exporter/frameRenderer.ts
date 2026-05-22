import {
	Application,
	BlurFilter,
	Container,
	Graphics,
	Sprite,
	Texture,
	type TextureSourceLike,
} from "pixi.js";
import { MotionBlurFilter } from "pixi-filters/motion-blur";
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
	applyZoomTransform,
	computeFocusFromTransform,
	computeZoomTransform,
	createMotionBlurState,
	type MotionBlurState,
} from "@/components/video-editor/videoPlayback/zoomTransform";
import {
	computeCompositeLayout,
	getWebcamLayoutPresetDefinition,
	type Size,
	type StyledRenderRect,
} from "@/lib/compositeLayout";
import { drawCanvasClipPath } from "@/lib/webcamMaskShapes";
import { renderAnnotations } from "./annotationRenderer";
import {
	getLinearGradientPoints,
	getRadialGradientShape,
	parseCssGradient,
	resolveLinearGradientAngle,
} from "./gradientParser";

interface FrameRenderConfig {
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
	platform: string;
}

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

// Renders video frames with all effects (background, zoom, crop, blur, shadow) to an offscreen canvas for export.

export class FrameRenderer {
	private app: Application | null = null;
	private cameraContainer: Container | null = null;
	private videoContainer: Container | null = null;
	private videoSprite: Sprite | null = null;
	private backgroundSprite: HTMLCanvasElement | null = null;
	private maskGraphics: Graphics | null = null;
	private blurFilter: BlurFilter | null = null;
	private motionBlurFilter: MotionBlurFilter | null = null;
	private shadowCanvas: HTMLCanvasElement | null = null;
	private shadowCtx: CanvasRenderingContext2D | null = null;
	private compositeCanvas: HTMLCanvasElement | null = null;
	private compositeCtx: CanvasRenderingContext2D | null = null;
	private rasterCanvas: HTMLCanvasElement | null = null;
	private rasterCtx: CanvasRenderingContext2D | null = null;
	private config: FrameRenderConfig;
	private animationState: AnimationState;
	private layoutCache: LayoutCache | null = null;
	private currentVideoTime = 0;
	private motionBlurState: MotionBlurState = createMotionBlurState();
	private smoothedAutoFocus: { cx: number; cy: number } | null = null;
	private prevAnimationTimeMs: number | null = null;
	private prevTargetProgress = 0;
	private isLinux = false;

	constructor(config: FrameRenderConfig) {
		this.config = config;
		this.isLinux = config.platform === "linux";
		this.animationState = {
			scale: 1,
			focusX: DEFAULT_FOCUS.cx,
			focusY: DEFAULT_FOCUS.cy,
			progress: 0,
			x: 0,
			y: 0,
			appliedScale: 1,
		};
	}

	async initialize(): Promise<void> {
		// Create canvas for rendering
		const canvas = document.createElement("canvas");
		canvas.width = this.config.width;
		canvas.height = this.config.height;

		// Try to set colorSpace if supported (may not be available on all platforms)
		try {
			if (canvas && "colorSpace" in canvas) {
				canvas.colorSpace = "srgb";
			}
		} catch (error) {
			// Silently ignore colorSpace errors on platforms that don't support it
			console.warn("[FrameRenderer] colorSpace not supported on this platform:", error);
		}

		// Initialize PixiJS with optimized settings for export performance
		this.app = new Application();
		await this.app.init({
			canvas,
			width: this.config.width,
			height: this.config.height,
			backgroundAlpha: 0,
			antialias: true,
			resolution: 1,
			autoDensity: true,
		});

		// Setup containers
		this.cameraContainer = new Container();
		this.videoContainer = new Container();
		this.app.stage.addChild(this.cameraContainer);
		this.cameraContainer.addChild(this.videoContainer);

		// Setup background (render separately, not in PixiJS)
		await this.setupBackground();

		// Setup blur filter for video container
		this.blurFilter = new BlurFilter();
		this.blurFilter.quality = 5;
		this.blurFilter.resolution = this.app.renderer.resolution;
		this.blurFilter.blur = 0;
		this.motionBlurFilter = new MotionBlurFilter([0, 0], 5, 0);
		this.videoContainer.filters = [this.blurFilter, this.motionBlurFilter];

		// Setup composite canvas for final output with shadows
		this.compositeCanvas = document.createElement("canvas");
		this.compositeCanvas.width = this.config.width;
		this.compositeCanvas.height = this.config.height;

		// On Linux, getImageData() is called frequently causing frequent CPU readback
		this.compositeCtx = this.compositeCanvas.getContext("2d", {
			willReadFrequently: this.isLinux,
		});

		if (!this.compositeCtx) {
			throw new Error("Failed to get 2D context for composite canvas");
		}

		this.rasterCanvas = document.createElement("canvas");
		this.rasterCanvas.width = this.config.width;
		this.rasterCanvas.height = this.config.height;
		this.rasterCtx = this.rasterCanvas.getContext("2d");
		if (!this.rasterCtx) {
			throw new Error("Failed to get 2D context for raster canvas");
		}

		// Setup shadow canvas if needed
		if (this.config.showShadow) {
			this.shadowCanvas = document.createElement("canvas");
			this.shadowCanvas.width = this.config.width;
			this.shadowCanvas.height = this.config.height;
			this.shadowCtx = this.shadowCanvas.getContext("2d", {
				willReadFrequently: false,
			});

			if (!this.shadowCtx) {
				throw new Error("Failed to get 2D context for shadow canvas");
			}
		}

		// Setup mask
		this.maskGraphics = new Graphics();
		this.videoContainer.addChild(this.maskGraphics);
		this.videoContainer.mask = this.maskGraphics;
	}

	private async setupBackground(): Promise<void> {
		const wallpaper = this.config.wallpaper;

		// Create background canvas for separate rendering (not affected by zoom)
		const bgCanvas = document.createElement("canvas");
		bgCanvas.width = this.config.width;
		bgCanvas.height = this.config.height;
		const bgCtx = bgCanvas.getContext("2d")!;

		try {
			// Render background based on type
			if (
				wallpaper.startsWith("file://") ||
				wallpaper.startsWith("data:") ||
				wallpaper.startsWith("/") ||
				wallpaper.startsWith("http")
			) {
				// Image background
				const img = new Image();
				// Don't set crossOrigin for same-origin images to avoid CORS taint
				// Only set it for cross-origin URLs
				let imageUrl: string;
				if (wallpaper.startsWith("http")) {
					imageUrl = wallpaper;
					if (!imageUrl.startsWith(window.location.origin)) {
						img.crossOrigin = "anonymous";
					}
				} else if (wallpaper.startsWith("file://") || wallpaper.startsWith("data:")) {
					imageUrl = wallpaper;
				} else {
					imageUrl = window.location.origin + wallpaper;
				}

				await new Promise<void>((resolve, reject) => {
					img.onload = () => resolve();
					img.onerror = (err) => {
						console.error("[FrameRenderer] Failed to load background image:", imageUrl, err);
						reject(new Error(`Failed to load background image: ${imageUrl}`));
					};
					img.src = imageUrl;
				});

				// Draw the image using cover and center positioning
				const imgAspect = img.width / img.height;
				const canvasAspect = this.config.width / this.config.height;

				let drawWidth, drawHeight, drawX, drawY;

				if (imgAspect > canvasAspect) {
					drawHeight = this.config.height;
					drawWidth = drawHeight * imgAspect;
					drawX = (this.config.width - drawWidth) / 2;
					drawY = 0;
				} else {
					drawWidth = this.config.width;
					drawHeight = drawWidth / imgAspect;
					drawX = 0;
					drawY = (this.config.height - drawHeight) / 2;
				}

				bgCtx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
			} else if (wallpaper.startsWith("#")) {
				bgCtx.fillStyle = wallpaper;
				bgCtx.fillRect(0, 0, this.config.width, this.config.height);
			} else if (
				wallpaper.startsWith("linear-gradient") ||
				wallpaper.startsWith("radial-gradient")
			) {
				const parsedGradient = parseCssGradient(wallpaper);
				if (parsedGradient) {
					const gradient =
						parsedGradient.type === "linear"
							? (() => {
									const points = getLinearGradientPoints(
										resolveLinearGradientAngle(parsedGradient.descriptor),
										this.config.width,
										this.config.height,
									);

									return bgCtx.createLinearGradient(points.x0, points.y0, points.x1, points.y1);
								})()
							: (() => {
									const shape = getRadialGradientShape(
										parsedGradient.descriptor,
										this.config.width,
										this.config.height,
									);

									return bgCtx.createRadialGradient(
										shape.cx,
										shape.cy,
										0,
										shape.cx,
										shape.cy,
										shape.radius,
									);
								})();

					parsedGradient.stops.forEach((stop) => {
						gradient.addColorStop(stop.offset, stop.color);
					});

					bgCtx.fillStyle = gradient;
					bgCtx.fillRect(0, 0, this.config.width, this.config.height);
				} else {
					console.warn("[FrameRenderer] Could not parse gradient, using black fallback");
					bgCtx.fillStyle = "#000000";
					bgCtx.fillRect(0, 0, this.config.width, this.config.height);
				}
			} else {
				bgCtx.fillStyle = wallpaper;
				bgCtx.fillRect(0, 0, this.config.width, this.config.height);
			}
		} catch (error) {
			console.error("[FrameRenderer] Error setting up background, using fallback:", error);
			bgCtx.fillStyle = "#000000";
			bgCtx.fillRect(0, 0, this.config.width, this.config.height);
		}

		// Store the background canvas for compositing
		this.backgroundSprite = bgCanvas;
	}

	async renderFrame(
		videoFrame: VideoFrame,
		timestamp: number,
		webcamFrame?: VideoFrame | null,
	): Promise<void> {
		if (!this.app || !this.videoContainer || !this.cameraContainer) {
			throw new Error("Renderer not initialized");
		}

		this.currentVideoTime = timestamp / 1000000;

		// Create or update video sprite from VideoFrame
		if (!this.videoSprite) {
			const texture = Texture.from(videoFrame as unknown as TextureSourceLike);
			this.videoSprite = new Sprite(texture);
			this.videoContainer.addChild(this.videoSprite);
		} else {
			// Destroy old texture to avoid memory leaks, then create new one
			const oldTexture = this.videoSprite.texture;
			const newTexture = Texture.from(videoFrame as unknown as TextureSourceLike);
			this.videoSprite.texture = newTexture;
			oldTexture.destroy(true);
		}

		// Apply layout
		this.updateLayout(webcamFrame);

		const timeMs = this.currentVideoTime * 1000;
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

		// Apply transform once with maximum motion intensity from all ticks
		applyZoomTransform({
			cameraContainer: this.cameraContainer,
			blurFilter: this.blurFilter,
			motionBlurFilter: this.motionBlurFilter,
			stageSize: layoutCache.stageSize,
			baseMask: layoutCache.maskRect,
			zoomScale: this.animationState.scale,
			zoomProgress: this.animationState.progress,
			focusX: this.animationState.focusX,
			focusY: this.animationState.focusY,
			motionIntensity: maxMotionIntensity,
			isPlaying: true,
			motionBlurAmount: this.config.motionBlurAmount ?? 0,
			motionBlurState: this.motionBlurState,
			frameTimeMs: timeMs,
		});

		// Render the PixiJS stage to its canvas (video only, transparent background)
		this.app.renderer.render(this.app.stage);

		// Composite with shadows to final output canvas
		this.compositeWithShadows(webcamFrame);

		// Render annotations on top if present
		if (
			this.config.annotationRegions &&
			this.config.annotationRegions.length > 0 &&
			this.compositeCtx
		) {
			// Calculate scale factor based on export vs preview dimensions
			const previewWidth = this.config.previewWidth || 1920;
			const previewHeight = this.config.previewHeight || 1080;
			const scaleX = this.config.width / previewWidth;
			const scaleY = this.config.height / previewHeight;
			const scaleFactor = (scaleX + scaleY) / 2;

			await renderAnnotations(
				this.compositeCtx,
				this.config.annotationRegions,
				this.config.width,
				this.config.height,
				timeMs,
				scaleFactor,
			);
		}
	}

	private updateLayout(webcamFrame?: VideoFrame | null): void {
		if (!this.app || !this.videoSprite || !this.maskGraphics || !this.videoContainer) return;

		const { width, height } = this.config;
		const { cropRegion, borderRadius = 0, padding = 0 } = this.config;
		const videoWidth = this.config.videoWidth;
		const videoHeight = this.config.videoHeight;

		// Calculate cropped video dimensions
		const cropStartX = cropRegion.x;
		const cropStartY = cropRegion.y;
		const cropEndX = cropRegion.x + cropRegion.width;
		const cropEndY = cropRegion.y + cropRegion.height;

		const croppedVideoWidth = videoWidth * (cropEndX - cropStartX);
		const croppedVideoHeight = videoHeight * (cropEndY - cropStartY);

		// Calculate scale to fit in viewport
		// Padding is a percentage (0-100), where 50% ~ 0.8 scale
		// Vertical stack ignores padding — it's full-bleed
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

		// Cover mode: scale to fill the rect (may crop), otherwise fit-to-width
		let scale: number;
		if (compositeLayout.screenCover) {
			scale = Math.max(
				screenRect.width / croppedVideoWidth,
				screenRect.height / croppedVideoHeight,
			);
		} else {
			scale = screenRect.width / croppedVideoWidth;
		}

		// Position video sprite
		this.videoSprite.width = videoWidth * scale;
		this.videoSprite.height = videoHeight * scale;

		// Center the cropped region within the screenRect
		const croppedDisplayWidth = croppedVideoWidth * scale;
		const croppedDisplayHeight = croppedVideoHeight * scale;
		const coverOffsetX = (screenRect.width - croppedDisplayWidth) / 2;
		const coverOffsetY = (screenRect.height - croppedDisplayHeight) / 2;

		const cropPixelX = cropStartX * videoWidth * scale;
		const cropPixelY = cropStartY * videoHeight * scale;
		this.videoSprite.x = -cropPixelX + coverOffsetX;
		this.videoSprite.y = -cropPixelY + coverOffsetY;

		// Position video container
		this.videoContainer.x = screenRect.x;
		this.videoContainer.y = screenRect.y;

		// scale border radius by export/preview canvas ratio
		const previewWidth = this.config.previewWidth || 1920;
		const previewHeight = this.config.previewHeight || 1080;
		const canvasScaleFactor = Math.min(width / previewWidth, height / previewHeight);
		const scaledBorderRadius =
			compositeLayout.screenBorderRadius != null
				? compositeLayout.screenBorderRadius
				: compositeLayout.screenCover
					? 0
					: borderRadius * canvasScaleFactor;

		this.maskGraphics.clear();
		this.maskGraphics.roundRect(0, 0, screenRect.width, screenRect.height, scaledBorderRadius);
		this.maskGraphics.fill({ color: 0xffffff });

		// Cache layout info
		this.layoutCache = {
			stageSize: { width, height },
			videoSize: { width: croppedVideoWidth, height: croppedVideoHeight },
			baseScale: scale,
			baseOffset: { x: compositeLayout.screenRect.x, y: compositeLayout.screenRect.y },
			maskRect: compositeLayout.screenRect,
			webcamRect: compositeLayout.webcamRect,
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
		if (!this.cameraContainer || !this.layoutCache) return 0;

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

			// Apply adaptive smoothing for auto-follow mode
			if (region.focusMode === "auto" && !transition) {
				const raw = targetFocus;
				const dtMs = this.prevAnimationTimeMs != null ? timeMs - this.prevAnimationTimeMs : 0;
				const framesElapsed = dtMs > 0 ? dtMs / (1000 / 60) : 1;
				const isZoomingIn = targetProgress < 0.999 && targetProgress >= this.prevTargetProgress;
				if (targetProgress >= 0.999) {
					// Full zoom: adaptive smoothing — moves faster when far, decelerates when close
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
					// Zoom-in: track cursor directly so zoom always aims at current cursor
					// position; keep ref in sync to avoid snap when full-zoom begins
					this.smoothedAutoFocus = raw;
				} else {
					// Zoom-out: keep smoothing for continuity — avoids snap at zoom-out start
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

	// On Linux/Wayland the implicit GPU→2D texture-sharing path
	// used by drawImage(webglCanvas) can fail silently (EGL/Ozone),
	// producing green/empty frames. Explicit gl.readPixels always
	// copies from GPU to CPU memory, bypassing that path.
	private readbackVideoCanvas(): HTMLCanvasElement {
		const glCanvas = this.app!.canvas as HTMLCanvasElement;
		const gl =
			(glCanvas.getContext("webgl2") as WebGL2RenderingContext | null) ??
			(glCanvas.getContext("webgl") as WebGLRenderingContext | null);

		if (!gl || !this.rasterCanvas || !this.rasterCtx) {
			return glCanvas;
		}

		const w = glCanvas.width;
		const h = glCanvas.height;
		const buf = new Uint8Array(w * h * 4);
		gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);

		// readPixels returns rows bottom-to-top; flip vertically
		const rowSize = w * 4;
		const temp = new Uint8Array(rowSize);
		for (let top = 0, bot = h - 1; top < bot; top++, bot--) {
			const tOff = top * rowSize;
			const bOff = bot * rowSize;
			temp.set(buf.subarray(tOff, tOff + rowSize));
			buf.copyWithin(tOff, bOff, bOff + rowSize);
			buf.set(temp, bOff);
		}

		const imageData = new ImageData(new Uint8ClampedArray(buf.buffer), w, h);
		this.rasterCtx.putImageData(imageData, 0, 0);

		return this.rasterCanvas;
	}

	private compositeWithShadows(webcamFrame?: VideoFrame | null): void {
		if (!this.compositeCanvas || !this.compositeCtx || !this.app) return;

		const videoCanvas = this.isLinux
			? this.readbackVideoCanvas()
			: (this.app.canvas as HTMLCanvasElement);

		const ctx = this.compositeCtx;
		const w = this.compositeCanvas.width;
		const h = this.compositeCanvas.height;

		// Clear composite canvas
		ctx.clearRect(0, 0, w, h);

		// Step 1: Draw background layer (with optional blur, not affected by zoom)
		if (this.backgroundSprite) {
			const bgCanvas = this.backgroundSprite;

			if (this.config.showBlur) {
				ctx.save();
				ctx.filter = "blur(6px)"; // Canvas blur is weaker than CSS
				ctx.drawImage(bgCanvas, 0, 0, w, h);
				ctx.restore();
			} else {
				ctx.drawImage(bgCanvas, 0, 0, w, h);
			}
		} else {
			console.warn("[FrameRenderer] No background sprite found during compositing!");
		}

		// Draw video layer with shadows on top of background
		if (
			this.config.showShadow &&
			this.config.shadowIntensity > 0 &&
			this.shadowCanvas &&
			this.shadowCtx
		) {
			const shadowCtx = this.shadowCtx;
			shadowCtx.clearRect(0, 0, w, h);
			shadowCtx.save();

			// Calculate shadow parameters based on intensity (0-1)
			const intensity = this.config.shadowIntensity;
			const baseBlur1 = 48 * intensity;
			const baseBlur2 = 16 * intensity;
			const baseBlur3 = 8 * intensity;
			const baseAlpha1 = 0.7 * intensity;
			const baseAlpha2 = 0.5 * intensity;
			const baseAlpha3 = 0.3 * intensity;
			const baseOffset = 12 * intensity;

			shadowCtx.filter = `drop-shadow(0 ${baseOffset}px ${baseBlur1}px rgba(0,0,0,${baseAlpha1})) drop-shadow(0 ${baseOffset / 3}px ${baseBlur2}px rgba(0,0,0,${baseAlpha2})) drop-shadow(0 ${baseOffset / 6}px ${baseBlur3}px rgba(0,0,0,${baseAlpha3}))`;
			shadowCtx.drawImage(videoCanvas, 0, 0, w, h);
			shadowCtx.restore();
			ctx.drawImage(this.shadowCanvas, 0, 0, w, h);
		} else {
			ctx.drawImage(videoCanvas, 0, 0, w, h);
		}

		const webcamRect = this.layoutCache?.webcamRect ?? null;
		if (webcamFrame && webcamRect) {
			const preset = getWebcamLayoutPresetDefinition(this.config.webcamLayoutPreset);
			const shape = webcamRect.maskShape ?? this.config.webcamMaskShape ?? "rectangle";
			const sourceWidth =
				("displayWidth" in webcamFrame && webcamFrame.displayWidth > 0
					? webcamFrame.displayWidth
					: webcamFrame.codedWidth) || webcamRect.width;
			const sourceHeight =
				("displayHeight" in webcamFrame && webcamFrame.displayHeight > 0
					? webcamFrame.displayHeight
					: webcamFrame.codedHeight) || webcamRect.height;
			const sourceAspect = sourceWidth / sourceHeight;
			const targetAspect = webcamRect.width / webcamRect.height;
			const sourceCropWidth =
				sourceAspect > targetAspect ? Math.round(sourceHeight * targetAspect) : sourceWidth;
			const sourceCropHeight =
				sourceAspect > targetAspect ? sourceHeight : Math.round(sourceWidth / targetAspect);
			const sourceCropX = Math.max(0, Math.round((sourceWidth - sourceCropWidth) / 2));
			const sourceCropY = Math.max(0, Math.round((sourceHeight - sourceCropHeight) / 2));
			ctx.save();
			drawCanvasClipPath(
				ctx,
				webcamRect.x,
				webcamRect.y,
				webcamRect.width,
				webcamRect.height,
				shape,
				webcamRect.borderRadius,
			);
			if (preset.shadow) {
				ctx.shadowColor = preset.shadow.color;
				ctx.shadowBlur = preset.shadow.blur;
				ctx.shadowOffsetX = preset.shadow.offsetX;
				ctx.shadowOffsetY = preset.shadow.offsetY;
			}
			ctx.fillStyle = "#000000";
			ctx.fill();
			ctx.clip();
			ctx.drawImage(
				webcamFrame as unknown as CanvasImageSource,
				sourceCropX,
				sourceCropY,
				sourceCropWidth,
				sourceCropHeight,
				webcamRect.x,
				webcamRect.y,
				webcamRect.width,
				webcamRect.height,
			);
			ctx.restore();
		}
	}

	getCanvas(): HTMLCanvasElement {
		if (!this.compositeCanvas) {
			throw new Error("Renderer not initialized");
		}
		return this.compositeCanvas;
	}

	destroy(): void {
		if (this.videoSprite) {
			this.videoSprite.destroy();
			this.videoSprite = null;
		}
		this.backgroundSprite = null;
		if (this.app) {
			this.app.destroy(true, {
				children: true,
				texture: true,
				textureSource: true,
			});
			this.app = null;
		}
		this.cameraContainer = null;
		this.videoContainer = null;
		this.maskGraphics = null;
		this.blurFilter = null;
		this.motionBlurFilter = null;
		this.shadowCanvas = null;
		this.shadowCtx = null;
		this.compositeCanvas = null;
		this.compositeCtx = null;
		this.rasterCanvas = null;
		this.rasterCtx = null;
	}
}
