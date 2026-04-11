import { describe, expect, it } from "vitest";
import { getSourceSelectorRecoveryState } from "./sourceSelectorRecovery";

describe("getSourceSelectorRecoveryState", () => {
	it("returns none when at least one source is available", () => {
		expect(
			getSourceSelectorRecoveryState({
				isMac: true,
				sourceCount: 1,
				screenAccessStatus: "granted",
			}),
		).toBe("none");
	});

	it("treats granted with zero sources on macOS as a stale permission entry", () => {
		expect(
			getSourceSelectorRecoveryState({
				isMac: true,
				sourceCount: 0,
				screenAccessStatus: "granted",
			}),
		).toBe("screen-permission-stale");
	});

	it("treats denied screen access on macOS as blocked", () => {
		expect(
			getSourceSelectorRecoveryState({
				isMac: true,
				sourceCount: 0,
				screenAccessStatus: "denied",
			}),
		).toBe("screen-permission-blocked");
	});

	it("treats unknown or not-determined status on macOS as missing permission", () => {
		expect(
			getSourceSelectorRecoveryState({
				isMac: true,
				sourceCount: 0,
				screenAccessStatus: "unknown",
			}),
		).toBe("screen-permission-missing");
		expect(
			getSourceSelectorRecoveryState({
				isMac: true,
				sourceCount: 0,
				screenAccessStatus: "not-determined",
			}),
		).toBe("screen-permission-missing");
	});

	it("falls back to a generic no-sources state off macOS", () => {
		expect(
			getSourceSelectorRecoveryState({
				isMac: false,
				sourceCount: 0,
				screenAccessStatus: "granted",
			}),
		).toBe("no-sources");
	});
});
