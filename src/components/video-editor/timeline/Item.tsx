import { useItem } from "dnd-timeline";
import type { Span } from "dnd-timeline";
import { cn } from "@/lib/utils";
import { ZoomIn, Scissors, MessageSquare, Subtitles } from "lucide-react";
import glassStyles from "./ItemGlass.module.css";

interface ItemProps {
  id: string;
  span: Span;
  rowId: string;
  children: React.ReactNode;
  isSelected?: boolean;
  onSelect?: () => void;
  zoomDepth?: number;
  variant?: 'zoom' | 'trim' | 'annotation' | 'subtitle';
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

export default function Item({ 
  id, 
  span, 
  rowId, 
  isSelected = false, 
  onSelect, 
  zoomDepth = 1,
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
  const isSubtitle = variant === 'subtitle';
  
  const glassClass = isZoom 
    ? glassStyles.glassGreen 
    : isTrim 
    ? glassStyles.glassRed 
    : isSubtitle
    ? glassStyles.glassCyan
    : glassStyles.glassYellow;
    
  const endCapColor = isZoom 
    ? '#21916A' 
    : isTrim 
    ? '#ef4444' 
    : isSubtitle
    ? '#00BCD4'
    : '#B4A046';

  return (
    <div
      ref={setNodeRef}
      style={itemStyle}
      {...listeners}
      {...attributes}
      onPointerDownCapture={() => onSelect?.()}
      className="group"
    >
      <div style={itemContentStyle}>
        <div
          className={cn(
            glassClass,
            "w-full h-full overflow-hidden flex items-center justify-center gap-1.5 cursor-grab active:cursor-grabbing relative",
            isSelected && glassStyles.selected
          )}
          style={{ height: 40, color: '#fff' }}
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
          <div className="relative z-10 flex items-center gap-1.5 text-white/90 opacity-80 group-hover:opacity-100 transition-opacity select-none">
            {isZoom ? (
              <>
                <ZoomIn className="w-3.5 h-3.5" />
                <span className="text-[11px] font-semibold tracking-tight">
                  {ZOOM_LABELS[zoomDepth] || `${zoomDepth}×`}
                </span>
              </>
            ) : isTrim ? (
              <>
                <Scissors className="w-3.5 h-3.5" />
                <span className="text-[11px] font-semibold tracking-tight">
                  Trim
                </span>
              </>
            ) : isSubtitle ? (
              <>
                <Subtitles className="w-3.5 h-3.5" />
                <span className="text-[11px] font-semibold tracking-tight">
                  {children}
                </span>
              </>
            ) : (
              <>
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="text-[11px] font-semibold tracking-tight">
                  {children}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}