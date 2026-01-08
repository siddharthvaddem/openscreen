import type { ExportProgress, ExportResult } from './types';
import { VideoFileDecoder } from './videoDecoder';
import { FrameRenderer } from './frameRenderer';
import { GifEncoder } from './gifEncoder';
import type { ZoomRegion, CropRegion, TrimRegion, AnnotationRegion } from '@/components/video-editor/types';

interface GifExporterConfig {
  videoUrl: string;
  width: number;
  height: number;
  frameRate: number;
  wallpaper: string;
  zoomRegions: ZoomRegion[];
  trimRegions?: TrimRegion[];
  showShadow: boolean;
  shadowIntensity: number;
  showBlur: boolean;
  motionBlurEnabled?: boolean;
  borderRadius?: number;
  padding?: number;
  cropRegion: CropRegion;
  annotationRegions?: AnnotationRegion[];
  previewWidth?: number;
  previewHeight?: number;
  loop?: number;
  onProgress?: (progress: ExportProgress) => void;
}

export class GifExporter {
  private config: GifExporterConfig;
  private decoder: VideoFileDecoder | null = null;
  private renderer: FrameRenderer | null = null;
  private cancelled = false;

  constructor(config: GifExporterConfig) {
    this.config = config;
  }

  // Calculate the total duration excluding trim regions (in seconds)
  private getEffectiveDuration(totalDuration: number): number {
    const trimRegions = this.config.trimRegions || [];
    const totalTrimDuration = trimRegions.reduce((sum, region) => {
      return sum + (region.endMs - region.startMs) / 1000;
    }, 0);
    return totalDuration - totalTrimDuration;
  }

  private mapEffectiveToSourceTime(effectiveTimeMs: number): number {
    const trimRegions = this.config.trimRegions || [];
    const sortedTrims = [...trimRegions].sort((a, b) => a.startMs - b.startMs);

    let sourceTimeMs = effectiveTimeMs;

    for (const trim of sortedTrims) {
      if (sourceTimeMs < trim.startMs) {
        break;
      }
      const trimDuration = trim.endMs - trim.startMs;
      sourceTimeMs += trimDuration;
    }

    return sourceTimeMs;
  }

  async export(): Promise<ExportResult> {
    try {
      this.cleanup();
      this.cancelled = false;

      this.decoder = new VideoFileDecoder();
      const videoInfo = await this.decoder.loadVideo(this.config.videoUrl);

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

      const videoElement = this.decoder.getVideoElement();
      if (!videoElement) {
        throw new Error('Video element not available');
      }

      const effectiveDuration = this.getEffectiveDuration(videoInfo.duration);
      const totalFrames = Math.ceil(effectiveDuration * this.config.frameRate);
      const frameDurationMs = 1000 / this.config.frameRate;
      const timeStep = 1 / this.config.frameRate;

      const encoder = new GifEncoder({
        width: this.config.width,
        height: this.config.height,
        loop: this.config.loop ?? 0,
      });

      const canvas = this.renderer.getCanvas();
      const canvasContext = canvas.getContext('2d', { willReadFrequently: true });
      if (!canvasContext) {
        throw new Error('Failed to get canvas context for GIF export');
      }

      let frameIndex = 0;

      while (frameIndex < totalFrames && !this.cancelled) {
        const i = frameIndex;
        const effectiveTimeMs = i * timeStep * 1000;
        const sourceTimeMs = this.mapEffectiveToSourceTime(effectiveTimeMs);
        const videoTime = sourceTimeMs / 1000;

        const needsSeek = Math.abs(videoElement.currentTime - videoTime) > 0.001;
        if (needsSeek) {
          const seekedPromise = new Promise<void>(resolve => {
            videoElement.addEventListener('seeked', () => resolve(), { once: true });
          });
          videoElement.currentTime = videoTime;
          await seekedPromise;
        } else if (i === 0) {
          await new Promise<void>(resolve => {
            videoElement.requestVideoFrameCallback(() => resolve());
          });
        }

        const sourceTimestamp = sourceTimeMs * 1000;
        const videoFrame = new VideoFrame(videoElement, { timestamp: sourceTimestamp });
        await this.renderer.renderFrame(videoFrame, sourceTimestamp);
        videoFrame.close();

        const imageData = canvasContext.getImageData(0, 0, this.config.width, this.config.height);
        encoder.addFrame(imageData, frameDurationMs);

        frameIndex++;

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

      const gifData = encoder.finish();
      const blob = new Blob([gifData], { type: 'image/gif' });

      return { success: true, blob };
    } catch (error) {
      console.error('GIF export error:', error);
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
    this.cleanup();
  }

  private cleanup(): void {
    if (this.decoder) {
      try {
        this.decoder.destroy();
      } catch (error) {
        console.warn('Error destroying decoder:', error);
      }
      this.decoder = null;
    }

    if (this.renderer) {
      try {
        this.renderer.destroy();
      } catch (error) {
        console.warn('Error destroying renderer:', error);
      }
      this.renderer = null;
    }
  }
}
