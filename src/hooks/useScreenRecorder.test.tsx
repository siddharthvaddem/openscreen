import { act, cleanup, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/contexts/I18nContext";
import { useScreenRecorder } from "./useScreenRecorder";

vi.mock("@fix-webm-duration/fix", () => ({
	fixWebmDuration: vi.fn(async (blob: Blob) => blob),
}));

type ElectronAPI = Window["electronAPI"];

const countdownValuesMs = [1000, 1000, 1000];
const flushPromises = () => Promise.resolve();

class FakeMediaStreamTrack extends EventTarget {
	kind: string;
	enabled = true;
	readyState: "live" | "ended" = "live";
	onended: (() => void) | null = null;

	constructor(kind: string) {
		super();
		this.kind = kind;
	}

	stop(): void {
		if (this.readyState === "ended") return;
		this.readyState = "ended";
	}

	end(): void {
		if (this.readyState === "ended") return;
		this.readyState = "ended";
		this.onended?.();
		this.dispatchEvent(new Event("ended"));
	}

	getSettings(): MediaTrackSettings {
		return { width: 1920, height: 1080, frameRate: 60 };
	}

	applyConstraints(): Promise<void> {
		return Promise.resolve();
	}
}

class FakeMediaStream {
	private tracks: FakeMediaStreamTrack[];

	constructor(tracks: FakeMediaStreamTrack[] = []) {
		this.tracks = [...tracks];
	}

	addTrack(track: FakeMediaStreamTrack): void {
		this.tracks.push(track);
	}

	getTracks(): FakeMediaStreamTrack[] {
		return [...this.tracks];
	}

	getVideoTracks(): FakeMediaStreamTrack[] {
		return this.tracks.filter((track) => track.kind === "video");
	}

	getAudioTracks(): FakeMediaStreamTrack[] {
		return this.tracks.filter((track) => track.kind === "audio");
	}
}

class FakeMediaRecorder extends EventTarget {
	static instances: FakeMediaRecorder[] = [];
	static isTypeSupported = vi.fn(() => true);

	ondataavailable: ((event: BlobEvent) => void) | null = null;
	onstop: (() => void) | null = null;
	onerror: (() => void) | null = null;
	state: "inactive" | "recording" | "paused" = "inactive";

	constructor() {
		super();
		FakeMediaRecorder.instances.push(this);
	}

	start(): void {
		this.state = "recording";
	}

	stop(): void {
		if (this.state === "inactive") return;
		this.ondataavailable?.({
			data: new Blob(["screen-data"], { type: "video/webm" }),
		} as BlobEvent);
		this.state = "inactive";
		this.onstop?.();
		this.dispatchEvent(new Event("stop"));
	}

	pause(): void {
		this.state = "paused";
	}

	resume(): void {
		this.state = "recording";
	}
}

function wrapper({ children }: { children: ReactNode }) {
	return <I18nProvider>{children}</I18nProvider>;
}

function stubElectronAPI(api: Partial<ElectronAPI>): void {
	window.electronAPI = api as unknown as ElectronAPI;
}

describe("useScreenRecorder", () => {
	let screenTrack: FakeMediaStreamTrack;
	let screenStream: FakeMediaStream;
	let storeRecordedSession: ReturnType<typeof vi.fn>;
	let switchToEditor: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.useFakeTimers();
		FakeMediaRecorder.instances = [];
		screenTrack = new FakeMediaStreamTrack("video");
		screenStream = new FakeMediaStream([screenTrack]);
		storeRecordedSession = vi.fn(async () => ({
			success: true,
			path: "/tmp/recording.webm",
			session: {
				screenVideoPath: "/tmp/recording.webm",
				createdAt: 1,
				cursorCaptureMode: "editable-overlay",
			},
		}));
		switchToEditor = vi.fn(async () => undefined);

		vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
		vi.stubGlobal("MediaStream", FakeMediaStream);
		Object.defineProperty(navigator, "mediaDevices", {
			value: {
				getDisplayMedia: vi.fn(async () => screenStream),
				getUserMedia: vi.fn(async () => screenStream),
			},
			configurable: true,
		});
		stubElectronAPI({
			getSelectedSource: vi.fn(async () => ({
				id: "screen:1:0",
				name: "Entire Screen",
				display_id: "1",
				thumbnail: null,
				appIcon: null,
			})),
			getPlatform: vi.fn(async () => "linux"),
			showCountdownOverlay: vi.fn(async () => undefined),
			setCountdownOverlayValue: vi.fn(async () => undefined),
			hideCountdownOverlay: vi.fn(async () => undefined),
			setRecordingState: vi.fn(async () => undefined),
			openRecordingStream: vi.fn(async () => ({ success: false })),
			appendRecordingChunk: vi.fn(async () => ({ success: true })),
			storeRecordedSession,
			setCurrentRecordingSession: vi.fn(async () => undefined),
			setCurrentVideoPath: vi.fn(async () => undefined),
			switchToEditor,
			onStopRecordingFromTray: vi.fn(() => () => undefined),
			setLocale: vi.fn(async () => undefined),
		});
	});

	afterEach(() => {
		cleanup();
		vi.useRealTimers();
		vi.unstubAllGlobals();
		window.electronAPI = undefined as unknown as ElectronAPI;
	});

	it("opens the editor when a full-screen display track ends", async () => {
		const { result } = renderHook(() => useScreenRecorder(), { wrapper });

		await act(async () => {
			result.current.toggleRecording();
			for (const ms of countdownValuesMs) {
				await vi.advanceTimersByTimeAsync(ms);
			}
			await flushPromises();
		});

		expect(result.current.recording).toBe(true);

		await act(async () => {
			screenTrack.end();
			await flushPromises();
		});

		expect(storeRecordedSession).toHaveBeenCalled();
		expect(switchToEditor).toHaveBeenCalled();
	});

	it("opens the editor when a native macOS full-screen recording stops externally", async () => {
		let nativeStoppedHandler: (() => void) | undefined;
		const stopNativeMacRecording = vi.fn(async () => ({
			success: true,
			path: "/tmp/native-recording.mp4",
			session: {
				screenVideoPath: "/tmp/native-recording.mp4",
				createdAt: 2,
				cursorCaptureMode: "editable-overlay",
			},
		}));

		stubElectronAPI({
			...window.electronAPI,
			getPlatform: vi.fn(async () => "darwin"),
			requestNativeMacCursorAccess: vi.fn(async () => ({
				success: true,
				granted: true,
				status: "granted",
			})),
			isNativeMacCaptureAvailable: vi.fn(async () => ({
				success: true,
				available: true,
				helperPath: "/tmp/helper",
			})),
			startNativeMacRecording: vi.fn(async () => ({
				success: true,
				recordingId: 2,
				path: "/tmp/native-recording.mp4",
				helperPath: "/tmp/helper",
			})),
			stopNativeMacRecording,
			onNativeRecordingStopped: vi.fn((callback: () => void) => {
				nativeStoppedHandler = callback;
				return () => undefined;
			}),
		} as Partial<ElectronAPI> & {
			onNativeRecordingStopped: (callback: () => void) => () => void;
		});

		const { result } = renderHook(() => useScreenRecorder(), { wrapper });

		await act(async () => {
			result.current.toggleRecording();
			for (const ms of countdownValuesMs) {
				await vi.advanceTimersByTimeAsync(ms);
			}
			await flushPromises();
		});

		expect(result.current.recording).toBe(true);
		expect(nativeStoppedHandler).toBeDefined();

		await act(async () => {
			nativeStoppedHandler?.();
			await flushPromises();
		});

		expect(stopNativeMacRecording).toHaveBeenCalledWith(false);
		expect(window.electronAPI.setCurrentRecordingSession).toHaveBeenCalledWith({
			screenVideoPath: "/tmp/native-recording.mp4",
			createdAt: 2,
			cursorCaptureMode: "editable-overlay",
		});
		expect(switchToEditor).toHaveBeenCalled();
	});

	it("falls back to browser recording when native macOS capture lacks screen permission", async () => {
		const startNativeMacRecording = vi.fn(async () => ({
			success: false,
			error: "Screen recording permission is required for ScreenCaptureKit capture.",
		}));

		stubElectronAPI({
			...window.electronAPI,
			getPlatform: vi.fn(async () => "darwin"),
			requestNativeMacCursorAccess: vi.fn(async () => ({
				success: true,
				granted: true,
				status: "granted",
			})),
			isNativeMacCaptureAvailable: vi.fn(async () => ({
				success: true,
				available: true,
				helperPath: "/tmp/helper",
			})),
			startNativeMacRecording,
			stopNativeMacRecording: vi.fn(async () => ({
				success: true,
				discarded: true,
			})),
		});

		const { result } = renderHook(() => useScreenRecorder(), { wrapper });

		await act(async () => {
			result.current.toggleRecording();
			for (const ms of countdownValuesMs) {
				await vi.advanceTimersByTimeAsync(ms);
			}
			await flushPromises();
		});

		expect(startNativeMacRecording).toHaveBeenCalled();
		expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
		expect(result.current.recording).toBe(true);

		await act(async () => {
			screenTrack.end();
			await flushPromises();
		});

		expect(storeRecordedSession).toHaveBeenCalled();
		expect(switchToEditor).toHaveBeenCalled();
	});

	it("uses browser recording on macOS when microphone recording is enabled", async () => {
		const micStream = new FakeMediaStream([new FakeMediaStreamTrack("audio")]);
		const getUserMedia = vi.fn(async (constraints: MediaStreamConstraints) => {
			if (constraints.video === false) {
				return micStream;
			}
			return screenStream;
		});
		Object.defineProperty(navigator, "mediaDevices", {
			value: {
				getDisplayMedia: vi.fn(async () => screenStream),
				getUserMedia,
			},
			configurable: true,
		});
		const startNativeMacRecording = vi.fn(async () => ({
			success: true,
			recordingId: 3,
			path: "/tmp/native-recording.mp4",
			helperPath: "/tmp/helper",
		}));

		stubElectronAPI({
			...window.electronAPI,
			getPlatform: vi.fn(async () => "darwin"),
			requestNativeMacCursorAccess: vi.fn(async () => ({
				success: true,
				granted: true,
				status: "granted",
			})),
			isNativeMacCaptureAvailable: vi.fn(async () => ({
				success: true,
				available: true,
				helperPath: "/tmp/helper",
			})),
			startNativeMacRecording,
			stopNativeMacRecording: vi.fn(async () => ({
				success: true,
				discarded: true,
			})),
		});

		const { result } = renderHook(() => useScreenRecorder(), { wrapper });

		await act(async () => {
			result.current.setMicrophoneEnabled(true);
		});
		expect(result.current.microphoneEnabled).toBe(true);

		await act(async () => {
			result.current.toggleRecording();
			for (const ms of countdownValuesMs) {
				await vi.advanceTimersByTimeAsync(ms);
			}
			await flushPromises();
		});

		expect(startNativeMacRecording).not.toHaveBeenCalled();
		expect(getUserMedia).toHaveBeenCalledWith(
			expect.objectContaining({
				video: false,
			}),
		);
		expect(result.current.recording).toBe(true);

		await act(async () => {
			screenTrack.end();
			await flushPromises();
		});

		expect(storeRecordedSession).toHaveBeenCalled();
		expect(switchToEditor).toHaveBeenCalled();
	});
});
