// src/utils/overlayPositionUtils.ts

/**
 * Overlay Position Calculation Utility
 * 
 * Calculates the position of the keystroke overlay window based on:
 * 1. The position setting (bottom-center, bottom-left, bottom-right, top-center)
 * 2. The display bounds (x, y, width, height)
 * 3. The overlay window dimensions
 * 
 * Requirements:
 * - 2.5: Positioned at configurable screen location
 * - 2.7: Appears only on the monitor being recorded
 */

export type OverlayPosition = 'bottom-center' | 'bottom-left' | 'bottom-right' | 'top-center';

export interface DisplayBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowDimensions {
  width: number;
  height: number;
}

export interface CalculatedPosition {
  x: number;
  y: number;
}

/**
 * Margin from screen edges in pixels
 */
export const MARGIN = 50;

/**
 * Valid overlay positions
 */
export const VALID_POSITIONS: readonly OverlayPosition[] = [
  'bottom-center',
  'bottom-left',
  'bottom-right',
  'top-center',
] as const;

/**
 * Calculate the overlay window position based on position setting and display bounds.
 * 
 * The function ensures the window stays within screen bounds by clamping
 * the calculated position to valid coordinates.
 * 
 * @param position - The desired position setting
 * @param displayBounds - The bounds of the display (x, y, width, height)
 * @param windowDimensions - The dimensions of the overlay window (width, height)
 * @returns The calculated x, y coordinates for the window
 * 
 * @example
 * ```typescript
 * const pos = calculateOverlayPosition(
 *   'bottom-center',
 *   { x: 0, y: 0, width: 1920, height: 1080 },
 *   { width: 400, height: 100 }
 * );
 * // Returns { x: 760, y: 930 }
 * ```
 */
export function calculateOverlayPosition(
  position: OverlayPosition,
  displayBounds: DisplayBounds,
  windowDimensions: WindowDimensions
): CalculatedPosition {
  const { x: displayX, y: displayY, width: displayWidth, height: displayHeight } = displayBounds;
  const { width: windowWidth, height: windowHeight } = windowDimensions;
  
  let x: number;
  let y: number;
  
  switch (position) {
    case 'bottom-center':
      x = displayX + Math.floor((displayWidth - windowWidth) / 2);
      y = displayY + displayHeight - windowHeight - MARGIN;
      break;
    case 'bottom-left':
      x = displayX + MARGIN;
      y = displayY + displayHeight - windowHeight - MARGIN;
      break;
    case 'bottom-right':
      x = displayX + displayWidth - windowWidth - MARGIN;
      y = displayY + displayHeight - windowHeight - MARGIN;
      break;
    case 'top-center':
      x = displayX + Math.floor((displayWidth - windowWidth) / 2);
      y = displayY + MARGIN;
      break;
    default:
      // Default to bottom-center for any unknown position
      x = displayX + Math.floor((displayWidth - windowWidth) / 2);
      y = displayY + displayHeight - windowHeight - MARGIN;
  }
  
  // Ensure window stays within screen bounds
  x = clampPosition(x, displayX, displayX + displayWidth - windowWidth);
  y = clampPosition(y, displayY, displayY + displayHeight - windowHeight);
  
  return { x, y };
}

/**
 * Clamp a value between min and max bounds.
 * 
 * @param value - The value to clamp
 * @param min - The minimum allowed value
 * @param max - The maximum allowed value
 * @returns The clamped value
 */
function clampPosition(value: number, min: number, max: number): number {
  // Handle edge case where max < min (window larger than display)
  if (max < min) {
    return min;
  }
  return Math.max(min, Math.min(value, max));
}

/**
 * Check if a position value is a valid OverlayPosition.
 * 
 * @param position - The position value to check
 * @returns true if the position is valid
 */
export function isValidOverlayPosition(position: unknown): position is OverlayPosition {
  return typeof position === 'string' && VALID_POSITIONS.includes(position as OverlayPosition);
}

/**
 * Check if the calculated position is fully within the display bounds.
 * 
 * @param position - The calculated position
 * @param displayBounds - The display bounds
 * @param windowDimensions - The window dimensions
 * @returns true if the window is fully within bounds
 */
export function isPositionWithinBounds(
  position: CalculatedPosition,
  displayBounds: DisplayBounds,
  windowDimensions: WindowDimensions
): boolean {
  const { x, y } = position;
  const { x: displayX, y: displayY, width: displayWidth, height: displayHeight } = displayBounds;
  const { width: windowWidth, height: windowHeight } = windowDimensions;
  
  return (
    x >= displayX &&
    y >= displayY &&
    x + windowWidth <= displayX + displayWidth &&
    y + windowHeight <= displayY + displayHeight
  );
}
