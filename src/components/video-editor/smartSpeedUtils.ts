import type { InteractionKeySample } from "@/lib/recordingSession";
import type { CursorTelemetryPoint, SpeedRegion, TrimRegion, ZoomRegion } from "./types";

export type SmartSpeedIntensity = "light" | "balanced" | "aggressive";

/**
 * Extra inward margin (ms) applied to each edge of a silence interval before
 * placing a speed region.  This keeps the speed-up safely away from the
 * speech/silence transition so we never aggressively eat into spoken content.
 */
const SPEECH_BREATH_BUFFER_MS = 200;

const PROFILE = {
	light: {
		minIdleMs: 2600,
		leadInMs: 280,
		tailOutMs: 280,
		speed: 1.5,
		moveThreshold: 0.012,
	},
	balanced: {
		minIdleMs: 1900,
		leadInMs: 220,
		tailOutMs: 220,
		speed: 2,
		moveThreshold: 0.014,
	},
	aggressive: {
		minIdleMs: 1400,
		leadInMs: 160,
		tailOutMs: 160,
		speed: 3,
		moveThreshold: 0.016,
	},
} as const;

interface DetectSmartSpeedRegionsParams {
	cursorTelemetry: CursorTelemetryPoint[];
	silentIntervals?: Interval[];
	keySamples?: InteractionKeySample[];
	zoomRegions: ZoomRegion[];
	trimRegions: TrimRegion[];
	speedRegions: SpeedRegion[];
	totalMs: number;
	enabled: boolean;
	intensity: SmartSpeedIntensity;
}

interface Interval {
	startMs: number;
	endMs: number;
}

function sortAndMergeIntervals(intervals: Interval[]): Interval[] {
	if (!intervals.length) return [];

	const sorted = [...intervals]
		.filter((interval) => interval.endMs > interval.startMs)
		.sort((a, b) => a.startMs - b.startMs);

	const merged: Interval[] = [sorted[0]];
	for (const interval of sorted.slice(1)) {
		const last = merged[merged.length - 1];
		if (interval.startMs <= last.endMs) {
			last.endMs = Math.max(last.endMs, interval.endMs);
			continue;
		}
		merged.push({ ...interval });
	}
	return merged;
}

function overlapsProtectedRegion(startMs: number, endMs: number, protectedIntervals: Interval[]) {
	return protectedIntervals.some(
		(interval) => startMs < interval.endMs && endMs > interval.startMs,
	);
}

export async function detectSilentIntervals({
	videoUrl,
	intensity,
	totalMs,
}: {
	videoUrl: string;
	intensity: SmartSpeedIntensity;
	totalMs: number;
}): Promise<Interval[]> {
	if (!videoUrl || totalMs <= 0) {
		return [];
	}

	const response = await fetch(videoUrl);
	if (!response.ok) {
		return [];
	}

	const arrayBuffer = await response.arrayBuffer();
	const audioContext = new AudioContext();
	try {
		const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
		const sampleRate = audioBuffer.sampleRate;
		const channelData = Array.from({ length: audioBuffer.numberOfChannels }, (_, index) =>
			audioBuffer.getChannelData(index),
		);
		const windowMs = 120;
		const windowSamples = Math.max(256, Math.floor((sampleRate * windowMs) / 1000));
		const minSilentMs = intensity === "light" ? 1400 : intensity === "balanced" ? 1000 : 700;
		const silenceThreshold =
			intensity === "light" ? 0.012 : intensity === "balanced" ? 0.018 : 0.024;

		const intervals: Interval[] = [];
		let silenceStartMs: number | null = null;

		for (let start = 0; start < audioBuffer.length; start += windowSamples) {
			const end = Math.min(audioBuffer.length, start + windowSamples);
			let energy = 0;
			let count = 0;

			for (const channel of channelData) {
				for (let i = start; i < end; i += 1) {
					const sample = channel[i] || 0;
					energy += sample * sample;
					count += 1;
				}
			}

			const rms = count > 0 ? Math.sqrt(energy / count) : 0;
			const startMs = (start / sampleRate) * 1000;
			const endMs = (end / sampleRate) * 1000;

			if (rms <= silenceThreshold) {
				if (silenceStartMs === null) {
					silenceStartMs = startMs;
				}
			} else if (silenceStartMs !== null) {
				if (startMs - silenceStartMs >= minSilentMs) {
					intervals.push({ startMs: Math.round(silenceStartMs), endMs: Math.round(startMs) });
				}
				silenceStartMs = null;
			}
			if (endMs >= totalMs) {
				break;
			}
		}

		if (silenceStartMs !== null && totalMs - silenceStartMs >= minSilentMs) {
			intervals.push({ startMs: Math.round(silenceStartMs), endMs: Math.round(totalMs) });
		}

		return sortAndMergeIntervals(intervals);
	} catch {
		return [];
	} finally {
		await audioContext.close().catch(() => undefined);
	}
}

