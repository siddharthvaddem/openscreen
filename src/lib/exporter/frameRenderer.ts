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
	CursorStyle,
	CursorTelemetryPoint,
	SpeedRegion,
	ZoomDepth,
	ZoomRegion,
} from "@/components/video-editor/types";
import { ZOOM_DEPTH_SCALES } from "@/components/video-editor/types";
import {
	DEFAULT_FOCUS,
	ZOOM_SCALE_DEADZONE,
	ZOOM_TRANSLATION_DEADZONE_PX,
} from "@/components/video-editor/videoPlayback/constants";
import { clampFocusToStage as clampFocusToStageUtil } from "@/components/video-editor/videoPlayback/focusUtils";
import { findDominantRegion } from "@/components/video-editor/videoPlayback/zoomRegionUtils";
import {
	applyZoomTransform,
	computeFocusFromTransform,
	computeZoomTransform,
	createMotionBlurState,
	type MotionBlurState,
} from "@/components/video-editor/videoPlayback/zoomTransform";
import { computeWebcamOverlayLayout } from "@/lib/webcamOverlay";
import { renderAnnotations } from "./annotationRenderer";

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
	webcamWidth?: number;
	webcamHeight?: number;
	annotationRegions?: AnnotationRegion[];
	speedRegions?: SpeedRegion[];
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
		isWindowCapture?: boolean;
	} | null;
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
	private config: FrameRenderConfig;
	private animationState: AnimationState;
	private layoutCache: LayoutCache | null = null;
	private currentVideoTime = 0;
	private motionBlurState: MotionBlurState = createMotionBlurState();

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
		this.compositeCtx = this.compositeCanvas.getContext("2d", { willReadFrequently: false });

		if (!this.compositeCtx) {
			throw new Error("Failed to get 2D context for composite canvas");
		}

		// Setup shadow canvas if needed
		if (this.config.showShadow) {
			this.shadowCanvas = document.createElement("canvas");
			this.shadowCanvas.width = this.config.width;
			this.shadowCanvas.height = this.config.height;
			this.shadowCtx = this.shadowCanvas.getContext("2d", { willReadFrequently: false });

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
				const gradientMatch = wallpaper.match(/(linear|radial)-gradient\((.+)\)/);
				if (gradientMatch) {
					const [, type, params] = gradientMatch;
					const parts = params.split(",").map((s) => s.trim());

					let gradient: CanvasGradient;

					if (type === "linear") {
						gradient = bgCtx.createLinearGradient(0, 0, 0, this.config.height);
						parts.forEach((part, index) => {
							if (part.startsWith("to ") || part.includes("deg")) return;

							const colorMatch = part.match(/^(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|[a-z]+)/);
							if (colorMatch) {
								const color = colorMatch[1];
								const position = index / (parts.length - 1);
								gradient.addColorStop(position, color);
							}
						});
					} else {
						const cx = this.config.width / 2;
						const cy = this.config.height / 2;
						const radius = Math.max(this.config.width, this.config.height) / 2;
						gradient = bgCtx.createRadialGradient(cx, cy, 0, cx, cy, radius);

						parts.forEach((part, index) => {
							const colorMatch = part.match(/^(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|[a-z]+)/);
							if (colorMatch) {
								const color = colorMatch[1];
								const position = index / (parts.length - 1);
								gradient.addColorStop(position, color);
							}
						});
					}

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
		this.updateLayout();

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

		// Render cursor overlay on top of everything
		if (this.config.showCursorHighlight && this.compositeCtx) {
			this.renderCursor(this.compositeCtx, timeMs);
		}
	}

	private updateLayout(): void {
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
		const paddingScale = 1.0 - (padding / 100) * 0.4;
		const viewportWidth = width * paddingScale;
		const viewportHeight = height * paddingScale;
		const scale = Math.min(viewportWidth / croppedVideoWidth, viewportHeight / croppedVideoHeight);

		// Position video sprite
		this.videoSprite.width = videoWidth * scale;
		this.videoSprite.height = videoHeight * scale;

		const cropPixelX = cropStartX * videoWidth * scale;
		const cropPixelY = cropStartY * videoHeight * scale;
		this.videoSprite.x = -cropPixelX;
		this.videoSprite.y = -cropPixelY;

		// Position video container
		const croppedDisplayWidth = croppedVideoWidth * scale;
		const croppedDisplayHeight = croppedVideoHeight * scale;
		const centerOffsetX = (width - croppedDisplayWidth) / 2;
		const centerOffsetY = (height - croppedDisplayHeight) / 2;
		this.videoContainer.x = centerOffsetX;
		this.videoContainer.y = centerOffsetY;

		// scale border radius by export/preview canvas ratio
		const previewWidth = this.config.previewWidth || 1920;
		const previewHeight = this.config.previewHeight || 1080;
		const canvasScaleFactor = Math.min(width / previewWidth, height / previewHeight);
		const scaledBorderRadius = borderRadius * canvasScaleFactor;

		this.maskGraphics.clear();
		this.maskGraphics.roundRect(
			0,
			0,
			croppedDisplayWidth,
			croppedDisplayHeight,
			scaledBorderRadius,
		);
		this.maskGraphics.fill({ color: 0xffffff });

		// Cache layout info
		this.layoutCache = {
			stageSize: { width, height },
			videoSize: { width: croppedVideoWidth, height: croppedVideoHeight },
			baseScale: scale,
			baseOffset: { x: centerOffsetX, y: centerOffsetY },
			maskRect: { x: 0, y: 0, width: croppedDisplayWidth, height: croppedDisplayHeight },
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
			{ connectZooms: true },
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

		return Math.max(
			Math.abs(appliedScale - prevScale),
			Math.abs(appliedX - prevX) / Math.max(1, this.layoutCache.stageSize.width),
			Math.abs(appliedY - prevY) / Math.max(1, this.layoutCache.stageSize.height),
		);
	}

	private compositeWithShadows(webcamFrame?: VideoFrame | null): void {
		if (!this.compositeCanvas || !this.compositeCtx || !this.app) return;

		const videoCanvas = this.app.canvas as HTMLCanvasElement;
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

		if (webcamFrame && this.config.webcamWidth && this.config.webcamHeight) {
			const layout = computeWebcamOverlayLayout({
				stageWidth: w,
				stageHeight: h,
				videoWidth: this.config.webcamWidth,
				videoHeight: this.config.webcamHeight,
			});

			if (layout) {
				ctx.save();
				ctx.beginPath();
				ctx.roundRect(layout.x, layout.y, layout.width, layout.height, layout.borderRadius);
				ctx.closePath();
				ctx.shadowColor = "rgba(0,0,0,0.35)";
				ctx.shadowBlur = 24;
				ctx.shadowOffsetY = 10;
				ctx.fillStyle = "#000000";
				ctx.fill();
				ctx.clip();
				ctx.drawImage(
					webcamFrame as unknown as CanvasImageSource,
					layout.x,
					layout.y,
					layout.width,
					layout.height,
				);
				ctx.restore();
			}
		}
	}

	// ── Cursor overlay ──────────────────────────────────────────────────

	private interpolateCursorPosition(timeMs: number): { cx: number; cy: number } | null {
		return interpolateCursorPosition(this.config.cursorTelemetry, timeMs);
	}

	private renderCursor(ctx: CanvasRenderingContext2D, timeMs: number): void {
		if (!this.layoutCache) return;

		const pos = this.interpolateCursorPosition(timeMs);
		if (!pos) return;

		// For window captures, remap from display-normalized to work-area-normalized coords.
		// For screen captures, coords are already correct — video shows the full display.
		let { cx, cy } = pos;
		const di = this.config.cursorDisplayInfo;
		if (di && di.isWindowCapture && di.boundsWidth > 0 && di.boundsHeight > 0) {
			const absX = cx * di.boundsWidth + di.boundsX;
			const absY = cy * di.boundsHeight + di.boundsY;
			const waW = Math.max(1, di.workAreaWidth);
			const waH = Math.max(1, di.workAreaHeight);
			cx = (absX - di.workAreaX) / waW;
			cy = (absY - di.workAreaY) / waH;
		}
		const { cropRegion } = this.config;

		// Check if cursor is inside the visible crop region
		if (
			cx < cropRegion.x ||
			cx > cropRegion.x + cropRegion.width ||
			cy < cropRegion.y ||
			cy > cropRegion.y + cropRegion.height
		) {
			return;
		}

		// Map normalized video coords → base layout coords
		const relCropX = (cx - cropRegion.x) / cropRegion.width;
		const relCropY = (cy - cropRegion.y) / cropRegion.height;
		const baseX = this.layoutCache.baseOffset.x + relCropX * this.layoutCache.maskRect.width;
		const baseY = this.layoutCache.baseOffset.y + relCropY * this.layoutCache.maskRect.height;

		// Apply zoom transform
		const finalX = baseX * this.animationState.appliedScale + this.animationState.x;
		const finalY = baseY * this.animationState.appliedScale + this.animationState.y;

		// Bounds check — skip if cursor center is outside the canvas
		if (finalX < 0 || finalX > this.config.width || finalY < 0 || finalY > this.config.height) {
			return;
		}

		// Scale cursor/highlight sizes proportionally to export resolution
		// Use average of X and Y scales to match annotation scaling (frameRenderer.ts:395)
		const previewWidth = this.config.previewWidth || 1920;
		const previewHeight = this.config.previewHeight || 1080;
		const scaleX = this.config.width / previewWidth;
		const scaleY = this.config.height / previewHeight;
		const canvasScaleFactor = (scaleX + scaleY) / 2;

		// Clip to the rounded video mask so cursor doesn't bleed outside the video area
		const mask = this.layoutCache.maskRect;
		const zoomScale = this.animationState.appliedScale;
		const zoomX = this.animationState.x;
		const zoomY = this.animationState.y;
		const clipX = this.layoutCache.baseOffset.x * zoomScale + zoomX;
		const clipY = this.layoutCache.baseOffset.y * zoomScale + zoomY;
		const clipW = mask.width * zoomScale;
		const clipH = mask.height * zoomScale;

		const previewW = this.config.previewWidth || 1920;
		const previewH = this.config.previewHeight || 1080;
		const canvasScale = Math.min(this.config.width / previewW, this.config.height / previewH);
		const scaledBorderRadius = (this.config.borderRadius ?? 0) * canvasScale * zoomScale;

		ctx.save();
		ctx.beginPath();
		ctx.roundRect(clipX, clipY, clipW, clipH, scaledBorderRadius);
		ctx.clip();

		// Draw cursor shape
		const size = (this.config.cursorSize ?? 32) * canvasScaleFactor;
		const color = this.config.cursorColor ?? "#ffffff";
		const opacity = this.config.cursorOpacity ?? 1;
		const strokeWidth = (this.config.cursorStrokeWidth ?? 2) * canvasScaleFactor;
		ctx.globalAlpha = opacity;
		switch (this.config.cursorStyle) {
			case "dot":
				drawDotCursor(ctx, finalX, finalY, size, color);
				break;
			case "circle":
				drawCircleCursor(ctx, finalX, finalY, size, color, strokeWidth);
				break;
			case "ring":
				drawRingCursor(ctx, finalX, finalY, size, color, strokeWidth);
				break;
			case "glow":
				drawGlowCursor(ctx, finalX, finalY, size, color, opacity);
				break;
			default:
				drawDotCursor(ctx, finalX, finalY, size, color);
		}
		ctx.globalAlpha = 1;

		ctx.restore();
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
			this.app.destroy(true, { children: true, texture: true, textureSource: true });
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
	}
}

// ── Cursor utilities (exported for testing) ───────────────────────────

export function interpolateCursorPosition(
	samples: CursorTelemetryPoint[] | undefined,
	timeMs: number,
): { cx: number; cy: number } | null {
	if (!samples || samples.length === 0) return null;

	// Single sample
	if (samples.length === 1) {
		return { cx: samples[0].cx, cy: samples[0].cy };
	}

	// Clamp to first/last sample if out of range
	if (timeMs <= samples[0].timeMs) {
		return { cx: samples[0].cx, cy: samples[0].cy };
	}
	if (timeMs >= samples[samples.length - 1].timeMs) {
		const last = samples[samples.length - 1];
		return { cx: last.cx, cy: last.cy };
	}

	// Binary search for bracketing samples
	let lo = 0;
	let hi = samples.length - 1;
	while (lo < hi - 1) {
		const mid = Math.floor((lo + hi) / 2);
		if (samples[mid].timeMs <= timeMs) lo = mid;
		else hi = mid;
	}

	const a = samples[lo];
	const b = samples[hi];
	const dt = b.timeMs - a.timeMs;

	// Guard against duplicate timestamps
	if (dt === 0) return { cx: a.cx, cy: a.cy };

	const t = Math.max(0, Math.min(1, (timeMs - a.timeMs) / dt));
	return {
		cx: a.cx + (b.cx - a.cx) * t,
		cy: a.cy + (b.cy - a.cy) * t,
	};
}

export function hexToRgba(hex: string, alpha: number): string {
	if (typeof hex !== "string" || !/^#[0-9a-fA-F]{6}$/.test(hex)) {
		return `rgba(255,255,255,${alpha})`;
	}
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	return `rgba(${r},${g},${b},${alpha})`;
}

function drawDotCursor(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	color: string,
): void {
	ctx.save();
	ctx.shadowColor = "rgba(0,0,0,0.5)";
	ctx.shadowBlur = 6;
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.arc(x, y, size / 4, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
}

function drawCircleCursor(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	color: string,
	strokeWidth = 2,
): void {
	ctx.save();
	ctx.strokeStyle = color;
	ctx.lineWidth = strokeWidth;
	ctx.shadowColor = "rgba(0,0,0,0.4)";
	ctx.shadowBlur = 4;
	ctx.beginPath();
	ctx.arc(x, y, size / 3, 0, Math.PI * 2);
	ctx.stroke();
	ctx.restore();
}

function drawRingCursor(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	color: string,
	strokeWidth = 2,
): void {
	// Center dot radius scales with strokeWidth (radius = strokeWidth * 1.5)
	const dotRadius = strokeWidth * 1.5;
	ctx.save();
	ctx.shadowColor = "rgba(0,0,0,0.5)";
	ctx.shadowBlur = 6;
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
	drawCircleCursor(ctx, x, y, size, color, strokeWidth);
}

function drawGlowCursor(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	color: string,
	opacity: number,
): void {
	// Glow renders 1.5x bigger than size for softer spread
	const radius = (size * 1.5) / 2;
	ctx.save();
	ctx.globalAlpha = 1; // alpha is baked into the gradient stops
	const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
	// Softer center — peak alpha is 70% of opacity
	gradient.addColorStop(0, hexToRgba(color, opacity * 0.7));
	gradient.addColorStop(0.3, hexToRgba(color, opacity * 0.4));
	gradient.addColorStop(0.7, hexToRgba(color, opacity * 0.12));
	gradient.addColorStop(1, hexToRgba(color, 0));
	ctx.fillStyle = gradient;
	ctx.beginPath();
	ctx.arc(x, y, radius, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
}
