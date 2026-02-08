import { useCallback } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { TimelineContext } from "dnd-timeline";
import type { DragEndEvent, Range, ResizeEndEvent, Span } from "dnd-timeline";

interface TimelineWrapperProps {
  children: ReactNode;
  range: Range;
  videoDuration: number;
  hasOverlap: (newSpan: Span, excludeId?: string) => boolean;
  onRangeChange: Dispatch<SetStateAction<Range>>;
  minItemDurationMs: number;
  minVisibleRangeMs: number;
  gridSizeMs: number;
  onItemSpanChange: (id: string, span: Span) => void;
}

export default function TimelineWrapper({
  children,
  range,
  videoDuration,
  hasOverlap,
  onRangeChange,
  minItemDurationMs,
  minVisibleRangeMs,
  onItemSpanChange,
}: TimelineWrapperProps) {
  const totalMs = Math.max(0, Math.round(videoDuration * 1000));

  const clampSpanToBounds = useCallback(
    (span: Span): Span => {
      const rawDuration = Math.max(span.end - span.start, 0);
      const normalizedStart = Number.isFinite(span.start) ? span.start : 0;

      if (totalMs === 0) {
        const minDuration = Math.max(minItemDurationMs, 1);
        const duration = Math.max(rawDuration, minDuration);
        const start = Math.max(0, normalizedStart);
        return {
          start,
          end: start + duration,
        };
      }

      const minDuration = Math.min(Math.max(minItemDurationMs, 1), totalMs);
      const duration = Math.min(Math.max(rawDuration, minDuration), totalMs);

      const start = Math.max(0, Math.min(normalizedStart, totalMs - duration));
      const end = start + duration;

      return { start, end };
    },
    [minItemDurationMs, totalMs],
  );

  const clampRange = useCallback(
    (candidate: Range): Range => {
      if (totalMs === 0) {
        const minSpan = Math.max(minVisibleRangeMs, 1);
        const span = Math.max(candidate.end - candidate.start, minSpan);
        const start = Math.max(0, Math.min(candidate.start, candidate.end - span));
        return { start, end: start + span };
      }

      const rawStart = Math.max(0, candidate.start);
      const rawEnd = candidate.end;
      const clampedEnd = Math.min(rawEnd, totalMs);
      
      const minSpan = Math.min(Math.max(minVisibleRangeMs, 1), totalMs);
      const desiredSpan = clampedEnd - rawStart;
      const span = Math.min(Math.max(desiredSpan, minSpan), totalMs);
      
      let finalStart = rawStart;
      let finalEnd = finalStart + span;
      
      if (finalEnd > totalMs) {
        finalEnd = totalMs;
        finalStart = Math.max(0, finalEnd - span);
      }

      return { start: finalStart, end: finalEnd };
    },
    [minVisibleRangeMs, totalMs],
  );

  const onResizeEnd = useCallback(
    (event: ResizeEndEvent) => {
      const updatedSpan = event.active.data.current.getSpanFromResizeEvent?.(event);
      if (!updatedSpan) return;
      
      const activeItemId = event.active.id as string;
      const clampedSpan = clampSpanToBounds(updatedSpan);

      if (clampedSpan.end - clampedSpan.start < Math.min(minItemDurationMs, totalMs || minItemDurationMs)) {
        return;
      }
      
      if (hasOverlap(clampedSpan, activeItemId)) {
        return;
      }

      onItemSpanChange(activeItemId, clampedSpan);
    },
    [clampSpanToBounds, hasOverlap, minItemDurationMs, onItemSpanChange, totalMs]
  );

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const activeRowId = event.over?.id as string;
      const updatedSpan = event.active.data.current.getSpanFromDragEvent?.(event);
      if (!updatedSpan || !activeRowId) return;
      
      const activeItemId = event.active.id as string;
      const clampedSpan = clampSpanToBounds(updatedSpan);
      
      if (hasOverlap(clampedSpan, activeItemId)) {
        return;
      }

      onItemSpanChange(activeItemId, clampedSpan);
    },
    [clampSpanToBounds, hasOverlap, onItemSpanChange]
  );

  const handleRangeChange = useCallback(
    (updater: (previous: Range) => Range) => {
      onRangeChange((prev) => {
        const normalized = totalMs > 0 ? clampRange(prev) : prev;
        const desired = updater(normalized);
        
        if (totalMs > 0) {
          const clamped = clampRange(desired);
          
          if (clamped.end > totalMs) {
            const span = Math.min(clamped.end - clamped.start, totalMs);
            return {
              start: Math.max(0, totalMs - span),
              end: totalMs,
            };
          }
          
          return clamped;
        }
        
        return desired;
      });
    },
    [clampRange, onRangeChange, totalMs],
  );

  return (
    <TimelineContext
      range={range}
      onRangeChanged={handleRangeChange}
      onResizeEnd={onResizeEnd}
      onDragEnd={onDragEnd}
      autoScroll={{ enabled: false }}
    >
      {children}
    </TimelineContext>
  );
}