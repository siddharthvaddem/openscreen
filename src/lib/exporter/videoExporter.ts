import type { ExportConfig, ExportProgress, ExportResult } from './types';
import { VideoFileDecoder } from './videoDecoder';
import { FrameRenderer } from './frameRenderer';
import { VideoMuxer } from './muxer';
import { AudioExtractor } from './audioExtractor';
import type { ZoomRegion, CropRegion, TrimRegion, AnnotationRegion, SubtitleRegion } from '@/components/video-editor/types';

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
  subtitleRegions?: SubtitleRegion[];
  previewWidth?: number;
  previewHeight?: number;
  onProgress?: (progress: ExportProgress) => void;
}

export class VideoExporter {
  private config: VideoExporterConfig;
  private decoder: VideoFileDecoder | null = null;
  private renderer: FrameRenderer | null = null;
  private encoder: VideoEncoder | null = null;
  private audioEncoder: AudioEncoder | null = null;
  private audioExtractor: AudioExtractor | null = null;
  private muxer: VideoMuxer | null = null;
  private cancelled = false;
  private encodeQueue = 0;
  private audioEncodeQueue = 0;
  // Increased queue size for better throughput with hardware encoding
  private readonly MAX_ENCODE_QUEUE = 120;
  private readonly MAX_AUDIO_ENCODE_QUEUE = 60;
  private videoDescription: Uint8Array | undefined;
  private videoColorSpace: VideoColorSpaceInit | undefined;
  // Track muxing promises for parallel processing
  private muxingPromises: Promise<void>[] = [];
  private chunkCount = 0;
  private audioChunkCount = 0;
  private hasAudio = false;

