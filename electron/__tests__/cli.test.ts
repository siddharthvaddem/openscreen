import { describe, expect, it } from "vitest";
import { parseArgs } from "../cli.js";

describe("parseArgs", () => {
	it("returns default values when no flags", () => {
		const got = parseArgs([]);
		expect(got).toEqual({
			headless: false,
			ipcPath: "/tmp/openscreen.sock",
			outDir: undefined,
			retentionHours: 24,
		});
	});

	it("parses --headless", () => {
		expect(parseArgs(["--headless"]).headless).toBe(true);
	});

	it("parses --ipc-path with value", () => {
		expect(parseArgs(["--ipc-path", "/tmp/x.sock"]).ipcPath).toBe("/tmp/x.sock");
	});

	it("parses --out-dir", () => {
		expect(parseArgs(["--out-dir", "/Users/foo/movies"]).outDir).toBe("/Users/foo/movies");
	});

	it("parses --retention-hours numeric", () => {
		expect(parseArgs(["--retention-hours", "48"]).retentionHours).toBe(48);
	});

	it("ignores unknown flags without throwing", () => {
		expect(() => parseArgs(["--unknown-flag", "value"])).not.toThrow();
	});
});
