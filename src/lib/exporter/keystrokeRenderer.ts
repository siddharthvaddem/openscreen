import type { KeystrokeRegion, KeystrokePositionPreset, AnimationPreset } from '@/components/video-editor/types';

/**
 * Animation phase for the keystroke overlay.
 * - 'entering': Animation in progress (fade-in, slide-in, scale-in)
 * - 'visible': Fully visible, no animation
 * - 'exiting': Animation out progress (fade-out, slide-out, scale-out)
 * - 'hidden': Not visible
 */
export type AnimationPhase = 'entering' | 'visible' | 'exiting' | 'hidden';

/**
 * Calculate the animation phase based on current time and region timing.
 * 
 * @param currentTimeMs - Current playback time in milliseconds
 * @param startMs - Region start time in milliseconds
 * @param endMs - Region end time in milliseconds
 * @param fadeDurationMs - Duration of fade animation in milliseconds
 * @returns The current animation phase
 * 
 * Requirements:
 * - 8.4: Render fade animations correctly during export
 */
export function calculateAnimationPhase(
  currentTimeMs: number,
  startMs: number,
  endMs: number,
  fadeDurationMs: number
): AnimationPhase {
  // Before region starts
  if (currentTimeMs < startMs) {
    return 'hidden';
  }
  
  // During enter animation (from startMs to startMs + fadeDurationMs)
  if (currentTimeMs < startMs + fadeDurationMs) {
    return 'entering';
  }
  
  // During exit animation (from endMs - fadeDurationMs to endMs)
  if (currentTimeMs >= endMs - fadeDurationMs && currentTimeMs < endMs) {
    return 'exiting';
  }
  
  // After region ends
  if (currentTimeMs >= endMs) {
    return 'hidden';
  }
  
  // Fully visible (between enter and exit animations)
  return 'visible';
}

/**
 * Calculate animation progress (0 to 1) for the current phase.
 * 
 * @param currentTimeMs - Current playback time in milliseconds
 * @param startMs - Region start time in milliseconds
 * @param endMs - Region end time in milliseconds
 * @param fadeDurationMs - Duration of fade animation in milliseconds
 * @param phase - Current animation phase
 * @returns Progress value from 0 to 1
 */
export function calculateAnimationProgress(
  currentTimeMs: number,
  startMs: number,
  endMs: number,
  fadeDurationMs: number,
  phase: AnimationPhase
): number {
  if (phase === 'hidden') return 0;
  if (phase === 'visible') return 1;
  
  if (phase === 'entering') {
    const elapsed = currentTimeMs - startMs;
    return Math.min(1, Math.max(0, elapsed / fadeDurationMs));
  }
  
  if (phase === 'exiting') {
    const remaining = endMs - currentTimeMs;
    return Math.min(1, Math.max(0, remaining / fadeDurationMs));
  }
  
  return 1;
}

/**
 * Easing function for smoother animations.
 * Cubic ease-out: decelerates towards the end.
 */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Get animation values based on preset and progress.
 * 
 * @param preset - Animation preset type
 * @param progress - Animation progress (0 to 1)
 * @param isEntering - Whether this is an enter animation (vs exit)
 * @returns Animation values (opacity, translateY, scale)
 */
function getAnimationValues(
  preset: AnimationPreset,
  progress: number,
  isEntering: boolean
): { opacity: number; translateY: number; scale: number } {
  // Apply easing function for smoother animations
  const easedProgress = easeOutCubic(progress);
  
  switch (preset) {
    case 'fade':
      return {
        opacity: easedProgress,
        translateY: 0,
        scale: 1,
      };
    
    case 'slide-up':
      // Slide from below (positive Y) to position (0)
      const slideUpOffset = isEntering 
        ? (1 - easedProgress) * 20 
        : (1 - easedProgress) * -20;
      return {
        opacity: easedProgress,
        translateY: slideUpOffset,
        scale: 1,
      };
    
    case 'slide-down':
      // Slide from above (negative Y) to position (0)
      const slideDownOffset = isEntering 
        ? (1 - easedProgress) * -20 
        : (1 - easedProgress) * 20;
      return {
        opacity: easedProgress,
        translateY: slideDownOffset,
        scale: 1,
      };
    
    case 'scale':
      // Scale from small to full size
      const scaleValue = 0.8 + (easedProgress * 0.2);
      return {
        opacity: easedProgress,
        translateY: 0,
        scale: scaleValue,
      };
    
    case 'none':
    default:
      return {
        opacity: progress > 0 ? 1 : 0,
        translateY: 0,
        scale: 1,
      };
  }
}

/**
 * Parse text to identify modifier keys.
 * Modifiers are: Ctrl, Alt, Shift, Meta/Win/Cmd
 * 
 * @param text - The formatted keystroke text (e.g., "Ctrl + C")
 * @returns Array of text segments with modifier flag
 */
