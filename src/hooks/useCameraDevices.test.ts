import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCameraDevices } from "./useCameraDevices";

// Mock navigator.mediaDevices
const mockDevices = [
	{ kind: "videoinput", deviceId: "cam1", label: "Camera 1", groupId: "group1" },
	{ kind: "videoinput", deviceId: "cam2", label: "Camera 2", groupId: "group1" },
	{ kind: "audioinput", deviceId: "mic1", label: "Mic 1", groupId: "group2" },
];

const mockGetUserMedia = vi.fn().mockResolvedValue({
	getTracks: () => [{ stop: vi.fn() }],
});

const mockEnumerateDevices = vi.fn().mockResolvedValue(mockDevices);

Object.defineProperty(global.navigator, "mediaDevices", {
	value: {
		enumerateDevices: mockEnumerateDevices,
		getUserMedia: mockGetUserMedia,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
	},
	configurable: true,
});

describe("useCameraDevices", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockEnumerateDevices.mockResolvedValue(mockDevices);
		mockGetUserMedia.mockResolvedValue({
			getTracks: () => [{ stop: vi.fn() }],
		});
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("should list video input devices", async () => {
		const { result } = renderHook(() => useCameraDevices(true));

		await waitFor(() => {
			expect(result.current.devices).toHaveLength(2);
		});

		expect(result.current.devices[0].label).toBe("Camera 1");
		expect(result.current.devices[1].deviceId).toBe("cam2");
	});

	it("should set first device as default", async () => {
		const { result } = renderHook(() => useCameraDevices(true));

		await waitFor(() => {
			expect(result.current.selectedDeviceId).toBe("cam1");
		});
	});

	it("should use device ID as fallback label when label is missing", async () => {
		mockEnumerateDevices.mockResolvedValueOnce([
			{ kind: "videoinput", deviceId: "cam1abc123456", label: "", groupId: "group1" },
		]);

		const { result } = renderHook(() => useCameraDevices(true));

		await waitFor(() => {
			expect(result.current.devices[0]?.label).toBe("Camera cam1abc1");
		});

		expect(mockGetUserMedia).not.toHaveBeenCalled();
	});

	it("should set error state when enumeration fails", async () => {
		mockEnumerateDevices.mockRejectedValueOnce(new Error("Permission denied"));

		const { result } = renderHook(() => useCameraDevices(true));

		await waitFor(() => {
			expect(result.current.error).toBe("Permission denied");
		});

		expect(result.current.devices).toHaveLength(0);
		expect(result.current.isLoading).toBe(false);
	});

	it("should fall back to first available device when selected device is unplugged", async () => {
		const { result } = renderHook(() => useCameraDevices(true));

		await waitFor(() => {
			expect(result.current.selectedDeviceId).toBe("cam1");
		});

		// Simulate cam1 being unplugged — only cam2 remains
		const cam2Only = [
			{ kind: "videoinput", deviceId: "cam2", label: "Camera 2", groupId: "group1" },
		];
		mockEnumerateDevices.mockResolvedValueOnce(cam2Only);

		// Trigger devicechange event via the registered handler
		const devicechangeHandler = (
			navigator.mediaDevices.addEventListener as ReturnType<typeof vi.fn>
		).mock.calls[0]?.[1] as (() => void) | undefined;

		await act(async () => {
			devicechangeHandler?.();
		});

		await waitFor(() => {
			expect(result.current.selectedDeviceId).toBe("cam2");
		});
	});
});
