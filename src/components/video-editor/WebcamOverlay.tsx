import React, { useEffect, useRef } from 'react';
import { Rnd } from 'react-rnd';
import { type WebcamOverlaySettings, type WebcamPositionPreset } from './types';
import { getWebcamDimensions, getWebcamPosition } from './webcam/webcamLayout';

interface WebcamOverlayProps {
  webcamPath: string;
  containerWidth: number;
  containerHeight: number;
  currentTimeMs: number;
  isPlaying: boolean;
  settings: WebcamOverlaySettings;
  onSettingsChange?: (settings: WebcamOverlaySettings) => void;
  onPositionChange?: (position: WebcamPositionPreset, customPosition?: { x: number; y: number }) => void;
}

export const WebcamOverlay: React.FC<WebcamOverlayProps> = ({
  webcamPath,
  containerWidth,
  containerHeight,
  currentTimeMs,
  isPlaying,
  settings,
  onPositionChange,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isDraggingRef = useRef(false);

  const { width, height } = getWebcamDimensions(containerWidth, settings);
  const position = getWebcamPosition(containerWidth, containerHeight, width, height, settings);

  // Sync video playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play().catch(() => {
        // Ignore play errors (e.g. if user interaction is needed)
      });
    } else {
      video.pause();
    }
  }, [isPlaying]);

  // Sync time
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Only sync if drift is significant (>100ms) to avoid stutter
    const drift = Math.abs(video.currentTime * 1000 - currentTimeMs);
    if (drift > 100) {
      video.currentTime = currentTimeMs / 1000;
    }
  }, [currentTimeMs]);

  // Handle styles based on shape and shadow
  const getShapeStyle = () => {
    const baseStyle: React.CSSProperties = {
      overflow: 'hidden',
      width: '100%',
      height: '100%',
      backgroundColor: '#000', // Black background for video
      transform: 'translateZ(0)', // Force GPU acceleration
      border: '2px solid rgba(255, 255, 255, 0.2)',
    };

    switch (settings.shape) {
      case 'circle':
        return { ...baseStyle, borderRadius: '50%' };
      case 'square':
        return { ...baseStyle, borderRadius: '0px' };
      case 'rounded':
      default:
        return { ...baseStyle, borderRadius: '16px' };
    }
  };

  const shadowOpacity = (settings.shadowIntensity / 100) * 0.8;
  const boxShadow = `0 4px 20px rgba(0, 0, 0, ${shadowOpacity})`;

  return (
    <Rnd
      data-testid="webcam-overlay"
      size={{ width, height }}
      position={{ x: position.x, y: position.y }}
      onDragStart={() => {
        isDraggingRef.current = true;
      }}
      onDragStop={(_e, d) => {
        isDraggingRef.current = false;
        if (onPositionChange) {
          // Calculate normalized position
          const normalizedX = d.x / containerWidth;
          const normalizedY = d.y / containerHeight;
          onPositionChange('custom', { x: normalizedX, y: normalizedY });
        }
      }}
      enableResizing={false}
      bounds="parent"
      style={{
        zIndex: 20, // Above canvas, below annotations
        cursor: 'move',
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          ...getShapeStyle(),
          boxShadow,
        }}
      >
        <video
          ref={videoRef}
          src={webcamPath}
          muted
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)', // Mirror effect
          }}
        />
      </div>
    </Rnd>
  );
};
