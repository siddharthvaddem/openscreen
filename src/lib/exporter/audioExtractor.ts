import type { TrimRegion } from '@/components/video-editor/types';

export interface AudioExtractionResult {
  hasAudio: boolean;
  sampleRate: number;
  numberOfChannels: number;
  duration: number; // in seconds
}

export interface AudioChunkData {
  samples: Float32Array[];
  timestamp: number; // in microseconds
  duration: number; // in microseconds
}

/**
 * Extracts and decodes audio from a video file using Web Audio API.
 * Provides audio samples that can be encoded and muxed into the export.
 */
export class AudioExtractor {
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private videoUrl: string;
  private trimRegions: TrimRegion[];

  constructor(videoUrl: string, trimRegions: TrimRegion[] = []) {
    this.videoUrl = videoUrl;
    this.trimRegions = trimRegions;
  }

  /**
   * Load and decode audio from the video file
   */
  async initialize(): Promise<AudioExtractionResult> {
    try {
      // Fetch the video file as ArrayBuffer
      const response = await fetch(this.videoUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch video: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();

      // Create AudioContext and decode the audio
      this.audioContext = new AudioContext();
      
      try {
        this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      } catch (decodeError) {
        // Video might not have audio track
        console.warn('[AudioExtractor] No audio track found or decode failed:', decodeError);
        return {
          hasAudio: false,
          sampleRate: 48000,
          numberOfChannels: 2,
          duration: 0,
        };
      }

      return {
        hasAudio: true,
        sampleRate: this.audioBuffer.sampleRate,
        numberOfChannels: this.audioBuffer.numberOfChannels,
        duration: this.audioBuffer.duration,
      };
    } catch (error) {
      console.error('[AudioExtractor] Failed to initialize:', error);
      return {
        hasAudio: false,
        sampleRate: 48000,
        numberOfChannels: 2,
        duration: 0,
      };
    }
  }

  /**
   * Map effective time to source time (accounting for trim regions)
   * This is the inverse of what VideoExporter does for video frames
   */
  private mapEffectiveToSourceTime(effectiveTimeMs: number): number {
    const sortedTrims = [...this.trimRegions].sort((a, b) => a.startMs - b.startMs);
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

  /**
   * Get the effective duration (excluding trimmed regions)
   */
  getEffectiveDuration(): number {
    if (!this.audioBuffer) return 0;
    
    const totalDuration = this.audioBuffer.duration;
    const totalTrimDuration = this.trimRegions.reduce((sum, region) => {
      return sum + (region.endMs - region.startMs) / 1000;
    }, 0);
    
    return totalDuration - totalTrimDuration;
  }

  /**
   * Extract audio samples for a given time range (in effective time)
   * Returns samples as Float32Array per channel
   */
  extractSamplesForTimeRange(
    effectiveStartMs: number,
    effectiveDurationMs: number
  ): AudioChunkData | null {
    if (!this.audioBuffer) return null;

    const sampleRate = this.audioBuffer.sampleRate;
    const numberOfChannels = this.audioBuffer.numberOfChannels;

    // Map effective time to source time
    const sourceStartMs = this.mapEffectiveToSourceTime(effectiveStartMs);
    const sourceStartSample = Math.floor((sourceStartMs / 1000) * sampleRate);
    const sampleCount = Math.floor((effectiveDurationMs / 1000) * sampleRate);

    // Bounds check
    if (sourceStartSample >= this.audioBuffer.length) {
      return null;
    }

    const endSample = Math.min(sourceStartSample + sampleCount, this.audioBuffer.length);
    const actualSampleCount = endSample - sourceStartSample;

    if (actualSampleCount <= 0) {
      return null;
    }

    // Extract samples for each channel
    const samples: Float32Array[] = [];
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const channelData = this.audioBuffer.getChannelData(channel);
      const extractedSamples = new Float32Array(actualSampleCount);
      
      for (let i = 0; i < actualSampleCount; i++) {
        extractedSamples[i] = channelData[sourceStartSample + i];
      }
      
      samples.push(extractedSamples);
    }

    return {
      samples,
      timestamp: effectiveStartMs * 1000, // Convert to microseconds
      duration: (actualSampleCount / sampleRate) * 1_000_000, // Convert to microseconds
    };
  }

  /**
   * Get audio buffer info
   */
  getAudioInfo(): { sampleRate: number; numberOfChannels: number } | null {
    if (!this.audioBuffer) return null;
    return {
      sampleRate: this.audioBuffer.sampleRate,
      numberOfChannels: this.audioBuffer.numberOfChannels,
    };
  }

  /**
   * Get the raw audio buffer for direct access
   */
  getAudioBuffer(): AudioBuffer | null {
    return this.audioBuffer;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.audioBuffer = null;
  }
}
