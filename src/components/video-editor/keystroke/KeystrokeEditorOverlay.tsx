import { useRef, useMemo, CSSProperties } from "react";
import { Rnd } from "react-rnd";
import type { KeystrokeRegion, KeystrokePositionPreset, AnimationPreset } from "../types";
import { cn } from "@/lib/utils";
import { KeyCapGroup } from "@/components/keystroke-overlay/KeyCapGroup";
import type { ParsedKey } from "@/utils/keyNameMapping";
import { isModifierKey, getModifierIcon, MOUSE_BUTTON_NAMES } from "@/utils/keyNameMapping";

/**
 * Calculate stack indices for multiple overlays at the same position preset.
 * Groups overlays by their position preset and assigns sequential indices within each group.
 * 
 * This is used by VideoPlayback to determine the stackIndex prop for each overlay
 * when rendering multiple simultaneous keystroke overlays.
 * 
 * @param regions - Array of keystroke regions to calculate stack indices for
 * @returns Map of region id to { stackIndex, stackCount } for each region
 * 
 * Requirements:
 * - 6.6: Support multiple simultaneous overlays
 * - Property 9: Multiple Overlays Simultaneous Display
 */
export function calculateStackIndices(
  regions: KeystrokeRegion[]
): Map<string, { stackIndex: number; stackCount: number }> {
  const result = new Map<string, { stackIndex: number; stackCount: number }>();
  
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
    const stackCount = group.length;
    group.forEach((region, index) => {
      result.set(region.id, { stackIndex: index, stackCount });
    });
  }
  
  return result;
}

/**
 * Animation phase for the keystroke overlay.
 * - 'entering': Animation in progress (fade-in, slide-in, scale-in)
 * - 'visible': Fully visible, no animation
 * - 'exiting': Animation out progress (fade-out, slide-out, scale-out)
 * - 'hidden': Not visible
 */
export type AnimationPhase = 'entering' | 'visible' | 'exiting' | 'hidden';

interface KeystrokeEditorOverlayProps {
  keystroke: KeystrokeRegion;
  isSelected: boolean;
  containerWidth: number;
  containerHeight: number;
  /** Current playback time in milliseconds - used for animation timing */
  currentTimeMs?: number;
  /** Reserved for future custom position support - currently uses preset positions only */
  onPositionChange?: (id: string, position: KeystrokePositionPreset) => void;
  onClick: (id: string) => void;
  /** 
   * Index of this overlay among all visible overlays at the same position preset.
   * Used to calculate vertical stacking offset when multiple overlays appear simultaneously.
   * Default: 0 (no offset)
   */
  stackIndex?: number;
  /**
   * Total number of overlays visible at the same position preset.
   * Used together with stackIndex to determine stacking behavior.
   * Default: 1
   */
  stackCount?: number;
}

/**
 * Calculate position based on preset for keystroke overlay.
 * Supports 6 position presets: bottom-center, bottom-left, bottom-right, top-center, top-left, top-right
 * 
 * @param preset - The position preset
 * @param containerWidth - Width of the container
 * @param containerHeight - Height of the container
 * @param elementWidth - Estimated width of the keystroke element
 * @param stackOffset - Vertical offset for stacking multiple overlays (default: 0)
 * @returns The calculated x, y coordinates
 */
function getPositionFromPreset(
  preset: KeystrokePositionPreset,
  containerWidth: number,
  containerHeight: number,
  elementWidth: number,
  stackOffset: number = 0,
): { x: number; y: number } {
  const padding = 40; // Padding from edges
  const elementHeight = 50; // Approximate height of keystroke element
  
  // For bottom positions, stack upward (negative offset)
  // For top positions, stack downward (positive offset)
  const isTopPosition = preset.startsWith('top');
  const verticalOffset = isTopPosition ? stackOffset : -stackOffset;
  
  switch (preset) {
    case 'bottom-center':
      return { 
        x: (containerWidth - elementWidth) / 2, 
        y: containerHeight - padding - elementHeight + verticalOffset
      };
    case 'bottom-left':
      return { 
        x: padding, 
        y: containerHeight - padding - elementHeight + verticalOffset
      };
    case 'bottom-right':
      return { 
        x: containerWidth - elementWidth - padding, 
        y: containerHeight - padding - elementHeight + verticalOffset
      };
    case 'top-center':
      return { 
        x: (containerWidth - elementWidth) / 2, 
        y: padding + verticalOffset
      };
    case 'top-left':
      return { 
        x: padding, 
        y: padding + verticalOffset
      };
    case 'top-right':
      return { 
        x: containerWidth - elementWidth - padding, 
        y: padding + verticalOffset
      };
    default:
      // Default to bottom-center
      return { 
        x: (containerWidth - elementWidth) / 2, 
        y: containerHeight - padding - elementHeight + verticalOffset
      };
  }
}

