import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestMacCursorAccessibilityAccess } from "./macNativeCursorRecordingSession";

const mocks = vi.hoisted(() => ({
	accessSync: vi.fn(),
	isTrustedAccessibilityClient: vi.fn(),
	spawn: vi.fn(),
}));

vi.mock("electron", () => ({
	screen: {
		getCursorScreenPoint: vi.fn(() => ({ x: 0, y: 0 })),
		getDisplayNearestPoint: vi.fn(() => ({ bounds: { x: 0, y: 0, width: 1, height: 1 } })),
	},
	systemPreferences: {
		isTrustedAccessibilityClient: mocks.isTrustedAccessibilityClient,
	},
}));

vi.mock("node:child_process", () => ({
	default: { spawn: mocks.spawn },
	spawn: mocks.spawn,
}));

vi.mock("node:fs", () => ({
	default: {
		accessSync: mocks.accessSync,
		constants: { X_OK: 1 },
	},
	accessSync: mocks.accessSync,
	constants: { X_OK: 1 },
}));

describe("requestMacCursorAccessibilityAccess", () => {
	beforeEach(() => {
		vi.spyOn(process, "platform", "get").mockReturnValue("darwin");
		mocks.accessSync.mockImplementation(() => {
			throw new Error("missing helper");
		});
		mocks.isTrustedAccessibilityClient.mockReset();
		mocks.spawn.mockReset();
	});

	it("trusts the OpenScreen app accessibility grant without requiring the helper grant", async () => {
		mocks.isTrustedAccessibilityClient.mockReturnValue(true);

		const result = await requestMacCursorAccessibilityAccess();

		expect(result).toEqual({ success: true, granted: true, status: "granted" });
		expect(mocks.isTrustedAccessibilityClient).toHaveBeenCalledWith(true);
		expect(mocks.spawn).not.toHaveBeenCalled();
	});
});
