import type { KeystrokeRegion, KeystrokePositionPreset, AnimationPreset } from '@/components/video-editor/types';
import { MODIFIER_ICONS, isModifierKey } from '@/utils/keyNameMapping';
import { filterKeystrokeRegions } from '@/utils/keystrokeFilterUtils';

/**
 * Keycap styling constants matching KeyCap.tsx
 * Reference: src/components/keystroke-overlay/KeyCap.tsx
 */
const KEYCAP_STYLE = {
  minSizeRatio: 2.25,           // Minimum width/height relative to base font size
  outerHeightRatio: 2.5,        // Total height including shadow
  shadowOffsetRatio: 0.25,      // Bottom shadow offset
  horizontalPaddingRatio: 0.5,  // Horizontal padding relative to base font size
  verticalPaddingRatio: 0.375,  // Vertical padding relative to base font size
  iconSizeRatio: 0.45,          // Icon size relative to base font size
  labelSizeRatio: 0.5,          // Label size for modifiers relative to base font size
  cornerSmoothing: 0.4,         // Border radius factor (40% corner smoothing)
  primaryColor: '#FFFFFF',      // Key face color
  secondaryColor: '#000000',    // Key shadow color
  textColor: '#000000',         // Label color
  borderColor: '#000000',       // Border color
  borderWidth: 1,               // Border width in px
  gapRatio: 0.5,                // Gap between keycaps relative to base font size
};

/**
 * Parsed key for rendering
 */
interface ParsedKeyForRender {
  name: string;
  icon?: string;
  isModifier: boolean;
}

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
 * Parse keystroke text into individual keys for keyviz-style rendering.
 * 
 * @param text - The formatted keystroke text (e.g., "Ctrl + C", "Shift + D")
 * @returns Array of ParsedKeyForRender objects
 */
function parseKeystrokeTextToKeys(text: string): ParsedKeyForRender[] {
  // Split by " + " separator
  const parts = text.split(/\s*\+\s*/).filter(part => part.trim() !== '');
  
  return parts.map(part => {
    const trimmedPart = part.trim();
    const isModifier = isModifierKey(trimmedPart);
    
    return {
      name: trimmedPart,
      icon: isModifier ? MODIFIER_ICONS[trimmedPart] : undefined,
      isModifier,
    };
  });
}

/**
 * Measure the width of a single keycap
 */
function measureKeycapWidth(
  ctx: CanvasRenderingContext2D,
  key: ParsedKeyForRender,
  scaledFontSize: number,
  _scaleFactor: number
): number {
  const minSize = scaledFontSize * KEYCAP_STYLE.minSizeRatio;
  const horizontalPadding = scaledFontSize * KEYCAP_STYLE.horizontalPaddingRatio;
  
  // Measure text width
  const labelSize = key.isModifier && key.icon 
    ? scaledFontSize * KEYCAP_STYLE.labelSizeRatio 
    : scaledFontSize;
  
  ctx.font = `500 ${labelSize}px Inter, system-ui, sans-serif`;
  const textWidth = ctx.measureText(key.name).width;
  
  // If modifier with icon, also consider icon width
  let contentWidth = textWidth;
  if (key.isModifier && key.icon) {
    const iconSize = scaledFontSize * KEYCAP_STYLE.iconSizeRatio;
    ctx.font = `${iconSize}px Inter, system-ui, sans-serif`;
    const iconWidth = ctx.measureText(key.icon).width;
    contentWidth = Math.max(textWidth, iconWidth);
  }
  
  // Width is max of minSize or content + padding
  return Math.max(minSize, contentWidth + horizontalPadding * 2);
}

/**
 * Measure total width of keycap group
 */
function measureKeycapGroupWidth(
  ctx: CanvasRenderingContext2D,
  keys: ParsedKeyForRender[],
  scaledFontSize: number,
  scaleFactor: number
): number {
  if (keys.length === 0) return 0;
  
  const gap = scaledFontSize * KEYCAP_STYLE.gapRatio;
  let totalWidth = 0;
  
  for (let i = 0; i < keys.length; i++) {
    totalWidth += measureKeycapWidth(ctx, keys[i], scaledFontSize, scaleFactor);
    if (i < keys.length - 1) {
      totalWidth += gap;
    }
  }
  
  return totalWidth;
}

/**
 * Render a single keycap with 3D elevated styling
 */
