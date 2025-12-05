import { Check, ChevronDown, Languages } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BsPauseCircle, BsPlayCircle, BsRecordCircle } from "react-icons/bs";
import { FaRegStopCircle } from "react-icons/fa";
import { FaFolderOpen } from "react-icons/fa6";
import { FiMinus, FiX } from "react-icons/fi";
import {
	MdCancel,
	MdMic,
	MdMicOff,
	MdMonitor,
	MdRestartAlt,
	MdVideocam,
	MdVideocamOff,
	MdVideoFile,
	MdVolumeOff,
	MdVolumeUp,
} from "react-icons/md";
import { RxDragHandleDots2 } from "react-icons/rx";
import { useI18n, useScopedT } from "@/contexts/I18nContext";
import { getAvailableLocales, getLocaleName } from "@/i18n/loader";
import { useAudioLevelMeter } from "../../hooks/useAudioLevelMeter";
import { useCameraDevices } from "../../hooks/useCameraDevices";
import { useMicrophoneDevices } from "../../hooks/useMicrophoneDevices";
import { useScreenRecorder } from "../../hooks/useScreenRecorder";
import { requestCameraAccess } from "../../lib/requestCameraAccess";
import { formatTimePadded } from "../../utils/timeUtils";
import { AudioLevelMeter } from "../ui/audio-level-meter";
import { Button } from "../ui/button";
import { Tooltip } from "../ui/tooltip";
import styles from "./LaunchWindow.module.css";

const ICON_SIZE = 20;

const ICON_CONFIG = {
	drag: { icon: RxDragHandleDots2, size: ICON_SIZE },
	monitor: { icon: MdMonitor, size: ICON_SIZE },
	volumeOn: { icon: MdVolumeUp, size: ICON_SIZE },
	volumeOff: { icon: MdVolumeOff, size: ICON_SIZE },
	micOn: { icon: MdMic, size: ICON_SIZE },
	micOff: { icon: MdMicOff, size: ICON_SIZE },
	webcamOn: { icon: MdVideocam, size: ICON_SIZE },
	webcamOff: { icon: MdVideocamOff, size: ICON_SIZE },
	pause: { icon: BsPauseCircle, size: ICON_SIZE },
	resume: { icon: BsPlayCircle, size: ICON_SIZE },
	stop: { icon: FaRegStopCircle, size: ICON_SIZE },
	restart: { icon: MdRestartAlt, size: ICON_SIZE },
	cancel: { icon: MdCancel, size: ICON_SIZE },
	record: { icon: BsRecordCircle, size: ICON_SIZE },
	videoFile: { icon: MdVideoFile, size: ICON_SIZE },
	folder: { icon: FaFolderOpen, size: ICON_SIZE },
	minimize: { icon: FiMinus, size: ICON_SIZE },
	close: { icon: FiX, size: ICON_SIZE },
} as const;

type IconName = keyof typeof ICON_CONFIG;

function getIcon(name: IconName, className?: string) {
	const { icon: Icon, size } = ICON_CONFIG[name];
	return <Icon size={size} className={className} />;
}

const hudGroupClasses =
	"flex items-center gap-0.5 bg-white/5 rounded-full transition-colors duration-150 hover:bg-white/[0.08]";

const hudIconBtnClasses =
	"flex items-center justify-center p-2 rounded-full transition-all duration-150 cursor-pointer text-white hover:bg-white/10 hover:scale-[1.08] active:scale-95";

const hudAuxIconBtnClasses =
	"flex items-center justify-center p-1.5 rounded-full transition-colors duration-150 text-white/55 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed";

const windowBtnClasses =
	"flex items-center justify-center p-2 rounded-full transition-all duration-150 cursor-pointer opacity-50 hover:opacity-90 hover:bg-white/[0.08]";

const hudSidebarClasses = "ml-0.5 pl-1.5 border-l border-white/10 flex items-center gap-0.5";

