import type { CaptionGenerationResult } from "../../src/lib/captions";

type CaptionJobStartRequest = {
	jobId: string;
	videoPath: string;
	language?: string;
};

type CaptionJobGenerateRequest = CaptionJobStartRequest & {
	signal: AbortSignal;
};

type CaptionJobRegistryDeps = {
	generate: (request: CaptionJobGenerateRequest) => Promise<CaptionGenerationResult>;
};

export class CaptionJobRegistry {
	private jobs = new Map<string, AbortController>();

	constructor(private deps: CaptionJobRegistryDeps) {}

	has(jobId: string) {
		return this.jobs.has(jobId);
	}

	async start(request: CaptionJobStartRequest): Promise<CaptionGenerationResult> {
		this.cancel(request.jobId);
		const controller = new AbortController();
		this.jobs.set(request.jobId, controller);

		try {
			return await this.deps.generate({
				...request,
				signal: controller.signal,
			});
		} finally {
			if (this.jobs.get(request.jobId) === controller) {
				this.jobs.delete(request.jobId);
			}
		}
	}

	cancel(jobId: string) {
		const controller = this.jobs.get(jobId);
		if (!controller) {
			return { success: true, cancelled: false };
		}

		controller.abort();
		this.jobs.delete(jobId);
		return { success: true, cancelled: true };
	}
}
