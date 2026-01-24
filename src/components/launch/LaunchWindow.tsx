import { useState, useEffect } from "react";
import styles from "./LaunchWindow.module.css";
import { useScreenRecorder } from "../../hooks/useScreenRecorder";
import { useMicrophone } from "../../hooks/useMicrophone";
import { useAutoZoomSettings } from "../../hooks/useAutoZoomSettings";
import { useKeystrokeSettings } from "../../hooks/useKeystrokeSettings";
import { Button } from "../ui/button";
import { BsRecordCircle, BsKeyboard } from "react-icons/bs";
import { FaRegStopCircle } from "react-icons/fa";
import { MdMonitor } from "react-icons/md";
import { RxDragHandleDots2 } from "react-icons/rx";
import { FaFolderMinus } from "react-icons/fa6";
import { FiMinus, FiX } from "react-icons/fi";
import { TbZoomScan } from "react-icons/tb";
import { ContentClamp } from "../ui/content-clamp";
import { MicrophoneSelector } from "./MicrophoneSelector";
import { 
  getAudioSettings, 
  STORAGE_KEY,
  type AudioSettings 
} from "../../stores/audioSettings";

export function LaunchWindow() {
  // Track audio settings in state so we can react to changes
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(() => getAudioSettings());
  
  // Listen for localStorage changes from the settings window
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        const newSettings = getAudioSettings();
        setAudioSettings(newSettings);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    const pollInterval = setInterval(() => {
      const currentSettings = getAudioSettings();
      setAudioSettings(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(currentSettings)) {
          return currentSettings;
        }
        return prev;
      });
    }, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(pollInterval);
    };
  }, []);

  // Get all microphone state from the hook
  const {
    stream: audioStream,
    devices,
    isEnabled,
    selectDevice,
    enable,
    error: micError,
    permissionState,
  } = useMicrophone({
    sampleRate: audioSettings.sampleRate,
    channelCount: audioSettings.channelCount,
    noiseSuppression: audioSettings.noiseSuppression,
    echoCancellation: audioSettings.echoCancellation,
    autoGainControl: audioSettings.autoGainControl,
  });

  // Restore microphone state when settings change
  useEffect(() => {
    if (audioSettings.enabled && !isEnabled) {
      if (audioSettings.deviceId) {
        selectDevice(audioSettings.deviceId).catch((err) => {
          console.warn('[LaunchWindow] Failed to select saved device, trying default:', err);
          enable().catch(console.error);
        });
      } else {
        enable().catch(console.error);
      }
    }
  }, [audioSettings.enabled, audioSettings.deviceId, isEnabled, selectDevice, enable]);

  // Auto zoom settings
  const { settings: autoZoomSettings, setEnabled: setAutoZoomEnabled } = useAutoZoomSettings();
  
  // Keystroke settings
  const { settings: keystrokeSettings, toggleEnabled: toggleKeystroke, loading: keystrokeLoading } = useKeystrokeSettings();
  
  // Pass audio stream and auto zoom setting to screen recorder
  const { recording, toggleRecording } = useScreenRecorder({ 
    audioStream,
    autoZoomEnabled: autoZoomSettings.enabled,
  });
  const [recordingStart, setRecordingStart] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (recording) {
      if (!recordingStart) setRecordingStart(Date.now());
      timer = setInterval(() => {
        if (recordingStart) {
          setElapsed(Math.floor((Date.now() - recordingStart) / 1000));
        }
      }, 1000);
    } else {
      setRecordingStart(null);
      setElapsed(0);
      if (timer) clearInterval(timer);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [recording, recordingStart]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };
  const [selectedSource, setSelectedSource] = useState("Screen");
  const [hasSelectedSource, setHasSelectedSource] = useState(false);

  useEffect(() => {
    const checkSelectedSource = async () => {
      if (window.electronAPI) {
        const source = await window.electronAPI.getSelectedSource();
        if (source) {
          setSelectedSource(source.name);
          setHasSelectedSource(true);
        } else {
          setSelectedSource("Screen");
          setHasSelectedSource(false);
        }
      }
    };

    checkSelectedSource();
    
    const interval = setInterval(checkSelectedSource, 500);
    return () => clearInterval(interval);
  }, []);

  const openSourceSelector = () => {
    if (window.electronAPI) {
      window.electronAPI.openSourceSelector();
    }
  };

  const openVideoFile = async () => {
    const result = await window.electronAPI.openVideoFilePicker();
    
    if (result.cancelled) {
      return;
    }
    
    if (result.success && result.path) {
      await window.electronAPI.setCurrentVideoPath(result.path);
      await window.electronAPI.switchToEditor();
    }
  };

  const sendHudOverlayHide = () => {
    if (window.electronAPI && window.electronAPI.hudOverlayHide) {
      window.electronAPI.hudOverlayHide();
    }
  };
  const sendHudOverlayClose = () => {
    if (window.electronAPI && window.electronAPI.hudOverlayClose) {
      window.electronAPI.hudOverlayClose();
    }
  };

  return (
    <div className="w-full h-full flex items-end pb-2 bg-transparent">
      <div
        className={`w-full max-w-[600px] mx-auto flex items-center gap-3 px-3 py-2 ${styles.electronDrag}`}
        style={{
          borderRadius: 16,
          background: 'linear-gradient(135deg, rgba(30,30,40,0.92) 0%, rgba(20,20,30,0.85) 100%)',
          backdropFilter: 'blur(32px) saturate(180%)',
          WebkitBackdropFilter: 'blur(32px) saturate(180%)',
          boxShadow: '0 4px 24px 0 rgba(0,0,0,0.28), 0 1px 3px 0 rgba(0,0,0,0.14) inset',
          border: '1px solid rgba(80,80,120,0.22)',
          minHeight: 44,
        }}
      >
        {/* Drag handle */}
        <div className={`flex items-center ${styles.electronDrag}`}>
          <RxDragHandleDots2 size={18} className="text-white/40" />
        </div>

        {/* Screen selector */}
        <Button
          variant="link"
          size="sm"
          className={`gap-1.5 text-white bg-transparent hover:bg-transparent px-0 text-xs ${styles.electronNoDrag}`}
          onClick={openSourceSelector}
          disabled={recording}
        >
          <MdMonitor size={14} className="text-white" />
          <ContentClamp truncateLength={6}>{selectedSource}</ContentClamp>
        </Button>

        <div className="w-px h-5 bg-white/30" />

        {/* Record button */}
        <Button
          variant="link"
          size="sm"
          onClick={hasSelectedSource ? toggleRecording : openSourceSelector}
          disabled={!hasSelectedSource && !recording}
          className={`gap-1.5 text-white bg-transparent hover:bg-transparent px-0 text-xs ${styles.electronNoDrag}`}
        >
          {recording ? (
            <>
              <FaRegStopCircle size={14} className="text-red-400" />
              <span className="text-red-400">{formatTime(elapsed)}</span>
            </>
          ) : (
            <>
              <BsRecordCircle size={14} className={hasSelectedSource ? "text-white" : "text-white/50"} />
              <span className={hasSelectedSource ? "text-white" : "text-white/50"}>Record</span>
            </>
          )}
        </Button>

        <div className="w-px h-5 bg-white/30" />

        {/* Open file */}
        <Button
          variant="link"
          size="sm"
          onClick={openVideoFile}
          className={`gap-1.5 text-white bg-transparent hover:bg-transparent px-0 text-xs ${styles.electronNoDrag}`}
          disabled={recording}
        >
          <FaFolderMinus size={14} className="text-white" />
          <span className="text-white">Open</span>
        </Button>

        <div className="w-px h-5 bg-white/30" />

        {/* Mic */}
        <MicrophoneSelector
          devices={devices}
          isEnabled={isEnabled}
          error={micError}
          permissionState={permissionState}
          disabled={recording}
        />

        <div className="w-px h-5 bg-white/30" />

        {/* Keys toggle for keystroke overlay */}
        <Button
          variant="link"
          size="sm"
          onClick={toggleKeystroke}
          disabled={keystrokeLoading}
          className={`gap-1.5 bg-transparent hover:bg-transparent px-0 text-xs ${styles.electronNoDrag}`}
          title={keystrokeSettings.enabled ? "Hide keystrokes" : "Show keystrokes"}
        >
          <BsKeyboard 
            size={14} 
            className={keystrokeSettings.enabled ? "text-green-400" : "text-white/50"} 
          />
          <span className={keystrokeSettings.enabled ? "text-white" : "text-zinc-400"}>
            Keys
          </span>
        </Button>

        <div className="w-px h-5 bg-white/30" />

        {/* Auto Zoom */}
        <Button
          variant="link"
          size="sm"
          onClick={() => setAutoZoomEnabled(!autoZoomSettings.enabled)}
          disabled={recording}
          className={`gap-1.5 bg-transparent hover:bg-transparent px-0 text-xs ${styles.electronNoDrag}`}
          title={autoZoomSettings.enabled ? "Auto Zoom: ON" : "Auto Zoom: OFF"}
        >
          <TbZoomScan 
            size={14} 
            className={autoZoomSettings.enabled ? "text-green-400" : "text-white/50"} 
          />
          <span className={autoZoomSettings.enabled ? "text-white" : "text-zinc-400"}>
            Zoom
          </span>
        </Button>

        <div className="w-px h-5 bg-white/30" />

        {/* Window controls */}
        <div className={`flex items-center gap-1 ${styles.electronNoDrag}`}>
          <Button
            variant="link"
            size="icon"
            className="hudOverlayButton p-0"
            title="Hide HUD"
            onClick={sendHudOverlayHide}
          >
            <FiMinus size={16} style={{ color: '#fff', opacity: 0.7 }} />
          </Button>

          <Button
            variant="link"
            size="icon"
            className="hudOverlayButton p-0"
            title="Close App"
            onClick={sendHudOverlayClose}
          >
            <FiX size={16} style={{ color: '#fff', opacity: 0.7 }} />
          </Button>
        </div>
      </div>
    </div>
  );
}
