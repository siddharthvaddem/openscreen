import { fixWebmDuration } from "@fix-webm-duration/fix";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useScopedT } from "@/contexts/I18nContext";
import { requestCameraAccess } from "@/lib/requestCameraAccess";

const TARGET_FRAME_RATE = 60;
const MIN_FRAME_RATE = 30;
const TARGET_WIDTH = 7680;
const TARGET_HEIGHT = 4320;
const EIGHT_K_PIXELS = TARGET_WIDTH * TARGET_HEIGHT;
const FOUR_K_PIXELS = 3840 * 2160;
const QHD_WIDTH = 2560;
const QHD_HEIGHT = 1440;
const QHD_PIXELS = QHD_WIDTH * QHD_HEIGHT;

const BITRATE_8K = 80_000_000;
const BITRATE_4K = 45_000_000;
const BITRATE_QHD = 28_000_000;
const BITRATE_BASE = 18_000_000;
const HIGH_FRAME_RATE_THRESHOLD = 60;
const HIGH_FRAME_RATE_BOOST = 1.7;

const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;

const CODEC_ALIGNMENT = 2;

const RECORDER_TIMESLICE_MS = 1000;
const BITS_PER_MEGABIT = 1_000_000;
const CHROME_MEDIA_SOURCE = "desktop";
const RECORDING_FILE_PREFIX = "recording-";
const VIDEO_FILE_EXTENSION = ".webm";
const WEBCAM_FILE_SUFFIX = "-webcam";

const AUDIO_BITRATE_VOICE = 128_000;
const AUDIO_BITRATE_SYSTEM = 192_000;

const MIC_GAIN_BOOST = 1.4;
const WEBCAM_TARGET_WIDTH = 1280;
const WEBCAM_TARGET_HEIGHT = 720;
const WEBCAM_TARGET_FRAME_RATE = 30;

type UseScreenRecorderReturn = {
	recording: boolean;
	paused: boolean;
	elapsedSeconds: number;
	toggleRecording: () => void;
	togglePaused: () => void;
	restartRecording: () => void;
	cancelRecording: () => void;
	microphoneEnabled: boolean;
	setMicrophoneEnabled: (enabled: boolean) => void;
	microphoneDeviceId: string | undefined;
	setMicrophoneDeviceId: (deviceId: string | undefined) => void;
	webcamDeviceId: string | undefined;
	setWebcamDeviceId: (deviceId: string | undefined) => void;
	systemAudioEnabled: boolean;
	setSystemAudioEnabled: (enabled: boolean) => void;
	webcamEnabled: boolean;
	setWebcamEnabled: (enabled: boolean) => Promise<boolean>;
};

type RecorderHandle = {
	recorder: MediaRecorder;
	recordedBlobPromise: Promise<Blob>;
};

function createRecorderHandle(stream: MediaStream, options: MediaRecorderOptions): RecorderHandle {
	const recorder = new MediaRecorder(stream, options);
	const chunks: Blob[] = [];
	const mimeType = options.mimeType || "video/webm";
	const recordedBlobPromise = new Promise<Blob>((resolve, reject) => {
		recorder.ondataavailable = (event: BlobEvent) => {
			if (event.data && event.data.size > 0) {
				chunks.push(event.data);
			}
		};
		recorder.onerror = () => {
			reject(new Error("Recording failed"));
		};
		recorder.onstop = () => {
			resolve(new Blob(chunks, { type: mimeType }));
		};
	});

	recorder.start(RECORDER_TIMESLICE_MS);
	return { recorder, recordedBlobPromise };
}

