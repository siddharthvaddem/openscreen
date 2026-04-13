import {
	BufferTarget,
	EncodedAudioPacketSource,
	EncodedPacket,
	EncodedVideoPacketSource,
	Mp4OutputFormat,
	Output,
} from "mediabunny";
import type { ExportConfig } from "./types";

export type Mp4AudioCodec = "aac" | "opus";

export class VideoMuxer {
	private output: Output | null = null;
	private videoSource: EncodedVideoPacketSource | null = null;
	private audioSource: EncodedAudioPacketSource | null = null;
	private audioCodec: Mp4AudioCodec | null;
	private target: BufferTarget | null = null;
	private config: ExportConfig;

	constructor(config: ExportConfig, audioCodec: Mp4AudioCodec | null = null) {
		this.config = config;
		this.audioCodec = audioCodec;
	}

	async initialize(): Promise<void> {
		// Create the buffer target
		this.target = new BufferTarget();

		this.output = new Output({
			format: new Mp4OutputFormat({
				fastStart: "in-memory",
			}),
			target: this.target,
		});

		// Create video source - codec will be deduced from metadata
		this.videoSource = new EncodedVideoPacketSource("avc");
		this.output.addVideoTrack(this.videoSource, {
			frameRate: this.config.frameRate,
		});

		// Create audio source if needed
		if (this.audioCodec) {
			this.audioSource = new EncodedAudioPacketSource(this.audioCodec);
			this.output.addAudioTrack(this.audioSource);
		}

		// Start the output to begin accepting media data
		await this.output.start();
	}

	async addVideoChunk(chunk: EncodedVideoChunk, meta?: EncodedVideoChunkMetadata): Promise<void> {
		if (!this.videoSource) {
			throw new Error("Muxer not initialized");
		}

		// Convert WebCodecs chunk to Mediabunny packet
		const packet = EncodedPacket.fromEncodedChunk(chunk);

		// Add metadata with the first chunk
		await this.videoSource.add(packet, meta);
	}

	async addAudioChunk(chunk: EncodedAudioChunk, meta?: EncodedAudioChunkMetadata): Promise<void> {
		if (!this.audioSource) {
			throw new Error("Audio not configured for this muxer");
		}

		// Convert WebCodecs chunk to Mediabunny packet
		const packet = EncodedPacket.fromEncodedChunk(chunk);

		// Add metadata with the first chunk
		await this.audioSource.add(packet, meta);
	}

	async finalize(): Promise<Blob> {
		if (!this.output || !this.target) {
			throw new Error("Muxer not initialized");
		}

		await this.output.finalize();
		const buffer = this.target.buffer;

		if (!buffer) {
			throw new Error("Failed to finalize output");
		}

		return new Blob([buffer], { type: "video/mp4" });
	}
}