function parseKeystrokeText(
  text: string
): Array<{ text: string; isModifier: boolean }> {
  const modifiers = ['Ctrl', 'Alt', 'Shift', 'Meta', 'Win', 'Cmd', '⌘', '⌥', '⇧', '⌃'];
  const parts = text.split(/(\s*\+\s*)/);
  
  return parts.map(part => {
    const trimmedPart = part.trim();
    const isModifier = modifiers.some(mod => 
      trimmedPart.toLowerCase() === mod.toLowerCase() || trimmedPart === mod
    );
    const isSeparator = trimmedPart === '+' || trimmedPart === '';
    
    return {
      text: part,
      isModifier: isModifier && !isSeparator,
    };
  });
}

/**
 * Calculate position based on preset for keystroke overlay.
 * 
 * @param preset - The position preset
 * @param canvasWidth - Width of the canvas
 * @param canvasHeight - Height of the canvas
 * @param elementWidth - Width of the keystroke element
 * @param elementHeight - Height of the keystroke element
 * @param stackOffset - Vertical offset for stacking multiple overlays (default: 0)
 * @param scaleFactor - Scale factor for export dimensions
 * @returns The calculated x, y coordinates
 */
function getPositionFromPreset(
  preset: KeystrokePositionPreset,
  canvasWidth: number,
  canvasHeight: number,
  elementWidth: number,
  elementHeight: number,
  stackOffset: number = 0,
  scaleFactor: number = 1.0
): { x: number; y: number } {
  const padding = 40 * scaleFactor;
  
  // For bottom positions, stack upward (negative offset)
  // For top positions, stack downward (positive offset)
  const isTopPosition = preset.startsWith('top');
  const verticalOffset = isTopPosition ? stackOffset : -stackOffset;
  
  switch (preset) {
    case 'bottom-center':
      return { 
        x: canvasWidth / 2, 
        y: canvasHeight - padding - elementHeight / 2 + verticalOffset
      };
    case 'bottom-left':
      return { 
        x: padding + elementWidth / 2, 
        y: canvasHeight - padding - elementHeight / 2 + verticalOffset
      };
    case 'bottom-right':
      return { 
        x: canvasWidth - padding - elementWidth / 2, 
        y: canvasHeight - padding - elementHeight / 2 + verticalOffset
      };
    case 'top-center':
      return { 
        x: canvasWidth / 2, 
        y: padding + elementHeight / 2 + verticalOffset
      };
    case 'top-left':
      return { 
        x: padding + elementWidth / 2, 
        y: padding + elementHeight / 2 + verticalOffset
      };
    case 'top-right':
      return { 
        x: canvasWidth - padding - elementWidth / 2, 
        y: padding + elementHeight / 2 + verticalOffset
      };
    default:
      // Default to bottom-center
      return { 
        x: canvasWidth / 2, 
        y: canvasHeight - padding - elementHeight / 2 + verticalOffset
      };
  }
}


/**
 * Renders a single keystroke overlay to the canvas context.
 * Keystroke overlays are rendered on top of everything else (highest z-index).
 * 
 * Requirements:
 * - 8.1: Render keystroke overlay at correct timestamps for MP4 export
 * - 8.2: Render keystroke overlay at correct timestamps for GIF export
 * - 8.3: Apply same styling as preview during export
 * - 8.4: Render fade animations correctly during export
 * - 10.4: Log errors and continue playback without overlay on rendering errors
 */
export function renderKeystroke(
  ctx: CanvasRenderingContext2D,
  keystroke: KeystrokeRegion,
  canvasWidth: number,
  canvasHeight: number,
  currentTimeMs: number,
  scaleFactor: number = 1.0,
  stackIndex: number = 0
): void {
  try {
    const { text, style, startMs, endMs, positionPreset } = keystroke;

    if (!text || text.trim() === '') return;

    // Calculate animation phase and progress
    const phase = calculateAnimationPhase(currentTimeMs, startMs, endMs, style.fadeDurationMs);
    
    // Don't render if hidden
    if (phase === 'hidden') return;
    
    const progress = calculateAnimationProgress(currentTimeMs, startMs, endMs, style.fadeDurationMs, phase);
    
    // Get animation values
    const preset = phase === 'entering' ? style.animationIn : style.animationOut;
    const isEntering = phase === 'entering';
    const animationValues = phase === 'visible' 
      ? { opacity: 1, translateY: 0, scale: 1 }
      : getAnimationValues(preset, progress, isEntering);

    // Scale font size
    const baseFontSize = 24;
    const scaledFontSize = baseFontSize * style.textScale * scaleFactor;
    const scaledBorderRadius = style.borderRadius * scaleFactor;

    // Set font to measure text
    ctx.font = `600 ${scaledFontSize}px Inter, system-ui, sans-serif`;
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = scaledFontSize;

    // Calculate padding for the background box
    const boxPaddingX = 16 * scaleFactor;
    const boxPaddingY = 8 * scaleFactor;
    const boxWidth = textWidth + boxPaddingX * 2;
    const boxHeight = textHeight + boxPaddingY * 2;

    // Calculate stack offset for multiple overlays
    const elementHeight = boxHeight;
    const stackGap = 8 * scaleFactor;
    const stackOffset = stackIndex * (elementHeight + stackGap);

    // Calculate position based on preset
    const position = getPositionFromPreset(
      positionPreset,
      canvasWidth,
      canvasHeight,
      boxWidth,
      boxHeight,
      stackOffset,
      scaleFactor
    );

    // Apply animation transforms
    let x = position.x;
    let y = position.y + animationValues.translateY * scaleFactor;

    ctx.save();

    // Apply global alpha for fade animation
    ctx.globalAlpha = animationValues.opacity;

    // Apply scale transform if needed
    if (animationValues.scale !== 1) {
      ctx.translate(x, y);
      ctx.scale(animationValues.scale, animationValues.scale);
      ctx.translate(-x, -y);
    }

    // Draw background box
    if (style.backgroundColor && style.backgroundColor !== 'transparent') {
      ctx.fillStyle = style.backgroundColor;
      ctx.beginPath();
      ctx.roundRect(
        x - boxWidth / 2,
        y - boxHeight / 2,
        boxWidth,
        boxHeight,
        scaledBorderRadius
      );
      ctx.fill();
    }

    // Parse text to apply different colors to modifiers
    const textSegments = parseKeystrokeText(text);

    // Draw text with different colors for modifiers
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `600 ${scaledFontSize}px Inter, system-ui, sans-serif`;

    // Calculate total width and starting position for multi-colored text
    let currentX = x - textWidth / 2;

    for (const segment of textSegments) {
      const segmentWidth = ctx.measureText(segment.text).width;
      const color = segment.isModifier ? style.modifierColor : style.textColor;
      
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.fillText(segment.text, currentX, y);
      
      currentX += segmentWidth;
    }

    ctx.restore();
  } catch (error) {
    // Requirement 10.4: Log error and continue playback without overlay
    console.error('[keystrokeRenderer] Error rendering keystroke overlay, skipping:', error);
    // Restore context state if it was saved before the error
    try {
      ctx.restore();
    } catch {
      // Ignore restore errors
    }
  }
}

