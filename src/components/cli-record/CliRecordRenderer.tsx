import { fixWebmDuration } from "@fix-webm-duration/fix";
import { useEffect, useRef } from "react";

const TARGET_FRAME_RATE = 60;
const MIN_FRAME_RATE = 30;
const TARGET_WIDTH = 3840;
const TARGET_HEIGHT = 2160;
const RECORDER_TIMESLICE_MS = 1000;
const CHROME_MEDIA_SOURCE = "desktop";
const VIDEO_FILE_EXTENSION = ".webm";

type CliRecordConfig = {
	durationMs: number;
	source?: string;
	sourceType?: "screen" | "window" | "any";
	systemAudio?: boolean;
};

type RecorderHandle = {
	recorder: MediaRecorder;
	recordedBlobPromise: Promise<Blob>;
};

function sendToMain(type: string, data: unknown) {
	window.electronAPI?.cliRecordMessage?.({ type, data });
}

function createRecorderHandle(stream: MediaStream, options: MediaRecorderOptions): RecorderHandle {
	const recorder = new MediaRecorder(stream, options);
	const chunks: Blob[] = [];
	const mimeType = options.mimeType || "video/webm";
	const recordedBlobPromise = new Promise<Blob>((resolve, reject) => {
		recorder.ondataavailable = (event: BlobEvent) => {
			if (event.data && event.data.size > 0) chunks.push(event.data);
		};
		recorder.onerror = () => reject(new Error("Recording failed"));
		recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
	});

	recorder.start(RECORDER_TIMESLICE_MS);
	return { recorder, recordedBlobPromise };
}

function selectMimeType() {
	const preferred = [
		"video/webm;codecs=h264",
		"video/webm;codecs=vp8",
		"video/webm;codecs=vp9",
		"video/webm;codecs=av1",
		"video/webm",
	];

	return preferred.find((type) => MediaRecorder.isTypeSupported(type)) ?? "video/webm";
}

function computeBitrate(width: number, height: number) {
	const pixels = width * height;
	if (pixels >= 3840 * 2160) return 76_500_000;
	if (pixels >= 2560 * 1440) return 47_600_000;
	return 30_600_000;
}

function sourceMatches(
	source: ProcessedDesktopSource,
	sourceType: CliRecordConfig["sourceType"],
	query?: string,
) {
	if (sourceType === "screen" && !source.id.startsWith("screen:")) return false;
	if (sourceType === "window" && !source.id.startsWith("window:")) return false;
	if (!query) return true;

	const normalizedQuery = query.toLowerCase();
	return (
		source.id === query ||
		source.display_id === query ||
		source.name.toLowerCase() === normalizedQuery ||
		source.name.toLowerCase().includes(normalizedQuery)
	);
}

async function resolveSource(config: CliRecordConfig) {
	const sources = await window.electronAPI.getSources({
		types: ["screen", "window"],
		thumbnailSize: { width: 1, height: 1 },
		fetchWindowIcons: false,
	});
	const sourceType = config.sourceType ?? "any";
	const source = sources.find((candidate) => sourceMatches(candidate, sourceType, config.source));
	if (!source) {
		const available = sources.map((candidate) => `${candidate.id} ${candidate.name}`).join("; ");
		throw new Error(`Recording source not found. Available sources: ${available}`);
	}
	await window.electronAPI.selectSource(source);
	return source;
}

async function record(config: CliRecordConfig) {
	if (!Number.isFinite(config.durationMs) || config.durationMs <= 0) {
		throw new Error("durationMs must be a positive number.");
	}

	sendToMain("status", { message: "Resolving capture source..." });
	const source = await resolveSource(config);

	sendToMain("status", { message: `Recording ${source.name}...` });
	const videoConstraints = {
		mandatory: {
			chromeMediaSource: CHROME_MEDIA_SOURCE,
			chromeMediaSourceId: source.id,
			maxWidth: TARGET_WIDTH,
			maxHeight: TARGET_HEIGHT,
			maxFrameRate: TARGET_FRAME_RATE,
			minFrameRate: MIN_FRAME_RATE,
		},
	};

	let mediaStream: MediaStream | null = null;
	let recorderHandle: RecorderHandle | null = null;
	const recordingId = Date.now();

	try {
		try {
			mediaStream = await navigator.mediaDevices.getUserMedia({
				audio: config.systemAudio
					? {
							mandatory: {
								chromeMediaSource: CHROME_MEDIA_SOURCE,
								chromeMediaSourceId: source.id,
							},
						}
					: false,
				video: videoConstraints,
			} as unknown as MediaStreamConstraints);
		} catch (error) {
			if (!config.systemAudio) throw error;
			sendToMain("status", { message: "System audio unavailable; retrying video-only..." });
			mediaStream = await navigator.mediaDevices.getUserMedia({
				audio: false,
				video: videoConstraints,
			} as unknown as MediaStreamConstraints);
		}

		const videoTrack = mediaStream.getVideoTracks()[0];
		if (!videoTrack) throw new Error("Video track is not available.");

		try {
			await videoTrack.applyConstraints({
				frameRate: { ideal: TARGET_FRAME_RATE, max: TARGET_FRAME_RATE },
				width: { ideal: TARGET_WIDTH, max: TARGET_WIDTH },
				height: { ideal: TARGET_HEIGHT, max: TARGET_HEIGHT },
			});
		} catch {
			// Best-effort constraints; Electron may already choose the nearest valid mode.
		}

		const settings = videoTrack.getSettings();
		const width = Math.max(1, Math.floor((settings.width ?? 1920) / 2) * 2);
		const height = Math.max(1, Math.floor((settings.height ?? 1080) / 2) * 2);
		const mimeType = selectMimeType();
		recorderHandle = createRecorderHandle(mediaStream, {
			mimeType,
			videoBitsPerSecond: computeBitrate(width, height),
			...(mediaStream.getAudioTracks().length > 0 ? { audioBitsPerSecond: 192_000 } : {}),
		});

		await window.electronAPI.setRecordingState(true, recordingId);
		const startedAt = Date.now();
		await new Promise<void>((resolve) => window.setTimeout(resolve, config.durationMs));
		recorderHandle.recorder.stop();
		const recordedBlob = await recorderHandle.recordedBlobPromise;
		const durationMs = Math.max(1, Date.now() - startedAt);
		const fixedBlob = await fixWebmDuration(recordedBlob, durationMs);
		const fileName = `recording-${recordingId}${VIDEO_FILE_EXTENSION}`;
		const result = await window.electronAPI.storeRecordedSession({
			screen: {
				videoData: await fixedBlob.arrayBuffer(),
				fileName,
			},
			createdAt: recordingId,
		});

		if (!result.success || !result.path || !result.session) {
			throw new Error(result.message || result.error || "Failed to store recording.");
		}

		sendToMain("done", {
			path: result.path,
			session: result.session,
			durationMs,
			source: {
				id: source.id,
				name: source.name,
				display_id: source.display_id,
			},
		});
	} finally {
		try {
			await window.electronAPI.setRecordingState(false);
		} catch {
			// The CLI result should not be masked by tray/state cleanup.
		}
		mediaStream?.getTracks().forEach((track) => track.stop());
	}
}

export function CliRecordRenderer() {
	const started = useRef(false);

	useEffect(() => {
		if (started.current) return;
		started.current = true;

		window.electronAPI
			.getCliRecordConfig()
			.then((config) => record(config))
			.catch((error) => {
				sendToMain("error", {
					message: error instanceof Error ? error.message : String(error),
				});
			});
	}, []);

	return <div style={{ display: "none" }} />;
}
