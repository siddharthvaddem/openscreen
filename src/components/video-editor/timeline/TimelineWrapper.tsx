import type {
	DragEndEvent,
	DragMoveEvent,
	DragStartEvent,
	Range,
	ResizeEndEvent,
	ResizeMoveEvent,
	Span,
} from "dnd-timeline";
import { TimelineContext, useTimelineContext } from "dnd-timeline";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

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
	// Spans that act as hard overlap constraints (zoom/trim/speed). Used by
	// clampToNeighbours AND as snap targets.
	allRegionSpans?: { id: string; start: number; end: number }[];
	// Spans that act ONLY as snap targets (annotation/blur). They never push
	// other items away during overlap resolution.
	softSnapSpans?: { id: string; start: number; end: number }[];
	currentTimeMs?: number;
	keyframeTimesMs?: number[];
}

interface SnapGuideHandle {
	showAt: (timeMs: number) => void;
	hide: () => void;
}

// Lives inside TimelineContext so it can read valueToPixels. Updates DOM
// directly via an imperative handle — same pattern as the drag tooltip — to
// avoid re-rendering the timeline on every pointer move.
const SnapGuide = forwardRef<SnapGuideHandle>((_, ref) => {
	const { sidebarWidth, direction, range, valueToPixels } = useTimelineContext();
	const elRef = useRef<HTMLDivElement>(null);
	const sideProperty = direction === "rtl" ? "right" : "left";

	useImperativeHandle(
		ref,
		() => ({
			showAt(timeMs: number) {
				const el = elRef.current;
				if (!el) return;
				const offset = valueToPixels(timeMs - range.start) + sidebarWidth;
				el.style[sideProperty] = `${offset}px`;
				el.style.opacity = "1";
			},
			hide() {
				const el = elRef.current;
				if (!el) return;
				el.style.opacity = "0";
			},
		}),
		[range.start, sidebarWidth, sideProperty, valueToPixels],
	);

	return (
		<div
			ref={elRef}
			className="absolute top-0 bottom-0 w-[2px] bg-[#fbbf24] shadow-[0_0_10px_rgba(251,191,36,0.85),0_0_2px_rgba(251,191,36,1)] pointer-events-none z-[55]"
			style={{ opacity: 0, transition: "opacity 0.08s" }}
		>
			<div
				className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-0 h-0"
				style={{
					borderLeft: "4px solid transparent",
					borderRight: "4px solid transparent",
					borderTop: "6px solid #fbbf24",
				}}
			/>
			<div
				className="absolute -bottom-[1px] left-1/2 -translate-x-1/2 w-0 h-0"
				style={{
					borderLeft: "4px solid transparent",
					borderRight: "4px solid transparent",
					borderBottom: "6px solid #fbbf24",
				}}
			/>
		</div>
	);
});
SnapGuide.displayName = "SnapGuide";

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
	softSnapSpans = [],
	currentTimeMs,
	keyframeTimesMs = [],
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

	const snapGuideRef = useRef<SnapGuideHandle>(null);

	// Pull the active span's edges to nearby region boundaries, timeline bounds,
	// the playhead, and keyframes. Threshold scales with zoom (~1% of visible
	// range, min 50ms) so snap feels right at any zoom level.
	// Returns the snapped span plus the actual snap target used (for guide rendering).
	const snapSpanToTargets = useCallback(
		(
			span: Span,
			activeItemId: string,
			mode: "drag" | "resize-left" | "resize-right",
		): { span: Span; snapPoint: number | null } => {
			if (totalMs === 0) return { span, snapPoint: null };

			const visibleMs = Math.max(range.end - range.start, 1);
			const thresholdMs = Math.max(50, Math.round(visibleMs / 100));

			const targetSet = new Set<number>();
			targetSet.add(0);
			targetSet.add(totalMs);
			for (const r of allRegionSpans) {
				if (r.id === activeItemId) continue;
				targetSet.add(r.start);
				targetSet.add(r.end);
			}
			for (const r of softSnapSpans) {
				if (r.id === activeItemId) continue;
				targetSet.add(r.start);
				targetSet.add(r.end);
			}
			if (currentTimeMs !== undefined) targetSet.add(currentTimeMs);
			for (const kf of keyframeTimesMs) targetSet.add(kf);
			const targets = Array.from(targetSet);

			const findNearest = (value: number): number | null => {
				let best: number | null = null;
				let bestDistance = thresholdMs;
				for (const target of targets) {
					const distance = Math.abs(target - value);
					if (distance <= bestDistance) {
						best = target;
						bestDistance = distance;
					}
				}
				return best;
			};

			if (mode === "resize-left") {
				const snap = findNearest(span.start);
				if (snap === null || span.end - snap < minItemDurationMs) {
					return { span, snapPoint: null };
				}
				return { span: { start: snap, end: span.end }, snapPoint: snap };
			}

			if (mode === "resize-right") {
				const snap = findNearest(span.end);
				if (snap === null || snap - span.start < minItemDurationMs) {
					return { span, snapPoint: null };
				}
				return { span: { start: span.start, end: snap }, snapPoint: snap };
			}

			// Drag: preserve duration; snap whichever edge is closer to a target.
			const startSnap = findNearest(span.start);
			const endSnap = findNearest(span.end);
			const startDelta = startSnap !== null ? Math.abs(startSnap - span.start) : Infinity;
			const endDelta = endSnap !== null ? Math.abs(endSnap - span.end) : Infinity;

			if (startDelta === Infinity && endDelta === Infinity) {
				return { span, snapPoint: null };
			}

			const duration = span.end - span.start;
			if (startDelta <= endDelta && startSnap !== null) {
				return {
					span: { start: startSnap, end: startSnap + duration },
					snapPoint: startSnap,
				};
			}
			if (endSnap !== null) {
				return {
					span: { start: endSnap - duration, end: endSnap },
					snapPoint: endSnap,
				};
			}
			return { span, snapPoint: null };
		},
		[
			allRegionSpans,
			softSnapSpans,
			currentTimeMs,
			keyframeTimesMs,
			minItemDurationMs,
			range.end,
			range.start,
			totalMs,
		],
	);

	// dnd-timeline's resize event doesn't expose direction. Compare the live
	// span to the committed one (committed spans only update on commit, so
	// during a single resize they still reflect the pre-resize state).
	// Returns null when the deltas are equal — including the common clamped
	// case where both are 0 — because we can't tell which handle the user
	// grabbed, and guessing wrong would snap the other edge.
	const inferResizeMode = useCallback(
		(activeItemId: string, span: Span): "resize-left" | "resize-right" | null => {
			const old =
				allRegionSpans.find((r) => r.id === activeItemId) ??
				softSnapSpans.find((r) => r.id === activeItemId);
			if (!old) return "resize-right";
			const startDelta = Math.abs(old.start - span.start);
			const endDelta = Math.abs(old.end - span.end);
			if (startDelta === endDelta) return null;
			return startDelta > endDelta ? "resize-left" : "resize-right";
		},
		[allRegionSpans, softSnapSpans],
	);

	const updateSnapGuide = useCallback(
		(snapPoint: number | null) => {
			if (snapPoint === null) {
				snapGuideRef.current?.hide();
				return;
			}
			// Hide the amber guide when it would coincide with the green playhead.
			if (currentTimeMs !== undefined && Math.abs(snapPoint - currentTimeMs) < 1) {
				snapGuideRef.current?.hide();
				return;
			}
			snapGuideRef.current?.showAt(snapPoint);
		},
		[currentTimeMs],
	);

	const onResizeEnd = useCallback(
		(event: ResizeEndEvent) => {
			const updatedSpan = event.active.data.current.getSpanFromResizeEvent?.(event);
			if (!updatedSpan) return;

			const activeItemId = event.active.id as string;
			let clampedSpan = clampSpanToBounds(updatedSpan);

			const mode = inferResizeMode(activeItemId, clampedSpan);
			if (mode !== null) {
				clampedSpan = snapSpanToTargets(clampedSpan, activeItemId, mode).span;
			}

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
			inferResizeMode,
			minItemDurationMs,
			onItemSpanChange,
			snapSpanToTargets,
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

			clampedSpan = snapSpanToTargets(clampedSpan, activeItemId, "drag").span;

			// Clamp to neighbour boundaries instead of rejecting
			if (hasOverlap(clampedSpan, activeItemId)) {
				clampedSpan = clampToNeighbours(clampedSpan, activeItemId);
				if (hasOverlap(clampedSpan, activeItemId)) {
					return;
				}
			}

			onItemSpanChange(activeItemId, clampedSpan);
		},
		[clampSpanToBounds, clampToNeighbours, hasOverlap, onItemSpanChange, snapSpanToTargets],
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
			const rawSpan = event.active.data.current.getSpanFromDragEvent?.(event);
			if (!rawSpan) return;
			const activeItemId = event.active.id as string;
			const clamped = totalMs > 0 ? clampSpanToBounds(rawSpan) : rawSpan;
			const { span, snapPoint } = snapSpanToTargets(clamped, activeItemId, "drag");
			updateSnapGuide(snapPoint);
			const screenX =
				event.activatorEvent && "clientX" in event.activatorEvent
					? (event.activatorEvent as PointerEvent).clientX + (event.delta?.x ?? 0)
					: undefined;
			showTooltip(span, screenX);
		},
		[clampSpanToBounds, showTooltip, snapSpanToTargets, totalMs, updateSnapGuide],
	);

	const onResizeMove = useCallback(
		(event: ResizeMoveEvent) => {
			const rawSpan = event.active.data.current.getSpanFromResizeEvent?.(event);
			if (!rawSpan) return;
			const activeItemId = event.active.id as string;
			const clamped = totalMs > 0 ? clampSpanToBounds(rawSpan) : rawSpan;
			const mode = inferResizeMode(activeItemId, clamped);
			const { span, snapPoint } =
				mode !== null
					? snapSpanToTargets(clamped, activeItemId, mode)
					: { span: clamped, snapPoint: null };
			updateSnapGuide(snapPoint);
			const screenX =
				event.activatorEvent && "clientX" in event.activatorEvent
					? (event.activatorEvent as PointerEvent).clientX + (event.delta?.x ?? 0)
					: undefined;
			showTooltip(span, screenX);
		},
		[clampSpanToBounds, inferResizeMode, showTooltip, snapSpanToTargets, totalMs, updateSnapGuide],
	);

	const hideTooltip = useCallback(() => showTooltip(null), [showTooltip]);

	const hideOverlays = useCallback(() => {
		hideTooltip();
		snapGuideRef.current?.hide();
	}, [hideTooltip]);

	const onResizeEndWithTooltip = useCallback(
		(event: ResizeEndEvent) => {
			hideOverlays();
			onResizeEnd(event);
		},
		[hideOverlays, onResizeEnd],
	);

	const onDragEndWithTooltip = useCallback(
		(event: DragEndEvent) => {
			hideOverlays();
			onDragEnd(event);
		},
		[hideOverlays, onDragEnd],
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
				<SnapGuide ref={snapGuideRef} />
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
