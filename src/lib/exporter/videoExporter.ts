import type { ExportConfig, ExportProgress, ExportResult } from './types';
import { StreamingVideoDecoder } from './streamingDecoder';
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

interface DecodedAudioTrack {
  sampleRate: number;
  numberOfChannels: number;
  numberOfFrames: number;
  channelData: Float32Array[];
}

export class VideoExporter {
  private config: VideoExporterConfig;
  private streamingDecoder: StreamingVideoDecoder | null = null;
  private renderer: FrameRenderer | null = null;
  private encoder: VideoEncoder | null = null;
  private audioEncoder: AudioEncoder | null = null;
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
  private videoChunkCount = 0;
  private audioChunkCount = 0;

  constructor(config: VideoExporterConfig) {
    this.config = config;
  }

  async export(): Promise<ExportResult> {
    try {
      this.cleanup();
      this.cancelled = false;

      // Initialize streaming decoder and load video metadata
      this.streamingDecoder = new StreamingVideoDecoder();
      const videoInfo = await this.streamingDecoder.loadMetadata(this.config.videoUrl);
      let audioTrack: DecodedAudioTrack | null = null;
      try {
        audioTrack = await this.extractAudioTrack(videoInfo);
      } catch (audioError) {
        console.warn('[VideoExporter] Audio extraction failed; continuing without audio', audioError);
        audioTrack = null;
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
        previewWidth: this.config.previewWidth,
        previewHeight: this.config.previewHeight,
      });
      await this.renderer.initialize();

      // Initialize video encoder
      await this.initializeEncoder();

      // Initialize muxer
      this.muxer = new VideoMuxer(this.config, Boolean(audioTrack));
      await this.muxer.initialize();

      // Calculate effective duration and frame count (excluding trim regions)
      const effectiveDuration = this.streamingDecoder.getEffectiveDuration(this.config.trimRegions);
      const totalFrames = Math.ceil(effectiveDuration * this.config.frameRate);

      console.log('[VideoExporter] Original duration:', videoInfo.duration, 's');
      console.log('[VideoExporter] Effective duration:', effectiveDuration, 's');
      console.log('[VideoExporter] Total frames to export:', totalFrames);
      console.log('[VideoExporter] Using streaming decode (web-demuxer + VideoDecoder)');

      const frameDuration = 1_000_000 / this.config.frameRate; // in microseconds
      let frameIndex = 0;

      // Stream decode and process frames — no seeking!
      await this.streamingDecoder.decodeAll(
        this.config.frameRate,
        this.config.trimRegions,
        async (videoFrame, _exportTimestampUs, sourceTimestampMs) => {
          if (this.cancelled) {
            videoFrame.close();
            return;
          }

          const timestamp = frameIndex * frameDuration;

          // Render the frame with all effects using source timestamp
          const sourceTimestampUs = sourceTimestampMs * 1000; // Convert to microseconds
          await this.renderer!.renderFrame(videoFrame, sourceTimestampUs);
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
            this.encoder.encode(exportFrame, { keyFrame: frameIndex % 150 === 0 });
          } else {
            console.warn(`[Frame ${frameIndex}] Encoder not ready! State: ${this.encoder?.state}`);
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
      );

      if (this.cancelled) {
        return { success: false, error: 'Export cancelled' };
      }

      // Finalize encoding
      if (this.encoder && this.encoder.state === 'configured') {
        await this.encoder.flush();
      }

      if (audioTrack && !this.cancelled) {
        try {
          await this.encodeAudioTrack(audioTrack);
        } catch (audioError) {
          console.warn('[VideoExporter] Audio encoding failed; continuing without audio', audioError);
        }
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
    this.audioEncodeQueue = 0;
    this.muxingPromises = [];
    this.videoChunkCount = 0;
    this.audioChunkCount = 0;
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
        const isFirstChunk = this.videoChunkCount === 0;
        this.videoChunkCount++;

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

  cancel(): void {
    this.cancelled = true;
    if (this.streamingDecoder) {
      this.streamingDecoder.cancel();
    }
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

    if (this.streamingDecoder) {
      try {
        this.streamingDecoder.destroy();
      } catch (e) {
        console.warn('Error destroying streaming decoder:', e);
      }
      this.streamingDecoder = null;
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

    this.muxer = null;
    this.encodeQueue = 0;
    this.audioEncodeQueue = 0;
    this.muxingPromises = [];
    this.videoChunkCount = 0;
    this.audioChunkCount = 0;
    this.videoDescription = undefined;
    this.videoColorSpace = undefined;
  }

  private computeKeptSegments(totalDurationSec: number): Array<{ startSec: number; endSec: number }> {
    if (!this.config.trimRegions || this.config.trimRegions.length === 0) {
      return [{ startSec: 0, endSec: totalDurationSec }];
    }

    const sorted = [...this.config.trimRegions].sort((a, b) => a.startMs - b.startMs);
    const segments: Array<{ startSec: number; endSec: number }> = [];
    let cursorSec = 0;

    for (const trim of sorted) {
      const trimStartSec = Math.max(0, trim.startMs / 1000);
      const trimEndSec = Math.min(totalDurationSec, trim.endMs / 1000);

      if (cursorSec < trimStartSec) {
        segments.push({ startSec: cursorSec, endSec: trimStartSec });
      }
      cursorSec = Math.max(cursorSec, trimEndSec);
    }

    if (cursorSec < totalDurationSec) {
      segments.push({ startSec: cursorSec, endSec: totalDurationSec });
    }

    return segments.filter(segment => segment.endSec - segment.startSec > 0);
  }

  private async extractAudioTrack(videoInfo: { hasAudio: boolean }): Promise<DecodedAudioTrack | null> {
    if (!videoInfo.hasAudio) {
      return null;
    }

    const response = await fetch(this.config.videoUrl);
    const sourceBuffer = await response.arrayBuffer();

    const AudioCtx = window.AudioContext
      ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) {
      console.warn('[VideoExporter] AudioContext not supported; exporting without audio');
      return null;
    }

    const audioContext = new AudioCtx();
    try {
      const audioBuffer = await audioContext.decodeAudioData(sourceBuffer);
      const segments = this.computeKeptSegments(audioBuffer.duration);
      if (segments.length === 0) {
        return null;
      }

      const sampleRate = audioBuffer.sampleRate;
      const channelCount = audioBuffer.numberOfChannels;
      const segmentFrameRanges = segments.map(segment => {
        const startFrame = Math.max(0, Math.floor(segment.startSec * sampleRate));
        const endFrame = Math.min(audioBuffer.length, Math.floor(segment.endSec * sampleRate));
        return { startFrame, endFrame };
      }).filter(range => range.endFrame > range.startFrame);

      if (segmentFrameRanges.length === 0) {
        return null;
      }

      const totalFrames = segmentFrameRanges.reduce((sum, range) => sum + (range.endFrame - range.startFrame), 0);
      const channelData: Float32Array[] = [];

      for (let channel = 0; channel < channelCount; channel++) {
        const source = audioBuffer.getChannelData(channel);
        const merged = new Float32Array(totalFrames);
        let writeOffset = 0;

        for (const range of segmentFrameRanges) {
          const chunk = source.subarray(range.startFrame, range.endFrame);
          merged.set(chunk, writeOffset);
          writeOffset += chunk.length;
        }

        channelData.push(merged);
      }

      return {
        sampleRate,
        numberOfChannels: channelCount,
        numberOfFrames: totalFrames,
        channelData,
      };
    } finally {
      await audioContext.close();
    }
  }

  private async encodeAudioTrack(sourceTrack: DecodedAudioTrack): Promise<void> {
    let track = sourceTrack;
    let config: AudioEncoderConfig = {
      codec: 'mp4a.40.2',
      sampleRate: track.sampleRate,
      numberOfChannels: track.numberOfChannels,
      bitrate: Math.max(96_000, Math.min(256_000, 96_000 * track.numberOfChannels)),
    };

    let support = await AudioEncoder.isConfigSupported(config);
    if (!support.supported && track.sampleRate !== 48_000) {
      track = await this.resampleAudioTrack(track, 48_000);
      config = {
        ...config,
        sampleRate: track.sampleRate,
      };
      support = await AudioEncoder.isConfigSupported(config);
    }

    if (!support.supported) {
      console.warn('[VideoExporter] Audio encoding not supported; exporting without audio');
      return;
    }

    this.audioEncodeQueue = 0;
    this.audioChunkCount = 0;

    this.audioEncoder = new AudioEncoder({
      output: (chunk, meta) => {
        const isFirstChunk = this.audioChunkCount === 0;
        this.audioChunkCount++;

        const muxingPromise = (async () => {
          try {
            const fallbackMeta: EncodedAudioChunkMetadata | undefined = isFirstChunk ? {
              decoderConfig: {
                codec: config.codec,
                numberOfChannels: config.numberOfChannels,
                sampleRate: config.sampleRate,
              },
            } : undefined;

            await this.muxer!.addAudioChunk(chunk, meta ?? fallbackMeta);
          } catch (error) {
            console.error('Audio muxing error:', error);
          }
        })();

        this.muxingPromises.push(muxingPromise);
        this.audioEncodeQueue--;
      },
      error: (error) => {
        console.error('[VideoExporter] Audio encoder error:', error);
        this.cancelled = true;
      },
    });
    this.audioEncoder.configure(config);

    const frameSize = 1024;
    const channels = track.numberOfChannels;

    for (let offset = 0; offset < track.numberOfFrames && !this.cancelled; offset += frameSize) {
      while (this.audioEncodeQueue >= this.MAX_AUDIO_ENCODE_QUEUE && !this.cancelled) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      const numberOfFrames = Math.min(frameSize, track.numberOfFrames - offset);
      const interleaved = new Float32Array(numberOfFrames * channels);

      for (let frame = 0; frame < numberOfFrames; frame++) {
        for (let channel = 0; channel < channels; channel++) {
          interleaved[frame * channels + channel] = track.channelData[channel][offset + frame];
        }
      }

      const timestamp = Math.round((offset / track.sampleRate) * 1_000_000);
      const audioData = new AudioData({
        format: 'f32',
        sampleRate: track.sampleRate,
        numberOfFrames,
        numberOfChannels: channels,
        timestamp,
        data: interleaved,
      });

      this.audioEncodeQueue++;
      this.audioEncoder.encode(audioData);
      audioData.close();
    }

    if (this.audioEncoder.state === 'configured') {
      await this.audioEncoder.flush();
      this.audioEncoder.close();
      this.audioEncoder = null;
    }
  }

  private async resampleAudioTrack(sourceTrack: DecodedAudioTrack, targetSampleRate: number): Promise<DecodedAudioTrack> {
    const length = Math.ceil((sourceTrack.numberOfFrames * targetSampleRate) / sourceTrack.sampleRate);
    const offlineContext = new OfflineAudioContext(sourceTrack.numberOfChannels, length, targetSampleRate);
    const sourceBuffer = offlineContext.createBuffer(
      sourceTrack.numberOfChannels,
      sourceTrack.numberOfFrames,
      sourceTrack.sampleRate
    );

    for (let channel = 0; channel < sourceTrack.numberOfChannels; channel++) {
      const channelCopy = new Float32Array(sourceTrack.channelData[channel].length);
      channelCopy.set(sourceTrack.channelData[channel]);
      sourceBuffer.copyToChannel(channelCopy, channel);
    }

    const sourceNode = offlineContext.createBufferSource();
    sourceNode.buffer = sourceBuffer;
    sourceNode.connect(offlineContext.destination);
    sourceNode.start();

    const rendered = await offlineContext.startRendering();
    const channelData: Float32Array[] = [];
    for (let channel = 0; channel < rendered.numberOfChannels; channel++) {
      channelData.push(rendered.getChannelData(channel).slice());
    }

    return {
      sampleRate: rendered.sampleRate,
      numberOfChannels: rendered.numberOfChannels,
      numberOfFrames: rendered.length,
      channelData,
    };
  }
}
