import { WebDemuxer } from "web-demuxer";
import type { SpeedRegion, TrimRegion } from "@/components/video-editor/types";
import type { ExportAudioMuxerCodec, VideoMuxer } from "./muxer";

const AUDIO_BITRATE = 128_000;
const DECODE_BACKPRESSURE_LIMIT = 20;
const MIN_SPEED_REGION_DELTA_MS = 0.0001;
const SEEK_TIMEOUT_MS = 5_000;

export interface ExportAudioCodec {
	encoderCodec: string;
	muxerCodec: ExportAudioMuxerCodec;
	label: string;
	sampleRate: number;
	numberOfChannels: number;
}

type ExportAudioCodecCandidate = Omit<ExportAudioCodec, "sampleRate" | "numberOfChannels">;

const EXPORT_AUDIO_CODECS: ExportAudioCodecCandidate[] = [
	{ encoderCodec: "mp4a.40.2", muxerCodec: "aac", label: "AAC" },
	{ encoderCodec: "opus", muxerCodec: "opus", label: "Opus" },
];

function averageChannels(sourcePlanes: Float32Array[], frame: number) {
	let mixed = 0;
	for (const plane of sourcePlanes) {
		mixed += plane[frame] ?? 0;
	}
	return mixed / Math.max(1, sourcePlanes.length);
}

function weightedSample(
	sourcePlanes: Float32Array[],
	frame: number,
	weights: Array<[channel: number, weight: number]>,
) {
	let mixed = 0;
	let weightSum = 0;
	for (const [channel, weight] of weights) {
		const sample = sourcePlanes[channel]?.[frame];
		if (typeof sample !== "number") {
			continue;
		}
		mixed += sample * weight;
		weightSum += weight;
	}
	return weightSum > 0 ? mixed / weightSum : averageChannels(sourcePlanes, frame);
}

function getStereoDownmixWeights(sourceChannels: number) {
	const centerWeight = Math.SQRT1_2;
	const surroundWeight = Math.SQRT1_2;
	const lfeWeight = 0.5;

	if (sourceChannels >= 8) {
		// Windows 7.1 order: FL, FR, FC, LFE, BL, BR, SL, SR.
		return {
			left: [
				[0, 1],
				[2, centerWeight],
				[3, lfeWeight],
				[4, surroundWeight],
				[6, surroundWeight],
			] satisfies Array<[number, number]>,
			right: [
				[1, 1],
				[2, centerWeight],
				[3, lfeWeight],
				[5, surroundWeight],
				[7, surroundWeight],
			] satisfies Array<[number, number]>,
		};
	}

	if (sourceChannels >= 6) {
		// Windows 5.1 order: FL, FR, FC, LFE, BL, BR.
		return {
			left: [
				[0, 1],
				[2, centerWeight],
				[3, lfeWeight],
				[4, surroundWeight],
			] satisfies Array<[number, number]>,
			right: [
				[1, 1],
				[2, centerWeight],
				[3, lfeWeight],
				[5, surroundWeight],
			] satisfies Array<[number, number]>,
		};
	}

	if (sourceChannels >= 4) {
		return {
			left: [
				[0, 1],
				[2, surroundWeight],
			] satisfies Array<[number, number]>,
			right: [
				[1, 1],
				[3, surroundWeight],
			] satisfies Array<[number, number]>,
		};
	}

	return {
		left: [
			[0, 1],
			[2, centerWeight],
		] satisfies Array<[number, number]>,
		right: [
			[1, 1],
			[2, centerWeight],
		] satisfies Array<[number, number]>,
	};
}

export function downmixPlanarChannelsForExport(
	sourcePlanes: Float32Array[],
	targetChannels: number,
): Float32Array {
	const frameCount = sourcePlanes[0]?.length ?? 0;
	const output = new Float32Array(frameCount * targetChannels);

	if (targetChannels === 1) {
		for (let frame = 0; frame < frameCount; frame++) {
			output[frame] = averageChannels(sourcePlanes, frame);
		}
		return output;
	}

	if (targetChannels !== 2) {
		throw new Error(`Unsupported target channel count: ${targetChannels}`);
	}

	if (sourcePlanes.length === 1) {
		output.set(sourcePlanes[0], 0);
		output.set(sourcePlanes[0], frameCount);
		return output;
	}

	if (sourcePlanes.length === 2) {
		output.set(sourcePlanes[0], 0);
		output.set(sourcePlanes[1], frameCount);
		return output;
	}

	const weights = getStereoDownmixWeights(sourcePlanes.length);
	for (let frame = 0; frame < frameCount; frame++) {
		output[frame] = weightedSample(sourcePlanes, frame, weights.left);
		output[frameCount + frame] = weightedSample(sourcePlanes, frame, weights.right);
	}
	return output;
}

