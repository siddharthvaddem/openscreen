import { describe, expect, it } from 'vitest';
import { DEFAULT_WEBCAM_OVERLAY_SETTINGS } from '../types';
import { getWebcamDimensions, getWebcamPosition } from './webcamLayout';

describe('webcamLayout', () => {
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

  it('returns preset position for bottom-right', () => {
    const pos = getWebcamPosition(1920, 1080, 384, 216, {
      ...DEFAULT_WEBCAM_OVERLAY_SETTINGS,
      position: 'bottom-right',
    });

    expect(pos.x).toBeGreaterThan(0);
    expect(pos.y).toBeGreaterThan(0);
  });
});
