import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTimelineContext } from "dnd-timeline";
import { Button } from "@/components/ui/button";
import { Plus, Scissors, ZoomIn, MessageSquare, Subtitles, ChevronDown, Check, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import TimelineWrapper from "./TimelineWrapper";
import Row from "./Row";
import Item from "./Item";
import KeyframeMarkers from "./KeyframeMarkers";
import type { Range, Span } from "dnd-timeline";
import type { ZoomRegion, TrimRegion, AnnotationRegion, SubtitleRegion } from "../types";
import { v4 as uuidv4 } from 'uuid';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type AspectRatio, getAspectRatioLabel } from "@/utils/aspectRatioUtils";
import { formatShortcut } from "@/utils/platformUtils";
import { TutorialHelp } from "../TutorialHelp";
import { SubtitleGenerateDialog } from "../subtitle";

const ZOOM_ROW_ID = "row-zoom";
const TRIM_ROW_ID = "row-trim";
const ANNOTATION_ROW_ID = "row-annotation";
const SUBTITLE_ROW_ID = "row-subtitle";
const FALLBACK_RANGE_MS = 1000;
const TARGET_MARKER_COUNT = 12;

interface TimelineEditorProps {
  videoDuration: number;
  currentTime: number;
  onSeek?: (time: number) => void;
  zoomRegions: ZoomRegion[];
  onZoomAdded: (span: Span) => void;
  onZoomSpanChange: (id: string, span: Span) => void;
  onZoomDelete: (id: string) => void;
  selectedZoomId: string | null;
  onSelectZoom: (id: string | null) => void;
  trimRegions?: TrimRegion[];
  onTrimAdded?: (span: Span) => void;
  onTrimSpanChange?: (id: string, span: Span) => void;
  onTrimDelete?: (id: string) => void;
  selectedTrimId?: string | null;
  onSelectTrim?: (id: string | null) => void;
  annotationRegions?: AnnotationRegion[];
  onAnnotationAdded?: (span: Span) => void;
  onAnnotationSpanChange?: (id: string, span: Span) => void;
  onAnnotationDelete?: (id: string) => void;
  selectedAnnotationId?: string | null;
  onSelectAnnotation?: (id: string | null) => void;
  // Subtitle props
  subtitleRegions?: SubtitleRegion[];
  onSubtitleAdded?: (span: Span) => void;
  onSubtitleSpanChange?: (id: string, span: Span) => void;
  onSubtitleDelete?: (id: string) => void;
  selectedSubtitleId?: string | null;
  onSelectSubtitle?: (id: string | null) => void;
  // Auto-generate props
  videoPath?: string;
  onAutoGenerateSubtitles?: (subtitles: SubtitleRegion[]) => void;
  aspectRatio: AspectRatio;
  onAspectRatioChange: (aspectRatio: AspectRatio) => void;
}

interface TimelineScaleConfig {
  intervalMs: number;
  gridMs: number;
  minItemDurationMs: number;
  defaultItemDurationMs: number;
  minVisibleRangeMs: number;
}

interface TimelineRenderItem {
  id: string;
  rowId: string;
  span: Span;
  label: string;
  zoomDepth?: number;
  variant: 'zoom' | 'trim' | 'annotation' | 'subtitle';
}

const SCALE_CANDIDATES = [
  { intervalSeconds: 0.25, gridSeconds: 0.05 },
  { intervalSeconds: 0.5, gridSeconds: 0.1 },
  { intervalSeconds: 1, gridSeconds: 0.25 },
  { intervalSeconds: 2, gridSeconds: 0.5 },
  { intervalSeconds: 5, gridSeconds: 1 },
  { intervalSeconds: 10, gridSeconds: 2 },
  { intervalSeconds: 15, gridSeconds: 3 },
  { intervalSeconds: 30, gridSeconds: 5 },
  { intervalSeconds: 60, gridSeconds: 10 },
  { intervalSeconds: 120, gridSeconds: 20 },
  { intervalSeconds: 300, gridSeconds: 30 },
  { intervalSeconds: 600, gridSeconds: 60 },
  { intervalSeconds: 900, gridSeconds: 120 },
  { intervalSeconds: 1800, gridSeconds: 180 },
  { intervalSeconds: 3600, gridSeconds: 300 },
];

