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
	"flex items-center gap-0.5 bg-background/70 text-foreground rounded-full transition-colors duration-150 hover:bg-accent";

const hudIconBtnClasses =
	"flex items-center justify-center p-2 rounded-full transition-all duration-150 cursor-pointer text-foreground hover:bg-accent hover:scale-[1.08] active:scale-95";

const windowBtnClasses =
	"flex items-center justify-center p-2 rounded-full transition-all duration-150 cursor-pointer opacity-50 hover:opacity-90 hover:bg-accent";

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
				className={`fixed top-2 flex items-center gap-1 px-2 py-1 rounded-md editor-text-muted hover:text-foreground hover:bg-accent transition-all duration-150 ${isMac ? "left-[72px]" : "left-2"} ${styles.electronNoDrag}`}
			>
				<Languages size={14} />
				<select
					value={locale}
					onChange={(e) => setLocale(e.target.value as Locale)}
					className="bg-transparent text-[11px] font-medium outline-none cursor-pointer appearance-none pr-1"
					style={{ color: "inherit" }}
				>
					{SUPPORTED_LOCALES.map((loc) => (
						<option key={loc} value={loc} className="bg-popover text-foreground">
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
							className={`flex items-center gap-2 px-3 py-1.5 h-[36px] editor-panel backdrop-blur-[24px] rounded-xl shadow-2xl transition-all duration-300 overflow-hidden ${!micExpanded ? "opacity-60 grayscale-[0.5]" : "opacity-100"}`}
							onMouseEnter={() => setIsMicHovered(true)}
							onMouseLeave={() => setIsMicHovered(false)}
							onFocus={() => setIsMicFocused(true)}
							onBlur={() => setIsMicFocused(false)}
							style={{ width: micExpanded ? "240px" : "140px", transition: "width 300ms ease" }}
						>
							<div className="relative flex-1 min-w-0">
								{!micExpanded && (
									<div className="editor-text-muted text-[10px] font-medium truncate">
										{selectedMicLabel}
									</div>
								)}
								<select
									value={microphoneDeviceId || selectedMicId}
									onChange={(e) => {
										setSelectedMicId(e.target.value);
										setMicrophoneDeviceId(e.target.value);
									}}
									className={`w-full appearance-none bg-background text-foreground text-[11px] rounded-lg pl-2 pr-6 py-1 border border-input outline-none hover:bg-accent transition-colors cursor-pointer ${!micExpanded ? "sr-only" : ""}`}
								>
									{micDevices.map((device) => (
										<option
											key={device.deviceId}
											value={device.deviceId}
											className="bg-popover text-foreground"
										>
											{device.label}
										</option>
									))}
								</select>
								{micExpanded && (
									<ChevronDown
										size={12}
										className="absolute right-1.5 top-1/2 -translate-y-1/2 editor-text-faint pointer-events-none"
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
							className={`flex items-center gap-2 px-3 py-1.5 h-[36px] editor-panel backdrop-blur-[24px] rounded-xl shadow-2xl transition-all duration-300 overflow-hidden ${!webcamExpanded ? "opacity-60 grayscale-[0.5]" : "opacity-100"}`}
							onMouseEnter={() => setIsWebcamHovered(true)}
							onMouseLeave={() => setIsWebcamHovered(false)}
							onFocus={() => setIsWebcamFocused(true)}
							onBlur={() => setIsWebcamFocused(false)}
							style={{ width: webcamExpanded ? "240px" : "140px", transition: "width 300ms ease" }}
						>
							<div className="relative flex-1 min-w-0">
								{!webcamExpanded && (
									<div className="editor-text-muted text-[10px] font-medium truncate">
										{selectedCameraLabel}
									</div>
								)}
								{webcamExpanded &&
									(isCameraDevicesLoading ? (
										<span className="editor-text-faint text-[10px] italic">
											{t("webcam.searching")}
										</span>
									) : cameraDevicesError ? (
										<span className="editor-text-faint text-[10px] italic">
											{t("webcam.unavailable")}
										</span>
									) : cameraDevices.length === 0 ? (
										<span className="editor-text-faint text-[10px] italic">
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
												className="w-full appearance-none bg-background text-foreground text-[11px] rounded-lg pl-2 pr-6 py-1 border border-input outline-none hover:bg-accent transition-colors cursor-pointer"
											>
												{cameraDevices.map((device) => (
													<option
														key={device.deviceId}
														value={device.deviceId}
														className="bg-popover text-foreground"
													>
														{device.label}
													</option>
												))}
											</select>
											<ChevronDown
												size={12}
												className="absolute right-1.5 top-1/2 -translate-y-1/2 editor-text-faint pointer-events-none"
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
				className={`fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2 py-1.5 rounded-full shadow-hud-bar editor-panel backdrop-blur-[16px] backdrop-saturate-[140%]`}
			>
				{/* Drag handle */}
				<div className={`flex items-center px-1 ${styles.electronDrag}`}>
					{getIcon("drag", "text-foreground/30")}
				</div>

				{/* Source selector */}
				<button
					className={`${hudGroupClasses} p-2 ${styles.electronNoDrag}`}
					onClick={openSourceSelector}
					disabled={recording}
					title={selectedSource}
				>
					{getIcon("monitor", "text-foreground/80")}
					<span className="text-foreground/70 text-[11px] max-w-[72px] truncate">
						{selectedSource}
					</span>
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
							: getIcon("volumeOff", "text-foreground/40")}
					</button>
					<button
						className={`${hudIconBtnClasses} ${microphoneEnabled ? "drop-shadow-[0_0_4px_rgba(74,222,128,0.4)]" : ""}`}
						onClick={toggleMicrophone}
						disabled={recording}
						title={microphoneEnabled ? t("audio.disableMicrophone") : t("audio.enableMicrophone")}
					>
						{microphoneEnabled
							? getIcon("micOn", "text-green-400")
							: getIcon("micOff", "text-foreground/40")}
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
							: getIcon("webcamOff", "text-foreground/40")}
					</button>
				</div>

				{/* Record/Stop group */}
				<button
					className={`flex w-[84px] items-center justify-center gap-1 rounded-full p-2 transition-colors duration-150 ${styles.electronNoDrag} ${
						recording
							? paused
								? "bg-amber-500/10 hover:bg-amber-500/15"
								: "animate-record-pulse bg-red-500/10"
							: "bg-background/70 hover:bg-accent"
					}`}
					onClick={toggleRecording}
					disabled={!hasSelectedSource && !recording}
					style={{ flex: "0 0 auto" }}
				>
					{recording ? (
						<>
							{getIcon("stop", paused ? "text-amber-400" : "text-red-400")}
							<span
								className={`${paused ? "text-amber-400" : "text-red-400"} min-w-[42px] text-left text-xs font-semibold tabular-nums`}
							>
								{formatTimePadded(elapsedSeconds)}
							</span>
						</>
					) : (
						<span className="flex items-center justify-center w-full">
							{getIcon("record", hasSelectedSource ? "text-foreground/80" : "text-foreground/30")}
						</span>
					)}
				</button>

				{recording && (
					<Tooltip content={paused ? t("tooltips.resumeRecording") : t("tooltips.pauseRecording")}>
						<button
							className={`${hudIconBtnClasses} ${styles.electronNoDrag}`}
							onClick={togglePaused}
						>
							{getIcon(
								paused ? "resume" : "pause",
								paused ? "text-amber-400" : "text-foreground/60",
							)}
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
							{getIcon("restart", "text-foreground/60")}
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
							{getIcon("cancel", "text-foreground/60")}
						</button>
					</Tooltip>
				)}

				{!recording && (
					<>
						{/* Open video file */}
						<Tooltip content={t("tooltips.openVideoFile")}>
							<button
								className={`${hudIconBtnClasses} ${styles.electronNoDrag}`}
								onClick={openVideoFile}
							>
								{getIcon("videoFile", "text-foreground/60")}
							</button>
						</Tooltip>

						{/* Open project */}
						<Tooltip content={t("tooltips.openProject")}>
							<button
								className={`${hudIconBtnClasses} ${styles.electronNoDrag}`}
								onClick={openProjectFile}
							>
								{getIcon("folder", "text-foreground/60")}
							</button>
						</Tooltip>
					</>
				)}

				{/* Window controls */}
				<div className={`flex items-center gap-0.5 ${styles.electronNoDrag}`}>
					<button
						className={windowBtnClasses}
						title={t("tooltips.hideHUD")}
						onClick={sendHudOverlayHide}
					>
						{getIcon("minimize", "text-foreground")}
					</button>
					<button
						className={windowBtnClasses}
						title={t("tooltips.closeApp")}
						onClick={sendHudOverlayClose}
					>
						{getIcon("close", "text-foreground")}
					</button>
				</div>
			</div>
		</div>
	);
}
