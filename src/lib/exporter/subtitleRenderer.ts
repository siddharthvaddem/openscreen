import type { SubtitleRegion } from '@/components/video-editor/types';

/**
 * Renders a single subtitle to the canvas context.
 * Subtitles are rendered on top of everything else (highest z-index).
 */
export function renderSubtitle(
  ctx: CanvasRenderingContext2D,
  subtitle: SubtitleRegion,
  canvasWidth: number,
  canvasHeight: number,
  scaleFactor: number = 1.0
): void {
  const { text, style, positionPreset, customPosition } = subtitle;

  if (!text || text.trim() === '') return;

  // Scale font size
  const scaledFontSize = style.fontSize * scaleFactor;

  // Calculate position based on preset
  let x: number;
  let y: number;
  const padding = 40 * scaleFactor;

  // Set font first to measure text
  ctx.font = `${style.fontWeight} ${scaledFontSize}px ${style.fontFamily}`;
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  const textHeight = scaledFontSize;

  switch (positionPreset) {
    case 'bottom-center':
      x = canvasWidth / 2;
      y = canvasHeight - padding - textHeight / 2;
      break;
    case 'top-center':
      x = canvasWidth / 2;
      y = padding + textHeight / 2;
      break;
    case 'middle-center':
      x = canvasWidth / 2;
      y = canvasHeight / 2;
      break;
    case 'custom':
      if (customPosition) {
        x = (customPosition.x / 100) * canvasWidth;
        y = (customPosition.y / 100) * canvasHeight;
      } else {
        x = canvasWidth / 2;
        y = canvasHeight - padding - textHeight / 2;
      }
      break;
    default:
      x = canvasWidth / 2;
      y = canvasHeight - padding - textHeight / 2;
  }

  ctx.textAlign = style.textAlign;
  ctx.textBaseline = 'middle';

  // Draw background box if not transparent
  if (style.backgroundColor && style.backgroundColor !== 'transparent') {
    const boxPadding = 8 * scaleFactor;
    const boxWidth = textWidth + boxPadding * 2;
    const boxHeight = textHeight + boxPadding;

    let boxX: number;
    if (style.textAlign === 'center') {
      boxX = x - textWidth / 2 - boxPadding;
    } else if (style.textAlign === 'right') {
      boxX = x - textWidth - boxPadding;
    } else {
      boxX = x - boxPadding;
    }

    ctx.fillStyle = style.backgroundColor;
    ctx.beginPath();
    ctx.roundRect(
      boxX,
      y - textHeight / 2 - boxPadding / 2,
      boxWidth,
      boxHeight,
      4 * scaleFactor
    );
    ctx.fill();
  }

  // Draw text stroke/outline if specified
  if (style.strokeWidth && style.strokeWidth > 0) {
    const scaledStrokeWidth = style.strokeWidth * scaleFactor;
    ctx.strokeStyle = style.strokeColor || '#000000';
    ctx.lineWidth = scaledStrokeWidth * 2;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, x, y);
  }

  // Draw text fill
  ctx.fillStyle = style.color;
  ctx.fillText(text, x, y);
}

/**
 * Renders all subtitles visible at the current time.
 * Subtitles are rendered on top of everything else (highest z-index).
 */
export function renderSubtitles(
  ctx: CanvasRenderingContext2D,
  subtitles: SubtitleRegion[],
  canvasWidth: number,
  canvasHeight: number,
  currentTimeMs: number,
  scaleFactor: number = 1.0
): void {
  if (!subtitles || subtitles.length === 0) return;

  // Filter subtitles visible at current time
  const activeSubtitles = subtitles.filter(
    (subtitle) => currentTimeMs >= subtitle.startMs && currentTimeMs <= subtitle.endMs
  );

  // Render each active subtitle
  for (const subtitle of activeSubtitles) {
    renderSubtitle(ctx, subtitle, canvasWidth, canvasHeight, scaleFactor);
  }
}