export class AudioProcessor {
	private cancelled = false;

	static async selectSupportedExportCodec(
		sampleRate: number,
		numberOfChannels: number,
	): Promise<ExportAudioCodec | null> {
		const channelOptions = [numberOfChannels];
		if (numberOfChannels > 2) {
			channelOptions.push(2);
		}

		if (!channelOptions.includes(1)) {
			channelOptions.push(1);
		}

		for (const codec of EXPORT_AUDIO_CODECS) {
			for (const channels of channelOptions) {
				const support = await AudioEncoder.isConfigSupported({
					codec: codec.encoderCodec,
					sampleRate,
					numberOfChannels: channels,
					bitrate: AUDIO_BITRATE,
				});
				if (support.supported) {
					return { ...codec, sampleRate, numberOfChannels: channels };
				}
			}
		}

		return null;
	}

	static async selectSupportedExportCodecForSource(
		demuxer: WebDemuxer,
	): Promise<ExportAudioCodec | null> {
		let audioConfig: AudioDecoderConfig;
		try {
			audioConfig = await demuxer.getDecoderConfig("audio");
		} catch {
			return null;
		}

		const codecCheck = await AudioDecoder.isConfigSupported(audioConfig);
		if (!codecCheck.supported) {
			console.warn("[AudioProcessor] Audio codec not supported:", audioConfig.codec);
			return null;
		}

		return AudioProcessor.selectSupportedExportCodec(
			audioConfig.sampleRate || 48000,
			audioConfig.numberOfChannels || 2,
		);
	}

	/**
	 * Two modes: no speed regions uses the fast WebCodecs trim-only pipeline; speed
	 * regions use the pitch-preserving rendered timeline pipeline.
	 */
	async process(
		demuxer: WebDemuxer,
		muxer: VideoMuxer,
		videoUrl: string,
		trimRegions: TrimRegion[] | undefined,
		speedRegions: SpeedRegion[] | undefined,
		validatedDurationSec: number,
		exportCodec: ExportAudioCodec,
	): Promise<void> {
		const sortedTrims = trimRegions ? [...trimRegions].sort((a, b) => a.startMs - b.startMs) : [];
		const sortedSpeedRegions = speedRegions
			? [...speedRegions]
					.filter((region) => region.endMs - region.startMs > MIN_SPEED_REGION_DELTA_MS)
					.sort((a, b) => a.startMs - b.startMs)
			: [];

		// Speed edits need timeline playback to preserve pitch.
		if (sortedSpeedRegions.length > 0) {
			const renderedAudioBlob = await this.renderPitchPreservedTimelineAudio(
				videoUrl,
				sortedTrims,
				sortedSpeedRegions,
				validatedDurationSec,
			);
			if (!this.cancelled && renderedAudioBlob.size > 0) {
				await this.muxRenderedAudioBlob(renderedAudioBlob, muxer, exportCodec);
				return;
			}
			return;
		}

		// No speed edits: demux/decode/encode with trim timestamp remap. The +0.5s mirrors
		// streamingDecoder.decodeAll's read window so both paths read the same distance past
		// the validated duration boundary.
		const readEndSec = validatedDurationSec + 0.5;
		await this.processTrimOnlyAudio(demuxer, muxer, sortedTrims, readEndSec, exportCodec);
	}

