import { WebDemuxer } from "web-demuxer";
import type { SpeedRegion, TrimRegion } from "@/components/video-editor/types";
import type { VideoMuxer } from "./muxer";

const AUDIO_BITRATE = 128_000;
const DECODE_BACKPRESSURE_LIMIT = 20;
const MIN_SPEED_REGION_DELTA_MS = 0.0001;

export class AudioProcessor {
	private cancelled = false;

	/**
	 * Audio export has two modes:
	 * 1) no speed regions + default audio settings → fast WebCodecs trim-only pipeline
	 * 2) speed regions present OR non-default audio settings → pitch-preserving
	 *    OfflineAudioContext pipeline (faster than real-time, no MediaRecorder needed)
	 */
	async process(
		demuxer: WebDemuxer,
		muxer: VideoMuxer,
		videoUrl: string,
		trimRegions?: TrimRegion[],
		speedRegions?: SpeedRegion[],
		readEndSec?: number,
		audioSettings?: import("@/components/video-editor/types").AudioSettings,
		onProgress?: (progress: number) => void,
	): Promise<void> {
		const sortedTrims = trimRegions ? [...trimRegions].sort((a, b) => a.startMs - b.startMs) : [];
		const sortedSpeedRegions = speedRegions
			? [...speedRegions]
					.filter((region) => region.endMs - region.startMs > MIN_SPEED_REGION_DELTA_MS)
					.sort((a, b) => a.startMs - b.startMs)
			: [];

		const hasActiveAudioSettings =
			!!audioSettings &&
			(audioSettings.highpassHz !== 80 ||
				audioSettings.compressionRatio !== 4 ||
				audioSettings.trebleDb !== 5 ||
				audioSettings.loudnessDb !== -12);

		// Speed edits or audio processing — use OfflineAudioContext (faster than real-time).
		if (sortedSpeedRegions.length > 0 || hasActiveAudioSettings) {
			onProgress?.(0);
			const renderedAudioBlob = await this.renderPitchPreservedOfflineAudio(
				videoUrl,
				sortedTrims,
				sortedSpeedRegions,
				audioSettings,
				onProgress,
			);
			if (!this.cancelled) {
				await this.muxRenderedAudioBlob(renderedAudioBlob, muxer);
				onProgress?.(100);
				return;
			}
		}

		// No speed edits: keep the original demux/decode/encode path with trim timestamp remap.
		onProgress?.(0);
		await this.processTrimOnlyAudio(demuxer, muxer, sortedTrims, readEndSec, onProgress);
	}

