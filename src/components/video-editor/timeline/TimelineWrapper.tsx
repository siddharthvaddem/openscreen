import type {
	DragEndEvent,
	DragMoveEvent,
	DragStartEvent,
	Range,
	ResizeEndEvent,
	ResizeMoveEvent,
	Span,
} from "dnd-timeline";
import { TimelineContext } from "dnd-timeline";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useCallback, useRef } from "react";

interface TimelineWrapperProps {
	children: ReactNode;
	range: Range;
	videoDuration: number;
	hasOverlap: (newSpan: Span, excludeId?: string) => boolean;
	onRangeChange: Dispatch<SetStateAction<Range>>;
	minItemDurationMs: number;
	minVisibleRangeMs: number;
	gridSizeMs?: number;
	onItemSpanChange: (id: string, span: Span) => void;
	allRegionSpans?: { id: string; start: number; end: number }[];
}

export default function TimelineWrapper({
	children,
	range,
	videoDuration,
	hasOverlap,
	onRangeChange,
	minItemDurationMs,
	minVisibleRangeMs,
	gridSizeMs: _gridSizeMs,
	onItemSpanChange,
	allRegionSpans = [],
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
			const end = Math.min(start + duration, totalMs);

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

	// When a span overlaps neighbours, clamp it to the nearest boundary
	const clampToNeighbours = useCallback(
		(span: Span, activeItemId: string): Span => {
			const siblings = allRegionSpans.filter((r) => r.id !== activeItemId);
			let { start, end } = span;

			for (const r of siblings) {
				// Span's right edge crossed into a region to the right
				if (end > r.start && start < r.start) {
					end = r.start;
				}
				// Span's left edge crossed into a region to the left
				if (start < r.end && end > r.end) {
					start = r.end;
				}
			}

			// Ensure minimum duration after clamping
			const minDur = Math.min(minItemDurationMs, totalMs || minItemDurationMs);
			if (end - start < minDur) {
				// Try extending in the direction that has room
				if (end + minDur - (end - start) <= totalMs) {
					end = start + minDur;
				} else {
					start = end - minDur;
				}
			}

			return { start: Math.max(0, start), end: Math.min(end, totalMs || end) };
		},
		[allRegionSpans, minItemDurationMs, totalMs],
	);

	const onResizeEnd = useCallback(
		(event: ResizeEndEvent) => {
			const updatedSpan = event.active.data.current.getSpanFromResizeEvent?.(event);
			if (!updatedSpan) return;

			const activeItemId = event.active.id as string;
			let clampedSpan = clampSpanToBounds(updatedSpan);

			const effectiveMinDuration =
				totalMs > 0 ? Math.min(minItemDurationMs, totalMs) : minItemDurationMs;
			if (clampedSpan.end - clampedSpan.start < effectiveMinDuration) {
				return;
			}

			// Clamp to neighbour boundaries instead of rejecting
			if (hasOverlap(clampedSpan, activeItemId)) {
				clampedSpan = clampToNeighbours(clampedSpan, activeItemId);
				// If still overlapping after clamping, fall back to original position
				if (hasOverlap(clampedSpan, activeItemId)) {
					return;
				}
			}

			onItemSpanChange(activeItemId, clampedSpan);
		},
		[
			clampSpanToBounds,
			clampToNeighbours,
			hasOverlap,
			minItemDurationMs,
			onItemSpanChange,
			totalMs,
		],
	);

	const onDragEnd = useCallback(
		(event: DragEndEvent) => {
			const activeRowId = event.over?.id as string;
			const updatedSpan = event.active.data.current.getSpanFromDragEvent?.(event);
			if (!updatedSpan || !activeRowId) return;

			const activeItemId = event.active.id as string;
			let clampedSpan = clampSpanToBounds(updatedSpan);

			// Clamp to neighbour boundaries instead of rejecting
			if (hasOverlap(clampedSpan, activeItemId)) {
				clampedSpan = clampToNeighbours(clampedSpan, activeItemId);
				if (hasOverlap(clampedSpan, activeItemId)) {
					return;
				}
			}

			onItemSpanChange(activeItemId, clampedSpan);
		},
		[clampSpanToBounds, clampToNeighbours, hasOverlap, onItemSpanChange],
	);

	// Drag/resize tooltip (direct DOM updates, no re-renders)
	const tooltipRef = useRef<HTMLDivElement>(null);

	const formatTooltipMs = useCallback((ms: number) => {
		const s = ms / 1000;
		const min = Math.floor(s / 60);
		const sec = s % 60;
		return min > 0 ? `${min}:${sec.toFixed(1).padStart(4, "0")}` : `${sec.toFixed(1)}s`;
	}, []);

	const showTooltip = useCallback(
		(span: { start: number; end: number } | null, screenX?: number) => {
			const el = tooltipRef.current;
			if (!el) return;
			if (!span) {
				el.style.opacity = "0";
				return;
			}
			el.textContent = `${formatTooltipMs(span.start)} – ${formatTooltipMs(span.end)}`;
			el.style.opacity = "1";
			if (screenX !== undefined) {
				const parent = el.parentElement;
				if (parent) {
					const rect = parent.getBoundingClientRect();
					const x = Math.max(0, Math.min(screenX - rect.left, rect.width - 100));
					el.style.left = `${x}px`;
				}
			}
		},
		[formatTooltipMs],
	);

	const onDragStart = useCallback(
		(event: DragStartEvent) => {
			const span = event.active.data.current.getSpanFromDragEvent?.(event);
			if (span) showTooltip(span);
		},
		[showTooltip],
	);

	const onDragMove = useCallback(
		(event: DragMoveEvent) => {
			const span = event.active.data.current.getSpanFromDragEvent?.(event);
			const screenX =
				event.activatorEvent && "clientX" in event.activatorEvent
					? (event.activatorEvent as PointerEvent).clientX + (event.delta?.x ?? 0)
					: undefined;
			if (span) showTooltip(span, screenX);
		},
		[showTooltip],
	);

	const onResizeMove = useCallback(
		(event: ResizeMoveEvent) => {
			const span = event.active.data.current.getSpanFromResizeEvent?.(event);
			const screenX =
				event.activatorEvent && "clientX" in event.activatorEvent
					? (event.activatorEvent as PointerEvent).clientX + (event.delta?.x ?? 0)
					: undefined;
			if (span) showTooltip(span, screenX);
		},
		[showTooltip],
	);

	const hideTooltip = useCallback(() => showTooltip(null), [showTooltip]);

	const onResizeEndWithTooltip = useCallback(
		(event: ResizeEndEvent) => {
			hideTooltip();
			onResizeEnd(event);
		},
		[hideTooltip, onResizeEnd],
	);

	const onDragEndWithTooltip = useCallback(
		(event: DragEndEvent) => {
			hideTooltip();
			onDragEnd(event);
		},
		[hideTooltip, onDragEnd],
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
			onResizeEnd={onResizeEndWithTooltip}
			onResizeMove={onResizeMove}
			onDragStart={onDragStart}
			onDragMove={onDragMove}
			onDragEnd={onDragEndWithTooltip}
			autoScroll={{ enabled: false }}
		>
			<div className="relative">
				{children}
				{/* Floating tooltip shown during drag/resize */}
				<div
					ref={tooltipRef}
					className="absolute top-1 pointer-events-none z-[60] px-1.5 py-0.5 rounded bg-black/80 text-[10px] text-white/90 font-medium tabular-nums whitespace-nowrap border border-white/10 shadow-lg"
					style={{ opacity: 0, transition: "opacity 0.1s" }}
				/>
			</div>
		</TimelineContext>
	);
}
