export const ASPECT_RATIOS = ['16:9', '9:16', '1:1', '4:3', '4:5', '16:10', '10:16'] as const;

export type AspectRatio = typeof ASPECT_RATIOS[number];

/**
 * Returns the numeric value of an aspect ratio.
 * Uses exhaustive type checking to ensure all AspectRatio cases are handled.
 * If TypeScript errors here, a new ratio was added to the type but not handled.
 */
export function getAspectRatioValue(aspectRatio: AspectRatio): number {
  switch (aspectRatio) {
    case '16:9': return 16 / 9;
    case '9:16': return 9 / 16;
    case '1:1':  return 1;
    case '4:3':  return 4 / 3;
    case '4:5':  return 4 / 5;
    case '16:10': return 16 / 10;
    case '10:16': return 10 / 16;
    default: {
      // Ensures all cases are handled - TypeScript errors if missing
      const _exhaustiveCheck: never = aspectRatio;
      return _exhaustiveCheck;
    }
  }
}

export function getAspectRatioDimensions(
  aspectRatio: AspectRatio,
  baseWidth: number
): { width: number; height: number } {
  const ratio = getAspectRatioValue(aspectRatio);
  return {
    width: baseWidth,
    height: baseWidth / ratio,
  };
}

export function getAspectRatioLabel(aspectRatio: AspectRatio): string {
  return aspectRatio;
}


export function formatAspectRatioForCSS(aspectRatio: AspectRatio): string {
  return aspectRatio.replace(':', '/');
}
