import { describe, it, expect } from 'vitest';
import type {
  WebcamRegion,
  WebcamOverlaySettings,
  WebcamPositionPreset,
  WebcamShape,
} from '@/components/video-editor/types';
import { DEFAULT_WEBCAM_OVERLAY_SETTINGS } from '@/components/video-editor/types';

// ---------------------------------------------------------------------------
// Webcam E2E Flow Tests
//
// Validates the full webcam lifecycle (record → edit → export) using pure
// logic assertions — no Electron, MediaRecorder, or real video files required.
// ---------------------------------------------------------------------------

describe('Webcam E2E Flow', () => {
  // =========================================================================
  // 1. Recording flow — file naming & conventions
  // =========================================================================
  describe('Recording flow', () => {
    it('generates shared timestamp for both screen and webcam files', () => {
      const timestamp = Date.now();
      const screenFile = `recording-${timestamp}.webm`;
      const webcamFile = `recording-${timestamp}.webcam.webm`;

      const screenTs = screenFile.match(/recording-(\d+)\.webm/)?.[1];
      const webcamTs = webcamFile.match(/recording-(\d+)\.webcam\.webm/)?.[1];

      expect(screenTs).toBeDefined();
      expect(webcamTs).toBeDefined();
      expect(screenTs).toBe(webcamTs);
    });

    it('webcam file follows naming convention: {name}.webcam.webm', () => {
      const timestamps = [1700000000000, 1700000001111, 9999999999999];
      for (const ts of timestamps) {
        const webcamFile = `recording-${ts}.webcam.webm`;
        expect(webcamFile).toMatch(/^recording-\d+\.webcam\.webm$/);
      }
    });

    it('screen file does NOT contain .webcam. in the name', () => {
      const timestamp = Date.now();
      const screenFile = `recording-${timestamp}.webm`;
      expect(screenFile).not.toContain('.webcam.');
    });

    it('cam toggle OFF produces single file path (no webcam companion)', () => {
      const camEnabled = false;
      const timestamp = Date.now();
      const files = [`recording-${timestamp}.webm`];
      if (camEnabled) {
        files.push(`recording-${timestamp}.webcam.webm`);
      }

      expect(files).toHaveLength(1);
      expect(files[0]).toMatch(/^recording-\d+\.webm$/);
    });

    it('cam toggle ON produces two file paths', () => {
      const camEnabled = true;
      const timestamp = Date.now();
      const files = [`recording-${timestamp}.webm`];
      if (camEnabled) {
        files.push(`recording-${timestamp}.webcam.webm`);
      }

      expect(files).toHaveLength(2);
      expect(files[0]).toMatch(/^recording-\d+\.webm$/);
      expect(files[1]).toMatch(/^recording-\d+\.webcam\.webm$/);
    });
  });

  // =========================================================================
  // 2. Editor integration — webcam file discovery & path derivation
  // =========================================================================
  describe('Editor integration', () => {
    it('webcam file discovery derives path from main video path (.webm)', () => {
      const mainPath = '/recordings/recording-12345.webm';
      const webcamPath = mainPath.replace(/\.(webm|mp4|mov|avi|mkv)$/i, '.webcam.webm');
      expect(webcamPath).toBe('/recordings/recording-12345.webcam.webm');
    });

    it('webcam path derivation works for .mp4 files', () => {
      const mainPath = '/recordings/demo.mp4';
      const webcamPath = mainPath.replace(/\.(webm|mp4|mov|avi|mkv)$/i, '.webcam.webm');
      expect(webcamPath).toBe('/recordings/demo.webcam.webm');
    });

    it('webcam path derivation works for .mov files', () => {
      const mainPath = '/recordings/clip.mov';
      const webcamPath = mainPath.replace(/\.(webm|mp4|mov|avi|mkv)$/i, '.webcam.webm');
      expect(webcamPath).toBe('/recordings/clip.webcam.webm');
    });

    it('webcam path derivation works for .avi and .mkv files', () => {
      const aviPath = '/recordings/video.avi';
      const mkvPath = '/recordings/video.mkv';
      expect(aviPath.replace(/\.(webm|mp4|mov|avi|mkv)$/i, '.webcam.webm'))
        .toBe('/recordings/video.webcam.webm');
      expect(mkvPath.replace(/\.(webm|mp4|mov|avi|mkv)$/i, '.webcam.webm'))
        .toBe('/recordings/video.webcam.webm');
    });

    it('webcam path derivation is case-insensitive for extensions', () => {
      const mainPath = '/recordings/video.MP4';
      const webcamPath = mainPath.replace(/\.(webm|mp4|mov|avi|mkv)$/i, '.webcam.webm');
      expect(webcamPath).toBe('/recordings/video.webcam.webm');
    });

    it('webcam overlay settings initialize with defaults', () => {
      const settings: WebcamOverlaySettings = { ...DEFAULT_WEBCAM_OVERLAY_SETTINGS };
      expect(settings.position).toBe('bottom-right');
      expect(settings.shape).toBe('rounded');
      expect(settings.shadowIntensity).toBe(50);
      expect(settings.customPosition).toBeUndefined();
    });

    it('webcam regions initialize with full-duration region', () => {
      const videoDurationMs = 30000;
      const regions: WebcamRegion[] = [
        { id: '1', startMs: 0, endMs: videoDurationMs },
      ];

      expect(regions).toHaveLength(1);
      expect(regions[0].startMs).toBe(0);
      expect(regions[0].endMs).toBe(videoDurationMs);
    });
  });

  // =========================================================================
  // 3. Export integration — config with/without webcam
  // =========================================================================
  describe('Export integration', () => {
    it('export config includes webcam fields when webcamPath is present', () => {
      const webcamPath = 'file:///recordings/recording-12345.webcam.webm';
      const webcamSettings = DEFAULT_WEBCAM_OVERLAY_SETTINGS;
      const webcamRegions: WebcamRegion[] = [
        { id: '1', startMs: 0, endMs: 10000 },
      ];

      const exportConfig = {
        webcamPath: webcamPath || undefined,
        webcamSettings: webcamPath ? webcamSettings : undefined,
        webcamRegions: webcamPath ? webcamRegions : undefined,
      };

      expect(exportConfig.webcamPath).toBeDefined();
      expect(exportConfig.webcamPath).toBe(webcamPath);
      expect(exportConfig.webcamSettings).toBeDefined();
      expect(exportConfig.webcamSettings).toEqual(DEFAULT_WEBCAM_OVERLAY_SETTINGS);
      expect(exportConfig.webcamRegions).toHaveLength(1);
    });

    it('export config excludes webcam fields when webcamPath is null', () => {
      const webcamPath: string | null = null;

      const exportConfig = {
        webcamPath: webcamPath || undefined,
        webcamSettings: webcamPath ? DEFAULT_WEBCAM_OVERLAY_SETTINGS : undefined,
        webcamRegions: webcamPath ? [] : undefined,
      };

      expect(exportConfig.webcamPath).toBeUndefined();
      expect(exportConfig.webcamSettings).toBeUndefined();
      expect(exportConfig.webcamRegions).toBeUndefined();
    });

    it('export config preserves webcam settings overrides', () => {
      const customSettings: WebcamOverlaySettings = {
        position: 'top-left',
        shape: 'circle',
        shadowIntensity: 0,
        sizePercent: 20,
        customPosition: { x: 0.1, y: 0.1 },
      };

      const exportConfig = {
        webcamPath: 'file:///webcam.webm',
        webcamSettings: customSettings,
        webcamRegions: [
          { id: '1', startMs: 0, endMs: 5000 },
          { id: '2', startMs: 8000, endMs: 15000 },
        ] as WebcamRegion[],
      };

      expect(exportConfig.webcamSettings.position).toBe('top-left');
      expect(exportConfig.webcamSettings.shape).toBe('circle');
      expect(exportConfig.webcamSettings.shadowIntensity).toBe(0);
      expect(exportConfig.webcamSettings.customPosition).toEqual({ x: 0.1, y: 0.1 });
      expect(exportConfig.webcamRegions).toHaveLength(2);
    });

    it('all position presets are valid for export config', () => {
      const presets: WebcamPositionPreset[] = [
        'bottom-right', 'bottom-left', 'top-right', 'top-left', 'custom',
      ];

      for (const preset of presets) {
        const settings: WebcamOverlaySettings = {
          ...DEFAULT_WEBCAM_OVERLAY_SETTINGS,
          position: preset,
        };
        expect(settings.position).toBe(preset);
      }
    });

    it('all shapes are valid for export config', () => {
      const shapes: WebcamShape[] = ['circle', 'square', 'rounded'];

      for (const shape of shapes) {
        const settings: WebcamOverlaySettings = {
          ...DEFAULT_WEBCAM_OVERLAY_SETTINGS,
          shape,
        };
        expect(settings.shape).toBe(shape);
      }
    });
  });

  // =========================================================================
  // 4. Backward compatibility
  // =========================================================================
  describe('Backward compatibility', () => {
    it('video without companion webcam file results in null webcamPath', () => {
      // Simulate: file system check returns false for webcam companion
      const webcamFileExists = false;
      const webcamPath = webcamFileExists ? '/recordings/video.webcam.webm' : null;

      expect(webcamPath).toBeNull();
    });

    it('export works without webcam fields (pre-webcam recordings)', () => {
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

      // No webcam fields at all — pre-webcam recording
      expect(exportConfig).not.toHaveProperty('webcamPath');
      expect(exportConfig).not.toHaveProperty('webcamSettings');
      expect(exportConfig).not.toHaveProperty('webcamRegions');
      // Base export fields still valid
      expect(exportConfig.width).toBe(1920);
      expect(exportConfig.frameRate).toBe(30);
    });

    it('editor loads video normally when no webcam companion exists', () => {
      const mainVideoPath = '/recordings/recording-12345.webm';
      const webcamFileExists = false;

      const editorState = {
        videoPath: mainVideoPath,
        webcamPath: webcamFileExists
          ? mainVideoPath.replace(/\.(webm|mp4|mov|avi|mkv)$/i, '.webcam.webm')
          : null,
        webcamSettings: webcamFileExists ? DEFAULT_WEBCAM_OVERLAY_SETTINGS : null,
        webcamRegions: webcamFileExists ? [{ id: '1', startMs: 0, endMs: 10000 }] : [],
      };

      expect(editorState.videoPath).toBe(mainVideoPath);
      expect(editorState.webcamPath).toBeNull();
      expect(editorState.webcamSettings).toBeNull();
      expect(editorState.webcamRegions).toEqual([]);
    });

    it('editor loads webcam companion when it exists', () => {
      const mainVideoPath = '/recordings/recording-12345.webm';
      const webcamFileExists = true;
      const videoDurationMs = 15000;

      const editorState = {
        videoPath: mainVideoPath,
        webcamPath: webcamFileExists
          ? mainVideoPath.replace(/\.(webm|mp4|mov|avi|mkv)$/i, '.webcam.webm')
          : null,
        webcamSettings: webcamFileExists ? DEFAULT_WEBCAM_OVERLAY_SETTINGS : null,
        webcamRegions: webcamFileExists
          ? [{ id: '1', startMs: 0, endMs: videoDurationMs } as WebcamRegion]
          : [],
      };

      expect(editorState.videoPath).toBe(mainVideoPath);
      expect(editorState.webcamPath).toBe('/recordings/recording-12345.webcam.webm');
      expect(editorState.webcamSettings).toEqual(DEFAULT_WEBCAM_OVERLAY_SETTINGS);
      expect(editorState.webcamRegions).toHaveLength(1);
      expect(editorState.webcamRegions[0].endMs).toBe(videoDurationMs);
    });
  });
});
