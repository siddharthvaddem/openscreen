export type ZoomDepth = 1 | 2 | 3 | 4 | 5 | 6;

export interface ZoomFocus {
  cx: number; // normalized horizontal center (0-1)
  cy: number; // normalized vertical center (0-1)
}

export type ZoomFollowMode = 'center' | 'anchor';

export interface ZoomFollowSettings {
  enabled: boolean;
  mode: ZoomFollowMode;
  /** Delay for following in milliseconds (only used for 'center' mode smoothing) */
  delayMs?: number;
  /** Minimum padding (in pixels) from cursor to camera edge for 'anchor' mode */
  minPaddingPx?: number;
}

export interface ZoomRegion {
  id: string;
  startMs: number;
  endMs: number;
  depth: ZoomDepth;
  focus: ZoomFocus;
}

export interface TrimRegion {
  id: string;
  startMs: number;
  endMs: number;
}

export type AnnotationType = 'text' | 'image' | 'figure';

export type ArrowDirection = 'up' | 'down' | 'left' | 'right' | 'up-right' | 'up-left' | 'down-right' | 'down-left';

export interface FigureData {
  arrowDirection: ArrowDirection;
  color: string;
  strokeWidth: number;
}

export interface AnnotationPosition {
  x: number;
  y: number;
}

export interface AnnotationSize {
  width: number;
  height: number;
}

export interface AnnotationTextStyle {
  color: string;
  backgroundColor: string;
  fontSize: number; // pixels
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  textAlign: 'left' | 'center' | 'right';
}

export interface AnnotationRegion {
  id: string;
  startMs: number;
  endMs: number;
  type: AnnotationType;
  content: string; // Legacy - still used for current type
  textContent?: string; // Separate storage for text
  imageContent?: string; // Separate storage for image data URL
  position: AnnotationPosition;
  size: AnnotationSize;
  style: AnnotationTextStyle;
  zIndex: number;
  figureData?: FigureData;
}

export const DEFAULT_ANNOTATION_POSITION: AnnotationPosition = {
  x: 50,
  y: 50,
};

export const DEFAULT_ANNOTATION_SIZE: AnnotationSize = {
  width: 30,
  height: 20,
};

export const DEFAULT_ANNOTATION_STYLE: AnnotationTextStyle = {
  color: '#ffffff',
  backgroundColor: 'transparent',
  fontSize: 32,
  fontFamily: 'Inter',
  fontWeight: 'bold',
  fontStyle: 'normal',
  textDecoration: 'none',
  textAlign: 'center',
};

export const DEFAULT_FIGURE_DATA: FigureData = {
  arrowDirection: 'right',
  color: '#34B27B',
  strokeWidth: 4,
};

export type CursorPreset = 'arrow' | 'dot' | 'circle';

export interface CursorEvent {
  tMs: number;
  nx: number;
  ny: number;
  kind: 'move' | 'down' | 'up';
  dragging: boolean;
  button?: number;
}

export interface CursorStyle {
  preset: CursorPreset;
  sizePx: number;
  offsetMs?: number;
  offsetX?: number;
  offsetY?: number;
}

export type CursorSmoothing = 'none' | 'quadratic' | 'end2end';

export interface End2EndParams {
  // How long the mouse must remain approximately still to count as a drop (ms)
  dwellTimeMs: number;
  // Allowed movement (in pixels) while 'still' before we consider it jitter
  stillEpsilonPx: number;
  // Minimum pixel distance between two generated endpoints
  minJumpDistancePx: number;
  // Minimum time between two generated endpoints (ms)
  minTimeBetweenEndpointsMs: number;
  // Fraction of the segment duration used to transit between pause points.
  // Remaining time is spent waiting at the destination pause point.
  // Range: 0.2 - 1.0 (1.0 = no waiting, full duration used to move)
  arrivalFraction?: number;
}

export interface CursorTrack {
  events: CursorEvent[];
  style: CursorStyle;
}

export const DEFAULT_CURSOR_STYLE: CursorStyle = {
  preset: 'arrow',
  sizePx: 18,
  offsetMs: 160,
  offsetX: 3,
  offsetY: 5,
};



export interface CropRegion {
  x: number; 
  y: number; 
  width: number; 
  height: number; 
}

export const DEFAULT_CROP_REGION: CropRegion = {
  x: 0,
  y: 0,
  width: 1,
  height: 1,
};

export const ZOOM_DEPTH_SCALES: Record<ZoomDepth, number> = {
  1: 1.25,
  2: 1.5,
  3: 1.8,
  4: 2.2,
  5: 3.5,
  6: 5.0,
};

export const DEFAULT_ZOOM_DEPTH: ZoomDepth = 3;

export function clampFocusToDepth(focus: ZoomFocus, _depth: ZoomDepth): ZoomFocus {
  return {
    cx: clamp(focus.cx, 0, 1),
    cy: clamp(focus.cy, 0, 1),
  };
}

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return (min + max) / 2;
  return Math.min(max, Math.max(min, value));
}
