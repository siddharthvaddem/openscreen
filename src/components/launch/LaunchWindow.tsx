import { useState, useEffect } from "react";
import styles from "./LaunchWindow.module.css";
import { useScreenRecorder } from "../../hooks/useScreenRecorder";
import { useMicrophoneDevices } from "../../hooks/useMicrophoneDevices";
import { useAudioLevelMeter } from "../../hooks/useAudioLevelMeter";
import { Button } from "../ui/button";
import { BsRecordCircle } from "react-icons/bs";
import { FaRegStopCircle } from "react-icons/fa";
import { MdMonitor } from "react-icons/md";
import { MdMic, MdMicOff } from "react-icons/md";
import { RxDragHandleDots2 } from "react-icons/rx";
import { FaFolderMinus } from "react-icons/fa6";
import { FiMinus, FiX } from "react-icons/fi";
import { ContentClamp } from "../ui/content-clamp";
import { Switch } from "../ui/switch";
import { AudioLevelMeter } from "../ui/audio-level-meter";

export function LaunchWindow() {
  const {
    recording,
    toggleRecording,
    microphoneEnabled,
    setMicrophoneEnabled,
    setMicrophoneDeviceId
  } = useScreenRecorder();

  const { devices, selectedDeviceId, setSelectedDeviceId } = useMicrophoneDevices();
  const { level } = useAudioLevelMeter({
    enabled: microphoneEnabled && !recording,
    deviceId: selectedDeviceId,
    smoothingFactor: 0.8,
  });

  const [recordingStart, setRecordingStart] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Sync selected device with recorder
  useEffect(() => {
    if (selectedDeviceId) {
      setMicrophoneDeviceId(selectedDeviceId);
    }
  }, [selectedDeviceId, setMicrophoneDeviceId]);

  // Resize HUD window when microphone is toggled
  useEffect(() => {
    if (window.electronAPI?.setMicrophoneExpanded) {
      window.electronAPI.setMicrophoneExpanded(microphoneEnabled && !recording);
    }
  }, [microphoneEnabled, recording]);

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
    
    if (result.canceled) {
      return;
    }
    
    if (result.success && result.path) {
      await window.electronAPI.setCurrentVideoPath(result.path);
      await window.electronAPI.switchToEditor();
    }
  };

  // IPC events for hide/close
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
    <div className="w-full h-full flex items-center bg-transparent">
      <div
        className={`w-full mx-auto flex items-center justify-between px-4 py-2 ${styles.electronDrag} ${styles.hudBar}`}
        style={{
          maxWidth:'800px',
          borderRadius: 16,
          background: 'linear-gradient(135deg, rgba(28,28,36,0.97) 0%, rgba(18,18,26,0.96) 100%)',
          backdropFilter: 'blur(16px) saturate(140%)',
          WebkitBackdropFilter: 'blur(16px) saturate(140%)',
          border: '1px solid rgba(80,80,120,0.25)',
          minHeight: 44,
          transition: 'max-width 0.2s ease',
        }}
      >
        <div className={`flex items-center gap-1 ${styles.electronDrag}`}> <RxDragHandleDots2 size={18} className="text-white/40" /> </div>

        <Button
          variant="link"
          size="sm"
          className={`gap-1 text-white bg-transparent hover:bg-transparent px-0 flex-1 text-left text-xs ${styles.electronNoDrag}`}
          onClick={openSourceSelector}
          disabled={recording}
        >
          <MdMonitor size={14} className="text-white" />
          <ContentClamp truncateLength={6}>{selectedSource}</ContentClamp>
        </Button>

        <div className="w-px h-6 bg-white/30" />

        <Button
          variant="link"
          size="sm"
          onClick={hasSelectedSource ? toggleRecording : openSourceSelector}
          disabled={!hasSelectedSource && !recording}
          className={`gap-1 text-white bg-transparent hover:bg-transparent px-0 flex-1 text-center text-xs ${styles.electronNoDrag}`}
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

        <div className="w-px h-6 bg-white/30" />

        {/* Microphone controls */}
        <div className={`flex items-center gap-1.5 px-2 ${styles.electronNoDrag}`}>
          {/* Mic icon and toggle */}
          <div className="flex items-center gap-1.5">
            {microphoneEnabled ? (
              <MdMic size={14} className="text-white" />
            ) : (
              <MdMicOff size={14} className="text-white/50" />
            )}
            <Switch
              checked={microphoneEnabled}
              onCheckedChange={setMicrophoneEnabled}
              disabled={recording}
              className="data-[state=checked]:bg-[#34B27B]"
            />
          </div>

          {/* Inline mic settings - only show when mic is enabled and not recording */}
          {microphoneEnabled && !recording && (
            <div className="flex items-center gap-1.5">
              {/* Device selector */}
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="bg-white/10 text-white text-[10px] px-1.5 py-0.5 rounded border border-white/20 focus:border-white/40 focus:outline-none w-[80px] truncate"
                title={devices.find(d => d.deviceId === selectedDeviceId)?.label || 'Select microphone'}
              >
                {devices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId} className="bg-slate-800 text-white">
                    {device.label || 'Unknown device'}
                  </option>
                ))}
              </select>

              {/* Audio level meter */}
              <div className="w-14">
                <AudioLevelMeter level={level} className="w-full" />
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-white/30" />


        <Button
          variant="link"
          size="sm"
          onClick={openVideoFile}
          className={`gap-1 text-white bg-transparent hover:bg-transparent px-0 flex-1 text-right text-xs ${styles.electronNoDrag} ${styles.folderButton}`}
          disabled={recording}
        >
          <FaFolderMinus size={14} className="text-white" />
          <span className={styles.folderText}>Open</span>
        </Button>

         {/* Separator before hide/close buttons */}
        <div className="w-px h-6 bg-white/30 mx-2" />
        <Button
          variant="link"
          size="icon"
          className={`ml-2 ${styles.electronNoDrag} hudOverlayButton`}
          title="Hide HUD"
          onClick={sendHudOverlayHide}
        >
          <FiMinus size={18} style={{ color: '#fff', opacity: 0.7 }} />
          
        </Button>

        <Button
          variant="link"
          size="icon"
          className={`ml-1 ${styles.electronNoDrag} hudOverlayButton`}
          title="Close App"
          onClick={sendHudOverlayClose}
        >
          <FiX size={18} style={{ color: '#fff', opacity: 0.7 }} />
        </Button>
      </div>
    </div>
  );
}
