import type { Span } from "dnd-timeline";
import { FolderOpen, Languages, Save, Settings, Video } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useI18n, useScopedT } from "@/contexts/I18nContext";
import { useShortcuts } from "@/contexts/ShortcutsContext";
import type { ExportVideoCommandInput, ExportVideoCommandResult } from "@/editor/commands/types";
import { useEditorController } from "@/editor/useEditorController";
import type { AuthAccessPolicy } from "@/features/auth/authTypes";
import { INITIAL_EDITOR_STATE, useEditorHistory } from "@/hooks/useEditorHistory";
import { type Locale, SUPPORTED_LOCALES } from "@/i18n/config";
import { getLocaleName } from "@/i18n/loader";
import {
	calculateOutputDimensions,
	type ExportFormat,
	type ExportProgress,
	type ExportQuality,
	type ExportSettings,
	GIF_SIZE_PRESETS,
	GifExporter,
	type GifFrameRate,
	type GifSizePreset,
	VideoExporter,
} from "@/lib/exporter";
import { computeFrameStepTime } from "@/lib/frameStep";
import type {
	InteractionClickSample,
	InteractionKeySample,
	ProjectMedia,
} from "@/lib/recordingSession";
import { matchesShortcut } from "@/lib/shortcuts";
import { loadUserPreferences, saveUserPreferences } from "@/lib/userPreferences";
import {
	getAspectRatioValue,
	getNativeAspectRatioValue,
	isPortraitAspectRatio,
} from "@/utils/aspectRatioUtils";
import { EditorStartScreen } from "./EditorStartScreen";
import { ExportDialog } from "./ExportDialog";
import PlaybackControls from "./PlaybackControls";
import {
	createProjectData,
	createProjectSnapshot,
	deriveNextId,
	fromFileUrl,
	hasProjectUnsavedChanges,
	normalizeProjectEditor,
	resolveProjectMedia,
	toFileUrl,
	validateProjectData,
} from "./projectPersistence";
import { SettingsPanel } from "./SettingsPanel";
import { detectSilentIntervals, detectSmartSpeedRegions } from "./smartSpeedUtils";
import TimelineEditor from "./timeline/TimelineEditor";
import {
	type AnnotationRegion,
	type AutoEditBackgroundMode,
	type AutoEditFocusStrategy,
	type AutoEditPauseMode,
	type AutoEditStyle,
	type CursorTelemetryPoint,
	clampFocusToDepth,
	DEFAULT_ANNOTATION_POSITION,
	DEFAULT_ANNOTATION_SIZE,
	DEFAULT_ANNOTATION_STYLE,
	DEFAULT_FIGURE_DATA,
	DEFAULT_PLAYBACK_SPEED,
	DEFAULT_ZOOM_DEPTH,
	type EditMode,
	type FigureData,
	type PlaybackSpeed,
	type SmartSpeedIntensity,
	type SpeedRegion,
	type TrimRegion,
	type ZoomDepth,
	type ZoomFocus,
	type ZoomFocusMode,
	type ZoomRegion,
} from "./types";
import styles from "./VideoEditor.module.css";
import VideoPlayback, { VideoPlaybackRef } from "./VideoPlayback";

interface VideoEditorProps {
	accessPolicy: AuthAccessPolicy;
	onUpgrade: () => Promise<void>;
	onOpenLogin?: () => Promise<void>;
	onOpenSignup?: () => Promise<void>;
}

