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
	Rotation3D,
	SpeedRegion,
	WebcamLayoutPreset,
	WebcamSizePreset,
	ZoomRegion,
} from "@/components/video-editor/types";
import {
	DEFAULT_ROTATION_3D,
	getZoomScale,
	isRotation3DIdentity,
	lerpRotation3D,
} from "@/components/video-editor/types";
import {
	AUTO_FOLLOW_PARAMS,
	DEFAULT_FOCUS,
} from "@/components/video-editor/videoPlayback/constants";
import { advanceFollowFocus } from "@/components/video-editor/videoPlayback/cursorFollowUtils";
import { clampFocusToScale } from "@/components/video-editor/videoPlayback/focusUtils";
import { findDominantRegion } from "@/components/video-editor/videoPlayback/zoomRegionUtils";
import {
	createZoomSpringState,
	resetZoomSpring,
	stepZoomSpring,
} from "@/components/video-editor/videoPlayback/zoomSpring";
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
	reactiveWebcamScale,
	type Size,
	type StyledRenderRect,
} from "@/lib/compositeLayout";
import { getSmoothedCursorPath } from "@/lib/cursor/cursorPathSmoothing";
import {
	createNativeCursorMotionBlurState,
	getNativeCursorClickBounceProgress,
	getNativeCursorClickBounceScale,
	getNativeCursorMotionBlurPx,
	projectNativeCursorToLocal,
	resetNativeCursorMotionBlurState,
	resolveInterpolatedNativeCursorFrame,
	resolveNativeCursorRenderAsset,
} from "@/lib/cursor/nativeCursor";
import { BackgroundLoadError, classifyWallpaper, resolveImageWallpaperUrl } from "@/lib/wallpaper";
import { drawCanvasClipPath } from "@/lib/webcamMaskShapes";
import type { CursorRecordingData } from "@/native/contracts";
import { renderAnnotations } from "./annotationRenderer";
import {
	getLinearGradientPoints,
	getRadialGradientShape,
	parseCssGradient,
	resolveLinearGradientAngle,
} from "./gradientParser";
import { createThreeDPass, type ThreeDPass } from "./threeDPass";
import { drawWebcamFrameImage } from "./webcamFrameDrawing";

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
	cursorRecordingData?: CursorRecordingData | null;
	cursorScale?: number;
	cursorSmoothing?: number;
	cursorMotionBlur?: number;
	cursorClickBounce?: number;
	cursorClipToBounds?: boolean;
	cursorTheme?: string;
	videoWidth: number;
	videoHeight: number;
	webcamSize?: Size | null;
	webcamLayoutPreset?: WebcamLayoutPreset;
	webcamMaskShape?: import("@/components/video-editor/types").WebcamMaskShape;
	webcamMirrored?: boolean;
	webcamReactiveZoom?: boolean;
	webcamSizePreset?: WebcamSizePreset;
	webcamPosition?: { cx: number; cy: number } | null;
	annotationRegions?: AnnotationRegion[];
	speedRegions?: SpeedRegion[];
	previewWidth?: number;
	previewHeight?: number;
	cursorTelemetry?: import("@/components/video-editor/types").CursorTelemetryPoint[];
	cursorClickTimestamps?: number[];
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
	maskBorderRadius: number;
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
	private foregroundCanvas: HTMLCanvasElement | null = null;
	private foregroundCtx: CanvasRenderingContext2D | null = null;
	private rasterCanvas: HTMLCanvasElement | null = null;
	private rasterCtx: CanvasRenderingContext2D | null = null;
	private threeDPass: ThreeDPass | null = null;
	private currentRotation3D: Rotation3D = { ...DEFAULT_ROTATION_3D };
	private cursorImageCache = new Map<string, HTMLImageElement>();
	private warnedKeys = new Set<string>();
	private config: FrameRenderConfig;
	private animationState: AnimationState;
	private layoutCache: LayoutCache | null = null;
	private currentVideoTime = 0;
	private motionBlurState: MotionBlurState = createMotionBlurState();
	private nativeCursorMotionBlurState = createNativeCursorMotionBlurState();
	private smoothedAutoFocus: { cx: number; cy: number } | null = null;
	private prevAnimationTimeMs: number | null = null;
	private zoomSpringState = createZoomSpringState();
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
		const canvas = document.createElement("canvas");
		canvas.width = this.config.width;
		canvas.height = this.config.height;

		// colorSpace isn't available on all platforms
		try {
			if (canvas && "colorSpace" in canvas) {
				canvas.colorSpace = "srgb";
			}
		} catch (error) {
			console.warn("[FrameRenderer] colorSpace not supported on this platform:", error);
		}

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

		this.cameraContainer = new Container();
		this.videoContainer = new Container();
		this.app.stage.addChild(this.cameraContainer);
		this.cameraContainer.addChild(this.videoContainer);

		// Background renders separately, not in PixiJS
		await this.setupBackground();

		this.blurFilter = new BlurFilter();
		this.blurFilter.quality = 5;
		this.blurFilter.resolution = this.app.renderer.resolution;
		this.blurFilter.blur = 0;
		this.motionBlurFilter = new MotionBlurFilter([0, 0], 5, 0);
		this.videoContainer.filters = [this.blurFilter, this.motionBlurFilter];

		// Composite canvas: final output with shadows
		this.compositeCanvas = document.createElement("canvas");
		this.compositeCanvas.width = this.config.width;
		this.compositeCanvas.height = this.config.height;

		// On Linux getImageData() runs frequently, so hint frequent CPU readback
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

		// Foreground (transparent): recording + shadow + webcam + cursor + annotations.
		// The 3D pass operates only on this layer so the wallpaper stays flat behind it.
		this.foregroundCanvas = document.createElement("canvas");
		this.foregroundCanvas.width = this.config.width;
		this.foregroundCanvas.height = this.config.height;
		this.foregroundCtx = this.foregroundCanvas.getContext("2d", {
			willReadFrequently: this.isLinux,
		});
		if (!this.foregroundCtx) {
			throw new Error("Failed to get 2D context for foreground canvas");
		}

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

		this.maskGraphics = new Graphics();
		this.videoContainer.addChild(this.maskGraphics);
		this.videoContainer.mask = this.maskGraphics;

		try {
			this.threeDPass = createThreeDPass(this.config.width, this.config.height);
		} catch (error) {
			console.warn("[FrameRenderer] 3D pass unavailable, rotation fields will be ignored:", error);
			this.threeDPass = null;
		}
	}

	private async setupBackground(): Promise<void> {
		const wallpaper = this.config.wallpaper;

		const bgCanvas = document.createElement("canvas");
		bgCanvas.width = this.config.width;
		bgCanvas.height = this.config.height;
		const bgCtx = bgCanvas.getContext("2d")!;

		const classified = classifyWallpaper(wallpaper);

		if (classified.kind === "color") {
			bgCtx.fillStyle = classified.value;
			bgCtx.fillRect(0, 0, this.config.width, this.config.height);
		} else if (classified.kind === "gradient") {
			const parsedGradient = parseCssGradient(classified.value);
			if (!parsedGradient) {
				throw new BackgroundLoadError(classified.value);
			}
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
			const imageUrl = resolveImageWallpaperUrl(classified.path);
			const img = new Image();
			if (imageUrl.startsWith("http") && !imageUrl.startsWith(window.location.origin)) {
				img.crossOrigin = "anonymous";
			}

			try {
				await new Promise<void>((resolve, reject) => {
					img.onload = () => resolve();
					img.onerror = (err) => reject(err);
					img.src = imageUrl;
				});
			} catch (err) {
				throw new BackgroundLoadError(imageUrl, err);
			}

			const imgAspect = img.width / img.height;
			const canvasAspect = this.config.width / this.config.height;

			let drawWidth: number;
			let drawHeight: number;
			let drawX: number;
			let drawY: number;

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
		}

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

		if (!this.videoSprite) {
			const texture = Texture.from(videoFrame as unknown as TextureSourceLike);
			this.videoSprite = new Sprite(texture);
			this.videoContainer.addChild(this.videoSprite);
		} else {
			// Destroy old texture before swapping to avoid a leak
			const oldTexture = this.videoSprite.texture;
			const newTexture = Texture.from(videoFrame as unknown as TextureSourceLike);
			this.videoSprite.texture = newTexture;
			oldTexture.destroy(true);
		}

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

		// Feed the spring-smoothed transform (appliedScale/x/y) via transformOverride, like the
		// preview. Without it applyZoomTransform recomputes the camera from the raw eased target and
		// the spring is discarded, so the export snaps to the target every frame while the preview
		// glides (very visible for auto-focus, whose target pans with the cursor). It also keeps the
		// camera, mask, and cursor (which already read appliedScale/x/y) consistent.
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
			transformOverride: {
				scale: this.animationState.appliedScale,
				x: this.animationState.x,
				y: this.animationState.y,
			},
		});

		// Render the PixiJS stage (video only, transparent background)
		this.app.renderer.render(this.app.stage);

		// Skip baking the shadow when the rotation pass will run; bilinear sampling would
		// alias it to a hard edge. Re-applied fresh after rotation.
		const willRotate = !isRotation3DIdentity(this.currentRotation3D);
		this.compositeWithShadows(webcamFrame, !willRotate);

		await this.drawNativeCursor(timeMs);

		// Annotations go on top of foreground so they rotate with the recording
		if (
			this.config.annotationRegions &&
			this.config.annotationRegions.length > 0 &&
			this.foregroundCtx
		) {
			const previewWidth = this.config.previewWidth ?? this.config.width;
			const previewHeight = this.config.previewHeight ?? this.config.height;
			const scaleX = this.config.width / previewWidth;
			const scaleY = this.config.height / previewHeight;
			const scaleFactor = (scaleX + scaleY) / 2;

			await renderAnnotations(
				this.foregroundCtx,
				this.config.annotationRegions,
				this.config.width,
				this.config.height,
				timeMs,
				scaleFactor,
			);
		}

		// Rotate foreground only; wallpaper (on compositeCanvas) stays untouched
		if (willRotate && this.threeDPass && this.foregroundCanvas && this.foregroundCtx) {
			const passCanvas = this.threeDPass.apply(this.foregroundCanvas, this.currentRotation3D);
			const w = this.foregroundCanvas.width;
			const h = this.foregroundCanvas.height;
			this.foregroundCtx.clearRect(0, 0, w, h);
			if (this.isLinux) {
				// drawImage(webglCanvas) is unreliable on Linux/Wayland, so use readPixels
				const pixels = this.threeDPass.readPixels();
				const imageData = this.foregroundCtx.createImageData(w, h);
				imageData.data.set(pixels);
				this.foregroundCtx.putImageData(imageData, 0, 0);
			} else {
				this.foregroundCtx.drawImage(passCanvas, 0, 0);
			}
		}

		// Apply shadow fresh on the rotated silhouette. Flat path already baked it in
		// compositeWithShadows, so guard on willRotate to avoid doubling. Same 3-layer
		// filter chain as the flat path to keep the soft Gaussian intact.
		if (
			willRotate &&
			this.config.showShadow &&
			this.config.shadowIntensity > 0 &&
			this.shadowCanvas &&
			this.shadowCtx &&
			this.foregroundCanvas
		) {
			const shadowCtx = this.shadowCtx;
			const w = this.foregroundCanvas.width;
			const h = this.foregroundCanvas.height;
			shadowCtx.clearRect(0, 0, w, h);
			shadowCtx.save();
			const intensity = this.config.shadowIntensity;
			const baseBlur1 = 48 * intensity;
			const baseBlur2 = 16 * intensity;
			const baseBlur3 = 8 * intensity;
			const baseAlpha1 = 0.7 * intensity;
			const baseAlpha2 = 0.5 * intensity;
			const baseAlpha3 = 0.3 * intensity;
			const baseOffset = 12 * intensity;
			shadowCtx.filter = `drop-shadow(0 ${baseOffset}px ${baseBlur1}px rgba(0,0,0,${baseAlpha1})) drop-shadow(0 ${baseOffset / 3}px ${baseBlur2}px rgba(0,0,0,${baseAlpha2})) drop-shadow(0 ${baseOffset / 6}px ${baseBlur3}px rgba(0,0,0,${baseAlpha3}))`;
			shadowCtx.drawImage(this.foregroundCanvas, 0, 0, w, h);
			shadowCtx.restore();
			if (this.compositeCtx) {
				this.compositeCtx.drawImage(this.shadowCanvas, 0, 0);
			}
		} else if (this.compositeCtx && this.foregroundCanvas) {
			// Flat path or 3D-without-shadow: stamp foreground directly
			this.compositeCtx.drawImage(this.foregroundCanvas, 0, 0);
		}
	}

	// Video's on-screen boundary including the zoom camera transform. The PIXI mask
	// lives inside cameraContainer, so during zoom the visible video extends beyond
	// the static maskRect and a static clip would crop it. Mirrors the preview.
	private cameraAwareMaskRect() {
		if (!this.layoutCache) return null;
		const { x: maskX, y: maskY, width: maskW, height: maskH } = this.layoutCache.maskRect;
		const camS = this.animationState.appliedScale;
		const camX = this.animationState.x;
		const camY = this.animationState.y;
		// No stage clamping: the canvas clips to its own bounds, matching CSS inset().
		// Clamping x/y would pin rounded corners to the stage edge instead of the true
		// mask boundary, mismatching preview/export when zoom/pan pushes the mask off-stage.
		return {
			x: camX + camS * maskX,
			y: camY + camS * maskY,
			width: camS * maskW,
			height: camS * maskH,
			br: this.layoutCache.maskBorderRadius * camS,
		};
	}

	private async drawNativeCursor(timeMs: number) {
		if (!this.foregroundCtx || !this.layoutCache) {
			return;
		}

		if ((this.config.cursorScale ?? 1) <= 0) {
			resetNativeCursorMotionBlurState(this.nativeCursorMotionBlurState);
			return;
		}

		const activeNativeCursor = resolveInterpolatedNativeCursorFrame(
			this.config.cursorRecordingData,
			timeMs,
		);
		if (!activeNativeCursor) {
			resetNativeCursorMotionBlurState(this.nativeCursorMotionBlurState);
			return;
		}
		// Position comes from the precomputed smoothed path (deterministic, matches preview);
		// the frame still supplies the cursor image, type, and click timing.
		const smoothedPos = getSmoothedCursorPath(
			this.config.cursorRecordingData,
			this.config.cursorSmoothing ?? 0,
		)?.sampleAt(timeMs);
		const displaySample = smoothedPos
			? { ...activeNativeCursor.sample, cx: smoothedPos.cx, cy: smoothedPos.cy }
			: activeNativeCursor.sample;

		const projectedPoint = projectNativeCursorToLocal({
			cropRegion: this.config.cropRegion,
			maskRect: this.layoutCache.maskRect,
			sample: displaySample,
		});
		if (!projectedPoint) {
			resetNativeCursorMotionBlurState(this.nativeCursorMotionBlurState);
			return;
		}

		const renderAsset = resolveNativeCursorRenderAsset(
			activeNativeCursor.asset,
			1,
			displaySample,
			this.config.cursorTheme,
		);
		let image: HTMLImageElement;
		try {
			image = await this.getCursorImage(renderAsset);
		} catch (error) {
			this.warnOnce("native-cursor-image-load", "Failed to load native cursor asset", error);
			return;
		}
		const scale =
			Math.max(0, this.config.cursorScale ?? 1) *
			getNativeCursorClickBounceScale(
				this.config.cursorClickBounce ?? 0,
				getNativeCursorClickBounceProgress(this.config.cursorRecordingData, timeMs),
			);
		const appliedScale = this.animationState.appliedScale;
		// Normalize cursor size to the same fraction of video width as the preview;
		// both paths use maskRect.width / croppedVideoWidth.
		const sizeNorm =
			this.layoutCache.videoSize.width > 0
				? this.layoutCache.maskRect.width / this.layoutCache.videoSize.width
				: 1;
		const canvasX = projectedPoint.x * appliedScale + this.animationState.x;
		const canvasY = projectedPoint.y * appliedScale + this.animationState.y;
		const blurPx = getNativeCursorMotionBlurPx({
			motionBlur: this.config.cursorMotionBlur ?? 0,
			point: { x: canvasX, y: canvasY },
			state: this.nativeCursorMotionBlurState,
			timeMs,
		});
		// Clip only when explicitly enabled; by default the cursor may overflow the canvas
		const cursorClip = this.config.cursorClipToBounds === true ? this.cameraAwareMaskRect() : null;
		this.foregroundCtx.save();
		this.foregroundCtx.beginPath();
		if (cursorClip) {
			this.foregroundCtx.roundRect(
				cursorClip.x,
				cursorClip.y,
				cursorClip.width,
				cursorClip.height,
				cursorClip.br,
			);
			this.foregroundCtx.clip();
		}
		const previousFilter = this.foregroundCtx.filter;
		if (blurPx > 0) {
			this.foregroundCtx.filter = `blur(${blurPx.toFixed(2)}px)`;
		}
		this.foregroundCtx.drawImage(
			image,
			canvasX - renderAsset.hotspotX * scale * appliedScale * sizeNorm,
			canvasY - renderAsset.hotspotY * scale * appliedScale * sizeNorm,
			renderAsset.width * scale * appliedScale * sizeNorm,
			renderAsset.height * scale * appliedScale * sizeNorm,
		);
		this.foregroundCtx.filter = previousFilter;
		this.foregroundCtx.restore();
	}

	private async getCursorImage(asset: { id: string; imageDataUrl: string }) {
		const cachedImage = this.cursorImageCache.get(asset.id);
		if (cachedImage) {
			return cachedImage;
		}

		const image = new Image();
		await new Promise<void>((resolve, reject) => {
			image.onload = () => resolve();
			image.onerror = () => reject(new Error(`Failed to load cursor asset ${asset.id}`));
			image.src = asset.imageDataUrl;
		});

		this.cursorImageCache.set(asset.id, image);
		return image;
	}

	private warnOnce(key: string, message: string, error: unknown) {
		if (this.warnedKeys.has(key)) {
			return;
		}
		this.warnedKeys.add(key);
		console.warn(`[FrameRenderer] ${message}:`, error);
	}

	private updateLayout(webcamFrame?: VideoFrame | null): void {
		if (!this.app || !this.videoSprite || !this.maskGraphics || !this.videoContainer) return;

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

		// Padding is a percentage (0-100), where 50% ~ 0.8 scale.
		// Vertical stack is full-bleed, so it ignores padding.
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

		// Cover mode scales to fill the rect (may crop), otherwise fit-to-width
		let scale: number;
		if (compositeLayout.screenCover) {
			scale = Math.max(
				screenRect.width / croppedVideoWidth,
				screenRect.height / croppedVideoHeight,
			);
		} else {
			scale = screenRect.width / croppedVideoWidth;
		}

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

		this.videoContainer.x = screenRect.x;
		this.videoContainer.y = screenRect.y;

		// Scale border radius by the export/preview canvas ratio
		const previewWidth = this.config.previewWidth ?? this.config.width;
		const previewHeight = this.config.previewHeight ?? this.config.height;
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

		// baseOffset is the stage position of the full (uncropped) sprite's top-left, matching
		// preview semantics, so consumers (e.g. cursor highlight) can map normalized
		// recording-space coords to stage coords uniformly:
		//   stagePos = baseOffset + (cx, cy) * (videoWidth, videoHeight) * baseScale
		this.layoutCache = {
			stageSize: { width, height },
			videoSize: { width: croppedVideoWidth, height: croppedVideoHeight },
			baseScale: scale,
			baseOffset: {
				x: compositeLayout.screenRect.x + coverOffsetX - cropPixelX,
				y: compositeLayout.screenRect.y + coverOffsetY - cropPixelY,
			},
			maskRect: compositeLayout.screenRect,
			maskBorderRadius: scaledBorderRadius,
			webcamRect: compositeLayout.webcamRect,
		};
	}

	private updateAnimationState(timeMs: number): number {
		if (!this.cameraContainer || !this.layoutCache) return 0;

		const { region, strength, blendedScale, rotation3D, transition } = findDominantRegion(
			this.config.zoomRegions,
			timeMs,
			{ connectZooms: true, cursorTelemetry: this.config.cursorTelemetry },
		);

		const defaultFocus = DEFAULT_FOCUS;
		let targetScaleFactor = 1;
		let targetFocus = { ...defaultFocus };
		let targetProgress = 0;

		this.currentRotation3D =
			region && strength > 0
				? lerpRotation3D(DEFAULT_ROTATION_3D, rotation3D, strength)
				: { ...DEFAULT_ROTATION_3D };

		if (region && strength > 0) {
			const zoomScale = blendedScale ?? getZoomScale(region);
			const regionFocus = clampFocusToScale(region.focus, zoomScale);

			targetScaleFactor = zoomScale;
			targetFocus = regionFocus;
			targetProgress = strength;

			// Adaptive smoothing for auto-follow mode
			if (region.focusMode === "auto" && !transition) {
				const raw = targetFocus;
				const dtMs = this.prevAnimationTimeMs != null ? timeMs - this.prevAnimationTimeMs : 0;
				const isZoomingIn = targetProgress < 0.999 && targetProgress >= this.prevTargetProgress;
				if (targetProgress >= 0.999) {
					// Full zoom: move faster when far, decelerate when close
					const prev = this.smoothedAutoFocus ?? raw;
					const smoothed = advanceFollowFocus(prev, raw, dtMs, AUTO_FOLLOW_PARAMS);
					this.smoothedAutoFocus = smoothed;
					targetFocus = smoothed;
				} else if (isZoomingIn) {
					// Track cursor directly while zooming in; keep ref in sync to avoid a snap
					// when full-zoom begins
					this.smoothedAutoFocus = raw;
				} else {
					// Zoom-out: keep smoothing to avoid a snap at the start
					const prev = this.smoothedAutoFocus ?? raw;
					const smoothed = advanceFollowFocus(prev, raw, dtMs, AUTO_FOLLOW_PARAMS);
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

		// Spring-chase the eased target (same as preview) so exported motion glides past the jerk
		// at the steep start of the ease. Stepped by content time; snapped on the first frame or
		// any large time jump.
		const dtMs = this.prevAnimationTimeMs != null ? timeMs - this.prevAnimationTimeMs : 0;
		let appliedScale: number;
		let appliedX: number;
		let appliedY: number;
		if (this.prevAnimationTimeMs == null || dtMs <= 0 || dtMs > 80) {
			resetZoomSpring(this.zoomSpringState, projectedTransform);
			appliedScale = projectedTransform.scale;
			appliedX = projectedTransform.x;
			appliedY = projectedTransform.y;
		} else {
			const sprung = stepZoomSpring(this.zoomSpringState, projectedTransform, dtMs);
			appliedScale = sprung.scale;
			appliedX = sprung.x;
			appliedY = sprung.y;
		}

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

	// On Linux/Wayland the implicit GPU-to-2D texture-sharing path behind
	// drawImage(webglCanvas) can fail silently (EGL/Ozone), giving green/empty
	// frames. gl.readPixels copies GPU to CPU directly, bypassing that path.
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

	// applyShadowToRecording is false when the 3D pass will rotate this canvas next;
	// the shadow is re-applied after rotation to avoid aliasing.
	private compositeWithShadows(
		webcamFrame: VideoFrame | null | undefined,
		applyShadowToRecording: boolean,
	): void {
		if (
			!this.compositeCanvas ||
			!this.compositeCtx ||
			!this.foregroundCanvas ||
			!this.foregroundCtx ||
			!this.app
		)
			return;

		const videoCanvas = this.isLinux
			? this.readbackVideoCanvas()
			: (this.app.canvas as HTMLCanvasElement);

		const bgCtx = this.compositeCtx;
		const fgCtx = this.foregroundCtx;
		const w = this.compositeCanvas.width;
		const h = this.compositeCanvas.height;

		// Background (compositeCanvas): wallpaper only. Stays flat, never touched by the
		// 3D rotation pass, matching the preview.
		bgCtx.clearRect(0, 0, w, h);
		if (this.backgroundSprite) {
			const bgCanvas = this.backgroundSprite;
			if (this.config.showBlur) {
				bgCtx.save();
				bgCtx.filter = "blur(6px)"; // Canvas blur is weaker than CSS
				bgCtx.drawImage(bgCanvas, 0, 0, w, h);
				bgCtx.restore();
			} else {
				bgCtx.drawImage(bgCanvas, 0, 0, w, h);
			}
		} else {
			console.warn("[FrameRenderer] No background sprite found during compositing!");
		}

		// Foreground (transparent): recording + webcam. Shadow baked here only on the
		// flat path; the 3D path applies it after rotation (see renderFrame).
		fgCtx.clearRect(0, 0, w, h);
		if (
			applyShadowToRecording &&
			this.config.showShadow &&
			this.config.shadowIntensity > 0 &&
			this.shadowCanvas &&
			this.shadowCtx
		) {
			const shadowCtx = this.shadowCtx;
			shadowCtx.clearRect(0, 0, w, h);
			shadowCtx.save();

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
			fgCtx.drawImage(this.shadowCanvas, 0, 0, w, h);
		} else {
			fgCtx.drawImage(videoCanvas, 0, 0, w, h);
		}

		const webcamRect = this.layoutCache?.webcamRect ?? null;
		if (webcamFrame && webcamRect) {
			const preset = getWebcamLayoutPresetDefinition(this.config.webcamLayoutPreset);
			const shape = webcamRect.maskShape ?? this.config.webcamMaskShape ?? "rectangle";
			// Scale the PiP webcam inversely with the eased zoom, anchoring the shrink to the
			// docked corner (bottom-right by default) like the preview, so it stays flush to the
			// edges instead of drifting toward center.
			const reactiveFactor =
				this.config.webcamReactiveZoom && this.config.webcamLayoutPreset === "picture-in-picture"
					? reactiveWebcamScale(this.animationState.appliedScale)
					: 1;
			const camPos = this.config.webcamPosition;
			const biasX = (camPos ? camPos.cx >= 0.5 : true) ? 1 : 0;
			const biasY = (camPos ? camPos.cy >= 0.5 : true) ? 1 : 0;
			const drawRect =
				reactiveFactor < 1
					? {
							width: webcamRect.width * reactiveFactor,
							height: webcamRect.height * reactiveFactor,
							x: webcamRect.x + webcamRect.width * (1 - reactiveFactor) * biasX,
							y: webcamRect.y + webcamRect.height * (1 - reactiveFactor) * biasY,
							borderRadius: webcamRect.borderRadius * reactiveFactor,
						}
					: webcamRect;
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
			fgCtx.save();
			drawCanvasClipPath(
				fgCtx,
				drawRect.x,
				drawRect.y,
				drawRect.width,
				drawRect.height,
				shape,
				drawRect.borderRadius,
			);
			if (preset.shadow) {
				fgCtx.shadowColor = preset.shadow.color;
				fgCtx.shadowBlur = preset.shadow.blur;
				fgCtx.shadowOffsetX = preset.shadow.offsetX;
				fgCtx.shadowOffsetY = preset.shadow.offsetY;
			}
			fgCtx.fillStyle = "#000000";
			fgCtx.fill();
			fgCtx.clip();
			drawWebcamFrameImage(
				fgCtx,
				webcamFrame as unknown as CanvasImageSource,
				{
					x: sourceCropX,
					y: sourceCropY,
					width: sourceCropWidth,
					height: sourceCropHeight,
				},
				{
					x: drawRect.x,
					y: drawRect.y,
					width: drawRect.width,
					height: drawRect.height,
				},
				this.config.webcamMirrored,
			);
			fgCtx.restore();
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
		this.foregroundCanvas = null;
		this.foregroundCtx = null;
		this.rasterCanvas = null;
		this.rasterCtx = null;
		if (this.threeDPass) {
			this.threeDPass.destroy();
			this.threeDPass = null;
		}
		this.cursorImageCache.clear();
	}
}
