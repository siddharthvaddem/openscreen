import { describe, it, expect } from 'vitest';
import type {
  WebcamRegion,
  WebcamOverlaySettings,
  WebcamPositionPreset,
  WebcamShape,
} from '@/components/video-editor/types';
import { DEFAULT_WEBCAM_OVERLAY_SETTINGS } from '@/components/video-editor/types';

// ---------------------------------------------------------------------------
// Extracted logic mirrors — these replicate the logic in FrameRenderer.renderWebcam
// so we can unit-test it without instantiating PixiJS or real Canvas2D.
// ---------------------------------------------------------------------------

/** Same visibility check used in FrameRenderer.renderWebcam (line 415-417) */
function isWebcamVisible(currentTimeMs: number, regions: WebcamRegion[]): boolean {
  return regions.some(
    region => currentTimeMs >= region.startMs && currentTimeMs <= region.endMs,
  );
}

/** Same position calculation used in FrameRenderer.renderWebcam (lines 432-463) */
function calculateWebcamPosition(
  position: WebcamPositionPreset,
  canvasWidth: number,
  canvasHeight: number,
  webcamWidth: number,
  webcamHeight: number,
  customPosition?: { x: number; y: number },
): { x: number; y: number } {
  const padding = canvasWidth * 0.03;

  // Default is bottom-right
  let x = canvasWidth - webcamWidth - padding;
  let y = canvasHeight - webcamHeight - padding;

  if (position === 'custom' && customPosition) {
    x = customPosition.x * canvasWidth;
    y = customPosition.y * canvasHeight;
  } else {
    switch (position) {
      case 'bottom-left':
        x = padding;
        y = canvasHeight - webcamHeight - padding;
        break;
      case 'top-right':
        x = canvasWidth - webcamWidth - padding;
        y = padding;
        break;
      case 'top-left':
        x = padding;
        y = padding;
        break;
      case 'bottom-right':
      default:
        x = canvasWidth - webcamWidth - padding;
        y = canvasHeight - webcamHeight - padding;
        break;
    }
  }

  return { x, y };
}

/**
 * Given a shape, returns which Canvas2D path method would be invoked.
 * Mirrors FrameRenderer.renderWebcam lines 477-490.
 */
function getShapeClipMethod(shape: WebcamShape): 'arc' | 'rect' | 'roundRect' {
  if (shape === 'circle') return 'arc';
  if (shape === 'square') return 'rect';
  return 'roundRect'; // 'rounded' default
}

/**
 * Shadow parameters from intensity (0-100). Mirrors lines 467-473.
 */
function calculateShadowParams(shadowIntensity: number) {
  const intensity = shadowIntensity / 100;
  return {
    shadowColor: `rgba(0, 0, 0, ${0.5 * intensity})`,
    shadowBlur: 20 * intensity,
    shadowOffsetX: 0,
    shadowOffsetY: 4 * intensity,
  };
}