function renderSingleKeycap(
  ctx: CanvasRenderingContext2D,
  key: ParsedKeyForRender,
  x: number,
  y: number,
  scaledFontSize: number,
  scaleFactor: number
): number {
  const minSize = scaledFontSize * KEYCAP_STYLE.minSizeRatio;
  const outerHeight = scaledFontSize * KEYCAP_STYLE.outerHeightRatio;
  const shadowOffset = scaledFontSize * KEYCAP_STYLE.shadowOffsetRatio;
  const horizontalPadding = scaledFontSize * KEYCAP_STYLE.horizontalPaddingRatio;
  const borderRadius = minSize * KEYCAP_STYLE.cornerSmoothing;
  const iconSize = scaledFontSize * KEYCAP_STYLE.iconSizeRatio;
  const labelSize = key.isModifier && key.icon 
    ? scaledFontSize * KEYCAP_STYLE.labelSizeRatio 
    : scaledFontSize;
  
  // Measure text width to determine keycap width
  ctx.font = `500 ${labelSize}px Inter, system-ui, sans-serif`;
  const textWidth = ctx.measureText(key.name).width;
  
  let contentWidth = textWidth;
  if (key.isModifier && key.icon) {
    ctx.font = `${iconSize}px Inter, system-ui, sans-serif`;
    const iconWidth = ctx.measureText(key.icon).width;
    contentWidth = Math.max(textWidth, iconWidth);
  }
  
  const keycapWidth = Math.max(minSize, contentWidth + horizontalPadding * 2);
  const keycapHeight = minSize;
  
  // Draw shadow (bottom layer) - positioned at bottom of outer height
  ctx.fillStyle = KEYCAP_STYLE.secondaryColor;
  ctx.beginPath();
  ctx.roundRect(
    x,
    y + outerHeight - keycapHeight,
    keycapWidth,
    keycapHeight,
    borderRadius
  );
  ctx.fill();
  
  // Draw border for shadow
  ctx.strokeStyle = KEYCAP_STYLE.borderColor;
  ctx.lineWidth = KEYCAP_STYLE.borderWidth * scaleFactor;
  ctx.stroke();
  
  // Draw face (top layer) - offset upward by shadowOffset
  ctx.fillStyle = KEYCAP_STYLE.primaryColor;
  ctx.beginPath();
  ctx.roundRect(
    x,
    y + outerHeight - keycapHeight - shadowOffset,
    keycapWidth,
    keycapHeight,
    borderRadius
  );
  ctx.fill();
  
  // Draw border for face
  ctx.strokeStyle = KEYCAP_STYLE.borderColor;
  ctx.lineWidth = KEYCAP_STYLE.borderWidth * scaleFactor;
  ctx.stroke();
  
  // Draw content (icon and/or label)
  ctx.fillStyle = KEYCAP_STYLE.textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const faceCenterX = x + keycapWidth / 2;
  const faceCenterY = y + outerHeight - keycapHeight - shadowOffset + keycapHeight / 2;
  
  if (key.isModifier && key.icon) {
    // Modifier: icon above label
    const totalContentHeight = iconSize + labelSize * 0.8;
    const iconY = faceCenterY - totalContentHeight / 2 + iconSize / 2;
    const labelY = faceCenterY + totalContentHeight / 2 - labelSize * 0.4;
    
    // Draw icon
    ctx.font = `${iconSize}px Inter, system-ui, sans-serif`;
    ctx.fillText(key.icon, faceCenterX, iconY);
    
    // Draw label
    ctx.font = `500 ${labelSize}px Inter, system-ui, sans-serif`;
    ctx.fillText(key.name, faceCenterX, labelY);
  } else {
    // Non-modifier: centered label only
    ctx.font = `500 ${labelSize}px Inter, system-ui, sans-serif`;
    ctx.fillText(key.name, faceCenterX, faceCenterY);
  }
  
  return keycapWidth;
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
 * Renders a single keystroke overlay to the canvas context using keyviz-style keycaps.
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

    // Parse keystroke text into individual keys
    const keys = parseKeystrokeTextToKeys(text);
    if (keys.length === 0) return;

    // Scale font size
    const baseFontSize = 24;
    const scaledFontSize = baseFontSize * style.textScale * scaleFactor;
    
    // Calculate keycap group dimensions
    const groupWidth = measureKeycapGroupWidth(ctx, keys, scaledFontSize, scaleFactor);
    const groupHeight = scaledFontSize * KEYCAP_STYLE.outerHeightRatio;

    // Calculate stack offset for multiple overlays
    const stackGap = 8 * scaleFactor;
    const stackOffset = stackIndex * (groupHeight + stackGap);

    // Calculate position based on preset
    const position = getPositionFromPreset(
      positionPreset,
      canvasWidth,
      canvasHeight,
      groupWidth,
      groupHeight,
      stackOffset,
      scaleFactor
    );

    // Apply animation transforms
    let x = position.x - groupWidth / 2;
    let y = position.y - groupHeight / 2 + animationValues.translateY * scaleFactor;

    ctx.save();

    // Apply global alpha for fade animation
    ctx.globalAlpha = animationValues.opacity;

    // Apply scale transform if needed
    if (animationValues.scale !== 1) {
      const centerX = position.x;
      const centerY = position.y;
      ctx.translate(centerX, centerY);
      ctx.scale(animationValues.scale, animationValues.scale);
      ctx.translate(-centerX, -centerY);
    }

    // Render each keycap
    const gap = scaledFontSize * KEYCAP_STYLE.gapRatio;
    let currentX = x;

    for (const key of keys) {
      const keycapWidth = renderSingleKeycap(ctx, key, currentX, y, scaledFontSize, scaleFactor);
      currentX += keycapWidth + gap;
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

    // Apply runtime filter for hotkeys before rendering
    const showOnlyHotkeys = keystrokes.length > 0 
      ? keystrokes[0].style.showOnlyHotkeys 
      : false;
    const filteredKeystrokes = filterKeystrokeRegions(keystrokes, showOnlyHotkeys);

    // Filter keystrokes that could be visible at current time (including animation phases)
    // We need to include keystrokes that are in entering, visible, or exiting phase
    const potentiallyActiveKeystrokes = filteredKeystrokes.filter((keystroke) => {
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
