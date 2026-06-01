import { describe, expect, it, vi } from "vitest";
import { openSourceSelectorWithPermissionRetry } from "./openSourceSelectorFlow";

describe("openSourceSelectorWithPermissionRetry", () => {
	it("returns immediately when the source selector opens on the first attempt", async () => {
		const openSourceSelector = vi.fn().mockResolvedValue({ opened: true });
		const requestScreenAccess = vi.fn();

		const result = await openSourceSelectorWithPermissionRetry({
			openSourceSelector,
			requestScreenAccess,
			wait: vi.fn(),
		});

		expect(result).toEqual({ opened: true });
		expect(openSourceSelector).toHaveBeenCalledTimes(1);
		expect(requestScreenAccess).not.toHaveBeenCalled();
	});

	it("retries opening after macOS screen permission becomes granted", async () => {
		const openSourceSelector = vi
			.fn()
			.mockResolvedValueOnce({
				opened: false,
				reason: "screen-access-required",
				access: { success: true, granted: false, status: "not-determined" },
			})
			.mockResolvedValueOnce({ opened: true });
		const requestScreenAccess = vi
			.fn()
			.mockResolvedValueOnce({ success: true, granted: false, status: "not-determined" })
			.mockResolvedValueOnce({ success: true, granted: true, status: "granted" });
		const wait = vi.fn().mockResolvedValue(undefined);

		const result = await openSourceSelectorWithPermissionRetry({
			openSourceSelector,
			requestScreenAccess,
			wait,
			maxAttempts: 4,
		});

		expect(result).toEqual({ opened: true });
		expect(wait).toHaveBeenCalledTimes(2);
		expect(requestScreenAccess).toHaveBeenCalledTimes(2);
		expect(openSourceSelector).toHaveBeenCalledTimes(2);
	});

	it("stops retrying once macOS permission is explicitly denied", async () => {
		const openSourceSelector = vi.fn().mockResolvedValue({
			opened: false,
			reason: "screen-access-required",
			access: { success: true, granted: false, status: "not-determined" },
		});
		const requestScreenAccess = vi
			.fn()
			.mockResolvedValueOnce({ success: true, granted: false, status: "denied" });

		const result = await openSourceSelectorWithPermissionRetry({
			openSourceSelector,
			requestScreenAccess,
			wait: vi.fn(),
			maxAttempts: 4,
		});

		expect(result).toEqual({
			opened: false,
			reason: "screen-access-required",
			access: { success: true, granted: false, status: "denied" },
		});
		expect(requestScreenAccess).toHaveBeenCalledTimes(1);
		expect(openSourceSelector).toHaveBeenCalledTimes(1);
	});
});
