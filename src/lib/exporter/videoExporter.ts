import type { ExportConfig, ExportProgress, ExportResult } from './types';
import { VideoFileDecoder } from './videoDecoder';
import { FrameRenderer } from './frameRenderer';
import { VideoMuxer } from './muxer';
import type { ZoomRegion, CropRegion, TrimRegion, AnnotationRegion } from '@/components/video-editor/types';

interface VideoExporterConfig extends ExportConfig {
  videoUrl: string;
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

export class VideoExporter {
  private config: VideoExporterConfig;
  private decoder: VideoFileDecoder | null = null;
  private renderer: FrameRenderer | null = null;
  private encoder: VideoEncoder | null = null;
  private muxer: VideoMuxer | null = null;
  private cancelled = false;
  private encodeQueue = 0;
  private readonly MAX_ENCODE_QUEUE = 120;
  private videoDescription: Uint8Array | undefined;
  private videoColorSpace: VideoColorSpaceInit | undefined;
  private muxingPromises: Promise<void>[] = [];
  private chunkCount = 0;

  constructor(config: VideoExporterConfig) {
    this.config = config;
  }

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

  private hasTrimRegions(): boolean {
    return (this.config.trimRegions?.length ?? 0) > 0;
  }

  async export(): Promise<ExportResult> {
    try {
      this.cleanup();
      this.cancelled = false;

      console.log('[VideoExporter] Starting export...');
      console.time('export-total');

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

      await this.initializeEncoder();

      this.muxer = new VideoMuxer(this.config, false);
      await this.muxer.initialize();

      const videoElement = this.decoder.getVideoElement();
      if (!videoElement) {
        throw new Error('Video element not available');
      }

      const effectiveDuration = this.getEffectiveDuration(videoInfo.duration);
      const totalFrames = Math.ceil(effectiveDuration * this.config.frameRate);

      console.log('[VideoExporter] Original duration:', videoInfo.duration, 's');
      console.log('[VideoExporter] Effective duration:', effectiveDuration, 's');
      console.log('[VideoExporter] Total frames to export:', totalFrames);

      // Choose extraction method based on whether we have trim regions
      if (this.hasTrimRegions()) {
        console.log('[VideoExporter] Using seek-based extraction (has trim regions)');
        await this.exportWithSeek(videoElement, totalFrames);
      } else {
        console.log('[VideoExporter] Using playback-based extraction (faster)');
        await this.exportWithPlayback(videoElement, totalFrames);
      }

      console.timeEnd('export-total');

      if (this.cancelled) {
        return { success: false, error: 'Export cancelled' };
      }

      if (this.encoder && this.encoder.state === 'configured') {
        await this.encoder.flush();
      }

      await Promise.all(this.muxingPromises);
      const blob = await this.muxer!.finalize();

      return { success: true, blob };
    } catch (error) {
      console.error('Export error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      this.cleanup();
    }
  }

  /**
   * Export using playback-based extraction (faster, no trim support)
   * Uses requestVideoFrameCallback for efficient frame capture
   */
  private async exportWithPlayback(
    videoElement: HTMLVideoElement,
    totalFrames: number
  ): Promise<void> {
    const frameDuration = 1_000_000 / this.config.frameRate;
    let frameIndex = 0;
    let lastCapturedFrame = -1;

    videoElement.currentTime = 0;
    videoElement.muted = true;
    videoElement.playbackRate = 2.0; // 2x speed for faster extraction

    await new Promise<void>(resolve => {
      videoElement.addEventListener('canplay', () => resolve(), { once: true });
    });

    return new Promise<void>((resolve, reject) => {
      const captureFrame = async () => {
        if (this.cancelled) {
          videoElement.pause();
          resolve();
          return;
        }

        const currentTime = videoElement.currentTime;
        const currentFrameIndex = Math.floor(currentTime * this.config.frameRate);

        while (lastCapturedFrame < currentFrameIndex && frameIndex < totalFrames && !this.cancelled) {
          lastCapturedFrame++;

          const timestamp = lastCapturedFrame * frameDuration;
          const sourceTimeMs = (lastCapturedFrame / this.config.frameRate) * 1000;

          try {
            const videoFrame = new VideoFrame(videoElement, { timestamp });
            const sourceTimestamp = sourceTimeMs * 1000;
            await this.renderer!.renderFrame(videoFrame, sourceTimestamp);
            videoFrame.close();

            const canvas = this.renderer!.getCanvas();
            // @ts-ignore
            const exportFrame = new VideoFrame(canvas, {
              timestamp,
              duration: frameDuration,
            });

            while (this.encodeQueue >= this.MAX_ENCODE_QUEUE && !this.cancelled) {
              await new Promise(r => setTimeout(r, 0));
            }

            if (this.encoder && this.encoder.state === 'configured') {
              this.encodeQueue++;
              this.encoder.encode(exportFrame, { keyFrame: frameIndex % 150 === 0 });
            }

            exportFrame.close();
            frameIndex++;

            if (this.config.onProgress) {
              this.config.onProgress({
                currentFrame: frameIndex,
                totalFrames,
                percentage: (frameIndex / totalFrames) * 100,
                estimatedTimeRemaining: 0,
              });
            }
          } catch (error) {
            console.error('[VideoExporter] Error capturing frame:', error);
          }
        }

        if (frameIndex < totalFrames && !this.cancelled && !videoElement.ended) {
          if ('requestVideoFrameCallback' in videoElement) {
            (videoElement as any).requestVideoFrameCallback(captureFrame);
          } else {
            requestAnimationFrame(captureFrame);
          }
        }
      };

      videoElement.addEventListener('ended', () => {
        console.log('[VideoExporter] Playback ended, captured', frameIndex, 'frames');
        resolve();
      }, { once: true });

      videoElement.addEventListener('error', (e) => {
        reject(new Error(`Video playback error: ${e}`));
      }, { once: true });

      if ('requestVideoFrameCallback' in videoElement) {
        (videoElement as any).requestVideoFrameCallback(captureFrame);
      } else {
        requestAnimationFrame(captureFrame);
      }

      videoElement.play().catch(reject);
    });
  }

  /**
   * Export using seek-based extraction (slower, supports trim regions)
   */
  private async exportWithSeek(
    videoElement: HTMLVideoElement,
    totalFrames: number
  ): Promise<void> {
    const frameDuration = 1_000_000 / this.config.frameRate;
    let frameIndex = 0;
    const timeStep = 1 / this.config.frameRate;

    while (frameIndex < totalFrames && !this.cancelled) {
      const i = frameIndex;
      const timestamp = i * frameDuration;

      const effectiveTimeMs = (i * timeStep) * 1000;
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
          if ('requestVideoFrameCallback' in videoElement) {
            (videoElement as any).requestVideoFrameCallback(() => resolve());
          } else {
            setTimeout(resolve, 16);
          }
        });
      }

