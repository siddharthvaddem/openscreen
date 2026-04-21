import {
	Application,
	BlurFilter,
	Container,
	Graphics,
	Sprite,
	Texture,
	VideoSource,
} from "pixi.js";
import { MotionBlurFilter } from "pixi-filters/motion-blur";
import type React from "react";
import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from "react";
import { getAssetPath } from "@/lib/assetPath";
import {
	getWebcamLayoutCssBoxShadow,
	type Size,
	type StyledRenderRect,
	type WebcamLayoutPreset,
	type WebcamSizePreset,
} from "@/lib/compositeLayout";
import { getCssClipPath } from "@/lib/webcamMaskShapes";
import {
	type AspectRatio,
	formatAspectRatioForCSS,
	getNativeAspectRatioValue,
} from "@/utils/aspectRatioUtils";
import { AnnotationOverlay } from "./AnnotationOverlay";
import {
	type AnnotationRegion,
	type BlurData,
	type SpeedRegion,
	type TrimRegion,
	ZOOM_DEPTH_SCALES,
	type ZoomDepth,
	type ZoomFocus,
	type ZoomRegion,
} from "./types";
import {
	AUTO_FOLLOW_RAMP_DISTANCE,
	AUTO_FOLLOW_SMOOTHING_FACTOR,
	AUTO_FOLLOW_SMOOTHING_FACTOR_MAX,
	DEFAULT_FOCUS,
	ZOOM_SCALE_DEADZONE,
	ZOOM_TRANSLATION_DEADZONE_PX,
} from "./videoPlayback/constants";
import { adaptiveSmoothFactor, smoothCursorFocus } from "./videoPlayback/cursorFollowUtils";
import { clampFocusToStage as clampFocusToStageUtil } from "./videoPlayback/focusUtils";
import { layoutVideoContent as layoutVideoContentUtil } from "./videoPlayback/layoutUtils";
import { clamp01 } from "./videoPlayback/mathUtils";
import { updateOverlayIndicator } from "./videoPlayback/overlayUtils";
import { createVideoEventHandlers } from "./videoPlayback/videoEventHandlers";
import { findDominantRegion } from "./videoPlayback/zoomRegionUtils";
import {
	applyZoomTransform,
	computeFocusFromTransform,
	computeZoomTransform,
	createMotionBlurState,
	type MotionBlurState,
} from "./videoPlayback/zoomTransform";

interface VideoPlaybackProps {
	videoPath: string;
	webcamVideoPath?: string;
	webcamLayoutPreset: WebcamLayoutPreset;
	webcamMaskShape?: import("./types").WebcamMaskShape;
	webcamSizePreset?: WebcamSizePreset;
	webcamPosition?: { cx: number; cy: number } | null;
	onWebcamPositionChange?: (position: { cx: number; cy: number }) => void;
	onWebcamPositionDragEnd?: () => void;
	onDurationChange: (duration: number) => void;
	onTimeUpdate: (time: number) => void;
	currentTime: number;
	onPlayStateChange: (playing: boolean) => void;
	onError: (error: string) => void;
	wallpaper?: string;
	zoomRegions: ZoomRegion[];
	selectedZoomId: string | null;
	onSelectZoom: (id: string | null) => void;
	onZoomFocusChange: (id: string, focus: ZoomFocus) => void;
	onZoomFocusDragEnd?: () => void;
	isPlaying: boolean;
	showShadow?: boolean;
	shadowIntensity?: number;
	showBlur?: boolean;
	motionBlurAmount?: number;
	borderRadius?: number;
	padding?: number;
	cropRegion?: import("./types").CropRegion;
	trimRegions?: TrimRegion[];
	speedRegions?: SpeedRegion[];
	aspectRatio: AspectRatio;
	annotationRegions?: AnnotationRegion[];
	selectedAnnotationId?: string | null;
	onSelectAnnotation?: (id: string | null) => void;
	onAnnotationPositionChange?: (id: string, position: { x: number; y: number }) => void;
	onAnnotationSizeChange?: (id: string, size: { width: number; height: number }) => void;
	blurRegions?: AnnotationRegion[];
	selectedBlurId?: string | null;
	onSelectBlur?: (id: string | null) => void;
	onBlurPositionChange?: (id: string, position: { x: number; y: number }) => void;
	onBlurSizeChange?: (id: string, size: { width: number; height: number }) => void;
	onBlurDataChange?: (id: string, blurData: BlurData) => void;
	onBlurDataCommit?: () => void;
	cursorTelemetry?: import("./types").CursorTelemetryPoint[];
}

export interface VideoPlaybackRef {
	video: HTMLVideoElement | null;
	app: Application | null;
	videoSprite: Sprite | null;
	videoContainer: Container | null;
	containerRef: React.RefObject<HTMLDivElement>;
	play: () => Promise<void>;
	pause: () => void;
}

