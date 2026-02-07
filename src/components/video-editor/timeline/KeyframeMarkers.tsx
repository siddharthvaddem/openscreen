import React, { useState, useEffect } from "react";
import { useTimelineContext } from "dnd-timeline";

interface Keyframe {
  id: string;
  time: number;
}

interface KeyframeMarkersProps {
  keyframes: Keyframe[];
  selectedKeyframeId: string | null;
  setSelectedKeyframeId: (id: string | null) => void;
  onKeyframeMove: (id: string, newTime: number) => void;
  videoDurationMs: number;
  timelineRef: React.RefObject<HTMLDivElement>;
}

const KeyframeMarkers: React.FC<KeyframeMarkersProps> = ({
  keyframes,
  selectedKeyframeId,
  setSelectedKeyframeId,
  onKeyframeMove,
  videoDurationMs,
  timelineRef
}) => {
  const { sidebarWidth, range, valueToPixels, pixelsToValue } = useTimelineContext();
  const [draggingKeyframeId, setDraggingKeyframeId] = useState<string | null>(null);

  useEffect(() => {
    if (!draggingKeyframeId) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left - sidebarWidth;
      const relativeMs = pixelsToValue(clickX);
      const absoluteMs = Math.max(0, Math.min(range.start + relativeMs, videoDurationMs));

      // Update the keyframe position in real-time
      onKeyframeMove(draggingKeyframeId, absoluteMs);
    };

    const handleMouseUp = () => {
      setDraggingKeyframeId(null);
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
  }, [draggingKeyframeId, onKeyframeMove, timelineRef, sidebarWidth, range.start, videoDurationMs, pixelsToValue]);

  return (
    <>
      {keyframes.map(kf => {
        const offset = valueToPixels(kf.time - range.start);
        const isSelected = kf.id === selectedKeyframeId;
        const isDragging = kf.id === draggingKeyframeId;

        return (
          <div
            key={kf.id}
            className={`absolute top-8 cursor-grab active:cursor-grabbing ${isSelected ? 'ring-2 ring-[#34B27B]' : ''}`}
            style={{
              left: `${sidebarWidth + offset - 8}px`,
              zIndex: isDragging ? 50 : 40,
              transition: isDragging ? 'none' : 'left 0.1s ease-out'
            }}
            onMouseDown={e => {
              e.stopPropagation();
              setSelectedKeyframeId(kf.id);
              setDraggingKeyframeId(kf.id);
            }}
            onContextMenu={e => {
              e.preventDefault();
              e.stopPropagation();
              setSelectedKeyframeId(kf.id);
            }}
            title={`Keyframe @ ${Math.round(kf.time)}ms (drag to move, Delete/Backspace to remove)`}
          >
            <div style={{
              width: '10px',
              height: '10px',
              background: '#ffe100ff',
              transform: 'rotate(45deg)',
              border: 'none',
              opacity: isSelected ? 1 : 0.6,
              transition: 'opacity 0.15s',
            }} />
          </div>
        );
      })}
    </>
  );
};

export default KeyframeMarkers;