	// Legacy trim-only path. This is still used for projects without speed regions.
	private async processTrimOnlyAudio(
		demuxer: WebDemuxer,
		muxer: VideoMuxer,
		sortedTrims: TrimRegion[],
		readEndSec?: number,
		onProgress?: (progress: number) => void,
	): Promise<void> {
		let audioConfig: AudioDecoderConfig;
		try {
			audioConfig = (await demuxer.getDecoderConfig("audio")) as AudioDecoderConfig;
		} catch {
			console.warn("[AudioProcessor] No audio track found, skipping");
			onProgress?.(100);
			return;
		}

		const codecCheck = await AudioDecoder.isConfigSupported(audioConfig);
		if (!codecCheck.supported) {
			console.warn("[AudioProcessor] Audio codec not supported:", audioConfig.codec);
			onProgress?.(100);
			return;
		}

		// Phase 1: Decode audio from source, skipping trimmed regions
		const decodedFrames: AudioData[] = [];

		const decoder = new AudioDecoder({
			output: (data: AudioData) => decodedFrames.push(data),
			error: (e: DOMException) => console.error("[AudioProcessor] Decode error:", e),
		});
		decoder.configure(audioConfig);

		const safeReadEndSec =
			typeof readEndSec === "number" && Number.isFinite(readEndSec)
				? Math.max(0, readEndSec)
				: undefined;
		const audioStream = (
			safeReadEndSec !== undefined
				? demuxer.read("audio", 0, safeReadEndSec)
				: demuxer.read("audio")
		) as ReadableStream<EncodedAudioChunk>;
		const reader = audioStream.getReader();

		try {
			while (!this.cancelled) {
				const { done, value: chunk } = await reader.read();
				if (done || !chunk) break;

				const timestampMs = chunk.timestamp / 1000;
				if (this.isInTrimRegion(timestampMs, sortedTrims)) continue;

				decoder.decode(chunk);

				while (decoder.decodeQueueSize > DECODE_BACKPRESSURE_LIMIT && !this.cancelled) {
					await new Promise((resolve) => setTimeout(resolve, 1));
				}
			}
		} finally {
			try {
				await reader.cancel();
			} catch {
				/* reader already closed */
			}
		}

		if (decoder.state === "configured") {
			await decoder.flush();
			decoder.close();
		}

		if (this.cancelled || decodedFrames.length === 0) {
			for (const frame of decodedFrames) frame.close();
			onProgress?.(100);
			return;
		}

		// Phase 2: Re-encode with timestamps adjusted for trim gaps
		const encodedChunks: { chunk: EncodedAudioChunk; meta?: EncodedAudioChunkMetadata }[] = [];

		const encoder = new AudioEncoder({
			output: (chunk: EncodedAudioChunk, meta?: EncodedAudioChunkMetadata) => {
				encodedChunks.push({ chunk, meta });
			},
			error: (e: DOMException) => console.error("[AudioProcessor] Encode error:", e),
		});

		const sampleRate = audioConfig.sampleRate || 48000;
		const channels = audioConfig.numberOfChannels || 2;

		const encodeConfig: AudioEncoderConfig = {
			codec: "opus",
			sampleRate,
			numberOfChannels: channels,
			bitrate: AUDIO_BITRATE,
		};

		const encodeSupport = await AudioEncoder.isConfigSupported(encodeConfig);
		if (!encodeSupport.supported) {
			console.warn("[AudioProcessor] Opus encoding not supported, skipping audio");
			for (const frame of decodedFrames) frame.close();
			onProgress?.(100);
			return;
		}

		encoder.configure(encodeConfig);

		const totalFrames = decodedFrames.length;
		for (let i = 0; i < decodedFrames.length; i++) {
			const audioData = decodedFrames[i];
			if (this.cancelled) {
				audioData.close();
				continue;
			}

			const timestampMs = audioData.timestamp / 1000;
			const trimOffsetMs = this.computeTrimOffset(timestampMs, sortedTrims);
			const adjustedTimestampUs = audioData.timestamp - trimOffsetMs * 1000;

			const adjusted = this.cloneWithTimestamp(audioData, Math.max(0, adjustedTimestampUs));
			audioData.close();

			encoder.encode(adjusted);
			adjusted.close();

			// Report progress through encode phase (0–80% of audio budget)
			onProgress?.(Math.round((i / totalFrames) * 80));
		}

		if (encoder.state === "configured") {
			await encoder.flush();
			encoder.close();
		}

		onProgress?.(85);

		// Phase 3: Flush encoded chunks to muxer
		for (const { chunk, meta } of encodedChunks) {
			if (this.cancelled) break;
			await muxer.addAudioChunk(chunk, meta);
		}

		console.log(
			`[AudioProcessor] Processed ${decodedFrames.length} audio frames, encoded ${encodedChunks.length} chunks`,
		);
		onProgress?.(100);
	}

	/**
	 * Speed/audio-settings-aware path using OfflineAudioContext.
	 * Processes audio faster than real-time (no actual playback needed),
	 * unlike the old HTMLMediaElement + MediaRecorder approach which had to
	 * play through the entire video at 1x speed before exporting.
	 */
	private async renderPitchPreservedOfflineAudio(
		videoUrl: string,
		trimRegions: TrimRegion[],
		speedRegions: SpeedRegion[],
		audioSettings?: import("@/components/video-editor/types").AudioSettings,
		onProgress?: (progress: number) => void,
	): Promise<Blob> {
		onProgress?.(5);

		// Step 1: Fetch and decode the full audio buffer via AudioContext
		let rawAudioBuffer: AudioBuffer;
		try {
			rawAudioBuffer = await this.decodeAudioFromUrl(videoUrl, onProgress);
		} catch (e) {
			console.error("[AudioProcessor] Failed to decode audio via AudioContext:", e);
			throw e;
		}

		if (this.cancelled) throw new Error("Export cancelled");
		onProgress?.(40);

		// Step 2: Build the processed timeline from segments using OfflineAudioContext
		const sampleRate = rawAudioBuffer.sampleRate;
		const processedBuffer = await this.buildProcessedBuffer(
			rawAudioBuffer,
			trimRegions,
			speedRegions,
			sampleRate,
			onProgress,
		);

		if (this.cancelled) throw new Error("Export cancelled");
		onProgress?.(75);

		// Step 3: Apply audio settings graph if needed
		const finalBuffer = audioSettings
			? await this.applyAudioSettings(processedBuffer, sampleRate, audioSettings, onProgress)
			: processedBuffer;

		if (this.cancelled) throw new Error("Export cancelled");
		onProgress?.(90);

		// Step 4: Encode to WebM/Opus blob via MediaRecorder on a silent OfflineAudioContext render
		const blob = await this.encodeAudioBufferToBlob(finalBuffer);
		onProgress?.(98);
		return blob;
	}

