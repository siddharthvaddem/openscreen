import { describe, expect, it } from "vitest";
import { parseCustomPlaybackSpeedInput } from "./customPlaybackSpeed";

describe("parseCustomPlaybackSpeedInput", () => {
	it("accepts decimal playback speeds", () => {
		expect(parseCustomPlaybackSpeedInput("1.1")).toEqual({
			status: "valid",
			draft: "1.1",
			speed: 1.1,
		});
	});

	it("keeps a single decimal point while typing", () => {
		expect(parseCustomPlaybackSpeedInput("1.2.3")).toEqual({
			status: "valid",
			draft: "1.23",
			speed: 1.23,
		});
	});

	it("allows sub-1 custom speeds down to the editor minimum", () => {
		expect(parseCustomPlaybackSpeedInput("0.1")).toEqual({
			status: "valid",
			draft: "0.1",
			speed: 0.1,
		});
	});

	it("rejects speeds below the editor minimum", () => {
		expect(parseCustomPlaybackSpeedInput("0.09")).toEqual({
			status: "too-slow",
			draft: "0.09",
		});
	});

	it("accepts comma decimal input by normalizing to a dot", () => {
		expect(parseCustomPlaybackSpeedInput("1,1")).toEqual({
			status: "valid",
			draft: "1.1",
			speed: 1.1,
		});
	});

	it("rejects speeds above the editor maximum", () => {
		expect(parseCustomPlaybackSpeedInput("16.1")).toEqual({
			status: "too-fast",
			draft: "16.1",
		});
	});
});
