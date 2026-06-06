import type { TrimRegion } from "@/components/video-editor/types";
import type { CaptionSegment, TranscribeMono16kResult } from "./transcribe";

/**
 * Pure transcription algorithm for the captioning Web Worker: takes a built Whisper
 * `transcriber` and turns mono 16 kHz audio into timed caption segments. No DOM or
 * Transformers.js imports so it runs in a worker and unit-tests in isolation.
 */

/** A Transformers.js automatic-speech-recognition pipeline call. */
export type TranscriberFn = (
	audio: Float32Array,
	opts: Record<string, unknown>,
) => Promise<unknown>;

function segmentOverlapsTrim(startMs: number, endMs: number, trims: TrimRegion[]): boolean {
	return trims.some((t) => startMs < t.endMs && endMs > t.startMs);
}

/** Same trim-out rule as {@link segmentsFromTranscriberChunks}; for retry passes that used empty trims. */
function dropSegmentsOverlappingTrimRegions(
	segments: CaptionSegment[],
	trimRegions: TrimRegion[],
): CaptionSegment[] {
	if (trimRegions.length === 0) return segments;
	return segments.filter((s) => {
		const startMs = Math.round(s.startSec * 1000);
		const endMs = Math.round(s.endSec * 1000);
		return !segmentOverlapsTrim(startMs, endMs, trimRegions);
	});
}

/** Whisper runs with internal 30s chunks; keep each forward pass bounded for WASM memory. */
const TRANSCRIBE_SLICE_SAMPLES = 12 * 60 * 16_000;

/** Very short slices are skipped in the multi-slice loop unless padded (see `padTailSliceForTranscribe`). */
const MIN_TRANSCRIBE_SLICE_SAMPLES = 800;

/**
 * Pad a short tail slice so Whisper still runs; timestamps are clamped with `realDurationSec` so
 * padding does not extend perceived audio on the timeline.
 */
function padTailSliceForTranscribe(samples: Float32Array): {
	slice: Float32Array;
	realDurationSec: number;
} {
	const realDurationSec = samples.length / 16_000;
	if (samples.length >= MIN_TRANSCRIBE_SLICE_SAMPLES) {
		return { slice: samples, realDurationSec };
	}
	const padded = new Float32Array(MIN_TRANSCRIBE_SLICE_SAMPLES);
	padded.set(samples);
	return { slice: padded, realDurationSec };
}

/** Converts raw Whisper chunk output into sorted, deduped, trim-filtered caption segments. */
function segmentsFromTranscriberChunks(
	chunks: Array<{ timestamp?: [number | null, number | null]; text?: unknown }>,
	timeOffsetSec: number,
	trims: TrimRegion[],
	audioDurationSec: number,
): CaptionSegment[] {
	const sorted = [...chunks].sort((x, y) => {
		const ax = x.timestamp?.[0];
		const ay = y.timestamp?.[0];
		const na = typeof ax === "number" ? ax : -1;
		const nb = typeof ay === "number" ? ay : -1;
		return na - nb;
	});

	const segments: CaptionSegment[] = [];

	for (let idx = 0; idx < sorted.length; idx++) {
		const c = sorted[idx]!;
		const ts = c.timestamp as [number | null, number | null] | undefined;
		if (!ts) continue;
		let a = ts[0];
		let b = ts[1];
		if (a == null) a = 0;
		a = Math.max(0, a);
		if (b == null) {
			let nextStart: number | null = null;
			for (let j = idx + 1; j < sorted.length; j++) {
				const na = sorted[j]?.timestamp?.[0];
				if (typeof na === "number") {
					nextStart = na;
					break;
				}
			}
			b = nextStart ?? audioDurationSec;
		}
		if (b <= a) {
			b = Math.min(a + 0.25, audioDurationSec);
		}
		b = Math.min(b, audioDurationSec);

		const text = String(c.text ?? "")
			.replace(/\s+/g, " ")
			.trim();
		if (!text) continue;

		const startSec = a + timeOffsetSec;
		const sliceEnd = timeOffsetSec + audioDurationSec;
		const endSec = Math.min(Math.max(startSec + 0.08, b + timeOffsetSec), sliceEnd);
		const startMs = Math.round(startSec * 1000);
		const endMs = Math.round(endSec * 1000);
		if (segmentOverlapsTrim(startMs, endMs, trims)) continue;

		segments.push({ startSec, endSec, text });
	}

	segments.sort((u, v) => u.startSec - v.startSec || u.endSec - v.endSec);
	const rawDeduped: CaptionSegment[] = [];
	for (const seg of segments) {
		const prev = rawDeduped[rawDeduped.length - 1];
		if (prev && prev.text === seg.text && seg.startSec <= prev.endSec) {
			prev.endSec = Math.max(prev.endSec, seg.endSec);
			prev.startSec = Math.min(prev.startSec, seg.startSec);
			continue;
		}
		rawDeduped.push(seg);
	}
	return rawDeduped;
}

