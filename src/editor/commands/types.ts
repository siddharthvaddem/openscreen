import type {
	AutoEditBackgroundMode,
	AutoEditFocusStrategy,
	AutoEditPauseMode,
	AutoEditStyle,
	SpeedRegion,
	TrimRegion,
	ZoomFocus,
	ZoomRegion,
} from "@/components/video-editor/types";
import type { EditorState } from "@/hooks/useEditorHistory";
import type { ExportFormat, ExportQuality, ExportSettings } from "@/lib/exporter";
import type { ProjectMedia } from "@/lib/recordingSession";

export interface AutoEditOptions {
	style: AutoEditStyle;
	focusStrategy: AutoEditFocusStrategy;
	pauseMode: AutoEditPauseMode;
	backgroundMode: AutoEditBackgroundMode;
}

export interface AutoEditCommandResult {
	zoomRegions: ZoomRegion[];
	speedRegions: SpeedRegion[];
	appliedBackgroundRemoval: boolean;
	summary: string[];
}

export interface ProjectStateSnapshot {
	projectLoaded: boolean;
	media: ProjectMedia | null;
	editMode: EditorState["editMode"];
	background: {
		wallpaper: string;
		removed: boolean;
	};
	effects: {
		padding: number;
		shadowIntensity: number;
		borderRadius: number;
		showBlur: boolean;
		motionBlurAmount: number;
	};
	timeline: {
		durationMs: number;
		currentTimeMs: number;
		zoomRegions: EditorState["zoomRegions"];
		trimRegions: EditorState["trimRegions"];
		speedRegions: EditorState["speedRegions"];
		annotationRegions: EditorState["annotationRegions"];
	};
	export: {
		format: ExportFormat;
		quality: ExportQuality;
	};
}

export interface AddTrimRegionInput {
	startMs: number;
	endMs: number;
}

export interface AddSpeedRegionInput {
	startMs: number;
	endMs: number;
	speed?: number;
}

export interface AddZoomRegionInput {
	startMs: number;
	endMs: number;
	depth?: ZoomRegion["depth"];
	focus?: ZoomFocus;
	focusMode?: ZoomRegion["focusMode"];
}

export interface ExportVideoCommandInput {
	settings: ExportSettings;
}

export interface ExportVideoCommandResult {
	success: boolean;
	path?: string;
	canceled?: boolean;
	message?: string;
}

export interface EditorCommandMap {
	get_project_state: {
		input: undefined;
		result: ProjectStateSnapshot;
	};
	remove_background: {
		input: undefined;
		result: ProjectStateSnapshot;
	};
	set_background: {
		input: { wallpaper: string };
		result: ProjectStateSnapshot;
	};
	apply_auto_edit: {
		input: AutoEditOptions;
		result: AutoEditCommandResult & { projectState: ProjectStateSnapshot };
	};
	add_trim_region: {
		input: AddTrimRegionInput;
		result: { region: TrimRegion; projectState: ProjectStateSnapshot };
	};
	add_speed_region: {
		input: AddSpeedRegionInput;
		result: { region: SpeedRegion; projectState: ProjectStateSnapshot };
	};
	add_zoom_region: {
		input: AddZoomRegionInput;
		result: { region: ZoomRegion; projectState: ProjectStateSnapshot };
	};
	undo: {
		input: undefined;
		result: ProjectStateSnapshot;
	};
	redo: {
		input: undefined;
		result: ProjectStateSnapshot;
	};
	export_video: {
		input: ExportVideoCommandInput;
		result: ExportVideoCommandResult;
	};
}

export type EditorCommandName = keyof EditorCommandMap;

export type EditorCommandInput<TName extends EditorCommandName> = EditorCommandMap[TName]["input"];
export type EditorCommandResult<TName extends EditorCommandName> =
	EditorCommandMap[TName]["result"];

export interface EditorCommandRequestEnvelope<TName extends EditorCommandName = EditorCommandName> {
	requestId: string;
	command: TName;
	payload: EditorCommandInput<TName>;
}

export interface EditorCommandSuccessEnvelope<TName extends EditorCommandName = EditorCommandName> {
	requestId: string;
	success: true;
	command: TName;
	result: EditorCommandResult<TName>;
}

export interface EditorCommandErrorEnvelope<TName extends EditorCommandName = EditorCommandName> {
	requestId: string;
	success: false;
	command: TName;
	error: string;
}

export type EditorCommandResponseEnvelope<TName extends EditorCommandName = EditorCommandName> =
	| EditorCommandSuccessEnvelope<TName>
	| EditorCommandErrorEnvelope<TName>;
