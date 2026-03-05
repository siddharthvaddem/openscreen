import { useMemo } from "react";
import { useItem } from "dnd-timeline";
import type { Span } from "dnd-timeline";
import { cn } from "@/lib/utils";
import { ZoomIn, Scissors, MessageSquare, Gauge } from "lucide-react";
import glassStyles from "./ItemGlass.module.css";

interface ItemProps {
  id: string;
  span: Span;
  rowId: string;
  children: React.ReactNode;
  isSelected?: boolean;
  onSelect?: () => void;
  zoomDepth?: number;
  speedValue?: number;
  variant?: 'zoom' | 'trim' | 'annotation' | 'speed';
}

// Map zoom depth to multiplier labels
const ZOOM_LABELS: Record<number, string> = {
  1: "1.25×",
  2: "1.5×",
  3: "1.8×",
  4: "2.2×",
  5: "3.5×",
  6: "5×",
};

function formatMs(ms: number): string {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}:${seconds.toFixed(1).padStart(4, '0')}`;
  }
  return `${seconds.toFixed(1)}s`;
}

export default function Item({
  id,
  span,
  rowId,
  isSelected = false,
  onSelect,
  zoomDepth = 1,
  speedValue,
  variant = 'zoom',
  children
}: ItemProps) {
  const { setNodeRef, attributes, listeners, itemStyle, itemContentStyle } = useItem({
    id,
    span,
    data: { rowId },
  });

  const isZoom = variant === 'zoom';
  const isTrim = variant === 'trim';
  const isSpeed = variant === 'speed';

  const glassClass = isZoom
    ? glassStyles.glassGreen
    : isTrim
    ? glassStyles.glassRed
    : isSpeed
    ? glassStyles.glassAmber
    : glassStyles.glassYellow;

  const endCapColor = isZoom
    ? '#21916A'
    : isTrim
    ? '#ef4444'
    : isSpeed
    ? '#d97706'
    : '#B4A046';

  const timeLabel = useMemo(
    () => `${formatMs(span.start)} – ${formatMs(span.end)}`,
    [span.start, span.end],
  );

  return (
    <div
      ref={setNodeRef}
      style={itemStyle}
      {...listeners}
      {...attributes}
      onPointerDownCapture={() => onSelect?.()}
      className="group"
    >
      <div style={{ ...itemContentStyle, minWidth: 24 }}>
        <div
          className={cn(
            glassClass,
            "w-full h-full overflow-hidden flex items-center justify-center gap-1.5 cursor-grab active:cursor-grabbing relative",
            isSelected && glassStyles.selected
          )}
          style={{ height: 40, color: '#fff', minWidth: 24 }}
          onClick={(event) => {
            event.stopPropagation();
            onSelect?.();
          }}
        >
          <div
            className={cn(glassStyles.zoomEndCap, glassStyles.left)}
            style={{ cursor: 'col-resize', pointerEvents: 'auto', width: 8, opacity: 0.9, background: endCapColor }}
            title="Resize left"
          />
          <div
            className={cn(glassStyles.zoomEndCap, glassStyles.right)}
            style={{ cursor: 'col-resize', pointerEvents: 'auto', width: 8, opacity: 0.9, background: endCapColor }}
            title="Resize right"
          />
          {/* Content */}
          <div className="relative z-10 flex flex-col items-center justify-center text-white/90 opacity-80 group-hover:opacity-100 transition-opacity select-none overflow-hidden">
            <div className="flex items-center gap-1.5">
              {isZoom ? (
                <>
                  <ZoomIn className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[11px] font-semibold tracking-tight whitespace-nowrap">
                    {ZOOM_LABELS[zoomDepth] || `${zoomDepth}×`}
                  </span>
                </>
              ) : isTrim ? (
                <>
                  <Scissors className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[11px] font-semibold tracking-tight whitespace-nowrap">
                    Trim
                  </span>
                </>
              ) : isSpeed ? (
                <>
                  <Gauge className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[11px] font-semibold tracking-tight whitespace-nowrap">
                    {speedValue !== undefined ? `${speedValue}×` : 'Speed'}
                  </span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[11px] font-semibold tracking-tight whitespace-nowrap">
                    {children}
                  </span>
                </>
              )}
            </div>
            <span
              className={`text-[9px] tabular-nums tracking-tight whitespace-nowrap transition-opacity ${
                isSelected ? 'opacity-60' : 'opacity-0 group-hover:opacity-40'
              }`}
            >
              {timeLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}