function calculateTimelineScale(durationSeconds: number): TimelineScaleConfig {
  const totalMs = Math.max(0, Math.round(durationSeconds * 1000));

  const selectedCandidate = SCALE_CANDIDATES.find((candidate) => {
    if (durationSeconds <= 0) {
      return true;
    }
    const markers = durationSeconds / candidate.intervalSeconds;
    return markers <= TARGET_MARKER_COUNT;
  }) ?? SCALE_CANDIDATES[SCALE_CANDIDATES.length - 1];

  const intervalMs = Math.round(selectedCandidate.intervalSeconds * 1000);
  const gridMs = Math.round(selectedCandidate.gridSeconds * 1000);

  // Set minItemDurationMs to 1ms for maximum granularity
  const minItemDurationMs = 1;
  const defaultItemDurationMs = Math.min(
    Math.max(minItemDurationMs, intervalMs * 2),
    totalMs > 0 ? totalMs : intervalMs * 2,
  );

  const minVisibleRangeMs = totalMs > 0
    ? Math.min(Math.max(intervalMs * 3, minItemDurationMs * 6, 1000), totalMs)
    : Math.max(intervalMs * 3, minItemDurationMs * 6, 1000);

  return {
    intervalMs,
    gridMs,
    minItemDurationMs,
    defaultItemDurationMs,
    minVisibleRangeMs,
  };
}

function createInitialRange(totalMs: number): Range {
  if (totalMs > 0) {
    return { start: 0, end: totalMs };
  }

  return { start: 0, end: FALLBACK_RANGE_MS };
}

function formatTimeLabel(milliseconds: number, intervalMs: number) {
  const totalSeconds = milliseconds / 1000;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const fractionalDigits = intervalMs < 250 ? 2 : intervalMs < 1000 ? 1 : 0;

  if (hours > 0) {
    const minutesString = minutes.toString().padStart(2, "0");
    const secondsString = Math.floor(seconds)
      .toString()
      .padStart(2, "0");
    return `${hours}:${minutesString}:${secondsString}`;
  }

  if (fractionalDigits > 0) {
    const secondsWithFraction = seconds.toFixed(fractionalDigits);
    const [wholeSeconds, fraction] = secondsWithFraction.split(".");
    return `${minutes}:${wholeSeconds.padStart(2, "0")}.${fraction}`;
  }

  return `${minutes}:${Math.floor(seconds).toString().padStart(2, "0")}`;
}

function PlaybackCursor({ 
  currentTimeMs, 
  videoDurationMs,
  onSeek,
  timelineRef,
}: { 
  currentTimeMs: number; 
  videoDurationMs: number;
  onSeek?: (time: number) => void;
  timelineRef: React.RefObject<HTMLDivElement>;
}) {
  const { sidebarWidth, direction, range, valueToPixels, pixelsToValue } = useTimelineContext();
  const sideProperty = direction === "rtl" ? "right" : "left";
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current || !onSeek) return;
      
      const rect = timelineRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left - sidebarWidth;
      
      // Allow dragging outside to 0 or max, but clamp the value
      const relativeMs = pixelsToValue(clickX);
      const absoluteMs = Math.max(0, Math.min(range.start + relativeMs, videoDurationMs));
      
      onSeek(absoluteMs / 1000);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'ew-resize';

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };
  }, [isDragging, onSeek, timelineRef, sidebarWidth, range.start, videoDurationMs, pixelsToValue]);

  if (videoDurationMs <= 0 || currentTimeMs < 0) {
    return null;
  }

  const clampedTime = Math.min(currentTimeMs, videoDurationMs);
  
  if (clampedTime < range.start || clampedTime > range.end) {
    return null;
  }

  const offset = valueToPixels(clampedTime - range.start);

  return (
    <div
      className="absolute top-0 bottom-0 z-50 group/cursor"
      style={{
        [sideProperty === "right" ? "marginRight" : "marginLeft"]: `${sidebarWidth - 1}px`,
        pointerEvents: 'none', // Allow clicks to pass through to timeline, but we'll enable pointer events on the handle
      }}
    >
      <div
        className="absolute top-0 bottom-0 w-[2px] bg-[#34B27B] shadow-[0_0_10px_rgba(52,178,123,0.5)] cursor-ew-resize pointer-events-auto hover:shadow-[0_0_15px_rgba(52,178,123,0.7)] transition-shadow"
        style={{
          [sideProperty]: `${offset}px`,
        }}
        onMouseDown={(e) => {
          e.stopPropagation(); // Prevent timeline click
          setIsDragging(true);
        }}
      >
        <div
          className="absolute -top-1 left-1/2 -translate-x-1/2 hover:scale-125 transition-transform"
          style={{ width: '16px', height: '16px' }}
        >
          <div className="w-3 h-3 mx-auto mt-[2px] bg-[#34B27B] rotate-45 rounded-sm shadow-lg border border-white/20" />
        </div>
      </div>
    </div>
  );
}

