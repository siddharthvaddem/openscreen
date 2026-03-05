

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

import VideoPlayback, { VideoPlaybackRef } from "./VideoPlayback";
import PlaybackControls from "./PlaybackControls";
import TimelineEditor from "./timeline/TimelineEditor";
import { SettingsPanel } from "./SettingsPanel";
import { ExportDialog } from "./ExportDialog";
import {
  WALLPAPER_PATHS,
  createProjectData,
  deriveNextId,
  fromFileUrl,
  normalizeProjectEditor,
  toFileUrl,
  validateProjectData,
} from "./projectPersistence";

import type { Span } from "dnd-timeline";
import {
  DEFAULT_ZOOM_DEPTH,
  clampFocusToDepth,
  DEFAULT_CROP_REGION,
  DEFAULT_ANNOTATION_POSITION,
  DEFAULT_ANNOTATION_SIZE,
  DEFAULT_ANNOTATION_STYLE,
  DEFAULT_FIGURE_DATA,
  DEFAULT_PLAYBACK_SPEED,
  type ZoomDepth,
  type ZoomFocus,
  type ZoomRegion,
  type CursorTelemetryPoint,
  type TrimRegion,
  type AnnotationRegion,
  type CropRegion,
  type FigureData,
  type SpeedRegion,
  type PlaybackSpeed,
} from "./types";
import { VideoExporter, GifExporter, type ExportProgress, type ExportQuality, type ExportSettings, type ExportFormat, type GifFrameRate, type GifSizePreset, GIF_SIZE_PRESETS, calculateOutputDimensions } from "@/lib/exporter";
import { type AspectRatio, getAspectRatioValue } from "@/utils/aspectRatioUtils";
import { getAssetPath } from "@/lib/assetPath";
import { useShortcuts } from "@/contexts/ShortcutsContext";
import { matchesShortcut } from "@/lib/shortcuts";