export function LaunchWindow() {
	const t = useScopedT("launch");
	const availableLocales = getAvailableLocales();
	const {
		locale,
		setLocale,
		systemLocaleSuggestion,
		acceptSystemLocaleSuggestion,
		dismissSystemLocaleSuggestion,
		resolveSystemLocaleSuggestion,
	} = useI18n();
	const suggestedLanguageName = systemLocaleSuggestion ? getLocaleName(systemLocaleSuggestion) : "";

	const {
		recording,
		paused,
		elapsedSeconds,
		toggleRecording,
		togglePaused,
		restartRecording,
		cancelRecording,
		microphoneEnabled,
		setMicrophoneEnabled,
		microphoneDeviceId,
		setMicrophoneDeviceId,
		systemAudioEnabled,
		setSystemAudioEnabled,
		webcamEnabled,
		setWebcamEnabled,
		webcamDeviceId,
		setWebcamDeviceId,
	} = useScreenRecorder();

	const showMicControls = microphoneEnabled && !recording;
	const showWebcamControls = webcamEnabled && !recording;

	const [isMicHovered, setIsMicHovered] = useState(false);
	const [isMicFocused, setIsMicFocused] = useState(false);
	const micExpanded = isMicHovered || isMicFocused;

	const [isWebcamHovered, setIsWebcamHovered] = useState(false);
	const [isWebcamFocused, setIsWebcamFocused] = useState(false);
	const webcamExpanded = isWebcamHovered || isWebcamFocused;
	const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
	const languageTriggerRef = useRef<HTMLButtonElement | null>(null);
	const languageMenuPanelRef = useRef<HTMLDivElement | null>(null);
	const [languageMenuStyle, setLanguageMenuStyle] = useState<{
		right: number;
		top: number;
		maxHeight: number;
	}>({
		right: 12,
		top: 12,
		maxHeight: 240,
	});

	const {
		devices: micDevices,
		selectedDeviceId: selectedMicId,
		setSelectedDeviceId: setSelectedMicId,
	} = useMicrophoneDevices(microphoneEnabled);
	const {
		devices: cameraDevices,
		selectedDeviceId: selectedCameraId,
		setSelectedDeviceId: setSelectedCameraId,
		isLoading: isCameraDevicesLoading,
		error: cameraDevicesError,
	} = useCameraDevices(webcamEnabled);

	const selectedMicLabel =
		micDevices.find((d) => d.deviceId === (microphoneDeviceId || selectedMicId))?.label ||
		t("audio.defaultMicrophone");
	const selectedCameraLabel = isCameraDevicesLoading
		? t("webcam.searching")
		: cameraDevicesError
			? t("webcam.unavailable")
			: cameraDevices.length === 0
				? t("webcam.noneFound")
				: cameraDevices.find((d) => d.deviceId === (webcamDeviceId || selectedCameraId))?.label ||
					t("webcam.defaultCamera");

	const { level } = useAudioLevelMeter({
		enabled: showMicControls,
		deviceId: microphoneDeviceId,
	});

	useEffect(() => {
		if (selectedMicId && selectedMicId !== "default") {
			setMicrophoneDeviceId(selectedMicId);
		}
	}, [selectedMicId, setMicrophoneDeviceId]);

	useEffect(() => {
		if (selectedCameraId) {
			setWebcamDeviceId(selectedCameraId);
		}
	}, [selectedCameraId, setWebcamDeviceId]);

	useEffect(() => {
		if (!import.meta.env.DEV) {
			return;
		}

		void requestCameraAccess().catch((error) => {
			console.warn("Failed to trigger camera access request during development:", error);
		});
	}, []);

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

	const openProjectFile = async () => {
		const result = await window.electronAPI.loadProjectFile();
		if (result.canceled || !result.success) return;
		await window.electronAPI.switchToEditor();
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

	const toggleMicrophone = () => {
		if (!recording) {
			setMicrophoneEnabled(!microphoneEnabled);
		}
	};

  return (
    <div className="w-full h-full flex items-center bg-transparent">
      <div
        className={`w-full max-w-[500px] mx-auto flex items-center justify-between px-4 py-2 ${styles.electronDrag}`}
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
        <div className={`flex items-center gap-1 ${styles.electronDrag}`}> <RxDragHandleDots2 size={18} className="text-white/40" /> </div>

        <Button
          variant="link"
          size="sm"
          className={`gap-1 text-white bg-transparent hover:bg-transparent px-0 flex-1 text-left text-xs ${styles.electronNoDrag}`}
          onClick={openSourceSelector}
          disabled={recording}
        >
          <MdMonitor size={14} className="text-white" />
          {truncateText(selectedSource, 6)}
        </Button>

        <div className="w-px h-6 bg-white/30" />

        <Button
          variant="link"
          size="sm"
          onClick={hasSelectedSource ? toggleRecording : openSourceSelector}
          disabled={!hasSelectedSource && !recording}
          className={`gap-1 bg-transparent hover:bg-transparent px-0 flex-1 text-center text-xs ${styles.electronNoDrag}`}
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