	/**
	 * Fetches and decodes audio to an AudioBuffer using decodeAudioData.
	 * This uses the browser's native decoder, which is very fast.
	 */
	private async decodeAudioFromUrl(
		videoUrl: string,
		onProgress?: (progress: number) => void,
	): Promise<AudioBuffer> {
		onProgress?.(8);
		let arrayBuffer: ArrayBuffer;

		// Try to use Electron's IPC to read file directly (avoids fetch for local files)
		if (!/^(https?:|blob:|data:)/i.test(videoUrl) && window.electronAPI?.readBinaryFile) {
			const result = await window.electronAPI.readBinaryFile(videoUrl);
			if (!result.success || !result.data) {
				throw new Error(result.message || result.error || "Failed to read audio file");
			}
			arrayBuffer = result.data as ArrayBuffer;
		} else {
			const response = await fetch(videoUrl);
			if (!response.ok) throw new Error(`Failed to fetch audio: ${response.status}`);
			arrayBuffer = await response.arrayBuffer();
		}

		onProgress?.(20);
		if (this.cancelled) throw new Error("Export cancelled");

		// decodeAudioData is synchronous in its processing (runs in a worker internally)
		// and is much faster than real-time playback
		const ctx = new AudioContext();
		try {
			const buffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
			return buffer;
		} finally {
			await ctx.close();
		}
	}

	/**
	 * Builds a processed AudioBuffer with trim/speed applied using OfflineAudioContext.
	 * Runs faster than real-time since OfflineAudioContext renders at maximum speed.
	 */
	private async buildProcessedBuffer(
		rawBuffer: AudioBuffer,
		trimRegions: TrimRegion[],
		speedRegions: SpeedRegion[],
		sampleRate: number,
		onProgress?: (progress: number) => void,
	): Promise<AudioBuffer> {
		// Compute the set of (start, end, speed) segments after applying trims
		const segments = this.computeAudioSegments(rawBuffer.duration * 1000, trimRegions, speedRegions);

		if (segments.length === 0) {
			// Return a silent 0.1s buffer if there's nothing to play
			const offCtx = new OfflineAudioContext(rawBuffer.numberOfChannels, sampleRate / 10, sampleRate);
			return offCtx.startRendering();
		}

		// Total output length in samples
		const totalOutputSamples = segments.reduce((sum, seg) => {
			const inputDurationSec = (seg.endMs - seg.startMs) / 1000;
			const outputDurationSec = inputDurationSec / seg.speed;
			return sum + Math.ceil(outputDurationSec * sampleRate);
		}, 0);

		const offCtx = new OfflineAudioContext(
			rawBuffer.numberOfChannels,
			Math.max(1, totalOutputSamples),
			sampleRate,
		);

		let outputOffsetSec = 0;
		const totalSegments = segments.length;

		for (let i = 0; i < segments.length; i++) {
			if (this.cancelled) throw new Error("Export cancelled");

			const seg = segments[i];
			const inputStartSec = seg.startMs / 1000;
			const inputDurationSec = (seg.endMs - seg.startMs) / 1000;
			const outputDurationSec = inputDurationSec / seg.speed;

			// Extract the segment slice from the source buffer
			const segmentSamples = Math.ceil(inputDurationSec * sampleRate);
			const segmentBuffer = offCtx.createBuffer(
				rawBuffer.numberOfChannels,
				Math.max(1, segmentSamples),
				sampleRate,
			);
			const srcOffsetSamples = Math.floor(inputStartSec * sampleRate);
			for (let ch = 0; ch < rawBuffer.numberOfChannels; ch++) {
				const srcData = rawBuffer.getChannelData(ch);
				const dstData = segmentBuffer.getChannelData(ch);
				const copyLen = Math.min(dstData.length, srcData.length - srcOffsetSamples);
				if (copyLen > 0) {
					dstData.set(srcData.subarray(srcOffsetSamples, srcOffsetSamples + copyLen));
				}
			}

			const source = offCtx.createBufferSource();
			source.buffer = segmentBuffer;
			source.playbackRate.value = seg.speed;
			source.connect(offCtx.destination);
			source.start(outputOffsetSec, 0, inputDurationSec);

			outputOffsetSec += outputDurationSec;

			// Report progress in the 40–70% band
			onProgress?.(40 + Math.round(((i + 1) / totalSegments) * 30));
		}

		return offCtx.startRendering();
	}