/**
 * Parse formatted keystroke text into ParsedKey array for keyviz-style display.
 * Handles both keyboard shortcuts (e.g., "Ctrl + C") and mouse actions (e.g., "Left Click").
 * 
 * @param text - The formatted keystroke text (e.g., "Ctrl + C", "Shift + Left Click")
 * @returns Array of ParsedKey objects for KeyCapGroup rendering
 */
function parseKeystrokeTextToKeys(text: string): ParsedKey[] {
  const keys: ParsedKey[] = [];
  
  // Split by " + " to get individual key parts
  const parts = text.split(/\s*\+\s*/).map(p => p.trim()).filter(p => p.length > 0);
  
  for (const part of parts) {
    // Check if this is a mouse action
    const isMouseAction = Object.values(MOUSE_BUTTON_NAMES).includes(part);
    
    if (isMouseAction) {
      // Mouse actions are non-modifiers with icon
      keys.push({
        name: part,
        icon: '🖱️',
        isModifier: false,
      });
    } else if (isModifierKey(part)) {
      // Modifier keys get their icon
      keys.push({
        name: part,
        icon: getModifierIcon(part),
        isModifier: true,
      });
    } else {
      // Regular keys - no icon
      keys.push({
        name: part,
        icon: undefined,
        isModifier: false,
      });
    }
  }
  
  return keys;
}

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
 * - 6.1: Display keystroke text when current time is within region range
 * - Property 8: Overlay Visibility by Time
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
function calculateAnimationProgress(
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
 * Get CSS styles for the animation based on preset and progress.
 * 
 * @param preset - Animation preset type
 * @param progress - Animation progress (0 to 1)
 * @param isEntering - Whether this is an enter animation (vs exit)
 * @returns CSS properties for the animation
 */
function getAnimationStyles(
  preset: AnimationPreset,
  progress: number,
  isEntering: boolean
): CSSProperties {
  // Apply easing function for smoother animations
  const easedProgress = easeOutCubic(progress);
  
  switch (preset) {
    case 'fade':
      return {
        opacity: easedProgress,
      };
    
    case 'slide-up':
      // Slide from below (positive Y) to position (0)
      const slideUpOffset = isEntering 
        ? (1 - easedProgress) * 20 
        : (1 - easedProgress) * -20;
      return {
        opacity: easedProgress,
        transform: `translateY(${slideUpOffset}px)`,
      };
    
    case 'slide-down':
      // Slide from above (negative Y) to position (0)
      const slideDownOffset = isEntering 
        ? (1 - easedProgress) * -20 
        : (1 - easedProgress) * 20;
      return {
        opacity: easedProgress,
        transform: `translateY(${slideDownOffset}px)`,
      };
    
    case 'scale':
      // Scale from small to full size
      const scale = 0.8 + (easedProgress * 0.2);
      return {
        opacity: easedProgress,
        transform: `scale(${scale})`,
      };
    
    case 'none':
    default:
      return {
        opacity: progress > 0 ? 1 : 0,
      };
  }
}

/**
 * Easing function for smoother animations.
 * Cubic ease-out: decelerates towards the end.
 */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * KeystrokeEditorOverlay Component
 * 
 * Renders a single keystroke overlay at the configured position with styling.
 * Supports:
 * - 6 position presets (bottom-center, bottom-left, bottom-right, top-center, top-left, top-right)
 * - Customizable text color, background color, and modifier color
 * - Text scale adjustment
 * - Border radius for keycap style
 * - Animation presets (fade, slide-up, slide-down, scale, none) for enter/exit
 * - Multiple simultaneous overlays with automatic stacking
 * 
 * Requirements:
 * - 6.1: Display keystroke text when current time is within region range
 * - 6.2: Display keystroke in readable format (e.g., "Ctrl + C", "Enter", "Left Click")
 * - 6.3: Display overlay at configurable position (default: bottom-center)
 * - 6.4: Apply fade-in animation when keystroke appears
 * - 6.5: Apply fade-out animation when keystroke disappears
 * - 6.6: Support multiple simultaneous overlays with proper stacking
 * - 8.1.1, 8.1.2, 8.1.3: Support animation presets for enter/exit animations
 * - 10.4: Log errors and continue playback without overlay on rendering errors
 */
export function KeystrokeEditorOverlay({
  keystroke,
  isSelected,
  containerWidth,
  containerHeight,
  currentTimeMs,
  onPositionChange,
  onClick,
  stackIndex = 0,
  stackCount = 1,
}: KeystrokeEditorOverlayProps) {
  const isDraggingRef = useRef(false);
  const textRef = useRef<HTMLDivElement>(null);
  
  // Note: onPositionChange is reserved for future custom position support
  // Note: stackCount is provided for API completeness but not currently used
  void onPositionChange;
  void stackCount;

  // Requirement 10.4: Wrap rendering in try-catch to handle errors gracefully
  try {
    const { style, startMs, endMs } = keystroke;
    const { fadeDurationMs, animationIn, animationOut } = style;
    
    // Calculate animation phase and progress based on current time
    const animationState = useMemo(() => {
      try {
        // If no currentTimeMs provided, show fully visible (for editor preview)
        if (currentTimeMs === undefined) {
          return { phase: 'visible' as AnimationPhase, progress: 1 };
        }
        
        const phase = calculateAnimationPhase(currentTimeMs, startMs, endMs, fadeDurationMs);
        const progress = calculateAnimationProgress(currentTimeMs, startMs, endMs, fadeDurationMs, phase);
        
        return { phase, progress };
      } catch (error) {
        // Requirement 10.4: Log error and return safe default
        console.error('[KeystrokeEditorOverlay] Error calculating animation state:', error);
        return { phase: 'visible' as AnimationPhase, progress: 1 };
      }
    }, [currentTimeMs, startMs, endMs, fadeDurationMs]);
    
    // Get animation styles based on current phase
    const animationStyles = useMemo(() => {
      try {
        const { phase, progress } = animationState;
        
        if (phase === 'hidden') {
          return { opacity: 0, visibility: 'hidden' as const };
        }
        
        if (phase === 'visible') {
          return { opacity: 1 };
        }
        
        const preset = phase === 'entering' ? animationIn : animationOut;
        const isEntering = phase === 'entering';
        
        return getAnimationStyles(preset, progress, isEntering);
      } catch (error) {
        // Requirement 10.4: Log error and return safe default
        console.error('[KeystrokeEditorOverlay] Error calculating animation styles:', error);
        return { opacity: 1 };
      }
    }, [animationState, animationIn, animationOut]);
    
    // Base font size for keycap calculations (matches KeyCap.tsx)
    const BASE_FONT_SIZE = 16;
    const scaledFontSize = BASE_FONT_SIZE * style.textScale;
    
    // Estimate element width based on number of keys and keycap sizing
    // Each keycap has minWidth = fontSize * 2.25, plus gap = fontSize * 0.5
    const keycapMinWidth = scaledFontSize * 2.25;
    const keycapGap = scaledFontSize * 0.5;
    const numKeys = keystroke.text.split(/\s*\+\s*/).filter(p => p.trim().length > 0).length;
    const estimatedElementWidth = Math.min(
      containerWidth * 0.8, 
      numKeys * keycapMinWidth + (numKeys - 1) * keycapGap + 16 // Add small padding
    );
    
    // Calculate vertical stacking offset for multiple overlays at the same position
    // Each overlay is offset by approximately the element height + gap
    const elementHeight = 50; // Approximate height of keystroke element
    const stackGap = 8; // Gap between stacked overlays
    const stackOffset = stackIndex * (elementHeight + stackGap);
    
    const position = getPositionFromPreset(
      keystroke.positionPreset,
      containerWidth,
      containerHeight,
      estimatedElementWidth,
      stackOffset
    );

    // Parse keystroke text into keys for keyviz-style display
    const parsedKeys = useMemo(() => {
      try {
        return parseKeystrokeTextToKeys(keystroke.text);
      } catch (error) {
        console.error('[KeystrokeEditorOverlay] Error parsing keystroke text:', error);
        // Fallback: return single key with the raw text
        return [{ name: keystroke.text, icon: undefined, isModifier: false }];
      }
    }, [keystroke.text]);

    const renderContent = () => {
      return (
        <div
          ref={textRef}
          className="inline-flex items-center"
          style={{
            // Apply animation styles to the content
            ...animationStyles,
            // Smooth transition for animation
            transition: animationState.phase === 'visible' ? 'none' : undefined,
          }}
        >
          <KeyCapGroup keys={parsedKeys} textScale={style.textScale} />
        </div>
      );
    };

    // Don't render if hidden
    if (animationState.phase === 'hidden') {
      return null;
    }

    // Keystroke overlays are not draggable - position is controlled by preset
    const enableDrag = false;

    return (
      <Rnd
        position={{ x: position.x, y: position.y }}
        size={{ width: 'auto', height: 'auto' }}
        enableResizing={false}
        disableDragging={!enableDrag}
        onDragStart={() => {
          isDraggingRef.current = true;
        }}
        onDragStop={() => {
          setTimeout(() => {
            isDraggingRef.current = false;
          }, 100);
        }}
        onClick={() => {
          if (isDraggingRef.current) return;
          onClick(keystroke.id);
        }}
        bounds="parent"
        className={cn(
          "cursor-pointer transition-all",
          isSelected && "ring-2 ring-[#34B27B] ring-offset-2 ring-offset-transparent"
        )}
        style={{
          // Z-index: selected overlays get highest priority, then stack by index
          // Base z-index is 100, each stack level adds 1, selected gets 1000
          zIndex: isSelected ? 1000 : 100 + stackIndex,
          pointerEvents: isSelected ? 'auto' : 'none',
        }}
      >
        {renderContent()}
      </Rnd>
    );
  } catch (error) {
    // Requirement 10.4: Log error and continue playback without overlay
    console.error('[KeystrokeEditorOverlay] Rendering error, skipping overlay:', error);
    return null;
  }
}
