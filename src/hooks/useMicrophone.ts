import { useState, useEffect, useCallback, useRef } from 'react';
import type { SampleRate, ChannelCount } from '@/stores/audioSettings';

/**
 * Audio constraints for recording quality
 */
export interface AudioConstraints {
  sampleRate?: SampleRate;
  channelCount?: ChannelCount;
  noiseSuppression?: boolean;
  echoCancellation?: boolean;
  autoGainControl?: boolean;
}

/**
 * Return type for the useMicrophone hook
 */
export interface UseMicrophoneReturn {
  /** List of available audio input devices */
  devices: MediaDeviceInfo[];
  /** Currently selected device ID */
  selectedDeviceId: string | null;
  /** Select a specific device by ID */
  selectDevice: (deviceId: string) => Promise<void>;
  /** Current active audio stream */
  stream: MediaStream | null;
  /** Audio level 0-100, updated at ~60fps */
  audioLevel: number;
  /** Whether microphone is currently enabled */
  isEnabled: boolean;
  /** Enable microphone with default/first device */
  enable: () => Promise<void>;
  /** Disable microphone and stop stream */
  disable: () => void;
  /** Current error, if any */
  error: Error | null;
  /** Current permission state */
  permissionState: 'granted' | 'denied' | 'prompt' | 'unknown';
}

/**
 * Enumerate all audio input devices
 * Filters for audioinput kind only
 */
export async function enumerateAudioInputDevices(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return [];
  }
  
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((device) => device.kind === 'audioinput');
  } catch {
    return [];
  }
}

/**
 * Get an audio stream for a specific device with optional quality constraints
 * @param deviceId - The device ID to get audio from
 * @param constraints - Optional audio quality constraints
 * @returns MediaStream
 */
export async function getAudioStream(
  deviceId: string,
  constraints?: AudioConstraints
): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('getUserMedia not supported');
  }
  
  return navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: { exact: deviceId },
      sampleRate: { ideal: constraints?.sampleRate ?? 48000 },
      channelCount: { ideal: constraints?.channelCount ?? 2 },
      noiseSuppression: { ideal: constraints?.noiseSuppression ?? true },
      echoCancellation: { ideal: constraints?.echoCancellation ?? false },
      autoGainControl: { ideal: constraints?.autoGainControl ?? true },
    },
  });
}

/**
 * Stop all tracks in a stream
 * @param stream - The MediaStream to stop
 */
export function stopStream(stream: MediaStream | null): void {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
}

/**
 * Compute audio level from analyzer data
 * Uses RMS (Root Mean Square) calculation
 * @param dataArray - Uint8Array from AnalyserNode.getByteTimeDomainData
 * @returns Audio level 0-100
 */
export function computeAudioLevel(dataArray: Uint8Array): number {
  let sum = 0;
  
  for (let i = 0; i < dataArray.length; i++) {
    // Normalize to -1 to 1 range (128 is center/silence)
    const normalized = (dataArray[i] - 128) / 128;
    sum += normalized * normalized;
  }
  
  const rms = Math.sqrt(sum / dataArray.length);
  // Scale to 0-100 and clamp
  return Math.min(100, Math.round(rms * 100));
}

/**
 * Check if an error is a permission denied error
 * @param error - The error to check
 * @returns true if permission was denied
 */
export function isPermissionDenied(error: Error): boolean {
  if (error instanceof DOMException) {
    return error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError';
  }
  return error.message.toLowerCase().includes('permission');
}

/**
 * Start monitoring audio levels using requestAnimationFrame
 * @param analyser - The AnalyserNode to read from
 * @param callback - Called with level 0-100 on each frame
 * @returns Cleanup function to stop monitoring
 */
export function startAudioLevelMonitoring(
  analyser: AnalyserNode,
  callback: (level: number) => void
): () => void {
  let rafId: number | null = null;
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  
  const updateLevel = () => {
    analyser.getByteTimeDomainData(dataArray);
    const level = computeAudioLevel(dataArray);
    callback(level);
    rafId = requestAnimationFrame(updateLevel);
  };
  
  rafId = requestAnimationFrame(updateLevel);
  
  return () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
  };
}

/**
 * React hook for microphone management
 * 
 * Features:
 * - Device enumeration with auto-refresh on devicechange
 * - Audio stream management with proper cleanup
 * - Real-time audio level metering at ~60fps
 * - Permission state tracking
 * - Error handling
 * - Audio quality constraints (sample rate, channels, noise suppression, etc.)
 * 
 * @param constraints - Optional audio quality constraints
 */
