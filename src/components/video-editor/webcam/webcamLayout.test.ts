import { describe, expect, it } from 'vitest';
import { DEFAULT_WEBCAM_OVERLAY_SETTINGS } from '../types';
import { getWebcamDimensions, getWebcamPosition } from './webcamLayout';

describe('webcamLayout', () => {
  it('defaults webcam aspect ratio to 16:9 in settings model', () => {
    expect(DEFAULT_WEBCAM_OVERLAY_SETTINGS.aspectRatio).toBe('16:9');
  });

  it('uses default sizePercent when not provided', () => {
    const settings = { ...DEFAULT_WEBCAM_OVERLAY_SETTINGS };
    delete (settings as Partial<typeof settings>).sizePercent;

    const dims = getWebcamDimensions(1920, settings);
    expect(dims.width).toBeCloseTo(384, 1);
  });

  it('uses explicit sizePercent for dimensions', () => {
    const dims = getWebcamDimensions(1920, {
      ...DEFAULT_WEBCAM_OVERLAY_SETTINGS,
      sizePercent: 30,
    });

    expect(dims.width).toBeCloseTo(576, 1);
  });

  it('applies selected aspect ratio for rounded shape', () => {
    const dims = getWebcamDimensions(1920, {
      ...DEFAULT_WEBCAM_OVERLAY_SETTINGS,
      shape: 'rounded',
      aspectRatio: '9:16',
      sizePercent: 20,
    });

    expect(dims.width).toBeCloseTo(384, 1);
    expect(dims.height).toBeCloseTo(384 / (9 / 16), 1);
  });

  it('applies selected aspect ratio for square shape', () => {
    const dims = getWebcamDimensions(1920, {
      ...DEFAULT_WEBCAM_OVERLAY_SETTINGS,
      shape: 'square',
      aspectRatio: '4:3',
      sizePercent: 20,
    });

    expect(dims.width).toBeCloseTo(384, 1);
    expect(dims.height).toBeCloseTo(384 / (4 / 3), 1);
  });

  it('keeps circle shape as perfect 1:1 regardless of selected aspect ratio', () => {
    const dims = getWebcamDimensions(1920, {
      ...DEFAULT_WEBCAM_OVERLAY_SETTINGS,
      shape: 'circle',
      aspectRatio: '9:16',
      sizePercent: 20,
    });

    expect(dims.width).toBeCloseTo(384, 1);
    expect(dims.height).toBeCloseTo(dims.width, 1);
  });

  it('returns preset position for bottom-right', () => {
    const pos = getWebcamPosition(1920, 1080, 384, 216, {
      ...DEFAULT_WEBCAM_OVERLAY_SETTINGS,
      position: 'bottom-right',
    });

    expect(pos.x).toBeGreaterThan(0);
    expect(pos.y).toBeGreaterThan(0);
  });
});