      const videoFrame = new VideoFrame(videoElement, { timestamp });
      const sourceTimestamp = sourceTimeMs * 1000;
      await this.renderer!.renderFrame(videoFrame, sourceTimestamp);
      videoFrame.close();

      const canvas = this.renderer!.getCanvas();
      // @ts-ignore
      const exportFrame = new VideoFrame(canvas, {
        timestamp,
        duration: frameDuration,
      });

      while (this.encodeQueue >= this.MAX_ENCODE_QUEUE && !this.cancelled) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      if (this.encoder && this.encoder.state === 'configured') {
        this.encodeQueue++;
        this.encoder.encode(exportFrame, { keyFrame: i % 150 === 0 });
      }

      exportFrame.close();
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
  }

  private async initializeEncoder(): Promise<void> {
    this.encodeQueue = 0;
    this.muxingPromises = [];
    this.chunkCount = 0;
    let videoDescription: Uint8Array | undefined;

    this.encoder = new VideoEncoder({
      output: (chunk, meta) => {
        if (meta?.decoderConfig?.description && !videoDescription) {
          const desc = meta.decoderConfig.description;
          videoDescription = new Uint8Array(desc instanceof ArrayBuffer ? desc : (desc as any));
          this.videoDescription = videoDescription;
        }
        if (meta?.decoderConfig?.colorSpace && !this.videoColorSpace) {
          this.videoColorSpace = meta.decoderConfig.colorSpace;
        }

        const isFirstChunk = this.chunkCount === 0;
        this.chunkCount++;

        const muxingPromise = (async () => {
          try {
            if (isFirstChunk && this.videoDescription) {
              const colorSpace = this.videoColorSpace || {
                primaries: 'bt709',
                transfer: 'iec61966-2-1',
                matrix: 'rgb',
                fullRange: true,
              };

              const metadata: EncodedVideoChunkMetadata = {
                decoderConfig: {
                  codec: this.config.codec || 'avc1.640033',
                  codedWidth: this.config.width,
                  codedHeight: this.config.height,
                  description: this.videoDescription,
                  colorSpace,
                },
              };

              await this.muxer!.addVideoChunk(chunk, metadata);
            } else {
              await this.muxer!.addVideoChunk(chunk, meta);
            }
          } catch (error) {
            console.error('Muxing error:', error);
          }
        })();

        this.muxingPromises.push(muxingPromise);
        this.encodeQueue--;
      },
      error: (error) => {
        console.error('[VideoExporter] Encoder error:', error);
        this.cancelled = true;
      },
    });

    const codec = this.config.codec || 'avc1.640033';

    const encoderConfig: VideoEncoderConfig = {
      codec,
      width: this.config.width,
      height: this.config.height,
      bitrate: this.config.bitrate,
      framerate: this.config.frameRate,
      latencyMode: 'realtime',
      bitrateMode: 'variable',
      hardwareAcceleration: 'prefer-hardware',
    };

    const hardwareSupport = await VideoEncoder.isConfigSupported(encoderConfig);

    if (hardwareSupport.supported) {
      console.log('[VideoExporter] Using hardware acceleration');
      this.encoder.configure(encoderConfig);
    } else {
      console.log('[VideoExporter] Hardware not supported, using software encoding');
      encoderConfig.hardwareAcceleration = 'prefer-software';

      const softwareSupport = await VideoEncoder.isConfigSupported(encoderConfig);
      if (!softwareSupport.supported) {
        throw new Error('Video encoding not supported on this system');
      }

      this.encoder.configure(encoderConfig);
    }
  }

  cancel(): void {
    this.cancelled = true;
    this.cleanup();
  }

  private cleanup(): void {
    if (this.encoder) {
      try {
        if (this.encoder.state === 'configured') {
          this.encoder.close();
        }
      } catch (e) {
        console.warn('Error closing encoder:', e);
      }
      this.encoder = null;
    }

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

    this.muxer = null;
    this.encodeQueue = 0;
    this.muxingPromises = [];
    this.chunkCount = 0;
    this.videoDescription = undefined;
    this.videoColorSpace = undefined;
  }
}
