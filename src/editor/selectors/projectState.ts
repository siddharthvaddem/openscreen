import type { ProjectStateSnapshot } from "@/editor/commands/types";
import type { EditorState } from "@/hooks/useEditorHistory";
import type { ExportFormat, ExportQuality } from "@/lib/exporter";
import type { ProjectMedia } from "@/lib/recordingSession";

export function buildProjectStateSnapshot({
	editorState,
	media,
	currentTimeMs,
	durationMs,
	exportFormat,
	exportQuality,
}: {
	editorState: EditorState;
	media: ProjectMedia | null;
	currentTimeMs: number;
	durationMs: number;
	exportFormat: ExportFormat;
	exportQuality: ExportQuality;
}): ProjectStateSnapshot {
	return {
		projectLoaded: Boolean(media),
		media,
		editMode: editorState.editMode,
		background: {
			wallpaper: editorState.wallpaper,
			removed: editorState.wallpaper === "none",
		},
		effects: {
			padding: editorState.padding,
			shadowIntensity: editorState.shadowIntensity,
			borderRadius: editorState.borderRadius,
			showBlur: editorState.showBlur,
			motionBlurAmount: editorState.motionBlurAmount,
		},
		timeline: {
			durationMs,
			currentTimeMs,
			zoomRegions: editorState.zoomRegions,
			trimRegions: editorState.trimRegions,
			speedRegions: editorState.speedRegions,
			annotationRegions: editorState.annotationRegions,
		},
		export: {
			format: exportFormat,
			quality: exportQuality,
		},
	};
}
