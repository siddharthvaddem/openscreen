import type { ExportConfig } from './types';
import { 
  Output, 
  Mp4OutputFormat, 
  BufferTarget, 
  EncodedVideoPacketSource, 
  EncodedAudioPacketSource,
  EncodedPacket 
} from 'mediabunny';

export class VideoMuxer {
  private output: Output | null = null;
  private videoSource: EncodedVideoPacketSource | null = null;
  private audioSource: EncodedAudioPacketSource | null = null;
  private hasAudio: boolean;
  private target: BufferTarget | null = null;
  private config: ExportConfig;

  constructor(config: ExportConfig, hasAudio = false) {
    this.config = config;
    this.hasAudio = hasAudio;
  }

  async initialize(): Promise<void> {
    // Create the buffer target
    this.target = new BufferTarget();
    
    this.output = new Output({
      format: new Mp4OutputFormat({
        fastStart: 'in-memory',
      }),
      target: this.target,
    });

    // Create video source - codec will be deduced from metadata
    this.videoSource = new EncodedVideoPacketSource('avc');
    this.output.addVideoTrack(this.videoSource, {
      frameRate: this.config.frameRate,
    });

    // Create audio source if needed
    if (this.hasAudio) {
      // MP4 export path encodes audio as AAC (mp4a.40.2)
      this.audioSource = new EncodedAudioPacketSource('aac');
      this.output.addAudioTrack(this.audioSource);
    }

    // Start the output to begin accepting media data
    await this.output.start();
  }

  async addVideoChunk(chunk: EncodedVideoChunk, meta?: EncodedVideoChunkMetadata): Promise<void> {
    if (!this.videoSource) {
      throw new Error('Muxer not initialized');
    }
    
    // Convert WebCodecs chunk to Mediabunny packet
    const packet = EncodedPacket.fromEncodedChunk(chunk);
    
    // Add metadata with the first chunk
    await this.videoSource.add(packet, meta);
  }

  async addAudioChunk(chunk: EncodedAudioChunk, meta?: EncodedAudioChunkMetadata): Promise<void> {
    if (!this.audioSource) {
      throw new Error('Audio not configured for this muxer');
    }
    
    // Convert WebCodecs chunk to Mediabunny packet
    const packet = EncodedPacket.fromEncodedChunk(chunk);
    
    // Add metadata with the first chunk
    await this.audioSource.add(packet, meta);
  }

  async finalize(): Promise<Blob> {
    if (!this.output || !this.target) {
      throw new Error('Muxer not initialized');
    }
    
    await this.output.finalize();
    const buffer = this.target.buffer;
    
    if (!buffer) {
      throw new Error('Failed to finalize output');
    }
    
    return new Blob([buffer], { type: 'video/mp4' });
  }
}