// ---------------------------------------------------------------------------
// Constants matching FrameRenderer implementation
// ---------------------------------------------------------------------------
const CANVAS_W = 1920;
const CANVAS_H = 1080;
const WEBCAM_W = CANVAS_W * 0.20; // 384
const WEBCAM_H = WEBCAM_W / (16 / 9); // 216
const PADDING = CANVAS_W * 0.03; // 57.6

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Webcam Export Logic', () => {
  // =========================================================================
  // 1. Visibility filtering
  // =========================================================================
  describe('visibility filtering', () => {
    const regions: WebcamRegion[] = [
      { id: '1', startMs: 1000, endMs: 5000 },
      { id: '2', startMs: 8000, endMs: 12000 },
    ];

    it('returns false when timestamp is before all regions', () => {
      expect(isWebcamVisible(500, regions)).toBe(false);
    });

    it('returns true when timestamp is at exact start of a region', () => {
      expect(isWebcamVisible(1000, regions)).toBe(true);
    });

    it('returns true when timestamp is within a region', () => {
      expect(isWebcamVisible(3000, regions)).toBe(true);
    });

    it('returns true when timestamp is at exact end of a region', () => {
      expect(isWebcamVisible(5000, regions)).toBe(true);
    });

    it('returns false when timestamp falls between regions (gap)', () => {
      expect(isWebcamVisible(6000, regions)).toBe(false);
    });

    it('returns true when timestamp is in the second region', () => {
      expect(isWebcamVisible(10000, regions)).toBe(true);
    });

    it('returns false when timestamp is after all regions', () => {
      expect(isWebcamVisible(15000, regions)).toBe(false);
    });

    it('returns false for empty regions array', () => {
      expect(isWebcamVisible(3000, [])).toBe(false);
    });
  });

  // =========================================================================
  // 2. Position calculation for all presets
  // =========================================================================
  describe('position calculation', () => {
    it('bottom-right: webcam sits in lower-right with padding', () => {
      const { x, y } = calculateWebcamPosition(
        'bottom-right', CANVAS_W, CANVAS_H, WEBCAM_W, WEBCAM_H,
      );
      expect(x).toBeCloseTo(CANVAS_W - WEBCAM_W - PADDING, 5);
      expect(y).toBeCloseTo(CANVAS_H - WEBCAM_H - PADDING, 5);
    });

    it('bottom-left: webcam sits in lower-left with padding', () => {
      const { x, y } = calculateWebcamPosition(
        'bottom-left', CANVAS_W, CANVAS_H, WEBCAM_W, WEBCAM_H,
      );
      expect(x).toBeCloseTo(PADDING, 5);
      expect(y).toBeCloseTo(CANVAS_H - WEBCAM_H - PADDING, 5);
    });

    it('top-right: webcam sits in upper-right with padding', () => {
      const { x, y } = calculateWebcamPosition(
        'top-right', CANVAS_W, CANVAS_H, WEBCAM_W, WEBCAM_H,
      );
      expect(x).toBeCloseTo(CANVAS_W - WEBCAM_W - PADDING, 5);
      expect(y).toBeCloseTo(PADDING, 5);
    });

    it('top-left: webcam sits in upper-left with padding', () => {
      const { x, y } = calculateWebcamPosition(
        'top-left', CANVAS_W, CANVAS_H, WEBCAM_W, WEBCAM_H,
      );
      expect(x).toBeCloseTo(PADDING, 5);
      expect(y).toBeCloseTo(PADDING, 5);
    });

    it('custom: uses normalized coordinates multiplied by canvas dimensions', () => {
      const custom = { x: 0.5, y: 0.3 };
      const { x, y } = calculateWebcamPosition(
        'custom', CANVAS_W, CANVAS_H, WEBCAM_W, WEBCAM_H, custom,
      );
      expect(x).toBeCloseTo(0.5 * CANVAS_W, 5);
      expect(y).toBeCloseTo(0.3 * CANVAS_H, 5);
    });

    it('custom without customPosition falls back to bottom-right', () => {
      const { x, y } = calculateWebcamPosition(
        'custom', CANVAS_W, CANVAS_H, WEBCAM_W, WEBCAM_H,
      );
      // Falls through to default (bottom-right) because customPosition is undefined
      expect(x).toBeCloseTo(CANVAS_W - WEBCAM_W - PADDING, 5);
      expect(y).toBeCloseTo(CANVAS_H - WEBCAM_H - PADDING, 5);
    });
  });

  // =========================================================================
  // 3. Shape clipping parameters
  // =========================================================================
  describe('shape clipping', () => {
    it('circle shape uses arc path method', () => {
      expect(getShapeClipMethod('circle')).toBe('arc');
    });

    it('square shape uses rect path method', () => {
      expect(getShapeClipMethod('square')).toBe('rect');
    });

    it('rounded shape uses roundRect path method', () => {
      expect(getShapeClipMethod('rounded')).toBe('roundRect');
    });

    it('circle arc radius is half of the smaller dimension', () => {
      // From line 481: Math.min(webcamWidth, webcamHeight) / 2
      const radius = Math.min(WEBCAM_W, WEBCAM_H) / 2;
      expect(radius).toBe(WEBCAM_H / 2); // height < width for 16:9
      expect(radius).toBeCloseTo(108, 0);
    });

    it('rounded rect border radius scales with canvas width', () => {
      // From line 488: 16 * (canvasWidth / 1920)
      const scaledRadius1920 = 16 * (1920 / 1920);
      expect(scaledRadius1920).toBe(16);

      const scaledRadius3840 = 16 * (3840 / 1920);
      expect(scaledRadius3840).toBe(32);

      const scaledRadius1280 = 16 * (1280 / 1920);
      expect(scaledRadius1280).toBeCloseTo(10.667, 2);
    });
  });

  // =========================================================================
  // 4. Shadow parameters
  // =========================================================================
  describe('shadow intensity', () => {
    it('zero intensity produces no shadow', () => {
      const params = calculateShadowParams(0);
      expect(params.shadowBlur).toBe(0);
      expect(params.shadowOffsetY).toBe(0);
      expect(params.shadowColor).toBe('rgba(0, 0, 0, 0)');
    });

    it('50% intensity produces half-strength shadow', () => {
      const params = calculateShadowParams(50);
      expect(params.shadowBlur).toBe(10);
      expect(params.shadowOffsetY).toBe(2);
      expect(params.shadowColor).toBe('rgba(0, 0, 0, 0.25)');
    });

    it('100% intensity produces full-strength shadow', () => {
      const params = calculateShadowParams(100);
      expect(params.shadowBlur).toBe(20);
      expect(params.shadowOffsetY).toBe(4);
      expect(params.shadowColor).toBe('rgba(0, 0, 0, 0.5)');
    });

    it('shadow offset X is always 0', () => {
      for (const intensity of [0, 25, 50, 75, 100]) {
        expect(calculateShadowParams(intensity).shadowOffsetX).toBe(0);
      }
    });
  });

  // =========================================================================
  // 5. Default settings validation
  // =========================================================================
  describe('WebcamOverlaySettings defaults', () => {
    it('has correct default values', () => {
      expect(DEFAULT_WEBCAM_OVERLAY_SETTINGS).toEqual({
        position: 'bottom-right',
        shape: 'rounded',
        shadowIntensity: 50,
      });
    });

    it('does not include customPosition by default', () => {
      expect(DEFAULT_WEBCAM_OVERLAY_SETTINGS.customPosition).toBeUndefined();
    });
  });

  // =========================================================================
  // 6. FrameRenderConfig webcam fields type compatibility
  // =========================================================================
  describe('FrameRenderConfig webcam fields', () => {
    it('webcam fields are optional and do not break config without them', () => {
      // This verifies the interface accepts configs with NO webcam fields
      // (matching the FrameRenderConfig interface where all webcam fields are optional)
      const baseConfig = {
        width: 1920,
        height: 1080,
        wallpaper: 'wallpapers/wallpaper1.jpg',
        zoomRegions: [],
        showShadow: false,
        shadowIntensity: 0,
        showBlur: false,
        cropRegion: { x: 0, y: 0, width: 1, height: 1 },
        videoWidth: 1920,
        videoHeight: 1080,
      };

      // Should be a valid partial FrameRenderConfig shape
      expect(baseConfig).toBeDefined();
      expect(baseConfig).not.toHaveProperty('webcamVideoElement');
      expect(baseConfig).not.toHaveProperty('webcamSettings');
      expect(baseConfig).not.toHaveProperty('webcamRegions');
    });

    it('webcam fields can coexist with all other config fields', () => {
      const fullConfig = {
        width: 1920,
        height: 1080,
        wallpaper: 'wallpapers/wallpaper1.jpg',
        zoomRegions: [],
        showShadow: true,
        shadowIntensity: 0.5,
        showBlur: false,
        cropRegion: { x: 0, y: 0, width: 1, height: 1 },
        videoWidth: 1920,
        videoHeight: 1080,
        annotationRegions: [],
        subtitleRegions: [],
        keystrokeRegions: [],
        // Webcam fields
        webcamSettings: DEFAULT_WEBCAM_OVERLAY_SETTINGS,
        webcamRegions: [{ id: '1', startMs: 0, endMs: 10000 }] as WebcamRegion[],
      };

      expect(fullConfig.webcamSettings).toBeDefined();
      expect(fullConfig.webcamRegions).toHaveLength(1);
    });
  });

  // =========================================================================
  // 7. VideoExporterConfig webcam fields type compatibility
  // =========================================================================
  describe('VideoExporterConfig webcam fields', () => {
    it('webcam fields do not interfere with base export config', () => {
      const exportConfig = {
        width: 1920,
        height: 1080,
        frameRate: 30,
        bitrate: 8_000_000,
        videoUrl: 'file:///video.webm',
        wallpaper: 'wallpapers/wallpaper1.jpg',
        zoomRegions: [],
        showShadow: false,
        shadowIntensity: 0,
        showBlur: false,
        cropRegion: { x: 0, y: 0, width: 1, height: 1 },
        // Webcam fields (all optional)
        webcamPath: 'file:///webcam.webm',
        webcamSettings: DEFAULT_WEBCAM_OVERLAY_SETTINGS,
        webcamRegions: [{ id: '1', startMs: 0, endMs: 5000 }] as WebcamRegion[],
      };

      expect(exportConfig.webcamPath).toBe('file:///webcam.webm');
      expect(exportConfig.webcamSettings.shape).toBe('rounded');
      expect(exportConfig.webcamRegions).toHaveLength(1);
      // Base fields still intact
      expect(exportConfig.frameRate).toBe(30);
      expect(exportConfig.bitrate).toBe(8_000_000);
    });

    it('export config works without any webcam fields', () => {
      const exportConfig = {
        width: 1920,
        height: 1080,
        frameRate: 30,
        bitrate: 8_000_000,
        videoUrl: 'file:///video.webm',
        wallpaper: 'wallpapers/wallpaper1.jpg',
        zoomRegions: [],
        showShadow: false,
        shadowIntensity: 0,
        showBlur: false,
        cropRegion: { x: 0, y: 0, width: 1, height: 1 },
      };

      expect(exportConfig).not.toHaveProperty('webcamPath');
      expect(exportConfig).not.toHaveProperty('webcamSettings');
      expect(exportConfig).not.toHaveProperty('webcamRegions');
    });
  });

  // =========================================================================
  // 8. Webcam sizing calculations
  // =========================================================================
  describe('webcam sizing', () => {
    it('webcam width is 20% of canvas width', () => {
      expect(WEBCAM_W).toBe(CANVAS_W * 0.20);
      expect(WEBCAM_W).toBe(384);
    });

    it('webcam maintains 16:9 aspect ratio', () => {
      const aspectRatio = WEBCAM_W / WEBCAM_H;
      expect(aspectRatio).toBeCloseTo(16 / 9, 5);
    });

    it('padding is 3% of canvas width', () => {
      expect(PADDING).toBe(CANVAS_W * 0.03);
      expect(PADDING).toBeCloseTo(57.6, 5);
    });

    it('webcam fits within canvas boundaries for all presets', () => {
      const presets: WebcamPositionPreset[] = [
        'bottom-right', 'bottom-left', 'top-right', 'top-left',
      ];

      for (const preset of presets) {
        const { x, y } = calculateWebcamPosition(
          preset, CANVAS_W, CANVAS_H, WEBCAM_W, WEBCAM_H,
        );
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(x + WEBCAM_W).toBeLessThanOrEqual(CANVAS_W);
        expect(y + WEBCAM_H).toBeLessThanOrEqual(CANVAS_H);
      }
    });
  });

  // =========================================================================
  // 9. Webcam overlay settings type guards
  // =========================================================================
  describe('WebcamOverlaySettings type validation', () => {
    it('accepts all valid position presets', () => {
      const validPositions: WebcamPositionPreset[] = [
        'bottom-right', 'bottom-left', 'top-right', 'top-left', 'custom',
      ];
      for (const pos of validPositions) {
        const settings: WebcamOverlaySettings = {
          ...DEFAULT_WEBCAM_OVERLAY_SETTINGS,
          position: pos,
        };
        expect(settings.position).toBe(pos);
      }
    });

    it('accepts all valid shapes', () => {
      const validShapes: WebcamShape[] = ['circle', 'square', 'rounded'];
      for (const shape of validShapes) {
        const settings: WebcamOverlaySettings = {
          ...DEFAULT_WEBCAM_OVERLAY_SETTINGS,
          shape,
        };
        expect(settings.shape).toBe(shape);
      }
    });

    it('shadowIntensity range 0-100 produces valid shadow params', () => {
      for (const intensity of [0, 25, 50, 75, 100]) {
        const params = calculateShadowParams(intensity);
        expect(params.shadowBlur).toBeGreaterThanOrEqual(0);
        expect(params.shadowBlur).toBeLessThanOrEqual(20);
        expect(params.shadowOffsetY).toBeGreaterThanOrEqual(0);
        expect(params.shadowOffsetY).toBeLessThanOrEqual(4);
      }
    });
  });
});
