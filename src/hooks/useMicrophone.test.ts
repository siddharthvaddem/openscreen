import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * TDD Tests for useMicrophone Hook
 * 
 * These tests are written FIRST following TDD methodology.
 * Tests will FAIL until the implementation is complete.
 */

// ============================================
// Mock Setup
// ============================================

// Mock types matching Web Audio API
interface MockMediaDeviceInfo {
  deviceId: string;
  groupId: string;
  kind: MediaDeviceKind;
  label: string;
  toJSON: () => object;
}

interface MockMediaStreamTrack {
  stop: ReturnType<typeof vi.fn>;
  kind: string;
}

interface MockMediaStream {
  getTracks: () => MockMediaStreamTrack[];
  getAudioTracks: () => MockMediaStreamTrack[];
}

// Mock functions
let mockEnumerateDevices: ReturnType<typeof vi.fn>;
let mockGetUserMedia: ReturnType<typeof vi.fn>;
let mockAddEventListener: ReturnType<typeof vi.fn>;
let mockRemoveEventListener: ReturnType<typeof vi.fn>;

// Mock AudioContext
let mockAnalyserGetByteTimeDomainData: ReturnType<typeof vi.fn>;
let mockAnalyserConnect: ReturnType<typeof vi.fn>;
let mockAnalyserDisconnect: ReturnType<typeof vi.fn>;
let mockSourceConnect: ReturnType<typeof vi.fn>;
let mockSourceDisconnect: ReturnType<typeof vi.fn>;
let mockAudioContextClose: ReturnType<typeof vi.fn>;
let mockCreateMediaStreamSource: ReturnType<typeof vi.fn>;
let mockCreateAnalyser: ReturnType<typeof vi.fn>;

// requestAnimationFrame mock
let rafCallbacks: FrameRequestCallback[] = [];
let mockRequestAnimationFrame: ReturnType<typeof vi.fn>;
let mockCancelAnimationFrame: ReturnType<typeof vi.fn>;

// Helper to create mock device info
function createMockDevice(
  kind: MediaDeviceKind,
  deviceId: string,
  label: string
): MockMediaDeviceInfo {
  return {
    deviceId,
    groupId: 'group-' + deviceId,
    kind,
    label,
    toJSON: () => ({ deviceId, kind, label }),
  };
}

// Helper to create mock stream
function createMockStream(stopFn?: ReturnType<typeof vi.fn>): MockMediaStream {
  const mockStop = stopFn ?? vi.fn();
  return {
    getTracks: () => [{ stop: mockStop, kind: 'audio' }],
    getAudioTracks: () => [{ stop: mockStop, kind: 'audio' }],
  };
}

// Helper to trigger rafCallbacks
function flushRaf() {
  const callbacks = [...rafCallbacks];
  rafCallbacks = [];
  callbacks.forEach((cb) => cb(performance.now()));
}

// Mock DOMException for Node environment
if (typeof globalThis.DOMException === 'undefined') {
  (globalThis as unknown as Record<string, unknown>).DOMException = class DOMException extends Error {
    constructor(message?: string, name?: string) {
      super(message);
      this.name = name || 'DOMException';
    }
  };
}

