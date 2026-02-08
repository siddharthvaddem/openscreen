import { useState, useEffect, useCallback, useRef } from 'react';
import { getResolutionConstraints, type CameraResolution } from '@/stores/cameraSettings';

// ============================================
// Types
// ============================================

export interface CameraConstraints {
  resolution?: CameraResolution;
}

export interface UseCameraReturn {
  devices: MediaDeviceInfo[];
  selectedDeviceId: string | null;
  selectDevice: (deviceId: string) => Promise<void>;
  stream: MediaStream | null;
  isEnabled: boolean;
  enable: () => Promise<void>;
  disable: () => void;
  error: Error | null;
  permissionState: 'granted' | 'denied' | 'prompt' | 'unknown';
}

// ============================================
// Helper Functions
// ============================================

/**
 * Enumerate all video input devices.
 * Filters for videoinput kind only.
 */
export async function enumerateVideoInputDevices(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return [];
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((device) => device.kind === 'videoinput');
  } catch {
    return [];
  }
}

/**
 * Get a video stream for a specific device with resolution constraints.
 */
export async function getVideoStream(
  deviceId: string,
  constraints?: CameraConstraints
): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('getUserMedia not supported');
  }

  const res = getResolutionConstraints(constraints?.resolution ?? '720p');

  return navigator.mediaDevices.getUserMedia({
    video: {
      deviceId: { exact: deviceId },
      width: { ideal: res.width },
      height: { ideal: res.height },
      frameRate: { ideal: 30 },
    },
    audio: false,
  });
}

/**
 * Stop all tracks in a stream.
 */
export function stopVideoStream(stream: MediaStream | null): void {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
}

/**
 * Check if an error is a permission denied error.
 */
export function isPermissionDenied(error: Error): boolean {
  if (error instanceof DOMException) {
    return error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError';
  }
  return error.message.toLowerCase().includes('permission');
}

// ============================================
// Hook
// ============================================

/**
 * React hook for camera management.
 *
 * Features:
 * - Device enumeration with auto-refresh on devicechange
 * - Video stream management with proper cleanup
 * - Permission state tracking
 * - Error handling
 * - Resolution constraints from settings
 */
export function useCamera(constraints?: CameraConstraints): UseCameraReturn {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [permissionState, setPermissionState] = useState<UseCameraReturn['permissionState']>('unknown');

  // Store constraints in ref to avoid dependency issues
  const constraintsRef = useRef<CameraConstraints | undefined>(constraints);
  useEffect(() => {
    constraintsRef.current = constraints;
  }, [constraints]);

  // Ref for cleanup
  const streamRef = useRef<MediaStream | null>(null);

  // Keep streamRef in sync with stream state
  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  /**
   * Refresh device list
   */
  const refreshDevices = useCallback(async () => {
    const videoDevices = await enumerateVideoInputDevices();
    setDevices(videoDevices);
  }, []);

  /**
   * Select and activate a specific device
   */
  const selectDevice = useCallback(async (deviceId: string) => {
    setError(null);

    // Stop current stream
    if (streamRef.current) {
      stopVideoStream(streamRef.current);
    }

    try {
      const newStream = await getVideoStream(deviceId, constraintsRef.current);
      setStream(newStream);
      setSelectedDeviceId(deviceId);
      setIsEnabled(true);
      setPermissionState('granted');
    } catch (err) {
      const caughtError = err as Error;
      setError(caughtError);
      setStream(null);
      setIsEnabled(false);

      if (isPermissionDenied(caughtError)) {
        setPermissionState('denied');
      }
    }
  }, []);

  /**
   * Enable camera with default/first device
   */
  const enable = useCallback(async () => {
    if (devices.length === 0) {
      await refreshDevices();
    }

    const deviceId = selectedDeviceId || devices[0]?.deviceId || 'default';
    await selectDevice(deviceId);
  }, [devices, selectedDeviceId, refreshDevices, selectDevice]);

  /**
   * Disable camera
   */
  const disable = useCallback(() => {
    if (streamRef.current) {
      stopVideoStream(streamRef.current);
    }
    setStream(null);
    setIsEnabled(false);
  }, []);

  /**
   * Effect: Enumerate devices on mount and listen for changes
   */
  useEffect(() => {
    refreshDevices();

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

    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length === 0) return;

    const handleTrackEnded = () => {
      console.warn('Video track ended — camera may have been disconnected');
      setError(new Error('Camera disconnected'));
      setIsEnabled(false);
      setStream(null);
      refreshDevices();
    };

    videoTracks.forEach((track) => {
      track.addEventListener('ended', handleTrackEnded);
    });

    return () => {
      videoTracks.forEach((track) => {
        track.removeEventListener('ended', handleTrackEnded);
      });
    };
  }, [stream, refreshDevices]);

  /**
   * Effect: Re-apply constraints when resolution changes (restart stream)
   */
  useEffect(() => {
    if (!isEnabled || !selectedDeviceId) return;

    let cancelled = false;

    const applyNewConstraints = async () => {
      try {
        if (streamRef.current) {
          stopVideoStream(streamRef.current);
        }

        if (cancelled) return;

        const newStream = await getVideoStream(selectedDeviceId, constraints);

        if (cancelled) {
          stopVideoStream(newStream);
          return;
        }

        setStream(newStream);
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to apply new camera constraints:', err);
          setError(err as Error);
        }
      }
    };

    applyNewConstraints();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [constraints?.resolution]);

  /**
   * Effect: Cleanup on unmount only
   */
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        stopVideoStream(streamRef.current);
      }
    };
  }, []);

  return {
    devices,
    selectedDeviceId,
    selectDevice,
    stream,
    isEnabled,
    enable,
    disable,
    error,
    permissionState,
  };
}
