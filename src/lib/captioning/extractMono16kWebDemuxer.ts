import { WebDemuxer } from "web-demuxer";

import { MAX_CAPTION_AUDIO_SEC } from "./captionConstants";

const DECODE_QUEUE_BACKPRESSURE = 20;
const SOURCE_LOAD_TIMEOUT_MS = 60_000;
const READ_END_PADDING_SEC = 0.5;

function webDemuxerWasmUrl(): string {
	return new URL("../exporter/wasm/web-demuxer.wasm", window.location.href).href;
}

function audioDataFrameToMono(frame: AudioData): Float32Array {
	const frames = frame.numberOfFrames;
	const ch = frame.numberOfChannels;
	const out = new Float32Array(frames);
	const fmt = frame.format || "";
	const planar = fmt.includes("planar");

	if (planar) {
		const plane = new Float32Array(frames);
		for (let c = 0; c < ch; c++) {
			frame.copyTo(plane, { planeIndex: c });
			for (let i = 0; i < frames; i++) {
				out[i] += plane[i];
			}
		}
		for (let i = 0; i < frames; i++) {
			out[i] /= ch;
		}
	} else {
		const interleaved = new Float32Array(frames * ch);
		frame.copyTo(interleaved, { planeIndex: 0 });
		for (let i = 0; i < frames; i++) {
			let sum = 0;
			for (let c = 0; c < ch; c++) {
				sum += interleaved[i * ch + c];
			}
			out[i] = sum / ch;
		}
	}
	return out;
}

function mergeAndConsumeDecodedAudioToMonoLinear(
	frames: AudioData[],
	sampleRate: number,
	durationSec: number,
): Float32Array {
	const sorted = [...frames].sort((a, b) => a.timestamp - b.timestamp);
	const totalSamples = Math.max(1, Math.ceil(durationSec * sampleRate));
	const acc = new Float32Array(totalSamples);
	const weight = new Float32Array(totalSamples);

	for (const frame of sorted) {
		const startSample = Math.round((frame.timestamp / 1e6) * sampleRate);
		const slice = audioDataFrameToMono(frame);
		for (let i = 0; i < slice.length; i++) {
			const pos = startSample + i;
			if (pos >= 0 && pos < totalSamples) {
				acc[pos] += slice[i];
				weight[pos] += 1;
			}
		}
		frame.close();
	}

	for (let i = 0; i < totalSamples; i++) {
		if (weight[i] > 0) {
			acc[i] /= weight[i];
		}
	}
	return acc;
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const id = window.setTimeout(() => reject(new Error(message)), ms);
		promise
			.then((v) => {
				window.clearTimeout(id);
				resolve(v);
			})
			.catch((e) => {
				window.clearTimeout(id);
				reject(e instanceof Error ? e : new Error(String(e)));
			});
	});
}

/**
 * Demux + WebCodecs audio decode (same stack as export). Use when `decodeAudioData`
 * can't handle the container (e.g. WebM with video).
 */
export async function extractMonoPcmViaWebDemuxer(
	file: File,
	signal?: AbortSignal,
): Promise<{ mono: Float32Array; sampleRate: number; durationSec: number }> {
	const demuxer = new WebDemuxer({ wasmFilePath: webDemuxerWasmUrl() });
	await withTimeout(
		demuxer.load(file),
		SOURCE_LOAD_TIMEOUT_MS,
		"Timed out while parsing the source video for captions.",
	);

	if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

	const mediaInfo = await withTimeout(
		demuxer.getMediaInfo(),
		SOURCE_LOAD_TIMEOUT_MS,
		"Timed out while reading media info for captions.",
	);

	const reportedDurationSec =
		Number.isFinite(mediaInfo.duration) && mediaInfo.duration > 0 ? mediaInfo.duration : 0;

	let audioConfig: AudioDecoderConfig;
	try {
		audioConfig = await demuxer.getDecoderConfig("audio");
	} catch {
		throw new Error("No audio track found in this video.");
	}

	const codecCheck = await AudioDecoder.isConfigSupported(audioConfig);
	if (!codecCheck.supported) {
		throw new Error(`Audio codec not supported for captions: ${audioConfig.codec}`);
	}

	const sampleRate = audioConfig.sampleRate || 48_000;

	// Many WebM/Matroska files report a too-short duration, so capping read at reported time stops
	// demux early and clips everything past that. Read to the caption-decode ceiling instead; the
	// demuxer stops when the track ends.
	const readEndSec = MAX_CAPTION_AUDIO_SEC + READ_END_PADDING_SEC;
	const decodedFrames: AudioData[] = [];

	const decoder = new AudioDecoder({
		output: (data: AudioData) => decodedFrames.push(data),
		error: (e: DOMException) => console.error("[captioning] AudioDecoder error:", e),
	});
	decoder.configure(audioConfig);

	const reader = demuxer.read("audio", 0, readEndSec).getReader();
	try {
		while (!signal?.aborted) {
			const { done, value: chunk } = await reader.read();
			if (done || !chunk) break;
			decoder.decode(chunk);
			while (decoder.decodeQueueSize > DECODE_QUEUE_BACKPRESSURE && !signal?.aborted) {
				await new Promise((r) => setTimeout(r, 1));
			}
		}
	} finally {
		try {
			await reader.cancel();
		} catch {
			/* already closed */
		}
	}

	if (decoder.state === "configured") {
		await decoder.flush();
		decoder.close();
	}

	if (signal?.aborted) {
		for (const f of decodedFrames) f.close();
		throw new DOMException("Aborted", "AbortError");
	}

	if (decodedFrames.length === 0) {
		throw new Error("Decoded zero audio frames from this video.");
	}

	let maxEndUs = 0;
	for (const f of decodedFrames) {
		const end = f.timestamp + (f.duration ?? 0);
		if (end > maxEndUs) maxEndUs = end;
	}
	const inferredDurationSec = maxEndUs / 1e6;
	// Prefer extent implied by decoded frames (fixes bad container duration); fall back to reported
	// metadata when frames lack duration.
	const durationSec = inferredDurationSec > 0.02 ? inferredDurationSec : reportedDurationSec;

	const mono = mergeAndConsumeDecodedAudioToMonoLinear(decodedFrames, sampleRate, durationSec);
	return { mono, sampleRate, durationSec };
}