/** Runs the transcriber on one audio slice, chunking only long clips. */
async function runTranscriberOnSlice(
	transcriber: TranscriberFn,
	samples: Float32Array,
	opts: { forceFullSequences: boolean; timestampMode: "word" | "phrase" },
): Promise<unknown> {
	const durationSec = samples.length / 16_000;
	// Only chunk long clips; short-audio chunking regressed some Whisper.js runs (empty chunks).
	const chunking = durationSec > 30 ? { chunk_length_s: 30, stride_length_s: 5 } : {};
	return transcriber(samples, {
		return_timestamps: opts.timestampMode === "word" ? "word" : true,
		force_full_sequences: opts.forceFullSequences,
		...chunking,
	});
}

/** Flattens the various shapes a Transformers.js ASR result can take into a chunk list. */
function getChunksFromTranscriberResult(result: unknown): Array<{
	timestamp?: [number | null, number | null];
	text?: unknown;
}> {
	if (result == null) return [];
	if (Array.isArray(result)) {
		const out: Array<{ timestamp?: [number | null, number | null]; text?: unknown }> = [];
		for (const item of result) {
			const chunks = (item as { chunks?: unknown })?.chunks;
			if (Array.isArray(chunks)) out.push(...chunks);
		}
		return out;
	}
	const chunks = (result as { chunks?: unknown })?.chunks;
	return Array.isArray(chunks) ? chunks : [];
}

/** Prefer `chunks`; if the model only returned top-level `text`, synthesize one span for timing. */
function extractChunksFromAsrResult(result: unknown): Array<{
	timestamp?: [number | null, number | null];
	text?: unknown;
}> {
	const fromChunks = getChunksFromTranscriberResult(result);
	if (fromChunks.length > 0) return fromChunks;
	const single = Array.isArray(result) ? result[0] : result;
	const text =
		typeof (single as { text?: unknown })?.text === "string"
			? String((single as { text: string }).text).trim()
			: "";
	if (text) {
		return [{ timestamp: [0, null], text }];
	}
	return [];
}

/**
 * Drives Whisper over (possibly sliced) mono 16 kHz audio and returns timed segments.
 * Long audio is split so one pass doesn't exhaust WASM memory; timestamps are shifted
 * back onto the full timeline. Tries word- then phrase-level timestamps, with a
 * trim-ignoring retry, before giving up.
 */
export async function runTranscription(
	transcriber: TranscriberFn,
	samples: Float32Array,
	trims: TrimRegion[],
): Promise<TranscribeMono16kResult> {
	const transcribeOne = async (
		ignoreTrims: boolean,
		forceFullSequences: boolean,
		timestampMode: "word" | "phrase",
	): Promise<CaptionSegment[]> => {
		try {
			const activeTrims = ignoreTrims ? [] : trims;
			if (samples.length <= TRANSCRIBE_SLICE_SAMPLES) {
				const { slice, realDurationSec } = padTailSliceForTranscribe(samples);
				const result = await runTranscriberOnSlice(transcriber, slice, {
					forceFullSequences,
					timestampMode,
				});
				return segmentsFromTranscriberChunks(
					extractChunksFromAsrResult(result),
					0,
					activeTrims,
					realDurationSec,
				);
			}

			const all: CaptionSegment[] = [];
			for (let offset = 0; offset < samples.length; offset += TRANSCRIBE_SLICE_SAMPLES) {
				const end = Math.min(offset + TRANSCRIBE_SLICE_SAMPLES, samples.length);
				const sliceRaw = samples.subarray(offset, end);
				const isFinalSlice = end >= samples.length;
				if (sliceRaw.length === 0) continue;
				if (sliceRaw.length < MIN_TRANSCRIBE_SLICE_SAMPLES && !isFinalSlice) continue;

				const { slice, realDurationSec } =
					sliceRaw.length < MIN_TRANSCRIBE_SLICE_SAMPLES && isFinalSlice
						? padTailSliceForTranscribe(sliceRaw)
						: { slice: sliceRaw, realDurationSec: sliceRaw.length / 16_000 };

				const result = await runTranscriberOnSlice(transcriber, slice, {
					forceFullSequences,
					timestampMode,
				});
				const tOff = offset / 16_000;
				all.push(
					...segmentsFromTranscriberChunks(
						extractChunksFromAsrResult(result),
						tOff,
						activeTrims,
						realDurationSec,
					),
				);
			}
			return all;
		} catch (e) {
			console.warn("[captioning] Whisper pass failed:", e);
			return [];
		}
	};

	const attemptModes: Array<"word" | "phrase"> = ["word", "phrase"];
	for (const timestampMode of attemptModes) {
		let segments = await transcribeOne(false, true, timestampMode);
		if (segments.length === 0) {
			segments = await transcribeOne(false, false, timestampMode);
		}
		if (segments.length === 0 && trims.length > 0) {
			segments = dropSegmentsOverlappingTrimRegions(
				await transcribeOne(true, true, timestampMode),
				trims,
			);
			if (segments.length === 0) {
				segments = dropSegmentsOverlappingTrimRegions(
					await transcribeOne(true, false, timestampMode),
					trims,
				);
			}
		}
		if (segments.length > 0) {
			return { segments, granularity: timestampMode };
		}
	}

	return { segments: [], granularity: "phrase" };
}
