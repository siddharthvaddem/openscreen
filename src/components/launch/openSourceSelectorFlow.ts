export type ScreenAccessResult = {
	success: boolean;
	granted: boolean;
	status: string;
	error?: string;
};

export type OpenSourceSelectorResult = {
	opened: boolean;
	reason?: string;
	access?: ScreenAccessResult;
};

type OpenSourceSelectorFlowOptions = {
	openSourceSelector: () => Promise<OpenSourceSelectorResult>;
	requestScreenAccess: () => Promise<ScreenAccessResult>;
	wait?: (ms: number) => Promise<void>;
	retryDelayMs?: number;
	maxAttempts?: number;
};

const defaultWait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

function shouldRetryAfterPermissionPrompt(result: OpenSourceSelectorResult): boolean {
	return (
		result.opened === false &&
		result.reason === "screen-access-required" &&
		result.access?.status === "not-determined"
	);
}

export async function openSourceSelectorWithPermissionRetry({
	openSourceSelector,
	requestScreenAccess,
	wait = defaultWait,
	retryDelayMs = 750,
	maxAttempts = 8,
}: OpenSourceSelectorFlowOptions): Promise<OpenSourceSelectorResult> {
	const initialResult = await openSourceSelector();
	if (!shouldRetryAfterPermissionPrompt(initialResult)) {
		return initialResult;
	}

	for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
		await wait(retryDelayMs);
		const access = await requestScreenAccess();

		if (access.granted) {
			return openSourceSelector();
		}

		if (access.status !== "not-determined") {
			return {
				opened: false,
				reason: "screen-access-required",
				access,
			};
		}
	}

	return initialResult;
}