/**
 * Calculate stack indices for multiple overlays at the same position preset.
 * Groups overlays by their position preset and assigns sequential indices within each group.
 * 
 * @param regions - Array of keystroke regions to calculate stack indices for
 * @returns Map of region id to stackIndex
 */
function calculateStackIndices(
  regions: KeystrokeRegion[]
): Map<string, number> {
  const result = new Map<string, number>();
  
  // Group regions by position preset
  const groupsByPosition = new Map<KeystrokePositionPreset, KeystrokeRegion[]>();
  
  for (const region of regions) {
    const preset = region.positionPreset;
    const group = groupsByPosition.get(preset) || [];
    group.push(region);
    groupsByPosition.set(preset, group);
  }
  
  // Assign stack indices within each group
  for (const [, group] of groupsByPosition) {
    group.forEach((region, index) => {
      result.set(region.id, index);
    });
  }
  
  return result;
}

/**
 * Renders all keystroke overlays visible at the current time.
 * Keystroke overlays are rendered on top of everything else (highest z-index).
 * 
 * Requirements:
 * - 8.1: Render keystroke overlay at correct timestamps for MP4 export
 * - 8.2: Render keystroke overlay at correct timestamps for GIF export
 * - 8.3: Apply same styling as preview during export
 * - 8.4: Render fade animations correctly during export
 * - 10.4: Log errors and continue playback without overlay on rendering errors
 */
export function renderKeystrokes(
  ctx: CanvasRenderingContext2D,
  keystrokes: KeystrokeRegion[],
  canvasWidth: number,
  canvasHeight: number,
  currentTimeMs: number,
  scaleFactor: number = 1.0
): void {
  try {
    if (!keystrokes || keystrokes.length === 0) return;

    // Filter keystrokes that could be visible at current time (including animation phases)
    // We need to include keystrokes that are in entering, visible, or exiting phase
    const potentiallyActiveKeystrokes = keystrokes.filter((keystroke) => {
      try {
        const { startMs, endMs } = keystroke;
        // Include if current time is within the region's time range
        return currentTimeMs >= startMs && currentTimeMs < endMs;
      } catch (error) {
        // Requirement 10.4: Log error and skip this keystroke
        console.error('[keystrokeRenderer] Error filtering keystroke, skipping:', error);
        return false;
      }
    });

    if (potentiallyActiveKeystrokes.length === 0) return;

    // Calculate stack indices for overlays at the same position
    const stackIndices = calculateStackIndices(potentiallyActiveKeystrokes);

    // Render each active keystroke
    for (const keystroke of potentiallyActiveKeystrokes) {
      try {
        const stackIndex = stackIndices.get(keystroke.id) || 0;
        renderKeystroke(ctx, keystroke, canvasWidth, canvasHeight, currentTimeMs, scaleFactor, stackIndex);
      } catch (error) {
        // Requirement 10.4: Log error and continue with next keystroke
        console.error('[keystrokeRenderer] Error rendering keystroke, skipping:', error);
      }
    }
  } catch (error) {
    // Requirement 10.4: Log error and continue playback without overlays
    console.error('[keystrokeRenderer] Error in renderKeystrokes, skipping all overlays:', error);
  }
}
