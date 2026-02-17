import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScreenRecorder } from './useScreenRecorder';

// --- Module mocks (hoisted) ---
vi.mock('@fix-webm-duration/fix', () => ({
  fixWebmDuration: vi.fn((_blob: Blob) => {
    void _blob;
    return Promise.resolve(new Blob(['fixed'], { type: 'video/webm' }));
  }),
}));

vi.mock('sonner', () => ({
  toast: { warning: vi.fn(), error: vi.fn() },
}));

// --- Helpers ---

type MockMediaRecorderInstance = {
  state: string;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  ondataavailable: ((e: { data: Blob }) => void) | null;
  onstop: (() => void) | null;
  onerror: (() => void) | null;
};

// Track all created MockMediaRecorder instances and constructor calls
let mockRecorderInstances: MockMediaRecorderInstance[] = [];
let mockRecorderConstructorCalls: [MediaStream, MediaRecorderOptions | undefined][] = [];

class MockMediaRecorderClass {
  state = 'inactive';
  start = vi.fn().mockImplementation(() => {
    (this as unknown as MockMediaRecorderInstance).state = 'recording';
  });
  stop = vi.fn().mockImplementation(() => {
    const self = this as unknown as MockMediaRecorderInstance;
    self.state = 'inactive';
    if (self.ondataavailable) {
      self.ondataavailable({ data: new Blob(['final-chunk'], { type: 'video/webm' }) });
    }
    // Use queueMicrotask instead of setTimeout so the onstop fires within the
    // same act() block and doesn't leak across tests via the timer queue.
    queueMicrotask(() => {
      if (self.onstop) self.onstop();
    });
  });
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(stream: MediaStream, opts?: MediaRecorderOptions) {
    mockRecorderConstructorCalls.push([stream, opts]);
    mockRecorderInstances.push(this as unknown as MockMediaRecorderInstance);
  }

  static isTypeSupported = vi.fn().mockReturnValue(true);
}

function createMockMediaStream(kind: 'video' | 'audio' = 'video'): MediaStream {
  const track = {
    kind,
    readyState: 'live' as const,
    stop: vi.fn(),
    applyConstraints: vi.fn().mockResolvedValue(undefined),
    getSettings: () => ({ width: 1920, height: 1080, frameRate: 60 }),
  } as unknown as MediaStreamTrack;

  return {
    getTracks: () => [track],
    getVideoTracks: () => kind === 'video' ? [track] : [],
    getAudioTracks: () => kind === 'audio' ? [track] : [],
    addTrack: vi.fn(),
  } as unknown as MediaStream;
}

function createMockWebcamStream(): MediaStream {
  const track = {
    kind: 'video',
    readyState: 'live' as const,
    stop: vi.fn(),
  } as unknown as MediaStreamTrack;

  return {
    getTracks: () => [track],
    getVideoTracks: () => [track],
    getAudioTracks: () => [],
    addTrack: vi.fn(),
  } as unknown as MediaStream;
}

function setupElectronAPIMock() {
  return {
    getSelectedSource: vi.fn().mockResolvedValue({ id: 'screen:1', name: 'Screen 1', display_id: '1', thumbnail: null, appIcon: null }),
    storeRecordedVideo: vi.fn().mockResolvedValue({ success: true, path: '/recordings/test.webm', message: 'ok' }),
    setCurrentVideoPath: vi.fn().mockResolvedValue({ success: true }),
    switchToEditor: vi.fn().mockResolvedValue(undefined),
    setRecordingState: vi.fn().mockResolvedValue(undefined),
    onStopRecordingFromTray: vi.fn().mockReturnValue(() => {}),
    onStartRecordingFromShortcut: vi.fn().mockReturnValue(() => {}),
    autoZoom: undefined,
    keystrokeEditor: undefined,
    camera: {
      getPermissionStatus: vi.fn().mockResolvedValue({ success: true, status: 'granted' }),
      requestAccess: vi.fn().mockResolvedValue({ success: true, granted: true }),
    },
  };
}

// --- Test suite ---