export default function VideoEditor() {
  const [videoPath, setVideoPath] = useState<string | null>(null);
  const [videoSourcePath, setVideoSourcePath] = useState<string | null>(null);
  const [currentProjectPath, setCurrentProjectPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [wallpaper, setWallpaper] = useState<string>(WALLPAPER_PATHS[0]);
  const [shadowIntensity, setShadowIntensity] = useState(0);
  const [showBlur, setShowBlur] = useState(false);
  const [motionBlurEnabled, setMotionBlurEnabled] = useState(false);
  const [borderRadius, setBorderRadius] = useState(0);
  const [padding, setPadding] = useState(50);
  const [cropRegion, setCropRegion] = useState<CropRegion>(DEFAULT_CROP_REGION);
  const [zoomRegions, setZoomRegions] = useState<ZoomRegion[]>([]);
  const [cursorTelemetry, setCursorTelemetry] = useState<CursorTelemetryPoint[]>([]);
  const [selectedZoomId, setSelectedZoomId] = useState<string | null>(null);
  const [trimRegions, setTrimRegions] = useState<TrimRegion[]>([]);
  const [selectedTrimId, setSelectedTrimId] = useState<string | null>(null);
  const [speedRegions, setSpeedRegions] = useState<SpeedRegion[]>([]);
  const [selectedSpeedId, setSelectedSpeedId] = useState<string | null>(null);
  const [annotationRegions, setAnnotationRegions] = useState<AnnotationRegion[]>([]);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [exportQuality, setExportQuality] = useState<ExportQuality>('good');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('mp4');
  const [gifFrameRate, setGifFrameRate] = useState<GifFrameRate>(15);
  const [gifLoop, setGifLoop] = useState(true);
  const [gifSizePreset, setGifSizePreset] = useState<GifSizePreset>('medium');
  const [exportedFilePath, setExportedFilePath] = useState<string | undefined>(undefined);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string | null>(null);

  const videoPlaybackRef = useRef<VideoPlaybackRef>(null);
  const nextZoomIdRef = useRef(1);
  const nextTrimIdRef = useRef(1);
  const nextSpeedIdRef = useRef(1);

  const { shortcuts, isMac } = useShortcuts();
  const nextAnnotationIdRef = useRef(1);
  const nextAnnotationZIndexRef = useRef(1); // Track z-index for stacking order
  const exporterRef = useRef<VideoExporter | null>(null);

  const applyLoadedProject = useCallback(async (candidate: unknown, path?: string | null) => {
    if (!validateProjectData(candidate)) {
      return false;
    }

    const project = candidate;
    const sourcePath = project.videoPath;
    const normalizedEditor = normalizeProjectEditor(project.editor);

    try {
      videoPlaybackRef.current?.pause();
    } catch {
      // no-op
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    setError(null);
    setVideoSourcePath(sourcePath);
    setVideoPath(toFileUrl(sourcePath));
    setCurrentProjectPath(path ?? null);

    setWallpaper(normalizedEditor.wallpaper);
    setShadowIntensity(normalizedEditor.shadowIntensity);
    setShowBlur(normalizedEditor.showBlur);
    setMotionBlurEnabled(normalizedEditor.motionBlurEnabled);
    setBorderRadius(normalizedEditor.borderRadius);
    setPadding(normalizedEditor.padding);
    setCropRegion(normalizedEditor.cropRegion);
    setZoomRegions(normalizedEditor.zoomRegions);
    setTrimRegions(normalizedEditor.trimRegions);
    setSpeedRegions(normalizedEditor.speedRegions);
    setAnnotationRegions(normalizedEditor.annotationRegions);
    setAspectRatio(normalizedEditor.aspectRatio);
    setExportQuality(normalizedEditor.exportQuality);
    setExportFormat(normalizedEditor.exportFormat);
    setGifFrameRate(normalizedEditor.gifFrameRate);
    setGifLoop(normalizedEditor.gifLoop);
    setGifSizePreset(normalizedEditor.gifSizePreset);

    setSelectedZoomId(null);
    setSelectedTrimId(null);
    setSelectedSpeedId(null);
    setSelectedAnnotationId(null);

    nextZoomIdRef.current = deriveNextId("zoom", normalizedEditor.zoomRegions.map((region) => region.id));
    nextTrimIdRef.current = deriveNextId("trim", normalizedEditor.trimRegions.map((region) => region.id));
    nextSpeedIdRef.current = deriveNextId("speed", normalizedEditor.speedRegions.map((region) => region.id));
    nextAnnotationIdRef.current = deriveNextId(
      "annotation",
      normalizedEditor.annotationRegions.map((region) => region.id),
    );
    nextAnnotationZIndexRef.current =
      normalizedEditor.annotationRegions.reduce((max, region) => Math.max(max, region.zIndex), 0) + 1;

    setLastSavedSnapshot(JSON.stringify(createProjectData(sourcePath, normalizedEditor)));
    return true;
  }, []);

  const currentProjectSnapshot = useMemo(() => {
    const sourcePath = videoSourcePath ?? (videoPath ? fromFileUrl(videoPath) : null);
    if (!sourcePath) {
      return null;
    }
    return JSON.stringify(
      createProjectData(sourcePath, {
        wallpaper,
        shadowIntensity,
        showBlur,
        motionBlurEnabled,
        borderRadius,
        padding,
        cropRegion,
        zoomRegions,
        trimRegions,
        speedRegions,
        annotationRegions,
        aspectRatio,
        exportQuality,
        exportFormat,
        gifFrameRate,
        gifLoop,
        gifSizePreset,
      }),
    );
  }, [
    videoPath,
    videoSourcePath,
    wallpaper,
    shadowIntensity,
    showBlur,
    motionBlurEnabled,
    borderRadius,
    padding,
    cropRegion,
    zoomRegions,
    trimRegions,
    speedRegions,
    annotationRegions,
    aspectRatio,
    exportQuality,
    exportFormat,
    gifFrameRate,
    gifLoop,
    gifSizePreset,
  ]);

  const hasUnsavedChanges = Boolean(
    currentProjectPath &&
      currentProjectSnapshot &&
      lastSavedSnapshot &&
      currentProjectSnapshot !== lastSavedSnapshot,
  );

  useEffect(() => {
    async function loadInitialData() {
      try {
        const currentProjectResult = await window.electronAPI.loadCurrentProjectFile();
        if (currentProjectResult.success && currentProjectResult.project) {
          const restored = await applyLoadedProject(
            currentProjectResult.project,
            currentProjectResult.path ?? null,
          );
          if (restored) {
            return;
          }
        }

        const result = await window.electronAPI.getCurrentVideoPath();
        if (result.success && result.path) {
          setVideoSourcePath(result.path);
          setVideoPath(toFileUrl(result.path));
          setCurrentProjectPath(null);
          setLastSavedSnapshot(null);
        } else {
          setError("No video to load. Please record or select a video.");
        }
      } catch (err) {
        setError("Error loading video: " + String(err));
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, [applyLoadedProject]);

  const saveProject = useCallback(async (forceSaveAs: boolean) => {
    if (!videoPath) {
      toast.error('No video loaded');
      return;
    }

    const sourcePath = videoSourcePath ?? fromFileUrl(videoPath);
    if (!sourcePath) {
      toast.error('Unable to determine source video path');
      return;
    }

    const projectData = createProjectData(sourcePath, {
      wallpaper,
      shadowIntensity,
      showBlur,
      motionBlurEnabled,
      borderRadius,
      padding,
      cropRegion,
      zoomRegions,
      trimRegions,
      speedRegions,
      annotationRegions,
      aspectRatio,
      exportQuality,
      exportFormat,
      gifFrameRate,
      gifLoop,
      gifSizePreset,
    });

    const fileNameBase = sourcePath.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') || `project-${Date.now()}`;
    const projectSnapshot = JSON.stringify(projectData);
    const result = await window.electronAPI.saveProjectFile(
      projectData,
      fileNameBase,
      forceSaveAs ? undefined : currentProjectPath ?? undefined,
    );

    if (result.canceled) {
      toast.info("Project save canceled");
      return;
    }

    if (!result.success) {
      toast.error(result.message || 'Failed to save project');
      return;
    }

    if (result.path) {
      setCurrentProjectPath(result.path);
    }
    setLastSavedSnapshot(projectSnapshot);

    toast.success(`Project saved to ${result.path}`);
  }, [
    videoPath,
    videoSourcePath,
    currentProjectPath,
    wallpaper,
    shadowIntensity,
    showBlur,
    motionBlurEnabled,
    borderRadius,
    padding,
    cropRegion,
    zoomRegions,
    trimRegions,
    speedRegions,
    annotationRegions,
    aspectRatio,
    exportQuality,
    exportFormat,
    gifFrameRate,
    gifLoop,
    gifSizePreset,
  ]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) {
        return;
      }

      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleSaveProject = useCallback(async () => {
    await saveProject(false);
  }, [saveProject]);

  const handleSaveProjectAs = useCallback(async () => {
    await saveProject(true);
  }, [saveProject]);

  const handleLoadProject = useCallback(async () => {
    const result = await window.electronAPI.loadProjectFile();

    if (result.canceled) {
      return;
    }

    if (!result.success) {
      toast.error(result.message || 'Failed to load project');
      return;
    }

    const restored = await applyLoadedProject(result.project, result.path ?? null);
    if (!restored) {
      toast.error('Invalid project file format');
      return;
    }

    toast.success(`Project loaded from ${result.path}`);
  }, [applyLoadedProject]);

  useEffect(() => {
    const removeLoadListener = window.electronAPI.onMenuLoadProject(handleLoadProject);
    const removeSaveListener = window.electronAPI.onMenuSaveProject(handleSaveProject);
    const removeSaveAsListener = window.electronAPI.onMenuSaveProjectAs(handleSaveProjectAs);

    return () => {
      removeLoadListener?.();
      removeSaveListener?.();
      removeSaveAsListener?.();
    };
  }, [handleLoadProject, handleSaveProject, handleSaveProjectAs]);

  useEffect(() => {
    let mounted = true;

    async function loadCursorTelemetry() {
      if (!videoPath) {
        if (mounted) {
          setCursorTelemetry([]);
        }
        return;
      }

      try {
        const result = await window.electronAPI.getCursorTelemetry(fromFileUrl(videoPath));
        if (mounted) {
          setCursorTelemetry(result.success ? result.samples : []);
        }
      } catch (telemetryError) {
        console.warn('Unable to load cursor telemetry:', telemetryError);
        if (mounted) {
          setCursorTelemetry([]);
        }
      }
    }

    loadCursorTelemetry();

    return () => {
      mounted = false;
    };
  }, [videoPath]);

  // Initialize default wallpaper with resolved asset path
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resolvedPath = await getAssetPath('wallpapers/wallpaper1.jpg');
        if (mounted) {
          setWallpaper(resolvedPath);
        }
      } catch (err) {
        // If resolution fails, keep the fallback
        console.warn('Failed to resolve default wallpaper path:', err);
      }
    })();
    return () => { mounted = false };
  }, []);

  function togglePlayPause() {
    const playback = videoPlaybackRef.current;
    const video = playback?.video;
    if (!playback || !video) return;

    if (isPlaying) {
      playback.pause();
    } else {
      playback.play().catch(err => console.error('Video play failed:', err));
    }
  }

  function handleSeek(time: number) {
    const video = videoPlaybackRef.current?.video;
    if (!video) return;
    video.currentTime = time;
  }

  const handleSelectZoom = useCallback((id: string | null) => {
    setSelectedZoomId(id);
    if (id) setSelectedTrimId(null);
  }, []);

  const handleSelectTrim = useCallback((id: string | null) => {
    setSelectedTrimId(id);
    if (id) {
      setSelectedZoomId(null);
      setSelectedAnnotationId(null);
    }
  }, []);

  const handleSelectAnnotation = useCallback((id: string | null) => {
    setSelectedAnnotationId(id);
    if (id) {
      setSelectedZoomId(null);
      setSelectedTrimId(null);
    }
  }, []);

  const handleZoomAdded = useCallback((span: Span) => {
    const id = `zoom-${nextZoomIdRef.current++}`;
    const newRegion: ZoomRegion = {
      id,
      startMs: Math.round(span.start),
      endMs: Math.round(span.end),
      depth: DEFAULT_ZOOM_DEPTH,
      focus: { cx: 0.5, cy: 0.5 },
    };
    setZoomRegions((prev) => [...prev, newRegion]);
    setSelectedZoomId(id);
    setSelectedTrimId(null);
    setSelectedAnnotationId(null);
  }, []);

  const handleZoomSuggested = useCallback((span: Span, focus: ZoomFocus) => {
    const id = `zoom-${nextZoomIdRef.current++}`;
    const newRegion: ZoomRegion = {
      id,
      startMs: Math.round(span.start),
      endMs: Math.round(span.end),
      depth: DEFAULT_ZOOM_DEPTH,
      focus: clampFocusToDepth(focus, DEFAULT_ZOOM_DEPTH),
    };
    setZoomRegions((prev) => [...prev, newRegion]);
    setSelectedZoomId(id);
    setSelectedTrimId(null);
    setSelectedAnnotationId(null);
  }, []);

  const handleTrimAdded = useCallback((span: Span) => {
    const id = `trim-${nextTrimIdRef.current++}`;
    const newRegion: TrimRegion = {
      id,
      startMs: Math.round(span.start),
      endMs: Math.round(span.end),
    };
    setTrimRegions((prev) => [...prev, newRegion]);
    setSelectedTrimId(id);
    setSelectedZoomId(null);
    setSelectedAnnotationId(null);
  }, []);

  const handleZoomSpanChange = useCallback((id: string, span: Span) => {
    setZoomRegions((prev) =>
      prev.map((region) =>
        region.id === id
          ? {
              ...region,
              startMs: Math.round(span.start),
              endMs: Math.round(span.end),
            }
          : region,
      ),
    );
  }, []);

  const handleTrimSpanChange = useCallback((id: string, span: Span) => {
    setTrimRegions((prev) =>
      prev.map((region) =>
        region.id === id
          ? {
              ...region,
              startMs: Math.round(span.start),
              endMs: Math.round(span.end),
            }
          : region,
      ),
    );
  }, []);

  const handleZoomFocusChange = useCallback((id: string, focus: ZoomFocus) => {
    setZoomRegions((prev) =>
      prev.map((region) =>
        region.id === id
          ? {
              ...region,
              focus: clampFocusToDepth(focus, region.depth),
            }
          : region,
      ),
    );
  }, []);

  const handleZoomDepthChange = useCallback((depth: ZoomDepth) => {
    if (!selectedZoomId) return;
    setZoomRegions((prev) =>
      prev.map((region) =>
        region.id === selectedZoomId
          ? {
              ...region,
              depth,
              focus: clampFocusToDepth(region.focus, depth),
            }
          : region,
      ),
    );
  }, [selectedZoomId]);

  const handleZoomDelete = useCallback((id: string) => {
    setZoomRegions((prev) => prev.filter((region) => region.id !== id));
    if (selectedZoomId === id) {
      setSelectedZoomId(null);
    }
  }, [selectedZoomId]);

  const handleTrimDelete = useCallback((id: string) => {
    setTrimRegions((prev) => prev.filter((region) => region.id !== id));
    if (selectedTrimId === id) {
      setSelectedTrimId(null);
    }
  }, [selectedTrimId]);

  const handleSelectSpeed = useCallback((id: string | null) => {
    setSelectedSpeedId(id);
    if (id) {
      setSelectedZoomId(null);
      setSelectedTrimId(null);
      setSelectedAnnotationId(null);
    }
  }, []);

  const handleSpeedAdded = useCallback((span: Span) => {
    const id = `speed-${nextSpeedIdRef.current++}`;
    const newRegion: SpeedRegion = {
      id,
      startMs: Math.round(span.start),
      endMs: Math.round(span.end),
      speed: DEFAULT_PLAYBACK_SPEED,
    };
    setSpeedRegions((prev) => [...prev, newRegion]);
    setSelectedSpeedId(id);
    setSelectedZoomId(null);
    setSelectedTrimId(null);
    setSelectedAnnotationId(null);
  }, []);

  const handleSpeedSpanChange = useCallback((id: string, span: Span) => {
    setSpeedRegions((prev) =>
      prev.map((region) =>
        region.id === id
          ? {
              ...region,
              startMs: Math.round(span.start),
              endMs: Math.round(span.end),
            }
          : region,
      ),
    );
  }, []);

  const handleSpeedDelete = useCallback((id: string) => {
    setSpeedRegions((prev) => prev.filter((region) => region.id !== id));
    if (selectedSpeedId === id) {
      setSelectedSpeedId(null);
    }
  }, [selectedSpeedId]);

  const handleSpeedChange = useCallback((speed: PlaybackSpeed) => {
    if (!selectedSpeedId) return;
    setSpeedRegions((prev) =>
      prev.map((region) =>
        region.id === selectedSpeedId ? { ...region, speed } : region,
      ),
    );
  }, [selectedSpeedId]);

  const handleAnnotationAdded = useCallback((span: Span) => {
    const id = `annotation-${nextAnnotationIdRef.current++}`;
    const zIndex = nextAnnotationZIndexRef.current++; // Assign z-index based on creation order
    const newRegion: AnnotationRegion = {
      id,
      startMs: Math.round(span.start),
      endMs: Math.round(span.end),
      type: 'text',
      content: 'Enter text...',
      position: { ...DEFAULT_ANNOTATION_POSITION },
      size: { ...DEFAULT_ANNOTATION_SIZE },
      style: { ...DEFAULT_ANNOTATION_STYLE },
      zIndex,
    };
    setAnnotationRegions((prev) => [...prev, newRegion]);
    setSelectedAnnotationId(id);
    setSelectedZoomId(null);
    setSelectedTrimId(null);
  }, []);

  const handleAnnotationSpanChange = useCallback((id: string, span: Span) => {
    setAnnotationRegions((prev) =>
      prev.map((region) =>
        region.id === id
          ? {
              ...region,
              startMs: Math.round(span.start),
              endMs: Math.round(span.end),
            }
          : region,
      ),
    );
  }, []);

  const handleAnnotationDelete = useCallback((id: string) => {
    setAnnotationRegions((prev) => prev.filter((region) => region.id !== id));
    if (selectedAnnotationId === id) {
      setSelectedAnnotationId(null);
    }
  }, [selectedAnnotationId]);

  const handleAnnotationContentChange = useCallback((id: string, content: string) => {
    setAnnotationRegions((prev) => {
      const updated = prev.map((region) => {
        if (region.id !== id) return region;
        
        // Store content in type-specific fields
        if (region.type === 'text') {
          return { ...region, content, textContent: content };
        } else if (region.type === 'image') {
          return { ...region, content, imageContent: content };
        } else {
          return { ...region, content };
        }
      });
      return updated;
    });
  }, []);

  const handleAnnotationTypeChange = useCallback((id: string, type: AnnotationRegion['type']) => {
    setAnnotationRegions((prev) => {
      const updated = prev.map((region) => {
        if (region.id !== id) return region;
        
        const updatedRegion = { ...region, type };
        
        // Restore content from type-specific storage
        if (type === 'text') {
          updatedRegion.content = region.textContent || 'Enter text...';
        } else if (type === 'image') {
          updatedRegion.content = region.imageContent || '';
        } else if (type === 'figure') {
          updatedRegion.content = '';
          if (!region.figureData) {
            updatedRegion.figureData = { ...DEFAULT_FIGURE_DATA };
          }
        }
        
        return updatedRegion;
      });
      return updated;
    });
  }, []);

  const handleAnnotationStyleChange = useCallback((id: string, style: Partial<AnnotationRegion['style']>) => {
    setAnnotationRegions((prev) =>
      prev.map((region) =>
        region.id === id
          ? { ...region, style: { ...region.style, ...style } }
          : region,
      ),
    );
  }, []);

  const handleAnnotationFigureDataChange = useCallback((id: string, figureData: FigureData) => {
    setAnnotationRegions((prev) =>
      prev.map((region) =>
        region.id === id
          ? { ...region, figureData }
          : region,
      ),
    );
  }, []);

  const handleAnnotationPositionChange = useCallback((id: string, position: { x: number; y: number }) => {
    setAnnotationRegions((prev) =>
      prev.map((region) =>
        region.id === id
          ? { ...region, position }
          : region,
      ),
    );
  }, []);

  const handleAnnotationSizeChange = useCallback((id: string, size: { width: number; height: number }) => {
    setAnnotationRegions((prev) =>
      prev.map((region) =>
        region.id === id
          ? { ...region, size }
          : region,
      ),
    );
  }, []);
  
  // Global Tab prevention
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        // Allow tab only in inputs/textareas
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return;
        }
        e.preventDefault();
      }

      if (matchesShortcut(e, shortcuts.playPause, isMac)) {
        // Allow space only in inputs/textareas
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return;
        }
        e.preventDefault();
        
        const playback = videoPlaybackRef.current;
        if (playback?.video) {
          if (playback.video.paused) {
            playback.play().catch(console.error);
          } else {
            playback.pause();
          }
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [shortcuts, isMac]);

  useEffect(() => {
    if (selectedZoomId && !zoomRegions.some((region) => region.id === selectedZoomId)) {
      setSelectedZoomId(null);
    }
  }, [selectedZoomId, zoomRegions]);

  useEffect(() => {
    if (selectedTrimId && !trimRegions.some((region) => region.id === selectedTrimId)) {
      setSelectedTrimId(null);
    }
  }, [selectedTrimId, trimRegions]);

  useEffect(() => {
    if (selectedAnnotationId && !annotationRegions.some((region) => region.id === selectedAnnotationId)) {
      setSelectedAnnotationId(null);
    }
  }, [selectedAnnotationId, annotationRegions]);

  useEffect(() => {
    if (selectedSpeedId && !speedRegions.some((region) => region.id === selectedSpeedId)) {
      setSelectedSpeedId(null);
    }
  }, [selectedSpeedId, speedRegions]);

  const handleExport = useCallback(async (settings: ExportSettings) => {
    if (!videoPath) {
      toast.error('No video loaded');
      return;
    }

    const video = videoPlaybackRef.current?.video;
    if (!video) {
      toast.error('Video not ready');
      return;
    }

    setIsExporting(true);
    setExportProgress(null);
    setExportError(null);

    try {
      const wasPlaying = isPlaying;
      if (wasPlaying) {
        videoPlaybackRef.current?.pause();
      }

      const aspectRatioValue = getAspectRatioValue(aspectRatio);
      const sourceWidth = video.videoWidth || 1920;
      const sourceHeight = video.videoHeight || 1080;

      // Get preview CONTAINER dimensions for scaling
      const playbackRef = videoPlaybackRef.current;
      const containerElement = playbackRef?.containerRef?.current;
      const previewWidth = containerElement?.clientWidth || 1920;
      const previewHeight = containerElement?.clientHeight || 1080;

      if (settings.format === 'gif' && settings.gifConfig) {
        // GIF Export
        const gifExporter = new GifExporter({
          videoUrl: videoPath,
          width: settings.gifConfig.width,
          height: settings.gifConfig.height,
          frameRate: settings.gifConfig.frameRate,
          loop: settings.gifConfig.loop,
          sizePreset: settings.gifConfig.sizePreset,
          wallpaper,
          zoomRegions,
          trimRegions,
          speedRegions,
          showShadow: shadowIntensity > 0,
          shadowIntensity,
          showBlur,
          motionBlurEnabled,
          borderRadius,
          padding,
          videoPadding: padding,
          cropRegion,
          annotationRegions,
          previewWidth,
          previewHeight,
          onProgress: (progress: ExportProgress) => {
            setExportProgress(progress);
          },
        });

        exporterRef.current = gifExporter as unknown as VideoExporter;
        const result = await gifExporter.export();

        if (result.success && result.blob) {
          const arrayBuffer = await result.blob.arrayBuffer();
          const timestamp = Date.now();
          const fileName = `export-${timestamp}.gif`;

          const saveResult = await window.electronAPI.saveExportedVideo(arrayBuffer, fileName);

          if (saveResult.cancelled) {
            toast.info('Export cancelled');
          } else if (saveResult.success && saveResult.path) {
            showExportSuccessToast(saveResult.path);
            setExportedFilePath(saveResult.path);
          if (saveResult.canceled) {
            toast.info('Export canceled');
          } else if (saveResult.success) {
            toast.success(`GIF exported successfully to ${saveResult.path}`);
          } else {
            setExportError(saveResult.message || 'Failed to save GIF');
            toast.error(saveResult.message || 'Failed to save GIF');
          }
        } else {
          setExportError(result.error || 'GIF export failed');
          toast.error(result.error || 'GIF export failed');
        }
      } else {
        // MP4 Export
        const quality = settings.quality || exportQuality;
        let exportWidth: number;
        let exportHeight: number;
        let bitrate: number;

        if (quality === 'source') {
          // Use source resolution
          exportWidth = sourceWidth;
          exportHeight = sourceHeight;

          if (aspectRatioValue === 1) {
            // Square (1:1): use smaller dimension to avoid codec limits
            const baseDimension = Math.floor(Math.min(sourceWidth, sourceHeight) / 2) * 2;
            exportWidth = baseDimension;
            exportHeight = baseDimension;
          } else if (aspectRatioValue > 1) {
            // Landscape: find largest even dimensions that exactly match aspect ratio
            const baseWidth = Math.floor(sourceWidth / 2) * 2;
            let found = false;
            for (let w = baseWidth; w >= 100 && !found; w -= 2) {
              const h = Math.round(w / aspectRatioValue);
              if (h % 2 === 0 && Math.abs((w / h) - aspectRatioValue) < 0.0001) {
                exportWidth = w;
                exportHeight = h;
                found = true;
              }
            }
            if (!found) {
              exportWidth = baseWidth;
              exportHeight = Math.floor((baseWidth / aspectRatioValue) / 2) * 2;
            }
          } else {
            // Portrait: find largest even dimensions that exactly match aspect ratio
            const baseHeight = Math.floor(sourceHeight / 2) * 2;
            let found = false;
            for (let h = baseHeight; h >= 100 && !found; h -= 2) {
              const w = Math.round(h * aspectRatioValue);
              if (w % 2 === 0 && Math.abs((w / h) - aspectRatioValue) < 0.0001) {
                exportWidth = w;
                exportHeight = h;
                found = true;
              }
            }
            if (!found) {
              exportHeight = baseHeight;
              exportWidth = Math.floor((baseHeight * aspectRatioValue) / 2) * 2;
            }
          }

          // Calculate visually lossless bitrate matching screen recording optimization
          const totalPixels = exportWidth * exportHeight;
          bitrate = 30_000_000;
          if (totalPixels > 1920 * 1080 && totalPixels <= 2560 * 1440) {
            bitrate = 50_000_000;
          } else if (totalPixels > 2560 * 1440) {
            bitrate = 80_000_000;
          }
        } else {
          // Use quality-based target resolution
          const targetHeight = quality === 'medium' ? 720 : 1080;

          // Calculate dimensions maintaining aspect ratio
          exportHeight = Math.floor(targetHeight / 2) * 2;
          exportWidth = Math.floor((exportHeight * aspectRatioValue) / 2) * 2;

          // Adjust bitrate for lower resolutions
          const totalPixels = exportWidth * exportHeight;
          if (totalPixels <= 1280 * 720) {
            bitrate = 10_000_000;
          } else if (totalPixels <= 1920 * 1080) {
            bitrate = 20_000_000;
          } else {
            bitrate = 30_000_000;
          }
        }

        const exporter = new VideoExporter({
          videoUrl: videoPath,
          width: exportWidth,
          height: exportHeight,
          frameRate: 60,
          bitrate,
          codec: 'avc1.640033',
          wallpaper,
          zoomRegions,
          trimRegions,
          speedRegions,
          showShadow: shadowIntensity > 0,
          shadowIntensity,
          showBlur,
          motionBlurEnabled,
          borderRadius,
          padding,
          cropRegion,
          annotationRegions,
          previewWidth,
          previewHeight,
          onProgress: (progress: ExportProgress) => {
            setExportProgress(progress);
          },
        });

        exporterRef.current = exporter;
        const result = await exporter.export();

        if (result.success && result.blob) {
          const arrayBuffer = await result.blob.arrayBuffer();
          const timestamp = Date.now();
          const fileName = `export-${timestamp}.mp4`;

          const saveResult = await window.electronAPI.saveExportedVideo(arrayBuffer, fileName);

          if (saveResult.cancelled) {
            toast.info('Export cancelled');
          } else if (saveResult.success && saveResult.path) {
            showExportSuccessToast(saveResult.path);
            setExportedFilePath(saveResult.path);
          if (saveResult.canceled) {
            toast.info('Export canceled');
          } else if (saveResult.success) {
            toast.success(`Video exported successfully to ${saveResult.path}`);
          } else {
            setExportError(saveResult.message || 'Failed to save video');
            toast.error(saveResult.message || 'Failed to save video');
          }
        } else {
          setExportError(result.error || 'Export failed');
          toast.error(result.error || 'Export failed');
        }
      }

      if (wasPlaying) {
        videoPlaybackRef.current?.play();
      }
    } catch (error) {
      console.error('Export error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setExportError(errorMessage);
      toast.error(`Export failed: ${errorMessage}`);
    } finally {
      setIsExporting(false);
      exporterRef.current = null;
      // Reset dialog state to ensure it can be opened again on next export
      // This fixes the bug where second export doesn't show save dialog
      setShowExportDialog(false);
      setExportProgress(null);
    }
  }, [videoPath, wallpaper, zoomRegions, trimRegions, speedRegions, shadowIntensity, showBlur, motionBlurEnabled, borderRadius, padding, cropRegion, annotationRegions, isPlaying, aspectRatio, exportQuality]);

  const handleOpenExportDialog = useCallback(() => {
    if (!videoPath) {
      toast.error('No video loaded');
      return;
    }

    const video = videoPlaybackRef.current?.video;
    if (!video) {
      toast.error('Video not ready');
      return;
    }

    // Build export settings from current state
    const sourceWidth = video.videoWidth || 1920;
    const sourceHeight = video.videoHeight || 1080;
    const gifDimensions = calculateOutputDimensions(sourceWidth, sourceHeight, gifSizePreset, GIF_SIZE_PRESETS);

    const settings: ExportSettings = {
      format: exportFormat,
      quality: exportFormat === 'mp4' ? exportQuality : undefined,
      gifConfig: exportFormat === 'gif' ? {
        frameRate: gifFrameRate,
        loop: gifLoop,
        sizePreset: gifSizePreset,
        width: gifDimensions.width,
        height: gifDimensions.height,
      } : undefined,
    };

    setShowExportDialog(true);
    setExportError(null);

    // Start export immediately
    handleExport(settings);
  }, [videoPath, exportFormat, exportQuality, gifFrameRate, gifLoop, gifSizePreset, handleExport]);

  const handleCancelExport = useCallback(() => {
    if (exporterRef.current) {
      exporterRef.current.cancel();
      toast.info('Export canceled');
      setShowExportDialog(false);
      setIsExporting(false);
      setExportProgress(null);
      setExportError(null);
      setExportedFilePath(undefined);
    }
  }, []);

  const handleExportDialogClose = useCallback(() => {
    setShowExportDialog(false);
    setExportedFilePath(undefined);
  }, []);

  const showExportSuccessToast = useCallback((filePath: string) => {
    toast.success(`Exported successfully to ${filePath}`, {
      action: {
        label: 'Show in Folder',
        onClick: async () => {
          try {
            const result = await window.electronAPI.revealInFolder(filePath);
            if (!result.success) {
              const errorMessage = result.error || result.message || 'Failed to reveal item in folder.';
              toast.error(errorMessage);
            }
          } catch (err) {
            toast.error(`Error revealing in folder: ${String(err)}`);
          }
        }
      }
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-foreground">Loading video...</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="text-destructive">{error}</div>
          <button
            type="button"
            onClick={handleLoadProject}
            className="px-3 py-1.5 rounded-md bg-[#34B27B] text-white text-sm hover:bg-[#34B27B]/90"
          >
            Load Project File
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="flex flex-col h-screen bg-[#09090b] text-slate-200 overflow-hidden selection:bg-[#34B27B]/30">
      <div 
        className="h-10 flex-shrink-0 bg-[#09090b]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 z-50"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex-1" />
      </div>

      <div className="flex-1 p-5 gap-4 flex min-h-0 relative">
        {/* Left Column - Video & Timeline */}
        <div className="flex-[7] flex flex-col gap-3 min-w-0 h-full">
          <PanelGroup direction="vertical" className="gap-3">
            {/* Top section: video preview and controls */}
            <Panel defaultSize={70} minSize={40}>
              <div className="w-full h-full flex flex-col items-center justify-center bg-black/40 rounded-2xl border border-white/5 shadow-2xl overflow-hidden">
                {/* Video preview */}
                <div className="w-full flex justify-center items-center" style={{ flex: '1 1 auto', margin: '6px 0 0' }}>
                  <div className="relative" style={{ width: 'auto', height: '100%', aspectRatio: getAspectRatioValue(aspectRatio), maxWidth: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
                    <VideoPlayback
                      key={videoPath || 'no-video'}
                      aspectRatio={aspectRatio}
                      ref={videoPlaybackRef}
                      videoPath={videoPath || ''}
                      onDurationChange={setDuration}
                      onTimeUpdate={setCurrentTime}
                      currentTime={currentTime}
                      onPlayStateChange={setIsPlaying}
                      onError={setError}
                      wallpaper={wallpaper}
                      zoomRegions={zoomRegions}
                      selectedZoomId={selectedZoomId}
                      onSelectZoom={handleSelectZoom}
                      onZoomFocusChange={handleZoomFocusChange}
                      isPlaying={isPlaying}
                      showShadow={shadowIntensity > 0}
                      shadowIntensity={shadowIntensity}
                      showBlur={showBlur}
                      motionBlurEnabled={motionBlurEnabled}
                      borderRadius={borderRadius}
                      padding={padding}
                      cropRegion={cropRegion}
                      trimRegions={trimRegions}
                      speedRegions={speedRegions}
                      annotationRegions={annotationRegions}
                      selectedAnnotationId={selectedAnnotationId}
                      onSelectAnnotation={handleSelectAnnotation}
                      onAnnotationPositionChange={handleAnnotationPositionChange}
                      onAnnotationSizeChange={handleAnnotationSizeChange}
                    />
                  </div>
                </div>
                {/* Playback controls */}
                <div className="w-full flex justify-center items-center" style={{ height: '48px', flexShrink: 0, padding: '6px 12px', margin: '6px 0 6px 0' }}>
                  <div style={{ width: '100%', maxWidth: '700px' }}>
                    <PlaybackControls
                      isPlaying={isPlaying}
                      currentTime={currentTime}
                      duration={duration}
                      onTogglePlayPause={togglePlayPause}
                      onSeek={handleSeek}
                    />
                  </div>
                </div>
              </div>
            </Panel>

            <PanelResizeHandle className="h-3 bg-[#09090b]/80 hover:bg-[#09090b] transition-colors rounded-full mx-4 flex items-center justify-center">
              <div className="w-8 h-1 bg-white/20 rounded-full"></div>
            </PanelResizeHandle>

            {/* Timeline section */}
            <Panel defaultSize={30} minSize={20}>
              <div className="h-full bg-[#09090b] rounded-2xl border border-white/5 shadow-lg overflow-hidden flex flex-col">
                <TimelineEditor
              videoDuration={duration}
              currentTime={currentTime}
              onSeek={handleSeek}
              cursorTelemetry={cursorTelemetry}
              zoomRegions={zoomRegions}
              onZoomAdded={handleZoomAdded}
              onZoomSuggested={handleZoomSuggested}
              onZoomSpanChange={handleZoomSpanChange}
              onZoomDelete={handleZoomDelete}
              selectedZoomId={selectedZoomId}
              onSelectZoom={handleSelectZoom}
              trimRegions={trimRegions}
              onTrimAdded={handleTrimAdded}
              onTrimSpanChange={handleTrimSpanChange}
              onTrimDelete={handleTrimDelete}
              selectedTrimId={selectedTrimId}
              onSelectTrim={handleSelectTrim}
              speedRegions={speedRegions}
              onSpeedAdded={handleSpeedAdded}
              onSpeedSpanChange={handleSpeedSpanChange}
              onSpeedDelete={handleSpeedDelete}
              selectedSpeedId={selectedSpeedId}
              onSelectSpeed={handleSelectSpeed}
              annotationRegions={annotationRegions}
              onAnnotationAdded={handleAnnotationAdded}
              onAnnotationSpanChange={handleAnnotationSpanChange}
              onAnnotationDelete={handleAnnotationDelete}
              selectedAnnotationId={selectedAnnotationId}
              onSelectAnnotation={handleSelectAnnotation}
              aspectRatio={aspectRatio}
              onAspectRatioChange={setAspectRatio}
            />
              </div>
            </Panel>
          </PanelGroup>
        </div>

          {/* Right section: settings panel */}
          <SettingsPanel
          selected={wallpaper}
          onWallpaperChange={setWallpaper}
          selectedZoomDepth={selectedZoomId ? zoomRegions.find(z => z.id === selectedZoomId)?.depth : null}
          onZoomDepthChange={(depth) => selectedZoomId && handleZoomDepthChange(depth)}
          selectedZoomId={selectedZoomId}
          onZoomDelete={handleZoomDelete}
          selectedTrimId={selectedTrimId}
          onTrimDelete={handleTrimDelete}
          shadowIntensity={shadowIntensity}
          onShadowChange={setShadowIntensity}
          showBlur={showBlur}
          onBlurChange={setShowBlur}
          motionBlurEnabled={motionBlurEnabled}
          onMotionBlurChange={setMotionBlurEnabled}
          borderRadius={borderRadius}
          onBorderRadiusChange={setBorderRadius}
          padding={padding}
          onPaddingChange={setPadding}
          cropRegion={cropRegion}
          onCropChange={setCropRegion}
          aspectRatio={aspectRatio}
          videoElement={videoPlaybackRef.current?.video || null}
          exportQuality={exportQuality}
          onExportQualityChange={setExportQuality}
          exportFormat={exportFormat}
          onExportFormatChange={setExportFormat}
          gifFrameRate={gifFrameRate}
          onGifFrameRateChange={setGifFrameRate}
          gifLoop={gifLoop}
          onGifLoopChange={setGifLoop}
          gifSizePreset={gifSizePreset}
          onGifSizePresetChange={setGifSizePreset}
          gifOutputDimensions={calculateOutputDimensions(
            videoPlaybackRef.current?.video?.videoWidth || 1920,
            videoPlaybackRef.current?.video?.videoHeight || 1080,
            gifSizePreset,
            GIF_SIZE_PRESETS
          )}
          onExport={handleOpenExportDialog}
          selectedAnnotationId={selectedAnnotationId}
          annotationRegions={annotationRegions}
          onAnnotationContentChange={handleAnnotationContentChange}
          onAnnotationTypeChange={handleAnnotationTypeChange}
          onAnnotationStyleChange={handleAnnotationStyleChange}
          onAnnotationFigureDataChange={handleAnnotationFigureDataChange}
          onAnnotationDelete={handleAnnotationDelete}
          onSaveProject={handleSaveProject}
          onLoadProject={handleLoadProject}
          selectedSpeedId={selectedSpeedId}
          selectedSpeedValue={selectedSpeedId ? speedRegions.find(r => r.id === selectedSpeedId)?.speed ?? null : null}
          onSpeedChange={handleSpeedChange}
          onSpeedDelete={handleSpeedDelete}
        />
      </div>

      <Toaster theme="dark" className="pointer-events-auto" />
      
      <ExportDialog
        isOpen={showExportDialog}
        onClose={handleExportDialogClose}
        progress={exportProgress}
        isExporting={isExporting}
        error={exportError}
        onCancel={handleCancelExport}
        exportFormat={exportFormat}
        exportedFilePath={exportedFilePath}
      />
    </div>
  );
}
