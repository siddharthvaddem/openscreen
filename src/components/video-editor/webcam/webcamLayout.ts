import type { WebcamAspectRatio, WebcamOverlaySettings } from '../types';

const DEFAULT_SIZE_PERCENT = 20;
const MIN_SIZE_PERCENT = 10;
const MAX_SIZE_PERCENT = 40;
const DEFAULT_ASPECT_RATIO: WebcamAspectRatio = '16:9';
const ASPECT_RATIO_VALUES: Record<WebcamAspectRatio, number> = {
  '1:1': 1,
  '16:9': 16 / 9,
  '9:16': 9 / 16,
  '4:3': 4 / 3,
  '3:4': 3 / 4,
};

export function clampSizePercent(value?: number): number {
  const nextValue = value ?? DEFAULT_SIZE_PERCENT;
  return Math.min(MAX_SIZE_PERCENT, Math.max(MIN_SIZE_PERCENT, nextValue));
}

function resolveAspectRatio(value?: WebcamAspectRatio): number {
  return ASPECT_RATIO_VALUES[value ?? DEFAULT_ASPECT_RATIO];
}

export function getWebcamDimensions(containerWidth: number, settings: WebcamOverlaySettings): { width: number; height: number } {
  const sizePercent = clampSizePercent(settings.sizePercent);
  const width = (containerWidth * sizePercent) / 100;

  if (settings.shape === 'circle') {
    return { width, height: width };
  }

  const ratio = resolveAspectRatio(settings.aspectRatio);
  return { width, height: width / ratio };
}

export function getWebcamPosition(
  containerWidth: number,
  containerHeight: number,
  width: number,
  height: number,
  settings: WebcamOverlaySettings,
): { x: number; y: number } {
  if (settings.position === 'custom' && settings.customPosition) {
    return {
      x: settings.customPosition.x * containerWidth,
      y: settings.customPosition.y * containerHeight,
    };
  }

  const paddingX = containerWidth * 0.03;
  const paddingY = containerHeight * 0.05;

  switch (settings.position) {
    case 'bottom-left':
      return { x: paddingX, y: containerHeight - height - paddingY };
    case 'top-right':
      return { x: containerWidth - width - paddingX, y: paddingY };
    case 'top-left':
      return { x: paddingX, y: paddingY };
    case 'bottom-right':
    default:
      return {
        x: containerWidth - width - paddingX,
        y: containerHeight - height - paddingY,
      };
  }
}
