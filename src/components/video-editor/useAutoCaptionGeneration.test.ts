import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode, StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CaptionGenerationResult } from "@/lib/captions";
import { useAutoCaptionGeneration } from "./useAutoCaptionGeneration";

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (error: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

function strictModeWrapper({ children }: { children: ReactNode }) {
	return createElement(StrictMode, null, children);
}

describe("useAutoCaptionGeneration", () => {
	beforeEach(() => {
		window.electronAPI = {
			...(window.electronAPI ?? {}),
			startCaptionGeneration: vi.fn(),
			cancelCaptionGeneration: vi.fn(async () => ({ success: true, cancelled: true })),
		} as Window["electronAPI"];
	});

	it("starts one caption job for a fresh recording source and forwards generated segments", async () => {
		const result: CaptionGenerationResult = {
			jobId: "caption-job",
			status: "success",
			segments: [{ id: "caption-1", startMs: 0, endMs: 1000, text: "Hello" }],
			message: "Generated 1 captions.",
		};
		vi.mocked(window.electronAPI.startCaptionGeneration).mockResolvedValue(result);
		const onCaptions = vi.fn();
		const onStatusMessage = vi.fn();

		const { result: hook } = renderHook(() =>
			useAutoCaptionGeneration({
				sourcePath: "/recordings/one.webm",
				enabled: true,
				onCaptions,
				onStatusMessage,
			}),
		);

		expect(hook.current).toBe("running");
		await waitFor(() => expect(onCaptions).toHaveBeenCalledWith(result.segments));
		expect(onStatusMessage).toHaveBeenCalledWith(result);
		expect(hook.current).toBe("success");
		expect(window.electronAPI.startCaptionGeneration).toHaveBeenCalledTimes(1);
	});

	it("does not start again for the same source after rerender", async () => {
		vi.mocked(window.electronAPI.startCaptionGeneration).mockResolvedValue({
			jobId: "caption-job",
			status: "skipped",
			segments: [],
			message: "No audio track found; captions skipped.",
		});
		const onCaptions = vi.fn();
		const onStatusMessage = vi.fn();

		const { rerender } = renderHook(() =>
			useAutoCaptionGeneration({
				sourcePath: "/recordings/reused.webm",
				enabled: true,
				onCaptions,
				onStatusMessage,
			}),
		);

		rerender();
		await waitFor(() => expect(onStatusMessage).toHaveBeenCalledTimes(1));
		expect(window.electronAPI.startCaptionGeneration).toHaveBeenCalledTimes(1);
		expect(onCaptions).not.toHaveBeenCalled();
	});

	it("passes the requested transcription language to caption generation", async () => {
		vi.mocked(window.electronAPI.startCaptionGeneration).mockResolvedValue({
			jobId: "caption-job",
			status: "success",
			segments: [{ id: "caption-1", startMs: 0, endMs: 1000, text: "你好" }],
		});
		const onCaptions = vi.fn();
		const onStatusMessage = vi.fn();

		renderHook(() =>
			useAutoCaptionGeneration({
				sourcePath: "/recordings/chinese.webm",
				enabled: true,
				language: "zh",
				onCaptions,
				onStatusMessage,
			}),
		);

		await waitFor(() => expect(onStatusMessage).toHaveBeenCalledTimes(1));
		expect(window.electronAPI.startCaptionGeneration).toHaveBeenCalledWith(
			"/recordings/chinese.webm",
			expect.objectContaining({ language: "zh" }),
		);
	});

	it("cancels the active job and ignores stale results on unmount", async () => {
		const pending = deferred<CaptionGenerationResult>();
		vi.mocked(window.electronAPI.startCaptionGeneration).mockReturnValue(pending.promise);
		const onCaptions = vi.fn();
		const onStatusMessage = vi.fn();

		const { unmount } = renderHook(() =>
			useAutoCaptionGeneration({
				sourcePath: "/recordings/stale.webm",
				enabled: true,
				onCaptions,
				onStatusMessage,
			}),
		);

		unmount();
		await act(async () => {
			pending.resolve({
				jobId: "caption-job",
				status: "success",
				segments: [{ id: "caption-1", startMs: 0, endMs: 1000, text: "Late" }],
			});
			await pending.promise;
		});

		expect(window.electronAPI.cancelCaptionGeneration).toHaveBeenCalledTimes(1);
		expect(onCaptions).not.toHaveBeenCalled();
		expect(onStatusMessage).not.toHaveBeenCalled();
	});

	it("keeps the active job running when callback references change", async () => {
		const pending = deferred<CaptionGenerationResult>();
		vi.mocked(window.electronAPI.startCaptionGeneration).mockReturnValue(pending.promise);
		const firstOnCaptions = vi.fn();
		const firstOnStatusMessage = vi.fn();
		const secondOnCaptions = vi.fn();
		const secondOnStatusMessage = vi.fn();

		const { rerender } = renderHook(
			({
				onCaptions,
				onStatusMessage,
			}: {
				onCaptions: Parameters<typeof useAutoCaptionGeneration>[0]["onCaptions"];
				onStatusMessage: Parameters<typeof useAutoCaptionGeneration>[0]["onStatusMessage"];
			}) =>
				useAutoCaptionGeneration({
					sourcePath: "/recordings/changing-callbacks.webm",
					enabled: true,
					onCaptions,
					onStatusMessage,
				}),
			{
				initialProps: {
					onCaptions: firstOnCaptions,
					onStatusMessage: firstOnStatusMessage,
				},
			},
		);

		rerender({
			onCaptions: secondOnCaptions,
			onStatusMessage: secondOnStatusMessage,
		});

		const result: CaptionGenerationResult = {
			jobId: "caption-job",
			status: "success",
			segments: [{ id: "caption-1", startMs: 0, endMs: 1000, text: "Latest" }],
		};
		await act(async () => {
			pending.resolve(result);
			await pending.promise;
		});

		expect(window.electronAPI.startCaptionGeneration).toHaveBeenCalledTimes(1);
		expect(window.electronAPI.cancelCaptionGeneration).not.toHaveBeenCalled();
		expect(firstOnCaptions).not.toHaveBeenCalled();
		expect(firstOnStatusMessage).not.toHaveBeenCalled();
		expect(secondOnCaptions).toHaveBeenCalledWith(result.segments);
		expect(secondOnStatusMessage).toHaveBeenCalledWith(result);
	});

	it("restarts the job after React StrictMode replays the mount effect", async () => {
		const firstPending = deferred<CaptionGenerationResult>();
		const secondPending = deferred<CaptionGenerationResult>();
		vi.mocked(window.electronAPI.startCaptionGeneration)
			.mockReturnValueOnce(firstPending.promise)
			.mockReturnValueOnce(secondPending.promise);
		const onCaptions = vi.fn();
		const onStatusMessage = vi.fn();

		renderHook(
			() =>
				useAutoCaptionGeneration({
					sourcePath: "/recordings/strict-mode.webm",
					enabled: true,
					onCaptions,
					onStatusMessage,
				}),
			{ wrapper: strictModeWrapper },
		);

		await waitFor(() => expect(window.electronAPI.startCaptionGeneration).toHaveBeenCalledTimes(2));

		const staleResult: CaptionGenerationResult = {
			jobId: "stale-caption-job",
			status: "success",
			segments: [{ id: "caption-1", startMs: 0, endMs: 1000, text: "Stale" }],
		};
		const activeResult: CaptionGenerationResult = {
			jobId: "active-caption-job",
			status: "success",
			segments: [{ id: "caption-2", startMs: 1000, endMs: 2000, text: "Active" }],
		};
		await act(async () => {
			firstPending.resolve(staleResult);
			secondPending.resolve(activeResult);
			await firstPending.promise;
			await secondPending.promise;
		});

		expect(window.electronAPI.cancelCaptionGeneration).toHaveBeenCalledTimes(1);
		expect(onCaptions).toHaveBeenCalledTimes(1);
		expect(onCaptions).toHaveBeenCalledWith(activeResult.segments);
		expect(onStatusMessage).toHaveBeenCalledTimes(1);
		expect(onStatusMessage).toHaveBeenCalledWith(activeResult);
	});
});
