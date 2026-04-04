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
	 * 1) no speed regions -> fast WebCodecs trim-only pipeline
	 * 2) speed regions present -> pitch-preserving rendered timeline pipeline
	 */
	async process(
		demuxer: WebDemuxer,
		muxer: VideoMuxer,
		videoUrl: string,
		trimRegions?: TrimRegion[],
		speedRegions?: SpeedRegion[],
		readEndSec?: number,
		audioSettings?: import("@/components/video-editor/types").AudioSettings,
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

		// Speed edits must use timeline playback to preserve pitch.
		// Audio edits also use timeline playback to evaluate the Web Audio graph.
		if (sortedSpeedRegions.length > 0 || hasActiveAudioSettings) {
			const renderedAudioBlob = await this.renderPitchPreservedTimelineAudio(
				videoUrl,
				sortedTrims,
				sortedSpeedRegions,
				audioSettings,
			);
			if (!this.cancelled) {
				await this.muxRenderedAudioBlob(renderedAudioBlob, muxer);
				return;
			}
		}

		// No speed edits: keep the original demux/decode/encode path with trim timestamp remap.
		await this.processTrimOnlyAudio(demuxer, muxer, sortedTrims, readEndSec);
	}

	// Legacy trim-only path. This is still used for projects without speed regions.
	private async processTrimOnlyAudio(
		demuxer: WebDemuxer,
		muxer: VideoMuxer,
		sortedTrims: TrimRegion[],
		readEndSec?: number,
	): Promise<void> {
		let audioConfig: AudioDecoderConfig;
		try {
			audioConfig = (await demuxer.getDecoderConfig("audio")) as AudioDecoderConfig;
		} catch {
			console.warn("[AudioProcessor] No audio track found, skipping");
			return;
		}

		const codecCheck = await AudioDecoder.isConfigSupported(audioConfig);
		if (!codecCheck.supported) {
			console.warn("[AudioProcessor] Audio codec not supported:", audioConfig.codec);
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
			return;
		}

		encoder.configure(encodeConfig);

		for (const audioData of decodedFrames) {
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
		}

		if (encoder.state === "configured") {
			await encoder.flush();
			encoder.close();
		}

		// Phase 3: Flush encoded chunks to muxer
		for (const { chunk, meta } of encodedChunks) {
			if (this.cancelled) break;
			await muxer.addAudioChunk(chunk, meta);
		}

		console.log(
			`[AudioProcessor] Processed ${decodedFrames.length} audio frames, encoded ${encodedChunks.length} chunks`,
		);
	}

	// Speed-aware path that mirrors preview semantics (trim skipping + playbackRate regions)
	// preserve pitch through browser media playback behavior to avoid chipmunk effect.
	private async renderPitchPreservedTimelineAudio(
		videoUrl: string,
		trimRegions: TrimRegion[],
		speedRegions: SpeedRegion[],
		audioSettings?: import("@/components/video-editor/types").AudioSettings,
	): Promise<Blob> {
		const media = document.createElement("audio");
		media.src = videoUrl;
		media.preload = "auto";

		const pitchMedia = media as HTMLMediaElement & {
			preservesPitch?: boolean;
			mozPreservesPitch?: boolean;
			webkitPreservesPitch?: boolean;
		};
		pitchMedia.preservesPitch = true;
		pitchMedia.mozPreservesPitch = true;
		pitchMedia.webkitPreservesPitch = true;

		await this.waitForLoadedMetadata(media);
		if (this.cancelled) {
			throw new Error("Export cancelled");
		}

		const audioContext = new window.AudioContext();
		const sourceNode = audioContext.createMediaElementSource(media);
		const destinationNode = audioContext.createMediaStreamDestination();

		let lastNode: AudioNode = sourceNode;

		if (audioSettings) {
			const highpass = audioContext.createBiquadFilter();
			highpass.type = "highpass";
			highpass.frequency.value = audioSettings.highpassHz;

			const compressor = audioContext.createDynamicsCompressor();
			compressor.ratio.value = audioSettings.compressionRatio;

			const treble = audioContext.createBiquadFilter();
			treble.type = "highshelf";
			treble.frequency.value = 3000;
			treble.gain.value = audioSettings.trebleDb;

			const loudnessGain = audioContext.createGain();
			loudnessGain.gain.value = Math.pow(10, audioSettings.loudnessDb / 20);

			lastNode.connect(highpass);
			highpass.connect(compressor);
			compressor.connect(treble);
			treble.connect(loudnessGain);
			lastNode = loudnessGain;
		}

		lastNode.connect(destinationNode);

		const { recorder, recordedBlobPromise } = this.startAudioRecording(destinationNode.stream);
		let rafId: number | null = null;

		try {
			if (audioContext.state === "suspended") {
				await audioContext.resume();
			}

			await this.seekTo(media, 0);
			await media.play();

			await new Promise<void>((resolve, reject) => {
				const cleanup = () => {
					if (rafId !== null) {
						cancelAnimationFrame(rafId);
						rafId = null;
					}
					media.removeEventListener("error", onError);
					media.removeEventListener("ended", onEnded);
				};

				const onError = () => {
					cleanup();
					reject(new Error("Failed while rendering speed-adjusted audio timeline"));
				};

				const onEnded = () => {
					cleanup();
					resolve();
				};

				const tick = () => {
					if (this.cancelled) {
						cleanup();
						resolve();
						return;
					}

					const currentTimeMs = media.currentTime * 1000;
					const activeTrimRegion = this.findActiveTrimRegion(currentTimeMs, trimRegions);

					if (activeTrimRegion && !media.paused && !media.ended) {
						const skipToTime = activeTrimRegion.endMs / 1000;
						if (skipToTime >= media.duration) {
							media.pause();
							cleanup();
							resolve();
							return;
						}
						media.currentTime = skipToTime;
					} else {
						const activeSpeedRegion = this.findActiveSpeedRegion(currentTimeMs, speedRegions);
						const playbackRate = activeSpeedRegion ? activeSpeedRegion.speed : 1;
						if (Math.abs(media.playbackRate - playbackRate) > 0.0001) {
							media.playbackRate = playbackRate;
						}
					}

					if (!media.paused && !media.ended) {
						rafId = requestAnimationFrame(tick);
					} else {
						cleanup();
						resolve();
					}
				};

				media.addEventListener("error", onError, { once: true });
				media.addEventListener("ended", onEnded, { once: true });
				rafId = requestAnimationFrame(tick);
			});
		} finally {
			if (rafId !== null) {
				cancelAnimationFrame(rafId);
			}
			media.pause();
			if (recorder.state !== "inactive") {
				recorder.stop();
			}
			destinationNode.stream.getTracks().forEach((track) => track.stop());
			sourceNode.disconnect();
			destinationNode.disconnect();
			await audioContext.close();
			media.src = "";
			media.load();
		}

		const recordedBlob = await recordedBlobPromise;
		if (this.cancelled) {
			throw new Error("Export cancelled");
		}
		return recordedBlob;
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

	private startAudioRecording(stream: MediaStream): {
		recorder: MediaRecorder;
		recordedBlobPromise: Promise<Blob>;
	} {
		const mimeType = this.getSupportedAudioMimeType();
		const options: MediaRecorderOptions = {
			audioBitsPerSecond: AUDIO_BITRATE,
			...(mimeType ? { mimeType } : {}),
		};

		const recorder = new MediaRecorder(stream, options);
		const chunks: Blob[] = [];

		const recordedBlobPromise = new Promise<Blob>((resolve, reject) => {
			recorder.ondataavailable = (event: BlobEvent) => {
				if (event.data && event.data.size > 0) {
					chunks.push(event.data);
				}
			};
			recorder.onerror = () => {
				reject(new Error("MediaRecorder failed while capturing speed-adjusted audio"));
			};
			recorder.onstop = () => {
				const type = mimeType || chunks[0]?.type || "audio/webm";
				resolve(new Blob(chunks, { type }));
			};
		});

		recorder.start();
		return { recorder, recordedBlobPromise };
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

	private waitForLoadedMetadata(media: HTMLMediaElement): Promise<void> {
		if (Number.isFinite(media.duration) && media.readyState >= HTMLMediaElement.HAVE_METADATA) {
			return Promise.resolve();
		}

		return new Promise<void>((resolve, reject) => {
			const onLoaded = () => {
				cleanup();
				resolve();
			};
			const onError = () => {
				cleanup();
				reject(new Error("Failed to load media metadata for speed-adjusted audio"));
			};
			const cleanup = () => {
				media.removeEventListener("loadedmetadata", onLoaded);
				media.removeEventListener("error", onError);
			};

			media.addEventListener("loadedmetadata", onLoaded);
			media.addEventListener("error", onError, { once: true });
		});
	}

	private seekTo(media: HTMLMediaElement, targetSec: number): Promise<void> {
		if (Math.abs(media.currentTime - targetSec) < 0.0001) {
			return Promise.resolve();
		}

		return new Promise<void>((resolve, reject) => {
			const onSeeked = () => {
				cleanup();
				resolve();
			};
			const onError = () => {
				cleanup();
				reject(new Error("Failed to seek media for speed-adjusted audio"));
			};
			const cleanup = () => {
				media.removeEventListener("seeked", onSeeked);
				media.removeEventListener("error", onError);
			};

			media.addEventListener("seeked", onSeeked, { once: true });
			media.addEventListener("error", onError, { once: true });
			media.currentTime = targetSec;
		});
	}

	private findActiveTrimRegion(
		currentTimeMs: number,
		trimRegions: TrimRegion[],
	): TrimRegion | null {
		return (
			trimRegions.find(
				(region) => currentTimeMs >= region.startMs && currentTimeMs < region.endMs,
			) || null
		);
	}

	private findActiveSpeedRegion(
		currentTimeMs: number,
		speedRegions: SpeedRegion[],
	): SpeedRegion | null {
		return (
			speedRegions.find(
				(region) => currentTimeMs >= region.startMs && currentTimeMs < region.endMs,
			) || null
		);
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

	cancel(): void {
		this.cancelled = true;
	}
}
