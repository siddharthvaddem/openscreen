import { useState, useRef, useEffect } from "react";
import { fixWebmDuration } from "@fix-webm-duration/fix";

type UseScreenRecorderOptions = {
  audioStream?: MediaStream | null;
  autoZoomEnabled?: boolean;
  keysEnabled?: boolean;
};

type UseScreenRecorderReturn = {
  recording: boolean;
  toggleRecording: () => void;
};

export function useScreenRecorder(options?: UseScreenRecorderOptions): UseScreenRecorderReturn {
  const [recording, setRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const videoStream = useRef<MediaStream | null>(null); // Store original video stream for cleanup
  const chunks = useRef<Blob[]>([]);
  const startTime = useRef<number>(0);

  // Target visually lossless 4K @ 60fps; fall back gracefully when hardware cannot keep up
  const TARGET_FRAME_RATE = 60;
  const TARGET_WIDTH = 3840;
  const TARGET_HEIGHT = 2160;
  const FOUR_K_PIXELS = TARGET_WIDTH * TARGET_HEIGHT;

  type DesktopCaptureMandatoryConstraints = {
    chromeMediaSource: 'desktop';
    chromeMediaSourceId: string;
    maxWidth: number;
    maxHeight: number;
    maxFrameRate: number;
    minFrameRate: number;
  };

  type DesktopCaptureConstraints = Omit<MediaStreamConstraints, 'video'> & {
    video: MediaTrackConstraints & { mandatory: DesktopCaptureMandatoryConstraints };
  };

  const getDesktopMediaStream = (constraints: DesktopCaptureConstraints): Promise<MediaStream> => {
    const mediaDevices = navigator.mediaDevices as MediaDevices & {
      getUserMedia: (constraints: DesktopCaptureConstraints) => Promise<MediaStream>;
    };
    return mediaDevices.getUserMedia(constraints);
  };

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
      // Only stop video tracks (we created them), not audio tracks (they're managed externally)
      if (videoStream.current) {
        videoStream.current.getTracks().forEach(track => track.stop());
        videoStream.current = null;
      }
      mediaRecorder.current.stop();
      setRecording(false);

      window.electronAPI?.setRecordingState(false);
    }
  });

  // Stable ref for startRecording so shortcut listener always has latest
  const startRecordingRef = useRef<() => void>(() => {});

  useEffect(() => {
    let cleanupStop: (() => void) | undefined;
    let cleanupStart: (() => void) | undefined;
    
    if (window.electronAPI?.onStopRecordingFromTray) {
      cleanupStop = window.electronAPI.onStopRecordingFromTray(() => {
        stopRecording.current();
      });
    }

    if (window.electronAPI?.onStartRecordingFromShortcut) {
      cleanupStart = window.electronAPI.onStartRecordingFromShortcut(() => {
        startRecordingRef.current();
      });
    }

    return () => {
      cleanupStop?.();
      cleanupStart?.();
      
      if (mediaRecorder.current?.state === "recording") {
        mediaRecorder.current.stop();
      }
      // Only stop video tracks (we created them), not audio tracks (they're managed externally)
      if (videoStream.current) {
        videoStream.current.getTracks().forEach(track => track.stop());
        videoStream.current = null;
      }
      stream.current = null;
    };
  }, []);

  const startRecording = async () => {
    if (recording || mediaRecorder.current?.state === "recording") return;
    try {
      const selectedSource = await window.electronAPI.getSelectedSource();
      if (!selectedSource) {
        alert("Please select a source to record");
        return;
      }

      const mediaStream = await getDesktopMediaStream({
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
      
      // Store original video stream for cleanup (we only stop these tracks, not external audio)
      videoStream.current = mediaStream;
      
      if (!videoStream.current) {
        throw new Error("Media stream is not available.");
      }
      const videoTrack = videoStream.current.getVideoTracks()[0];
      try {
        await videoTrack.applyConstraints({
          frameRate: { ideal: TARGET_FRAME_RATE, max: TARGET_FRAME_RATE },
          width: { ideal: TARGET_WIDTH, max: TARGET_WIDTH },
          height: { ideal: TARGET_HEIGHT, max: TARGET_HEIGHT },
        });
      } catch (error) {
        console.warn("Unable to lock 4K/60fps constraints, using best available track settings.", error);
      }

      let { width = 1920, height = 1080 } = videoTrack.getSettings();
      const { frameRate = TARGET_FRAME_RATE } = videoTrack.getSettings();
      
      // Ensure dimensions are divisible by 2 for VP9/AV1 codec compatibility
      width = Math.floor(width / 2) * 2;
      height = Math.floor(height / 2) * 2;
      
      const videoBitsPerSecond = computeBitrate(width, height);
      const mimeType = selectMimeType();

      // Combine video and audio streams
      const combinedStream = new MediaStream();
      
      // Add video track from screen capture
      combinedStream.addTrack(videoTrack);
      
      // Add audio tracks from microphone (if available and active)
      const audioStream = options?.audioStream;
      if (audioStream) {
        audioStream.getAudioTracks().forEach(track => {
          // Only add tracks that are currently live
          if (track.readyState === 'live') {
            combinedStream.addTrack(track);
          }
        });
      }
      
      // Use combined stream for recording
      stream.current = combinedStream;

      const hasAudio = combinedStream.getAudioTracks().length > 0;
      console.log(
        `Recording at ${width}x${height} @ ${frameRate ?? TARGET_FRAME_RATE}fps using ${mimeType} / ${Math.round(
          videoBitsPerSecond / 1_000_000
        )} Mbps${hasAudio ? ' with audio' : ' (video only)'}`,
      );
      
      chunks.current = [];
      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond,
      });
      mediaRecorder.current = recorder;
      recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) chunks.current.push(e.data);
      };

      // Start auto zoom detection if enabled
      if (options?.autoZoomEnabled && window.electronAPI?.autoZoom) {
        const recordingId = `recording-${Date.now()}`;
        try {
          await window.electronAPI.autoZoom.startDetection(recordingId, { width, height });
          console.log('Auto zoom detection started');
        } catch (autoZoomError) {
          console.warn('Failed to start auto zoom detection:', autoZoomError);
          // Continue recording without auto zoom
        }
      }

      // Start keystroke capture if Keys toggle is enabled
      if (options?.keysEnabled && window.electronAPI?.keystrokeEditor) {
        try {
          const settingsResult = await window.electronAPI.keystrokeEditor.getSettings();
          if (settingsResult.success && settingsResult.settings?.captureEnabled) {
            const recordingId = `recording-${Date.now()}`;
            const captureResult = await window.electronAPI.keystrokeEditor.startCapture(recordingId);
            if (captureResult.success) {
              console.log('Keystroke capture started');
            } else {
              console.warn('Failed to start keystroke capture:', captureResult.error);
            }
          }
        } catch (keystrokeError) {
          console.warn('Failed to start keystroke capture:', keystrokeError);
          // Continue recording without keystroke capture
        }
      }

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
        const eventsFileName = `recording-${timestamp}.events.json`;

        try {
          const videoBlob = await fixWebmDuration(buggyBlob, duration);
          const arrayBuffer = await videoBlob.arrayBuffer();
          const videoResult = await window.electronAPI.storeRecordedVideo(arrayBuffer, videoFileName);
          if (!videoResult.success) {
            console.error('Failed to store video:', videoResult.message);
            return;
          }

          // Stop auto zoom detection and save events if enabled
          if (options?.autoZoomEnabled && window.electronAPI?.autoZoom) {
            try {
              const stopResult = await window.electronAPI.autoZoom.stopDetection();
              if (stopResult.success && stopResult.data) {
                await window.electronAPI.autoZoom.saveEvents(stopResult.data, eventsFileName);
                console.log('Auto zoom events saved:', eventsFileName);
              }
            } catch (autoZoomError) {
              console.warn('Failed to save auto zoom events:', autoZoomError);
              // Continue without auto zoom data - video is still saved
            }
          }

          // Stop keystroke capture and save events if enabled
          if (options?.keysEnabled && window.electronAPI?.keystrokeEditor) {
            try {
              const stopResult = await window.electronAPI.keystrokeEditor.stopCapture();
              if (stopResult.success && stopResult.data) {
                const keystrokeFileName = `recording-${timestamp}.keystroke.json`;
                await window.electronAPI.keystrokeEditor.saveEvents(stopResult.data, keystrokeFileName);
                console.log('Keystroke events saved:', keystrokeFileName);
              }
            } catch (keystrokeError) {
              console.warn('Failed to save keystroke events:', keystrokeError);
              // Continue without keystroke data - video is still saved
            }
          }

          if (videoResult.path) {
            await window.electronAPI.setCurrentVideoPath(videoResult.path);
          }

          await window.electronAPI.switchToEditor();
        } catch (error) {
          console.error('Error saving recording:', error);
        }
      };
      recorder.onerror = () => setRecording(false);
      recorder.start(1000);
      startTime.current = Date.now();
      setRecording(true);
      window.electronAPI?.setRecordingState(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      setRecording(false);
      // Only stop video tracks (we created them), not audio tracks (they're managed externally)
      if (videoStream.current) {
        videoStream.current.getTracks().forEach(track => track.stop());
        videoStream.current = null;
      }
      stream.current = null;
    }
  };

  // Keep startRecordingRef in sync
  useEffect(() => {
    startRecordingRef.current = startRecording;
  });

  const toggleRecording = () => {
    recording ? stopRecording.current() : startRecording();
  };

  return { recording, toggleRecording };
}
