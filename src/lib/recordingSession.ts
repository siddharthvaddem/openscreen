export interface ProjectMedia {
	screenVideoPath: string;
	webcamVideoPath?: string;
}

export interface RecordingSession extends ProjectMedia {
	createdAt: number;
}

export interface InteractionClickSample {
	timeMs: number;
	cx: number;
	cy: number;
}

export interface InteractionKeySample {
	timeMs: number;
	key: string;
}

export interface InteractionTelemetry {
	version: number;
	clicks: InteractionClickSample[];
	keys: InteractionKeySample[];
}

export interface RecordedVideoAssetInput {
	fileName: string;
	videoData: ArrayBuffer;
}

export interface StoreRecordedSessionInput {
	screen: RecordedVideoAssetInput;
	webcam?: RecordedVideoAssetInput;
	createdAt?: number;
	interactions?: InteractionTelemetry;
}

function normalizePath(value: unknown): string | undefined {
	if (typeof value !== "string") {
		return undefined;
	}

	const trimmed = value.trim();
	return trimmed ? trimmed : undefined;
}

export function normalizeProjectMedia(candidate: unknown): ProjectMedia | null {
	if (!candidate || typeof candidate !== "object") {
		return null;
	}

	const raw = candidate as Partial<ProjectMedia>;
	const screenVideoPath = normalizePath(raw.screenVideoPath);

	if (!screenVideoPath) {
		return null;
	}

	const webcamVideoPath = normalizePath(raw.webcamVideoPath);

	return webcamVideoPath
		? { screenVideoPath, webcamVideoPath }
		: {
				screenVideoPath,
			};
}

export function normalizeRecordingSession(candidate: unknown): RecordingSession | null {
	if (!candidate || typeof candidate !== "object") {
		return null;
	}

	const raw = candidate as Partial<RecordingSession>;
	const media = normalizeProjectMedia(raw);
	if (!media) {
		return null;
	}

	return {
		...media,
		createdAt:
			typeof raw.createdAt === "number" && Number.isFinite(raw.createdAt)
				? raw.createdAt
				: Date.now(),
	};
}
