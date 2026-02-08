import type { AnnotationRegion, ArrowDirection } from '@/components/video-editor/types';

// SVG path data for each arrow direction
const ARROW_PATHS: Record<ArrowDirection, string[]> = {
  'up': [
    'M 50 20 L 50 80',
    'M 50 20 L 35 35',
    'M 50 20 L 65 35',
  ],
  'down': [
    'M 50 20 L 50 80',
    'M 50 80 L 35 65',
    'M 50 80 L 65 65',
  ],
  'left': [
    'M 80 50 L 20 50',
    'M 20 50 L 35 35',
    'M 20 50 L 35 65',
  ],
  'right': [
    'M 20 50 L 80 50',
    'M 80 50 L 65 35',
    'M 80 50 L 65 65',
  ],
  'up-right': [
    'M 25 75 L 75 25',
    'M 75 25 L 60 30',
    'M 75 25 L 70 40',
  ],
  'up-left': [
    'M 75 75 L 25 25',
    'M 25 25 L 40 30',
    'M 25 25 L 30 40',
  ],
  'down-right': [
    'M 25 25 L 75 75',
    'M 75 75 L 70 60',
    'M 75 75 L 60 70',
  ],
  'down-left': [
    'M 75 25 L 25 75',
    'M 25 75 L 30 60',
    'M 25 75 L 40 70',
  ],
};

function parseSvgPath(pathString: string, scaleX: number, scaleY: number): Array<{ cmd: string; args: number[] }> {
  const commands: Array<{ cmd: string; args: number[] }> = [];
  const parts = pathString.trim().split(/\s+/);
  
  let i = 0;
  while (i < parts.length) {
    const cmd = parts[i];
    if (cmd === 'M' || cmd === 'L') {
      const x = parseFloat(parts[i + 1]) * scaleX;
      const y = parseFloat(parts[i + 2]) * scaleY;
      commands.push({ cmd, args: [x, y] });
      i += 3;
    } else {
      i++;
    }
  }
  
  return commands;
}


function renderArrow(
  ctx: CanvasRenderingContext2D,
  direction: ArrowDirection,
  color: string,
  strokeWidth: number,
  x: number,
  y: number,
  width: number,
  height: number,
  _scaleFactor: number
) {
  const paths = ARROW_PATHS[direction];
  if (!paths) return;

  ctx.save();
  ctx.translate(x, y);
  
  const padding = 8 * _scaleFactor;
  const availableWidth = Math.max(0, width - padding * 2);
  const availableHeight = Math.max(0, height - padding * 2);

  const scale = Math.min(availableWidth / 100, availableHeight / 100);
  
  const offsetX = padding + (availableWidth - 100 * scale) / 2;
  const offsetY = padding + (availableHeight - 100 * scale) / 2;
  
  // Apply centering offset
  ctx.translate(offsetX, offsetY);
  
  // Apply shadow filter
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 8 * scale; 
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4 * scale; 
  
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth * scale;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // Draw all paths as a single shape to avoid overlapping shadows/strokes
  ctx.beginPath();
  
  for (const pathString of paths) {
    const commands = parseSvgPath(pathString, scale, scale);
    

    for (const { cmd, args } of commands) {
      if (cmd === 'M') {
        ctx.moveTo(args[0], args[1]);
      } else if (cmd === 'L') {
        ctx.lineTo(args[0], args[1]);
      }
    }
  }
  
  ctx.stroke();
  
  ctx.restore();
}