	/**
	 * Applies audio settings (highpass, compression, treble, loudness) to an AudioBuffer
	 * using OfflineAudioContext — runs faster than real-time.
	 */
	private async applyAudioSettings(
		buffer: AudioBuffer,
		sampleRate: number,
		audioSettings: import("@/components/video-editor/types").AudioSettings,
		onProgress?: (progress: number) => void,
	): Promise<AudioBuffer> {
		onProgress?.(76);
		const offCtx = new OfflineAudioContext(
			buffer.numberOfChannels,
			buffer.length,
			sampleRate,
		);

		const source = offCtx.createBufferSource();
		source.buffer = buffer;

		const highpass = offCtx.createBiquadFilter();
		highpass.type = "highpass";
		highpass.frequency.value = audioSettings.highpassHz;

		const compressor = offCtx.createDynamicsCompressor();
		compressor.ratio.value = audioSettings.compressionRatio;

		const treble = offCtx.createBiquadFilter();
		treble.type = "highshelf";
		treble.frequency.value = 3000;
		treble.gain.value = audioSettings.trebleDb;

		const loudnessGain = offCtx.createGain();
		loudnessGain.gain.value = Math.pow(10, audioSettings.loudnessDb / 20);

		source.connect(highpass);
		highpass.connect(compressor);
		compressor.connect(treble);
		treble.connect(loudnessGain);
		loudnessGain.connect(offCtx.destination);

		source.start(0);
		const rendered = await offCtx.startRendering();
		onProgress?.(88);
		return rendered;
	}

	/**
	 * Encodes an AudioBuffer to a WebM/Opus Blob.
	 * Uses a short MediaRecorder session fed from a live AudioContext
	 * to serialize the already-processed buffer — much faster than real-time
	 * since the buffer is fully built before this step.
	 */
	private async encodeAudioBufferToBlob(buffer: AudioBuffer): Promise<Blob> {
		// Create a live AudioContext to play back the processed buffer into a MediaRecorder
		const ctx = new AudioContext({ sampleRate: buffer.sampleRate });
		const dest = ctx.createMediaStreamDestination();
		const source = ctx.createBufferSource();
		source.buffer = buffer;
		source.connect(dest);

		const mimeType = this.getSupportedAudioMimeType();
		const options: MediaRecorderOptions = {
			audioBitsPerSecond: AUDIO_BITRATE,
			...(mimeType ? { mimeType } : {}),
		};

		const recorder = new MediaRecorder(dest.stream, options);
		const chunks: Blob[] = [];

		const recordedBlobPromise = new Promise<Blob>((resolve, reject) => {
			recorder.ondataavailable = (event: BlobEvent) => {
				if (event.data && event.data.size > 0) chunks.push(event.data);
			};
			recorder.onerror = () => reject(new Error("MediaRecorder failed during audio encoding"));
			recorder.onstop = () => {
				const type = mimeType || chunks[0]?.type || "audio/webm";
				resolve(new Blob(chunks, { type }));
			};
		});

		recorder.start();
		source.start(0);

		// Wait for playback to end (this is proportional to audio duration, but since
		// the buffer is already processed the recording is the only remaining real-time step)
		await new Promise<void>((resolve) => {
			source.onended = () => resolve();
		});

		if (recorder.state !== "inactive") recorder.stop();
		dest.stream.getTracks().forEach((t) => t.stop());
		source.disconnect();
		dest.disconnect();
		await ctx.close();

		return recordedBlobPromise;
	}

