import { describe, expect, test } from "vitest";
import {
	formatCustomPlaybackSpeedDraft,
	parseCustomPlaybackSpeedDraft,
	sanitizeCustomPlaybackSpeedDraft,
} from "./customPlaybackSpeed";

describe("custom playback speed helpers", () => {
	test("formats non-preset values without rounding them to whole numbers", () => {
		expect(formatCustomPlaybackSpeedDraft(1.1, false)).toBe("1.1");
	});

	test("formats preset values as an empty draft", () => {
		expect(formatCustomPlaybackSpeedDraft(1.5, true)).toBe("");
	});

	test("preserves decimal input and limits precision to two places", () => {
		expect(sanitizeCustomPlaybackSpeedDraft("1.1")).toBe("1.1");
		expect(sanitizeCustomPlaybackSpeedDraft("1..234")).toBe("1.23");
	});

	test("normalizes leading decimal input", () => {
		expect(sanitizeCustomPlaybackSpeedDraft(".9")).toBe("0.9");
	});

	test("parses valid decimal speeds within the supported range", () => {
		expect(parseCustomPlaybackSpeedDraft("0.9")).toBe(0.9);
		expect(parseCustomPlaybackSpeedDraft("1.1")).toBe(1.1);
	});

	test("rejects values outside the supported range", () => {
		expect(parseCustomPlaybackSpeedDraft("0.05")).toBeNull();
		expect(parseCustomPlaybackSpeedDraft("16.01")).toBeNull();
	});
});