const VideoPlayback = forwardRef<VideoPlaybackRef, VideoPlaybackProps>(
	(
		{
			videoPath,
			webcamVideoPath,
			webcamLayoutPreset,
			webcamMaskShape,
			webcamSizePreset,
			webcamPosition,
			onWebcamPositionChange,
			onWebcamPositionDragEnd,
			onDurationChange,
			onTimeUpdate,
			currentTime,
			onPlayStateChange,
			onError,
			wallpaper,
			zoomRegions,
			selectedZoomId,
			onSelectZoom,
			onZoomFocusChange,
			onZoomFocusDragEnd,
			isPlaying,
			showShadow,
			shadowIntensity = 0,
			showBlur,
			motionBlurAmount = 0,
			borderRadius = 0,
			padding = 50,
			cropRegion,
			trimRegions = [],
			speedRegions = [],
			aspectRatio,
			annotationRegions = [],
			selectedAnnotationId,
			onSelectAnnotation,
			onAnnotationPositionChange,
			onAnnotationSizeChange,
			blurRegions = [],
			selectedBlurId,
			onSelectBlur,
			onBlurPositionChange,
			onBlurSizeChange,
			onBlurDataChange,
			onBlurDataCommit,
			cursorTelemetry = [],
		},
		ref,
	) => {
		const videoRef = useRef<HTMLVideoElement | null>(null);
		const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
		const containerRef = useRef<HTMLDivElement | null>(null);
		const appRef = useRef<Application | null>(null);
		const videoSpriteRef = useRef<Sprite | null>(null);
		const videoContainerRef = useRef<Container | null>(null);
		const cameraContainerRef = useRef<Container | null>(null);
		const timeUpdateAnimationRef = useRef<number | null>(null);
		const [pixiReady, setPixiReady] = useState(false);
		const [videoReady, setVideoReady] = useState(false);
		const [overlaySize, setOverlaySize] = useState({ width: 800, height: 600 });
		const [overlayElement, setOverlayElement] = useState<HTMLDivElement | null>(null);
		const overlayRef = useRef<HTMLDivElement | null>(null);
		const focusIndicatorRef = useRef<HTMLDivElement | null>(null);
		const [webcamLayout, setWebcamLayout] = useState<StyledRenderRect | null>(null);
		const [webcamDimensions, setWebcamDimensions] = useState<Size | null>(null);
		const currentTimeRef = useRef(0);
		const zoomRegionsRef = useRef<ZoomRegion[]>([]);
		const cursorTelemetryRef = useRef<import("./types").CursorTelemetryPoint[]>([]);
		const selectedZoomIdRef = useRef<string | null>(null);
		const animationStateRef = useRef({
			scale: 1,
			focusX: DEFAULT_FOCUS.cx,
			focusY: DEFAULT_FOCUS.cy,
			progress: 0,
			x: 0,
			y: 0,
			appliedScale: 1,
		});
		const blurFilterRef = useRef<BlurFilter | null>(null);
		const motionBlurFilterRef = useRef<MotionBlurFilter | null>(null);
		const isDraggingFocusRef = useRef(false);
		const isDraggingWebcamRef = useRef(false);
		const webcamDragOffsetRef = useRef({ dx: 0, dy: 0 });
		const stageSizeRef = useRef({ width: 0, height: 0 });
		const videoSizeRef = useRef({ width: 0, height: 0 });
		const baseScaleRef = useRef(1);
		const baseOffsetRef = useRef({ x: 0, y: 0 });
		const baseMaskRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
		const cropBoundsRef = useRef({ startX: 0, endX: 0, startY: 0, endY: 0 });
		const maskGraphicsRef = useRef<Graphics | null>(null);
		const isPlayingRef = useRef(isPlaying);
		const isSeekingRef = useRef(false);
		const allowPlaybackRef = useRef(false);
		const lockedVideoDimensionsRef = useRef<{
			width: number;
			height: number;
		} | null>(null);
		const layoutVideoContentRef = useRef<(() => void) | null>(null);
		const trimRegionsRef = useRef<TrimRegion[]>([]);
		const speedRegionsRef = useRef<SpeedRegion[]>([]);
		const motionBlurAmountRef = useRef(motionBlurAmount);
		const motionBlurStateRef = useRef<MotionBlurState>(createMotionBlurState());
		const onTimeUpdateRef = useRef(onTimeUpdate);
		const onPlayStateChangeRef = useRef(onPlayStateChange);
		const videoReadyRafRef = useRef<number | null>(null);
		const smoothedAutoFocusRef = useRef<ZoomFocus | null>(null);
		const prevTargetProgressRef = useRef(0);

		const clampFocusToStage = useCallback((focus: ZoomFocus, depth: ZoomDepth) => {
			return clampFocusToStageUtil(focus, depth, stageSizeRef.current);
		}, []);

		const updateOverlayForRegion = useCallback(
			(region: ZoomRegion | null, focusOverride?: ZoomFocus) => {
				const overlayEl = overlayRef.current;
				const indicatorEl = focusIndicatorRef.current;

				if (!overlayEl || !indicatorEl) {
					return;
				}

				// Update stage size from overlay dimensions
				const stageWidth = overlayEl.clientWidth;
				const stageHeight = overlayEl.clientHeight;
				if (stageWidth && stageHeight) {
					stageSizeRef.current = { width: stageWidth, height: stageHeight };
				}

				updateOverlayIndicator({
					overlayEl,
					indicatorEl,
					region,
					focusOverride,
					videoSize: videoSizeRef.current,
					baseScale: baseScaleRef.current,
					isPlaying: isPlayingRef.current,
				});
			},
			[],
		);

		const layoutVideoContent = useCallback(() => {
			const container = containerRef.current;
			const app = appRef.current;
			const videoSprite = videoSpriteRef.current;
			const maskGraphics = maskGraphicsRef.current;
			const videoElement = videoRef.current;
			const cameraContainer = cameraContainerRef.current;

			if (
				!container ||
				!app ||
				!videoSprite ||
				!maskGraphics ||
				!videoElement ||
				!cameraContainer
			) {
				return;
			}

			// Lock video dimensions on first layout to prevent resize issues
			if (
				!lockedVideoDimensionsRef.current &&
				videoElement.videoWidth > 0 &&
				videoElement.videoHeight > 0
			) {
				lockedVideoDimensionsRef.current = {
					width: videoElement.videoWidth,
					height: videoElement.videoHeight,
				};
			}

			const result = layoutVideoContentUtil({
				container,
				app,
				videoSprite,
				maskGraphics,
				videoElement,
				cropRegion,
				lockedVideoDimensions: lockedVideoDimensionsRef.current,
				borderRadius,
				padding,
				webcamDimensions,
				webcamLayoutPreset,
				webcamSizePreset,
				webcamPosition,
				webcamMaskShape,
			});

			if (result) {
				stageSizeRef.current = result.stageSize;
				videoSizeRef.current = result.videoSize;
				baseScaleRef.current = result.baseScale;
				baseOffsetRef.current = result.baseOffset;
				baseMaskRef.current = result.maskRect;
				cropBoundsRef.current = result.cropBounds;
				setWebcamLayout(result.webcamRect);

				// Reset camera container to identity
				cameraContainer.scale.set(1);
				cameraContainer.position.set(0, 0);

				const selectedId = selectedZoomIdRef.current;
				const activeRegion = selectedId
					? (zoomRegionsRef.current.find((region) => region.id === selectedId) ?? null)
					: null;

				updateOverlayForRegion(activeRegion);
			}
		}, [
			updateOverlayForRegion,
			cropRegion,
			borderRadius,
			padding,
			webcamDimensions,
			webcamLayoutPreset,
			webcamSizePreset,
			webcamPosition,
			webcamMaskShape,
		]);

		useEffect(() => {
			layoutVideoContentRef.current = layoutVideoContent;
		}, [layoutVideoContent]);

		const setOverlayRefs = useCallback((node: HTMLDivElement | null) => {
			overlayRef.current = node;
			setOverlayElement(node);
		}, []);

		const selectedZoom = useMemo(() => {
			if (!selectedZoomId) return null;
			return zoomRegions.find((region) => region.id === selectedZoomId) ?? null;
		}, [zoomRegions, selectedZoomId]);

		useImperativeHandle(ref, () => ({
			video: videoRef.current,
			app: appRef.current,
			videoSprite: videoSpriteRef.current,
			videoContainer: videoContainerRef.current,
			containerRef,
			play: async () => {
				const vid = videoRef.current;
				if (!vid) return;
				try {
					allowPlaybackRef.current = true;
					await vid.play();
				} catch (error) {
					allowPlaybackRef.current = false;
					throw error;
				}
			},
			pause: () => {
				const video = videoRef.current;
				allowPlaybackRef.current = false;
				if (!video) {
					return;
				}
				video.pause();
			},
		}));

		const updateFocusFromClientPoint = (clientX: number, clientY: number) => {
			const overlayEl = overlayRef.current;
			if (!overlayEl) return;

			const regionId = selectedZoomIdRef.current;
			if (!regionId) return;

			const region = zoomRegionsRef.current.find((r) => r.id === regionId);
			if (!region) return;

			const rect = overlayEl.getBoundingClientRect();
			const stageWidth = rect.width;
			const stageHeight = rect.height;

			if (!stageWidth || !stageHeight) {
				return;
			}

			stageSizeRef.current = { width: stageWidth, height: stageHeight };

			const localX = clientX - rect.left;
			const localY = clientY - rect.top;

			const unclampedFocus: ZoomFocus = {
				cx: clamp01(localX / stageWidth),
				cy: clamp01(localY / stageHeight),
			};
			const clampedFocus = clampFocusToStage(unclampedFocus, region.depth);

			onZoomFocusChange(region.id, clampedFocus);
			updateOverlayForRegion({ ...region, focus: clampedFocus }, clampedFocus);
		};

		const handleOverlayPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
			if (isPlayingRef.current) return;
			const regionId = selectedZoomIdRef.current;
			if (!regionId) return;
			const region = zoomRegionsRef.current.find((r) => r.id === regionId);
			if (!region) return;
			if (region.focusMode === "auto") return;
			onSelectZoom(region.id);
			event.preventDefault();
			isDraggingFocusRef.current = true;
			event.currentTarget.setPointerCapture(event.pointerId);
			updateFocusFromClientPoint(event.clientX, event.clientY);
		};

		const handleOverlayPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
			if (!isDraggingFocusRef.current) return;
			event.preventDefault();
			updateFocusFromClientPoint(event.clientX, event.clientY);
		};

		const endFocusDrag = (event: React.PointerEvent<HTMLDivElement>) => {
			if (!isDraggingFocusRef.current) return;
			isDraggingFocusRef.current = false;
			try {
				event.currentTarget.releasePointerCapture(event.pointerId);
			} catch {
				// Pointer may already be released.
			}
			onZoomFocusDragEnd?.();
		};

		const handleOverlayPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
			endFocusDrag(event);
		};

		const handleOverlayPointerLeave = (event: React.PointerEvent<HTMLDivElement>) => {
			endFocusDrag(event);
		};

		// ── Webcam PiP drag handlers ──

		const handleWebcamPointerDown = (event: React.PointerEvent<HTMLVideoElement>) => {
			if (isPlayingRef.current) return;
			if (webcamLayoutPreset !== "picture-in-picture") return;
			event.preventDefault();
			event.stopPropagation();
			isDraggingWebcamRef.current = true;
			event.currentTarget.setPointerCapture(event.pointerId);

			const webcamEl = event.currentTarget;
			const webcamRect = webcamEl.getBoundingClientRect();
			webcamDragOffsetRef.current = {
				dx: event.clientX - (webcamRect.left + webcamRect.width / 2),
				dy: event.clientY - (webcamRect.top + webcamRect.height / 2),
			};
		};

		const handleWebcamPointerMove = (event: React.PointerEvent<HTMLVideoElement>) => {
			if (!isDraggingWebcamRef.current) return;
			event.preventDefault();
			event.stopPropagation();

			const containerEl = containerRef.current;
			if (!containerEl || !onWebcamPositionChange) return;

			const containerRect = containerEl.getBoundingClientRect();
			const cx = clamp01(
				(event.clientX - webcamDragOffsetRef.current.dx - containerRect.left) / containerRect.width,
			);
			const cy = clamp01(
				(event.clientY - webcamDragOffsetRef.current.dy - containerRect.top) / containerRect.height,
			);
			onWebcamPositionChange({ cx, cy });
		};

		const handleWebcamPointerUp = (event: React.PointerEvent<HTMLVideoElement>) => {
			if (!isDraggingWebcamRef.current) return;
			isDraggingWebcamRef.current = false;
			try {
				event.currentTarget.releasePointerCapture(event.pointerId);
			} catch {
				// Pointer may already be released.
			}
			onWebcamPositionDragEnd?.();
		};

		useEffect(() => {
			zoomRegionsRef.current = zoomRegions;
		}, [zoomRegions]);

		useEffect(() => {
			cursorTelemetryRef.current = cursorTelemetry;
		}, [cursorTelemetry]);

		useEffect(() => {
			selectedZoomIdRef.current = selectedZoomId;
		}, [selectedZoomId]);

		useEffect(() => {
			isPlayingRef.current = isPlaying;
		}, [isPlaying]);

		useEffect(() => {
			trimRegionsRef.current = trimRegions;
		}, [trimRegions]);

		useEffect(() => {
			speedRegionsRef.current = speedRegions;
		}, [speedRegions]);

		useEffect(() => {
			motionBlurAmountRef.current = motionBlurAmount;
		}, [motionBlurAmount]);

		useEffect(() => {
			onTimeUpdateRef.current = onTimeUpdate;
		}, [onTimeUpdate]);

		useEffect(() => {
			onPlayStateChangeRef.current = onPlayStateChange;
		}, [onPlayStateChange]);

		useEffect(() => {
			if (!pixiReady || !videoReady) return;

			const app = appRef.current;
			const cameraContainer = cameraContainerRef.current;
			const video = videoRef.current;

			if (!app || !cameraContainer || !video) return;

			const tickerWasStarted = app.ticker?.started || false;
			if (tickerWasStarted && app.ticker) {
				app.ticker.stop();
			}

			const wasPlaying = !video.paused;
			if (wasPlaying) {
				video.pause();
			}

			animationStateRef.current = {
				scale: 1,
				focusX: DEFAULT_FOCUS.cx,
				focusY: DEFAULT_FOCUS.cy,
				progress: 0,
				x: 0,
				y: 0,
				appliedScale: 1,
			};

			// Reset motion blur state for clean transitions
			motionBlurStateRef.current = createMotionBlurState();

			if (blurFilterRef.current) {
				blurFilterRef.current.blur = 0;
			}

			requestAnimationFrame(() => {
				const container = cameraContainerRef.current;
				const videoStage = videoContainerRef.current;
				const sprite = videoSpriteRef.current;
				const currentApp = appRef.current;
				if (!container || !videoStage || !sprite || !currentApp) {
					return;
				}

				container.scale.set(1);
				container.position.set(0, 0);
				videoStage.scale.set(1);
				videoStage.position.set(0, 0);
				sprite.scale.set(1);
				sprite.position.set(0, 0);

				layoutVideoContent();

				applyZoomTransform({
					cameraContainer: container,
					blurFilter: blurFilterRef.current,
					stageSize: stageSizeRef.current,
					baseMask: baseMaskRef.current,
					zoomScale: 1,
					focusX: DEFAULT_FOCUS.cx,
					focusY: DEFAULT_FOCUS.cy,
					motionIntensity: 0,
					isPlaying: false,
					motionBlurAmount: motionBlurAmountRef.current,
				});

				requestAnimationFrame(() => {
					const finalApp = appRef.current;
					if (wasPlaying && video) {
						video.play().catch(() => {
							// Ignore autoplay restoration failures.
						});
					}
					if (tickerWasStarted && finalApp?.ticker) {
						finalApp.ticker.start();
					}
				});
			});
		}, [pixiReady, videoReady, layoutVideoContent]);

		useEffect(() => {
			if (!pixiReady || !videoReady) return;
			const container = containerRef.current;
			if (!container) return;

			if (typeof ResizeObserver === "undefined") {
				return;
			}

			const observer = new ResizeObserver(() => {
				layoutVideoContent();
			});

			observer.observe(container);
			return () => {
				observer.disconnect();
			};
		}, [pixiReady, videoReady, layoutVideoContent]);

		useEffect(() => {
			if (!pixiReady || !videoReady) return;
			updateOverlayForRegion(selectedZoom);
		}, [selectedZoom, pixiReady, videoReady, updateOverlayForRegion]);

		useEffect(() => {
			if (!pixiReady || !videoReady) return;
			const overlayEl = overlayElement;
			if (!overlayEl) return;
			if (!selectedZoom) {
				overlayEl.style.cursor = "default";
				overlayEl.style.pointerEvents = "none";
				return;
			}
			overlayEl.style.cursor = isPlaying ? "not-allowed" : "grab";
			overlayEl.style.pointerEvents = isPlaying ? "none" : "auto";
		}, [selectedZoom, isPlaying, pixiReady, videoReady, overlayElement]);

		useEffect(() => {
			const overlayEl = overlayElement;
			if (!overlayEl) return;

			const updateOverlaySize = () => {
				const width = overlayEl.clientWidth || 800;
				const height = overlayEl.clientHeight || 600;
				setOverlaySize((prev) => {
					if (prev.width === width && prev.height === height) return prev;
					return { width, height };
				});
			};

			updateOverlaySize();

			if (typeof ResizeObserver !== "undefined") {
				const observer = new ResizeObserver(() => {
					updateOverlaySize();
				});
				observer.observe(overlayEl);
				return () => observer.disconnect();
			}

			window.addEventListener("resize", updateOverlaySize);
			return () => window.removeEventListener("resize", updateOverlaySize);
		}, [overlayElement]);

		useEffect(() => {
			const container = containerRef.current;
			if (!container) return;

			let mounted = true;
			let app: Application | null = null;

			(async () => {
				app = new Application();

				await app.init({
					width: container.clientWidth,
					height: container.clientHeight,
					backgroundAlpha: 0,
					antialias: true,
					resolution: window.devicePixelRatio || 1,
					autoDensity: true,
				});

				app.ticker.maxFPS = 60;

				if (!mounted) {
					app.destroy(true, {
						children: true,
						texture: true,
						textureSource: true,
					});
					return;
				}

				appRef.current = app;
				container.appendChild(app.canvas);

				// Camera container - this will be scaled/positioned for zoom
				const cameraContainer = new Container();
				cameraContainerRef.current = cameraContainer;
				app.stage.addChild(cameraContainer);

				// Video container - holds the masked video sprite
				const videoContainer = new Container();
				videoContainerRef.current = videoContainer;
				cameraContainer.addChild(videoContainer);

				setPixiReady(true);
			})();

			return () => {
				mounted = false;
				setPixiReady(false);
				if (app && app.renderer) {
					app.destroy(true, {
						children: true,
						texture: true,
						textureSource: true,
					});
				}
				appRef.current = null;
				cameraContainerRef.current = null;
				videoContainerRef.current = null;
				videoSpriteRef.current = null;
			};
		}, []);

		useEffect(() => {
			if (!videoPath) {
				setVideoReady(false);
				return;
			}

			const video = videoRef.current;
			if (!video) return;
			video.pause();
			video.currentTime = 0;
			allowPlaybackRef.current = false;
			lockedVideoDimensionsRef.current = null;
			setVideoReady(false);
			if (videoReadyRafRef.current) {
				cancelAnimationFrame(videoReadyRafRef.current);
				videoReadyRafRef.current = null;
			}
		}, [videoPath]);

		useEffect(() => {
			if (!pixiReady || !videoReady) return;

			const video = videoRef.current;
			const app = appRef.current;
			const videoContainer = videoContainerRef.current;

			if (!video || !app || !videoContainer) return;
			if (video.videoWidth === 0 || video.videoHeight === 0) return;

			const source = VideoSource.from(video);
			if ("autoPlay" in source) {
				(source as { autoPlay?: boolean }).autoPlay = false;
			}
			if ("autoUpdate" in source) {
				(source as { autoUpdate?: boolean }).autoUpdate = true;
			}
			const videoTexture = Texture.from(source);

			const videoSprite = new Sprite(videoTexture);
			videoSpriteRef.current = videoSprite;

			const maskGraphics = new Graphics();
			videoContainer.addChild(videoSprite);
			videoContainer.addChild(maskGraphics);
			videoContainer.mask = maskGraphics;
			maskGraphicsRef.current = maskGraphics;

			animationStateRef.current = {
				scale: 1,
				focusX: DEFAULT_FOCUS.cx,
				focusY: DEFAULT_FOCUS.cy,
				progress: 0,
				x: 0,
				y: 0,
				appliedScale: 1,
			};

			const blurFilter = new BlurFilter();
			blurFilter.quality = 3;
			blurFilter.resolution = app.renderer.resolution;
			blurFilter.blur = 0;
			const motionBlurFilter = new MotionBlurFilter([0, 0], 5, 0);
			videoContainer.filters = [blurFilter, motionBlurFilter];
			blurFilterRef.current = blurFilter;
			motionBlurFilterRef.current = motionBlurFilter;

			layoutVideoContentRef.current?.();
			video.pause();

			const { handlePlay, handlePause, handleSeeked, handleSeeking } = createVideoEventHandlers({
				video,
				isSeekingRef,
				isPlayingRef,
				allowPlaybackRef,
				currentTimeRef,
				timeUpdateAnimationRef,
				onPlayStateChange: (playing) => onPlayStateChangeRef.current(playing),
				onTimeUpdate: (time) => onTimeUpdateRef.current(time),
				trimRegionsRef,
				speedRegionsRef,
			});

			video.addEventListener("play", handlePlay);
			video.addEventListener("pause", handlePause);
			video.addEventListener("ended", handlePause);
			video.addEventListener("seeked", handleSeeked);
			video.addEventListener("seeking", handleSeeking);

			return () => {
				video.removeEventListener("play", handlePlay);
				video.removeEventListener("pause", handlePause);
				video.removeEventListener("ended", handlePause);
				video.removeEventListener("seeked", handleSeeked);
				video.removeEventListener("seeking", handleSeeking);

				if (timeUpdateAnimationRef.current) {
					cancelAnimationFrame(timeUpdateAnimationRef.current);
				}

				if (videoSprite) {
					videoContainer.removeChild(videoSprite);
					videoSprite.destroy();
				}
				if (maskGraphics) {
					videoContainer.removeChild(maskGraphics);
					maskGraphics.destroy();
				}
				videoContainer.mask = null;
				maskGraphicsRef.current = null;
				if (blurFilterRef.current) {
					videoContainer.filters = [];
					blurFilterRef.current.destroy();
					blurFilterRef.current = null;
				}
				if (motionBlurFilterRef.current) {
					motionBlurFilterRef.current.destroy();
					motionBlurFilterRef.current = null;
				}
				videoTexture.destroy(true);

				videoSpriteRef.current = null;
			};
		}, [pixiReady, videoReady]);

		useEffect(() => {
			if (!pixiReady || !videoReady) return;

			const app = appRef.current;
			const videoSprite = videoSpriteRef.current;
			const videoContainer = videoContainerRef.current;
			if (!app || !videoSprite || !videoContainer) return;

			const applyTransformFn = (
				transform: { scale: number; x: number; y: number },
				targetFocus: ZoomFocus,
				motionIntensity: number,
				motionVector: { x: number; y: number },
			) => {
				const cameraContainer = cameraContainerRef.current;
				if (!cameraContainer) return;

				const state = animationStateRef.current;

				const appliedTransform = applyZoomTransform({
					cameraContainer,
					blurFilter: blurFilterRef.current,
					motionBlurFilter: motionBlurFilterRef.current,
					stageSize: stageSizeRef.current,
					baseMask: baseMaskRef.current,
					zoomScale: state.scale,
					zoomProgress: state.progress,
					focusX: targetFocus.cx,
					focusY: targetFocus.cy,
					motionIntensity,
					motionVector,
					isPlaying: isPlayingRef.current,
					motionBlurAmount: motionBlurAmountRef.current,
					transformOverride: transform,
					motionBlurState: motionBlurStateRef.current,
					frameTimeMs: performance.now(),
				});

				state.x = appliedTransform.x;
				state.y = appliedTransform.y;
				state.appliedScale = appliedTransform.scale;
			};

			const ticker = () => {
				const { region, strength, blendedScale, transition } = findDominantRegion(
					zoomRegionsRef.current,
					currentTimeRef.current,
					{
						connectZooms: true,
						cursorTelemetry: cursorTelemetryRef.current,
					},
				);

				const defaultFocus = DEFAULT_FOCUS;
				let targetScaleFactor = 1;
				let targetFocus = defaultFocus;
				let targetProgress = 0;

				// If a zoom is selected but video is not playing, show default unzoomed view
				const selectedId = selectedZoomIdRef.current;
				const hasSelectedZoom = selectedId !== null;
				const shouldShowUnzoomedView = hasSelectedZoom && !isPlayingRef.current;

				if (region && strength > 0 && !shouldShowUnzoomedView) {
					const zoomScale = blendedScale ?? ZOOM_DEPTH_SCALES[region.depth];
					const regionFocus = region.focus;

					targetScaleFactor = zoomScale;
					targetFocus = regionFocus;
					targetProgress = strength;

					// Apply adaptive smoothing for auto-follow mode
					if (region.focusMode === "auto" && !transition) {
						const raw = targetFocus;
						const isZoomingIn =
							targetProgress < 0.999 && targetProgress >= prevTargetProgressRef.current;
						if (targetProgress >= 0.999) {
							// Full zoom: adaptive smoothing — moves faster when far, decelerates when close
							const prev = smoothedAutoFocusRef.current ?? raw;
							const factor = adaptiveSmoothFactor(
								raw,
								prev,
								AUTO_FOLLOW_SMOOTHING_FACTOR,
								AUTO_FOLLOW_SMOOTHING_FACTOR_MAX,
								AUTO_FOLLOW_RAMP_DISTANCE,
							);
							const smoothed = smoothCursorFocus(raw, prev, factor);
							smoothedAutoFocusRef.current = smoothed;
							targetFocus = smoothed;
						} else if (isZoomingIn) {
							// Zoom-in: track cursor directly so zoom always aims at current cursor
							// position; keep ref in sync to avoid snap when full-zoom begins
							smoothedAutoFocusRef.current = raw;
						} else {
							// Zoom-out: keep smoothing for continuity — avoids snap at zoom-out start
							const prev = smoothedAutoFocusRef.current ?? raw;
							const factor = adaptiveSmoothFactor(
								raw,
								prev,
								AUTO_FOLLOW_SMOOTHING_FACTOR,
								AUTO_FOLLOW_SMOOTHING_FACTOR_MAX,
								AUTO_FOLLOW_RAMP_DISTANCE,
							);
							const smoothed = smoothCursorFocus(raw, prev, factor);
							smoothedAutoFocusRef.current = smoothed;
							targetFocus = smoothed;
						}
					} else if (region.focusMode !== "auto") {
						smoothedAutoFocusRef.current = null;
					}
					prevTargetProgressRef.current = targetProgress;

					// Handle connected zoom transitions (pan between adjacent zoom regions)
					if (transition) {
						const startTransform = computeZoomTransform({
							stageSize: stageSizeRef.current,
							baseMask: baseMaskRef.current,
							zoomScale: transition.startScale,
							zoomProgress: 1,
							focusX: transition.startFocus.cx,
							focusY: transition.startFocus.cy,
						});
						const endTransform = computeZoomTransform({
							stageSize: stageSizeRef.current,
							baseMask: baseMaskRef.current,
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
							stageSize: stageSizeRef.current,
							baseMask: baseMaskRef.current,
							zoomScale: interpolatedTransform.scale,
							x: interpolatedTransform.x,
							y: interpolatedTransform.y,
						});
						targetProgress = 1;
					}
				}

				const state = animationStateRef.current;
				const prevScale = state.appliedScale;
				const prevX = state.x;
				const prevY = state.y;

				state.scale = targetScaleFactor;
				state.focusX = targetFocus.cx;
				state.focusY = targetFocus.cy;
				state.progress = targetProgress;

				const projectedTransform = computeZoomTransform({
					stageSize: stageSizeRef.current,
					baseMask: baseMaskRef.current,
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

				const motionIntensity = Math.max(
					Math.abs(appliedScale - prevScale),
					Math.abs(appliedX - prevX) / Math.max(1, stageSizeRef.current.width),
					Math.abs(appliedY - prevY) / Math.max(1, stageSizeRef.current.height),
				);

				const motionVector = {
					x: appliedX - prevX,
					y: appliedY - prevY,
				};

				applyTransformFn(
					{ scale: appliedScale, x: appliedX, y: appliedY },
					targetFocus,
					motionIntensity,
					motionVector,
				);
			};

			app.ticker.add(ticker);
			return () => {
				if (app && app.ticker) {
					app.ticker.remove(ticker);
				}
			};
		}, [pixiReady, videoReady]);

		const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
			const video = e.currentTarget;
			onDurationChange(video.duration);
			video.currentTime = 0;
			video.pause();
			allowPlaybackRef.current = false;
			currentTimeRef.current = 0;

			if (videoReadyRafRef.current) {
				cancelAnimationFrame(videoReadyRafRef.current);
				videoReadyRafRef.current = null;
			}

			const waitForRenderableFrame = () => {
				const hasDimensions = video.videoWidth > 0 && video.videoHeight > 0;
				const hasData = video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
				if (hasDimensions && hasData) {
					videoReadyRafRef.current = null;
					setVideoReady(true);
					return;
				}
				videoReadyRafRef.current = requestAnimationFrame(waitForRenderableFrame);
			};

			videoReadyRafRef.current = requestAnimationFrame(waitForRenderableFrame);
		};

		const [resolvedWallpaper, setResolvedWallpaper] = useState<string | null>(null);
		const webcamCssBoxShadow = useMemo(
			() => getWebcamLayoutCssBoxShadow(webcamLayoutPreset),
			[webcamLayoutPreset],
		);

		useEffect(() => {
			const webcamVideo = webcamVideoRef.current;
			if (!webcamVideo || !webcamVideoPath) {
				setWebcamDimensions(null);
				return;
			}

			const handleLoadedMetadata = () => {
				if (webcamVideo.videoWidth > 0 && webcamVideo.videoHeight > 0) {
					setWebcamDimensions({
						width: webcamVideo.videoWidth,
						height: webcamVideo.videoHeight,
					});
				}
			};

			webcamVideo.addEventListener("loadedmetadata", handleLoadedMetadata);
			handleLoadedMetadata();
			return () => {
				webcamVideo.removeEventListener("loadedmetadata", handleLoadedMetadata);
			};
		}, [webcamVideoPath]);

		useEffect(() => {
			const webcamVideo = webcamVideoRef.current;
			if (!webcamVideo || !webcamVideoPath) {
				return;
			}

			const activeSpeedRegion =
				speedRegions.find(
					(region) => currentTime * 1000 >= region.startMs && currentTime * 1000 < region.endMs,
				) ?? null;
			webcamVideo.playbackRate = activeSpeedRegion ? activeSpeedRegion.speed : 1;

			if (!isPlaying) {
				webcamVideo.pause();
				if (Math.abs(webcamVideo.currentTime - currentTime) > 0.05) {
					webcamVideo.currentTime = currentTime;
				}
				return;
			}

			if (Math.abs(webcamVideo.currentTime - currentTime) > 0.15) {
				webcamVideo.currentTime = currentTime;
			}

			webcamVideo.play().catch(() => {
				// Ignore webcam autoplay restoration failures.
			});
		}, [currentTime, isPlaying, speedRegions, webcamVideoPath]);

		useEffect(() => {
			const webcamVideo = webcamVideoRef.current;
			if (!webcamVideo || !webcamVideoPath) {
				return;
			}

			webcamVideo.pause();
			webcamVideo.currentTime = 0;
		}, [webcamVideoPath]);

		useEffect(() => {
			let mounted = true;
			(async () => {
				try {
					if (!wallpaper) {
						const def = await getAssetPath("wallpapers/wallpaper1.jpg");
						if (mounted) setResolvedWallpaper(def);
						return;
					}

					if (
						wallpaper.startsWith("#") ||
						wallpaper.startsWith("linear-gradient") ||
						wallpaper.startsWith("radial-gradient")
					) {
						if (mounted) setResolvedWallpaper(wallpaper);
						return;
					}

					// If it's a data URL (custom uploaded image), use as-is
					if (wallpaper.startsWith("data:")) {
						if (mounted) setResolvedWallpaper(wallpaper);
						return;
					}

					// If it's an absolute web/http or file path, use as-is
					if (
						wallpaper.startsWith("http") ||
						wallpaper.startsWith("file://") ||
						wallpaper.startsWith("/")
					) {
						// If it's an absolute server path (starts with '/'), resolve via getAssetPath as well
						if (wallpaper.startsWith("/")) {
							const rel = wallpaper.replace(/^\//, "");
							const p = await getAssetPath(rel);
							if (mounted) setResolvedWallpaper(p);
							return;
						}
						if (mounted) setResolvedWallpaper(wallpaper);
						return;
					}
					const p = await getAssetPath(wallpaper.replace(/^\//, ""));
					if (mounted) setResolvedWallpaper(p);
				} catch (_err) {
					if (mounted) setResolvedWallpaper(wallpaper || "/wallpapers/wallpaper1.jpg");
				}
			})();
			return () => {
				mounted = false;
			};
		}, [wallpaper]);

		useEffect(() => {
			return () => {
				if (videoReadyRafRef.current) {
					cancelAnimationFrame(videoReadyRafRef.current);
					videoReadyRafRef.current = null;
				}
			};
		}, []);

		const isImageUrl = Boolean(
			resolvedWallpaper &&
				(resolvedWallpaper.startsWith("file://") ||
					resolvedWallpaper.startsWith("http") ||
					resolvedWallpaper.startsWith("/") ||
					resolvedWallpaper.startsWith("data:")),
		);
		const backgroundStyle = isImageUrl
			? { backgroundImage: `url(${resolvedWallpaper || ""})` }
			: { background: resolvedWallpaper || "" };

		return (
			<div
				className="relative rounded-sm overflow-hidden"
				style={{
					width: "100%",
					aspectRatio: formatAspectRatioForCSS(
						aspectRatio,
						aspectRatio === "native"
							? getNativeAspectRatioValue(
									lockedVideoDimensionsRef.current?.width || 1920,
									lockedVideoDimensionsRef.current?.height || 1080,
									cropRegion,
								)
							: undefined,
					),
				}}
			>
				{/* Background layer - always render as DOM element with blur */}
				<div
					className="absolute inset-0 bg-cover bg-center"
					style={{
						...backgroundStyle,
						filter: showBlur ? "blur(2px)" : "none",
					}}
				/>
				<div
					ref={containerRef}
					className="absolute inset-0"
					style={{
						filter:
							showShadow && shadowIntensity > 0
								? `drop-shadow(0 ${shadowIntensity * 12}px ${shadowIntensity * 48}px rgba(0,0,0,${shadowIntensity * 0.7})) drop-shadow(0 ${shadowIntensity * 4}px ${shadowIntensity * 16}px rgba(0,0,0,${shadowIntensity * 0.5})) drop-shadow(0 ${shadowIntensity * 2}px ${shadowIntensity * 8}px rgba(0,0,0,${shadowIntensity * 0.3}))`
								: "none",
					}}
				/>
				{webcamVideoPath &&
					(() => {
						const clipPath = getCssClipPath(webcamLayout?.maskShape ?? "rectangle");
						const useClipPath = !!clipPath;
						return (
							<div
								className="absolute"
								style={{
									left: webcamLayout?.x ?? 0,
									top: webcamLayout?.y ?? 0,
									width: webcamLayout?.width ?? 0,
									height: webcamLayout?.height ?? 0,
									zIndex: 20,
									opacity: webcamLayout ? 1 : 0,
									filter:
										useClipPath && webcamCssBoxShadow !== "none"
											? `drop-shadow(${webcamCssBoxShadow})`
											: undefined,
								}}
							>
								<video
									ref={webcamVideoRef}
									src={webcamVideoPath}
									className={`w-full h-full object-cover ${webcamLayoutPreset === "picture-in-picture" ? "cursor-grab active:cursor-grabbing" : "pointer-events-none"}`}
									style={{
										borderRadius: useClipPath ? 0 : (webcamLayout?.borderRadius ?? 0),
										clipPath: clipPath ?? undefined,
										boxShadow: useClipPath ? "none" : webcamCssBoxShadow,
										backgroundColor: "#000",
									}}
									onPointerDown={handleWebcamPointerDown}
									onPointerMove={handleWebcamPointerMove}
									onPointerUp={handleWebcamPointerUp}
									onPointerLeave={handleWebcamPointerUp}
									muted
									preload="metadata"
									playsInline
								/>
							</div>
						);
					})()}
				{/* Only render overlay after PIXI and video are fully initialized */}
				{pixiReady && videoReady && (
					<div
						ref={setOverlayRefs}
						className="absolute inset-0 select-none"
						style={{ pointerEvents: "none", zIndex: 30 }}
						onPointerDown={handleOverlayPointerDown}
						onPointerMove={handleOverlayPointerMove}
						onPointerUp={handleOverlayPointerUp}
						onPointerLeave={handleOverlayPointerLeave}
					>
						<div
							ref={focusIndicatorRef}
							className="absolute rounded-md border border-[#34B27B]/80 bg-[#34B27B]/20 shadow-[0_0_0_1px_rgba(52,178,123,0.35)]"
							style={{ display: "none", pointerEvents: "none" }}
						/>
						{(() => {
							const filteredAnnotations = (annotationRegions || []).filter((annotation) => {
								if (typeof annotation.startMs !== "number" || typeof annotation.endMs !== "number")
									return false;

								if (annotation.id === selectedAnnotationId) return true;

								const timeMs = Math.round(currentTime * 1000);
								return timeMs >= annotation.startMs && timeMs < annotation.endMs;
							});

							const filteredBlurRegions = (blurRegions || []).filter((blurRegion) => {
								if (typeof blurRegion.startMs !== "number" || typeof blurRegion.endMs !== "number")
									return false;

								if (blurRegion.id === selectedBlurId) return true;

								const timeMs = Math.round(currentTime * 1000);
								return timeMs >= blurRegion.startMs && timeMs < blurRegion.endMs;
							});

							const sorted = [
								...filteredAnnotations.map((annotation) => ({
									kind: "annotation" as const,
									region: annotation,
								})),
								...filteredBlurRegions.map((blurRegion) => ({
									kind: "blur" as const,
									region: blurRegion,
								})),
							].sort((a, b) => a.region.zIndex - b.region.zIndex);
							const previewSnapshotCanvas = (() => {
								const app = appRef.current;
								if (!app?.renderer?.extract) return null;
								try {
									return app.renderer.extract.canvas(app.stage);
								} catch {
									return null;
								}
							})();

							// Handle click-through cycling: when clicking same annotation, cycle to next
							const handleAnnotationClick = (clickedId: string) => {
								if (!onSelectAnnotation) return;

								// If clicking on already selected annotation and there are multiple overlapping
								if (clickedId === selectedAnnotationId && filteredAnnotations.length > 1) {
									// Find current index and cycle to next
									const currentIndex = filteredAnnotations.findIndex((a) => a.id === clickedId);
									const nextIndex = (currentIndex + 1) % filteredAnnotations.length;
									onSelectAnnotation(filteredAnnotations[nextIndex].id);
								} else {
									// First click or clicking different annotation
									onSelectAnnotation(clickedId);
								}
							};

							const handleBlurClick = (clickedId: string) => {
								if (!onSelectBlur) return;

								if (clickedId === selectedBlurId && filteredBlurRegions.length > 1) {
									const currentIndex = filteredBlurRegions.findIndex((a) => a.id === clickedId);
									const nextIndex = (currentIndex + 1) % filteredBlurRegions.length;
									onSelectBlur(filteredBlurRegions[nextIndex].id);
								} else {
									onSelectBlur(clickedId);
								}
							};

							return sorted.map((item) => (
								<AnnotationOverlay
									key={
										item.kind === "blur"
											? `${item.region.id}-${overlaySize.width}-${overlaySize.height}-${item.region.blurData?.type ?? "blur"}-${item.region.blurData?.shape ?? "rectangle"}-${item.region.blurData?.color ?? "white"}-${Math.round(item.region.blurData?.blockSize ?? 0)}-${Math.round(item.region.blurData?.intensity ?? 0)}-${(item.region.blurData?.freehandPoints ?? []).map((p) => `${Math.round(p.x)}_${Math.round(p.y)}`).join("-")}`
											: `${item.region.id}-${overlaySize.width}-${overlaySize.height}`
									}
									annotation={item.region}
									isSelected={
										item.kind === "blur"
											? item.region.id === selectedBlurId
											: item.region.id === selectedAnnotationId
									}
									containerWidth={overlaySize.width}
									containerHeight={overlaySize.height}
									onPositionChange={(id, position) =>
										item.kind === "blur"
											? onBlurPositionChange?.(id, position)
											: onAnnotationPositionChange?.(id, position)
									}
									onSizeChange={(id, size) =>
										item.kind === "blur"
											? onBlurSizeChange?.(id, size)
											: onAnnotationSizeChange?.(id, size)
									}
									onBlurDataChange={
										item.kind === "blur"
											? (id, blurData) => onBlurDataChange?.(id, blurData)
											: undefined
									}
									onBlurDataCommit={item.kind === "blur" ? onBlurDataCommit : undefined}
									onClick={item.kind === "blur" ? handleBlurClick : handleAnnotationClick}
									zIndex={item.region.zIndex}
									isSelectedBoost={
										item.kind === "blur"
											? item.region.id === selectedBlurId
											: item.region.id === selectedAnnotationId
									}
									previewSourceCanvas={previewSnapshotCanvas}
									previewFrameVersion={Math.round(currentTime * 1000)}
								/>
							));
						})()}
					</div>
				)}
				<video
					ref={videoRef}
					src={videoPath}
					className="hidden"
					preload="metadata"
					playsInline
					onLoadedMetadata={handleLoadedMetadata}
					onDurationChange={(e) => {
						onDurationChange(e.currentTarget.duration);
					}}
					onError={() => onError("Failed to load video")}
				/>
			</div>
		);
	},
);

VideoPlayback.displayName = "VideoPlayback";

export default VideoPlayback;