export default function VideoEditor({
	accessPolicy,
	onUpgrade,
	onOpenLogin,
	onOpenSignup,
}: VideoEditorProps) {
	const {
		state: editorState,
		pushState,
		updateState,
		commitState,
		undo,
		redo,
	} = useEditorHistory(INITIAL_EDITOR_STATE);

	const {
		zoomRegions,
		trimRegions,
		speedRegions,
		annotationRegions,
		cropRegion,
		wallpaper,
		shadowIntensity,
		showBlur,
		motionBlurAmount,
		borderRadius,
		padding,
		editMode,
		smartSpeedEnabled,
		smartSpeedIntensity,
		aspectRatio,
		webcamLayoutPreset,
		webcamMaskShape,
		webcamPosition,
	} = editorState;

	// ── Non-undoable state
	const [videoPath, setVideoPath] = useState<string | null>(null);
	const [videoSourcePath, setVideoSourcePath] = useState<string | null>(null);
	const [webcamVideoPath, setWebcamVideoPath] = useState<string | null>(null);
	const [webcamVideoSourcePath, setWebcamVideoSourcePath] = useState<string | null>(null);
	const [currentProjectPath, setCurrentProjectPath] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const currentTimeRef = useRef(currentTime);
	currentTimeRef.current = currentTime;
	const durationRef = useRef(duration);
	durationRef.current = duration;
	const [cursorTelemetry, setCursorTelemetry] = useState<CursorTelemetryPoint[]>([]);
	const [silentIntervals, setSilentIntervals] = useState<Array<{ startMs: number; endMs: number }>>(
		[],
	);
	const [interactionClicks, setInteractionClicks] = useState<InteractionClickSample[]>([]);
	const [interactionKeys, setInteractionKeys] = useState<InteractionKeySample[]>([]);
	const [selectedZoomId, setSelectedZoomId] = useState<string | null>(null);
	const [selectedTrimId, setSelectedTrimId] = useState<string | null>(null);
	const [selectedSpeedId, setSelectedSpeedId] = useState<string | null>(null);
	const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
	const [isExporting, setIsExporting] = useState(false);
	const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
	const [exportError, setExportError] = useState<string | null>(null);
	const [showExportDialog, setShowExportDialog] = useState(false);
	const [showNewRecordingDialog, setShowNewRecordingDialog] = useState(false);
	const [showMcpSettingsDialog, setShowMcpSettingsDialog] = useState(false);
	const [exportQuality, setExportQuality] = useState<ExportQuality>("good");
	const [exportFormat, setExportFormat] = useState<ExportFormat>("mp4");
	const [gifFrameRate, setGifFrameRate] = useState<GifFrameRate>(15);
	const [gifLoop, setGifLoop] = useState(true);
	const [gifSizePreset, setGifSizePreset] = useState<GifSizePreset>("medium");
	const [exportedFilePath, setExportedFilePath] = useState<string | null>(null);
	const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string | null>(null);
	const [unsavedExport, setUnsavedExport] = useState<{
		arrayBuffer: ArrayBuffer;
		fileName: string;
		format: string;
	} | null>(null);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [showSettingsPanel, setShowSettingsPanel] = useState(true);
	const [requestedSettingsSection, setRequestedSettingsSection] = useState<"mcp" | null>(null);
	const [autoEditStyle, setAutoEditStyle] = useState<AutoEditStyle>("balanced");
	const [autoEditFocusStrategy, setAutoEditFocusStrategy] =
		useState<AutoEditFocusStrategy>("cursor");
	const [autoEditPauseMode, setAutoEditPauseMode] = useState<AutoEditPauseMode>("balanced");
	const [autoEditBackgroundMode, setAutoEditBackgroundMode] =
		useState<AutoEditBackgroundMode>("keep");
	const [mcpConnectionInfo, setMcpConnectionInfo] = useState<{
		enabled: boolean;
		url: string;
		token: string;
	}>({
		enabled: false,
		url: "",
		token: "",
	});
	const [mcpConnectionStatus, setMcpConnectionStatus] = useState<{
		tone: "neutral" | "success" | "error";
		message: string;
	} | null>(null);

	const playerContainerRef = useRef<HTMLDivElement>(null);
	const videoPlaybackRef = useRef<VideoPlaybackRef>(null);

	const nextZoomIdRef = useRef(1);
	const nextTrimIdRef = useRef(1);
	const nextSpeedIdRef = useRef(1);

	const { shortcuts, isMac } = useShortcuts();
	const t = useScopedT("editor");
	const ts = useScopedT("settings");
	const { locale, setLocale } = useI18n();
	const showGuestAuthActions = accessPolicy.mode === "guest";
	const canOpenMcpSettings = accessPolicy.mode === "pro";

	const nextAnnotationIdRef = useRef(1);
	const nextAnnotationZIndexRef = useRef(1);
	const exporterRef = useRef<VideoExporter | null>(null);
	const agentExportInvokerRef = useRef<
		(input: ExportVideoCommandInput) => Promise<ExportVideoCommandResult>
	>(async () => ({
		success: false,
		message: "Export handler not ready",
	}));

	const currentProjectMedia = useMemo<ProjectMedia | null>(() => {
		const screenVideoPath = videoSourcePath ?? (videoPath ? fromFileUrl(videoPath) : null);
		if (!screenVideoPath) {
			return null;
		}

		const webcamSourcePath =
			webcamVideoSourcePath ?? (webcamVideoPath ? fromFileUrl(webcamVideoPath) : null);
		return webcamSourcePath
			? { screenVideoPath, webcamVideoPath: webcamSourcePath }
			: { screenVideoPath };
	}, [videoPath, videoSourcePath, webcamVideoPath, webcamVideoSourcePath]);

	const applyLoadedProject = useCallback(
		async (candidate: unknown, path?: string | null) => {
			if (!validateProjectData(candidate)) {
				return false;
			}

			const project = candidate;
			const media = resolveProjectMedia(project);
			if (!media) {
				return false;
			}
			const sourcePath = fromFileUrl(media.screenVideoPath);
			const webcamSourcePath = media.webcamVideoPath ? fromFileUrl(media.webcamVideoPath) : null;
			const normalizedEditor = normalizeProjectEditor(project.editor);

			try {
				videoPlaybackRef.current?.pause();
			} catch {
				// no-op
			}
			setIsPlaying(false);
			setCurrentTime(0);
			setDuration(0);

			setError(null);
			setVideoSourcePath(sourcePath);
			setVideoPath(toFileUrl(sourcePath));
			setWebcamVideoSourcePath(webcamSourcePath);
			setWebcamVideoPath(webcamSourcePath ? toFileUrl(webcamSourcePath) : null);
			setCurrentProjectPath(path ?? null);

			pushState({
				wallpaper: normalizedEditor.wallpaper,
				shadowIntensity: normalizedEditor.shadowIntensity,
				showBlur: normalizedEditor.showBlur,
				motionBlurAmount: normalizedEditor.motionBlurAmount,
				borderRadius: normalizedEditor.borderRadius,
				padding: normalizedEditor.padding,
				editMode: normalizedEditor.editMode,
				smartSpeedEnabled: normalizedEditor.smartSpeedEnabled,
				smartSpeedIntensity: normalizedEditor.smartSpeedIntensity,
				cropRegion: normalizedEditor.cropRegion,
				zoomRegions: normalizedEditor.zoomRegions,
				trimRegions: normalizedEditor.trimRegions,
				speedRegions: normalizedEditor.speedRegions,
				annotationRegions: normalizedEditor.annotationRegions,
				aspectRatio: normalizedEditor.aspectRatio,
				webcamLayoutPreset: normalizedEditor.webcamLayoutPreset,
				webcamMaskShape: normalizedEditor.webcamMaskShape,
				webcamPosition: normalizedEditor.webcamPosition,
			});
			setExportQuality(normalizedEditor.exportQuality);
			setExportFormat(normalizedEditor.exportFormat);
			setGifFrameRate(normalizedEditor.gifFrameRate);
			setGifLoop(normalizedEditor.gifLoop);
			setGifSizePreset(normalizedEditor.gifSizePreset);

			setSelectedZoomId(null);
			setSelectedTrimId(null);
			setSelectedSpeedId(null);
			setSelectedAnnotationId(null);

			nextZoomIdRef.current = deriveNextId(
				"zoom",
				normalizedEditor.zoomRegions.map((region) => region.id),
			);
			nextTrimIdRef.current = deriveNextId(
				"trim",
				normalizedEditor.trimRegions.map((region) => region.id),
			);
			nextSpeedIdRef.current = deriveNextId(
				"speed",
				normalizedEditor.speedRegions.map((region) => region.id),
			);
			nextAnnotationIdRef.current = deriveNextId(
				"annotation",
				normalizedEditor.annotationRegions.map((region) => region.id),
			);
			nextAnnotationZIndexRef.current =
				normalizedEditor.annotationRegions.reduce(
					(max, region) => Math.max(max, region.zIndex),
					0,
				) + 1;

			setLastSavedSnapshot(
				createProjectSnapshot(
					webcamSourcePath
						? { screenVideoPath: sourcePath, webcamVideoPath: webcamSourcePath }
						: { screenVideoPath: sourcePath },
					normalizedEditor,
				),
			);
			return true;
		},
		[pushState],
	);

	const currentProjectSnapshot = useMemo(() => {
		if (!currentProjectMedia) {
			return null;
		}
		return createProjectSnapshot(currentProjectMedia, {
			wallpaper,
			shadowIntensity,
			showBlur,
			motionBlurAmount,
			borderRadius,
			padding,
			editMode,
			smartSpeedEnabled,
			smartSpeedIntensity,
			cropRegion,
			zoomRegions,
			trimRegions,
			speedRegions,
			annotationRegions,
			aspectRatio,
			webcamLayoutPreset,
			webcamMaskShape,
			webcamPosition,
			exportQuality,
			exportFormat,
			gifFrameRate,
			gifLoop,
			gifSizePreset,
		});
	}, [
		currentProjectMedia,
		wallpaper,
		shadowIntensity,
		showBlur,
		motionBlurAmount,
		borderRadius,
		padding,
		editMode,
		smartSpeedEnabled,
		smartSpeedIntensity,
		cropRegion,
		zoomRegions,
		trimRegions,
		speedRegions,
		annotationRegions,
		aspectRatio,
		webcamLayoutPreset,
		webcamMaskShape,
		webcamPosition,
		exportQuality,
		exportFormat,
		gifFrameRate,
		gifLoop,
		gifSizePreset,
	]);

	const hasUnsavedChanges = hasProjectUnsavedChanges(currentProjectSnapshot, lastSavedSnapshot);

	useEffect(() => {
		async function loadInitialData() {
			try {
				const currentProjectResult = await window.electronAPI.loadCurrentProjectFile();
				if (currentProjectResult.success && currentProjectResult.project) {
					const restored = await applyLoadedProject(
						currentProjectResult.project,
						currentProjectResult.path ?? null,
					);
					if (restored) {
						return;
					}
				}

				const currentSessionResult = await window.electronAPI.getCurrentRecordingSession();
				if (currentSessionResult.success && currentSessionResult.session) {
					const session = currentSessionResult.session;
					const sourcePath = fromFileUrl(session.screenVideoPath);
					const webcamSourcePath = session.webcamVideoPath
						? fromFileUrl(session.webcamVideoPath)
						: null;
					setVideoSourcePath(sourcePath);
					setVideoPath(toFileUrl(sourcePath));
					setWebcamVideoSourcePath(webcamSourcePath);
					setWebcamVideoPath(webcamSourcePath ? toFileUrl(webcamSourcePath) : null);
					setCurrentProjectPath(null);
					setLastSavedSnapshot(
						createProjectSnapshot(
							webcamSourcePath
								? { screenVideoPath: sourcePath, webcamVideoPath: webcamSourcePath }
								: { screenVideoPath: sourcePath },
							INITIAL_EDITOR_STATE,
						),
					);
					return;
				}

				const result = await window.electronAPI.getCurrentVideoPath();
				if (result.success && result.path) {
					const sourcePath = fromFileUrl(result.path);
					setVideoSourcePath(sourcePath);
					setVideoPath(toFileUrl(sourcePath));
					setWebcamVideoSourcePath(null);
					setWebcamVideoPath(null);
					setCurrentProjectPath(null);
					setLastSavedSnapshot(
						createProjectSnapshot({ screenVideoPath: sourcePath }, INITIAL_EDITOR_STATE),
					);
				} else {
					setError(null);
				}
			} catch (err) {
				setError("Error loading video: " + String(err));
			} finally {
				setLoading(false);
			}
		}

		loadInitialData();
	}, [applyLoadedProject]);

	// Track whether user preferences have been loaded to avoid
	// overwriting saved prefs with defaults on the first render
	const [prefsHydrated, setPrefsHydrated] = useState(false);

	// Load persisted user preferences on mount (intentionally runs once)
	useEffect(() => {
		const prefs = loadUserPreferences();
		updateState({
			padding: prefs.padding,
			aspectRatio: prefs.aspectRatio,
		});
		setExportQuality(prefs.exportQuality);
		setExportFormat(prefs.exportFormat);
		setShowSettingsPanel(prefs.showSettingsPanel);
		setPrefsHydrated(true);
	}, [updateState]);

	// Auto-save user preferences when settings change
	useEffect(() => {
		if (!prefsHydrated) return;
		saveUserPreferences({ padding, aspectRatio, exportQuality, exportFormat, showSettingsPanel });
	}, [prefsHydrated, padding, aspectRatio, exportQuality, exportFormat, showSettingsPanel]);

	const saveProject = useCallback(
		async (forceSaveAs: boolean) => {
			if (!videoPath) {
				toast.error(t("errors.noVideoLoaded"));
				return false;
			}

			if (!currentProjectMedia) {
				toast.error(t("errors.unableToDetermineSourcePath"));
				return false;
			}

			const projectData = createProjectData(currentProjectMedia, {
				wallpaper,
				shadowIntensity,
				showBlur,
				motionBlurAmount,
				borderRadius,
				padding,
				editMode,
				smartSpeedEnabled,
				smartSpeedIntensity,
				cropRegion,
				zoomRegions,
				trimRegions,
				speedRegions,
				annotationRegions,
				aspectRatio,
				webcamLayoutPreset,
				webcamMaskShape,
				webcamPosition,
				exportQuality,
				exportFormat,
				gifFrameRate,
				gifLoop,
				gifSizePreset,
			});

			const fileNameBase =
				currentProjectMedia.screenVideoPath
					.split(/[\\/]/)
					.pop()
					?.replace(/\.[^.]+$/, "") || `project-${Date.now()}`;
			const projectSnapshot = JSON.stringify(projectData);
			const result = await window.electronAPI.saveProjectFile(
				projectData,
				fileNameBase,
				forceSaveAs ? undefined : (currentProjectPath ?? undefined),
			);

			if (result.canceled) {
				toast.info(t("project.saveCanceled"));
				return false;
			}

			if (!result.success) {
				toast.error(result.message || t("project.failedToSave"));
				return false;
			}

			if (result.path) {
				setCurrentProjectPath(result.path);
			}
			setLastSavedSnapshot(projectSnapshot);

			toast.success(t("project.savedTo", { path: result.path ?? "" }));
			return true;
		},
		[
			currentProjectMedia,
			currentProjectPath,
			wallpaper,
			shadowIntensity,
			showBlur,
			motionBlurAmount,
			borderRadius,
			padding,
			editMode,
			smartSpeedEnabled,
			smartSpeedIntensity,
			cropRegion,
			zoomRegions,
			trimRegions,
			speedRegions,
			annotationRegions,
			aspectRatio,
			webcamLayoutPreset,
			webcamMaskShape,
			webcamPosition,
			exportQuality,
			exportFormat,
			gifFrameRate,
			gifLoop,
			gifSizePreset,
			videoPath,
			t,
		],
	);

	useEffect(() => {
		window.electronAPI.setHasUnsavedChanges(hasUnsavedChanges);
	}, [hasUnsavedChanges]);

	useEffect(() => {
		const cleanup = window.electronAPI.onRequestSaveBeforeClose(async () => {
			return saveProject(false);
		});
		return () => cleanup();
	}, [saveProject]);

	const handleSaveProject = useCallback(async () => {
		await saveProject(false);
	}, [saveProject]);

	const handleSaveProjectAs = useCallback(async () => {
		await saveProject(true);
	}, [saveProject]);

	const handleNewRecordingConfirm = useCallback(async () => {
		const result = await window.electronAPI.startNewRecording();
		if (result.success) {
			setShowNewRecordingDialog(false);
		} else {
			console.error("Failed to start new recording:", result.error);
			setError("Failed to start new recording: " + (result.error || "Unknown error"));
		}
	}, []);

	const handleImportVideo = useCallback(async () => {
		const result = await window.electronAPI.openVideoFilePicker();
		if (result.canceled) {
			return;
		}

		if (!result.success || !result.path) {
			toast.error(t("project.failedToLoad"));
			return;
		}

		const sourcePath = fromFileUrl(result.path);
		setVideoSourcePath(sourcePath);
		setVideoPath(toFileUrl(sourcePath));
		setWebcamVideoSourcePath(null);
		setWebcamVideoPath(null);
		setCurrentProjectPath(null);
		setError(null);
		setLastSavedSnapshot(
			createProjectSnapshot({ screenVideoPath: sourcePath }, INITIAL_EDITOR_STATE),
		);
		await window.electronAPI.setCurrentVideoPath(result.path);
	}, [t]);

	const handleLoadProject = useCallback(async () => {
		const result = await window.electronAPI.loadProjectFile();

		if (result.canceled) {
			return;
		}

		if (!result.success) {
			toast.error(result.message || "Failed to load project");
			return;
		}

		const restored = await applyLoadedProject(result.project, result.path ?? null);
		if (!restored) {
			toast.error("Invalid project file format");
			return;
		}

		toast.success(`Project loaded from ${result.path}`);
	}, [applyLoadedProject]);

	useEffect(() => {
		const removeLoadListener = window.electronAPI.onMenuLoadProject(handleLoadProject);
		const removeSaveListener = window.electronAPI.onMenuSaveProject(handleSaveProject);
		const removeSaveAsListener = window.electronAPI.onMenuSaveProjectAs(handleSaveProjectAs);

		return () => {
			removeLoadListener?.();
			removeSaveListener?.();
			removeSaveAsListener?.();
		};
	}, [handleLoadProject, handleSaveProject, handleSaveProjectAs]);

	useEffect(() => {
		window.electronAPI
			.getMcpConnectionInfo()
			.then((info) => {
				setMcpConnectionInfo(info);
				setMcpConnectionStatus(
					info.enabled
						? {
								tone: "neutral",
								message:
									"앱 내부 MCP 서버가 준비되었습니다. 연결 상태를 눌러 실제 응답까지 확인하세요.",
							}
						: { tone: "error", message: "MCP 연결 정보를 아직 가져오지 못했습니다." },
				);
			})
			.catch(() => {
				setMcpConnectionInfo({ enabled: false, url: "", token: "" });
				setMcpConnectionStatus({ tone: "error", message: "MCP 연결 정보를 불러오지 못했습니다." });
			});
	}, []);

	useEffect(() => {
		let mounted = true;

		async function loadCursorTelemetry() {
			const sourcePath = currentProjectMedia?.screenVideoPath ?? null;

			if (!sourcePath) {
				if (mounted) {
					setCursorTelemetry([]);
				}
				return;
			}

			try {
				const result = await window.electronAPI.getCursorTelemetry(sourcePath);
				if (mounted) {
					setCursorTelemetry(result.success ? result.samples : []);
				}
			} catch (telemetryError) {
				console.warn("Unable to load cursor telemetry:", telemetryError);
				if (mounted) {
					setCursorTelemetry([]);
				}
			}
		}

		loadCursorTelemetry();

		return () => {
			mounted = false;
		};
	}, [currentProjectMedia]);

	useEffect(() => {
		let mounted = true;

		async function loadInteractionTelemetry() {
			const sourcePath = currentProjectMedia?.screenVideoPath ?? null;
			if (!sourcePath) {
				if (mounted) {
					setInteractionClicks([]);
					setInteractionKeys([]);
				}
				return;
			}
			try {
				const result = await window.electronAPI.getInteractionTelemetry(sourcePath);
				if (mounted) {
					setInteractionClicks(result.success ? result.clicks : []);
					setInteractionKeys(result.success ? result.keys : []);
				}
			} catch {
				if (mounted) {
					setInteractionClicks([]);
					setInteractionKeys([]);
				}
			}
		}

		loadInteractionTelemetry();
		return () => {
			mounted = false;
		};
	}, [currentProjectMedia]);

	useEffect(() => {
		let cancelled = false;

		async function loadSilentIntervals() {
			if (!videoPath || duration <= 0 || !smartSpeedEnabled) {
				if (!cancelled) {
					setSilentIntervals([]);
				}
				return;
			}

			const intervals = await detectSilentIntervals({
				videoUrl: videoPath,
				intensity: smartSpeedIntensity as SmartSpeedIntensity,
				totalMs: Math.round(duration * 1000),
			});

			if (!cancelled) {
				setSilentIntervals(intervals);
			}
		}

		loadSilentIntervals();
		return () => {
			cancelled = true;
		};
	}, [videoPath, duration, smartSpeedEnabled, smartSpeedIntensity]);

	const editorController = useEditorController({
		editorState,
		pushState,
		currentProjectMedia,
		currentTimeMs: Math.round(currentTime * 1000),
		durationMs: Math.round(duration * 1000),
		exportFormat,
		exportQuality,
		videoUrl: videoPath,
		cursorTelemetry,
		silentIntervals,
		interactionClicks,
		interactionKeys,
		issueZoomId: () => `zoom-${nextZoomIdRef.current++}`,
		issueTrimId: () => `trim-${nextTrimIdRef.current++}`,
		issueSpeedId: () => `speed-${nextSpeedIdRef.current++}`,
		setSelectedZoomId,
		setSelectedSpeedId,
		setSelectedTrimId,
		setSelectedAnnotationId,
		undo,
		redo,
		exportVideo: (input) => agentExportInvokerRef.current(input),
	});

	useEffect(() => {
		const unsubscribe = window.electronAPI.onEditorCommandRequest(async (request) => {
			try {
				const result = await editorController.executeCommand(
					request.command,
					request.payload as never,
				);
				window.electronAPI.sendEditorCommandResponse({
					requestId: request.requestId,
					success: true,
					command: request.command,
					result,
				});
			} catch (error) {
				window.electronAPI.sendEditorCommandResponse({
					requestId: request.requestId,
					success: false,
					command: request.command,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		});
		return unsubscribe;
	}, [editorController]);

	useEffect(() => {
		window.electronAPI.publishEditorState(editorController.getProjectState());
	}, [
		editorController,
		editorState,
		currentProjectMedia,
		currentTime,
		duration,
		exportFormat,
		exportQuality,
	]);

	const handleRemoveBackground = useCallback(() => {
		editorController.removeBackground();
	}, [editorController]);

	const handleWallpaperChange = useCallback(
		(nextWallpaper: string) => {
			editorController.setBackground(nextWallpaper);
		},
		[editorController],
	);

	const handleApplyAutoEdits = useCallback(async () => {
		try {
			const result = await editorController.applyAutoEdit({
				style: autoEditStyle,
				focusStrategy: autoEditFocusStrategy,
				pauseMode: autoEditPauseMode,
				backgroundMode: autoEditBackgroundMode,
			});

			toast.success(
				result.summary.length > 0
					? `자동 편집 적용: ${result.summary.join(", ")}`
					: "자동 편집에 맞는 구간을 찾지 못했습니다.",
			);
		} catch (error) {
			const message = error instanceof Error ? error.message : "자동 편집을 적용하지 못했습니다.";
			toast.error(message);
		}
	}, [
		autoEditBackgroundMode,
		autoEditFocusStrategy,
		autoEditPauseMode,
		autoEditStyle,
		editorController,
	]);

	function togglePlayPause() {
		const playback = videoPlaybackRef.current;
		const video = playback?.video;
		if (!playback || !video) return;

		if (isPlaying) {
			playback.pause();
		} else {
			playback.play().catch((err) => console.error("Video play failed:", err));
		}
	}

	const toggleFullscreen = useCallback(() => {
		setIsFullscreen((prev) => !prev);
	}, []);

	useEffect(() => {
		if (!isFullscreen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setIsFullscreen(false);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isFullscreen]);

	function handleSeek(time: number) {
		const video = videoPlaybackRef.current?.video;
		if (!video) return;
		video.currentTime = time;
	}

	const handleSelectZoom = useCallback((id: string | null) => {
		setSelectedZoomId(id);
		if (id) setSelectedTrimId(null);
	}, []);

	const handleSelectTrim = useCallback((id: string | null) => {
		setSelectedTrimId(id);
		if (id) {
			setSelectedZoomId(null);
			setSelectedAnnotationId(null);
		}
	}, []);

	const handleSelectAnnotation = useCallback((id: string | null) => {
		setSelectedAnnotationId(id);
		if (id) {
			setSelectedZoomId(null);
			setSelectedTrimId(null);
		}
	}, []);

	const handleZoomAdded = useCallback(
		(span: Span) => {
			const id = `zoom-${nextZoomIdRef.current++}`;
			const newRegion: ZoomRegion = {
				id,
				startMs: Math.round(span.start),
				endMs: Math.round(span.end),
				depth: DEFAULT_ZOOM_DEPTH,
				focus: { cx: 0.5, cy: 0.5 },
			};
			pushState((prev) => ({ zoomRegions: [...prev.zoomRegions, newRegion] }));
			setSelectedZoomId(id);
			setSelectedTrimId(null);
			setSelectedAnnotationId(null);
		},
		[pushState],
	);

	const handleZoomSuggested = useCallback(
		(span: Span, focus: ZoomFocus) => {
			const id = `zoom-${nextZoomIdRef.current++}`;
			const newRegion: ZoomRegion = {
				id,
				startMs: Math.round(span.start),
				endMs: Math.round(span.end),
				depth: DEFAULT_ZOOM_DEPTH,
				focus: clampFocusToDepth(focus, DEFAULT_ZOOM_DEPTH),
			};
			pushState((prev) => ({ zoomRegions: [...prev.zoomRegions, newRegion] }));
			setSelectedZoomId(id);
			setSelectedTrimId(null);
			setSelectedAnnotationId(null);
		},
		[pushState],
	);

	const handleTrimAdded = useCallback(
		(span: Span) => {
			const id = `trim-${nextTrimIdRef.current++}`;
			const newRegion: TrimRegion = {
				id,
				startMs: Math.round(span.start),
				endMs: Math.round(span.end),
			};
			pushState((prev) => ({ trimRegions: [...prev.trimRegions, newRegion] }));
			setSelectedTrimId(id);
			setSelectedZoomId(null);
			setSelectedAnnotationId(null);
		},
		[pushState],
	);

	const handleZoomSpanChange = useCallback(
		(id: string, span: Span) => {
			pushState((prev) => ({
				zoomRegions: prev.zoomRegions.map((region) =>
					region.id === id
						? { ...region, startMs: Math.round(span.start), endMs: Math.round(span.end) }
						: region,
				),
			}));
		},
		[pushState],
	);

	const handleTrimSpanChange = useCallback(
		(id: string, span: Span) => {
			pushState((prev) => ({
				trimRegions: prev.trimRegions.map((region) =>
					region.id === id
						? { ...region, startMs: Math.round(span.start), endMs: Math.round(span.end) }
						: region,
				),
			}));
		},
		[pushState],
	);

	// Focus drag: updateState for live preview, commitState on pointer-up
	const handleZoomFocusChange = useCallback(
		(id: string, focus: ZoomFocus) => {
			updateState((prev) => ({
				zoomRegions: prev.zoomRegions.map((region) =>
					region.id === id ? { ...region, focus: clampFocusToDepth(focus, region.depth) } : region,
				),
			}));
		},
		[updateState],
	);

	const handleZoomDepthChange = useCallback(
		(depth: ZoomDepth) => {
			if (!selectedZoomId) return;
			pushState((prev) => ({
				zoomRegions: prev.zoomRegions.map((region) =>
					region.id === selectedZoomId
						? { ...region, depth, focus: clampFocusToDepth(region.focus, depth) }
						: region,
				),
			}));
		},
		[selectedZoomId, pushState],
	);

	const handleZoomFocusModeChange = useCallback(
		(focusMode: ZoomFocusMode) => {
			if (!selectedZoomId) return;
			pushState((prev) => ({
				zoomRegions: prev.zoomRegions.map((region) =>
					region.id === selectedZoomId ? { ...region, focusMode } : region,
				),
			}));
		},
		[selectedZoomId, pushState],
	);

	const handleZoomDelete = useCallback(
		(id: string) => {
			pushState((prev) => ({ zoomRegions: prev.zoomRegions.filter((r) => r.id !== id) }));
			if (selectedZoomId === id) {
				setSelectedZoomId(null);
			}
		},
		[selectedZoomId, pushState],
	);

	const handleTrimDelete = useCallback(
		(id: string) => {
			pushState((prev) => ({ trimRegions: prev.trimRegions.filter((r) => r.id !== id) }));
			if (selectedTrimId === id) {
				setSelectedTrimId(null);
			}
		},
		[selectedTrimId, pushState],
	);

	const handleSelectSpeed = useCallback((id: string | null) => {
		if (id?.startsWith("smart-speed-")) {
			setSelectedSpeedId(null);
			return;
		}
		setSelectedSpeedId(id);
		if (id) {
			setSelectedZoomId(null);
			setSelectedTrimId(null);
			setSelectedAnnotationId(null);
		}
	}, []);

	const handleSpeedAdded = useCallback(
		(span: Span) => {
			const id = `speed-${nextSpeedIdRef.current++}`;
			const newRegion: SpeedRegion = {
				id,
				startMs: Math.round(span.start),
				endMs: Math.round(span.end),
				speed: DEFAULT_PLAYBACK_SPEED,
			};
			pushState((prev) => ({ speedRegions: [...prev.speedRegions, newRegion] }));
			setSelectedSpeedId(id);
			setSelectedZoomId(null);
			setSelectedTrimId(null);
			setSelectedAnnotationId(null);
		},
		[pushState],
	);

	const handleSpeedSpanChange = useCallback(
		(id: string, span: Span) => {
			pushState((prev) => ({
				speedRegions: prev.speedRegions.map((region) =>
					region.id === id
						? {
								...region,
								startMs: Math.round(span.start),
								endMs: Math.round(span.end),
							}
						: region,
				),
			}));
		},
		[pushState],
	);

	const handleSpeedDelete = useCallback(
		(id: string) => {
			pushState((prev) => ({
				speedRegions: prev.speedRegions.filter((region) => region.id !== id),
			}));
			if (selectedSpeedId === id) {
				setSelectedSpeedId(null);
			}
		},
		[selectedSpeedId, pushState],
	);

	const handleSpeedChange = useCallback(
		(speed: PlaybackSpeed) => {
			if (!selectedSpeedId) return;
			pushState((prev) => ({
				speedRegions: prev.speedRegions.map((region) =>
					region.id === selectedSpeedId ? { ...region, speed } : region,
				),
			}));
		},
		[selectedSpeedId, pushState],
	);

	const effectiveSpeedRegions = useMemo(() => {
		const smartRegions = detectSmartSpeedRegions({
			cursorTelemetry,
			silentIntervals,
			keySamples: interactionKeys,
			zoomRegions,
			trimRegions,
			speedRegions,
			totalMs: Math.round(duration * 1000),
			enabled: smartSpeedEnabled,
			intensity: smartSpeedIntensity as SmartSpeedIntensity,
		});

		return [...speedRegions, ...smartRegions].sort((a, b) => a.startMs - b.startMs);
	}, [
		cursorTelemetry,
		silentIntervals,
		interactionKeys,
		zoomRegions,
		trimRegions,
		speedRegions,
		duration,
		smartSpeedEnabled,
		smartSpeedIntensity,
	]);

	const handleAnnotationAdded = useCallback(
		(span: Span) => {
			const id = `annotation-${nextAnnotationIdRef.current++}`;
			const zIndex = nextAnnotationZIndexRef.current++;
			const newRegion: AnnotationRegion = {
				id,
				startMs: Math.round(span.start),
				endMs: Math.round(span.end),
				type: "text",
				content: "Enter text...",
				position: { ...DEFAULT_ANNOTATION_POSITION },
				size: { ...DEFAULT_ANNOTATION_SIZE },
				style: { ...DEFAULT_ANNOTATION_STYLE },
				zIndex,
			};
			pushState((prev) => ({ annotationRegions: [...prev.annotationRegions, newRegion] }));
			setSelectedAnnotationId(id);
			setSelectedZoomId(null);
			setSelectedTrimId(null);
		},
		[pushState],
	);

	const handleAnnotationSpanChange = useCallback(
		(id: string, span: Span) => {
			pushState((prev) => ({
				annotationRegions: prev.annotationRegions.map((region) =>
					region.id === id
						? { ...region, startMs: Math.round(span.start), endMs: Math.round(span.end) }
						: region,
				),
			}));
		},
		[pushState],
	);

	const handleAnnotationDelete = useCallback(
		(id: string) => {
			pushState((prev) => ({
				annotationRegions: prev.annotationRegions.filter((r) => r.id !== id),
			}));
			if (selectedAnnotationId === id) {
				setSelectedAnnotationId(null);
			}
		},
		[selectedAnnotationId, pushState],
	);

	const handleAnnotationContentChange = useCallback(
		(id: string, content: string) => {
			pushState((prev) => ({
				annotationRegions: prev.annotationRegions.map((region) => {
					if (region.id !== id) return region;
					if (region.type === "text") {
						return { ...region, content, textContent: content };
					} else if (region.type === "image") {
						return { ...region, content, imageContent: content };
					}
					return { ...region, content };
				}),
			}));
		},
		[pushState],
	);

	const handleAnnotationTypeChange = useCallback(
		(id: string, type: AnnotationRegion["type"]) => {
			pushState((prev) => ({
				annotationRegions: prev.annotationRegions.map((region) => {
					if (region.id !== id) return region;
					const updatedRegion = { ...region, type };
					if (type === "text") {
						updatedRegion.content = region.textContent || "Enter text...";
					} else if (type === "image") {
						updatedRegion.content = region.imageContent || "";
					} else if (type === "figure") {
						updatedRegion.content = "";
						if (!region.figureData) {
							updatedRegion.figureData = { ...DEFAULT_FIGURE_DATA };
						}
					}
					return updatedRegion;
				}),
			}));
		},
		[pushState],
	);

	const handleAnnotationStyleChange = useCallback(
		(id: string, style: Partial<AnnotationRegion["style"]>) => {
			pushState((prev) => ({
				annotationRegions: prev.annotationRegions.map((region) =>
					region.id === id ? { ...region, style: { ...region.style, ...style } } : region,
				),
			}));
		},
		[pushState],
	);

	const handleAnnotationFigureDataChange = useCallback(
		(id: string, figureData: FigureData) => {
			pushState((prev) => ({
				annotationRegions: prev.annotationRegions.map((region) =>
					region.id === id ? { ...region, figureData } : region,
				),
			}));
		},
		[pushState],
	);

	const handleAnnotationPositionChange = useCallback(
		(id: string, position: { x: number; y: number }) => {
			pushState((prev) => ({
				annotationRegions: prev.annotationRegions.map((region) =>
					region.id === id ? { ...region, position } : region,
				),
			}));
		},
		[pushState],
	);

	const handleAnnotationSizeChange = useCallback(
		(id: string, size: { width: number; height: number }) => {
			pushState((prev) => ({
				annotationRegions: prev.annotationRegions.map((region) =>
					region.id === id ? { ...region, size } : region,
				),
			}));
		},
		[pushState],
	);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const mod = e.ctrlKey || e.metaKey;
			const key = e.key.toLowerCase();

			if (mod && key === "z" && !e.shiftKey) {
				e.preventDefault();
				e.stopPropagation();
				undo();
				return;
			}
			if (mod && (key === "y" || (key === "z" && e.shiftKey))) {
				e.preventDefault();
				e.stopPropagation();
				redo();
				return;
			}

			// Frame-step navigation (arrow keys, no modifiers)
			if (
				(e.key === "ArrowLeft" || e.key === "ArrowRight") &&
				!e.ctrlKey &&
				!e.metaKey &&
				!e.shiftKey &&
				!e.altKey
			) {
				const target = e.target;
				if (
					target instanceof HTMLInputElement ||
					target instanceof HTMLTextAreaElement ||
					target instanceof HTMLSelectElement ||
					(target instanceof HTMLElement &&
						(target.isContentEditable ||
							target.closest('[role="separator"], [role="slider"], [role="spinbutton"]')))
				) {
					return;
				}
				e.preventDefault();
				const video = videoPlaybackRef.current?.video;
				if (!video) {
					return;
				}
				const direction = e.key === "ArrowLeft" ? "backward" : "forward";
				const newTime = computeFrameStepTime(
					video.currentTime,
					Number.isFinite(video.duration) ? video.duration : durationRef.current,
					direction,
				);
				video.currentTime = newTime;
				return;
			}

			const isInput =
				e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;

			if (e.key === "Tab" && !isInput) {
				e.preventDefault();
			}

			if (matchesShortcut(e, shortcuts.playPause, isMac)) {
				// Allow space only in inputs/textareas
				if (isInput) {
					return;
				}
				e.preventDefault();
				const playback = videoPlaybackRef.current;
				if (playback?.video) {
					playback.video.paused ? playback.play().catch(console.error) : playback.pause();
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown, { capture: true });
		return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
	}, [undo, redo, shortcuts, isMac]);

	useEffect(() => {
		if (selectedZoomId && !zoomRegions.some((region) => region.id === selectedZoomId)) {
			setSelectedZoomId(null);
		}
	}, [selectedZoomId, zoomRegions]);

	useEffect(() => {
		if (selectedTrimId && !trimRegions.some((region) => region.id === selectedTrimId)) {
			setSelectedTrimId(null);
		}
	}, [selectedTrimId, trimRegions]);

	useEffect(() => {
		if (
			selectedAnnotationId &&
			!annotationRegions.some((region) => region.id === selectedAnnotationId)
		) {
			setSelectedAnnotationId(null);
		}
	}, [selectedAnnotationId, annotationRegions]);

	useEffect(() => {
		if (selectedSpeedId && !speedRegions.some((region) => region.id === selectedSpeedId)) {
			setSelectedSpeedId(null);
		}
	}, [selectedSpeedId, speedRegions]);

	const handleShowExportedFile = useCallback(async (filePath: string) => {
		try {
			const result = await window.electronAPI.revealInFolder(filePath);
			if (!result.success) {
				const errorMessage = result.error || result.message || "Failed to reveal item in folder.";
				console.error("Failed to reveal in folder:", errorMessage);
				toast.error(errorMessage);
			}
		} catch (error) {
			const errorMessage = String(error);
			console.error("Error calling revealInFolder IPC:", errorMessage);
			toast.error(`Error revealing in folder: ${errorMessage}`);
		}
	}, []);

	const handleExportSaved = useCallback(
		(formatLabel: "GIF" | "Video", filePath: string) => {
			setExportedFilePath(filePath);
			toast.success(`${formatLabel} exported successfully`, {
				description: filePath,
				action: {
					label: "Show in Folder",
					onClick: () => {
						void handleShowExportedFile(filePath);
					},
				},
			});
		},
		[handleShowExportedFile],
	);

	const handleSaveUnsavedExport = useCallback(async () => {
		if (!unsavedExport) return;
		if (!accessPolicy.canExport) {
			toast.error(accessPolicy.message || "현재 플랜에서는 내보내기를 사용할 수 없습니다.");
			await onUpgrade();
			return;
		}
		try {
			const saveResult = await window.electronAPI.saveExportedVideo(
				unsavedExport.arrayBuffer,
				unsavedExport.fileName,
			);
			if (saveResult.canceled) {
				toast.info("Export canceled");
			} else if (saveResult.success && saveResult.path) {
				setUnsavedExport(null);
				handleExportSaved(unsavedExport.format === "gif" ? "GIF" : "Video", saveResult.path);
			} else {
				toast.error(saveResult.message || "Failed to save export");
			}
		} catch (error) {
			console.error("Error saving unsaved export:", error);
			toast.error("Failed to save exported video");
		}
	}, [unsavedExport, handleExportSaved]);

	const handleExport = useCallback(
		async (settings: ExportSettings) => {
			if (!accessPolicy.canExport) {
				toast.error(accessPolicy.message || "현재 플랜에서는 내보내기를 사용할 수 없습니다.");
				await onUpgrade();
				return;
			}

			if (!videoPath) {
				toast.error("No video loaded");
				return;
			}

			const video = videoPlaybackRef.current?.video;
			if (!video) {
				toast.error("Video not ready");
				return;
			}

			setIsExporting(true);
			setExportProgress(null);
			setExportError(null);
			setExportedFilePath(null);

			try {
				const wasPlaying = isPlaying;
				if (wasPlaying) {
					videoPlaybackRef.current?.pause();
				}

				const sourceWidth = video.videoWidth || 1920;
				const sourceHeight = video.videoHeight || 1080;
				const aspectRatioValue =
					aspectRatio === "native"
						? getNativeAspectRatioValue(sourceWidth, sourceHeight, cropRegion)
						: getAspectRatioValue(aspectRatio);

				// Get preview CONTAINER dimensions for scaling
				const playbackRef = videoPlaybackRef.current;
				const containerElement = playbackRef?.containerRef?.current;
				const previewWidth = containerElement?.clientWidth || 1920;
				const previewHeight = containerElement?.clientHeight || 1080;

				if (settings.format === "gif" && settings.gifConfig) {
					// GIF Export
					const gifExporter = new GifExporter({
						videoUrl: videoPath,
						webcamVideoUrl: webcamVideoPath || undefined,
						width: settings.gifConfig.width,
						height: settings.gifConfig.height,
						frameRate: settings.gifConfig.frameRate,
						loop: settings.gifConfig.loop,
						sizePreset: settings.gifConfig.sizePreset,
						wallpaper,
						zoomRegions,
						trimRegions,
						speedRegions: effectiveSpeedRegions,
						showShadow: shadowIntensity > 0,
						shadowIntensity,
						showBlur,
						motionBlurAmount,
						borderRadius,
						padding,
						videoPadding: padding,
						cropRegion,
						annotationRegions,
						webcamLayoutPreset,
						webcamMaskShape,
						webcamPosition,
						previewWidth,
						previewHeight,
						cursorTelemetry,
						interactionClicks,
						onProgress: (progress: ExportProgress) => {
							setExportProgress(progress);
						},
					});

					exporterRef.current = gifExporter as unknown as VideoExporter;
					const result = await gifExporter.export();

					if (result.success && result.blob) {
						const arrayBuffer = await result.blob.arrayBuffer();
						const timestamp = Date.now();
						const fileName = `export-${timestamp}.gif`;

						const saveResult = await window.electronAPI.saveExportedVideo(arrayBuffer, fileName);

						if (saveResult.canceled) {
							setUnsavedExport({ arrayBuffer, fileName, format: "gif" });
							toast.info("Export canceled");
						} else if (saveResult.success && saveResult.path) {
							setUnsavedExport(null);
							handleExportSaved("GIF", saveResult.path);
						} else {
							setExportError(saveResult.message || "Failed to save GIF");
							toast.error(saveResult.message || "Failed to save GIF");
						}
					} else {
						setExportError(result.error || "GIF export failed");
						toast.error(result.error || "GIF export failed");
					}
				} else {
					// MP4 Export
					const quality = settings.quality || exportQuality;
					let exportWidth: number;
					let exportHeight: number;
					let bitrate: number;

					if (quality === "source") {
						// Use source resolution
						exportWidth = sourceWidth;
						exportHeight = sourceHeight;

						if (aspectRatioValue === 1) {
							// Square (1:1): use smaller dimension to avoid codec limits
							const baseDimension = Math.floor(Math.min(sourceWidth, sourceHeight) / 2) * 2;
							exportWidth = baseDimension;
							exportHeight = baseDimension;
						} else if (aspectRatioValue > 1) {
							// Landscape: find largest even dimensions that exactly match aspect ratio
							const baseWidth = Math.floor(sourceWidth / 2) * 2;
							let found = false;
							for (let w = baseWidth; w >= 100 && !found; w -= 2) {
								const h = Math.round(w / aspectRatioValue);
								if (h % 2 === 0 && Math.abs(w / h - aspectRatioValue) < 0.0001) {
									exportWidth = w;
									exportHeight = h;
									found = true;
								}
							}
							if (!found) {
								exportWidth = baseWidth;
								exportHeight = Math.floor(baseWidth / aspectRatioValue / 2) * 2;
							}
						} else {
							// Portrait: find largest even dimensions that exactly match aspect ratio
							const baseHeight = Math.floor(sourceHeight / 2) * 2;
							let found = false;
							for (let h = baseHeight; h >= 100 && !found; h -= 2) {
								const w = Math.round(h * aspectRatioValue);
								if (w % 2 === 0 && Math.abs(w / h - aspectRatioValue) < 0.0001) {
									exportWidth = w;
									exportHeight = h;
									found = true;
								}
							}
							if (!found) {
								exportHeight = baseHeight;
								exportWidth = Math.floor((baseHeight * aspectRatioValue) / 2) * 2;
							}
						}

						// Calculate visually lossless bitrate matching screen recording optimization
						const totalPixels = exportWidth * exportHeight;
						bitrate = 30_000_000;
						if (totalPixels > 1920 * 1080 && totalPixels <= 2560 * 1440) {
							bitrate = 50_000_000;
						} else if (totalPixels > 2560 * 1440) {
							bitrate = 80_000_000;
						}
					} else {
						// Use quality-based target resolution
						const targetHeight = quality === "medium" ? 720 : 1080;

						// Calculate dimensions maintaining aspect ratio
						exportHeight = Math.floor(targetHeight / 2) * 2;
						exportWidth = Math.floor((exportHeight * aspectRatioValue) / 2) * 2;

						// Adjust bitrate for lower resolutions
						const totalPixels = exportWidth * exportHeight;
						if (totalPixels <= 1280 * 720) {
							bitrate = 10_000_000;
						} else if (totalPixels <= 1920 * 1080) {
							bitrate = 20_000_000;
						} else {
							bitrate = 30_000_000;
						}
					}

					const exporter = new VideoExporter({
						videoUrl: videoPath,
						webcamVideoUrl: webcamVideoPath || undefined,
						width: exportWidth,
						height: exportHeight,
						frameRate: 60,
						bitrate,
						codec: "avc1.640033",
						wallpaper,
						zoomRegions,
						trimRegions,
						speedRegions: effectiveSpeedRegions,
						showShadow: shadowIntensity > 0,
						shadowIntensity,
						showBlur,
						motionBlurAmount,
						borderRadius,
						padding,
						cropRegion,
						annotationRegions,
						webcamLayoutPreset,
						webcamMaskShape,
						webcamPosition,
						previewWidth,
						previewHeight,
						cursorTelemetry,
						interactionClicks,
						onProgress: (progress: ExportProgress) => {
							setExportProgress(progress);
						},
					});

					exporterRef.current = exporter;
					const result = await exporter.export();

					if (result.success && result.blob) {
						const arrayBuffer = await result.blob.arrayBuffer();
						const timestamp = Date.now();
						const fileName = `export-${timestamp}.mp4`;

						const saveResult = await window.electronAPI.saveExportedVideo(arrayBuffer, fileName);

						if (saveResult.canceled) {
							setUnsavedExport({ arrayBuffer, fileName, format: "mp4" });
							toast.info("Export canceled");
						} else if (saveResult.success && saveResult.path) {
							setUnsavedExport(null);
							handleExportSaved("Video", saveResult.path);
						} else {
							setExportError(saveResult.message || "Failed to save video");
							toast.error(saveResult.message || "Failed to save video");
						}
					} else {
						setExportError(result.error || "Export failed");
						toast.error(result.error || "Export failed");
					}
				}

				if (wasPlaying) {
					videoPlaybackRef.current?.play();
				}
			} catch (error) {
				console.error("Export error:", error);
				const errorMessage = error instanceof Error ? error.message : "Unknown error";
				setExportError(errorMessage);
				toast.error(`Export failed: ${errorMessage}`);
			} finally {
				setIsExporting(false);
				exporterRef.current = null;
				// Reset dialog state to ensure it can be opened again on next export
				// This fixes the bug where second export doesn't show save dialog
				setShowExportDialog(false);
				setExportProgress(null);
			}
		},
		[
			videoPath,
			webcamVideoPath,
			wallpaper,
			zoomRegions,
			trimRegions,
			effectiveSpeedRegions,
			shadowIntensity,
			showBlur,
			motionBlurAmount,
			borderRadius,
			padding,
			cropRegion,
			annotationRegions,
			isPlaying,
			aspectRatio,
			webcamLayoutPreset,
			webcamMaskShape,
			webcamPosition,
			exportQuality,
			handleExportSaved,
			cursorTelemetry,
			interactionClicks,
		],
	);

	useEffect(() => {
		agentExportInvokerRef.current = async (input: ExportVideoCommandInput) => {
			await handleExport(input.settings);
			return {
				success: true,
				message: "Export command executed. Check app notifications for the saved path.",
			};
		};
	}, [handleExport]);

	const handleOpenExportDialog = useCallback(async () => {
		if (!accessPolicy.canExport) {
			toast.error(accessPolicy.message || "현재 플랜에서는 내보내기를 사용할 수 없습니다.");
			await onUpgrade();
			return;
		}

		if (!videoPath) {
			toast.error("No video loaded");
			return;
		}

		const video = videoPlaybackRef.current?.video;
		if (!video) {
			toast.error("Video not ready");
			return;
		}

		// Build export settings from current state
		const sourceWidth = video.videoWidth || 1920;
		const sourceHeight = video.videoHeight || 1080;
		const aspectRatioValue =
			aspectRatio === "native"
				? getNativeAspectRatioValue(sourceWidth, sourceHeight, cropRegion)
				: getAspectRatioValue(aspectRatio);
		const gifDimensions = calculateOutputDimensions(
			sourceWidth,
			sourceHeight,
			gifSizePreset,
			GIF_SIZE_PRESETS,
			aspectRatioValue,
		);

		const settings: ExportSettings = {
			format: exportFormat,
			quality: exportFormat === "mp4" ? exportQuality : undefined,
			gifConfig:
				exportFormat === "gif"
					? {
							frameRate: gifFrameRate,
							loop: gifLoop,
							sizePreset: gifSizePreset,
							width: gifDimensions.width,
							height: gifDimensions.height,
						}
					: undefined,
		};

		setShowExportDialog(true);
		setExportError(null);
		setExportedFilePath(null);

		// Start export immediately
		void handleExport(settings);
	}, [
		videoPath,
		exportFormat,
		exportQuality,
		gifFrameRate,
		gifLoop,
		gifSizePreset,
		aspectRatio,
		cropRegion,
		handleExport,
	]);

	const handleCancelExport = useCallback(() => {
		if (exporterRef.current) {
			exporterRef.current.cancel();
			toast.info("Export canceled");
			setShowExportDialog(false);
			setIsExporting(false);
			setExportProgress(null);
			setExportError(null);
			setExportedFilePath(null);
		}
	}, []);

	const handleTestMcpConnection = useCallback(async () => {
		setMcpConnectionStatus({ tone: "neutral", message: "MCP 연결 상태를 확인하고 있습니다..." });
		const result = await window.electronAPI.testMcpConnection();
		setMcpConnectionStatus(
			result.success
				? { tone: "success", message: result.message ?? "MCP 연결이 정상입니다." }
				: { tone: "error", message: result.error ?? "MCP 연결 확인에 실패했습니다." },
		);
	}, []);

	const handleCopyMcpConnection = useCallback(async () => {
		if (!mcpConnectionInfo.enabled) {
			toast.error("MCP 연결 정보가 아직 준비되지 않았습니다.");
			return;
		}
		const text = `Auto Screen MCP\nURL: ${mcpConnectionInfo.url}\nToken: ${mcpConnectionInfo.token}`;
		await window.electronAPI.writeClipboardText(text);
		toast.success("MCP 연결 정보를 복사했습니다.");
	}, [mcpConnectionInfo]);

	const handleCopyMcpCurlCommand = useCallback(async () => {
		if (!mcpConnectionInfo.enabled) {
			toast.error("MCP 연결 정보가 아직 준비되지 않았습니다.");
			return;
		}
		const curlCommand = `curl -H \"Authorization: Bearer ${mcpConnectionInfo.token}\" \"${mcpConnectionInfo.url}/session\"`;
		await window.electronAPI.writeClipboardText(curlCommand);
		toast.success("curl 테스트 명령을 복사했습니다.");
	}, [mcpConnectionInfo]);

	const handleResetMcpToken = useCallback(async () => {
		const result = await window.electronAPI.resetMcpToken();
		if (!result.success || !result.token || !result.url) {
			toast.error(result.error || "토큰 재발급에 실패했습니다.");
			return;
		}
		setMcpConnectionInfo({ enabled: true, url: result.url, token: result.token });
		setMcpConnectionStatus({
			tone: "success",
			message: "기존 토큰을 무효화하고 새 토큰을 발급했습니다.",
		});
		toast.success("새 MCP 토큰을 발급했습니다.");
	}, []);

	if (loading) {
		return (
			<div className="flex items-center justify-center h-screen bg-background">
				<div className="text-foreground">Loading video...</div>
			</div>
		);
	}
	if (error) {
		return (
			<div className="flex items-center justify-center h-screen bg-background">
				<div className="flex flex-col items-center gap-3">
					<div className="text-destructive">{error}</div>
					<button
						type="button"
						onClick={handleLoadProject}
						className="px-3 py-1.5 rounded-md bg-[#34B27B] text-white text-sm hover:bg-[#34B27B]/90"
					>
						Load Project File
					</button>
				</div>
			</div>
		);
	}

	if (!videoPath) {
		return (
			<EditorStartScreen
				onStartRecording={handleNewRecordingConfirm}
				onImportVideo={handleImportVideo}
				onOpenProject={handleLoadProject}
			/>
		);
	}

	return (
		<div className="flex flex-col h-screen bg-[#09090b] text-slate-200 overflow-hidden selection:bg-[#34B27B]/30">
			<Dialog open={showMcpSettingsDialog} onOpenChange={setShowMcpSettingsDialog}>
				<DialogContent
					className="sm:max-w-[720px] border-white/10 bg-[#101114] text-white"
					style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
				>
					<DialogHeader>
						<DialogTitle>MCP 설정</DialogTitle>
						<DialogDescription className="text-slate-400">
							Codex 와 Claude Code가 현재 열린 Auto Screen 편집기를 직접 제어할 수 있습니다.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div className="rounded-2xl border border-white/8 bg-black/20 p-4">
							<div className="flex items-start justify-between gap-3">
								<div>
									<div className="text-sm font-semibold text-slate-100">MCP 연결</div>
									<div className="mt-1 text-sm text-slate-400">
										현재 편집기를 외부 AI 도구와 연결할 때 사용하는 URL 과 토큰을 확인합니다.
									</div>
								</div>
								<div
									className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${mcpConnectionInfo.enabled ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200" : "border-white/10 bg-white/5 text-slate-400"}`}
								>
									{mcpConnectionInfo.enabled ? "준비됨" : "준비 중"}
								</div>
							</div>
							<div className="mt-3 rounded-xl border border-white/8 bg-white/[0.03] p-3 space-y-3">
								<div>
									<div className="text-xs uppercase tracking-[0.18em] text-slate-500">MCP URL</div>
									<div className="mt-1 break-all text-sm text-slate-200">
										{mcpConnectionInfo.enabled ? mcpConnectionInfo.url : "연결 정보 준비 중"}
									</div>
								</div>
								<div>
									<div className="text-xs uppercase tracking-[0.18em] text-slate-500">
										Access Token
									</div>
									<div className="mt-1 break-all text-sm text-slate-200">
										{mcpConnectionInfo.enabled
											? `${mcpConnectionInfo.token.slice(0, 8)}••••••••${mcpConnectionInfo.token.slice(-6)}`
											: "토큰 준비 중"}
									</div>
								</div>
							</div>
							{mcpConnectionStatus ? (
								<div
									className={`mt-3 rounded-xl border px-3 py-2 text-sm ${mcpConnectionStatus.tone === "success" ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200" : mcpConnectionStatus.tone === "error" ? "border-red-500/25 bg-red-500/10 text-red-200" : "border-white/10 bg-white/5 text-slate-300"}`}
								>
									{mcpConnectionStatus.message}
								</div>
							) : null}
						</div>
						<div className="rounded-2xl border border-white/8 bg-black/20 p-4 space-y-3">
							<div className="text-sm font-semibold text-slate-100">토큰 관리</div>
							<div className="text-sm text-slate-400">
								토큰이 노출됐거나 새로 연결해야 하면 재발급 버튼을 누르세요. 기존 토큰은 즉시
								무효화됩니다.
							</div>
							<div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
								현재 구조에서는 URL 은 유지되고 토큰만 새로 바뀝니다.
							</div>
						</div>
					</div>
					<DialogFooter className="gap-2 sm:justify-start">
						<Button
							type="button"
							onClick={() => void handleTestMcpConnection()}
							className="bg-[#34B27B] text-white hover:bg-[#34B27B]/90"
						>
							연결 상태 확인
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={() => void handleCopyMcpConnection()}
							className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
						>
							연결 정보 복사
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={() => void handleCopyMcpCurlCommand()}
							className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
						>
							curl 테스트 명령 복사
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={() => void handleResetMcpToken()}
							className="border-red-500/20 bg-red-500/10 text-red-100 hover:bg-red-500/20"
						>
							토큰 재발급
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<Dialog open={showNewRecordingDialog} onOpenChange={setShowNewRecordingDialog}>
				<DialogContent
					className="sm:max-w-[425px]"
					style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
				>
					<DialogHeader>
						<DialogTitle>{t("newRecording.title")}</DialogTitle>
						<DialogDescription>{t("newRecording.description")}</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<button
							type="button"
							onClick={() => setShowNewRecordingDialog(false)}
							className="px-4 py-2 rounded-md bg-white/10 text-white hover:bg-white/20 text-sm font-medium transition-colors"
						>
							{t("newRecording.cancel")}
						</button>
						<button
							type="button"
							onClick={handleNewRecordingConfirm}
							className="px-4 py-2 rounded-md bg-[#34B27B] text-white hover:bg-[#34B27B]/90 text-sm font-medium transition-colors"
						>
							{t("newRecording.confirm")}
						</button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<div
				data-testid="editor-header"
				className={`h-11 flex-shrink-0 bg-[#09090b]/80 backdrop-blur-md flex items-center px-4 z-50 ${styles.headerBar}`}
			>
				<div className={`flex items-center gap-1.5 ${styles.headerControls}`}>
					<div
						data-testid="editor-header-language"
						className={`flex items-center gap-1 px-2 py-1 rounded-md text-white/50 hover:text-white/90 hover:bg-white/10 transition-all duration-150 ${isMac ? "ml-14" : "ml-2"}`}
					>
						<Languages size={14} />
						<select
							value={locale}
							onChange={(e) => setLocale(e.target.value as Locale)}
							className={`bg-transparent text-[11px] font-medium outline-none cursor-pointer appearance-none pr-1 ${styles.headerLocaleSelect}`}
							style={{ color: "inherit" }}
						>
							{SUPPORTED_LOCALES.map((loc) => (
								<option key={loc} value={loc} className="bg-[#09090b] text-white">
									{getLocaleName(loc)}
								</option>
							))}
						</select>
					</div>
					<button
						data-testid="editor-header-new-recording"
						type="button"
						onClick={() => setShowNewRecordingDialog(true)}
						className="flex items-center gap-1 px-2 py-1 rounded-md text-white/50 hover:text-white/90 hover:bg-white/10 transition-all duration-150 text-[11px] font-medium"
					>
						<Video size={14} />
						<span className={styles.headerActionText}>{t("newRecording.title")}</span>
					</button>
					<button
						data-testid="editor-header-load-project"
						type="button"
						onClick={handleLoadProject}
						className="flex items-center gap-1 px-2 py-1 rounded-md text-white/50 hover:text-white/90 hover:bg-white/10 transition-all duration-150 text-[11px] font-medium"
					>
						<FolderOpen size={14} />
						<span className={styles.headerActionText}>{ts("project.load")}</span>
					</button>
					<button
						data-testid="editor-header-save-project"
						type="button"
						onClick={handleSaveProject}
						className="flex items-center gap-1 px-2 py-1 rounded-md text-white/50 hover:text-white/90 hover:bg-white/10 transition-all duration-150 text-[11px] font-medium"
					>
						<Save size={14} />
						<span className={styles.headerActionText}>{ts("project.save")}</span>
					</button>
				</div>
				<div data-testid="editor-header-drag-fill-left" className={styles.headerDragFill} />
				<div
					className={`text-[11px] font-medium tracking-[0.08em] uppercase text-white/30 ${styles.headerTitle}`}
				>
					Auto Screen
				</div>
				<div data-testid="editor-header-drag-fill-right" className={styles.headerDragFill} />
				<div className={`flex items-center ${styles.headerRightControls}`}>
					{showGuestAuthActions ? (
						<>
							<button
								type="button"
								onClick={() => void onOpenLogin?.()}
								className="min-w-[56px] flex items-center justify-center px-2.5 py-1 rounded-md border border-white/10 bg-white/5 text-white/90 hover:text-white hover:bg-white/10 transition-all duration-150 text-[11px] font-medium"
							>
								<span>로그인</span>
							</button>
							<button
								type="button"
								onClick={() => void onOpenSignup?.()}
								className="min-w-[72px] flex items-center justify-center px-2.5 py-1 rounded-md border border-white/10 bg-white/5 text-white/90 hover:text-white hover:bg-white/10 transition-all duration-150 text-[11px] font-medium"
							>
								<span>회원가입</span>
							</button>
						</>
					) : null}
					{canOpenMcpSettings ? (
						<button
							data-testid="editor-header-toggle-settings"
							type="button"
							onClick={() => {
								setShowMcpSettingsDialog(true);
							}}
							className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all duration-150 text-[11px] font-medium ${showMcpSettingsDialog ? "text-white bg-white/10" : "text-white/50 hover:text-white/90 hover:bg-white/10"}`}
							title="MCP 설정 열기"
							aria-label="MCP 설정 열기"
							aria-pressed={showMcpSettingsDialog}
						>
							<Settings size={14} />
							<span className={styles.headerActionText}>MCP 설정</span>
						</button>
					) : null}
				</div>
				<div className={styles.headerDivider} />
			</div>

			<div className="flex-1 p-5 gap-4 flex min-h-0 relative">
				{/* Left Column - Video & Timeline */}
				<div className="flex-[7] flex flex-col gap-3 min-w-0 h-full">
					<PanelGroup direction="vertical" className="gap-3">
						{/* Top section: video preview and controls */}
						<Panel defaultSize={70} maxSize={70} minSize={40}>
							<div
								ref={playerContainerRef}
								className={
									isFullscreen
										? "fixed inset-0 z-[99999] w-full h-full flex flex-col items-center justify-center bg-[#09090b]"
										: "w-full h-full flex flex-col items-center justify-center bg-black/40 rounded-2xl border border-white/5 shadow-2xl overflow-hidden relative"
								}
							>
								{/* Video preview */}
								<div className="w-full flex justify-center items-center flex-auto mt-1.5">
									<div
										className="relative flex justify-center items-center w-auto h-full max-w-full box-border"
										style={{
											aspectRatio:
												aspectRatio === "native"
													? getNativeAspectRatioValue(
															videoPlaybackRef.current?.video?.videoWidth || 1920,
															videoPlaybackRef.current?.video?.videoHeight || 1080,
															cropRegion,
														)
													: getAspectRatioValue(aspectRatio),
										}}
									>
										<VideoPlayback
											key={`${videoPath || "no-video"}:${webcamVideoPath || "no-webcam"}`}
											aspectRatio={aspectRatio}
											ref={videoPlaybackRef}
											videoPath={videoPath || ""}
											webcamVideoPath={webcamVideoPath || undefined}
											webcamLayoutPreset={webcamLayoutPreset}
											webcamMaskShape={webcamMaskShape}
											webcamPosition={webcamPosition}
											onWebcamPositionChange={(pos) => updateState({ webcamPosition: pos })}
											onWebcamPositionDragEnd={commitState}
											onDurationChange={setDuration}
											onTimeUpdate={setCurrentTime}
											currentTime={currentTime}
											onPlayStateChange={setIsPlaying}
											onError={setError}
											wallpaper={wallpaper}
											zoomRegions={zoomRegions}
											selectedZoomId={selectedZoomId}
											onSelectZoom={handleSelectZoom}
											onZoomFocusChange={handleZoomFocusChange}
											onZoomFocusDragEnd={commitState}
											isPlaying={isPlaying}
											showShadow={shadowIntensity > 0}
											shadowIntensity={shadowIntensity}
											showBlur={showBlur}
											motionBlurAmount={motionBlurAmount}
											borderRadius={borderRadius}
											padding={padding}
											cropRegion={cropRegion}
											trimRegions={trimRegions}
											speedRegions={effectiveSpeedRegions}
											annotationRegions={annotationRegions}
											selectedAnnotationId={selectedAnnotationId}
											onSelectAnnotation={handleSelectAnnotation}
											onAnnotationPositionChange={handleAnnotationPositionChange}
											onAnnotationSizeChange={handleAnnotationSizeChange}
											cursorTelemetry={cursorTelemetry}
											interactionClicks={interactionClicks}
										/>
									</div>
								</div>
								{/* Playback controls */}
								<div className="w-full flex justify-center items-center h-12 flex-shrink-0 px-3 py-1.5 my-1.5">
									<div className="w-full max-w-[700px]">
										<PlaybackControls
											isPlaying={isPlaying}
											currentTime={currentTime}
											duration={duration}
											isFullscreen={isFullscreen}
											onToggleFullscreen={toggleFullscreen}
											onTogglePlayPause={togglePlayPause}
											onSeek={handleSeek}
										/>
									</div>
								</div>
							</div>
						</Panel>

						<PanelResizeHandle className="bg-[#09090b]/80 hover:bg-[#09090b] transition-colors rounded-full flex items-center justify-center">
							<div className="w-8 h-1 bg-white/20 rounded-full"></div>
						</PanelResizeHandle>

						{/* Timeline section */}
						<Panel defaultSize={30} maxSize={60} minSize={30}>
							<div className="h-full bg-[#09090b] rounded-2xl border border-white/5 shadow-lg overflow-hidden flex flex-col">
								<TimelineEditor
									videoDuration={duration}
									currentTime={currentTime}
									onSeek={handleSeek}
									cursorTelemetry={cursorTelemetry}
									zoomRegions={zoomRegions}
									onZoomAdded={handleZoomAdded}
									onZoomSuggested={handleZoomSuggested}
									onZoomSpanChange={handleZoomSpanChange}
									onZoomDelete={handleZoomDelete}
									selectedZoomId={selectedZoomId}
									onSelectZoom={handleSelectZoom}
									trimRegions={trimRegions}
									onTrimAdded={handleTrimAdded}
									onTrimSpanChange={handleTrimSpanChange}
									onTrimDelete={handleTrimDelete}
									selectedTrimId={selectedTrimId}
									onSelectTrim={handleSelectTrim}
									speedRegions={effectiveSpeedRegions}
									onSpeedAdded={handleSpeedAdded}
									onSpeedSpanChange={handleSpeedSpanChange}
									onSpeedDelete={handleSpeedDelete}
									selectedSpeedId={selectedSpeedId}
									onSelectSpeed={handleSelectSpeed}
									annotationRegions={annotationRegions}
									onAnnotationAdded={handleAnnotationAdded}
									onAnnotationSpanChange={handleAnnotationSpanChange}
									onAnnotationDelete={handleAnnotationDelete}
									selectedAnnotationId={selectedAnnotationId}
									onSelectAnnotation={handleSelectAnnotation}
									aspectRatio={aspectRatio}
									onAspectRatioChange={(ar) =>
										pushState({
											aspectRatio: ar,
											webcamLayoutPreset:
												!isPortraitAspectRatio(ar) && webcamLayoutPreset === "vertical-stack"
													? "picture-in-picture"
													: webcamLayoutPreset,
										})
									}
								/>
							</div>
						</Panel>
					</PanelGroup>
				</div>

				{/* Right section: settings panel */}
				{showSettingsPanel ? (
					<div className="flex-[3] min-w-[280px] max-w-[420px] h-full">
						<SettingsPanel
							selected={wallpaper}
							onWallpaperChange={handleWallpaperChange}
							focusSection={requestedSettingsSection}
							onFocusSectionHandled={() => setRequestedSettingsSection(null)}
							editMode={editMode}
							onEditModeChange={(mode) => pushState({ editMode: mode as EditMode })}
							onRemoveBackground={handleRemoveBackground}
							autoEditStyle={autoEditStyle}
							onAutoEditStyleChange={setAutoEditStyle}
							autoEditFocusStrategy={autoEditFocusStrategy}
							onAutoEditFocusStrategyChange={setAutoEditFocusStrategy}
							autoEditPauseMode={autoEditPauseMode}
							onAutoEditPauseModeChange={setAutoEditPauseMode}
							autoEditBackgroundMode={autoEditBackgroundMode}
							onAutoEditBackgroundModeChange={setAutoEditBackgroundMode}
							onApplyAutoEdits={handleApplyAutoEdits}
							selectedZoomDepth={
								selectedZoomId ? zoomRegions.find((z) => z.id === selectedZoomId)?.depth : null
							}
							onZoomDepthChange={(depth) => selectedZoomId && handleZoomDepthChange(depth)}
							selectedZoomFocusMode={
								selectedZoomId
									? (zoomRegions.find((z) => z.id === selectedZoomId)?.focusMode ?? "manual")
									: null
							}
							onZoomFocusModeChange={(mode) => selectedZoomId && handleZoomFocusModeChange(mode)}
							hasCursorTelemetry={cursorTelemetry.length > 0}
							selectedZoomId={selectedZoomId}
							onZoomDelete={handleZoomDelete}
							selectedTrimId={selectedTrimId}
							onTrimDelete={handleTrimDelete}
							shadowIntensity={shadowIntensity}
							onShadowChange={(v) => updateState({ shadowIntensity: v })}
							onShadowCommit={commitState}
							showBlur={showBlur}
							onBlurChange={(v) => pushState({ showBlur: v })}
							motionBlurAmount={motionBlurAmount}
							onMotionBlurChange={(v) => updateState({ motionBlurAmount: v })}
							onMotionBlurCommit={commitState}
							borderRadius={borderRadius}
							onBorderRadiusChange={(v) => updateState({ borderRadius: v })}
							onBorderRadiusCommit={commitState}
							padding={padding}
							onPaddingChange={(v) => updateState({ padding: v })}
							onPaddingCommit={commitState}
							cropRegion={cropRegion}
							onCropChange={(r) => pushState({ cropRegion: r })}
							aspectRatio={aspectRatio}
							hasWebcam={Boolean(webcamVideoPath)}
							webcamLayoutPreset={webcamLayoutPreset}
							onWebcamLayoutPresetChange={(preset) =>
								pushState({
									webcamLayoutPreset: preset,
									webcamPosition: preset === "vertical-stack" ? null : webcamPosition,
								})
							}
							webcamMaskShape={webcamMaskShape}
							onWebcamMaskShapeChange={(shape) => pushState({ webcamMaskShape: shape })}
							videoElement={videoPlaybackRef.current?.video || null}
							exportQuality={exportQuality}
							onExportQualityChange={setExportQuality}
							exportFormat={exportFormat}
							onExportFormatChange={setExportFormat}
							gifFrameRate={gifFrameRate}
							onGifFrameRateChange={setGifFrameRate}
							gifLoop={gifLoop}
							onGifLoopChange={setGifLoop}
							gifSizePreset={gifSizePreset}
							onGifSizePresetChange={setGifSizePreset}
							gifOutputDimensions={calculateOutputDimensions(
								videoPlaybackRef.current?.video?.videoWidth || 1920,
								videoPlaybackRef.current?.video?.videoHeight || 1080,
								gifSizePreset,
								GIF_SIZE_PRESETS,
								aspectRatio === "native"
									? getNativeAspectRatioValue(
											videoPlaybackRef.current?.video?.videoWidth || 1920,
											videoPlaybackRef.current?.video?.videoHeight || 1080,
											cropRegion,
										)
									: getAspectRatioValue(aspectRatio),
							)}
							onExport={handleOpenExportDialog}
							selectedAnnotationId={selectedAnnotationId}
							annotationRegions={annotationRegions}
							onAnnotationContentChange={handleAnnotationContentChange}
							onAnnotationTypeChange={handleAnnotationTypeChange}
							onAnnotationStyleChange={handleAnnotationStyleChange}
							onAnnotationFigureDataChange={handleAnnotationFigureDataChange}
							onAnnotationDelete={handleAnnotationDelete}
							selectedSpeedId={selectedSpeedId}
							selectedSpeedValue={
								selectedSpeedId
									? (speedRegions.find((r) => r.id === selectedSpeedId)?.speed ?? null)
									: null
							}
							onSpeedChange={handleSpeedChange}
							onSpeedDelete={handleSpeedDelete}
							smartSpeedEnabled={smartSpeedEnabled}
							onSmartSpeedEnabledChange={(enabled) => pushState({ smartSpeedEnabled: enabled })}
							smartSpeedIntensity={smartSpeedIntensity}
							onSmartSpeedIntensityChange={(intensity) =>
								pushState({ smartSpeedIntensity: intensity as SmartSpeedIntensity })
							}
							unsavedExport={unsavedExport}
							onSaveUnsavedExport={handleSaveUnsavedExport}
							canExport={accessPolicy.canExport}
							exportLockedReason={accessPolicy.message}
							onUpgrade={onUpgrade}
							trialBadge={accessPolicy.mode === "trial" ? accessPolicy.message : undefined}
						/>
					</div>
				) : null}
			</div>

			<ExportDialog
				isOpen={showExportDialog}
				onClose={() => setShowExportDialog(false)}
				progress={exportProgress}
				isExporting={isExporting}
				error={exportError}
				onCancel={handleCancelExport}
				exportFormat={exportFormat}
				exportedFilePath={exportedFilePath || undefined}
				onShowInFolder={
					exportedFilePath ? () => void handleShowExportedFile(exportedFilePath) : undefined
				}
			/>
		</div>
	);
}
