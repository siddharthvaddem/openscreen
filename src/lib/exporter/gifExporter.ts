import GIF from 'gif.js';
import type { ExportProgress, ExportResult, GifFrameRate, GifSizePreset, GIF_SIZE_PRESETS } from './types';
import { VideoFileDecoder } from './videoDecoder';
import { FrameRenderer } from './frameRenderer';
import type { ZoomRegion, CropRegion, TrimRegion, AnnotationRegion } from '@/components/video-editor/types';

const GIF_WORKER_URL = new URL('gif.js/dist/gif.worker.js', import.meta.url).toString();

interface GifExporterConfig {
  videoUrl: string;
  width: number;
  height: number;
  frameRate: GifFrameRate;
  loop: boolean;
  sizePreset: GifSizePreset;
  wallpaper: string;
  zoomRegions: ZoomRegion[];
  trimRegions?: TrimRegion[];
  showShadow: boolean;
  shadowIntensity: number;
  showBlur: boolean;
  motionBlurEnabled?: boolean;
  borderRadius?: number;
  padding?: number;
  videoPadding?: number;
  cropRegion: CropRegion;
  annotationRegions?: AnnotationRegion[];
  previewWidth?: number;
  previewHeight?: number;
  onProgress?: (progress: ExportProgress) => void;
}

/**
 * Calculate output dimensions based on size preset and source dimensions while preserving aspect ratio.
 * @param sourceWidth - Original video width
 * @param sourceHeight - Original video height
 * @param sizePreset - The size preset to use
 * @param sizePresets - The size presets configuration
 * @returns The calculated output dimensions
 */
export function calculateOutputDimensions(
  sourceWidth: number,
  sourceHeight: number,
  sizePreset: GifSizePreset,
  sizePresets: typeof GIF_SIZE_PRESETS
): { width: number; height: number } {
  const preset = sizePresets[sizePreset];
  const maxHeight = preset.maxHeight;

  // If original is smaller than max height or preset is 'original', use source dimensions
  if (sourceHeight <= maxHeight || sizePreset === 'original') {
    return { width: sourceWidth, height: sourceHeight };
  }

  // Calculate scaled dimensions preserving aspect ratio
  const aspectRatio = sourceWidth / sourceHeight;
  const newHeight = maxHeight;
  const newWidth = Math.round(newHeight * aspectRatio);

  // Ensure dimensions are even (required for some encoders)
  return {
    width: newWidth % 2 === 0 ? newWidth : newWidth + 1,
    height: newHeight % 2 === 0 ? newHeight : newHeight + 1,
  };
}

export class GifExporter {
  private config: GifExporterConfig;
  private decoder: VideoFileDecoder | null = null;
  private renderer: FrameRenderer | null = null;
  private gif: GIF | null = null;
  private cancelled = false;

  constructor(config: GifExporterConfig) {
    this.config = config;
  }

  /**
   * Calculate the total duration excluding trim regions (in seconds)
   */
  private getEffectiveDuration(totalDuration: number): number {
    const trimRegions = this.config.trimRegions || [];
    const totalTrimDuration = trimRegions.reduce((sum, region) => {
      return sum + (region.endMs - region.startMs) / 1000;
    }, 0);
    return totalDuration - totalTrimDuration;
  }

  /**
   * Map effective time (excluding trims) to source time (including trims)
   */
  private mapEffectiveToSourceTime(effectiveTimeMs: number): number {
    const trimRegions = this.config.trimRegions || [];
    // Sort trim regions by start time
    const sortedTrims = [...trimRegions].sort((a, b) => a.startMs - b.startMs);

    let sourceTimeMs = effectiveTimeMs;

    for (const trim of sortedTrims) {
      // If the source time hasn't reached this trim region yet, we're done
      if (sourceTimeMs < trim.startMs) {
        break;
      }

      // Add the duration of this trim region to the source time
      const trimDuration = trim.endMs - trim.startMs;
      sourceTimeMs += trimDuration;
    }

    return sourceTimeMs;
  }