	// Trim-only path, used for projects without speed regions.
	private async processTrimOnlyAudio(
		demuxer: WebDemuxer,
		muxer: VideoMuxer,
		sortedTrims: TrimRegion[],
		readEndSec?: number,
		exportCodec?: ExportAudioCodec,
	): Promise<void> {
		let audioConfig: AudioDecoderConfig;
		try {
			audioConfig = await demuxer.getDecoderConfig("audio");
		} catch {
			console.warn("[AudioProcessor] No audio track found, skipping");
			return;
		}

		const codecCheck = await AudioDecoder.isConfigSupported(audioConfig);
		if (!codecCheck.supported) {
			console.warn("[AudioProcessor] Audio codec not supported:", audioConfig.codec);
			return;
		}

		// Phase 1: decode, skipping trimmed regions.
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
		const audioStream =
			safeReadEndSec !== undefined
				? demuxer.read("audio", 0, safeReadEndSec)
				: demuxer.read("audio");
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

		// Phase 2: re-encode with timestamps adjusted for trim gaps.
		const encodedChunks: { chunk: EncodedAudioChunk; meta?: EncodedAudioChunkMetadata }[] = [];

		const encoder = new AudioEncoder({
			output: (chunk: EncodedAudioChunk, meta?: EncodedAudioChunkMetadata) => {
				encodedChunks.push({ chunk, meta });
			},
			error: (e: DOMException) => console.error("[AudioProcessor] Encode error:", e),
		});

		const sampleRate = audioConfig.sampleRate || 48000;
		const channels = audioConfig.numberOfChannels || 2;
		const selectedCodec =
			exportCodec ?? (await AudioProcessor.selectSupportedExportCodec(sampleRate, channels));
		if (!selectedCodec) {
			console.warn("[AudioProcessor] No supported audio export codec, skipping audio");
			for (const frame of decodedFrames) frame.close();
			return;
		}

		const outputSampleRate = selectedCodec.sampleRate || sampleRate;
		const outputChannels = selectedCodec.numberOfChannels || channels;
		const encodeConfig: AudioEncoderConfig = {
			codec: selectedCodec.encoderCodec,
			sampleRate: outputSampleRate,
			numberOfChannels: outputChannels,
			bitrate: AUDIO_BITRATE,
		};

		const encodeSupport = await AudioEncoder.isConfigSupported(encodeConfig);
		if (!encodeSupport.supported) {
			console.warn(
				`[AudioProcessor] ${selectedCodec.label} encoding not supported, skipping audio`,
			);
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

			const adjusted = this.cloneForEncoding(
				audioData,
				Math.max(0, adjustedTimestampUs),
				outputChannels,
			);
			audioData.close();

			encoder.encode(adjusted);
			adjusted.close();
		}

		if (encoder.state === "configured") {
			await encoder.flush();
			encoder.close();
		}

		// Phase 3: flush encoded chunks to muxer.
		for (const { chunk, meta } of encodedChunks) {
			if (this.cancelled) break;
			await muxer.addAudioChunk(chunk, meta);
		}

		console.log(
			`[AudioProcessor] Processed ${decodedFrames.length} audio frames, encoded ${encodedChunks.length} chunks`,
		);
	}

