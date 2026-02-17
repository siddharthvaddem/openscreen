export type ZoomDepth = 1 | 2 | 3 | 4 | 5 | 6;

export interface ZoomFocus {
  cx: number; // normalized horizontal center (0-1)
  cy: number; // normalized vertical center (0-1)
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

export interface WebcamRegion {
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

// ============================================
// PRESET TYPES
// ============================================

// ============================================
// AUTO ZOOM SETTINGS
// ============================================

export interface AutoZoomSettings {
  enabled: boolean;
  defaultZoomDepth: ZoomDepth;  // default: 1
  zoomDurationMs: number;       // default: 1000
  mergeThresholdMs: number;     // default: 500
}

export const DEFAULT_AUTO_ZOOM_SETTINGS: AutoZoomSettings = {
  enabled: false,
  defaultZoomDepth: 2,  // 1.5x zoom (ZoomDepth 2 = 1.5x scale)
  zoomDurationMs: 1000,
  mergeThresholdMs: 500,
};

export interface PresetSettings {
  padding: number;           // 0-100
  shadowIntensity: number;   // 0-1
  borderRadius: number;      // 0-16
  motionBlurEnabled: boolean;
  showBlur: boolean;
  wallpaper: string;         // Image path, color hex, or gradient CSS
  autoZoom?: AutoZoomSettings; // Auto zoom settings (optional for backward compatibility)
}

export interface Preset {
  id: string;              // Unique identifier (uuid)
  name: string;            // User-defined name
  createdAt: number;       // Timestamp for sorting
  isDefault: boolean;      // Only one preset can be default
  settings: PresetSettings;
}

export interface PresetStore {
  version: number;
  defaultPresetId: string | null;
  presets: Preset[];
}

export const DEFAULT_PRESET_SETTINGS: PresetSettings = {
  padding: 50,
  shadowIntensity: 0,
  borderRadius: 0,
  motionBlurEnabled: true,
  showBlur: false,
  wallpaper: 'wallpapers/wallpaper1.jpg',
  autoZoom: DEFAULT_AUTO_ZOOM_SETTINGS,
};

export function clampFocusToDepth(focus: ZoomFocus, depth: ZoomDepth): ZoomFocus {
  void depth;
  return {
    cx: clamp(focus.cx, 0, 1),
    cy: clamp(focus.cy, 0, 1),
  };
}

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return (min + max) / 2;
  return Math.min(max, Math.max(min, value));
}

// ============================================
// SUBTITLE TYPES
// ============================================

export type SubtitleLanguage = 
  | 'auto' 
  | 'en' | 'id' | 'zh' | 'ja' | 'ko' | 'es' | 'pt' | 'vi' | 'th';

export type SubtitlePositionPreset = 
  | 'bottom-center' 
  | 'top-center' 
  | 'middle-center' 
  | 'custom';

export interface SubtitleStyle {
  color: string;
  backgroundColor: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  textAlign: 'left' | 'center' | 'right';
  strokeColor: string;
  strokeWidth: number;
}

export interface SubtitleWord {
  text: string;
  startMs: number;
  endMs: number;
  confidence: number;
}

export interface SubtitleRegion {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
  words: SubtitleWord[];
  positionPreset: SubtitlePositionPreset;
  customPosition?: { x: number; y: number };
  style: SubtitleStyle;
}

export interface SubtitleGenerationConfig {
  language: SubtitleLanguage;
  maxWordsPerLine: number;
  defaultStyle: SubtitleStyle;
  defaultPosition: SubtitlePositionPreset;
}

export const DEFAULT_SUBTITLE_STYLE: SubtitleStyle = {
  color: '#FFFFFF',
  backgroundColor: '#000000CC',
  fontSize: 32,
  fontFamily: 'Inter',
  fontWeight: 'bold',
  textAlign: 'center',
  strokeColor: '#000000',
  strokeWidth: 0,
};

export const DEFAULT_SUBTITLE_CONFIG: SubtitleGenerationConfig = {
  language: 'auto',
  maxWordsPerLine: 4,
  defaultStyle: DEFAULT_SUBTITLE_STYLE,
  defaultPosition: 'bottom-center',
};

export const DEFAULT_SUBTITLE_POSITION = {
  x: 50,
  y: 85, // Near bottom
};

export const SUBTITLE_LANGUAGES: { code: SubtitleLanguage; label: string }[] = [
  { code: 'auto', label: 'Auto-detect' },
  { code: 'en', label: 'English' },
  { code: 'id', label: 'Indonesian' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'es', label: 'Spanish' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'vi', label: 'Vietnamese' },
  { code: 'th', label: 'Thai' },
];

// ============================================
// KEYSTROKE OVERLAY TYPES
// ============================================

export type KeystrokePositionPreset = 
  | 'bottom-center' 
  | 'bottom-left' 
  | 'bottom-right' 
  | 'top-center'
  | 'top-left'
  | 'top-right';

export type AnimationPreset = 
  | 'fade' 
  | 'slide-up' 
  | 'slide-down' 
  | 'scale' 
  | 'none';

export interface KeystrokeStyle {
  textColor: string;
  backgroundColor: string;
  modifierColor: string;        // separate color for modifier keys
  textScale: number;            // 0.5 - 2.0
  borderRadius: number;         // 0 - 16px
  fadeDurationMs: number;       // animation duration
  lingerDurationMs: number;     // how long to display before fade
  animationIn: AnimationPreset;
  animationOut: AnimationPreset;
  showOnlyHotkeys: boolean;     // filter to show only shortcuts
}

export interface KeystrokeRegion {
  id: string;
  startMs: number;
  endMs: number;
  text: string;                 // formatted keystroke text
  eventType: 'keystroke' | 'mouse';
  positionPreset: KeystrokePositionPreset;
  style: KeystrokeStyle;
}

export const DEFAULT_KEYSTROKE_STYLE: KeystrokeStyle = {
  textColor: '#FFFFFF',
  backgroundColor: '#000000CC',
  modifierColor: '#34B27B',
  textScale: 1.0,
  borderRadius: 8,
  fadeDurationMs: 300,
  lingerDurationMs: 1500,
  animationIn: 'fade',
  animationOut: 'fade',
  showOnlyHotkeys: false,
};

export const DEFAULT_KEYSTROKE_POSITION: KeystrokePositionPreset = 'bottom-center';

// ============================================
// WEBCAM OVERLAY TYPES
// ============================================

export type WebcamPositionPreset = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'custom';

export type WebcamShape = 'circle' | 'square' | 'rounded';

export type WebcamAspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

export interface WebcamOverlaySettings {
  position: WebcamPositionPreset;
  customPosition?: { x: number; y: number }; // Normalized 0-1
  shape: WebcamShape;
  aspectRatio: WebcamAspectRatio;
  shadowIntensity: number; // 0-100
  sizePercent: number; // 10-40
}

export const DEFAULT_WEBCAM_OVERLAY_SETTINGS: WebcamOverlaySettings = {
  position: 'bottom-right',
  shape: 'rounded',
  aspectRatio: '16:9',
  shadowIntensity: 50,
  sizePercent: 20,
};