	/**
	 * Computes a list of {startMs, endMs, speed} segments after applying trim regions.
	 */
	private computeAudioSegments(
		totalDurationMs: number,
		trimRegions: TrimRegion[],
		speedRegions: SpeedRegion[],
	): Array<{ startMs: number; endMs: number; speed: number }> {
		// First produce kept segments from trim regions
		const sortedTrims = [...trimRegions].sort((a, b) => a.startMs - b.startMs);
		const keptSegments: Array<{ startMs: number; endMs: number }> = [];
		let cursor = 0;

		for (const trim of sortedTrims) {
			if (cursor < trim.startMs) {
				keptSegments.push({ startMs: cursor, endMs: trim.startMs });
			}
			cursor = trim.endMs;
		}
		if (cursor < totalDurationMs) {
			keptSegments.push({ startMs: cursor, endMs: totalDurationMs });
		}

		if (keptSegments.length === 0) {
			return [{ startMs: 0, endMs: totalDurationMs, speed: 1 }];
		}

		// Then split each kept segment by speed regions
		const result: Array<{ startMs: number; endMs: number; speed: number }> = [];
		for (const seg of keptSegments) {
			const overlapping = speedRegions
				.filter((sr) => sr.startMs < seg.endMs && sr.endMs > seg.startMs)
				.sort((a, b) => a.startMs - b.startMs);

			if (overlapping.length === 0) {
				result.push({ ...seg, speed: 1 });
				continue;
			}

			let pos = seg.startMs;
			for (const sr of overlapping) {
				const srStart = Math.max(sr.startMs, seg.startMs);
				const srEnd = Math.min(sr.endMs, seg.endMs);
				if (pos < srStart) result.push({ startMs: pos, endMs: srStart, speed: 1 });
				result.push({ startMs: srStart, endMs: srEnd, speed: sr.speed });
				pos = srEnd;
			}
			if (pos < seg.endMs) result.push({ startMs: pos, endMs: seg.endMs, speed: 1 });
		}

		return result.filter((s) => s.endMs - s.startMs > 1);
	}

	// Demuxes the rendered speed-adjusted blob and feeds encoded chunks into the MP4 muxer.
	private async muxRenderedAudioBlob(blob: Blob, muxer: VideoMuxer): Promise<void> {
		if (this.cancelled) return;

		const file = new File([blob], "speed-audio.webm", { type: blob.type || "audio/webm" });
		const wasmUrl = new URL("./wasm/web-demuxer.wasm", window.location.href).href;
		const demuxer = new WebDemuxer({ wasmFilePath: wasmUrl });

		try {
			await demuxer.load(file);
			const audioConfig = (await demuxer.getDecoderConfig("audio")) as AudioDecoderConfig;
			const reader = (demuxer.read("audio") as ReadableStream<EncodedAudioChunk>).getReader();
			let isFirstChunk = true;

			try {
				while (!this.cancelled) {
					const { done, value: chunk } = await reader.read();
					if (done || !chunk) break;
					if (isFirstChunk) {
						await muxer.addAudioChunk(chunk, { decoderConfig: audioConfig });
						isFirstChunk = false;
					} else {
						await muxer.addAudioChunk(chunk);
					}
				}
			} finally {
				try {
					await reader.cancel();
				} catch {
					/* reader already closed */
				}
			}
		} finally {
			try {
				demuxer.destroy();
			} catch {
				/* ignore */
			}
		}
	}

	private getSupportedAudioMimeType(): string | undefined {
		const candidates = ["audio/webm;codecs=opus", "audio/webm"];
		for (const candidate of candidates) {
			if (MediaRecorder.isTypeSupported(candidate)) {
				return candidate;
			}
		}
		return undefined;
	}

	private isInTrimRegion(timestampMs: number, trims: TrimRegion[]): boolean {
		return trims.some((trim) => timestampMs >= trim.startMs && timestampMs < trim.endMs);
	}

	private computeTrimOffset(timestampMs: number, trims: TrimRegion[]): number {
		let offset = 0;
		for (const trim of trims) {
			if (trim.endMs <= timestampMs) {
				offset += trim.endMs - trim.startMs;
			}
		}
		return offset;
	}

	private cloneWithTimestamp(src: AudioData, newTimestamp: number): AudioData {
		const isPlanar = src.format?.includes("planar") ?? false;
		const numPlanes = isPlanar ? src.numberOfChannels : 1;

		let totalSize = 0;
		for (let planeIndex = 0; planeIndex < numPlanes; planeIndex++) {
			totalSize += src.allocationSize({ planeIndex });
		}

		const buffer = new ArrayBuffer(totalSize);
		let offset = 0;
		for (let planeIndex = 0; planeIndex < numPlanes; planeIndex++) {
			const planeSize = src.allocationSize({ planeIndex });
			src.copyTo(new Uint8Array(buffer, offset, planeSize), { planeIndex });
			offset += planeSize;
		}

		return new AudioData({
			format: src.format!,
			sampleRate: src.sampleRate,
			numberOfFrames: src.numberOfFrames,
			numberOfChannels: src.numberOfChannels,
			timestamp: newTimestamp,
			data: buffer,
		});
	}

	cancel(): void {
		this.cancelled = true;
	}
}