export function useScreenRecorder(): UseScreenRecorderReturn {
	const t = useScopedT("editor");
	const [recording, setRecording] = useState(false);
	const [paused, setPaused] = useState(false);
	const [elapsedSeconds, setElapsedSeconds] = useState(0);
	const [microphoneEnabled, setMicrophoneEnabled] = useState(false);
	const [microphoneDeviceId, setMicrophoneDeviceId] = useState<string | undefined>(undefined);
	const [webcamDeviceId, setWebcamDeviceId] = useState<string | undefined>(undefined);
	const [systemAudioEnabled, setSystemAudioEnabled] = useState(false);
	const [webcamEnabled, setWebcamEnabledState] = useState(false);
	const screenRecorder = useRef<RecorderHandle | null>(null);
	const webcamRecorder = useRef<RecorderHandle | null>(null);
	const stream = useRef<MediaStream | null>(null);
	const screenStream = useRef<MediaStream | null>(null);
	const microphoneStream = useRef<MediaStream | null>(null);
	const webcamStream = useRef<MediaStream | null>(null);
	const mixingContext = useRef<AudioContext | null>(null);
	const recordingId = useRef<number>(0);
	const accumulatedDurationMs = useRef(0);
	const segmentStartedAt = useRef<number | null>(null);
	const finalizingRecordingId = useRef<number | null>(null);
	const allowAutoFinalize = useRef(false);
	const discardRecordingId = useRef<number | null>(null);
	const restarting = useRef(false);

	const getRecordingDurationMs = useCallback(() => {
		const segmentDuration =
			segmentStartedAt.current === null ? 0 : Date.now() - segmentStartedAt.current;
		return accumulatedDurationMs.current + segmentDuration;
	}, []);

	const selectMimeType = () => {
		const preferred = [
			"video/webm;codecs=av1",
			"video/webm;codecs=h264",
			"video/webm;codecs=vp9",
			"video/webm;codecs=vp8",
			"video/webm",
		];

		return preferred.find((type) => MediaRecorder.isTypeSupported(type)) ?? "video/webm";
	};

	const computeBitrate = (width: number, height: number) => {
		const pixels = width * height;
		const highFrameRateBoost =
			TARGET_FRAME_RATE >= HIGH_FRAME_RATE_THRESHOLD ? HIGH_FRAME_RATE_BOOST : 1;

		if (pixels >= EIGHT_K_PIXELS) {
			return Math.round(BITRATE_8K * highFrameRateBoost);
		}

		if (pixels >= FOUR_K_PIXELS) {
			return Math.round(BITRATE_4K * highFrameRateBoost);
		}

		if (pixels >= QHD_PIXELS) {
			return Math.round(BITRATE_QHD * highFrameRateBoost);
		}

		return Math.round(BITRATE_BASE * highFrameRateBoost);
	};

	const teardownMedia = useCallback(() => {
		if (stream.current) {
			stream.current.getTracks().forEach((track) => track.stop());
			stream.current = null;
		}
		if (screenStream.current) {
			screenStream.current.getTracks().forEach((track) => track.stop());
			screenStream.current = null;
		}
		if (microphoneStream.current) {
			microphoneStream.current.getTracks().forEach((track) => track.stop());
			microphoneStream.current = null;
		}
		if (webcamStream.current) {
			webcamStream.current.getTracks().forEach((track) => track.stop());
			webcamStream.current = null;
		}
		if (mixingContext.current) {
			mixingContext.current.close().catch(() => {
				// Ignore close errors during recorder teardown.
			});
			mixingContext.current = null;
		}
	}, []);

	const setWebcamEnabled = useCallback(
		async (enabled: boolean) => {
			if (!enabled) {
				setWebcamEnabledState(false);
				return true;
			}

			const accessResult = await requestCameraAccess();
			if (!accessResult.success) {
				toast.error(t("recording.failedCameraAccess"));
				return false;
			}

			if (!accessResult.granted) {
				toast.error(t("recording.cameraBlocked"));
				return false;
			}

			setWebcamEnabledState(true);
			return true;
		},
		[t],
	);

	const finalizeRecording = useCallback(
		(
			activeScreenRecorder: RecorderHandle,
			activeWebcamRecorder: RecorderHandle | null,
			duration: number,
			activeRecordingId: number,
		) => {
			if (finalizingRecordingId.current === activeRecordingId) {
				return;
			}
			finalizingRecordingId.current = activeRecordingId;

			if (screenRecorder.current === activeScreenRecorder) {
				screenRecorder.current = null;
			}
			if (activeWebcamRecorder && webcamRecorder.current === activeWebcamRecorder) {
				webcamRecorder.current = null;
			}

			teardownMedia();
			setRecording(false);
			setPaused(false);
			setElapsedSeconds(0);
			accumulatedDurationMs.current = 0;
			segmentStartedAt.current = null;
			window.electronAPI?.setRecordingState(false);

			void (async () => {
				try {
					const screenBlob = await activeScreenRecorder.recordedBlobPromise;
					if (discardRecordingId.current === activeRecordingId) {
						return;
					}
					if (screenBlob.size === 0) {
						return;
					}

					const fixedScreenBlob = await fixWebmDuration(screenBlob, duration);
					let fixedWebcamBlob: Blob | null = null;
					if (activeWebcamRecorder) {
						const webcamBlob = await activeWebcamRecorder.recordedBlobPromise.catch(() => null);
						if (webcamBlob && webcamBlob.size > 0) {
							fixedWebcamBlob = await fixWebmDuration(webcamBlob, duration);
						}
					}

					const screenFileName = `${RECORDING_FILE_PREFIX}${activeRecordingId}${VIDEO_FILE_EXTENSION}`;
					const webcamFileName = `${RECORDING_FILE_PREFIX}${activeRecordingId}${WEBCAM_FILE_SUFFIX}${VIDEO_FILE_EXTENSION}`;
					const result = await window.electronAPI.storeRecordedSession({
						screen: {
							videoData: await fixedScreenBlob.arrayBuffer(),
							fileName: screenFileName,
						},
						webcam: fixedWebcamBlob
							? {
									videoData: await fixedWebcamBlob.arrayBuffer(),
									fileName: webcamFileName,
								}
							: undefined,
						createdAt: activeRecordingId,
					});

					if (!result.success) {
						console.error("Failed to store recording session:", result.message);
						return;
					}

					if (result.session) {
						await window.electronAPI.setCurrentRecordingSession(result.session);
					} else if (result.path) {
						await window.electronAPI.setCurrentVideoPath(result.path);
					}

					await window.electronAPI.switchToEditor();
				} catch (error) {
					console.error("Error saving recording:", error);
				} finally {
					if (finalizingRecordingId.current === activeRecordingId) {
						finalizingRecordingId.current = null;
					}
					if (discardRecordingId.current === activeRecordingId) {
						discardRecordingId.current = null;
					}
				}
			})();
		},
		[teardownMedia],
	);

	const stopRecording = useRef(() => {
		const activeScreenRecorder = screenRecorder.current;
		if (!activeScreenRecorder) {
			return;
		}

		const activeWebcamRecorder = webcamRecorder.current;
		const duration = getRecordingDurationMs();
		const activeRecordingId = recordingId.current;

		finalizeRecording(
			activeScreenRecorder,
			activeWebcamRecorder ?? null,
			duration,
			activeRecordingId,
		);

		if (
			activeScreenRecorder.recorder.state === "recording" ||
			activeScreenRecorder.recorder.state === "paused"
		) {
			try {
				activeScreenRecorder.recorder.stop();
			} catch {
				// Recorder may already be stopping.
			}
		}
		if (activeWebcamRecorder) {
			if (
				activeWebcamRecorder.recorder.state === "recording" ||
				activeWebcamRecorder.recorder.state === "paused"
			) {
				try {
					activeWebcamRecorder.recorder.stop();
				} catch {
					// Recorder may already be stopping.
				}
			}
		}
	});

	useEffect(() => {
		let cleanup: (() => void) | undefined;

		if (window.electronAPI?.onStopRecordingFromTray) {
			cleanup = window.electronAPI.onStopRecordingFromTray(() => {
				stopRecording.current();
			});
		}

		return () => {
			if (cleanup) cleanup();
			allowAutoFinalize.current = false;
			restarting.current = false;
			discardRecordingId.current = null;

			if (
				screenRecorder.current?.recorder.state === "recording" ||
				screenRecorder.current?.recorder.state === "paused"
			) {
				try {
					screenRecorder.current.recorder.stop();
				} catch {
					// Ignore recorder teardown errors during cleanup.
				}
			}
			if (
				webcamRecorder.current?.recorder.state === "recording" ||
				webcamRecorder.current?.recorder.state === "paused"
			) {
				try {
					webcamRecorder.current.recorder.stop();
				} catch {
					// Ignore recorder teardown errors during cleanup.
				}
			}
			screenRecorder.current = null;
			webcamRecorder.current = null;
			teardownMedia();
		};
	}, [teardownMedia]);

	const startRecording = async () => {
		try {
			const selectedSource = await window.electronAPI.getSelectedSource();
			if (!selectedSource) {
				alert(t("recording.selectSource"));
				return;
			}

			let screenMediaStream: MediaStream;

			const videoConstraints = {
				mandatory: {
					chromeMediaSource: CHROME_MEDIA_SOURCE,
					chromeMediaSourceId: selectedSource.id,
					maxWidth: TARGET_WIDTH,
					maxHeight: TARGET_HEIGHT,
					maxFrameRate: TARGET_FRAME_RATE,
					minFrameRate: MIN_FRAME_RATE,
				},
			};

			if (systemAudioEnabled) {
				try {
					screenMediaStream = await navigator.mediaDevices.getUserMedia({
						audio: {
							mandatory: {
								chromeMediaSource: CHROME_MEDIA_SOURCE,
								chromeMediaSourceId: selectedSource.id,
							},
						},
						video: videoConstraints,
					} as unknown as MediaStreamConstraints);
				} catch (audioErr) {
					console.warn("System audio capture failed, falling back to video-only:", audioErr);
					toast.error(t("recording.systemAudioUnavailable"));
					screenMediaStream = await navigator.mediaDevices.getUserMedia({
						audio: false,
						video: videoConstraints,
					} as unknown as MediaStreamConstraints);
				}
			} else {
				screenMediaStream = await navigator.mediaDevices.getUserMedia({
					audio: false,
					video: videoConstraints,
				} as unknown as MediaStreamConstraints);
			}
			screenStream.current = screenMediaStream;

			if (microphoneEnabled) {
				try {
					microphoneStream.current = await navigator.mediaDevices.getUserMedia({
						audio: microphoneDeviceId
							? {
									deviceId: { exact: microphoneDeviceId },
									echoCancellation: true,
									noiseSuppression: true,
									autoGainControl: true,
								}
							: {
									echoCancellation: true,
									noiseSuppression: true,
									autoGainControl: true,
								},
						video: false,
					});
				} catch (audioError) {
					console.warn("Failed to get microphone access:", audioError);
					toast.error(t("recording.microphoneDenied"));
					setMicrophoneEnabled(false);
				}
			}

			if (webcamEnabled) {
				try {
					webcamStream.current = await navigator.mediaDevices.getUserMedia({
						audio: false,
						video: webcamDeviceId
							? {
									deviceId: { exact: webcamDeviceId },
									width: { ideal: WEBCAM_TARGET_WIDTH },
									height: { ideal: WEBCAM_TARGET_HEIGHT },
									frameRate: { ideal: WEBCAM_TARGET_FRAME_RATE, max: WEBCAM_TARGET_FRAME_RATE },
								}
							: {
									width: { ideal: WEBCAM_TARGET_WIDTH },
									height: { ideal: WEBCAM_TARGET_HEIGHT },
									frameRate: { ideal: WEBCAM_TARGET_FRAME_RATE, max: WEBCAM_TARGET_FRAME_RATE },
								},
					});
				} catch (cameraError) {
					console.warn("Failed to get webcam access:", cameraError);
					if (webcamStream.current) {
						webcamStream.current.getTracks().forEach((track) => track.stop());
						webcamStream.current = null;
					}
					setWebcamEnabledState(false);
					toast.error(t("recording.cameraDenied"));
				}
			}

			stream.current = new MediaStream();
			const videoTrack = screenMediaStream.getVideoTracks()[0];
			if (!videoTrack) {
				throw new Error("Video track is not available.");
			}
			stream.current.addTrack(videoTrack);

			const systemAudioTrack = screenMediaStream.getAudioTracks()[0];
			const micAudioTrack = microphoneStream.current?.getAudioTracks()[0];

			if (systemAudioTrack && micAudioTrack) {
				const ctx = new AudioContext();
				mixingContext.current = ctx;
				const systemSource = ctx.createMediaStreamSource(new MediaStream([systemAudioTrack]));
				const micSource = ctx.createMediaStreamSource(new MediaStream([micAudioTrack]));
				const micGain = ctx.createGain();
				micGain.gain.value = MIC_GAIN_BOOST;
				const destination = ctx.createMediaStreamDestination();
				systemSource.connect(destination);
				micSource.connect(micGain).connect(destination);
				stream.current.addTrack(destination.stream.getAudioTracks()[0]);
			} else if (systemAudioTrack) {
				stream.current.addTrack(systemAudioTrack);
			} else if (micAudioTrack) {
				stream.current.addTrack(micAudioTrack);
			}

			try {
				await videoTrack.applyConstraints({
					frameRate: { ideal: TARGET_FRAME_RATE, max: TARGET_FRAME_RATE },
					width: { ideal: TARGET_WIDTH, max: TARGET_WIDTH },
					height: { ideal: TARGET_HEIGHT, max: TARGET_HEIGHT },
				});
			} catch (constraintError) {
				console.warn(
					"Unable to lock 4K/60fps constraints, using best available track settings.",
					constraintError,
				);
			}

			let {
				width = DEFAULT_WIDTH,
				height = DEFAULT_HEIGHT,
				frameRate = TARGET_FRAME_RATE,
			} = videoTrack.getSettings();

			width = Math.floor(width / CODEC_ALIGNMENT) * CODEC_ALIGNMENT;
			height = Math.floor(height / CODEC_ALIGNMENT) * CODEC_ALIGNMENT;

			const videoBitsPerSecond = computeBitrate(width, height);
			const mimeType = selectMimeType();

			console.log(
				`Recording at ${width}x${height} @ ${frameRate ?? TARGET_FRAME_RATE}fps using ${mimeType} / ${Math.round(
					videoBitsPerSecond / BITS_PER_MEGABIT,
				)} Mbps`,
			);

			const hasAudio = stream.current.getAudioTracks().length > 0;
			screenRecorder.current = createRecorderHandle(stream.current, {
				mimeType,
				videoBitsPerSecond,
				...(hasAudio
					? { audioBitsPerSecond: systemAudioTrack ? AUDIO_BITRATE_SYSTEM : AUDIO_BITRATE_VOICE }
					: {}),
			});
			screenRecorder.current.recorder.addEventListener(
				"error",
				() => {
					setRecording(false);
				},
				{ once: true },
			);

			if (webcamStream.current) {
				webcamRecorder.current = createRecorderHandle(webcamStream.current, {
					mimeType,
					videoBitsPerSecond: Math.min(videoBitsPerSecond, BITRATE_BASE),
				});
			}

			recordingId.current = Date.now();
			accumulatedDurationMs.current = 0;
			segmentStartedAt.current = Date.now();
			allowAutoFinalize.current = true;
			setRecording(true);
			setPaused(false);
			setElapsedSeconds(0);
			window.electronAPI?.setRecordingState(true);

			const activeScreenRecorder = screenRecorder.current;
			const activeWebcamRecorder = webcamRecorder.current;
			const activeRecordingId = recordingId.current;
			if (activeScreenRecorder) {
				activeScreenRecorder.recorder.addEventListener(
					"stop",
					() => {
						if (!allowAutoFinalize.current) {
							return;
						}
						finalizeRecording(
							activeScreenRecorder,
							activeWebcamRecorder ?? null,
							Math.max(0, getRecordingDurationMs()),
							activeRecordingId,
						);
					},
					{ once: true },
				);
			}
		} catch (error) {
			console.error("Failed to start recording:", error);
			const errorMsg = error instanceof Error ? error.message : "Failed to start recording";
			if (errorMsg.includes("Permission denied") || errorMsg.includes("NotAllowedError")) {
				toast.error(t("recording.permissionDenied"));
			} else {
				toast.error(errorMsg);
			}
			setRecording(false);
			setPaused(false);
			setElapsedSeconds(0);
			accumulatedDurationMs.current = 0;
			segmentStartedAt.current = null;
			screenRecorder.current = null;
			webcamRecorder.current = null;
			teardownMedia();
		}
	};

	const togglePaused = () => {
		const activeScreenRecorder = screenRecorder.current?.recorder;
		if (!activeScreenRecorder || activeScreenRecorder.state === "inactive") {
			return;
		}

		const activeWebcamRecorder = webcamRecorder.current?.recorder;

		if (activeScreenRecorder.state === "paused") {
			try {
				activeScreenRecorder.resume();
				if (activeWebcamRecorder?.state === "paused") {
					activeWebcamRecorder.resume();
				}
				segmentStartedAt.current = Date.now();
				setPaused(false);
			} catch (error) {
				console.error("Failed to resume recording:", error);
			}
			return;
		}

		if (activeScreenRecorder.state !== "recording") {
			return;
		}

		try {
			accumulatedDurationMs.current = getRecordingDurationMs();
			segmentStartedAt.current = null;
			setElapsedSeconds(Math.floor(accumulatedDurationMs.current / 1000));
			activeScreenRecorder.pause();
			if (activeWebcamRecorder?.state === "recording") {
				activeWebcamRecorder.pause();
			}
			setPaused(true);
		} catch (error) {
			console.error("Failed to pause recording:", error);
		}
	};

	const toggleRecording = () => {
		recording ? stopRecording.current() : startRecording();
	};

	const restartRecording = async () => {
		if (restarting.current) return;

		const activeScreenRecorder = screenRecorder.current;
		if (!activeScreenRecorder || activeScreenRecorder.recorder.state === "inactive") return;

		const activeWebcamRecorder = webcamRecorder.current;
		const activeRecordingId = recordingId.current;

		restarting.current = true;
		discardRecordingId.current = activeRecordingId;
		allowAutoFinalize.current = false;

		const stopPromises = [
			new Promise<void>((resolve) => {
				activeScreenRecorder.recorder.addEventListener("stop", () => resolve(), { once: true });
			}),
		];

		if (
			activeWebcamRecorder?.recorder.state === "recording" ||
			activeWebcamRecorder?.recorder.state === "paused"
		) {
			stopPromises.push(
				new Promise<void>((resolve) => {
					activeWebcamRecorder.recorder.addEventListener("stop", () => resolve(), {
						once: true,
					});
				}),
			);
		}

		stopRecording.current();
		await Promise.all(stopPromises);

		try {
			await startRecording();
		} finally {
			restarting.current = false;
		}
	};

	useEffect(() => {
		if (!recording) {
			setElapsedSeconds(0);
			return;
		}

		setElapsedSeconds(Math.floor(getRecordingDurationMs() / 1000));
		if (paused) {
			return;
		}

		const interval = window.setInterval(() => {
			setElapsedSeconds(Math.floor(getRecordingDurationMs() / 1000));
		}, 250);

		return () => window.clearInterval(interval);
	}, [getRecordingDurationMs, paused, recording]);

	const cancelRecording = () => {
		const activeScreenRecorder = screenRecorder.current;
		if (!activeScreenRecorder || activeScreenRecorder.recorder.state !== "recording") return;

		const activeRecordingId = recordingId.current;
		discardRecordingId.current = activeRecordingId;
		allowAutoFinalize.current = false;

		stopRecording.current();
	};

	return {
		recording,
		paused,
		elapsedSeconds,
		toggleRecording,
		togglePaused,
		restartRecording,
		cancelRecording,
		microphoneEnabled,
		setMicrophoneEnabled,
		microphoneDeviceId,
		setMicrophoneDeviceId,
		webcamDeviceId,
		setWebcamDeviceId,
		systemAudioEnabled,
		setSystemAudioEnabled,
		webcamEnabled,
		setWebcamEnabled,
	};
}