export function detectSmartSpeedRegions({
	cursorTelemetry,
	silentIntervals,
	keySamples,
	zoomRegions,
	trimRegions,
	speedRegions,
	totalMs,
	enabled,
	intensity,
}: DetectSmartSpeedRegionsParams): SpeedRegion[] {
	if (!enabled || totalMs <= 0 || cursorTelemetry.length < 2) {
		return [];
	}

	const profile = PROFILE[intensity];
	const protectedIntervals = sortAndMergeIntervals([
		...zoomRegions.map((region) => ({ startMs: region.startMs, endMs: region.endMs })),
		...trimRegions.map((region) => ({ startMs: region.startMs, endMs: region.endMs })),
		...speedRegions.map((region) => ({ startMs: region.startMs, endMs: region.endMs })),
		...(keySamples ?? []).map((sample) => ({
			startMs: sample.timeMs - 250,
			endMs: sample.timeMs + 500,
		})),
	]);
	const silentRanges = sortAndMergeIntervals(silentIntervals ?? []);

	const samples = [...cursorTelemetry]
		.filter(
			(sample) =>
				Number.isFinite(sample.timeMs) && Number.isFinite(sample.cx) && Number.isFinite(sample.cy),
		)
		.sort((a, b) => a.timeMs - b.timeMs);

	const results: SpeedRegion[] = [];
	let runStartIndex = 0;

	const pushRun = (startIndex: number, endIndex: number) => {
		if (endIndex - startIndex < 2) {
			return;
		}

		const startSample = samples[startIndex];
		const endSample = samples[endIndex - 1];
		const idleDuration = endSample.timeMs - startSample.timeMs;
		if (idleDuration < profile.minIdleMs) {
			return;
		}

		let startMs = Math.max(0, Math.round(startSample.timeMs + profile.leadInMs));
		let endMs = Math.min(totalMs, Math.round(endSample.timeMs - profile.tailOutMs));
		if (endMs - startMs < Math.max(600, profile.minIdleMs * 0.45)) {
			return;
		}

		if (silentRanges.length > 0) {
			// Require the speed region to overlap a silence interval.  Pick the
			// interval with the largest overlap so we stay inside the quietest
			// stretch rather than grazing a tiny edge of silence.
			let bestSilence: Interval | null = null;
			let bestOverlap = 0;
			for (const silence of silentRanges) {
				const overlapStart = Math.max(startMs, silence.startMs);
				const overlapEnd = Math.min(endMs, silence.endMs);
				const overlap = overlapEnd - overlapStart;
				if (overlap > bestOverlap) {
					bestOverlap = overlap;
					bestSilence = silence;
				}
			}
			if (!bestSilence) {
				return;
			}

			// Clamp the region inside the silence boundary, then pull each edge
			// inward by SPEECH_BREATH_BUFFER_MS so we don't start or end a
			// speed-up right at a speech/silence transition.
			startMs = Math.max(startMs, bestSilence.startMs + SPEECH_BREATH_BUFFER_MS);
			endMs = Math.min(endMs, bestSilence.endMs - SPEECH_BREATH_BUFFER_MS);
			if (endMs - startMs < Math.max(600, profile.minIdleMs * 0.45)) {
				return;
			}
		}

		if (overlapsProtectedRegion(startMs, endMs, protectedIntervals)) {
			return;
		}

		results.push({
			id: `smart-speed-${startMs}-${endMs}`,
			startMs,
			endMs,
			speed: profile.speed,
		});
	};

	for (let index = 1; index < samples.length; index += 1) {
		const previous = samples[index - 1];
		const current = samples[index];
		const distance = Math.hypot(current.cx - previous.cx, current.cy - previous.cy);

		if (distance > profile.moveThreshold) {
			pushRun(runStartIndex, index);
			runStartIndex = index;
		}
	}

	pushRun(runStartIndex, samples.length);
	return sortAndMergeIntervals(results).map((region) => ({
		id: `smart-speed-${region.startMs}-${region.endMs}`,
		startMs: region.startMs,
		endMs: region.endMs,
		speed: profile.speed,
	}));
}
