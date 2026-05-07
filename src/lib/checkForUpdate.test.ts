import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";

vi.mock("sonner", () => {
	const fn = vi.fn();
	const toast = Object.assign(fn, {
		success: vi.fn(),
		error: vi.fn(),
	});
	return { toast };
});

const localStorageStore: Record<string, string> = {};
Object.defineProperty(globalThis, "localStorage", {
	value: {
		getItem: (k: string) => localStorageStore[k] ?? null,
		setItem: (k: string, v: string) => {
			localStorageStore[k] = v;
		},
		removeItem: (k: string) => {
			delete localStorageStore[k];
		},
		clear: () => {
			for (const k of Object.keys(localStorageStore)) delete localStorageStore[k];
		},
	},
	configurable: true,
});

const openExternalUrl = vi.fn().mockResolvedValue({ success: true });

Object.defineProperty(window, "electronAPI", {
	value: { openExternalUrl },
	configurable: true,
	writable: true,
});

import { toast } from "sonner";
import { forceCheckForUpdate, isNewer, maybeShowUpdateToast } from "./checkForUpdate";

const toastMock = toast as unknown as Mock;
const toastSuccess = toast.success as Mock;
const toastError = toast.error as Mock;

function mockReleaseResponse(tagName: string, htmlUrl = "https://example.com/release") {
	(global.fetch as Mock).mockResolvedValueOnce({
		ok: true,
		json: async () => ({ tag_name: tagName, html_url: htmlUrl }),
	});
}

function resetUpdateCheckMocks() {
	localStorage.clear();
	global.fetch = vi.fn() as unknown as typeof fetch;
	toastMock.mockClear();
	toastSuccess.mockClear();
	toastError.mockClear();
	openExternalUrl.mockClear();
}

describe("isNewer", () => {
	it("detects a higher minor version", () => {
		expect(isNewer("1.3.0", "1.2.0")).toBe(true);
	});

	it("compares numerically rather than lexicographically", () => {
		expect(isNewer("1.10.0", "1.2.0")).toBe(true);
	});

	it("returns false for equal versions", () => {
		expect(isNewer("1.2.0", "1.2.0")).toBe(false);
	});

	it("returns false when current is newer", () => {
		expect(isNewer("1.2.0", "1.3.0")).toBe(false);
	});

	it("rejects pre-release tags", () => {
		expect(isNewer("1.3.0-beta.1", "1.2.0")).toBe(false);
	});
});

describe("maybeShowUpdateToast", () => {
	beforeEach(resetUpdateCheckMocks);

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("fires the update toast when a newer release exists", async () => {
		mockReleaseResponse("v1.3.0");
		await maybeShowUpdateToast("1.2.0");
		expect(toastMock).toHaveBeenCalledTimes(1);
		const [title, options] = toastMock.mock.calls[0];
		expect(title).toBe("OpenScreen 1.3.0 is available");
		expect(options.action.label).toBe("Download");
		expect(options.cancel.label).toBe("Don't remind again");
		expect(options.closeButton).toBe(true);
	});

	it("skips entirely when checks are disabled", async () => {
		localStorage.setItem("openscreen_update_checks_disabled", "true");
		await maybeShowUpdateToast("1.2.0");
		expect(global.fetch).not.toHaveBeenCalled();
		expect(toastMock).not.toHaveBeenCalled();
	});

	it("does not show toast when this version was dismissed", async () => {
		localStorage.setItem("openscreen_dismissed_update_version", "1.3.0");
		mockReleaseResponse("v1.3.0");
		await maybeShowUpdateToast("1.2.0");
		expect(global.fetch).toHaveBeenCalled();
		expect(toastMock).not.toHaveBeenCalled();
	});

	it("stays silent on fetch failure", async () => {
		(global.fetch as Mock).mockRejectedValueOnce(new Error("network down"));
		await maybeShowUpdateToast("1.2.0");
		expect(toastMock).not.toHaveBeenCalled();
		expect(toastError).not.toHaveBeenCalled();
	});

	it("download action opens the release URL", async () => {
		mockReleaseResponse("v1.3.0", "https://example.com/release/1.3.0");
		await maybeShowUpdateToast("1.2.0");
		const [, options] = toastMock.mock.calls[0];
		await options.action.onClick();
		expect(openExternalUrl).toHaveBeenCalledWith("https://example.com/release/1.3.0");
	});

	it("cancel action persists checks-disabled flag", async () => {
		mockReleaseResponse("v1.3.0");
		await maybeShowUpdateToast("1.2.0");
		const [, options] = toastMock.mock.calls[0];
		options.cancel.onClick();
		expect(localStorage.getItem("openscreen_update_checks_disabled")).toBe("true");
	});

	it("close button dismissal persists per-version cache", async () => {
		mockReleaseResponse("v1.3.0");
		await maybeShowUpdateToast("1.2.0");
		const [, options] = toastMock.mock.calls[0];
		options.onDismiss();
		expect(localStorage.getItem("openscreen_dismissed_update_version")).toBe("1.3.0");
	});
});

describe("forceCheckForUpdate", () => {
	beforeEach(resetUpdateCheckMocks);

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("bypasses checks-disabled and dismissed-version gates", async () => {
		localStorage.setItem("openscreen_update_checks_disabled", "true");
		localStorage.setItem("openscreen_dismissed_update_version", "1.3.0");
		mockReleaseResponse("v1.3.0");
		await forceCheckForUpdate("1.2.0");
		expect(toastMock).toHaveBeenCalledTimes(1);
	});

	it("shows up-to-date success toast when current matches latest", async () => {
		mockReleaseResponse("v1.2.0");
		await forceCheckForUpdate("1.2.0");
		expect(toastSuccess).toHaveBeenCalledTimes(1);
		expect(toastSuccess.mock.calls[0][0]).toBe("OpenScreen is up to date");
	});

	it("shows up-to-date success toast when current is newer than latest", async () => {
		mockReleaseResponse("v1.2.0");
		await forceCheckForUpdate("1.3.0");
		expect(toastSuccess).toHaveBeenCalledTimes(1);
	});

	it("shows error toast on fetch failure", async () => {
		(global.fetch as Mock).mockRejectedValueOnce(new Error("offline"));
		await forceCheckForUpdate("1.2.0");
		expect(toastError).toHaveBeenCalledTimes(1);
		expect(toastError.mock.calls[0][0]).toBe("Couldn't check for updates");
	});
});
