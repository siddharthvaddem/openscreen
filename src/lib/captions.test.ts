import { describe, expect, it } from "vitest";
import {
	getWhisperLanguageForLocale,
	MIN_CAPTION_DURATION_MS,
	normalizeCaptionSegments,
	parseWhisperJsonOutput,
} from "./captions";

describe("parseWhisperJsonOutput", () => {
	it("parses whisper.cpp transcription entries that use offsets in milliseconds", () => {
		const output = JSON.stringify({
			transcription: [
				{
					offsets: { from: 1200, to: 3450 },
					text: " Hello world ",
				},
			],
		});

		expect(parseWhisperJsonOutput(output)).toEqual([
			{ id: "caption-1", startMs: 1200, endMs: 3450, text: "Hello world" },
		]);
	});

	it("parses whisper.cpp timestamp strings", () => {
		const output = JSON.stringify({
			transcription: [
				{
					timestamps: { from: "00:01:02.500", to: "00:01:04.000" },
					text: "timestamp text",
				},
			],
		});

		expect(parseWhisperJsonOutput(output)).toEqual([
			{ id: "caption-1", startMs: 62500, endMs: 64000, text: "timestamp text" },
		]);
	});

	it("parses common segment arrays that use seconds", () => {
		const output = JSON.stringify({
			segments: [{ start: 1.25, end: 2.5, text: "segment text" }],
		});

		expect(parseWhisperJsonOutput(output)).toEqual([
			{ id: "caption-1", startMs: 1250, endMs: 2500, text: "segment text" },
		]);
	});

	it("returns an empty list for invalid JSON", () => {
		expect(parseWhisperJsonOutput("{not-json")).toEqual([]);
	});
});

describe("normalizeCaptionSegments", () => {
	it("drops empty text and invalid timing", () => {
		expect(
			normalizeCaptionSegments([
				{ startMs: 0, endMs: 1000, text: "   " },
				{ startMs: 1000, endMs: 900, text: "reversed" },
				{ startMs: Number.NaN, endMs: 2000, text: "nan" },
				{ startMs: 2000, endMs: 3000, text: "valid" },
			]),
		).toEqual([{ id: "caption-1", startMs: 2000, endMs: 3000, text: "valid" }]);
	});

	it("sorts by start time and clamps very short captions", () => {
		const segments = normalizeCaptionSegments([
			{ startMs: 2000, endMs: 2100, text: "second" },
			{ startMs: 1000, endMs: 1200, text: "first" },
		]);

		expect(segments).toEqual([
			{
				id: "caption-1",
				startMs: 1000,
				endMs: 1000 + MIN_CAPTION_DURATION_MS,
				text: "first",
			},
			{
				id: "caption-2",
				startMs: 2000,
				endMs: 2000 + MIN_CAPTION_DURATION_MS,
				text: "second",
			},
		]);
	});
});

describe("getWhisperLanguageForLocale", () => {
	it("maps supported app locales to whisper language codes", () => {
		expect(getWhisperLanguageForLocale("zh-CN")).toBe("zh");
		expect(getWhisperLanguageForLocale("zh-TW")).toBe("zh");
		expect(getWhisperLanguageForLocale("ja-JP")).toBe("ja");
		expect(getWhisperLanguageForLocale("ko-KR")).toBe("ko");
		expect(getWhisperLanguageForLocale("fr")).toBe("fr");
	});

	it("returns undefined for empty or invalid locale values", () => {
		expect(getWhisperLanguageForLocale("")).toBeUndefined();
		expect(getWhisperLanguageForLocale("  ")).toBeUndefined();
	});
});