	// Speed-aware path mirroring preview semantics (trim skipping + playbackRate). Relies on
	// browser media playback to preserve pitch and avoid the chipmunk effect.
	private async renderPitchPreservedTimelineAudio(
		videoUrl: string,
		trimRegions: TrimRegion[],
		speedRegions: SpeedRegion[],
		validatedDurationSec: number,
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

		const audioContext = new AudioContext();
		const sourceNode = audioContext.createMediaElementSource(media);
		const destinationNode = audioContext.createMediaStreamDestination();
		sourceNode.connect(destinationNode);

		let rafId: number | null = null;
		let recorder: MediaRecorder | null = null;
		let recordedBlobPromise: Promise<Blob> | null = null;

		try {
			if (audioContext.state === "suspended") {
				await audioContext.resume();
			}

			// Skip initial trim region(s) before recording so the first rAF frames don't
			// capture trimmed audio. Loops to handle back-to-back/overlapping trims at t=0.
			const effectiveEnd = validatedDurationSec;
			let startPosition = 0;
			for (let i = 0; i <= trimRegions.length; i++) {
				const activeTrim = this.findActiveTrimRegion(startPosition * 1000, trimRegions);
				if (!activeTrim) break;
				startPosition = activeTrim.endMs / 1000;
				if (startPosition >= effectiveEnd) break;
			}

			if (startPosition >= effectiveEnd) {
				// Everything is trimmed; return a silent blob.
				return new Blob([], { type: "audio/webm" });
			}

			await this.seekTo(media, startPosition);

			// Set initial playback rate for the starting position.
			const initialSpeedRegion = this.findActiveSpeedRegion(startPosition * 1000, speedRegions);
			if (initialSpeedRegion) {
				media.playbackRate = initialSpeedRegion.speed;
			}

			// Start recording only after seeking past trims.
			const recording = this.startAudioRecording(destinationNode.stream);
			recorder = recording.recorder;
			recordedBlobPromise = recording.recordedBlobPromise;
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

					// Stop at validated duration; media.duration can be inflated by bad
					// container metadata.
					if (media.currentTime >= validatedDurationSec) {
						media.pause();
						cleanup();
						resolve();
						return;
					}

					const currentTimeMs = media.currentTime * 1000;
					const activeTrimRegion = this.findActiveTrimRegion(currentTimeMs, trimRegions);

					if (activeTrimRegion && !media.paused && !media.ended) {
						const skipToTime = activeTrimRegion.endMs / 1000;
						if (skipToTime >= media.duration || skipToTime >= validatedDurationSec) {
							media.pause();
							cleanup();
							resolve();
							return;
						}
						// Pause recording during the seek so we don't capture silence/noise.
						media.pause();
						if (recorder?.state === "recording") recorder.pause();
						const onSeeked = () => {
							clearTimeout(seekTimer);
							if (this.cancelled) {
								cleanup();
								resolve();
								return;
							}
							if (recorder?.state === "paused") recorder.resume();
							media
								.play()
								.then(() => {
									if (!this.cancelled) rafId = requestAnimationFrame(tick);
								})
								.catch((err) => {
									cleanup();
									reject(
										new Error(
											`Failed to resume playback after trim seek: ${err instanceof Error ? err.message : String(err)}`,
										),
									);
								});
						};
						const seekTimer = window.setTimeout(() => {
							media.removeEventListener("seeked", onSeeked);
							cleanup();
							reject(new Error("Audio seek timed out while skipping trim region"));
						}, SEEK_TIMEOUT_MS);
						media.addEventListener("seeked", onSeeked, { once: true });
						media.currentTime = skipToTime;
						return;
					}

					const activeSpeedRegion = this.findActiveSpeedRegion(currentTimeMs, speedRegions);
					const playbackRate = activeSpeedRegion ? activeSpeedRegion.speed : 1;
					if (Math.abs(media.playbackRate - playbackRate) > 0.0001) {
						media.playbackRate = playbackRate;
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
			if (recorder && recorder.state !== "inactive") {
				recorder.stop();
			}
			destinationNode.stream.getTracks().forEach((track) => track.stop());
			sourceNode.disconnect();
			destinationNode.disconnect();
			await audioContext.close();
			media.src = "";
			media.load();
		}

		if (!recordedBlobPromise) {
			// Either an early return fired or startAudioRecording set this before playback
			// resolved. Reaching here means that broke; fail loud rather than return silence.
			throw new Error("Audio recorder finished without assigning recordedBlobPromise");
		}
		const recordedBlob = await recordedBlobPromise;
		if (this.cancelled) {
			throw new Error("Export cancelled");
		}
		return recordedBlob;
	}

	// Demux the rendered speed-adjusted blob and feed its chunks into the MP4 muxer.
	private async muxRenderedAudioBlob(
		blob: Blob,
		muxer: VideoMuxer,
		exportCodec: ExportAudioCodec,
	): Promise<void> {
		if (this.cancelled) return;

		const file = new File([blob], "speed-audio.webm", { type: blob.type || "audio/webm" });
		const wasmUrl = new URL("./wasm/web-demuxer.wasm", window.location.href).href;
		const demuxer = new WebDemuxer({ wasmFilePath: wasmUrl });

		try {
			await demuxer.load(file);
			await this.processTrimOnlyAudio(demuxer, muxer, [], undefined, exportCodec);
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

	private cloneForEncoding(
		src: AudioData,
		newTimestamp: number,
		targetChannels: number,
	): AudioData {
		if (targetChannels !== src.numberOfChannels) {
			return this.downmixWithTimestamp(src, newTimestamp, targetChannels);
		}

		if (!src.format) {
			throw new Error("AudioData format is required for cloning");
		}
		const isPlanar = src.format.includes("planar");
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
			format: src.format,
			sampleRate: src.sampleRate,
			numberOfFrames: src.numberOfFrames,
			numberOfChannels: src.numberOfChannels,
			timestamp: newTimestamp,
			data: buffer,
		});
	}

	private downmixWithTimestamp(
		src: AudioData,
		newTimestamp: number,
		targetChannels: number,
	): AudioData {
		const sourceChannels = src.numberOfChannels;
		const frameCount = src.numberOfFrames;
		if (targetChannels < 1 || targetChannels > 2) {
			throw new Error(`Unsupported target channel count: ${targetChannels}`);
		}

		const sourcePlanes = Array.from({ length: sourceChannels }, () => new Float32Array(frameCount));
		for (let channel = 0; channel < sourceChannels; channel++) {
			src.copyTo(sourcePlanes[channel], {
				format: "f32-planar",
				planeIndex: channel,
			});
		}

		const output = downmixPlanarChannelsForExport(sourcePlanes, targetChannels);

		return new AudioData({
			format: "f32-planar",
			sampleRate: src.sampleRate,
			numberOfFrames: frameCount,
			numberOfChannels: targetChannels,
			timestamp: newTimestamp,
			data: output.buffer instanceof ArrayBuffer ? output.buffer : output.slice().buffer,
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
