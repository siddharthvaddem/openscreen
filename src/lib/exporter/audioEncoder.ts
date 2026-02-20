/**
 * AudioProcessor handles extracting, decoding, and re-encoding audio from WebM to MP4
 * Uses WebCodecs API (AudioDecoder + AudioEncoder) for efficient processing
 */

import { WebDemuxer } from 'web-demuxer';

export interface AudioProcessorConfig {
  videoUrl: string;
  sampleRate?: number; // Target sample rate (default: source rate)
  channels?: number;    // Target channels (default: source channels)
  bitrate?: number;     // Target bitrate in bps (default: 128000)
}

export class AudioProcessor {
  private config: AudioProcessorConfig;
  private demuxer: WebDemuxer | null = null;
  private decoder: AudioDecoder | null = null;
  private encoder: AudioEncoder | null = null;
  private cancelled = false;

  // Audio metadata
  private sourceCodec: string = '';
  private sourceSampleRate: number = 48000;
  private sourceChannels: number = 2;

  // Callback for encoded audio chunks
  private onEncodedChunk?: (chunk: EncodedAudioChunk, meta?: EncodedAudioChunkMetadata) => Promise<void>;

  constructor(config: AudioProcessorConfig) {
    this.config = config;
  }

  /**
   * Initialize the audio processor by loading metadata from the source video
   */
  async initialize(audioCodec: string, sampleRate: number, channels: number): Promise<void> {
    this.sourceCodec = audioCodec;
    this.sourceSampleRate = sampleRate;
    this.sourceChannels = channels;

    console.log('[AudioProcessor] Initializing with:', {
      codec: audioCodec,
      sampleRate,
      channels
    });

    // Prepare web-demuxer for audio extraction
    const response = await fetch(this.config.videoUrl);
    const blob = await response.blob();
    const filename = this.config.videoUrl.split('/').pop() || 'video';
    const file = new File([blob], filename, { type: blob.type });

    const wasmUrl = new URL('./wasm/web-demuxer.wasm', window.location.href).href;
    this.demuxer = new WebDemuxer({ wasmFilePath: wasmUrl });
    await this.demuxer.load(file);
  }

  /**
   * Process audio: decode from source and re-encode for MP4
   */
  async process(
    onEncodedChunk: (chunk: EncodedAudioChunk, meta?: EncodedAudioChunkMetadata) => Promise<void>
  ): Promise<void> {
    this.onEncodedChunk = onEncodedChunk;
    this.cancelled = false;

    if (!this.demuxer) {
      throw new Error('AudioProcessor not initialized');
    }

    console.log('[AudioProcessor] Starting audio processing...');

    // Initialize decoder for the source codec
    await this.initializeDecoder();

    // Initialize encoder for the target format
    await this.initializeEncoder();

    // Extract and decode audio packets
    await this.extractAndDecode();

    console.log('[AudioProcessor] Audio processing complete');
  }

  private async initializeDecoder(): Promise<void> {
    // Determine decoder config based on source codec
    const config: AudioDecoderConfig = {
      codec: this.getDecoderCodec(),
      sampleRate: this.sourceSampleRate,
      numberOfChannels: this.sourceChannels,
    };

    console.log('[AudioProcessor] Decoder config:', config);

    this.decoder = new AudioDecoder({
      output: (audioData: AudioData) => {
        // Feed decoded audio to encoder
        if (this.encoder && !this.cancelled) {
          this.encoder.encode(audioData);
          audioData.close();
        } else {
          audioData.close();
        }
      },
      error: (error: DOMException) => {
        console.error('[AudioProcessor] Decoder error:', error);
      }
    });

    this.decoder.configure(config);
  }

  private async initializeEncoder(): Promise<void> {
    const targetSampleRate = this.config.sampleRate || this.sourceSampleRate;
    const targetChannels = this.config.channels || this.sourceChannels;
    const targetBitrate = this.config.bitrate || 128000;

    // Use Opus for better quality and compatibility
    const config: AudioEncoderConfig = {
      codec: 'opus',
      sampleRate: targetSampleRate,
      numberOfChannels: targetChannels,
      bitrate: targetBitrate,
    };

    console.log('[AudioProcessor] Encoder config:', config);

    this.encoder = new AudioEncoder({
      output: async (chunk: EncodedAudioChunk, meta?: EncodedAudioChunkMetadata) => {
        if (!this.cancelled && this.onEncodedChunk) {
          await this.onEncodedChunk(chunk, meta);
        }
      },
      error: (error: DOMException) => {
        console.error('[AudioProcessor] Encoder error:', error);
      }
    });

    this.encoder.configure(config);
  }

  private async extractAndDecode(): Promise<void> {
    if (!this.demuxer || !this.decoder) {
      throw new Error('Demuxer or decoder not initialized');
    }

    // Read audio packets from the demuxer
    const audioStream = this.demuxer.read('audio');
    if (!audioStream) {
      console.warn('[AudioProcessor] No audio stream found in source');
      return;
    }

    const reader = audioStream.getReader();
    let packetCount = 0;

    try {
      while (!this.cancelled) {
        const { done, value } = await reader.read();

        if (done) {
          console.log(`[AudioProcessor] Finished reading ${packetCount} audio packets`);
          break;
        }

        if (value && this.decoder) {
          // web-demuxer returns EncodedAudioChunk directly
          this.decoder.decode(value as EncodedAudioChunk);
          packetCount++;
        }
      }

      // Flush both decoder and encoder
      if (this.decoder && !this.cancelled) {
        await this.decoder.flush();
      }
      if (this.encoder && !this.cancelled) {
        await this.encoder.flush();
      }

    } catch (error) {
      console.error('[AudioProcessor] Error during extraction:', error);
      throw error;
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Map source codec to WebCodecs decoder codec string
   */
  private getDecoderCodec(): string {
    // Common WebM audio codecs
    if (this.sourceCodec.toLowerCase().includes('opus')) {
      return 'opus';
    }
    if (this.sourceCodec.toLowerCase().includes('vorbis')) {
      return 'vorbis';
    }
    // Default to opus (most common in WebM)
    return 'opus';
  }

  /**
   * Cancel the audio processing
   */
  cancel(): void {
    this.cancelled = true;
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.cancelled = true;

    if (this.decoder) {
      if (this.decoder.state !== 'closed') {
        this.decoder.close();
      }
      this.decoder = null;
    }

    if (this.encoder) {
      if (this.encoder.state !== 'closed') {
        this.encoder.close();
      }
      this.encoder = null;
    }

    this.demuxer = null;
  }
}
