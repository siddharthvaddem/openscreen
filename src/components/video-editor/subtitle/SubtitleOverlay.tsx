import { useRef } from "react";
import { Rnd } from "react-rnd";
import type { SubtitleRegion, SubtitlePositionPreset } from "../types";
import { cn } from "@/lib/utils";

interface SubtitleOverlayProps {
  subtitle: SubtitleRegion;
  isSelected: boolean;
  containerWidth: number;
  containerHeight: number;
  onPositionChange: (id: string, position: SubtitlePositionPreset, customPosition?: { x: number; y: number }) => void;
  onClick: (id: string) => void;
}

// Calculate position based on preset
function getPositionFromPreset(
  preset: SubtitlePositionPreset,
  customPosition: { x: number; y: number } | undefined,
  containerWidth: number,
  containerHeight: number,
  textWidth: number,
): { x: number; y: number } {
  const padding = 40; // Padding from edges
  
  switch (preset) {
    case 'bottom-center':
      return { 
        x: (containerWidth - textWidth) / 2, 
        y: containerHeight - padding - 50 
      };
    case 'top-center':
      return { 
        x: (containerWidth - textWidth) / 2, 
        y: padding 
      };
    case 'middle-center':
      return { 
        x: (containerWidth - textWidth) / 2, 
        y: containerHeight / 2 - 25 
      };
    case 'custom':
      if (customPosition) {
        return {
          x: (customPosition.x / 100) * containerWidth,
          y: (customPosition.y / 100) * containerHeight,
        };
      }
      return { x: containerWidth / 2, y: containerHeight - padding - 50 };
    default:
      return { x: containerWidth / 2, y: containerHeight - padding - 50 };
  }
}

export function SubtitleOverlay({
  subtitle,
  isSelected,
  containerWidth,
  containerHeight,
  onPositionChange,
  onClick,
}: SubtitleOverlayProps) {
  const isDraggingRef = useRef(false);
  const textRef = useRef<HTMLDivElement>(null);
  
  // Estimate text width (will be refined by actual measurement)
  const estimatedTextWidth = Math.min(containerWidth * 0.8, subtitle.text.length * (subtitle.style.fontSize * 0.6));
  
  const position = getPositionFromPreset(
    subtitle.positionPreset,
    subtitle.customPosition,
    containerWidth,
    containerHeight,
    estimatedTextWidth
  );

  const renderContent = () => {
    const { style } = subtitle;
    
    return (
      <div
        ref={textRef}
        className="inline-block px-3 py-2 rounded-lg whitespace-nowrap"
        style={{
          color: style.color,
          backgroundColor: style.backgroundColor,
          fontSize: `${style.fontSize}px`,
          fontFamily: style.fontFamily,
          fontWeight: style.fontWeight,
          textAlign: style.textAlign,
          WebkitTextStroke: style.strokeWidth > 0 ? `${style.strokeWidth}px ${style.strokeColor}` : undefined,
          paintOrder: 'stroke fill',
        }}
      >
        {subtitle.text || 'Subtitle text...'}
      </div>
    );
  };

  // Only enable drag for custom position or when selected
  const enableDrag = isSelected && subtitle.positionPreset === 'custom';

  return (
    <Rnd
      position={{ x: position.x, y: position.y }}
      size={{ width: 'auto', height: 'auto' }}
      enableResizing={false}
      disableDragging={!enableDrag}
      onDragStart={() => {
        isDraggingRef.current = true;
      }}
      onDragStop={(_e, d) => {
        const xPercent = (d.x / containerWidth) * 100;
        const yPercent = (d.y / containerHeight) * 100;
        onPositionChange(subtitle.id, 'custom', { x: xPercent, y: yPercent });
        
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 100);
      }}
      onClick={() => {
        if (isDraggingRef.current) return;
        onClick(subtitle.id);
      }}
      bounds="parent"
      className={cn(
        "cursor-pointer transition-all",
        isSelected && "ring-2 ring-[#34B27B] ring-offset-2 ring-offset-transparent"
      )}
      style={{
        zIndex: isSelected ? 1000 : 100,
        pointerEvents: isSelected ? 'auto' : 'none',
      }}
    >
      {renderContent()}
    </Rnd>
  );
}