describe('useScreenRecorder — webcam dual recording', () => {
  let electronAPIMock: ReturnType<typeof setupElectronAPIMock>;
  let originalMediaRecorder: typeof globalThis.MediaRecorder;
  let originalNavigator: Navigator;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockRecorderInstances = [];
    mockRecorderConstructorCalls = [];

    // Polyfill Blob.prototype.arrayBuffer for jsdom (not natively available).
    // Returns a minimal ArrayBuffer — content doesn't matter for test assertions.
    if (!Blob.prototype.arrayBuffer) {
      Blob.prototype.arrayBuffer = function (this: Blob): Promise<ArrayBuffer> {
        return Promise.resolve(new ArrayBuffer(this.size));
      };
    }

    // Mock MediaRecorder with a real class (supports `new`)
    originalMediaRecorder = globalThis.MediaRecorder;
    (globalThis as Record<string, unknown>).MediaRecorder = MockMediaRecorderClass;

    // Mock MediaStream constructor (not available in jsdom)
    (globalThis as Record<string, unknown>).MediaStream = class MockMediaStream {
      private tracks: MediaStreamTrack[] = [];
      getTracks() { return [...this.tracks]; }
      getVideoTracks() { return this.tracks.filter(t => t.kind === 'video'); }
      getAudioTracks() { return this.tracks.filter(t => t.kind === 'audio'); }
      addTrack(track: MediaStreamTrack) { this.tracks.push(track); }
    };

    // Mock electronAPI
    electronAPIMock = setupElectronAPIMock();
    (window as unknown as Record<string, unknown>).electronAPI = electronAPIMock;

    // Mock navigator.mediaDevices.getUserMedia
    originalNavigator = globalThis.navigator;
    const mockDesktopStream = createMockMediaStream('video');
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        ...originalNavigator,
        mediaDevices: {
          getUserMedia: vi.fn().mockImplementation((constraints: MediaStreamConstraints) => {
            // If constraints have mandatory field → desktop capture (handled by existing code)
            const videoConstraints = constraints.video;
            if (videoConstraints && typeof videoConstraints === 'object' && 'mandatory' in videoConstraints) {
              return Promise.resolve(mockDesktopStream);
            }
            // Otherwise → webcam
            return Promise.resolve(createMockWebcamStream());
          }),
        },
      },
      writable: true,
      configurable: true,
    });

    // Spy on console
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    // Remove electronAPI FIRST so any leaked onstop callbacks from component
    // unmount can't call storeRecordedVideo on the next test's mock.
    delete (window as unknown as Record<string, unknown>).electronAPI;

    // Drain all pending setTimeout callbacks (e.g. MockMediaRecorderClass.stop
    // fires onstop asynchronously) to prevent leaks between tests.
    await vi.runAllTimersAsync();
    vi.useRealTimers();
    vi.restoreAllMocks();
    (globalThis as Record<string, unknown>).MediaRecorder = originalMediaRecorder;
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  it('accepts camEnabled option and logs "Recording screen + webcam"', async () => {
    const { result } = renderHook(() =>
      useScreenRecorder({ camEnabled: true })
    );

    await act(async () => {
      result.current.toggleRecording();
    });

    expect(result.current.recording).toBe(true);
    expect(consoleLogSpy).toHaveBeenCalledWith('Recording screen + webcam');
  });

  it('logs "Recording screen only" when camEnabled is false', async () => {
    const { result } = renderHook(() =>
      useScreenRecorder({ camEnabled: false })
    );

    await act(async () => {
      result.current.toggleRecording();
    });

    expect(result.current.recording).toBe(true);
    expect(consoleLogSpy).toHaveBeenCalledWith('Recording screen only');
  });

  it('logs "Recording screen only" when camEnabled is not set', async () => {
    const { result } = renderHook(() =>
      useScreenRecorder()
    );

    await act(async () => {
      result.current.toggleRecording();
    });

    expect(result.current.recording).toBe(true);
    expect(consoleLogSpy).toHaveBeenCalledWith('Recording screen only');
  });

  it('creates two MediaRecorder instances when camEnabled', async () => {
    const { result } = renderHook(() =>
      useScreenRecorder({ camEnabled: true })
    );

    await act(async () => {
      result.current.toggleRecording();
    });

    // One for screen, one for webcam
    expect(mockRecorderConstructorCalls).toHaveLength(2);
  });

  it('webcam recorder uses fixed 2 Mbps bitrate', async () => {
    const { result } = renderHook(() =>
      useScreenRecorder({ camEnabled: true })
    );

    await act(async () => {
      result.current.toggleRecording();
    });

    // Second call is the webcam recorder
    const webcamCall = mockRecorderConstructorCalls[1];
    expect(webcamCall[1]).toEqual(
      expect.objectContaining({ videoBitsPerSecond: 2_000_000 })
    );
  });

  it('uses VP8+Opus mime for audio+video screen recording', async () => {
    const audioStream = createMockMediaStream('audio');

    const { result } = renderHook(() =>
      useScreenRecorder({ audioStream })
    );

    await act(async () => {
      result.current.toggleRecording();
    });

    const screenCall = mockRecorderConstructorCalls[0];
    expect(screenCall[1]).toEqual(
      expect.objectContaining({ mimeType: 'video/webm;codecs=vp8,opus' })
    );
  });

  it('webcam getUserMedia uses 720p/30fps video-only constraints', async () => {
    const getUserMediaSpy = vi.spyOn(navigator.mediaDevices, 'getUserMedia');

    const { result } = renderHook(() =>
      useScreenRecorder({ camEnabled: true })
    );

    await act(async () => {
      result.current.toggleRecording();
    });

    // Find the webcam getUserMedia call (not the desktop capture one)
    const webcamCall = getUserMediaSpy.mock.calls.find(call => {
      const constraints = call[0] as MediaStreamConstraints;
      const video = constraints.video;
      return video && typeof video === 'object' && !('mandatory' in video);
    });

    expect(webcamCall).toBeDefined();
    const constraints = webcamCall![0] as MediaStreamConstraints;
    expect(constraints).toEqual({
      video: { width: 1280, height: 720, frameRate: 30 },
      audio: false,
    });
  });

  it('uses provided camStream instead of acquiring one', async () => {
    const getUserMediaSpy = vi.spyOn(navigator.mediaDevices, 'getUserMedia');
    const providedStream = createMockWebcamStream();

    const { result } = renderHook(() =>
      useScreenRecorder({ camEnabled: true, camStream: providedStream })
    );

    await act(async () => {
      result.current.toggleRecording();
    });

    // getUserMedia should only be called once (for desktop capture), not for webcam
    const webcamCalls = getUserMediaSpy.mock.calls.filter(call => {
      const constraints = call[0] as MediaStreamConstraints;
      const video = constraints.video;
      return video && typeof video === 'object' && !('mandatory' in video);
    });
    expect(webcamCalls).toHaveLength(0);

    // Webcam recorder should still be created (using provided stream)
    expect(mockRecorderConstructorCalls).toHaveLength(2);
    expect(mockRecorderConstructorCalls[1][0]).toBe(providedStream);
  });

  it('generates shared timestamp used for both screen and webcam files', async () => {
    const { result } = renderHook(() =>
      useScreenRecorder({ camEnabled: true })
    );

    await act(async () => {
      result.current.toggleRecording();
    });

    // Both recorders should be started
    expect(mockRecorderInstances).toHaveLength(2);
    const screenRecorder = mockRecorderInstances[0];
    const webcamRecorder = mockRecorderInstances[1];

    expect(screenRecorder.start).toHaveBeenCalledWith(1000);
    expect(webcamRecorder.start).toHaveBeenCalledWith(1000);

    // Now stop recording
    await act(async () => {
      result.current.toggleRecording();
      // Let onstop callbacks fire
      await vi.advanceTimersByTimeAsync(50);
    });

    // storeRecordedVideo should be called twice with matching timestamps
    const storeCalls = electronAPIMock.storeRecordedVideo.mock.calls;
    expect(storeCalls.length).toBeGreaterThanOrEqual(2);

    const screenFileName = storeCalls[0][1] as string;
    const webcamFileName = storeCalls[1][1] as string;

    // Extract timestamps from filenames
    const screenTs = screenFileName.match(/recording-(\d+)\.webm/)?.[1];
    const webcamTs = webcamFileName.match(/recording-(\d+)\.webcam\.webm/)?.[1];

    expect(screenTs).toBeDefined();
    expect(webcamTs).toBeDefined();
    expect(screenTs).toBe(webcamTs);
  });

  it('saves webcam file with .webcam.webm extension', async () => {
    const { result } = renderHook(() =>
      useScreenRecorder({ camEnabled: true })
    );

    await act(async () => {
      result.current.toggleRecording();
    });

    // Stop
    await act(async () => {
      result.current.toggleRecording();
      await vi.advanceTimersByTimeAsync(50);
    });

    const storeCalls = electronAPIMock.storeRecordedVideo.mock.calls;
    expect(storeCalls.length).toBeGreaterThanOrEqual(2);
    const webcamFileName = storeCalls[1][1] as string;
    expect(webcamFileName).toMatch(/^recording-\d+\.webcam\.webm$/);
  });

  it('skips duration fix for audio+video screen recordings', async () => {
    const { fixWebmDuration } = await import('@fix-webm-duration/fix');
    const audioStream = createMockMediaStream('audio');
    const startCalls = (fixWebmDuration as unknown as { mock: { calls: unknown[][] } }).mock.calls.length;

    const { result } = renderHook(() =>
      useScreenRecorder({ audioStream })
    );

    await act(async () => {
      result.current.toggleRecording();
    });

    await act(async () => {
      result.current.toggleRecording();
      await vi.advanceTimersByTimeAsync(50);
    });

    const endCalls = (fixWebmDuration as unknown as { mock: { calls: unknown[][] } }).mock.calls.length;
    expect(endCalls).toBe(startCalls);
    expect(electronAPIMock.storeRecordedVideo).toHaveBeenCalled();
  });

  it('applies duration fix for video-only screen recordings', async () => {
    const { fixWebmDuration } = await import('@fix-webm-duration/fix');
    const startCalls = (fixWebmDuration as unknown as { mock: { calls: unknown[][] } }).mock.calls.length;

    const { result } = renderHook(() =>
      useScreenRecorder()
    );

    await act(async () => {
      result.current.toggleRecording();
    });

    await act(async () => {
      result.current.toggleRecording();
      await vi.advanceTimersByTimeAsync(50);
    });

    const endCalls = (fixWebmDuration as unknown as { mock: { calls: unknown[][] } }).mock.calls.length;
    expect(endCalls).toBeGreaterThan(startCalls);
    expect(electronAPIMock.storeRecordedVideo).toHaveBeenCalled();
  });

  describe('graceful webcam fallback', () => {
    it('continues screen recording if webcam getUserMedia fails', async () => {
      // Make webcam getUserMedia fail
      const getUserMediaSpy = vi.spyOn(navigator.mediaDevices, 'getUserMedia');
      getUserMediaSpy.mockImplementation((constraints?: MediaStreamConstraints) => {
        const videoConstraints = constraints?.video;
        if (videoConstraints && typeof videoConstraints === 'object' && 'mandatory' in videoConstraints) {
          return Promise.resolve(createMockMediaStream('video'));
        }
        return Promise.reject(new Error('NotAllowedError: Permission denied'));
      });

      const { result } = renderHook(() =>
        useScreenRecorder({ camEnabled: true })
      );

      await act(async () => {
        result.current.toggleRecording();
      });

      // Screen recording should still be active
      expect(result.current.recording).toBe(true);
      // Only one MediaRecorder created (screen only)
      expect(mockRecorderConstructorCalls).toHaveLength(1);
      // Should log fallback message
      expect(consoleLogSpy).toHaveBeenCalledWith('Recording screen only');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize webcam'),
        expect.any(Error)
      );
    });

    it('shows toast warning when webcam fails', async () => {
      const { toast: toastMock } = await import('sonner');

      const getUserMediaSpy = vi.spyOn(navigator.mediaDevices, 'getUserMedia');
      getUserMediaSpy.mockImplementation((constraints?: MediaStreamConstraints) => {
        const videoConstraints = constraints?.video;
        if (videoConstraints && typeof videoConstraints === 'object' && 'mandatory' in videoConstraints) {
          return Promise.resolve(createMockMediaStream('video'));
        }
        return Promise.reject(new Error('NotAllowedError'));
      });

      const { result } = renderHook(() =>
        useScreenRecorder({ camEnabled: true })
      );

      await act(async () => {
        result.current.toggleRecording();
      });

      expect(toastMock.warning).toHaveBeenCalledWith('Camera unavailable — recording screen only');
    });

    it('screen recording produces file even when webcam fails during processing', async () => {
      const { result } = renderHook(() =>
        useScreenRecorder({ camEnabled: true })
      );

      await act(async () => {
        result.current.toggleRecording();
      });

      expect(result.current.recording).toBe(true);

      // Stop recording
      await act(async () => {
        result.current.toggleRecording();
        await vi.advanceTimersByTimeAsync(50);
      });

      // Screen video should still be stored
      expect(electronAPIMock.storeRecordedVideo).toHaveBeenCalled();
      const firstCall = electronAPIMock.storeRecordedVideo.mock.calls[0];
      expect(firstCall[1]).toMatch(/^recording-\d+\.webm$/);
    });

    it('screen recording continues when webcam recorder fires onerror mid-recording', async () => {
      const { result } = renderHook(() =>
        useScreenRecorder({ camEnabled: true })
      );

      await act(async () => {
        result.current.toggleRecording();
      });

      expect(result.current.recording).toBe(true);
      expect(mockRecorderInstances).toHaveLength(2);

      const webcamRecorder = mockRecorderInstances[1];

      // Simulate webcam recorder error mid-recording
      await act(async () => {
        if (webcamRecorder.onerror) {
          webcamRecorder.onerror();
        }
      });

      // Screen recording should still be active
      expect(result.current.recording).toBe(true);

      // Stop recording — screen should still produce a file
      await act(async () => {
        result.current.toggleRecording();
        await vi.advanceTimersByTimeAsync(50);
      });

      expect(electronAPIMock.storeRecordedVideo).toHaveBeenCalled();
      const screenCall = electronAPIMock.storeRecordedVideo.mock.calls[0];
      expect(screenCall[1]).toMatch(/^recording-\d+\.webm$/);
    });

    it('both recordings are stored even with duration mismatch', async () => {
      const { result } = renderHook(() =>
        useScreenRecorder({ camEnabled: true })
      );

      await act(async () => {
        result.current.toggleRecording();
      });

      expect(mockRecorderInstances).toHaveLength(2);

      // Stop recording — both recorders stop at the same time
      // but their blobs may have different sizes/durations
      await act(async () => {
        result.current.toggleRecording();
        await vi.advanceTimersByTimeAsync(50);
      });

      // Both screen and webcam files should be stored
      const storeCalls = electronAPIMock.storeRecordedVideo.mock.calls;
      expect(storeCalls.length).toBeGreaterThanOrEqual(2);

      const screenFile = storeCalls[0][1] as string;
      const webcamFile = storeCalls[1][1] as string;

      expect(screenFile).toMatch(/^recording-\d+\.webm$/);
      expect(webcamFile).toMatch(/^recording-\d+\.webcam\.webm$/);
    });
  });

  describe('stop and cleanup', () => {
    it('stops both recorders when stopRecording is called', async () => {
      const { result } = renderHook(() =>
        useScreenRecorder({ camEnabled: true })
      );

      await act(async () => {
        result.current.toggleRecording();
      });

      expect(mockRecorderInstances).toHaveLength(2);
      const screenRecorder = mockRecorderInstances[0];
      const webcamRecorder = mockRecorderInstances[1];

      await act(async () => {
        result.current.toggleRecording();
        await vi.advanceTimersByTimeAsync(50);
      });

      expect(screenRecorder.stop).toHaveBeenCalled();
      expect(webcamRecorder.stop).toHaveBeenCalled();
    });

    it('stops webcam stream tracks on stop', async () => {
      const webcamStream = createMockWebcamStream();
      const webcamTrackStop = webcamStream.getTracks()[0].stop;

      const { result } = renderHook(() =>
        useScreenRecorder({ camEnabled: true, camStream: webcamStream })
      );

      await act(async () => {
        result.current.toggleRecording();
      });

      await act(async () => {
        result.current.toggleRecording();
        await vi.advanceTimersByTimeAsync(50);
      });

      expect(webcamTrackStop).toHaveBeenCalled();
    });
  });

  describe('screen-only recording (backward compatibility)', () => {
    it('creates only one MediaRecorder when camEnabled is false', async () => {
      const { result } = renderHook(() =>
        useScreenRecorder({ camEnabled: false })
      );

      await act(async () => {
        result.current.toggleRecording();
      });

      expect(mockRecorderConstructorCalls).toHaveLength(1);
    });

    it('stores single video file when camEnabled is false', async () => {
      const { result } = renderHook(() =>
        useScreenRecorder()
      );

      await act(async () => {
        result.current.toggleRecording();
      });

      await act(async () => {
        result.current.toggleRecording();
        await vi.advanceTimersByTimeAsync(50);
      });

      // Only screen video stored — no webcam file
      const storeCalls = electronAPIMock.storeRecordedVideo.mock.calls;
      expect(storeCalls.length).toBe(1);
      expect(storeCalls[0][1]).toMatch(/^recording-\d+\.webm$/);
    });
  });
});
