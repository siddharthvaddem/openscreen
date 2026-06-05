import { describe, expect, it, vi } from "vitest";
import { CaptionJobRegistry } from "./jobs";

describe("CaptionJobRegistry", () => {
	it("cleans up jobs after completion", async () => {
		const registry = new CaptionJobRegistry({
			generate: vi.fn(async (request) => ({
				jobId: request.jobId,
				status: "success",
				segments: [],
			})),
		});

		await expect(registry.start({ jobId: "job-1", videoPath: "/tmp/video.webm" })).resolves.toEqual(
			{
				jobId: "job-1",
				status: "success",
				segments: [],
			},
		);
		expect(registry.has("job-1")).toBe(false);
	});

	it("aborts an active job", async () => {
		let signal: AbortSignal | undefined;
		const registry = new CaptionJobRegistry({
			generate: vi.fn(async (request) => {
				signal = request.signal;
				return { jobId: request.jobId, status: "cancelled", segments: [] };
			}),
		});

		const promise = registry.start({
			jobId: "job-2",
			videoPath: "/tmp/video.webm",
		});
		const cancelResult = registry.cancel("job-2");
		const result = await promise;

		expect(cancelResult).toEqual({ success: true, cancelled: true });
		expect(signal?.aborted).toBe(true);
		expect(result.status).toBe("cancelled");
	});

	it("reports missing jobs as not cancelled", () => {
		const registry = new CaptionJobRegistry({
			generate: vi.fn(),
		});

		expect(registry.cancel("missing")).toEqual({
			success: true,
			cancelled: false,
		});
	});
});
