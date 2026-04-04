import { useCallback, useEffect, useRef, useState } from "react";

const PREVIEW_WIDTH = 1920;
const PREVIEW_HEIGHT = 1080;
const PREVIEW_FRAME_RATE = 30;
const CHROME_MEDIA_SOURCE = "desktop";

export interface PreviewStreams {
	screen: MediaStream;
	webcam: MediaStream | null;
}

interface UsePreviewStreamOptions {
	webcamEnabled: boolean;
}

export function usePreviewStream({ webcamEnabled }: UsePreviewStreamOptions) {
	const [previewActive, setPreviewActive] = useState(false);
	const [sourceId, setSourceId] = useState<string | null>(null);
	const screenStreamRef = useRef<MediaStream | null>(null);
	const webcamStreamRef = useRef<MediaStream | null>(null);
	const [streams, setStreams] = useState<PreviewStreams | null>(null);

	const stopPreview = useCallback(() => {
		if (screenStreamRef.current) {
			screenStreamRef.current.getTracks().forEach((t) => t.stop());
			screenStreamRef.current = null;
		}
		if (webcamStreamRef.current) {
			webcamStreamRef.current.getTracks().forEach((t) => t.stop());
			webcamStreamRef.current = null;
		}
		setStreams(null);
		setPreviewActive(false);
	}, []);

	const startPreview = useCallback(
		async (desktopSourceId: string) => {
			// Stop any existing preview
			if (screenStreamRef.current) {
				screenStreamRef.current.getTracks().forEach((t) => t.stop());
				screenStreamRef.current = null;
			}

			try {
				const screenStream = await navigator.mediaDevices.getUserMedia({
					audio: false,
					video: {
						mandatory: {
							chromeMediaSource: CHROME_MEDIA_SOURCE,
							chromeMediaSourceId: desktopSourceId,
							maxWidth: PREVIEW_WIDTH,
							maxHeight: PREVIEW_HEIGHT,
							maxFrameRate: PREVIEW_FRAME_RATE,
						},
					},
				} as unknown as MediaStreamConstraints);

				screenStreamRef.current = screenStream;
				setSourceId(desktopSourceId);
				setPreviewActive(true);

				// Get webcam if enabled
				let webcamStream: MediaStream | null = null;
				if (webcamEnabled) {
					try {
						webcamStream = await navigator.mediaDevices.getUserMedia({
							audio: false,
							video: {
								width: { ideal: 640 },
								height: { ideal: 480 },
								frameRate: { ideal: PREVIEW_FRAME_RATE },
							},
						});
						webcamStreamRef.current = webcamStream;
					} catch {
						// Webcam not available, continue without it
					}
				}

				setStreams({ screen: screenStream, webcam: webcamStream });
				return screenStream;
			} catch (error) {
				console.error("Failed to start preview stream:", error);
				stopPreview();
				return null;
			}
		},
		[webcamEnabled, stopPreview],
	);

	// Handle webcam toggle while preview is active
	useEffect(() => {
		if (!previewActive) return;

		if (webcamEnabled && !webcamStreamRef.current) {
			navigator.mediaDevices
				.getUserMedia({
					audio: false,
					video: {
						width: { ideal: 640 },
						height: { ideal: 480 },
						frameRate: { ideal: PREVIEW_FRAME_RATE },
					},
				})
				.then((webcamStream) => {
					webcamStreamRef.current = webcamStream;
					setStreams((prev) => (prev ? { ...prev, webcam: webcamStream } : null));
				})
				.catch(() => {
					// Webcam unavailable
				});
		} else if (!webcamEnabled && webcamStreamRef.current) {
			webcamStreamRef.current.getTracks().forEach((t) => t.stop());
			webcamStreamRef.current = null;
			setStreams((prev) => (prev ? { ...prev, webcam: null } : null));
		}
	}, [webcamEnabled, previewActive]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (screenStreamRef.current) {
				screenStreamRef.current.getTracks().forEach((t) => t.stop());
			}
			if (webcamStreamRef.current) {
				webcamStreamRef.current.getTracks().forEach((t) => t.stop());
			}
		};
	}, []);

	/**
	 * Detach and return the current screen stream for recording use.
	 * After this, the preview no longer owns the stream (won't stop its tracks).
	 */
	const detachScreenStream = useCallback(() => {
		const stream = screenStreamRef.current;
		screenStreamRef.current = null;
		return stream;
	}, []);

	const detachWebcamStream = useCallback(() => {
		const stream = webcamStreamRef.current;
		webcamStreamRef.current = null;
		return stream;
	}, []);

	return {
		streams,
		previewActive,
		sourceId,
		startPreview,
		stopPreview,
		detachScreenStream,
		detachWebcamStream,
	};
}