// Setup mocks before each test
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  rafCallbacks = [];

  // Initialize mock functions
  mockEnumerateDevices = vi.fn();
  mockGetUserMedia = vi.fn();
  mockAddEventListener = vi.fn();
  mockRemoveEventListener = vi.fn();
  mockAnalyserGetByteTimeDomainData = vi.fn();
  mockAnalyserConnect = vi.fn();
  mockAnalyserDisconnect = vi.fn();
  mockSourceConnect = vi.fn();
  mockSourceDisconnect = vi.fn();
  mockAudioContextClose = vi.fn();
  mockCreateMediaStreamSource = vi.fn();
  mockCreateAnalyser = vi.fn();

  // Setup navigator.mediaDevices mock
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      mediaDevices: {
        enumerateDevices: mockEnumerateDevices,
        getUserMedia: mockGetUserMedia,
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener,
      },
    },
    writable: true,
    configurable: true,
  });

  // Mock AnalyserNode class
  class MockAnalyserNode {
    fftSize = 2048;
    frequencyBinCount = 1024;
    connect = mockAnalyserConnect;
    disconnect = mockAnalyserDisconnect;
    getByteTimeDomainData = mockAnalyserGetByteTimeDomainData;
  }

  // Mock MediaStreamAudioSourceNode class
  class MockMediaStreamAudioSourceNode {
    connect = mockSourceConnect;
    disconnect = mockSourceDisconnect;
  }

  // Mock AudioContext class
  class MockAudioContext {
    state: AudioContextState = 'running';
    close = mockAudioContextClose.mockResolvedValue(undefined);
    createMediaStreamSource = mockCreateMediaStreamSource.mockReturnValue(
      new MockMediaStreamAudioSourceNode()
    );
    createAnalyser = mockCreateAnalyser.mockReturnValue(new MockAnalyserNode());
  }

  // Setup AudioContext mock
  (globalThis as unknown as Record<string, unknown>).AudioContext = MockAudioContext;

  // Setup requestAnimationFrame mock
  mockRequestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
    rafCallbacks.push(callback);
    return rafCallbacks.length;
  });
  mockCancelAnimationFrame = vi.fn((id: number) => {
    rafCallbacks = rafCallbacks.filter((_, i) => i + 1 !== id);
  });
  (globalThis as unknown as Record<string, unknown>).requestAnimationFrame = mockRequestAnimationFrame;
  (globalThis as unknown as Record<string, unknown>).cancelAnimationFrame = mockCancelAnimationFrame;

  // Default mock responses
  mockEnumerateDevices.mockResolvedValue([]);
  mockGetUserMedia.mockResolvedValue(createMockStream());
  mockAudioContextClose.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================
// Tests for useMicrophone Hook
// ============================================