function TimelineAxis({
  intervalMs,
  videoDurationMs,
  currentTimeMs,
}: {
  intervalMs: number;
  videoDurationMs: number;
  currentTimeMs: number;
}) {
  const { sidebarWidth, direction, range, valueToPixels } = useTimelineContext();
  const sideProperty = direction === "rtl" ? "right" : "left";

  const markers = useMemo(() => {
    if (intervalMs <= 0) {
      return { markers: [], minorTicks: [] };
    }

    const maxTime = videoDurationMs > 0 ? videoDurationMs : range.end;
    const visibleStart = Math.max(0, Math.min(range.start, maxTime));
    const visibleEnd = Math.min(range.end, maxTime);
    const markerTimes = new Set<number>();

    const firstMarker = Math.ceil(visibleStart / intervalMs) * intervalMs;

    for (let time = firstMarker; time <= maxTime; time += intervalMs) {
      if (time >= visibleStart && time <= visibleEnd) {
        markerTimes.add(Math.round(time));
      }
    }

    if (visibleStart <= maxTime) {
      markerTimes.add(Math.round(visibleStart));
    }
    
    if (videoDurationMs > 0) {
      markerTimes.add(Math.round(videoDurationMs));
    }

    const sorted = Array.from(markerTimes)
      .filter(time => time <= maxTime)
      .sort((a, b) => a - b);

    // Generate minor ticks (4 ticks between major intervals)
    const minorTicks = [];
    const minorInterval = intervalMs / 5;
    
    for (let time = firstMarker; time <= maxTime; time += minorInterval) {
      if (time >= visibleStart && time <= visibleEnd) {
        // Skip if it's close to a major marker
        const isMajor = Math.abs(time % intervalMs) < 1;
        if (!isMajor) {
          minorTicks.push(time);
        }
      }
    }

    return { 
      markers: sorted.map((time) => ({
        time,
        label: formatTimeLabel(time, intervalMs),
      })), 
      minorTicks 
    };
  }, [intervalMs, range.end, range.start, videoDurationMs]);

  return (
    <div
      className="h-8 bg-[#09090b] border-b border-white/5 relative overflow-hidden select-none"
      style={{
        [sideProperty === "right" ? "marginRight" : "marginLeft"]: `${sidebarWidth}px`,
      }}
    >
      {/* Minor Ticks */}
      {markers.minorTicks.map((time) => {
        const offset = valueToPixels(time - range.start);
        return (
          <div
            key={`minor-${time}`}
            className="absolute bottom-0 h-1 w-[1px] bg-white/5"
            style={{ [sideProperty]: `${offset}px` }}
          />
        );
      })}

      {/* Major Markers */}
      {markers.markers.map((marker) => {
        const offset = valueToPixels(marker.time - range.start);
        const markerStyle: React.CSSProperties = {
          position: "absolute",
          bottom: 0,
          height: "100%",
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-end",
          [sideProperty]: `${offset}px`,
        };

        return (
          <div key={marker.time} style={markerStyle}>
            <div className="flex flex-col items-center pb-1">
              <div className="h-2 w-[1px] bg-white/20 mb-1" />
              <span
                className={cn(
                  "text-[10px] font-medium tabular-nums tracking-tight",
                  marker.time === currentTimeMs ? "text-[#34B27B]" : "text-slate-500"
                )}
              >
                {marker.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Timeline({
  items,
  videoDurationMs,
  intervalMs,
  currentTimeMs,
  onSeek,
  onSelectZoom,
  onSelectTrim,
  onSelectAnnotation,
  onSelectSubtitle,
  selectedZoomId,
  selectedTrimId,
  selectedAnnotationId,
  selectedSubtitleId,
}: {
  items: TimelineRenderItem[];
  videoDurationMs: number;
  intervalMs: number;
  currentTimeMs: number;
  onSeek?: (time: number) => void;
  onSelectZoom?: (id: string | null) => void;
  onSelectTrim?: (id: string | null) => void;
  onSelectAnnotation?: (id: string | null) => void;
  onSelectSubtitle?: (id: string | null) => void;
  selectedZoomId: string | null;
  selectedTrimId?: string | null;
  selectedAnnotationId?: string | null;
  selectedSubtitleId?: string | null;
}) {
  const { setTimelineRef, style, sidebarWidth, range, pixelsToValue } = useTimelineContext();
  const localTimelineRef = useRef<HTMLDivElement | null>(null);

  const setRefs = useCallback((node: HTMLDivElement | null) => {
    setTimelineRef(node);
    localTimelineRef.current = node;
  }, [setTimelineRef]);

  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek || videoDurationMs <= 0) return;
    
    // Only clear selection if clicking on empty space (not on items)
    // This is handled by event propagation - items stop propagation
    onSelectZoom?.(null);
    onSelectTrim?.(null);
    onSelectAnnotation?.(null);
    onSelectSubtitle?.(null);

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left - sidebarWidth;
    
    if (clickX < 0) return;
    
    const relativeMs = pixelsToValue(clickX);
    const absoluteMs = Math.max(0, Math.min(range.start + relativeMs, videoDurationMs));
    const timeInSeconds = absoluteMs / 1000;
    
    onSeek(timeInSeconds);
  }, [onSeek, onSelectZoom, onSelectTrim, onSelectAnnotation, onSelectSubtitle, videoDurationMs, sidebarWidth, range.start, pixelsToValue]);

  const zoomItems = items.filter(item => item.rowId === ZOOM_ROW_ID);
  const trimItems = items.filter(item => item.rowId === TRIM_ROW_ID);
  const annotationItems = items.filter(item => item.rowId === ANNOTATION_ROW_ID);
  const subtitleItems = items.filter(item => item.rowId === SUBTITLE_ROW_ID);

  return (
    <div
      ref={setRefs}
      style={style}
      className="select-none bg-[#09090b] min-h-[140px] relative cursor-pointer group"
      onClick={handleTimelineClick}
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px)] bg-[length:20px_100%] pointer-events-none" />
      <TimelineAxis intervalMs={intervalMs} videoDurationMs={videoDurationMs} currentTimeMs={currentTimeMs} />
      <PlaybackCursor 
        currentTimeMs={currentTimeMs} 
        videoDurationMs={videoDurationMs} 
        onSeek={onSeek}
        timelineRef={localTimelineRef}
      />
      
      <Row id={ZOOM_ROW_ID}>
        {zoomItems.map((item) => (
          <Item
            id={item.id}
            key={item.id}
            rowId={item.rowId}
            span={item.span}
            isSelected={item.id === selectedZoomId}
            onSelect={() => onSelectZoom?.(item.id)}
            zoomDepth={item.zoomDepth}
            variant="zoom"
          >
            {item.label}
          </Item>
        ))}
      </Row>

      <Row id={TRIM_ROW_ID}>
        {trimItems.map((item) => (
          <Item
            id={item.id}
            key={item.id}
            rowId={item.rowId}
            span={item.span}
            isSelected={item.id === selectedTrimId}
            onSelect={() => onSelectTrim?.(item.id)}
            variant="trim"
          >
            {item.label}
          </Item>
        ))}
      </Row>

      <Row id={ANNOTATION_ROW_ID}>
        {annotationItems.map((item) => (
          <Item
            id={item.id}
            key={item.id}
            rowId={item.rowId}
            span={item.span}
            isSelected={item.id === selectedAnnotationId}
            onSelect={() => onSelectAnnotation?.(item.id)}
            variant="annotation"
          >
            {item.label}
          </Item>
        ))}
      </Row>

      <Row id={SUBTITLE_ROW_ID}>
        {subtitleItems.map((item) => (
          <Item
            id={item.id}
            key={item.id}
            rowId={item.rowId}
            span={item.span}
            isSelected={item.id === selectedSubtitleId}
            onSelect={() => onSelectSubtitle?.(item.id)}
            variant="subtitle"
          >
            {item.label}
          </Item>
        ))}
      </Row>
    </div>
  );
}

export default function TimelineEditor({
  videoDuration,
  currentTime,
  onSeek,
  zoomRegions,
  onZoomAdded,
  onZoomSpanChange,
  onZoomDelete,
  selectedZoomId,
  onSelectZoom,
  trimRegions = [],
  onTrimAdded,
  onTrimSpanChange,
  onTrimDelete,
  selectedTrimId,
  onSelectTrim,
  annotationRegions = [],
  onAnnotationAdded,
  onAnnotationSpanChange,
  onAnnotationDelete,
  selectedAnnotationId,
  onSelectAnnotation,
  subtitleRegions = [],
  onSubtitleAdded,
  onSubtitleSpanChange,
  onSubtitleDelete,
  selectedSubtitleId,
  onSelectSubtitle,
  videoPath,
  onAutoGenerateSubtitles,
  aspectRatio,
  onAspectRatioChange,
}: TimelineEditorProps) {
  const totalMs = useMemo(() => Math.max(0, Math.round(videoDuration * 1000)), [videoDuration]);
  const currentTimeMs = useMemo(() => Math.round(currentTime * 1000), [currentTime]);
  const timelineScale = useMemo(() => calculateTimelineScale(videoDuration), [videoDuration]);
  const safeMinDurationMs = useMemo(
    () => (totalMs > 0 ? Math.min(timelineScale.minItemDurationMs, totalMs) : timelineScale.minItemDurationMs),
    [timelineScale.minItemDurationMs, totalMs],
  );

  const [range, setRange] = useState<Range>(() => createInitialRange(totalMs));
  const [keyframes, setKeyframes] = useState<{ id: string; time: number }[]>([]);
  const [selectedKeyframeId, setSelectedKeyframeId] = useState<string | null>(null);
  const [shortcuts, setShortcuts] = useState({
    pan: 'Shift + Ctrl + Scroll',
    zoom: 'Ctrl + Scroll'
  });
  const [showSubtitleGenerateDialog, setShowSubtitleGenerateDialog] = useState(false);

  useEffect(() => {
    formatShortcut(['shift', 'mod', 'Scroll']).then(pan => {
      formatShortcut(['mod', 'Scroll']).then(zoom => {
        setShortcuts({ pan, zoom });
      });
    });
  }, []);

  // Add keyframe at current playhead position
  const addKeyframe = useCallback(() => {
    if (totalMs === 0) return;
    const time = Math.max(0, Math.min(currentTimeMs, totalMs));
    if (keyframes.some(kf => Math.abs(kf.time - time) < 1)) return;
    setKeyframes(prev => [...prev, { id: uuidv4(), time }]);
  }, [currentTimeMs, totalMs, keyframes]);

  // Delete selected keyframe
  const deleteSelectedKeyframe = useCallback(() => {
    if (!selectedKeyframeId) return;
    setKeyframes(prev => prev.filter(kf => kf.id !== selectedKeyframeId));
    setSelectedKeyframeId(null);
  }, [selectedKeyframeId]);

  // Delete selected zoom item
  const deleteSelectedZoom = useCallback(() => {
    if (!selectedZoomId) return;
    onZoomDelete(selectedZoomId);
    onSelectZoom(null);
  }, [selectedZoomId, onZoomDelete, onSelectZoom]);

  // Delete selected trim item
  const deleteSelectedTrim = useCallback(() => {
    if (!selectedTrimId || !onTrimDelete || !onSelectTrim) return;
    onTrimDelete(selectedTrimId);
    onSelectTrim(null);
  }, [selectedTrimId, onTrimDelete, onSelectTrim]);

  const deleteSelectedAnnotation = useCallback(() => {
    if (!selectedAnnotationId || !onAnnotationDelete || !onSelectAnnotation) return;
    onAnnotationDelete(selectedAnnotationId);
    onSelectAnnotation(null);
  }, [selectedAnnotationId, onAnnotationDelete, onSelectAnnotation]);

  const deleteSelectedSubtitle = useCallback(() => {
    if (!selectedSubtitleId || !onSubtitleDelete || !onSelectSubtitle) return;
    onSubtitleDelete(selectedSubtitleId);
    onSelectSubtitle(null);
  }, [selectedSubtitleId, onSubtitleDelete, onSelectSubtitle]);

  useEffect(() => {
    setRange(createInitialRange(totalMs));
  }, [totalMs]);

  useEffect(() => {
    if (totalMs === 0 || safeMinDurationMs <= 0) {
      return;
    }

    zoomRegions.forEach((region) => {
      const clampedStart = Math.max(0, Math.min(region.startMs, totalMs));
      const minEnd = clampedStart + safeMinDurationMs;
      const clampedEnd = Math.min(totalMs, Math.max(minEnd, region.endMs));
      const normalizedStart = Math.max(0, Math.min(clampedStart, totalMs - safeMinDurationMs));
      const normalizedEnd = Math.max(minEnd, Math.min(clampedEnd, totalMs));

      if (normalizedStart !== region.startMs || normalizedEnd !== region.endMs) {
        onZoomSpanChange(region.id, { start: normalizedStart, end: normalizedEnd });
      }
    });

    trimRegions.forEach((region) => {
      const clampedStart = Math.max(0, Math.min(region.startMs, totalMs));
      const minEnd = clampedStart + safeMinDurationMs;
      const clampedEnd = Math.min(totalMs, Math.max(minEnd, region.endMs));
      const normalizedStart = Math.max(0, Math.min(clampedStart, totalMs - safeMinDurationMs));
      const normalizedEnd = Math.max(minEnd, Math.min(clampedEnd, totalMs));

      if (normalizedStart !== region.startMs || normalizedEnd !== region.endMs) {
        onTrimSpanChange?.(region.id, { start: normalizedStart, end: normalizedEnd });
      }
    });
  }, [zoomRegions, trimRegions, annotationRegions, totalMs, safeMinDurationMs, onZoomSpanChange, onTrimSpanChange, onAnnotationSpanChange]);

  const hasOverlap = useCallback((newSpan: Span, excludeId?: string): boolean => {
    // Determine which row the item belongs to
    const isZoomItem = zoomRegions.some(r => r.id === excludeId);
    const isTrimItem = trimRegions.some(r => r.id === excludeId);
    const isAnnotationItem = annotationRegions.some(r => r.id === excludeId);
    const isSubtitleItem = subtitleRegions.some(r => r.id === excludeId);

    // Annotations and subtitles can overlap
    if (isAnnotationItem || isSubtitleItem) {
      return false;
    }

    // Helper to check overlap against a specific set of regions
    const checkOverlap = (regions: (ZoomRegion | TrimRegion)[]) => {
      return regions.some((region) => {
        if (region.id === excludeId) return false;
        const gapBefore = newSpan.start - region.endMs;
        const gapAfter = region.startMs - newSpan.end;
        // Snap if gap is 2ms or less
        if (gapBefore > 0 && gapBefore <= 2) return true;
        if (gapAfter > 0 && gapAfter <= 2) return true;
        return !(newSpan.end <= region.startMs || newSpan.start >= region.endMs);
      });
    };

    if (isZoomItem) {
      return checkOverlap(zoomRegions);
    }

    if (isTrimItem) {
      return checkOverlap(trimRegions);
    }

    return false;
  }, [zoomRegions, trimRegions, annotationRegions, subtitleRegions]);

  const handleAddZoom = useCallback(() => {
    if (!videoDuration || videoDuration === 0 || totalMs === 0) {
      return;
    }

    const defaultDuration = Math.min(1000, totalMs);
    if (defaultDuration <= 0) {
      return;
    }

    // Always place zoom at playhead
    const startPos = Math.max(0, Math.min(currentTimeMs, totalMs));
    // Find the next zoom region after the playhead
    const sorted = [...zoomRegions].sort((a, b) => a.startMs - b.startMs);
    const nextRegion = sorted.find(region => region.startMs > startPos);
    const gapToNext = nextRegion ? nextRegion.startMs - startPos : totalMs - startPos;

    // Check if playhead is inside any zoom region
    const isOverlapping = sorted.some(region => startPos >= region.startMs && startPos < region.endMs);
    if (isOverlapping || gapToNext <= 0) {
      toast.error("Cannot place zoom here", {
        description: "Zoom already exists at this location or not enough space available.",
      });
      return;
    }

    const actualDuration = Math.min(1000, gapToNext);
    onZoomAdded({ start: startPos, end: startPos + actualDuration });
  }, [videoDuration, totalMs, currentTimeMs, zoomRegions, onZoomAdded]);

  const handleAddTrim = useCallback(() => {
    if (!videoDuration || videoDuration === 0 || totalMs === 0 || !onTrimAdded) {
      return;
    }

    const defaultDuration = Math.min(1000, totalMs);
    if (defaultDuration <= 0) {
      return;
    }

    // Always place trim at playhead
    const startPos = Math.max(0, Math.min(currentTimeMs, totalMs));
    // Find the next trim region after the playhead
    const sorted = [...trimRegions].sort((a, b) => a.startMs - b.startMs);
    const nextRegion = sorted.find(region => region.startMs > startPos);
    const gapToNext = nextRegion ? nextRegion.startMs - startPos : totalMs - startPos;

    // Check if playhead is inside any trim region
    const isOverlapping = sorted.some(region => startPos >= region.startMs && startPos < region.endMs);
    if (isOverlapping || gapToNext <= 0) {
      toast.error("Cannot place trim here", {
        description: "Trim already exists at this location or not enough space available.",
      });
      return;
    }

    const actualDuration = Math.min(1000, gapToNext);
    onTrimAdded({ start: startPos, end: startPos + actualDuration });
  }, [videoDuration, totalMs, currentTimeMs, trimRegions, onTrimAdded]);

  const handleAddAnnotation = useCallback(() => {
    if (!videoDuration || videoDuration === 0 || totalMs === 0 || !onAnnotationAdded) {
      return;
    }

    const defaultDuration = Math.min(1000, totalMs);
    if (defaultDuration <= 0) {
      return;
    }

    // Multiple annotations can exist at the same timestamp
    const startPos = Math.max(0, Math.min(currentTimeMs, totalMs));
    const endPos = Math.min(startPos + defaultDuration, totalMs);
    
    onAnnotationAdded({ start: startPos, end: endPos });
  }, [videoDuration, totalMs, currentTimeMs, onAnnotationAdded]);

  const handleAddSubtitle = useCallback(() => {
    if (!videoDuration || videoDuration === 0 || totalMs === 0 || !onSubtitleAdded) {
      return;
    }

    const defaultDuration = Math.min(2000, totalMs); // Subtitles are typically longer
    if (defaultDuration <= 0) {
      return;
    }

    // Multiple subtitles can exist at the same timestamp (though typically shouldn't)
    const startPos = Math.max(0, Math.min(currentTimeMs, totalMs));
    const endPos = Math.min(startPos + defaultDuration, totalMs);
    
    onSubtitleAdded({ start: startPos, end: endPos });
  }, [videoDuration, totalMs, currentTimeMs, onSubtitleAdded]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'f' || e.key === 'F') {
        addKeyframe();
      }
      if (e.key === 'z' || e.key === 'Z') {
        handleAddZoom();
      }
      if (e.key === 't' || e.key === 'T') {
        handleAddTrim();
      }
      if (e.key === 'a' || e.key === 'A') {
        handleAddAnnotation();
      }
      if (e.key === 's' || e.key === 'S') {
        handleAddSubtitle();
      }
      
      // Tab: Cycle through overlapping annotations at current time
      if (e.key === 'Tab' && annotationRegions.length > 0) {
        const currentTimeMs = Math.round(currentTime * 1000);
        const overlapping = annotationRegions
          .filter(a => currentTimeMs >= a.startMs && currentTimeMs <= a.endMs)
          .sort((a, b) => a.zIndex - b.zIndex); // Sort by z-index
        
        if (overlapping.length > 0) {
          e.preventDefault(); 
          
          if (!selectedAnnotationId || !overlapping.some(a => a.id === selectedAnnotationId)) {
            onSelectAnnotation?.(overlapping[0].id);
          } else {
            // Cycle to next annotation
            const currentIndex = overlapping.findIndex(a => a.id === selectedAnnotationId);
            const nextIndex = e.shiftKey 
              ? (currentIndex - 1 + overlapping.length) % overlapping.length // Shift+Tab = backward
              : (currentIndex + 1) % overlapping.length; // Tab = forward
            onSelectAnnotation?.(overlapping[nextIndex].id);
          }
        }
      }    
      if ((e.key === 'd' || e.key === 'D') && (e.ctrlKey || e.metaKey)) {
        if (selectedKeyframeId) {
          deleteSelectedKeyframe();
        } else if (selectedZoomId) {
          deleteSelectedZoom();
        } else if (selectedTrimId) {
          deleteSelectedTrim();
        } else if (selectedAnnotationId) {
          deleteSelectedAnnotation();
        } else if (selectedSubtitleId) {
          deleteSelectedSubtitle();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [addKeyframe, handleAddZoom, handleAddTrim, handleAddAnnotation, handleAddSubtitle, deleteSelectedKeyframe, deleteSelectedZoom, deleteSelectedTrim, deleteSelectedAnnotation, deleteSelectedSubtitle, selectedKeyframeId, selectedZoomId, selectedTrimId, selectedAnnotationId, selectedSubtitleId, annotationRegions, currentTime, onSelectAnnotation]);

  const clampedRange = useMemo<Range>(() => {
    if (totalMs === 0) {
      return range;
    }

    return {
      start: Math.max(0, Math.min(range.start, totalMs)),
      end: Math.min(range.end, totalMs),
    };
  }, [range, totalMs]);

  const timelineItems = useMemo<TimelineRenderItem[]>(() => {
    const zooms: TimelineRenderItem[] = zoomRegions.map((region, index) => ({
      id: region.id,
      rowId: ZOOM_ROW_ID,
      span: { start: region.startMs, end: region.endMs },
      label: `Zoom ${index + 1}`,
      zoomDepth: region.depth,
      variant: 'zoom',
    }));

    const trims: TimelineRenderItem[] = trimRegions.map((region, index) => ({
      id: region.id,
      rowId: TRIM_ROW_ID,
      span: { start: region.startMs, end: region.endMs },
      label: `Trim ${index + 1}`,
      variant: 'trim',
    }));

    const annotations: TimelineRenderItem[] = annotationRegions.map((region) => {
      let label: string;
      
      if (region.type === 'text') {
        // Show text preview
        const preview = region.content.trim() || 'Empty text';
        label = preview.length > 20 ? `${preview.substring(0, 20)}...` : preview;
      } else if (region.type === 'image') {
        label = 'Image';
      } else {
        label = 'Annotation';
      }
      
      return {
        id: region.id,
        rowId: ANNOTATION_ROW_ID,
        span: { start: region.startMs, end: region.endMs },
        label,
        variant: 'annotation',
      };
    });

    const subtitles: TimelineRenderItem[] = subtitleRegions.map((region) => {
      const preview = region.text.trim() || 'Empty subtitle';
      const label = preview.length > 15 ? `${preview.substring(0, 15)}...` : preview;
      
      return {
        id: region.id,
        rowId: SUBTITLE_ROW_ID,
        span: { start: region.startMs, end: region.endMs },
        label,
        variant: 'subtitle',
      };
    });

    return [...zooms, ...trims, ...annotations, ...subtitles];
  }, [zoomRegions, trimRegions, annotationRegions, subtitleRegions]);

  const handleItemSpanChange = useCallback((id: string, span: Span) => {
    // Check if it's a zoom, trim, annotation, or subtitle item
    if (zoomRegions.some(r => r.id === id)) {
      onZoomSpanChange(id, span);
    } else if (trimRegions.some(r => r.id === id)) {
      onTrimSpanChange?.(id, span);
    } else if (annotationRegions.some(r => r.id === id)) {
      onAnnotationSpanChange?.(id, span);
    } else if (subtitleRegions.some(r => r.id === id)) {
      onSubtitleSpanChange?.(id, span);
    }
  }, [zoomRegions, trimRegions, annotationRegions, subtitleRegions, onZoomSpanChange, onTrimSpanChange, onAnnotationSpanChange, onSubtitleSpanChange]);

  if (!videoDuration || videoDuration === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center rounded-lg bg-[#09090b] gap-3">
        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
          <Plus className="w-6 h-6 text-slate-600" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-slate-300">No Video Loaded</p>
          <p className="text-xs text-slate-500 mt-1">Drag and drop a video to start editing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#09090b] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-[#09090b]">
        <div className="flex items-center gap-1">
          <Button
            onClick={handleAddZoom}
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-400 hover:text-[#34B27B] hover:bg-[#34B27B]/10 transition-all"
            title="Add Zoom (Z)"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            onClick={handleAddTrim}
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-400 hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-all"
            title="Add Trim (T)"
          >
            <Scissors className="w-4 h-4" />
          </Button>
          <Button
            onClick={handleAddAnnotation}
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-400 hover:text-[#B4A046] hover:bg-[#B4A046]/10 transition-all"
            title="Add Annotation (A)"
          >
            <MessageSquare className="w-4 h-4" />
          </Button>
          <Button
            onClick={handleAddSubtitle}
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-400 hover:text-[#00BCD4] hover:bg-[#00BCD4]/10 transition-all"
            title="Add Subtitle (S)"
          >
            <Subtitles className="w-4 h-4" />
          </Button>
          {videoPath && onAutoGenerateSubtitles && (
            <Button
              onClick={() => setShowSubtitleGenerateDialog(true)}
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-slate-400 hover:text-[#00BCD4] hover:bg-[#00BCD4]/10 transition-all gap-1"
              title="Auto Generate Subtitles"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span className="text-xs">Auto</span>
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-all gap-1"
              >
                <span className="font-medium">{getAspectRatioLabel(aspectRatio)}</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-white/10">
              {(['16:9', '9:16', '1:1', '4:3', '4:5'] as AspectRatio[]).map((ratio) => (
                <DropdownMenuItem
                  key={ratio}
                  onClick={() => onAspectRatioChange(ratio)}
                  className="text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer flex items-center justify-between gap-3"
                >
                  <span>{getAspectRatioLabel(ratio)}</span>
                  {aspectRatio === ratio && <Check className="w-3 h-3 text-[#34B27B]" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="w-[1px] h-4 bg-white/10" />
          <TutorialHelp />
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-4 text-[10px] text-slate-500 font-medium">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[#34B27B] font-sans">{shortcuts.pan}</kbd>
            <span>Pan</span>
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[#34B27B] font-sans">{shortcuts.zoom}</kbd>            
            <span>Zoom</span>
          </span>
        </div>
      </div>
<div className="flex-1 overflow-x-hidden overflow-y-auto bg-[#09090b] relative"
        onClick={() => setSelectedKeyframeId(null)}
      >
        <TimelineWrapper
          range={clampedRange}
          videoDuration={videoDuration}
          hasOverlap={hasOverlap}
          onRangeChange={setRange}
          minItemDurationMs={timelineScale.minItemDurationMs}
          minVisibleRangeMs={timelineScale.minVisibleRangeMs}
          gridSizeMs={timelineScale.gridMs}
          onItemSpanChange={handleItemSpanChange}
        >
          <KeyframeMarkers
            keyframes={keyframes}
            selectedKeyframeId={selectedKeyframeId}
            setSelectedKeyframeId={setSelectedKeyframeId}
          />
          <Timeline
            items={timelineItems}
            videoDurationMs={totalMs}
            intervalMs={timelineScale.intervalMs}
            currentTimeMs={currentTimeMs}
            onSeek={onSeek}
            onSelectZoom={onSelectZoom}
            onSelectTrim={onSelectTrim}
            onSelectAnnotation={onSelectAnnotation}
            onSelectSubtitle={onSelectSubtitle}
            selectedZoomId={selectedZoomId}
            selectedTrimId={selectedTrimId}
            selectedAnnotationId={selectedAnnotationId}
            selectedSubtitleId={selectedSubtitleId}
          />
        </TimelineWrapper>
      </div>
      
      {/* Subtitle Generation Dialog */}
      {videoPath && onAutoGenerateSubtitles && (
        <SubtitleGenerateDialog
          isOpen={showSubtitleGenerateDialog}
          onClose={() => setShowSubtitleGenerateDialog(false)}
          videoPath={videoPath}
          onSubtitlesGenerated={onAutoGenerateSubtitles}
        />
      )}
    </div>
  );
}
