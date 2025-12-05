/**
 * OffscreenCanvas-based renderer for Web Worker usage
 * 
 * This renderer replicates the visual effects of FrameRenderer
 * but uses pure Canvas 2D API instead of PixiJS, allowing it
 * to run in a Web Worker.
 */

import type { ZoomRegion, CropRegion, AnnotationRegion } from '@/components/video-editor/types';
import { ZOOM_DEPTH_SCALES } from '@/components/video-editor/types';

// Constants from videoPlayback
const DEFAULT_FOCUS = { cx: 0.5, cy: 0.5 };
const SMOOTHING_FACTOR = 0.15;
const MIN_DELTA = 0.0001;

export interface OffscreenRenderConfig {
    width: number;
    height: number;
    wallpaper: string;
    zoomRegions: ZoomRegion[];
    showShadow: boolean;
    shadowIntensity: number;
    showBlur: boolean;
    motionBlurEnabled?: boolean;
    borderRadius?: number;
    padding?: number;
    cropRegion: CropRegion;
    videoWidth: number;
    videoHeight: number;
    annotationRegions?: AnnotationRegion[];
    previewWidth?: number;
    previewHeight?: number;
}

interface AnimationState {
    scale: number;
    focusX: number;
    focusY: number;
}

interface LayoutCache {
    stageSize: { width: number; height: number };
    videoSize: { width: number; height: number };
    baseScale: number;
    baseOffset: { x: number; y: number };
    maskRect: { x: number; y: number; width: number; height: number };
}

/**
 * High-performance renderer using OffscreenCanvas
 * Can run in Web Worker for parallel processing
 */
export class OffscreenRenderer {
    private canvas: OffscreenCanvas;
    private ctx: OffscreenCanvasRenderingContext2D;
    private backgroundCanvas: OffscreenCanvas | null = null;
    private backgroundCtx: OffscreenCanvasRenderingContext2D | null = null;
    private videoCanvas: OffscreenCanvas;
    private videoCtx: OffscreenCanvasRenderingContext2D;
    private shadowCanvas: OffscreenCanvas | null = null;
    private shadowCtx: OffscreenCanvasRenderingContext2D | null = null;
    private config: OffscreenRenderConfig;
    private animationState: AnimationState;
    private layoutCache: LayoutCache | null = null;
    private currentVideoTime = 0;