function renderText(
  ctx: CanvasRenderingContext2D,
  annotation: AnnotationRegion,
  x: number,
  y: number,
  width: number,
  height: number,
  scaleFactor: number
) {
  const style = annotation.style;
  
  ctx.save();
  
  const fontWeight = style.fontWeight === 'bold' ? 'bold' : 'normal';
  const fontStyle = style.fontStyle === 'italic' ? 'italic' : 'normal';
  const scaledFontSize = style.fontSize * scaleFactor;
  ctx.font = `${fontStyle} ${fontWeight} ${scaledFontSize}px ${style.fontFamily}`;
  ctx.textBaseline = 'middle';
  
  const containerPadding = 8 * scaleFactor;
  
  let textX = x;
  const textY = y + height / 2;
  
  if (style.textAlign === 'center') {
    textX = x + width / 2;
    ctx.textAlign = 'center';
  } else if (style.textAlign === 'right') {
    textX = x + width - containerPadding;
    ctx.textAlign = 'right';
  } else {
    textX = x + containerPadding;
    ctx.textAlign = 'left';
  }
  
  const lines = annotation.content.split('\n');
  const lineHeight = scaledFontSize * 1.4;

  const startY = textY - ((lines.length - 1) * lineHeight) / 2;
  
  lines.forEach((line, index) => {
    const currentY = startY + index * lineHeight;
    
    if (style.backgroundColor && style.backgroundColor !== 'transparent') {
      const metrics = ctx.measureText(line);
      const verticalPadding = scaledFontSize * 0.1;
      const horizontalPadding = scaledFontSize * 0.2;
      const borderRadius = 4 * scaleFactor;
      
      let bgX = textX - horizontalPadding;
      const bgWidth = metrics.width + horizontalPadding * 2;
      
      const contentHeight = scaledFontSize * 1.4;
      const bgHeight = contentHeight + verticalPadding * 2;
      const bgY = currentY - bgHeight / 2;
      
      if (style.textAlign === 'center') {
        bgX = textX - bgWidth / 2;
      } else if (style.textAlign === 'right') {
        bgX = textX - bgWidth;
      }
      
      ctx.fillStyle = style.backgroundColor;
      ctx.beginPath();
      ctx.roundRect(bgX, bgY, bgWidth, bgHeight, borderRadius);
      ctx.fill();
    }
    
    ctx.fillStyle = style.color;
    ctx.fillText(line, textX, currentY);
    
    if (style.textDecoration === 'underline') {
      const metrics = ctx.measureText(line);
      let underlineX = textX;
      const underlineY = currentY + scaledFontSize * 0.15;
      
      if (style.textAlign === 'center') {
        underlineX = textX - metrics.width / 2;
      } else if (style.textAlign === 'right') {
        underlineX = textX - metrics.width;
      }
      
      ctx.strokeStyle = style.color;
      ctx.lineWidth = Math.max(1, scaledFontSize / 16);
      ctx.beginPath();
      ctx.moveTo(underlineX, underlineY);
      ctx.lineTo(underlineX + metrics.width, underlineY);
      ctx.stroke();
    }
  });
  
  ctx.restore();
}

async function renderImage(
  ctx: CanvasRenderingContext2D,
  annotation: AnnotationRegion,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<void> {
  if (!annotation.content || !annotation.content.startsWith('data:image')) {
    return;
  }
  
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // Preserve aspect ratio - contain the image within the bounds
      const imgAspect = img.width / img.height;
      const boxAspect = width / height;
      
      let drawWidth = width;
      let drawHeight = height;
      let drawX = x;
      let drawY = y;
      
      if (imgAspect > boxAspect) {

        drawHeight = width / imgAspect;
        drawY = y + (height - drawHeight) / 2;
      } else {
        drawWidth = height * imgAspect;
        drawX = x + (width - drawWidth) / 2;
      }
      
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      resolve();
    };
    img.onerror = () => {
      console.error('[AnnotationRenderer] Failed to load image annotation');
      resolve();
    };
    img.src = annotation.content;
  });
}

export async function renderAnnotations(
  ctx: CanvasRenderingContext2D,
  annotations: AnnotationRegion[],
  canvasWidth: number,
  canvasHeight: number,
  currentTimeMs: number,
  scaleFactor: number = 1.0
): Promise<void> {
  // Filter active annotations at current time
  const activeAnnotations = annotations.filter(
    (ann) => currentTimeMs >= ann.startMs && currentTimeMs <= ann.endMs
  );
  
  // Sort by z-index (lower first, so higher z-index draws on top)
  const sortedAnnotations = [...activeAnnotations].sort((a, b) => a.zIndex - b.zIndex);
  
  for (const annotation of sortedAnnotations) {
    const x = (annotation.position.x / 100) * canvasWidth;
    const y = (annotation.position.y / 100) * canvasHeight;
    const width = (annotation.size.width / 100) * canvasWidth;
    const height = (annotation.size.height / 100) * canvasHeight;
    
    switch (annotation.type) {
      case 'text':
        renderText(ctx, annotation, x, y, width, height, scaleFactor);
        break;
        
      case 'image':
        await renderImage(ctx, annotation, x, y, width, height);
        break;
        
      case 'figure':
        if (annotation.figureData) {
          renderArrow(
            ctx,
            annotation.figureData.arrowDirection,
            annotation.figureData.color,
            annotation.figureData.strokeWidth,
            x,
            y,
            width,
            height,
            scaleFactor
          );
        }
        break;
    }
  }
}
