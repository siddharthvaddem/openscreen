import { useState, useRef, useEffect } from "react";
import { DEFAULT_CURSOR_STYLE, type CursorEvent, type CursorTrack } from "@/components/video-editor/types";
import { fixWebmDuration } from "@fix-webm-duration/fix";

type UseScreenRecorderReturn = {
  recording: boolean;
  toggleRecording: () => void;
};

export function useScreenRecorder(): UseScreenRecorderReturn {
  const [recording, setRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startTime = useRef<number>(0);
  const cursorTrackRef = useRef<CursorTrack | null>(null);
  const cursorCaptureStopRef = useRef<(() => void) | null>(null);

  // Target visually lossless 4K @ 60fps; fall back gracefully when hardware cannot keep up
  const TARGET_FRAME_RATE = 60;
  const TARGET_WIDTH = 3840;
  const TARGET_HEIGHT = 2160;
  const FOUR_K_PIXELS = TARGET_WIDTH * TARGET_HEIGHT;
  const selectMimeType = () => {
    const preferred = [
      "video/webm;codecs=av1",
      "video/webm;codecs=h264",
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm"
    ];

    return preferred.find(type => MediaRecorder.isTypeSupported(type)) ?? "video/webm";
  };

  const computeBitrate = (width: number, height: number) => {
    const pixels = width * height;
    const highFrameRateBoost = TARGET_FRAME_RATE >= 60 ? 1.7 : 1;

    if (pixels >= FOUR_K_PIXELS) {
      return Math.round(45_000_000 * highFrameRateBoost);
    }

    if (pixels >= 2560 * 1440) {
      return Math.round(28_000_000 * highFrameRateBoost);
    }

    return Math.round(18_000_000 * highFrameRateBoost);
  };

  const stopRecording = useRef(() => {
    if (mediaRecorder.current?.state === "recording") {
      if (cursorCaptureStopRef.current) {
        cursorCaptureStopRef.current();
        cursorCaptureStopRef.current = null;
      }
      if (stream.current) {
        stream.current.getTracks().forEach(track => track.stop());
      }
      mediaRecorder.current.stop();
      setRecording(false);

      window.electronAPI?.setRecordingState(false);
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
      
      if (mediaRecorder.current?.state === "recording") {
        mediaRecorder.current.stop();
      }
      if (cursorCaptureStopRef.current) {
        cursorCaptureStopRef.current();
        cursorCaptureStopRef.current = null;
      }
      if (stream.current) {
        stream.current.getTracks().forEach(track => track.stop());
        stream.current = null;
      }
    };
  }, []);

  const startCursorCapture = (
    t0: number, 
    sourceBounds: { x: number; y: number; width: number; height: number },
    videoSize: { width: number; height: number }
  ) => {
    const events: CursorEvent[] = [];
    cursorTrackRef.current = { events, style: DEFAULT_CURSOR_STYLE };

    let dragging = false;
    let rafId: number | null = null;
    let pendingMove: CursorEvent | null = null;
    let currentBounds = sourceBounds;
    let currentVideoSize = videoSize;
    let globalMouseCleanup: (() => void) | null = null;

    const normalize = (screenX: number, screenY: number) => {
      // Calculate local coordinates relative to the source window bounds
      const localX = screenX - currentBounds.x;
      const localY = screenY - currentBounds.y;
      
      // Calculate scale factors between source bounds and video size
      // This handles cases where the video resolution differs from the source bounds
      const scaleX = currentVideoSize.width / currentBounds.width;
      const scaleY = currentVideoSize.height / currentBounds.height;
      
      // Scale the local coordinates to match video dimensions
      const videoX = localX * scaleX;
      const videoY = localY * scaleY;
      
      // Normalize to [0, 1] range based on video size
      const width = Math.max(1, currentVideoSize.width);
      const height = Math.max(1, currentVideoSize.height);
      const nx = Math.min(1, Math.max(0, videoX / width));
      const ny = Math.min(1, Math.max(0, videoY / height));
      
      return { nx, ny };
    };

    const pushMove = () => {
      if (!pendingMove) return;
      events.push(pendingMove);
      pendingMove = null;
      rafId = null;
    };

    // Handle global mouse move events from main process
    const handleGlobalMouseMove = (event: { screenX: number; screenY: number; timestamp: number }) => {
      const { nx, ny } = normalize(event.screenX, event.screenY);
      // Use performance.now() relative to t0 for consistent timing
      pendingMove = {
        tMs: performance.now() - t0,
        nx,
        ny,
        kind: 'move',
        dragging,
      };

      if (rafId == null) {
        rafId = window.requestAnimationFrame(pushMove);
      }
    };

    // Handle mouse button events (these still need to be captured from window events)
    // But we'll use global coordinates when available
    const handleDown = (event: MouseEvent) => {
      const { nx, ny } = normalize(event.screenX, event.screenY);
      if (pendingMove) {
        events.push(pendingMove);
        pendingMove = null;
        if (rafId != null) {
          window.cancelAnimationFrame(rafId);
          rafId = null;
        }
      }
      dragging = true;
      events.push({
        tMs: performance.now() - t0,
        nx,
        ny,
        kind: 'down',
        dragging,
        button: event.button,
      });
    };

    const handleUp = (event: MouseEvent) => {
      const { nx, ny } = normalize(event.screenX, event.screenY);
      if (pendingMove) {
        events.push(pendingMove);
        pendingMove = null;
        if (rafId != null) {
          window.cancelAnimationFrame(rafId);
          rafId = null;
        }
      }
      dragging = false;
      events.push({
        tMs: performance.now() - t0,
        nx,
        ny,
        kind: 'up',
        dragging,
        button: event.button,
      });
    };

    // Listen to global mouse move events from main process
    if (window.electronAPI?.onGlobalMouseMove) {
      globalMouseCleanup = window.electronAPI.onGlobalMouseMove(handleGlobalMouseMove);
    }

    // Still listen to button events from window (for now)
    // In the future, we might want to add global button tracking in main process
    window.addEventListener('mousedown', handleDown, { capture: true });
    window.addEventListener('mouseup', handleUp, { capture: true });

    // Periodically update bounds in case the window moves or resizes
    const boundsUpdateInterval = setInterval(async () => {
      try {
        const boundsResult = await window.electronAPI?.getSourceBounds();
        if (boundsResult?.success && boundsResult.bounds) {
          currentBounds = boundsResult.bounds;
        }
        // Also update video size if stream is still active
        if (stream.current) {
          const videoTrack = stream.current.getVideoTracks()[0];
          if (videoTrack) {
            const settings = videoTrack.getSettings();
            if (settings.width && settings.height) {
              currentVideoSize = {
                width: Math.floor(settings.width / 2) * 2, // Ensure even dimensions
                height: Math.floor(settings.height / 2) * 2
              };
            }
          }
        }
      } catch (error) {
        console.warn('Failed to update source bounds:', error);
      }
    }, 500);

    cursorCaptureStopRef.current = () => {
      clearInterval(boundsUpdateInterval);
      if (globalMouseCleanup) {
        globalMouseCleanup();
        globalMouseCleanup = null;
      }
      window.removeEventListener('mousedown', handleDown, true);
      window.removeEventListener('mouseup', handleUp, true);
      if (rafId != null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (pendingMove) {
        events.push(pendingMove);
        pendingMove = null;
      }
    };
  };

  const startRecording = async () => {
    try {
      const selectedSource = await window.electronAPI.getSelectedSource();
      if (!selectedSource) {
        alert("Please select a source to record");
        return;
      }

      const mediaStream = await (navigator.mediaDevices as any).getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: selectedSource.id,
            maxWidth: TARGET_WIDTH,
            maxHeight: TARGET_HEIGHT,
            maxFrameRate: TARGET_FRAME_RATE,
            minFrameRate: 30,
          },
        },
      });
      stream.current = mediaStream;
      if (!stream.current) {
        throw new Error("Media stream is not available.");
      }
      const videoTrack = stream.current.getVideoTracks()[0];
      try {
        await videoTrack.applyConstraints({
          frameRate: { ideal: TARGET_FRAME_RATE, max: TARGET_FRAME_RATE },
          width: { ideal: TARGET_WIDTH, max: TARGET_WIDTH },
          height: { ideal: TARGET_HEIGHT, max: TARGET_HEIGHT },
        });
      } catch (error) {
        console.warn("Unable to lock 4K/60fps constraints, using best available track settings.", error);
      }

      let { width = 1920, height = 1080, frameRate = TARGET_FRAME_RATE } = videoTrack.getSettings();
      
      // Ensure dimensions are divisible by 2 for VP9/AV1 codec compatibility
      width = Math.floor(width / 2) * 2;
      height = Math.floor(height / 2) * 2;
      
      const videoBitsPerSecond = computeBitrate(width, height);
      const mimeType = selectMimeType();

      console.log(
        `Recording at ${width}x${height} @ ${frameRate ?? TARGET_FRAME_RATE}fps using ${mimeType} / ${Math.round(
          videoBitsPerSecond / 1_000_000
        )} Mbps`
      );
      
      chunks.current = [];
      const recorder = new MediaRecorder(stream.current, {
        mimeType,
        videoBitsPerSecond,
      });
      mediaRecorder.current = recorder;
      recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) chunks.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.current = null;
        if (chunks.current.length === 0) return;
        const duration = Date.now() - startTime.current;
        const recordedChunks = chunks.current;
        const buggyBlob = new Blob(recordedChunks, { type: mimeType });
        // Clear chunks early to free memory immediately after blob creation
        chunks.current = [];
        const timestamp = Date.now();
        const videoFileName = `recording-${timestamp}.webm`;

        try {
          const videoBlob = await fixWebmDuration(buggyBlob, duration);
          const arrayBuffer = await videoBlob.arrayBuffer();
          const videoResult = await window.electronAPI.storeRecordedVideo(arrayBuffer, videoFileName);
          if (!videoResult.success) {
            console.error('Failed to store video:', videoResult.message);
            return;
          }

          if (videoResult.path) {
            await window.electronAPI.setCurrentVideoPath(videoResult.path);
            const cursorTrack = cursorTrackRef.current;
            if (cursorTrack && cursorTrack.events.length > 0) {
              await window.electronAPI.storeCursorData(videoResult.path, cursorTrack);
            }
          }

          await window.electronAPI.switchToEditor();
        } catch (error) {
          console.error('Error saving recording:', error);
        }
      };
      recorder.onerror = () => setRecording(false);
      
      // Get source bounds and video size before starting cursor capture
      let sourceBounds: { x: number; y: number; width: number; height: number };
      try {
        const boundsResult = await window.electronAPI?.getSourceBounds();
        if (boundsResult?.success && boundsResult.bounds) {
          sourceBounds = boundsResult.bounds;
        } else {
          // Fallback to window dimensions if bounds cannot be retrieved
          console.warn('Failed to get source bounds, using window dimensions as fallback');
          sourceBounds = {
            x: 0,
            y: 0,
            width: window.innerWidth,
            height: window.innerHeight,
          };
        }
      } catch (error) {
        console.error('Error getting source bounds:', error);
        // Fallback to window dimensions
        sourceBounds = {
          x: 0,
          y: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        };
      }
      
      // Get actual video dimensions (already computed above)
      const videoSize = {
        width: Math.floor(width / 2) * 2, // Ensure even dimensions
        height: Math.floor(height / 2) * 2
      };
      
      console.log('Source bounds:', sourceBounds);
      console.log('Video size:', videoSize);
      
      const cursorStart = performance.now();
      recorder.start(1000);
      startCursorCapture(cursorStart, sourceBounds, videoSize);
      startTime.current = Date.now();
      setRecording(true);
      window.electronAPI?.setRecordingState(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      setRecording(false);
      if (stream.current) {
        stream.current.getTracks().forEach(track => track.stop());
        stream.current = null;
      }
    }
  };

  const toggleRecording = () => {
    recording ? stopRecording.current() : startRecording();
  };

  return { recording, toggleRecording };
}