  async export(): Promise<ExportResult> {
    try {
      this.cleanup();
      this.cancelled = false;

      // Initialize decoder and load video
      this.decoder = new VideoFileDecoder();
      const videoInfo = await this.decoder.loadVideo(this.config.videoUrl);

      // Initialize frame renderer
      this.renderer = new FrameRenderer({
        width: this.config.width,
        height: this.config.height,
        wallpaper: this.config.wallpaper,
        zoomRegions: this.config.zoomRegions,
        showShadow: this.config.showShadow,
        shadowIntensity: this.config.shadowIntensity,
        showBlur: this.config.showBlur,
        motionBlurEnabled: this.config.motionBlurEnabled,
        borderRadius: this.config.borderRadius,
        padding: this.config.padding,
        cropRegion: this.config.cropRegion,
        videoWidth: videoInfo.width,
        videoHeight: videoInfo.height,
        annotationRegions: this.config.annotationRegions,
        previewWidth: this.config.previewWidth,
        previewHeight: this.config.previewHeight,
      });
      await this.renderer.initialize();

      // Initialize GIF encoder
      // Loop: 0 = infinite loop, 1 = play once (no loop)
      const repeat = this.config.loop ? 0 : 1;
      
      this.gif = new GIF({
        workers: 4,
        quality: 10,
        width: this.config.width,
        height: this.config.height,
        workerScript: GIF_WORKER_URL,
        repeat,
        background: '#000000',
        transparent: null,
        dither: 'FloydSteinberg',
      });

      // Get the video element for frame extraction
      const videoElement = this.decoder.getVideoElement();
      if (!videoElement) {
        throw new Error('Video element not available');
      }

      // Calculate effective duration and frame count (excluding trim regions)
      const effectiveDuration = this.getEffectiveDuration(videoInfo.duration);
      const totalFrames = Math.ceil(effectiveDuration * this.config.frameRate);
      
      // Calculate frame delay in milliseconds (gif.js uses ms)
      const frameDelay = Math.round(1000 / this.config.frameRate);

      console.log('[GifExporter] Original duration:', videoInfo.duration, 's');
      console.log('[GifExporter] Effective duration:', effectiveDuration, 's');
      console.log('[GifExporter] Total frames to export:', totalFrames);
      console.log('[GifExporter] Frame rate:', this.config.frameRate, 'FPS');
      console.log('[GifExporter] Frame delay:', frameDelay, 'ms');
      console.log('[GifExporter] Loop:', this.config.loop ? 'infinite' : 'once');

      // Process frames
      const timeStep = 1 / this.config.frameRate;
      let frameIndex = 0;

      while (frameIndex < totalFrames && !this.cancelled) {
        const i = frameIndex;
        const timestamp = i * (1_000_000 / this.config.frameRate); // in microseconds

        // Map effective time to source time (accounting for trim regions)
        const effectiveTimeMs = (i * timeStep) * 1000;
        const sourceTimeMs = this.mapEffectiveToSourceTime(effectiveTimeMs);
        const videoTime = sourceTimeMs / 1000;

        // Seek if needed
        const needsSeek = Math.abs(videoElement.currentTime - videoTime) > 0.001;

        if (needsSeek) {
          const seekedPromise = new Promise<void>(resolve => {
            videoElement.addEventListener('seeked', () => resolve(), { once: true });
          });
          
          videoElement.currentTime = videoTime;
          await seekedPromise;
        } else if (i === 0) {
          // Only for the very first frame, wait for it to be ready
          await new Promise<void>(resolve => {
            videoElement.requestVideoFrameCallback(() => resolve());
          });
        }

        // Create a VideoFrame from the video element
        const videoFrame = new VideoFrame(videoElement, {
          timestamp,
        });

        // Render the frame with all effects using source timestamp
        const sourceTimestamp = sourceTimeMs * 1000; // Convert to microseconds
        await this.renderer!.renderFrame(videoFrame, sourceTimestamp);
        
        videoFrame.close();

        // Get the rendered canvas and add to GIF
        const canvas = this.renderer!.getCanvas();
        
        // Add frame to GIF encoder with delay
        this.gif!.addFrame(canvas, { delay: frameDelay, copy: true });

        frameIndex++;

        // Update progress
        if (this.config.onProgress) {
          this.config.onProgress({
            currentFrame: frameIndex,
            totalFrames,
            percentage: (frameIndex / totalFrames) * 100,
            estimatedTimeRemaining: 0,
          });
        }
      }

      if (this.cancelled) {
        return { success: false, error: 'Export cancelled' };
      }

      // Update progress to show we're now in the finalizing phase
      if (this.config.onProgress) {
        this.config.onProgress({
          currentFrame: totalFrames,
          totalFrames,
          percentage: 100,
          estimatedTimeRemaining: 0,
          phase: 'finalizing',
        });
      }

      // Render the GIF
      const blob = await new Promise<Blob>((resolve, _reject) => {
        this.gif!.on('finished', (blob: Blob) => {
          resolve(blob);
        });

        // Track rendering progress
        this.gif!.on('progress', (progress: number) => {
          if (this.config.onProgress) {
            this.config.onProgress({
              currentFrame: totalFrames,
              totalFrames,
              percentage: 100,
              estimatedTimeRemaining: 0,
              phase: 'finalizing',
              renderProgress: Math.round(progress * 100),
            });
          }
        });

        // gif.js doesn't have a typed 'error' event, but we can catch errors in the try/catch
        this.gif!.render();
      });

      return { success: true, blob };
    } catch (error) {
      console.error('GIF Export error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      this.cleanup();
    }
  }

  cancel(): void {
    this.cancelled = true;
    if (this.gif) {
      this.gif.abort();
    }
    this.cleanup();
  }

  private cleanup(): void {
    if (this.decoder) {
      try {
        this.decoder.destroy();
      } catch (e) {
        console.warn('Error destroying decoder:', e);
      }
      this.decoder = null;
    }

    if (this.renderer) {
      try {
        this.renderer.destroy();
      } catch (e) {
        console.warn('Error destroying renderer:', e);
      }
      this.renderer = null;
    }

    this.gif = null;
  }
}
