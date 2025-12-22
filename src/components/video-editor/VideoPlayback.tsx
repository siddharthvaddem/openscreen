import type React from "react";
import {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import { getAssetPath } from "@/lib/assetPath";
import { Application, Container, Sprite, Graphics, BlurFilter, Texture, VideoSource } from "pixi.js";
import {
  ZOOM_DEPTH_SCALES,
  type ZoomRegion,
  type ZoomFocus,
  type ZoomDepth,
  type TrimRegion,
  type AnnotationRegion,
  type CursorTrack,
  DEFAULT_CURSOR_STYLE,
  type CursorSmoothing,
  type End2EndParams,
} from "./types";
import { extractPausePointsFromDisplayEvents, evaluatePositionOnCRByTime, sampleCRPath } from "./end2endSmoother";
import { DEFAULT_FOCUS, SMOOTHING_FACTOR, MIN_DELTA } from "./videoPlayback/constants";
import { clamp01 } from "./videoPlayback/mathUtils";
import { findDominantRegion } from "./videoPlayback/zoomRegionUtils";
import { clampFocusToStage as clampFocusToStageUtil } from "./videoPlayback/focusUtils";
import { updateOverlayIndicator } from "./videoPlayback/overlayUtils";
import { layoutVideoContent as layoutVideoContentUtil } from "./videoPlayback/layoutUtils";
import { applyZoomTransform } from "./videoPlayback/zoomTransform";
import { createVideoEventHandlers } from "./videoPlayback/videoEventHandlers";
import { type AspectRatio, formatAspectRatioForCSS } from "@/utils/aspectRatioUtils";
import { AnnotationOverlay } from "./AnnotationOverlay";

interface VideoPlaybackProps {
  videoPath: string;
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
  isPlaying: boolean;
  showShadow?: boolean;
  shadowIntensity?: number;
  showBlur?: boolean;
  motionBlurEnabled?: boolean;
  borderRadius?: number;
  padding?: number;
  cropRegion?: import('./types').CropRegion;
  trimRegions?: TrimRegion[];
  aspectRatio: AspectRatio;
  annotationRegions?: AnnotationRegion[];
  selectedAnnotationId?: string | null;
  onSelectAnnotation?: (id: string | null) => void;
  onAnnotationPositionChange?: (id: string, position: { x: number; y: number }) => void;
  onAnnotationSizeChange?: (id: string, size: { width: number; height: number }) => void;
  cursorTrack?: CursorTrack | null;
  cursorEnabled?: boolean;
  cursorSmoothing?: CursorSmoothing;
  quadraticSmoothingStrength?: number;
  end2endParams?: End2EndParams;
  // Zoom follow options (optional)
  zoomFollowEnabled?: boolean;
  zoomFollowMode?: 'center' | 'anchor';
  zoomFollowDelayMs?: number;
  zoomFollowMinPaddingPx?: number;
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

function VideoPlayback(
  {
    videoPath,
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
    isPlaying,
    showShadow,
    shadowIntensity = 0,
    showBlur,
    motionBlurEnabled = true,
    borderRadius = 0,
    padding = 50,
    cropRegion,
    trimRegions = [],
    aspectRatio,
    annotationRegions = [],
    selectedAnnotationId,
    onSelectAnnotation,
    onAnnotationPositionChange,
    onAnnotationSizeChange,
  cursorTrack,
    cursorEnabled = true,
  cursorSmoothing = 'none',
  quadraticSmoothingStrength,
  end2endParams,
  // Zoom follow props
  zoomFollowEnabled = false,
  zoomFollowMode = 'center',
  zoomFollowDelayMs = 120,
  zoomFollowMinPaddingPx = 24,
  }: VideoPlaybackProps,
  ref: React.Ref<VideoPlaybackRef>
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const videoSpriteRef = useRef<Sprite | null>(null);
  const videoContainerRef = useRef<Container | null>(null);
  const cameraContainerRef = useRef<Container | null>(null);
  const timeUpdateAnimationRef = useRef<number | null>(null);
  const [pixiReady, setPixiReady] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const focusIndicatorRef = useRef<HTMLDivElement | null>(null);
  const cursorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cursorImageRef = useRef<HTMLImageElement | null>(null);
  const currentTimeRef = useRef(0);
  const zoomRegionsRef = useRef<ZoomRegion[]>([]);
  const selectedZoomIdRef = useRef<string | null>(null);
  const animationStateRef = useRef({ scale: 1, focusX: DEFAULT_FOCUS.cx, focusY: DEFAULT_FOCUS.cy });
  const blurFilterRef = useRef<BlurFilter | null>(null);
  const isDraggingFocusRef = useRef(false);
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
  const lockedVideoDimensionsRef = useRef<{ width: number; height: number } | null>(null);
  const layoutVideoContentRef = useRef<(() => void) | null>(null);
  const trimRegionsRef = useRef<TrimRegion[]>([]);
  const motionBlurEnabledRef = useRef(motionBlurEnabled);
  const videoReadyRafRef = useRef<number | null>(null);

  const CURSOR_TRAIL_MS = 500;
  const CURSOR_CLICK_MS = 280;

  // Load default cursor SVG image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      cursorImageRef.current = img;
    };
    img.onerror = () => {
      console.warn('Failed to load default cursor SVG');
    };
    img.src = '/default.svg';
  }, []);

  const resizeCursorCanvas = useCallback(() => {
    const overlayEl = overlayRef.current;
    const canvas = cursorCanvasRef.current;
    if (!overlayEl || !canvas) return;
    const width = overlayEl.clientWidth;
    const height = overlayEl.clientHeight;
    if (!width || !height) return;

    const dpr = window.devicePixelRatio || 1;
    const nextWidth = Math.max(1, Math.floor(width * dpr));
    const nextHeight = Math.max(1, Math.floor(height * dpr));
    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth;
      canvas.height = nextHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
  }, []);

  const findFirstIndex = (events: CursorTrack['events'], tMs: number) => {
    let lo = 0;
    let hi = events.length;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (events[mid].tMs < tMs) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    return lo;
  };

  const findLastIndex = (events: CursorTrack['events'], tMs: number) => {
    let lo = 0;
    let hi = events.length - 1;
    let best = -1;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (events[mid].tMs <= tMs) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return best;
  };

  const drawArrowCursor = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, fill: string, stroke: string) => {
    const w = size * 0.6;
    const h = size * 1.2;
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w, h);
    ctx.lineTo(w * 0.55, h);
    ctx.lineTo(w * 0.9, h * 1.55);
    ctx.lineTo(w * 0.6, h * 1.65);
    ctx.lineTo(w * 0.25, h * 1.05);
    ctx.lineTo(0, h * 1.35);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(1, size * 0.08);
    ctx.stroke();
    ctx.restore();
  };

  const drawCursor = (
    ctx: CanvasRenderingContext2D,
    preset: CursorTrack['style']['preset'],
    x: number,
    y: number,
    size: number,
    dragging: boolean,
  ) => {
    const fill = 'rgba(255,255,255,0.95)';
    const stroke = 'rgba(0,0,0,0.5)';
    const dragAccent = 'rgba(52,178,123,0.9)';

    if (dragging) {
      ctx.beginPath();
      ctx.strokeStyle = dragAccent;
      ctx.lineWidth = Math.max(2, size * 0.15);
      ctx.arc(x, y, size * 0.85, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (preset === 'dot') {
      ctx.beginPath();
      ctx.fillStyle = fill;
      ctx.arc(x, y, size * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = Math.max(1, size * 0.08);
      ctx.stroke();
      return;
    }

    if (preset === 'circle') {
      ctx.beginPath();
      ctx.strokeStyle = fill;
      ctx.lineWidth = Math.max(2, size * 0.12);
      ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      if (dragging) {
        ctx.beginPath();
        ctx.strokeStyle = dragAccent;
        ctx.lineWidth = Math.max(1, size * 0.08);
        ctx.arc(x, y, size * 0.75, 0, Math.PI * 2);
        ctx.stroke();
      }
      return;
    }

    // Use SVG image for arrow preset
    const img = cursorImageRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.save();
      const scale = size / 32; // SVG is 32x32, scale to desired size
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.drawImage(img, -16, -16); // Center the image (32/2 = 16)
      ctx.restore();
    } else {
      // Fallback to drawn arrow if image not loaded yet
      drawArrowCursor(ctx, x, y, size, fill, stroke);
    }
  };

  const clampFocusToStage = useCallback((focus: ZoomFocus, depth: ZoomDepth) => {
    return clampFocusToStageUtil(focus, depth, stageSizeRef.current);
  }, []);

  // Helper: compute stage pixel coords (pre-camera transform) from normalized video coords (nx, ny)
  const getStageCoordsFromNormalized = useCallback((nx: number, ny: number) => {
    const lockedDims = lockedVideoDimensionsRef.current;
    if (!lockedDims || lockedDims.width === 0 || lockedDims.height === 0) return null;

    const fullVideoWidth = lockedDims.width;
    const fullVideoHeight = lockedDims.height;

    const videoX = nx * fullVideoWidth;
    const videoY = ny * fullVideoHeight;

    const cropBounds = cropBoundsRef.current;
    if (cropBounds.endX > cropBounds.startX && cropBounds.endY > cropBounds.startY) {
      if (videoX < cropBounds.startX || videoX > cropBounds.endX ||
          videoY < cropBounds.startY || videoY > cropBounds.endY) {
        return null;
      }
    }

    const baseScale = baseScaleRef.current;
    const baseOffset = baseOffsetRef.current;
    if (!stageSizeRef.current.width || !stageSizeRef.current.height || baseScale <= 0) {
      return null;
    }

    const stageX = baseOffset.x + videoX * baseScale;
    const stageY = baseOffset.y + videoY * baseScale;
    return { stageX, stageY };
  }, []);

  const updateOverlayForRegion = useCallback((region: ZoomRegion | null, focusOverride?: ZoomFocus) => {
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
  }, []);

  const layoutVideoContent = useCallback(() => {
    const container = containerRef.current;
    const app = appRef.current;
    const videoSprite = videoSpriteRef.current;
    const maskGraphics = maskGraphicsRef.current;
    const videoElement = videoRef.current;
    const cameraContainer = cameraContainerRef.current;

    if (!container || !app || !videoSprite || !maskGraphics || !videoElement || !cameraContainer) {
      return;
    }

    // Lock video dimensions on first layout to prevent resize issues
    if (!lockedVideoDimensionsRef.current && videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
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
    });

    if (result) {
      stageSizeRef.current = result.stageSize;
      videoSizeRef.current = result.videoSize;
      baseScaleRef.current = result.baseScale;
      baseOffsetRef.current = result.baseOffset;
      baseMaskRef.current = result.maskRect;
      cropBoundsRef.current = result.cropBounds;

      // Reset camera container to identity
      cameraContainer.scale.set(1);
      cameraContainer.position.set(0, 0);

      const selectedId = selectedZoomIdRef.current;
      const activeRegion = selectedId
        ? zoomRegionsRef.current.find((region) => region.id === selectedId) ?? null
        : null;

      updateOverlayForRegion(activeRegion);
    }
  }, [updateOverlayForRegion, cropRegion, borderRadius, padding]);

  useEffect(() => {
    layoutVideoContentRef.current = layoutVideoContent;
  }, [layoutVideoContent]);

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
    } catch { /* empty */ }
  };

  const handleOverlayPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    endFocusDrag(event);
  };

  const handleOverlayPointerLeave = (event: React.PointerEvent<HTMLDivElement>) => {
    endFocusDrag(event);
  };

  useEffect(() => {
    zoomRegionsRef.current = zoomRegions;
  }, [zoomRegions]);

  useEffect(() => {
    selectedZoomIdRef.current = selectedZoomId;
  }, [selectedZoomId]);

  // Follow anchor ref and keep props in refs for synchronous access in ticker
  const followAnchorRef = useRef<ZoomFocus | null>(null);
  const zoomFollowEnabledRef = useRef<boolean>(zoomFollowEnabled);
  const zoomFollowModeRef = useRef<'center' | 'anchor'>(zoomFollowMode);
  const zoomFollowDelayMsRef = useRef<number>(zoomFollowDelayMs);
  const zoomFollowMinPaddingPxRef = useRef<number>(zoomFollowMinPaddingPx);
  // Cursor smoothing refs
  const cursorSmoothingRef = useRef<CursorSmoothing>(cursorSmoothing);
  const quadraticStrengthRef = useRef<number | undefined>(quadraticSmoothingStrength);
  const end2endParamsRefLocal = useRef<End2EndParams | undefined>(end2endParams);

  useEffect(() => { cursorSmoothingRef.current = cursorSmoothing; }, [cursorSmoothing]);
  useEffect(() => { quadraticStrengthRef.current = quadraticSmoothingStrength; }, [quadraticSmoothingStrength]);
  useEffect(() => { end2endParamsRefLocal.current = end2endParams; }, [end2endParams]);

  useEffect(() => { zoomFollowEnabledRef.current = zoomFollowEnabled; }, [zoomFollowEnabled]);
  useEffect(() => { zoomFollowModeRef.current = zoomFollowMode as 'center' | 'anchor'; }, [zoomFollowMode]);
  useEffect(() => { zoomFollowDelayMsRef.current = zoomFollowDelayMs; }, [zoomFollowDelayMs]);
  useEffect(() => { zoomFollowMinPaddingPxRef.current = zoomFollowMinPaddingPx; }, [zoomFollowMinPaddingPx]);

  // Reset anchor when selected zoom changes (start fresh anchoring)
  useEffect(() => {
    followAnchorRef.current = null;
  }, [selectedZoomId]);
  // Also watch global fallback values (in case parent didn't wire up callbacks)
  useEffect(() => {
    try {
      if ((window as any).__openscreen_zoomFollowEnabled !== undefined) {
        zoomFollowEnabledRef.current = Boolean((window as any).__openscreen_zoomFollowEnabled);
      }
      if ((window as any).__openscreen_zoomFollowMode) {
        zoomFollowModeRef.current = (window as any).__openscreen_zoomFollowMode;
      }
      if ((window as any).__openscreen_zoomFollowDelayMs !== undefined) {
        zoomFollowDelayMsRef.current = Number((window as any).__openscreen_zoomFollowDelayMs);
      }
      if ((window as any).__openscreen_zoomFollowMinPaddingPx !== undefined) {
        zoomFollowMinPaddingPxRef.current = Number((window as any).__openscreen_zoomFollowMinPaddingPx);
      }
    } catch {}
  }, []);

  // When follow is enabled or mode changes to 'center', snap the camera to the
  // smoothed cursor position immediately and clear any anchor so the ticker will
  // continue following the cursor using the configured smoothing mode.
  useEffect(() => {
    if (!pixiReady || !videoReady) return;
    // Only run when parent props or global mode enable center-follow.
    const shouldSnap =
      Boolean(zoomFollowEnabledRef.current || (typeof window !== 'undefined' && (window as any).__openscreen_zoomFollowEnabled)) &&
      (zoomFollowModeRef.current === 'center' || (typeof window !== 'undefined' && (window as any).__openscreen_zoomFollowMode === 'center'));
    if (!shouldSnap) return;

    try {
      if (!cursorTrack || !cursorTrack.events || cursorTrack.events.length === 0) return;

      const events = cursorTrack.events;
      const offsetFromStyle = cursorTrack.style?.offsetMs ?? DEFAULT_CURSOR_STYLE.offsetMs ?? 0;
      const playheadMs = Math.round(currentTimeRef.current) + offsetFromStyle;
      const lastIdx = findLastIndex(events, playheadMs);
      if (lastIdx < 0) return;

      // Interpolate between events to get precise normalized position
      let nx = events[lastIdx].nx;
      let ny = events[lastIdx].ny;
      const nextEv = events[lastIdx + 1];
      const curEv = events[lastIdx];
      if (nextEv && nextEv.tMs > curEv.tMs) {
        const frac = Math.max(0, Math.min(1, (playheadMs - curEv.tMs) / (nextEv.tMs - curEv.tMs)));
        nx = curEv.nx + (nextEv.nx - curEv.nx) * frac;
        ny = curEv.ny + (nextEv.ny - curEv.ny) * frac;
      }

      const stagePt = getStageCoordsFromNormalized(nx, ny);
      const stageSize = stageSizeRef.current;
      if (!stagePt || !stageSize.width || !stageSize.height) return;

      const smoothingMode = cursorSmoothingRef.current || 'none';
      let targetCx = clamp01(stagePt.stageX / stageSize.width);
      let targetCy = clamp01(stagePt.stageY / stageSize.height);

      if (smoothingMode === 'end2end' && end2endParamsRefLocal.current) {
        const displayEventsForCursor: { tMs: number; x: number; y: number; kind: any; dragging: boolean }[] = [];
        for (let i = 0; i < events.length; i += 1) {
          const ev = events[i];
          const pos = getStageCoordsFromNormalized(ev.nx, ev.ny);
          if (!pos) continue;
          displayEventsForCursor.push({
            tMs: ev.tMs,
            x: pos.stageX + (cursorTrack.style?.offsetX ?? DEFAULT_CURSOR_STYLE.offsetX ?? 0),
            y: pos.stageY + (cursorTrack.style?.offsetY ?? DEFAULT_CURSOR_STYLE.offsetY ?? 0),
            kind: ev.kind,
            dragging: ev.dragging,
          });
        }
        const pausePoints = extractPausePointsFromDisplayEvents(displayEventsForCursor, end2endParamsRefLocal.current);
        const arrivalFrac = typeof end2endParamsRefLocal.current.arrivalFraction === 'number' ? end2endParamsRefLocal.current.arrivalFraction : 1.0;
        const evaluated = evaluatePositionOnCRByTime(pausePoints, playheadMs, arrivalFrac);
        if (evaluated) {
          targetCx = clamp01(evaluated.x / stageSize.width);
          targetCy = clamp01(evaluated.y / stageSize.height);
        }
      } else if (smoothingMode === 'quadratic') {
        const strength = typeof quadraticStrengthRef.current === 'number' ? quadraticStrengthRef.current : 0.5;
        const windowSize = Math.max(1, Math.round(1 + strength * 6));
        const startIdx = Math.max(0, lastIdx - windowSize + 1);
        let sumX = 0;
        let sumY = 0;
        let cnt = 0;
        for (let i = startIdx; i <= lastIdx; i += 1) {
          const ev = events[i];
          const pos = getStageCoordsFromNormalized(ev.nx, ev.ny);
          if (!pos) continue;
          const w = 1 + (i - startIdx);
          sumX += pos.stageX * w;
          sumY += pos.stageY * w;
          cnt += w;
        }
        if (cnt > 0) {
          const avgX = sumX / cnt;
          const avgY = sumY / cnt;
          targetCx = clamp01(avgX / stageSize.width);
          targetCy = clamp01(avgY / stageSize.height);
        }
      }

      // Clear any anchor and snap animation state to the smoothed cursor target so
      // ticker will continue to update from there.
      followAnchorRef.current = null;
      animationStateRef.current.focusX = targetCx;
      animationStateRef.current.focusY = targetCy;

      // Immediately apply transform so user sees the snap without waiting a tick.
      const cameraContainer = cameraContainerRef.current;
      if (cameraContainer) {
        applyZoomTransform({
          cameraContainer,
          blurFilter: blurFilterRef.current,
          stageSize: stageSizeRef.current,
          baseMask: baseMaskRef.current,
          zoomScale: animationStateRef.current.scale,
          focusX: animationStateRef.current.focusX,
          focusY: animationStateRef.current.focusY,
          motionIntensity: 0,
          isPlaying: isPlayingRef.current,
          motionBlurEnabled: motionBlurEnabledRef.current,
        });
      }
    } catch (err) {
      // swallow; this is an opportunistic snap
    }
  }, [pixiReady, videoReady]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    trimRegionsRef.current = trimRegions;
  }, [trimRegions]);

  useEffect(() => {
    motionBlurEnabledRef.current = motionBlurEnabled;
  }, [motionBlurEnabled]);

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
    };

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
        motionBlurEnabled: motionBlurEnabledRef.current,
      });

      requestAnimationFrame(() => {
        const finalApp = appRef.current;
        if (wasPlaying && video) {
          video.play().catch(() => {
          });
        }
        if (tickerWasStarted && finalApp?.ticker) {
          finalApp.ticker.start();
        }
      });
    });
  }, [pixiReady, videoReady, layoutVideoContent, cropRegion]);

  useEffect(() => {
    if (!pixiReady || !videoReady) return;
    const container = containerRef.current;
    if (!container) return;

    if (typeof ResizeObserver === 'undefined') {
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
    const overlayEl = overlayRef.current;
    if (!overlayEl) return;
    if (!selectedZoom) {
      overlayEl.style.cursor = 'default';
      overlayEl.style.pointerEvents = 'none';
      return;
    }
    overlayEl.style.cursor = isPlaying ? 'not-allowed' : 'grab';
    overlayEl.style.pointerEvents = isPlaying ? 'none' : 'auto';
  }, [selectedZoom, isPlaying]);

  useEffect(() => {
    if (!pixiReady || !videoReady) return;
    const overlayEl = overlayRef.current;
    if (!overlayEl) return;

    resizeCursorCanvas();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(() => {
      resizeCursorCanvas();
    });
    observer.observe(overlayEl);
    return () => {
      observer.disconnect();
    };
  }, [pixiReady, videoReady, resizeCursorCanvas]);

  useEffect(() => {
    if (!pixiReady || !videoReady) return;
    const overlayEl = overlayRef.current;
    const canvas = cursorCanvasRef.current;
    if (!overlayEl || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    resizeCursorCanvas();

    const width = overlayEl.clientWidth;
    const height = overlayEl.clientHeight;
    if (!width || !height) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    if (!cursorEnabled || !cursorTrack || cursorTrack.events.length === 0) {
      return;
    }

    // Get layout information to properly map cursor coordinates
    const maskRect = baseMaskRef.current;
    const cropBounds = cropBoundsRef.current;
    
    // Get current zoom state
    const animationState = animationStateRef.current;
    const zoomScale = animationState.scale;
    
    // When zoom is active, video is displayed full-screen, so use full overlay area
    // Otherwise, use maskRect (which represents the cropped/scaled video area)
    const displayArea = (zoomScale > 1)
      ? { x: 0, y: 0, width, height }  // Full overlay when zoomed
      : (maskRect.width > 0 && maskRect.height > 0 
          ? maskRect 
          : { x: 0, y: 0, width, height });

    const events = cursorTrack.events;
    const offsetFromStyle = cursorTrack.style?.offsetMs ?? DEFAULT_CURSOR_STYLE.offsetMs ?? 0;
    const styleOffsetX = cursorTrack.style?.offsetX ?? DEFAULT_CURSOR_STYLE.offsetX ?? 0;
    const styleOffsetY = cursorTrack.style?.offsetY ?? DEFAULT_CURSOR_STYLE.offsetY ?? 0;
    const playheadMs = Math.round(currentTime * 1000) + offsetFromStyle;
    const lastIndex = findLastIndex(events, playheadMs);
    if (lastIndex < 0) return;

    // Helper function to convert normalized video coordinates to display coordinates
    // Normalized coordinates (nx, ny) are relative to the full video dimensions (before crop)
    const normalizeToDisplay = (nx: number, ny: number) => {
      const lockedDims = lockedVideoDimensionsRef.current;
      // If we don't have locked video dimensions, fallback to simple mapping into displayArea
      if (!lockedDims || lockedDims.width === 0 || lockedDims.height === 0) {
        const displayX = displayArea.x + nx * displayArea.width;
        const displayY = displayArea.y + ny * displayArea.height;
        return { x: displayX, y: displayY };
      }

      const fullVideoWidth = lockedDims.width;
      const fullVideoHeight = lockedDims.height;

      // Convert normalized coords to full-video pixel coordinates
      const videoX = nx * fullVideoWidth;
      const videoY = ny * fullVideoHeight;

      // If there is a crop and the point is outside the cropped bounds, skip drawing
      if (cropBounds.endX > cropBounds.startX && cropBounds.endY > cropBounds.startY) {
        if (videoX < cropBounds.startX || videoX > cropBounds.endX ||
            videoY < cropBounds.startY || videoY > cropBounds.endY) {
          return null;
        }
      }

      // Map video pixel to stage coordinates using the same base sprite transform
      // stage = baseOffset + videoPixel * baseScale
      const baseScale = baseScaleRef.current;
      const baseOffset = baseOffsetRef.current;
      const stageSize = stageSizeRef.current;

      if (!stageSize.width || !stageSize.height || baseScale <= 0) {
        // Fallback to displayArea mapping if stage info not ready
        const displayX = displayArea.x + nx * displayArea.width;
        const displayY = displayArea.y + ny * displayArea.height;
        return { x: displayX, y: displayY };
      }

      const stageX = baseOffset.x + videoX * baseScale;
      const stageY = baseOffset.y + videoY * baseScale;

      // Apply camera transform used by Pixi: scale about the focus then translate so focus is centered.
      const focusX = animationState.focusX;
      const focusY = animationState.focusY;
      const zoom = zoomScale;

      const focusStagePxX = focusX * stageSize.width;
      const focusStagePxY = focusY * stageSize.height;

      const stageCenterX = stageSize.width / 2;
      const stageCenterY = stageSize.height / 2;

      const screenX = stageCenterX + (stageX - focusStagePxX) * zoom;
      const screenY = stageCenterY + (stageY - focusStagePxY) * zoom;

      return { x: screenX, y: screenY };
    };

    // Compute current cursor position. For end2end mode we derive position
    // from the detected endpoints (straight-line interpolation by time).
    const smoothing = cursorSmoothing || 'none';
    let x: number;
    let y: number;
    let dragging = false;

    if (smoothing === 'end2end' && end2endParams) {
      // Build display-space move events from the ENTIRE track (not limited to lastIndex).
      // Pause points require knowledge of subsequent motion beginnings, so we must
      // analyze the full event stream to correctly identify pause points.
      const displayEventsForCursor: { tMs: number; x: number; y: number; kind: any; dragging: boolean }[] = [];
      for (let i = 0; i < events.length; i += 1) {
        const ev = events[i];
        const pos = normalizeToDisplay(ev.nx, ev.ny);
        if (!pos) continue;
        displayEventsForCursor.push({ tMs: ev.tMs, x: pos.x + styleOffsetX, y: pos.y + styleOffsetY, kind: ev.kind, dragging: ev.dragging });
      }
      const pausePoints = extractPausePointsFromDisplayEvents(displayEventsForCursor, end2endParams);
      const arrivalFrac = typeof end2endParams.arrivalFraction === 'number' ? end2endParams.arrivalFraction : 1.0;
      const pos = evaluatePositionOnCRByTime(pausePoints, playheadMs, arrivalFrac);
      if (!pos) return;
      x = pos.x;
      y = pos.y;
      dragging = false;
    } else {
      const currentEvent = events[lastIndex];
      const displayPos = normalizeToDisplay(currentEvent.nx, currentEvent.ny);
      if (!displayPos) return; // Coordinate is outside visible area
      displayPos.x += styleOffsetX;
      displayPos.y += styleOffsetY;
      x = displayPos.x;
      y = displayPos.y;
      dragging = currentEvent.dragging;
    }
    
    const baseSize = Math.max(6, cursorTrack.style.sizePx);
    // Apply zoom scale to cursor size so it scales with the video
    const cursorSize = (dragging ? baseSize * 1.1 : baseSize) * zoomScale;

    // If playback is paused, draw the full cursor path so user can inspect smoothing
    const isPlaying = isPlayingRef.current;
    let trailStartIndex = 0;

    if (!isPlaying) {
      // Draw full path (or endpoints) when paused so user can inspect smoothing
      if (smoothing === 'end2end' && end2endParams) {
        // Build display-space move events
        const displayEvents: { tMs: number; x: number; y: number; kind: any; dragging: boolean }[] = [];
        for (let i = 0; i < events.length; i += 1) {
          const ev = events[i];
          const pos = normalizeToDisplay(ev.nx, ev.ny);
          if (!pos) continue;
          displayEvents.push({ tMs: ev.tMs, x: pos.x + styleOffsetX, y: pos.y + styleOffsetY, kind: ev.kind, dragging: ev.dragging });
        }
        const pausePoints = extractPausePointsFromDisplayEvents(displayEvents, end2endParams);
        if (pausePoints.length >= 2) {
          const sampled = sampleCRPath(pausePoints, 12);
          if (sampled.length >= 2) {
            ctx.beginPath();
            ctx.moveTo(sampled[0].x, sampled[0].y);
            for (let k = 1; k < sampled.length; k += 1) {
              ctx.lineTo(sampled[k].x, sampled[k].y);
            }
            ctx.strokeStyle = 'rgba(255,255,255,0.22)';
            ctx.lineWidth = Math.max(1, baseSize * 0.08) * zoomScale;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
          }
        }
      } else {
        // Draw full path of all events (visible ones)
        const pts: { x: number; y: number }[] = [];
          for (let i = 0; i < events.length; i += 1) {
          const ev = events[i];
          const pos = normalizeToDisplay(ev.nx, ev.ny);
          if (!pos) continue;
          pts.push({ x: pos.x + styleOffsetX, y: pos.y + styleOffsetY });
        }

        if (pts.length >= 2) {
          ctx.beginPath();
          if (smoothing === 'none') {
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i += 1) {
              ctx.lineTo(pts[i].x, pts[i].y);
            }
          } else if (smoothing === 'quadratic') {
            const strength = typeof quadraticSmoothingStrength === 'number' ? quadraticSmoothingStrength : 0.5;
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i += 1) {
              const prev = pts[i - 1];
              const cur = pts[i];
              const midX = (prev.x + cur.x) / 2;
              const midY = (prev.y + cur.y) / 2;
              const ctrlX = prev.x + (cur.x - prev.x) * strength;
              const ctrlY = prev.y + (cur.y - prev.y) * strength;
              ctx.quadraticCurveTo(ctrlX, ctrlY, midX, midY);
            }
            ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
          }

          ctx.strokeStyle = 'rgba(255,255,255,0.22)';
          ctx.lineWidth = Math.max(1, baseSize * 0.08) * zoomScale;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();
        }
      }
    } else {
      const trailStartMs = Math.max(0, playheadMs - CURSOR_TRAIL_MS);
      trailStartIndex = Math.min(lastIndex, findFirstIndex(events, trailStartMs));

      if (lastIndex - trailStartIndex >= 1) {
        // Collect visible points for trail drawing
        if (smoothing === 'end2end' && end2endParams) {
          // Build display-space events for the trail window
        const displayEvents: { tMs: number; x: number; y: number; kind: any; dragging: boolean }[] = [];
        for (let i = trailStartIndex; i <= lastIndex; i += 1) {
          const ev = events[i];
          const pos = normalizeToDisplay(ev.nx, ev.ny);
          if (!pos) continue;
          displayEvents.push({ tMs: ev.tMs, x: pos.x + styleOffsetX, y: pos.y + styleOffsetY, kind: ev.kind, dragging: ev.dragging });
        }
        const pausePoints = extractPausePointsFromDisplayEvents(displayEvents, end2endParams);
        if (pausePoints.length >= 2) {
          const sampled = sampleCRPath(pausePoints, 10);
          if (sampled.length >= 2) {
            ctx.beginPath();
            ctx.moveTo(sampled[0].x, sampled[0].y);
            for (let k = 1; k < sampled.length; k += 1) {
              ctx.lineTo(sampled[k].x, sampled[k].y);
            }
            ctx.strokeStyle = dragging ? 'rgba(52,178,123,0.55)' : 'rgba(255,255,255,0.35)';
            ctx.lineWidth = Math.max(1, baseSize * 0.12) * zoomScale;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
          }
        }
        } else {
          // Collect visible points for trail drawing
          const pts: { x: number; y: number }[] = [];
          for (let i = trailStartIndex; i <= lastIndex; i += 1) {
            const ev = events[i];
            const pos = normalizeToDisplay(ev.nx, ev.ny);
            if (!pos) continue;
            pts.push({ x: pos.x + styleOffsetX, y: pos.y + styleOffsetY });
          }

          if (pts.length >= 2) {
            ctx.beginPath();
            if (smoothing === 'none') {
              ctx.moveTo(pts[0].x, pts[0].y);
              for (let i = 1; i < pts.length; i += 1) {
                ctx.lineTo(pts[i].x, pts[i].y);
              }
            } else if (smoothing === 'quadratic') {
              // Quadratic smoothing using midpoints with configurable strength
              const strength = typeof quadraticSmoothingStrength === 'number' ? quadraticSmoothingStrength : 0.5;
              ctx.moveTo(pts[0].x, pts[0].y);
              for (let i = 1; i < pts.length; i += 1) {
                const prev = pts[i - 1];
                const cur = pts[i];
                const midX = (prev.x + cur.x) / 2;
                const midY = (prev.y + cur.y) / 2;
                const ctrlX = prev.x + (cur.x - prev.x) * strength;
                const ctrlY = prev.y + (cur.y - prev.y) * strength;
                ctx.quadraticCurveTo(ctrlX, ctrlY, midX, midY);
              }
              // Ensure curve reaches last point
              ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
            }

            ctx.strokeStyle = dragging ? 'rgba(52,178,123,0.55)' : 'rgba(255,255,255,0.35)';
            ctx.lineWidth = Math.max(1, baseSize * 0.12) * zoomScale;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
          }
        }
      }
    }

    if (CURSOR_CLICK_MS > 0) {
      const clickStartIndex = trailStartIndex;
      for (let i = clickStartIndex; i <= lastIndex; i += 1) {
        const ev = events[i];
        if (ev.kind !== 'down') continue;
        const elapsed = playheadMs - ev.tMs;
        if (elapsed < 0 || elapsed > CURSOR_CLICK_MS) continue;
        const progress = elapsed / CURSOR_CLICK_MS;
        const alpha = 1 - progress;
        const radius = baseSize * (0.5 + progress * 1.6) * zoomScale;
        const pos = normalizeToDisplay(ev.nx, ev.ny);
        if (!pos) continue; // Skip clicks outside visible area
        pos.x += styleOffsetX;
        pos.y += styleOffsetY;
        
        ctx.beginPath();
        ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.7})`;
        ctx.lineWidth = Math.max(1, baseSize * 0.08) * zoomScale;
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    drawCursor(ctx, cursorTrack.style.preset, x, y, cursorSize, dragging);
    }, [pixiReady, videoReady, currentTime, cursorTrack, cursorEnabled, cursorSmoothing, quadraticSmoothingStrength, end2endParams, CURSOR_TRAIL_MS, CURSOR_CLICK_MS, resizeCursorCanvas, cropRegion, padding]);
  // Redraw cursor overlay when enabled/smoothing changes

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
        app.destroy(true, { children: true, texture: true, textureSource: true });
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
        app.destroy(true, { children: true, texture: true, textureSource: true });
      }
      appRef.current = null;
      cameraContainerRef.current = null;
      videoContainerRef.current = null;
      videoSpriteRef.current = null;
    };
  }, []);

  useEffect(() => {
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
    if ('autoPlay' in source) {
      (source as { autoPlay?: boolean }).autoPlay = false;
    }
    if ('autoUpdate' in source) {
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
    };

    const blurFilter = new BlurFilter();
    blurFilter.quality = 3;
    blurFilter.resolution = app.renderer.resolution;
    blurFilter.blur = 0;
    videoContainer.filters = [blurFilter];
    blurFilterRef.current = blurFilter;
    
    layoutVideoContent();
    video.pause();

    const { handlePlay, handlePause, handleSeeked, handleSeeking } = createVideoEventHandlers({
      video,
      isSeekingRef,
      isPlayingRef,
      allowPlaybackRef,
      currentTimeRef,
      timeUpdateAnimationRef,
      onPlayStateChange,
      onTimeUpdate,
      trimRegionsRef,
    });
    
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handlePause);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('seeking', handleSeeking);
    
    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handlePause);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('seeking', handleSeeking);
      
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
      videoTexture.destroy(true);
      
      videoSpriteRef.current = null;
    };
  }, [pixiReady, videoReady, onTimeUpdate, updateOverlayForRegion]);

  useEffect(() => {
    if (!pixiReady || !videoReady) return;

    const app = appRef.current;
    const videoSprite = videoSpriteRef.current;
    const videoContainer = videoContainerRef.current;
    if (!app || !videoSprite || !videoContainer) return;

    const applyTransform = (motionIntensity: number) => {
      const cameraContainer = cameraContainerRef.current;
      if (!cameraContainer) return;

      const state = animationStateRef.current;

      applyZoomTransform({
        cameraContainer,
        blurFilter: blurFilterRef.current,
        stageSize: stageSizeRef.current,
        baseMask: baseMaskRef.current,
        zoomScale: state.scale,
        focusX: state.focusX,
        focusY: state.focusY,
        motionIntensity,
        isPlaying: isPlayingRef.current,
        motionBlurEnabled: motionBlurEnabledRef.current,
      });
    };

    const ticker = () => {
      const { region, strength } = findDominantRegion(zoomRegionsRef.current, currentTimeRef.current);
      
      const defaultFocus = DEFAULT_FOCUS;
      let targetScaleFactor = 1;
      let targetFocus = defaultFocus;

      // If a zoom is selected but video is not playing, show default unzoomed view
      // (the overlay will show where the zoom will be)
      const selectedId = selectedZoomIdRef.current;
      const hasSelectedZoom = selectedId !== null;
      const shouldShowUnzoomedView = hasSelectedZoom && !isPlayingRef.current;

      if (region && strength > 0 && !shouldShowUnzoomedView) {
        const zoomScale = ZOOM_DEPTH_SCALES[region.depth];
        const regionFocus = clampFocusToStage(region.focus, region.depth);
        
        // Interpolate scale and focus based on region strength
        targetScaleFactor = 1 + (zoomScale - 1) * strength;
        targetFocus = {
          cx: defaultFocus.cx + (regionFocus.cx - defaultFocus.cx) * strength,
          cy: defaultFocus.cy + (regionFocus.cy - defaultFocus.cy) * strength,
        };
      }

      // Apply zoom-follow behavior if enabled (read from refs or global fallback)
      const followEnabled = Boolean(zoomFollowEnabledRef.current || (typeof window !== 'undefined' && (window as any).__openscreen_zoomFollowEnabled));
      // Only enable follow when parent/global follow is enabled AND there is an active
      // zoom region (strength > 0). This ensures we only follow during zoom and its
      // fade-in/fade-out period.
      if (followEnabled && region && strength > 0 && cursorTrack && cursorTrack.events && cursorTrack.events.length > 0) {
        try {
          // Debug logging when enabled
          try {
            if ((window as any).__openscreen_debugZoomFollow) {
              console.debug('[zoomFollow] enabled', { followEnabled, zoomFollowMode: zoomFollowModeRef.current, selectedId: selectedZoomIdRef.current, region, strength, targetScaleFactor });
            }
          } catch {}
          const events = cursorTrack.events;
          const offsetFromStyle = cursorTrack.style?.offsetMs ?? DEFAULT_CURSOR_STYLE.offsetMs ?? 0;
          const playheadMs = Math.round(currentTimeRef.current) + offsetFromStyle;

          // Compute a smoothed follow target even if playhead is outside immediate event bounds.
          const stageSize = stageSizeRef.current;
          if (events.length > 0 && stageSize.width && stageSize.height) {
            // Default followTarget is the current region targetFocus
            let followTarget = { cx: targetFocus.cx, cy: targetFocus.cy };
            const smoothingMode = cursorSmoothingRef.current || 'none';

            if (smoothingMode === 'end2end' && end2endParamsRefLocal.current) {
              const displayEventsForCursor: { tMs: number; x: number; y: number; kind: any; dragging: boolean }[] = [];
              for (let i = 0; i < events.length; i += 1) {
                const ev = events[i];
                const pos = getStageCoordsFromNormalized(ev.nx, ev.ny);
                if (!pos) continue;
                displayEventsForCursor.push({
                  tMs: ev.tMs,
                  x: pos.stageX + (cursorTrack.style?.offsetX ?? DEFAULT_CURSOR_STYLE.offsetX ?? 0),
                  y: pos.stageY + (cursorTrack.style?.offsetY ?? DEFAULT_CURSOR_STYLE.offsetY ?? 0),
                  kind: ev.kind,
                  dragging: ev.dragging,
                });
              }
              const pausePoints = extractPausePointsFromDisplayEvents(displayEventsForCursor, end2endParamsRefLocal.current);
              const arrivalFrac = typeof end2endParamsRefLocal.current.arrivalFraction === 'number' ? end2endParamsRefLocal.current.arrivalFraction : 1.0;
              const evaluated = evaluatePositionOnCRByTime(pausePoints, playheadMs, arrivalFrac);
              if (evaluated) {
                followTarget = { cx: clamp01(evaluated.x / stageSize.width), cy: clamp01(evaluated.y / stageSize.height) };
              } else {
                // Fallback to last-known event position
                const lastIdx = findLastIndex(events, playheadMs);
                if (lastIdx >= 0) {
                  const pos = getStageCoordsFromNormalized(events[lastIdx].nx, events[lastIdx].ny);
                  if (pos) followTarget = { cx: clamp01(pos.stageX / stageSize.width), cy: clamp01(pos.stageY / stageSize.height) };
                }
              }
            } else if (smoothingMode === 'quadratic') {
              const lastIdx = findLastIndex(events, playheadMs);
              const strength = typeof quadraticStrengthRef.current === 'number' ? quadraticStrengthRef.current : 0.5;
              const windowSize = Math.max(1, Math.round(1 + strength * 6));
              const startIdx = Math.max(0, (lastIdx >= 0 ? lastIdx : events.length - 1) - windowSize + 1);
              let sumX = 0;
              let sumY = 0;
              let cnt = 0;
              for (let i = startIdx; i < events.length && i <= startIdx + windowSize; i += 1) {
                const ev = events[i];
                const pos = getStageCoordsFromNormalized(ev.nx, ev.ny);
                if (!pos) continue;
                const w = 1 + (i - startIdx);
                sumX += pos.stageX * w;
                sumY += pos.stageY * w;
                cnt += w;
              }
              if (cnt > 0) {
                const avgX = sumX / cnt;
                const avgY = sumY / cnt;
                followTarget = { cx: clamp01(avgX / stageSize.width), cy: clamp01(avgY / stageSize.height) };
              } else {
                const lastIdx2 = findLastIndex(events, playheadMs);
                if (lastIdx2 >= 0) {
                  const pos = getStageCoordsFromNormalized(events[lastIdx2].nx, events[lastIdx2].ny);
                  if (pos) followTarget = { cx: clamp01(pos.stageX / stageSize.width), cy: clamp01(pos.stageY / stageSize.height) };
                }
              }
            } else {
              // none: use interpolated normalized position if possible
              const lastIdx = findLastIndex(events, playheadMs);
              if (lastIdx >= 0) {
                let nx = events[lastIdx].nx;
                let ny = events[lastIdx].ny;
                const nextEv = events[lastIdx + 1];
                const curEv = events[lastIdx];
                if (nextEv && nextEv.tMs > curEv.tMs) {
                  const frac = Math.max(0, Math.min(1, (playheadMs - curEv.tMs) / (nextEv.tMs - curEv.tMs)));
                  nx = curEv.nx + (nextEv.nx - curEv.nx) * frac;
                  ny = curEv.ny + (nextEv.ny - curEv.ny) * frac;
                }
                const pos = getStageCoordsFromNormalized(nx, ny);
                if (pos) followTarget = { cx: clamp01(pos.stageX / stageSize.width), cy: clamp01(pos.stageY / stageSize.height) };
              }
            }

            const followMode = zoomFollowModeRef.current || (typeof window !== 'undefined' && (window as any).__openscreen_zoomFollowMode) || 'center';
            if (followMode === 'center') {
              targetFocus = followTarget;
            } else {
              // Anchor mode: adjust anchor when cursor near edge
              if (!followAnchorRef.current) {
                followAnchorRef.current = { cx: followTarget.cx, cy: followTarget.cy };
              }
              const anchor = followAnchorRef.current;
              const anchorStageX = anchor.cx * stageSize.width;
              const anchorStageY = anchor.cy * stageSize.height;
              const zoom = targetScaleFactor;
              const viewW = Math.max(1, stageSize.width / zoom);
              const viewH = Math.max(1, stageSize.height / zoom);
              const pad = zoomFollowMinPaddingPxRef.current ?? (typeof window !== 'undefined' ? (window as any).__openscreen_zoomFollowMinPaddingPx ?? 24 : 24);

              let newAnchorStageX = anchorStageX;
              let newAnchorStageY = anchorStageY;
              const cursorStageX = followTarget.cx * stageSize.width;
              const cursorStageY = followTarget.cy * stageSize.height;

              const left = anchorStageX - viewW / 2 + pad;
              const right = anchorStageX + viewW / 2 - pad;
              if (cursorStageX < left) {
                newAnchorStageX = cursorStageX + viewW / 2 - pad;
              } else if (cursorStageX > right) {
                newAnchorStageX = cursorStageX - viewW / 2 + pad;
              }

              const top = anchorStageY - viewH / 2 + pad;
              const bottom = anchorStageY + viewH / 2 - pad;
              if (cursorStageY < top) {
                newAnchorStageY = cursorStageY + viewH / 2 - pad;
              } else if (cursorStageY > bottom) {
                newAnchorStageY = cursorStageY - viewH / 2 + pad;
              }

              const clampedX = clamp01(newAnchorStageX / stageSize.width);
              const clampedY = clamp01(newAnchorStageY / stageSize.height);
              followAnchorRef.current = { cx: clampedX, cy: clampedY };
              targetFocus = { cx: clampedX, cy: clampedY };
            }
          }
        } catch (err) {
          // swallow errors in optional follow logic
        }
      } else {
        // Not following right now: clear any existing anchor so we don't persist an
        // anchored follow once the zoom region exits.
        followAnchorRef.current = null;
      }

      const state = animationStateRef.current;

      const prevScale = state.scale;
      const prevFocusX = state.focusX;
      const prevFocusY = state.focusY;

      const scaleDelta = targetScaleFactor - state.scale;
      const focusXDelta = targetFocus.cx - state.focusX;
      const focusYDelta = targetFocus.cy - state.focusY;

      let nextScale = prevScale;
      let nextFocusX = prevFocusX;
      let nextFocusY = prevFocusY;

      if (Math.abs(scaleDelta) > MIN_DELTA) {
        nextScale = prevScale + scaleDelta * SMOOTHING_FACTOR;
      } else {
        nextScale = targetScaleFactor;
      }

      if (Math.abs(focusXDelta) > MIN_DELTA) {
        nextFocusX = prevFocusX + focusXDelta * SMOOTHING_FACTOR;
      } else {
        nextFocusX = targetFocus.cx;
      }

      if (Math.abs(focusYDelta) > MIN_DELTA) {
        nextFocusY = prevFocusY + focusYDelta * SMOOTHING_FACTOR;
      } else {
        nextFocusY = targetFocus.cy;
      }

      state.scale = nextScale;
      state.focusX = nextFocusX;
      state.focusY = nextFocusY;

      const motionIntensity = Math.max(
        Math.abs(nextScale - prevScale),
        Math.abs(nextFocusX - prevFocusX),
        Math.abs(nextFocusY - prevFocusY)
      );

      applyTransform(motionIntensity);
    };

    app.ticker.add(ticker);
    return () => {
      if (app && app.ticker) {
        app.ticker.remove(ticker);
      }
    };
  }, [pixiReady, videoReady, clampFocusToStage]);

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

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        if (!wallpaper) {
          const def = await getAssetPath('wallpapers/wallpaper1.jpg')
          if (mounted) setResolvedWallpaper(def)
          return
        }

        if (wallpaper.startsWith('#') || wallpaper.startsWith('linear-gradient') || wallpaper.startsWith('radial-gradient')) {
          if (mounted) setResolvedWallpaper(wallpaper)
          return
        }

        // If it's a data URL (custom uploaded image), use as-is
        if (wallpaper.startsWith('data:')) {
          if (mounted) setResolvedWallpaper(wallpaper)
          return
        }

        // If it's an absolute web/http or file path, use as-is
        if (wallpaper.startsWith('http') || wallpaper.startsWith('file://') || wallpaper.startsWith('/')) {
          // If it's an absolute server path (starts with '/'), resolve via getAssetPath as well
          if (wallpaper.startsWith('/')) {
            const rel = wallpaper.replace(/^\//, '')
            const p = await getAssetPath(rel)
            if (mounted) setResolvedWallpaper(p)
            return
          }
          if (mounted) setResolvedWallpaper(wallpaper)
          return
        }
        const p = await getAssetPath(wallpaper.replace(/^\//, ''))
        if (mounted) setResolvedWallpaper(p)
      } catch (err) {
        if (mounted) setResolvedWallpaper(wallpaper || '/wallpapers/wallpaper1.jpg')
      }
    })()
    return () => { mounted = false }
  }, [wallpaper])

  useEffect(() => {
    return () => {
      if (videoReadyRafRef.current) {
        cancelAnimationFrame(videoReadyRafRef.current);
        videoReadyRafRef.current = null;
      }
    };
  }, [])

  const isImageUrl = Boolean(resolvedWallpaper && (resolvedWallpaper.startsWith('file://') || resolvedWallpaper.startsWith('http') || resolvedWallpaper.startsWith('/') || resolvedWallpaper.startsWith('data:')))
  const backgroundStyle = isImageUrl
    ? { backgroundImage: `url(${resolvedWallpaper || ''})` }
    : { background: resolvedWallpaper || '' };

  return (
    <div className="relative rounded-sm overflow-hidden" style={{ width: '100%', aspectRatio: formatAspectRatioForCSS(aspectRatio) }}>
      {/* Background layer - always render as DOM element with blur */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          ...backgroundStyle,
          filter: showBlur ? 'blur(2px)' : 'none',
        }}
      />
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{
          filter: (showShadow && shadowIntensity > 0)
            ? `drop-shadow(0 ${shadowIntensity * 12}px ${shadowIntensity * 48}px rgba(0,0,0,${shadowIntensity * 0.7})) drop-shadow(0 ${shadowIntensity * 4}px ${shadowIntensity * 16}px rgba(0,0,0,${shadowIntensity * 0.5})) drop-shadow(0 ${shadowIntensity * 2}px ${shadowIntensity * 8}px rgba(0,0,0,${shadowIntensity * 0.3}))`
            : 'none',
        }}
      />
      {/* Only render overlay after PIXI and video are fully initialized */}
      {pixiReady && videoReady && (
        <div
          ref={overlayRef}
          className="absolute inset-0 select-none"
          style={{ pointerEvents: 'none' }}
          onPointerDown={handleOverlayPointerDown}
          onPointerMove={handleOverlayPointerMove}
          onPointerUp={handleOverlayPointerUp}
          onPointerLeave={handleOverlayPointerLeave}
        >
          <div
            ref={focusIndicatorRef}
            className="absolute rounded-md border border-[#34B27B]/80 bg-[#34B27B]/20 shadow-[0_0_0_1px_rgba(52,178,123,0.35)]"
            style={{ display: 'none', pointerEvents: 'none' }}
          />
          {(() => {
            const filtered = (annotationRegions || []).filter((annotation) => {
              if (typeof annotation.startMs !== 'number' || typeof annotation.endMs !== 'number') return false;
              
              if (annotation.id === selectedAnnotationId) return true;
              
              const timeMs = Math.round(currentTime * 1000);
              return timeMs >= annotation.startMs && timeMs <= annotation.endMs;
            });
            
            // Sort by z-index (lowest to highest) so higher z-index renders on top
            const sorted = [...filtered].sort((a, b) => a.zIndex - b.zIndex);
            
            // Handle click-through cycling: when clicking same annotation, cycle to next
            const handleAnnotationClick = (clickedId: string) => {
              if (!onSelectAnnotation) return;
              
              // If clicking on already selected annotation and there are multiple overlapping
              if (clickedId === selectedAnnotationId && sorted.length > 1) {
                // Find current index and cycle to next
                const currentIndex = sorted.findIndex(a => a.id === clickedId);
                const nextIndex = (currentIndex + 1) % sorted.length;
                onSelectAnnotation(sorted[nextIndex].id);
              } else {
                // First click or clicking different annotation
                onSelectAnnotation(clickedId);
              }
            };
            
            return sorted.map((annotation) => (
              <AnnotationOverlay
                key={annotation.id}
                annotation={annotation}
                isSelected={annotation.id === selectedAnnotationId}
                containerWidth={overlayRef.current?.clientWidth || 800}
                containerHeight={overlayRef.current?.clientHeight || 600}
                onPositionChange={(id, position) => onAnnotationPositionChange?.(id, position)}
                onSizeChange={(id, size) => onAnnotationSizeChange?.(id, size)}
                onClick={handleAnnotationClick}
                zIndex={annotation.zIndex}
                isSelectedBoost={annotation.id === selectedAnnotationId}
              />
            ));
          })()}
          <canvas ref={cursorCanvasRef} className="absolute inset-0" style={{ pointerEvents: 'none' }} />
        </div>
      )}
      <video
        ref={videoRef}
        src={videoPath}
        className="hidden"
        preload="metadata"
        playsInline
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={e => {
          onDurationChange(e.currentTarget.duration);
        }}
        onError={() => onError('Failed to load video')}
      />
    </div>
  );
}

const ForwardedVideoPlayback = forwardRef<VideoPlaybackRef, VideoPlaybackProps>(VideoPlayback);

ForwardedVideoPlayback.displayName = "VideoPlayback";

export default ForwardedVideoPlayback;
