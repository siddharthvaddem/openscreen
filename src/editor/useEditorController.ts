import { useCallback } from "react";
import type {
	AddSpeedRegionInput,
	AddTrimRegionInput,
	AddZoomRegionInput,
	AutoEditOptions,
	EditorCommandInput,
	EditorCommandName,
	EditorCommandResult,
	ExportVideoCommandInput,
} from "@/editor/commands/types";
import type { EditorState } from "@/hooks/useEditorHistory";
import type { ExportFormat, ExportQuality } from "@/lib/exporter";
import type { ProjectMedia } from "@/lib/recordingSession";
import { buildAutoEditCommand } from "./commands/autoEdit";
import { applyBackgroundlessPreset, restoreFrameDefaultsIfNeeded } from "./commands/helpers";
import { createSpeedRegion, createTrimRegion, createZoomRegion } from "./commands/regions";
import { buildProjectStateSnapshot } from "./selectors/projectState";

type StateUpdate = Partial<EditorState> | ((prev: EditorState) => Partial<EditorState>);

export function useEditorController({
	editorState,
	pushState,
	currentProjectMedia,
	currentTimeMs,
	durationMs,
	exportFormat,
	exportQuality,
	videoUrl,
	cursorTelemetry,
	silentIntervals,
	interactionClicks,
	interactionKeys,
	issueZoomId,
	issueTrimId,
	issueSpeedId,
	setSelectedZoomId,
	setSelectedSpeedId,
	setSelectedTrimId,
	setSelectedAnnotationId,
	undo,
	redo,
	exportVideo,
}: {
	editorState: EditorState;
	pushState: (update: StateUpdate) => void;
	currentProjectMedia: ProjectMedia | null;
	currentTimeMs: number;
	durationMs: number;
	exportFormat: ExportFormat;
	exportQuality: ExportQuality;
	videoUrl: string | null;
	cursorTelemetry: Parameters<typeof buildAutoEditCommand>[0]["cursorTelemetry"];
	silentIntervals: Parameters<typeof buildAutoEditCommand>[0]["silentIntervals"];
	interactionClicks: Parameters<typeof buildAutoEditCommand>[0]["interactionClicks"];
	interactionKeys: Parameters<typeof buildAutoEditCommand>[0]["interactionKeys"];
	issueZoomId: () => string;
	issueTrimId: () => string;
	issueSpeedId: () => string;
	setSelectedZoomId: (id: string | null) => void;
	setSelectedSpeedId: (id: string | null) => void;
	setSelectedTrimId: (id: string | null) => void;
	setSelectedAnnotationId: (id: string | null) => void;
	undo: () => void;
	redo: () => void;
	exportVideo: (input: ExportVideoCommandInput) => Promise<EditorCommandResult<"export_video">>;
}) {
	const buildSnapshotForState = useCallback(
		(state: EditorState) =>
			buildProjectStateSnapshot({
				editorState: state,
				media: currentProjectMedia,
				currentTimeMs,
				durationMs,
				exportFormat,
				exportQuality,
			}),
		[currentProjectMedia, currentTimeMs, durationMs, exportFormat, exportQuality],
	);

	const getProjectState = useCallback(
		() => buildSnapshotForState(editorState),
		[buildSnapshotForState, editorState],
	);

	const removeBackground = useCallback(() => {
		const nextState = { ...editorState, ...applyBackgroundlessPreset() };
		pushState(applyBackgroundlessPreset());
		return buildSnapshotForState(nextState);
	}, [buildSnapshotForState, editorState, pushState]);

	const setBackground = useCallback(
		(nextWallpaper: string) => {
			const patch =
				nextWallpaper === "none"
					? { wallpaper: "none" }
					: {
							wallpaper: nextWallpaper,
							...(editorState.wallpaper === "none"
								? restoreFrameDefaultsIfNeeded(editorState)
								: {}),
						};
			const nextState = { ...editorState, ...patch };
			pushState(patch);
			return buildSnapshotForState(nextState);
		},
		[buildSnapshotForState, editorState, pushState],
	);

	const addTrimRegion = useCallback(
		(input: AddTrimRegionInput) => {
			const region = createTrimRegion(issueTrimId(), input);
			const nextState = { ...editorState, trimRegions: [...editorState.trimRegions, region] };
			pushState({ trimRegions: nextState.trimRegions });
			setSelectedTrimId(region.id);
			setSelectedZoomId(null);
			setSelectedSpeedId(null);
			setSelectedAnnotationId(null);
			return {
				region,
				projectState: buildSnapshotForState(nextState),
			};
		},
		[
			buildSnapshotForState,
			editorState,
			issueTrimId,
			pushState,
			setSelectedAnnotationId,
			setSelectedSpeedId,
			setSelectedTrimId,
			setSelectedZoomId,
		],
	);

	const addSpeedRegion = useCallback(
		(input: AddSpeedRegionInput) => {
			const region = createSpeedRegion(issueSpeedId(), input);
			const nextState = { ...editorState, speedRegions: [...editorState.speedRegions, region] };
			pushState({ speedRegions: nextState.speedRegions });
			setSelectedSpeedId(region.id);
			setSelectedZoomId(null);
			setSelectedTrimId(null);
			setSelectedAnnotationId(null);
			return {
				region,
				projectState: buildSnapshotForState(nextState),
			};
		},
		[
			buildSnapshotForState,
			editorState,
			issueSpeedId,
			pushState,
			setSelectedAnnotationId,
			setSelectedSpeedId,
			setSelectedTrimId,
			setSelectedZoomId,
		],
	);

	const addZoomRegion = useCallback(
		(input: AddZoomRegionInput) => {
			const region = createZoomRegion(issueZoomId(), input);
			const nextState = { ...editorState, zoomRegions: [...editorState.zoomRegions, region] };
			pushState({ zoomRegions: nextState.zoomRegions });
			setSelectedZoomId(region.id);
			setSelectedTrimId(null);
			setSelectedSpeedId(null);
			setSelectedAnnotationId(null);
			return {
				region,
				projectState: buildSnapshotForState(nextState),
			};
		},
		[
			buildSnapshotForState,
			editorState,
			issueZoomId,
			pushState,
			setSelectedAnnotationId,
			setSelectedSpeedId,
			setSelectedTrimId,
			setSelectedZoomId,
		],
	);

	const applyAutoEdit = useCallback(
		async (options: AutoEditOptions) => {
			if (!videoUrl || durationMs <= 0) {
				throw new Error("Video not ready");
			}

			const result = await buildAutoEditCommand({
				videoUrl,
				durationMs,
				cursorTelemetry,
				silentIntervals,
				interactionClicks,
				interactionKeys,
				trimRegions: editorState.trimRegions,
				issueZoomId,
				issueSpeedId,
				options,
			});

			pushState((prev) => ({
				zoomRegions: result.zoomRegions,
				speedRegions: result.speedRegions,
				smartSpeedEnabled: false,
				smartSpeedIntensity:
					options.pauseMode === "off" ? prev.smartSpeedIntensity : options.pauseMode,
				...(result.appliedBackgroundRemoval ? applyBackgroundlessPreset() : {}),
			}));

			setSelectedZoomId(result.zoomRegions[0]?.id ?? null);
			setSelectedSpeedId(result.speedRegions[0]?.id ?? null);
			setSelectedTrimId(null);
			setSelectedAnnotationId(null);

			return {
				...result,
				projectState: getProjectState(),
			};
		},
		[
			videoUrl,
			durationMs,
			cursorTelemetry,
			silentIntervals,
			interactionClicks,
			interactionKeys,
			editorState.trimRegions,
			issueZoomId,
			issueSpeedId,
			pushState,
			setSelectedAnnotationId,
			setSelectedSpeedId,
			setSelectedTrimId,
			setSelectedZoomId,
			getProjectState,
		],
	);

	const runUndo = useCallback(() => {
		undo();
		return getProjectState();
	}, [getProjectState, undo]);

	const runRedo = useCallback(() => {
		redo();
		return getProjectState();
	}, [getProjectState, redo]);

	const executeCommand = useCallback(
		async <TName extends EditorCommandName>(
			command: TName,
			payload: EditorCommandInput<TName>,
		): Promise<EditorCommandResult<TName>> => {
			switch (command) {
				case "get_project_state":
					return getProjectState() as EditorCommandResult<TName>;
				case "remove_background":
					return removeBackground() as EditorCommandResult<TName>;
				case "set_background":
					return setBackground(
						(payload as EditorCommandInput<"set_background">).wallpaper,
					) as EditorCommandResult<TName>;
				case "apply_auto_edit":
					return (await applyAutoEdit(
						payload as EditorCommandInput<"apply_auto_edit">,
					)) as EditorCommandResult<TName>;
				case "add_trim_region":
					return addTrimRegion(
						payload as EditorCommandInput<"add_trim_region">,
					) as EditorCommandResult<TName>;
				case "add_speed_region":
					return addSpeedRegion(
						payload as EditorCommandInput<"add_speed_region">,
					) as EditorCommandResult<TName>;
				case "add_zoom_region":
					return addZoomRegion(
						payload as EditorCommandInput<"add_zoom_region">,
					) as EditorCommandResult<TName>;
				case "undo":
					return runUndo() as EditorCommandResult<TName>;
				case "redo":
					return runRedo() as EditorCommandResult<TName>;
				case "export_video":
					return (await exportVideo(
						payload as EditorCommandInput<"export_video">,
					)) as EditorCommandResult<TName>;
				default: {
					const exhaustiveCheck: never = command;
					throw new Error(`Unknown command: ${String(exhaustiveCheck)}`);
				}
			}
		},
		[
			addSpeedRegion,
			addTrimRegion,
			addZoomRegion,
			applyAutoEdit,
			exportVideo,
			getProjectState,
			removeBackground,
			runRedo,
			runUndo,
			setBackground,
		],
	);

	return {
		getProjectState,
		removeBackground,
		setBackground,
		applyAutoEdit,
		addTrimRegion,
		addSpeedRegion,
		addZoomRegion,
		undo: runUndo,
		redo: runRedo,
		executeCommand,
	};
}