  constructor(config: VideoExporterConfig) {
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

      // Initialize audio extractor and check if video has audio
      this.audioExtractor = new AudioExtractor(
        this.config.videoUrl,
        this.config.trimRegions || []
      );
      const audioResult = await this.audioExtractor.initialize();
      this.hasAudio = audioResult.hasAudio;
      
      console.log('[VideoExporter] Audio detected:', this.hasAudio);
      if (this.hasAudio) {
        console.log('[VideoExporter] Audio sample rate:', audioResult.sampleRate);
        console.log('[VideoExporter] Audio channels:', audioResult.numberOfChannels);
      }

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
        subtitleRegions: this.config.subtitleRegions,
        previewWidth: this.config.previewWidth,
        previewHeight: this.config.previewHeight,
      });
      await this.renderer.initialize();

      // Initialize video encoder
      await this.initializeEncoder();

      // Initialize audio encoder if audio is present
      if (this.hasAudio) {
        await this.initializeAudioEncoder(audioResult.sampleRate, audioResult.numberOfChannels);
      }

      // Initialize muxer with audio flag
      this.muxer = new VideoMuxer(this.config, this.hasAudio);
      await this.muxer.initialize();

      // Get the video element for frame extraction
      const videoElement = this.decoder.getVideoElement();
      if (!videoElement) {
        throw new Error('Video element not available');
      }

      // Calculate effective duration and frame count (excluding trim regions)
      const effectiveDuration = this.getEffectiveDuration(videoInfo.duration);
      const totalFrames = Math.ceil(effectiveDuration * this.config.frameRate);
      
      console.log('[VideoExporter] Original duration:', videoInfo.duration, 's');
      console.log('[VideoExporter] Effective duration:', effectiveDuration, 's');
      console.log('[VideoExporter] Total frames to export:', totalFrames);

      // Process frames continuously without batching delays
      const frameDuration = 1_000_000 / this.config.frameRate; // in microseconds
      let frameIndex = 0;
      const timeStep = 1 / this.config.frameRate;

      while (frameIndex < totalFrames && !this.cancelled) {
        const i = frameIndex;
        const timestamp = i * frameDuration;

        // Map effective time to source time (accounting for trim regions)
        const effectiveTimeMs = (i * timeStep) * 1000;
        const sourceTimeMs = this.mapEffectiveToSourceTime(effectiveTimeMs);
        const videoTime = sourceTimeMs / 1000;
          
        // Seek if needed or wait for first frame to be ready
        const needsSeek = Math.abs(videoElement.currentTime - videoTime) > 0.001;

        if (needsSeek) {
          // Attach listener BEFORE setting currentTime to avoid race condition
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

        // Create a VideoFrame from the video element (on GPU!)
        const videoFrame = new VideoFrame(videoElement, {
          timestamp,
        });

        // Render the frame with all effects using source timestamp
        const sourceTimestamp = sourceTimeMs * 1000; // Convert to microseconds
        await this.renderer!.renderFrame(videoFrame, sourceTimestamp);
        
        videoFrame.close();

        const canvas = this.renderer!.getCanvas();

        // Create VideoFrame from canvas on GPU without reading pixels
        // @ts-ignore - colorSpace not in TypeScript definitions but works at runtime
        const exportFrame = new VideoFrame(canvas, {
          timestamp,
          duration: frameDuration,
          colorSpace: {
            primaries: 'bt709',
            transfer: 'iec61966-2-1',
            matrix: 'rgb',
            fullRange: true,
          },
        });

        // Check encoder queue before encoding to keep it full
        while (this.encodeQueue >= this.MAX_ENCODE_QUEUE && !this.cancelled) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }

        if (this.encoder && this.encoder.state === 'configured') {
          this.encodeQueue++;
          this.encoder.encode(exportFrame, { keyFrame: i % 150 === 0 });
        } else {
          console.warn(`[Frame ${i}] Encoder not ready! State: ${this.encoder?.state}`);
        }

        exportFrame.close();

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

      // Process audio if present
      if (this.hasAudio) {
        const effectiveDuration = this.getEffectiveDuration(videoInfo.duration);
        await this.processAudio(effectiveDuration * 1000); // Convert to ms
      }

      // Finalize encoding
      if (this.encoder && this.encoder.state === 'configured') {
        await this.encoder.flush();
      }

      // Finalize audio encoding if present
      if (this.hasAudio && this.audioEncoder && this.audioEncoder.state === 'configured') {
        await this.audioEncoder.flush();
      }

      // Wait for all muxing operations to complete
      await Promise.all(this.muxingPromises);

      // Finalize muxer and get output blob
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

  private async initializeEncoder(): Promise<void> {
    this.encodeQueue = 0;
    this.muxingPromises = [];
    this.chunkCount = 0;
    let videoDescription: Uint8Array | undefined;

    this.encoder = new VideoEncoder({
      output: (chunk, meta) => {
        // Capture decoder config metadata from encoder output
        if (meta?.decoderConfig?.description && !videoDescription) {
          const desc = meta.decoderConfig.description;
          videoDescription = new Uint8Array(desc instanceof ArrayBuffer ? desc : (desc as any));
          this.videoDescription = videoDescription;
        }
        // Capture colorSpace from encoder metadata if provided
        if (meta?.decoderConfig?.colorSpace && !this.videoColorSpace) {
          this.videoColorSpace = meta.decoderConfig.colorSpace;
        }

        // Stream chunk to muxer immediately (parallel processing)
        const isFirstChunk = this.chunkCount === 0;
        this.chunkCount++;

        const muxingPromise = (async () => {
          try {
            if (isFirstChunk && this.videoDescription) {
              // Add decoder config for the first chunk
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
        // Stop export encoding failed
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

    // Check hardware support first
    const hardwareSupport = await VideoEncoder.isConfigSupported(encoderConfig);

    if (hardwareSupport.supported) {
      // Use hardware encoding
      console.log('[VideoExporter] Using hardware acceleration');
      this.encoder.configure(encoderConfig);
    } else {
      // Fall back to software encoding
      console.log('[VideoExporter] Hardware not supported, using software encoding');
      encoderConfig.hardwareAcceleration = 'prefer-software';
      
      const softwareSupport = await VideoEncoder.isConfigSupported(encoderConfig);
      if (!softwareSupport.supported) {
        throw new Error('Video encoding not supported on this system');
      }
      
      this.encoder.configure(encoderConfig);
    }
  }

  private async initializeAudioEncoder(sampleRate: number, numberOfChannels: number): Promise<void> {
    this.audioEncodeQueue = 0;
    this.audioChunkCount = 0;

    this.audioEncoder = new AudioEncoder({
      output: (chunk, meta) => {
        const isFirstChunk = this.audioChunkCount === 0;
        this.audioChunkCount++;

        const muxingPromise = (async () => {
          try {
            if (isFirstChunk) {
              // Add audio decoder config for the first chunk
              const metadata: EncodedAudioChunkMetadata = {
                decoderConfig: {
                  codec: 'opus',
                  sampleRate: sampleRate,
                  numberOfChannels: numberOfChannels,
                },
              };
              await this.muxer!.addAudioChunk(chunk, metadata);
            } else {
              await this.muxer!.addAudioChunk(chunk, meta);
            }
          } catch (error) {
            console.error('Audio muxing error:', error);
          }
        })();

        this.muxingPromises.push(muxingPromise);
        this.audioEncodeQueue--;
      },
      error: (error) => {
        console.error('[VideoExporter] Audio encoder error:', error);
      },
    });

    // Configure audio encoder with Opus codec
    // Use configurable bitrate from settings, default to 192 kbps for high quality
    const audioBitrateKbps = this.config.audioBitrate ?? 192;
    const audioEncoderConfig: AudioEncoderConfig = {
      codec: 'opus',
      sampleRate: sampleRate,
      numberOfChannels: numberOfChannels,
      bitrate: audioBitrateKbps * 1000, // Convert kbps to bps
    };

    const audioSupport = await AudioEncoder.isConfigSupported(audioEncoderConfig);
    if (!audioSupport.supported) {
      console.warn('[VideoExporter] Audio encoding not supported, continuing without audio');
      this.hasAudio = false;
      this.audioEncoder = null;
      return;
    }

    console.log('[VideoExporter] Audio encoder configured:', audioEncoderConfig);
    this.audioEncoder.configure(audioEncoderConfig);
  }

  private async processAudio(effectiveDurationMs: number): Promise<void> {
    if (!this.hasAudio || !this.audioExtractor || !this.audioEncoder) {
      return;
    }

    const audioInfo = this.audioExtractor.getAudioInfo();
    if (!audioInfo) return;

    const { sampleRate, numberOfChannels } = audioInfo;
    const audioBuffer = this.audioExtractor.getAudioBuffer();
    if (!audioBuffer) return;

    // Process audio in chunks of ~20ms (typical for Opus)
    const chunkDurationMs = 20;
    const totalChunks = Math.ceil(effectiveDurationMs / chunkDurationMs);

    console.log('[VideoExporter] Processing audio:', totalChunks, 'chunks');

    for (let chunkIndex = 0; chunkIndex < totalChunks && !this.cancelled; chunkIndex++) {
      const effectiveStartMs = chunkIndex * chunkDurationMs;
      const chunkData = this.audioExtractor.extractSamplesForTimeRange(
        effectiveStartMs,
        chunkDurationMs
      );

      if (!chunkData || chunkData.samples.length === 0) {
        continue;
      }

      // Create interleaved audio data for AudioData
      const frameCount = chunkData.samples[0].length;
      const interleavedData = new Float32Array(frameCount * numberOfChannels);
      
      for (let i = 0; i < frameCount; i++) {
        for (let ch = 0; ch < numberOfChannels; ch++) {
          interleavedData[i * numberOfChannels + ch] = chunkData.samples[ch]?.[i] ?? 0;
        }
      }

      // Create interleaved AudioData for encoding
      const audioDataInterleaved = new AudioData({
        format: 'f32',
        sampleRate: sampleRate,
        numberOfFrames: frameCount,
        numberOfChannels: numberOfChannels,
        timestamp: chunkData.timestamp,
        data: interleavedData.buffer as ArrayBuffer,
      });

      // Wait for queue space
      while (this.audioEncodeQueue >= this.MAX_AUDIO_ENCODE_QUEUE && !this.cancelled) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      if (this.audioEncoder && this.audioEncoder.state === 'configured') {
        this.audioEncodeQueue++;
        this.audioEncoder.encode(audioDataInterleaved);
      }

      audioDataInterleaved.close();
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

    if (this.audioEncoder) {
      try {
        if (this.audioEncoder.state === 'configured') {
          this.audioEncoder.close();
        }
      } catch (e) {
        console.warn('Error closing audio encoder:', e);
      }
      this.audioEncoder = null;
    }

    if (this.audioExtractor) {
      try {
        this.audioExtractor.destroy();
      } catch (e) {
        console.warn('Error destroying audio extractor:', e);
      }
      this.audioExtractor = null;
    }

    this.muxer = null;
    this.encodeQueue = 0;
    this.audioEncodeQueue = 0;
    this.muxingPromises = [];
    this.chunkCount = 0;
    this.audioChunkCount = 0;
    this.hasAudio = false;
    this.videoDescription = undefined;
    this.videoColorSpace = undefined;
  }
}
