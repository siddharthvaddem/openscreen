import type React from "react";
import { useEffect, useRef, useImperativeHandle, forwardRef, useState, useMemo, useCallback } from "react";
import { getAssetPath } from "@/lib/assetPath";
import { Application, Container, Sprite, Graphics, BlurFilter, Texture, VideoSource } from 'pixi.js';
import { ZOOM_DEPTH_SCALES, type ZoomRegion, type ZoomFocus, type ZoomDepth, type TrimRegion, type AnnotationRegion, type CursorTrack } from "./types";
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

const VideoPlayback = forwardRef<VideoPlaybackRef, VideoPlaybackProps>(({
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
}, ref) => {
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
    } catch {
      
    }
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

    if (!cursorTrack || cursorTrack.events.length === 0) {
      return;
    }

    // Get layout information to properly map cursor coordinates
    const maskRect = baseMaskRef.current;
    const baseScale = baseScaleRef.current;
    const videoSize = videoSizeRef.current;
    const cropBounds = cropBoundsRef.current;
    
    // Calculate the actual video display area (maskRect)
    // If maskRect is not initialized yet, fall back to full overlay
    const displayArea = maskRect.width > 0 && maskRect.height > 0 
      ? maskRect 
      : { x: 0, y: 0, width, height };

    const events = cursorTrack.events;
    const playheadMs = Math.round(currentTime * 1000);
    const lastIndex = findLastIndex(events, playheadMs);
    if (lastIndex < 0) return;

    // Helper function to convert normalized video coordinates to display coordinates
    // Normalized coordinates (nx, ny) are relative to the full video dimensions (before crop)
    const normalizeToDisplay = (nx: number, ny: number) => {
      // Get the locked video dimensions (full video size)
      const lockedDims = lockedVideoDimensionsRef.current;
      if (!lockedDims || lockedDims.width === 0 || lockedDims.height === 0) {
        // Fallback: map directly to display area
        const displayX = displayArea.x + nx * displayArea.width;
        const displayY = displayArea.y + ny * displayArea.height;
        return { x: displayX, y: displayY };
      }
      
      const fullVideoWidth = lockedDims.width;
      const fullVideoHeight = lockedDims.height;
      
      // Convert normalized coordinates to video pixel coordinates (full video)
      const videoX = nx * fullVideoWidth;
      const videoY = ny * fullVideoHeight;
      
      // Check if coordinate is within crop bounds (if crop exists)
      if (cropBounds.endX > cropBounds.startX && cropBounds.endY > cropBounds.startY) {
        if (videoX < cropBounds.startX || videoX > cropBounds.endX ||
            videoY < cropBounds.startY || videoY > cropBounds.endY) {
          // Coordinate is outside crop bounds, don't display
          return null;
        }
        
        // Convert to cropped video coordinates (0-1 relative to cropped area)
        const croppedX = (videoX - cropBounds.startX) / (cropBounds.endX - cropBounds.startX);
        const croppedY = (videoY - cropBounds.startY) / (cropBounds.endY - cropBounds.startY);
        
        // Map to display coordinates within maskRect (which represents the cropped and scaled display area)
        const displayX = displayArea.x + croppedX * displayArea.width;
        const displayY = displayArea.y + croppedY * displayArea.height;
        
        return { x: displayX, y: displayY };
      } else {
        // No crop, map directly to display area
        const displayX = displayArea.x + nx * displayArea.width;
        const displayY = displayArea.y + ny * displayArea.height;
        return { x: displayX, y: displayY };
      }
    };

    const currentEvent = events[lastIndex];
    const displayPos = normalizeToDisplay(currentEvent.nx, currentEvent.ny);
    if (!displayPos) return; // Coordinate is outside visible area
    
    const x = displayPos.x;
    const y = displayPos.y;
    const dragging = currentEvent.dragging;
    const baseSize = Math.max(6, cursorTrack.style.sizePx);
    const cursorSize = dragging ? baseSize * 1.1 : baseSize;

    const trailStartMs = Math.max(0, playheadMs - CURSOR_TRAIL_MS);
    const trailStartIndex = Math.min(lastIndex, findFirstIndex(events, trailStartMs));

    if (lastIndex - trailStartIndex >= 1) {
      ctx.beginPath();
      let pathStarted = false;
      for (let i = trailStartIndex; i <= lastIndex; i += 1) {
        const ev = events[i];
        const pos = normalizeToDisplay(ev.nx, ev.ny);
        if (!pos) continue; // Skip points outside visible area
        
        if (!pathStarted) {
          ctx.moveTo(pos.x, pos.y);
          pathStarted = true;
        } else {
          ctx.lineTo(pos.x, pos.y);
        }
      }
      if (pathStarted) {
        ctx.strokeStyle = dragging ? 'rgba(52,178,123,0.55)' : 'rgba(255,255,255,0.35)';
        ctx.lineWidth = Math.max(1, baseSize * 0.12);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
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
        const radius = baseSize * (0.5 + progress * 1.6);
        const pos = normalizeToDisplay(ev.nx, ev.ny);
        if (!pos) continue; // Skip clicks outside visible area
        
        ctx.beginPath();
        ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.7})`;
        ctx.lineWidth = Math.max(1, baseSize * 0.08);
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    drawCursor(ctx, cursorTrack.style.preset, x, y, cursorSize, dragging);
  }, [pixiReady, videoReady, currentTime, cursorTrack, CURSOR_TRAIL_MS, CURSOR_CLICK_MS, resizeCursorCanvas, cropRegion, padding]);

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
});

VideoPlayback.displayName = 'VideoPlayback';

export default VideoPlayback;