export function useMicrophone(constraints?: AudioConstraints): UseMicrophoneReturn {
  // State
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [permissionState, setPermissionState] = useState<UseMicrophoneReturn['permissionState']>('unknown');

  // Store constraints in ref to avoid dependency issues
  const constraintsRef = useRef<AudioConstraints | undefined>(constraints);
  useEffect(() => {
    constraintsRef.current = constraints;
  }, [constraints]);

  // Refs for cleanup
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const stopLevelMonitoringRef = useRef<(() => void) | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Keep streamRef in sync with stream state
  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  /**
   * Refresh device list
   */
  const refreshDevices = useCallback(async () => {
    const audioDevices = await enumerateAudioInputDevices();
    setDevices(audioDevices);
  }, []);

  /**
   * Setup audio context and level monitoring
   */
  const setupAudioAnalyser = useCallback((mediaStream: MediaStream) => {
    // Clean up existing context
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }
    if (stopLevelMonitoringRef.current) {
      stopLevelMonitoringRef.current();
    }

    try {
      // Create new audio context
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      // Create analyser node
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;

      // Create source from stream and connect to analyser
      const source = audioContext.createMediaStreamSource(mediaStream);
      source.connect(analyser);
      sourceRef.current = source;

      // Start level monitoring
      stopLevelMonitoringRef.current = startAudioLevelMonitoring(analyser, setAudioLevel);
    } catch (err) {
      console.error('Failed to setup audio analyser:', err);
    }
  }, []);

  /**
   * Clean up audio analyser
   */
  const cleanupAudioAnalyser = useCallback(() => {
    if (stopLevelMonitoringRef.current) {
      stopLevelMonitoringRef.current();
      stopLevelMonitoringRef.current = null;
    }
    
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    
    setAudioLevel(0);
  }, []);

  /**
   * Select and activate a specific device
   */
  const selectDevice = useCallback(async (deviceId: string) => {
    setError(null);
    
    // Stop current stream
    if (stream) {
      stopStream(stream);
      cleanupAudioAnalyser();
    }

    try {
      const newStream = await getAudioStream(deviceId, constraintsRef.current);
      setStream(newStream);
      setSelectedDeviceId(deviceId);
      setIsEnabled(true);
      setPermissionState('granted');
      setupAudioAnalyser(newStream);
    } catch (err) {
      const error = err as Error;
      setError(error);
      setStream(null);
      setIsEnabled(false);
      
      if (isPermissionDenied(error)) {
        setPermissionState('denied');
      }
    }
  }, [stream, cleanupAudioAnalyser, setupAudioAnalyser]);

  /**
   * Enable microphone with default/first device
   */
  const enable = useCallback(async () => {
    if (devices.length === 0) {
      await refreshDevices();
    }
    
    // Use selected device, or first available, or 'default'
    const deviceId = selectedDeviceId || devices[0]?.deviceId || 'default';
    await selectDevice(deviceId);
  }, [devices, selectedDeviceId, refreshDevices, selectDevice]);

  /**
   * Disable microphone
   */
  const disable = useCallback(() => {
    if (stream) {
      stopStream(stream);
    }
    cleanupAudioAnalyser();
    setStream(null);
    setIsEnabled(false);
    // Note: cleanupAudioAnalyser already sets audioLevel to 0
  }, [stream, cleanupAudioAnalyser]);

  /**
   * Effect: Enumerate devices on mount and listen for changes
   */
  useEffect(() => {
    // Initial enumeration
    refreshDevices();

    // Listen for device changes
    const handleDeviceChange = () => {
      refreshDevices();
    };

    if (navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    }

    return () => {
      if (navigator.mediaDevices?.removeEventListener) {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      }
    };
  }, [refreshDevices]);

  /**
   * Effect: Monitor stream health (handle disconnection mid-use)
   */
  useEffect(() => {
    if (!stream) return;

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return;

    // Handle track ended event (microphone disconnected)
    const handleTrackEnded = () => {
      console.warn('Audio track ended - microphone may have been disconnected');
      setError(new Error('Microphone disconnected'));
      setIsEnabled(false);
      setStream(null);
      cleanupAudioAnalyser();
      // Refresh device list to reflect current state
      refreshDevices();
    };

    // Attach ended handler to all audio tracks
    audioTracks.forEach(track => {
      track.addEventListener('ended', handleTrackEnded);
    });

    return () => {
      audioTracks.forEach(track => {
        track.removeEventListener('ended', handleTrackEnded);
      });
    };
  }, [stream, cleanupAudioAnalyser, refreshDevices]);

  /**
   * Effect: Re-apply constraints when they change (restart stream with new constraints)
   * Uses cancellation flag to prevent race conditions with rapid changes
   */
  useEffect(() => {
    // Only re-apply if we're currently enabled and have a selected device
    if (!isEnabled || !selectedDeviceId) return;

    // Cancellation flag to prevent race conditions
    let cancelled = false;

    // Re-create stream with new constraints
    const applyNewConstraints = async () => {
      try {
        // Stop current stream first
        if (streamRef.current) {
          stopStream(streamRef.current);
        }
        cleanupAudioAnalyser();

        // Check if cancelled before expensive async operation
        if (cancelled) return;

        // Get new stream with updated constraints
        const newStream = await getAudioStream(selectedDeviceId, constraints);

        // Check again after async operation - effect may have been cleaned up
        if (cancelled) {
          // Clean up the stream we just created since we're cancelled
          stopStream(newStream);
          return;
        }

        setStream(newStream);
        setupAudioAnalyser(newStream);
      } catch (err) {
        // Only set error if not cancelled
        if (!cancelled) {
          console.error('Failed to apply new audio constraints:', err);
          setError(err as Error);
        }
      }
    };

    applyNewConstraints();

    // Cleanup function - mark as cancelled to prevent stale updates
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    constraints?.sampleRate,
    constraints?.channelCount,
    constraints?.noiseSuppression,
    constraints?.echoCancellation,
    constraints?.autoGainControl,
  ]);

  /**
   * Effect: Cleanup on unmount only
   */
  useEffect(() => {
    return () => {
      // Stop stream using ref (avoids stale closure)
      if (streamRef.current) {
        stopStream(streamRef.current);
      }
      
      // Cleanup audio analyser
      if (stopLevelMonitoringRef.current) {
        stopLevelMonitoringRef.current();
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      if (analyserRef.current) {
        analyserRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []); // Empty deps = unmount only

  return {
    devices,
    selectedDeviceId,
    selectDevice,
    stream,
    audioLevel,
    isEnabled,
    enable,
    disable,
    error,
    permissionState,
  };
}
