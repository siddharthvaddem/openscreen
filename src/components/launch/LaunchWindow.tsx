import { ChevronDown, Languages } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { BsRecordCircle } from "react-icons/bs";
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
import { type Locale, SUPPORTED_LOCALES } from "@/i18n/config";
import { getLocaleName } from "@/i18n/loader";
import { useAudioLevelMeter } from "../../hooks/useAudioLevelMeter";
import { useCameraDevices } from "../../hooks/useCameraDevices";
import { useMicrophoneDevices } from "../../hooks/useMicrophoneDevices";
import { usePreviewStream } from "../../hooks/usePreviewStream";
import { useScreenRecorder } from "../../hooks/useScreenRecorder";
import { requestCameraAccess } from "../../lib/requestCameraAccess";
import { formatTimePadded } from "../../utils/timeUtils";
import { AudioLevelMeter } from "../ui/audio-level-meter";
import { Tooltip } from "../ui/tooltip";
import styles from "./LaunchWindow.module.css";
import { LivePreview } from "./LivePreview";

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

const windowBtnClasses =
	"flex items-center justify-center p-2 rounded-full transition-all duration-150 cursor-pointer opacity-50 hover:opacity-90 hover:bg-white/[0.08]";

export function LaunchWindow() {
	const t = useScopedT("launch");
	const { locale, setLocale } = useI18n();

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

	const {
		streams,
		previewActive,
		startPreview,
		stopPreview,
		detachScreenStream,
		detachWebcamStream,
	} = usePreviewStream({ webcamEnabled });

	const [recordingStart, setRecordingStart] = useState<number | null>(null);
	const [elapsed, setElapsed] = useState(0);

	const showMicControls = microphoneEnabled && !recording;
	const showWebcamControls = webcamEnabled && !recording;

	const [isMicHovered, setIsMicHovered] = useState(false);
	const [isMicFocused, setIsMicFocused] = useState(false);
	const micExpanded = isMicHovered || isMicFocused;

	const [isWebcamHovered, setIsWebcamHovered] = useState(false);
	const [isWebcamFocused, setIsWebcamFocused] = useState(false);
	const webcamExpanded = isWebcamHovered || isWebcamFocused;

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

	const [selectedSource, setSelectedSource] = useState("Screen");
	const [hasSelectedSource, setHasSelectedSource] = useState(false);

	// Poll for source selection and start preview when source is picked
	useEffect(() => {
		let prevSourceId: string | null = null;

		const checkSelectedSource = async () => {
			if (window.electronAPI) {
				const source = await window.electronAPI.getSelectedSource();
				if (source) {
					setSelectedSource(source.name);
					setHasSelectedSource(true);

					// Auto-start preview when source changes
					if (source.id !== prevSourceId && !recording) {
						prevSourceId = source.id;
						startPreview(source.id);
					}
				} else {
					setSelectedSource("Screen");
					setHasSelectedSource(false);
				}
			}
		};

		checkSelectedSource();

		const interval = setInterval(checkSelectedSource, 500);
		return () => clearInterval(interval);
	}, [recording, startPreview]);

	const openSourceSelector = useCallback(() => {
		if (window.electronAPI) {
			window.electronAPI.openSourceSelector();
		}
	}, []);

	const handleToggleRecording = useCallback(() => {
		if (recording) {
			toggleRecording();
			// Restart preview after recording stops
			setTimeout(async () => {
				const source = await window.electronAPI.getSelectedSource();
				if (source) {
					startPreview(source.id);
				}
			}, 500);
		} else if (hasSelectedSource && previewActive) {
			// Detach streams from preview and hand them to recorder
			const screenStream = detachScreenStream();
			const webcamStream = detachWebcamStream();
			if (screenStream) {
				toggleRecording({ screenStream, webcamStream });
			} else {
				toggleRecording();
			}
		} else if (hasSelectedSource) {
			toggleRecording();
		} else {
			openSourceSelector();
		}
	}, [
		recording,
		hasSelectedSource,
		previewActive,
		toggleRecording,
		startPreview,
		detachScreenStream,
		detachWebcamStream,
		openSourceSelector,
	]);

	const openVideoFile = async () => {
		const result = await window.electronAPI.openVideoFilePicker();
		if (result.canceled) return;
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
		if (window.electronAPI?.hudOverlayHide) {
			window.electronAPI.hudOverlayHide();
		}
	};

	const sendHudOverlayClose = () => {
		stopPreview();
		if (window.electronAPI?.hudOverlayClose) {
			window.electronAPI.hudOverlayClose();
		}
	};

	const toggleMicrophone = () => {
		if (!recording) {
			setMicrophoneEnabled(!microphoneEnabled);
		}
	};

	return (
		<div
			className={`w-full h-full flex flex-col rounded-2xl overflow-hidden ${styles.electronDrag}`}
			style={{
				background:
					"linear-gradient(135deg, rgba(28, 28, 36, 0.95) 0%, rgba(18, 18, 26, 0.93) 100%)",
				backdropFilter: "blur(20px) saturate(160%)",
				WebkitBackdropFilter: "blur(20px) saturate(160%)",
				border: "1px solid rgba(60, 60, 80, 0.25)",
				boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2)",
			}}
		>
			{/* Title bar */}
			<div className={`flex items-center justify-between px-3 py-2 ${styles.electronDrag}`}>
				<div
					className={`flex items-center gap-1 px-2 py-1 rounded-md text-white/50 hover:text-white/90 hover:bg-white/10 transition-all duration-150 ${styles.electronNoDrag}`}
				>
					<Languages size={14} />
					<select
						value={locale}
						onChange={(e) => setLocale(e.target.value as Locale)}
						className="bg-transparent text-[11px] font-medium outline-none cursor-pointer appearance-none pr-1"
						style={{ color: "inherit" }}
					>
						{SUPPORTED_LOCALES.map((loc) => (
							<option key={loc} value={loc} className="bg-[#1c1c24] text-white">
								{getLocaleName(loc)}
							</option>
						))}
					</select>
				</div>

				{recording && (
					<div className="flex items-center gap-1.5 px-2">
						<div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
						<span className="text-red-400 text-[11px] font-semibold tabular-nums">
							REC {formatTimePadded(elapsed)}
						</span>
					</div>
				)}

				<div className={`flex items-center gap-0.5 ${styles.electronNoDrag}`}>
					<button
						className={windowBtnClasses}
						title={t("tooltips.hideHUD")}
						onClick={sendHudOverlayHide}
					>
						{getIcon("minimize", "text-white")}
					</button>
					<button
						className={windowBtnClasses}
						title={t("tooltips.closeApp")}
						onClick={sendHudOverlayClose}
					>
						{getIcon("close", "text-white")}
					</button>
				</div>
			</div>

			{/* Live preview area */}
			<div className={`flex-1 min-h-0 px-3 ${styles.electronNoDrag}`}>
				<LivePreview streams={streams} className="w-full h-full" />
			</div>

			{/* Mic controls panel */}
			{showMicControls && (
				<div
					className={`mx-3 mt-2 flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl ${styles.electronNoDrag}`}
				>
					<div className="relative flex-1" style={{ maxWidth: "70%" }}>
						<select
							value={microphoneDeviceId || selectedDeviceId}
							onChange={(e) => {
								setSelectedDeviceId(e.target.value);
								setMicrophoneDeviceId(e.target.value);
							}}
							className="w-full appearance-none bg-white/10 text-white text-xs rounded-full pl-3 pr-7 py-2 border border-white/20 outline-none truncate"
						>
							{devices.map((device) => (
								<option key={device.deviceId} value={device.deviceId}>
									{device.label}
								</option>
							))}
						</select>
						<ChevronDown
							size={14}
							className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none"
						/>
					</div>
					<AudioLevelMeter level={level} className="w-24 h-4" />
				</div>
			)}

			{/* Control bar */}
			<div className={`px-3 py-2.5 ${styles.electronNoDrag}`}>
				<div className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-full bg-white/[0.03]">
					{/* Source selector */}
					<button
						className={`${hudGroupClasses} p-2`}
						onClick={openSourceSelector}
						disabled={recording}
						title={
							systemAudioEnabled ? t("audio.disableSystemAudio") : t("audio.enableSystemAudio")
						}
					>
						{getIcon("monitor", "text-white/80")}
						<span className="text-white/70 text-[11px] max-w-[80px] truncate">
							{selectedSource}
						</span>
					</button>

					{/* Audio controls group */}
					<div className={hudGroupClasses}>
						<button
							className={`${hudIconBtnClasses} ${systemAudioEnabled ? "drop-shadow-[0_0_4px_rgba(74,222,128,0.4)]" : ""}`}
							onClick={() => !recording && setSystemAudioEnabled(!systemAudioEnabled)}
							disabled={recording}
							title={
								systemAudioEnabled ? t("audio.disableSystemAudio") : t("audio.enableSystemAudio")
							}
						>
							{systemAudioEnabled
								? getIcon("volumeOn", "text-green-400")
								: getIcon("volumeOff", "text-white/40")}
						</button>
						<button
							className={`${hudIconBtnClasses} ${microphoneEnabled ? "drop-shadow-[0_0_4px_rgba(74,222,128,0.4)]" : ""}`}
							onClick={toggleMicrophone}
							disabled={recording}
							title={microphoneEnabled ? t("audio.disableMicrophone") : t("audio.enableMicrophone")}
						>
							{microphoneEnabled
								? getIcon("micOn", "text-green-400")
								: getIcon("micOff", "text-white/40")}
						</button>
						<button
							className={`${hudIconBtnClasses} ${webcamEnabled ? "drop-shadow-[0_0_4px_rgba(74,222,128,0.4)]" : ""}`}
							onClick={async () => {
								await setWebcamEnabled(!webcamEnabled);
							}}
							title={webcamEnabled ? t("webcam.disableWebcam") : t("webcam.enableWebcam")}
						>
							{webcamEnabled
								? getIcon("webcamOn", "text-green-400")
								: getIcon("webcamOff", "text-white/40")}
						</button>
					</div>

					{/* Record/Stop */}
					<button
						className={`flex items-center gap-1 rounded-full px-3 py-2 transition-colors duration-150 ${
							recording ? "animate-record-pulse bg-red-500/10" : "bg-white/5 hover:bg-white/[0.08]"
						}`}
						onClick={handleToggleRecording}
						disabled={!hasSelectedSource && !recording}
						style={{ flex: "0 0 auto" }}
					>
						{recording ? (
							<>
								{getIcon("stop", "text-red-400")}
								<span className="text-red-400 text-xs font-semibold tabular-nums">
									{formatTimePadded(elapsed)}
								</span>
							</>
						) : (
							<>
								{getIcon("record", hasSelectedSource ? "text-white/80" : "text-white/30")}
								<span
									className={`text-xs font-medium ${hasSelectedSource ? "text-white/60" : "text-white/20"}`}
								>
									REC
								</span>
							</>
						)}
					</button>
				</div>

					{/* Restart recording */}
					{recording && (
						<Tooltip content={t("tooltips.restartRecording")}>
							<button className={hudIconBtnClasses} onClick={restartRecording}>
								{getIcon("restart", "text-white/60")}
							</button>
						</Tooltip>
					)}
				</button>

					{/* Open video file */}
					<Tooltip content={t("tooltips.openVideoFile")}>
						<button className={hudIconBtnClasses} onClick={openVideoFile} disabled={recording}>
							{getIcon("videoFile", "text-white/60")}
						</button>
					</Tooltip>
				)}

					{/* Open project */}
					<Tooltip content={t("tooltips.openProject")}>
						<button className={hudIconBtnClasses} onClick={openProjectFile} disabled={recording}>
							{getIcon("folder", "text-white/60")}
						</button>
					</Tooltip>
				</div>
			</div>
		</div>
	);
}