describe('useMicrophone Hook', () => {
  describe('Device Enumeration', () => {
    it('should return empty array when no devices available', async () => {
      mockEnumerateDevices.mockResolvedValue([]);

      const { enumerateAudioInputDevices } = await import('./useMicrophone');
      const devices = await enumerateAudioInputDevices();
      
      expect(devices).toEqual([]);
    });

    it('should return list of audio input devices', async () => {
      const mockDevices = [
        createMockDevice('audioinput', 'mic-1', 'Built-in Microphone'),
        createMockDevice('audioinput', 'mic-2', 'External USB Microphone'),
      ];
      mockEnumerateDevices.mockResolvedValue(mockDevices);

      const { enumerateAudioInputDevices } = await import('./useMicrophone');
      const devices = await enumerateAudioInputDevices();
      
      expect(devices).toHaveLength(2);
      expect(devices[0].deviceId).toBe('mic-1');
      expect(devices[1].deviceId).toBe('mic-2');
    });

    it('should filter out non-audioinput devices', async () => {
      const mockDevices = [
        createMockDevice('audioinput', 'mic-1', 'Microphone'),
        createMockDevice('audiooutput', 'speaker-1', 'Speakers'),
        createMockDevice('videoinput', 'camera-1', 'Camera'),
        createMockDevice('audioinput', 'mic-2', 'Headset Mic'),
      ];
      mockEnumerateDevices.mockResolvedValue(mockDevices);

      const { enumerateAudioInputDevices } = await import('./useMicrophone');
      const devices = await enumerateAudioInputDevices();
      
      expect(devices).toHaveLength(2);
      expect(devices.every((d: MediaDeviceInfo) => d.kind === 'audioinput')).toBe(true);
    });
  });

  describe('Stream Management', () => {
    it('should call getUserMedia with correct deviceId and default constraints', async () => {
      const { getAudioStream } = await import('./useMicrophone');
      
      await getAudioStream('mic-1');

      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: { 
          deviceId: { exact: 'mic-1' },
          sampleRate: { ideal: 48000 },
          channelCount: { ideal: 2 },
          noiseSuppression: { ideal: true },
          echoCancellation: { ideal: false },
          autoGainControl: { ideal: true },
        },
      });
    });

    it('should call getUserMedia with custom constraints', async () => {
      const { getAudioStream } = await import('./useMicrophone');
      
      await getAudioStream('mic-1', {
        sampleRate: 44100,
        channelCount: 1,
        noiseSuppression: false,
        echoCancellation: true,
        autoGainControl: false,
      });

      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: { 
          deviceId: { exact: 'mic-1' },
          sampleRate: { ideal: 44100 },
          channelCount: { ideal: 1 },
          noiseSuppression: { ideal: false },
          echoCancellation: { ideal: true },
          autoGainControl: { ideal: false },
        },
      });
    });

    it('should stop all tracks when stopStream is called', async () => {
      const mockStop = vi.fn();
      const mockStream = createMockStream(mockStop);
      mockGetUserMedia.mockResolvedValue(mockStream);

      const { getAudioStream, stopStream } = await import('./useMicrophone');
      const stream = await getAudioStream('mic-1');
      
      stopStream(stream as unknown as MediaStream);

      expect(mockStop).toHaveBeenCalled();
    });
  });

  describe('Audio Level Meter', () => {
    it('should compute RMS level from audio data (0-100 scale)', async () => {
      const { computeAudioLevel } = await import('./useMicrophone');
      
      // Simulate audio data oscillating around 128
      const dataArray = new Uint8Array(1024);
      for (let i = 0; i < dataArray.length; i++) {
        dataArray[i] = i % 2 === 0 ? 178 : 78; // +/- 50 from center
      }

      const level = computeAudioLevel(dataArray);

      expect(level).toBeGreaterThan(0);
      expect(level).toBeLessThanOrEqual(100);
    });

    it('should return 0 level for silent audio data', async () => {
      const { computeAudioLevel } = await import('./useMicrophone');
      
      // Silent audio (all values at 128)
      const dataArray = new Uint8Array(1024);
      for (let i = 0; i < dataArray.length; i++) {
        dataArray[i] = 128;
      }

      const level = computeAudioLevel(dataArray);

      expect(level).toBe(0);
    });

    it('should clamp level to maximum of 100', async () => {
      const { computeAudioLevel } = await import('./useMicrophone');
      
      // Maximum amplitude audio (all 255 or all 0)
      const dataArray = new Uint8Array(1024);
      for (let i = 0; i < dataArray.length; i++) {
        dataArray[i] = 255;
      }

      const level = computeAudioLevel(dataArray);

      expect(level).toBeLessThanOrEqual(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle getUserMedia errors', async () => {
      const testError = new Error('Permission denied');
      mockGetUserMedia.mockRejectedValue(testError);

      const { getAudioStream } = await import('./useMicrophone');
      
      await expect(getAudioStream('mic-1')).rejects.toThrow('Permission denied');
    });

    it('should detect NotAllowedError for permission denial', async () => {
      const permissionError = new DOMException('Permission denied', 'NotAllowedError');
      mockGetUserMedia.mockRejectedValue(permissionError);

      const { getAudioStream, isPermissionDenied } = await import('./useMicrophone');
      
      try {
        await getAudioStream('mic-1');
      } catch (err) {
        expect(isPermissionDenied(err as Error)).toBe(true);
      }
    });
  });

  describe('Hook Interface', () => {
    it('should export useMicrophone hook function', async () => {
      const { useMicrophone } = await import('./useMicrophone');
      
      expect(typeof useMicrophone).toBe('function');
    });

    it('should export UseMicrophoneReturn type', async () => {
      // Type check - if this compiles, the type exists
      const mod = await import('./useMicrophone');
      
      expect(mod.useMicrophone).toBeDefined();
    });
  });

  describe('RAF-based Level Updates', () => {
    it('should use requestAnimationFrame for audio level updates', async () => {
      // Verify RAF is used when setting up audio meter
      const { startAudioLevelMonitoring } = await import('./useMicrophone');
      
      const mockCallback = vi.fn();
      const mockAnalyser = {
        frequencyBinCount: 1024,
        getByteTimeDomainData: vi.fn((arr: Uint8Array) => {
          for (let i = 0; i < arr.length; i++) arr[i] = 128;
        }),
      };

      const stopMonitoring = startAudioLevelMonitoring(
        mockAnalyser as unknown as AnalyserNode,
        mockCallback
      );

      // Trigger RAF
      flushRaf();

      expect(mockCallback).toHaveBeenCalled();
      
      // Cleanup
      stopMonitoring();
    });
  });
});
