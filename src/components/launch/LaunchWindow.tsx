import { ChevronDown, Languages } from "lucide-react";
import { useEffect, useState } from "react";
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
import { type Locale, SUPPORTED_LOCALES } from "@/i18n/config";
import { getLocaleName } from "@/i18n/loader";
import { isMac as getIsMac } from "@/utils/platformUtils";
import { useAudioLevelMeter } from "../../hooks/useAudioLevelMeter";
import { useCameraDevices } from "../../hooks/useCameraDevices";
import { useMicrophoneDevices } from "../../hooks/useMicrophoneDevices";
import { useScreenRecorder } from "../../hooks/useScreenRecorder";
import { requestCameraAccess } from "../../lib/requestCameraAccess";
import { formatTimePadded } from "../../utils/timeUtils";
import { AudioLevelMeter } from "../ui/audio-level-meter";
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

const windowBtnClasses =
	"flex items-center justify-center p-2 rounded-full transition-all duration-150 cursor-pointer opacity-50 hover:opacity-90 hover:bg-white/[0.08]";

export function LaunchWindow() {
	const t = useScopedT("launch");
	const { locale, setLocale } = useI18n();
	const [isMac, setIsMac] = useState(false);

	useEffect(() => {
		getIsMac().then(setIsMac);
	}, []);

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

	// Show live camera preview as soon as webcam is enabled (before and during recording).
	// Only retrigger when webcamEnabled flips — not on every device-list load.
	useEffect(() => {
		if (!window.electronAPI) return;
		if (webcamEnabled) {
			const deviceId = webcamDeviceId || selectedCameraId || "";
			window.electronAPI.showCameraPreview(deviceId);
		} else {
			window.electronAPI.hideCameraPreview();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [webcamEnabled]);

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
		<div className={`w-screen h-screen bg-transparent ${styles.electronDrag}`}>
			{/* Language switcher — top-left, beside traffic lights */}
			<div
				className={`fixed top-2 flex items-center gap-1 px-2 py-1 rounded-md text-white/50 hover:text-white/90 hover:bg-white/10 transition-all duration-150 ${isMac ? "left-[72px]" : "left-2"} ${styles.electronNoDrag}`}
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

			{/* Device selectors — fixed above HUD bar, viewport-relative, never clipped */}
			{(showMicControls || showWebcamControls) && (
				<div
					className={`fixed bottom-[60px] left-1/2 -translate-x-1/2 flex items-center gap-2 animate-mic-panel-in ${styles.electronNoDrag}`}
				>
					{/* Mic selector */}
					{showMicControls && (
						<div
							className={`flex items-center gap-2 px-3 py-1.5 h-[36px] bg-gradient-to-br from-[rgba(28,28,36,0.97)] to-[rgba(18,18,26,0.96)] backdrop-blur-[24px] border border-white/10 rounded-xl shadow-2xl transition-all duration-300 overflow-hidden ${!micExpanded ? "opacity-60 grayscale-[0.5]" : "opacity-100"}`}
							onMouseEnter={() => setIsMicHovered(true)}
							onMouseLeave={() => setIsMicHovered(false)}
							onFocus={() => setIsMicFocused(true)}
							onBlur={() => setIsMicFocused(false)}
							style={{ width: micExpanded ? "240px" : "140px", transition: "width 300ms ease" }}
						>
							<div className="relative flex-1 min-w-0">
								{!micExpanded && (
									<div className="text-white/60 text-[10px] font-medium truncate">
										{selectedMicLabel}
									</div>
								)}
								<select
									value={microphoneDeviceId || selectedMicId}
									onChange={(e) => {
										setSelectedMicId(e.target.value);
										setMicrophoneDeviceId(e.target.value);
									}}
									className={`w-full appearance-none bg-white/5 text-white text-[11px] rounded-lg pl-2 pr-6 py-1 border border-white/10 outline-none hover:bg-white/10 transition-colors cursor-pointer ${!micExpanded ? "sr-only" : ""}`}
								>
									{micDevices.map((device) => (
										<option key={device.deviceId} value={device.deviceId} className="bg-[#1c1c24]">
											{device.label}
										</option>
									))}
								</select>
								{micExpanded && (
									<ChevronDown
										size={12}
										className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
									/>
								)}
							</div>
							<AudioLevelMeter
								level={level}
								className={`${micExpanded ? "w-16" : "w-8"} h-2 transition-all duration-300`}
							/>
						</div>
					)}

					{/* Webcam selector */}
					{showWebcamControls && (
						<div
							className={`flex items-center gap-2 px-3 py-1.5 h-[36px] bg-gradient-to-br from-[rgba(28,28,36,0.97)] to-[rgba(18,18,26,0.96)] backdrop-blur-[24px] border border-white/10 rounded-xl shadow-2xl transition-all duration-300 overflow-hidden ${!webcamExpanded ? "opacity-60 grayscale-[0.5]" : "opacity-100"}`}
							onMouseEnter={() => setIsWebcamHovered(true)}
							onMouseLeave={() => setIsWebcamHovered(false)}
							onFocus={() => setIsWebcamFocused(true)}
							onBlur={() => setIsWebcamFocused(false)}
							style={{ width: webcamExpanded ? "240px" : "140px", transition: "width 300ms ease" }}
						>
							<div className="relative flex-1 min-w-0">
								{!webcamExpanded && (
									<div className="text-white/60 text-[10px] font-medium truncate">
										{selectedCameraLabel}
									</div>
								)}
								{webcamExpanded &&
									(isCameraDevicesLoading ? (
										<span className="text-white/40 text-[10px] italic">
											{t("webcam.searching")}
										</span>
									) : cameraDevicesError ? (
										<span className="text-white/40 text-[10px] italic">
											{t("webcam.unavailable")}
										</span>
									) : cameraDevices.length === 0 ? (
										<span className="text-white/40 text-[10px] italic">
											{t("webcam.noneFound")}
										</span>
									) : (
										<>
											<select
												value={webcamDeviceId || selectedCameraId}
												onChange={(e) => {
													setSelectedCameraId(e.target.value);
													setWebcamDeviceId(e.target.value);
												}}
												className="w-full appearance-none bg-white/5 text-white text-[11px] rounded-lg pl-2 pr-6 py-1 border border-white/10 outline-none hover:bg-white/10 transition-colors cursor-pointer"
											>
												{cameraDevices.map((device) => (
													<option
														key={device.deviceId}
														value={device.deviceId}
														className="bg-[#1c1c24]"
													>
														{device.label}
													</option>
												))}
											</select>
											<ChevronDown
												size={12}
												className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
											/>
										</>
									))}
								{(!webcamExpanded || cameraDevices.length === 0) && (
									<select
										value={webcamDeviceId || selectedCameraId}
										onChange={(e) => {
											setSelectedCameraId(e.target.value);
											setWebcamDeviceId(e.target.value);
										}}
										className="sr-only"
									>
										{cameraDevices.map((device) => (
											<option key={device.deviceId} value={device.deviceId}>
												{device.label}
											</option>
										))}
									</select>
								)}
							</div>
						</div>
					)}
				</div>
			)}

			{/* HUD bar — fixed at bottom center, viewport-relative, never moves */}
			<div
				className={`fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2 py-1.5 rounded-full shadow-hud-bar bg-gradient-to-br from-[rgba(28,28,36,0.97)] to-[rgba(18,18,26,0.96)] backdrop-blur-[16px] backdrop-saturate-[140%] border border-[rgba(80,80,120,0.25)]`}
			>
				{/* Drag handle */}
				<div className={`flex items-center px-1 ${styles.electronDrag}`}>
					{getIcon("drag", "text-white/30")}
				</div>

				{/* Source selector */}
				<button
					className={`${hudGroupClasses} p-2 ${styles.electronNoDrag}`}
					onClick={openSourceSelector}
					disabled={recording}
					title={selectedSource}
				>
					{getIcon("monitor", "text-white/80")}
					<span className="text-white/70 text-[11px] max-w-[72px] truncate">{selectedSource}</span>
				</button>

				{/* Audio controls group */}
				<div className={`${hudGroupClasses} ${styles.electronNoDrag}`}>
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

				{/* Record/Stop group */}
				<button
					className={`flex items-center gap-0.5 rounded-full p-2 transition-colors duration-150 ${styles.electronNoDrag} ${
						recording
							? paused
								? "bg-amber-500/10 hover:bg-amber-500/15"
								: "animate-record-pulse bg-red-500/10"
							: "bg-white/5 hover:bg-white/[0.08]"
					}`}
					onClick={toggleRecording}
					disabled={!hasSelectedSource && !recording}
					style={{ flex: "0 0 auto" }}
				>
					{recording ? (
						<>
							{getIcon("stop", paused ? "text-amber-400" : "text-red-400")}
							<span
								className={`${paused ? "text-amber-400" : "text-red-400"} text-xs font-semibold tabular-nums`}
							>
								{formatTimePadded(elapsedSeconds)}
							</span>
						</>
					) : (
						getIcon("record", hasSelectedSource ? "text-white/80" : "text-white/30")
					)}
				</button>

				{recording && (
					<Tooltip content={paused ? t("tooltips.resumeRecording") : t("tooltips.pauseRecording")}>
						<button
							className={`${hudIconBtnClasses} ${styles.electronNoDrag}`}
							onClick={togglePaused}
						>
							{getIcon(paused ? "resume" : "pause", paused ? "text-amber-400" : "text-white/60")}
						</button>
					</Tooltip>
				)}

				{/* Restart recording */}
				{recording && (
					<Tooltip content={t("tooltips.restartRecording")}>
						<button
							className={`${hudIconBtnClasses} ${styles.electronNoDrag}`}
							onClick={restartRecording}
						>
							{getIcon("restart", "text-white/60")}
						</button>
					</Tooltip>
				)}

				{/* Cancel recording */}
				{recording && (
					<Tooltip content={t("tooltips.cancelRecording")}>
						<button
							className={`${hudIconBtnClasses} ${styles.electronNoDrag}`}
							onClick={cancelRecording}
						>
							{getIcon("cancel", "text-white/60")}
						</button>
					</Tooltip>
				)}

				{/* Open video file */}
				<Tooltip content={t("tooltips.openVideoFile")}>
					<button
						className={`${hudIconBtnClasses} ${styles.electronNoDrag}`}
						onClick={openVideoFile}
						disabled={recording}
					>
						{getIcon("videoFile", "text-white/60")}
					</button>
				</Tooltip>

				{/* Open project */}
				<Tooltip content={t("tooltips.openProject")}>
					<button
						className={`${hudIconBtnClasses} ${styles.electronNoDrag}`}
						onClick={openProjectFile}
						disabled={recording}
					>
						{getIcon("folder", "text-white/60")}
					</button>
				</Tooltip>

				{/* Window controls */}
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
		</div>
	);
}