    constructor(config: OffscreenRenderConfig) {
        this.config = config;
        this.animationState = {
            scale: 1,
            focusX: DEFAULT_FOCUS.cx,
            focusY: DEFAULT_FOCUS.cy,
        };

        // Create main output canvas
        this.canvas = new OffscreenCanvas(config.width, config.height);
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: false })!;

        // Create video layer canvas (for zoom/transform)
        this.videoCanvas = new OffscreenCanvas(config.width, config.height);
        this.videoCtx = this.videoCanvas.getContext('2d', { willReadFrequently: false })!;

        // Create shadow canvas if needed
        if (config.showShadow) {
            this.shadowCanvas = new OffscreenCanvas(config.width, config.height);
            this.shadowCtx = this.shadowCanvas.getContext('2d', { willReadFrequently: false })!;
        }
    }

    /**
     * Initialize the renderer (load background, etc.)
     */
    async initialize(): Promise<void> {
        await this.setupBackground();
        this.updateLayout();
    }

    /**
     * Setup background canvas
     */
    private async setupBackground(): Promise<void> {
        const wallpaper = this.config.wallpaper;
        const { width, height } = this.config;

        this.backgroundCanvas = new OffscreenCanvas(width, height);
        this.backgroundCtx = this.backgroundCanvas.getContext('2d')!;
        const bgCtx = this.backgroundCtx;

        try {
            if (wallpaper.startsWith('file://') || wallpaper.startsWith('data:') ||
                wallpaper.startsWith('/') || wallpaper.startsWith('http')) {
                // Image background
                const response = await fetch(wallpaper);
                const blob = await response.blob();
                const imageBitmap = await createImageBitmap(blob);

                // Cover and center positioning
                const imgAspect = imageBitmap.width / imageBitmap.height;
                const canvasAspect = width / height;

                let drawWidth, drawHeight, drawX, drawY;

                if (imgAspect > canvasAspect) {
                    drawHeight = height;
                    drawWidth = drawHeight * imgAspect;
                    drawX = (width - drawWidth) / 2;
                    drawY = 0;
                } else {
                    drawWidth = width;
                    drawHeight = drawWidth / imgAspect;
                    drawX = 0;
                    drawY = (height - drawHeight) / 2;
                }

                bgCtx.drawImage(imageBitmap, drawX, drawY, drawWidth, drawHeight);
                imageBitmap.close();
            } else if (wallpaper.startsWith('#')) {
                // Solid color
                bgCtx.fillStyle = wallpaper;
                bgCtx.fillRect(0, 0, width, height);
            } else if (wallpaper.startsWith('linear-gradient') || wallpaper.startsWith('radial-gradient')) {
                // Gradient
                const gradientMatch = wallpaper.match(/(linear|radial)-gradient\((.+)\)/);
                if (gradientMatch) {
                    const [, type, params] = gradientMatch;
                    const parts = params.split(',').map(s => s.trim());

                    let gradient: CanvasGradient;

                    if (type === 'linear') {
                        gradient = bgCtx.createLinearGradient(0, 0, 0, height);
                        parts.forEach((part, index) => {
                            if (part.startsWith('to ') || part.includes('deg')) return;
                            const colorMatch = part.match(/^(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|[a-z]+)/);
                            if (colorMatch) {
                                const color = colorMatch[1];
                                const position = index / (parts.length - 1);
                                gradient.addColorStop(position, color);
                            }
                        });
                    } else {
                        const cx = width / 2;
                        const cy = height / 2;
                        const radius = Math.max(width, height) / 2;
                        gradient = bgCtx.createRadialGradient(cx, cy, 0, cx, cy, radius);
                        parts.forEach((part, index) => {
                            const colorMatch = part.match(/^(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|[a-z]+)/);
                            if (colorMatch) {
                                const color = colorMatch[1];
                                const position = index / (parts.length - 1);
                                gradient.addColorStop(position, color);
                            }
                        });
                    }

                    bgCtx.fillStyle = gradient;
                    bgCtx.fillRect(0, 0, width, height);
                } else {
                    bgCtx.fillStyle = '#000000';
                    bgCtx.fillRect(0, 0, width, height);
                }
            } else {
                bgCtx.fillStyle = wallpaper;
                bgCtx.fillRect(0, 0, width, height);
            }
        } catch (error) {
            console.error('[OffscreenRenderer] Error setting up background:', error);
            bgCtx.fillStyle = '#000000';
            bgCtx.fillRect(0, 0, width, height);
        }
    }

    /**
     * Update layout cache
     */
    private updateLayout(): void {
        const { width, height, cropRegion, borderRadius: _borderRadius = 0, padding = 0 } = this.config;
        const { videoWidth, videoHeight } = this.config;

        // Calculate cropped video dimensions
        const cropStartX = cropRegion.x;
        const cropStartY = cropRegion.y;
        const cropEndX = cropRegion.x + cropRegion.width;
        const cropEndY = cropRegion.y + cropRegion.height;

        const croppedVideoWidth = videoWidth * (cropEndX - cropStartX);
        const croppedVideoHeight = videoHeight * (cropEndY - cropStartY);

        // Calculate scale to fit in viewport (padding is 0-100, where 50% ~ 0.8 scale)
        const paddingScale = 1.0 - (padding / 100) * 0.4;
        const viewportWidth = width * paddingScale;
        const viewportHeight = height * paddingScale;
        const scale = Math.min(viewportWidth / croppedVideoWidth, viewportHeight / croppedVideoHeight);

        // Calculate positions
        const croppedDisplayWidth = croppedVideoWidth * scale;
        const croppedDisplayHeight = croppedVideoHeight * scale;
        const centerOffsetX = (width - croppedDisplayWidth) / 2;
        const centerOffsetY = (height - croppedDisplayHeight) / 2;

        this.layoutCache = {
            stageSize: { width, height },
            videoSize: { width: croppedVideoWidth, height: croppedVideoHeight },
            baseScale: scale,
            baseOffset: { x: centerOffsetX, y: centerOffsetY },
            maskRect: { x: 0, y: 0, width: croppedDisplayWidth, height: croppedDisplayHeight },
        };
    }

    /**
     * Render a video frame with all effects
     */
    async renderFrame(videoFrame: VideoFrame, timestamp: number): Promise<VideoFrame> {
        if (!this.layoutCache) {
            throw new Error('Renderer not initialized');
        }

        this.currentVideoTime = timestamp / 1_000_000;
        const timeMs = this.currentVideoTime * 1000;

        // Update animation state
        this.updateAnimationState(timeMs);

        // Clear video canvas
        this.videoCtx.clearRect(0, 0, this.config.width, this.config.height);

        // Calculate transform for zoom effect
        const { scale: zoomScale, focusX, focusY } = this.animationState;
        const { maskRect, baseOffset, baseScale } = this.layoutCache;
        const { cropRegion, videoWidth, videoHeight } = this.config;

        // Calculate crop offset
        const cropStartX = cropRegion.x;
        const cropStartY = cropRegion.y;
        const cropPixelX = cropStartX * videoWidth * baseScale;
        const cropPixelY = cropStartY * videoHeight * baseScale;

        // Apply zoom transform
        const centerX = this.config.width / 2;
        const centerY = this.config.height / 2;

        // Calculate focus offset
        const focusOffsetX = (focusX - 0.5) * maskRect.width;
        const focusOffsetY = (focusY - 0.5) * maskRect.height;

        this.videoCtx.save();

        // Draw rounded rect clip path
        this.drawRoundedRect(
            this.videoCtx,
            baseOffset.x,
            baseOffset.y,
            maskRect.width,
            maskRect.height,
            this.config.borderRadius || 0
        );
        this.videoCtx.clip();

        // Apply zoom transform
        this.videoCtx.translate(centerX, centerY);
        this.videoCtx.scale(zoomScale, zoomScale);
        this.videoCtx.translate(-centerX - focusOffsetX, -centerY - focusOffsetY);

        // Draw video frame
        this.videoCtx.drawImage(
            videoFrame,
            baseOffset.x - cropPixelX,
            baseOffset.y - cropPixelY,
            videoWidth * baseScale,
            videoHeight * baseScale
        );

        this.videoCtx.restore();

        // Composite final output
        this.compositeWithShadows();

        // Create output VideoFrame
        const outputFrame = new VideoFrame(this.canvas, {
            timestamp,
            duration: videoFrame.duration ?? undefined,
        });

        return outputFrame;
    }

    /**
     * Draw a rounded rectangle path
     */
    private drawRoundedRect(
        ctx: OffscreenCanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
        radius: number
    ): void {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    /**
     * Find dominant zoom region for current time
     */
    private findDominantRegion(zoomRegions: ZoomRegion[], timeMs: number): { region: ZoomRegion | null; strength: number } {
        let dominantRegion: ZoomRegion | null = null;
        let maxStrength = 0;
        const blendDuration = 300; // ms

        for (const region of zoomRegions) {
            let strength = 0;

            if (timeMs >= region.startMs && timeMs <= region.endMs) {
                // Inside region
                const fadeInEnd = region.startMs + blendDuration;
                const fadeOutStart = region.endMs - blendDuration;

                if (timeMs < fadeInEnd) {
                    strength = (timeMs - region.startMs) / blendDuration;
                } else if (timeMs > fadeOutStart) {
                    strength = (region.endMs - timeMs) / blendDuration;
                } else {
                    strength = 1;
                }

                if (strength > maxStrength) {
                    maxStrength = strength;
                    dominantRegion = region;
                }
            }
        }

        return { region: dominantRegion, strength: Math.min(1, Math.max(0, maxStrength)) };
    }

    /**
     * Update animation state based on current time
     */
    private updateAnimationState(timeMs: number): number {
        if (!this.layoutCache) return 0;

        const { region, strength } = this.findDominantRegion(this.config.zoomRegions, timeMs);

        const defaultFocus = DEFAULT_FOCUS;
        let targetScaleFactor = 1;
        let targetFocus = { ...defaultFocus };

        if (region && strength > 0) {
            const zoomScale = ZOOM_DEPTH_SCALES[region.depth];
            targetScaleFactor = 1 + (zoomScale - 1) * strength;
            targetFocus = {
                cx: defaultFocus.cx + (region.focus.cx - defaultFocus.cx) * strength,
                cy: defaultFocus.cy + (region.focus.cy - defaultFocus.cy) * strength,
            };
        }

        const state = this.animationState;
        const prevScale = state.scale;
        const prevFocusX = state.focusX;
        const prevFocusY = state.focusY;

        const scaleDelta = targetScaleFactor - state.scale;
        const focusXDelta = targetFocus.cx - state.focusX;
        const focusYDelta = targetFocus.cy - state.focusY;

        let nextScale = prevScale;
        let nextFocusX = prevFocusX;
        let nextFocusY = prevFocusY;

        if (Math.abs(scaleDelta) > MIN_DELTA) {
            nextScale = prevScale + scaleDelta * SMOOTHING_FACTOR;
        } else {
            nextScale = targetScaleFactor;
        }

        if (Math.abs(focusXDelta) > MIN_DELTA) {
            nextFocusX = prevFocusX + focusXDelta * SMOOTHING_FACTOR;
        } else {
            nextFocusX = targetFocus.cx;
        }

        if (Math.abs(focusYDelta) > MIN_DELTA) {
            nextFocusY = prevFocusY + focusYDelta * SMOOTHING_FACTOR;
        } else {
            nextFocusY = targetFocus.cy;
        }

        state.scale = nextScale;
        state.focusX = nextFocusX;
        state.focusY = nextFocusY;

        return Math.max(
            Math.abs(nextScale - prevScale),
            Math.abs(nextFocusX - prevFocusX),
            Math.abs(nextFocusY - prevFocusY)
        );
    }

    /**
     * Composite video with background and shadows
     */
    private compositeWithShadows(): void {
        const ctx = this.ctx;
        const w = this.config.width;
        const h = this.config.height;

        // Clear output canvas
        ctx.clearRect(0, 0, w, h);

        // Draw background (with optional blur)
        if (this.backgroundCanvas) {
            if (this.config.showBlur) {
                ctx.save();
                ctx.filter = 'blur(6px)';
                ctx.drawImage(this.backgroundCanvas, 0, 0, w, h);
                ctx.restore();
            } else {
                ctx.drawImage(this.backgroundCanvas, 0, 0, w, h);
            }
        }

        // Draw video with shadows
        if (this.config.showShadow && this.config.shadowIntensity > 0 && this.shadowCanvas && this.shadowCtx) {
            const shadowCtx = this.shadowCtx;
            shadowCtx.clearRect(0, 0, w, h);
            shadowCtx.save();

            const intensity = this.config.shadowIntensity;
            const baseBlur1 = 48 * intensity;
            const baseBlur2 = 16 * intensity;
            const baseBlur3 = 8 * intensity;
            const baseAlpha1 = 0.7 * intensity;
            const baseAlpha2 = 0.5 * intensity;
            const baseAlpha3 = 0.3 * intensity;
            const baseOffset = 12 * intensity;

            shadowCtx.filter = `drop-shadow(0 ${baseOffset}px ${baseBlur1}px rgba(0,0,0,${baseAlpha1})) drop-shadow(0 ${baseOffset / 3}px ${baseBlur2}px rgba(0,0,0,${baseAlpha2})) drop-shadow(0 ${baseOffset / 6}px ${baseBlur3}px rgba(0,0,0,${baseAlpha3}))`;
            shadowCtx.drawImage(this.videoCanvas, 0, 0, w, h);
            shadowCtx.restore();
            ctx.drawImage(this.shadowCanvas, 0, 0, w, h);
        } else {
            ctx.drawImage(this.videoCanvas, 0, 0, w, h);
        }
    }

    /**
     * Get the output canvas
     */
    getCanvas(): OffscreenCanvas {
        return this.canvas;
    }

    /**
     * Clean up resources
     */
    destroy(): void {
        // OffscreenCanvas doesn't need explicit cleanup
        this.backgroundCanvas = null;
        this.backgroundCtx = null;
        this.shadowCanvas = null;
        this.shadowCtx = null;
        this.layoutCache = null;
    }
}

/**
 * Check if OffscreenCanvas is available
 */
export function isOffscreenCanvasSupported(): boolean {
    return typeof OffscreenCanvas !== 'undefined';
}
