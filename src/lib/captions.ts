export const MIN_CAPTION_DURATION_MS = 500;

export type CaptionGenerationStatus = "success" | "skipped" | "unavailable" | "error" | "cancelled";

export interface CaptionSegment {
	id: string;
	startMs: number;
	endMs: number;
	text: string;
}

export interface CaptionGenerationOptions {
	jobId?: string;
	language?: string;
}

export interface CaptionGenerationResult {
	jobId: string;
	status: CaptionGenerationStatus;
	segments: CaptionSegment[];
	message?: string;
	error?: string;
}

const WHISPER_LANGUAGE_BY_LOCALE: Record<string, string> = {
	ar: "ar",
	en: "en",
	es: "es",
	fr: "fr",
	it: "it",
	"ja-jp": "ja",
	"ko-kr": "ko",
	ru: "ru",
	tr: "tr",
	vi: "vi",
	"zh-cn": "zh",
	"zh-tw": "zh",
};

interface RawCaptionSegment {
	startMs: number;
	endMs: number;
	text: string;
}

export function getWhisperLanguageForLocale(locale: string): string | undefined {
	const normalizedLocale = locale.trim().toLowerCase();
	if (!normalizedLocale) {
		return undefined;
	}

	return WHISPER_LANGUAGE_BY_LOCALE[normalizedLocale];
}

export function normalizeCaptionSegments(segments: RawCaptionSegment[]): CaptionSegment[] {
	return segments
		.map((segment) => ({
			startMs: segment.startMs,
			endMs: segment.endMs,
			text: segment.text.trim(),
		}))
		.filter(
			(segment) =>
				segment.text.length > 0 &&
				Number.isFinite(segment.startMs) &&
				Number.isFinite(segment.endMs) &&
				segment.endMs >= segment.startMs,
		)
		.sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs)
		.map((segment, index) => ({
			id: `caption-${index + 1}`,
			startMs: segment.startMs,
			endMs: Math.max(segment.endMs, segment.startMs + MIN_CAPTION_DURATION_MS),
			text: segment.text,
		}));
}

export function parseWhisperJsonOutput(output: string): CaptionSegment[] {
	let parsed: unknown;

	try {
		parsed = JSON.parse(output);
	} catch {
		return [];
	}

	if (!isRecord(parsed)) {
		return [];
	}

	if (Array.isArray(parsed.transcription)) {
		return normalizeCaptionSegments(parsed.transcription.map(parseTranscriptionEntry));
	}

	if (Array.isArray(parsed.segments)) {
		return normalizeCaptionSegments(parsed.segments.map(parseSecondsSegment));
	}

	return [];
}

function parseTranscriptionEntry(entry: unknown): RawCaptionSegment {
	if (!isRecord(entry)) {
		return invalidCaptionSegment();
	}

	const text = typeof entry.text === "string" ? entry.text : "";

	if (isRecord(entry.offsets)) {
		return {
			startMs: numberOrNaN(entry.offsets.from),
			endMs: numberOrNaN(entry.offsets.to),
			text,
		};
	}

	if (isRecord(entry.timestamps)) {
		return {
			startMs: parseTimestampMs(entry.timestamps.from),
			endMs: parseTimestampMs(entry.timestamps.to),
			text,
		};
	}

	return invalidCaptionSegment();
}

function parseSecondsSegment(entry: unknown): RawCaptionSegment {
	if (!isRecord(entry)) {
		return invalidCaptionSegment();
	}

	return {
		startMs: numberOrNaN(entry.start) * 1000,
		endMs: numberOrNaN(entry.end) * 1000,
		text: typeof entry.text === "string" ? entry.text : "",
	};
}

function parseTimestampMs(value: unknown): number {
	if (typeof value !== "string") {
		return Number.NaN;
	}

	const match = value.trim().match(/^(\d+):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/);
	if (!match) {
		return Number.NaN;
	}

	const [, hours, minutes, seconds, milliseconds = "0"] = match;
	return (
		(Number(hours) * 60 * 60 + Number(minutes) * 60 + Number(seconds)) * 1000 +
		Number(milliseconds.padEnd(3, "0"))
	);
}

function numberOrNaN(value: unknown): number {
	return typeof value === "number" ? value : Number.NaN;
}

function invalidCaptionSegment(): RawCaptionSegment {
	return { startMs: Number.NaN, endMs: Number.NaN, text: "" };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
