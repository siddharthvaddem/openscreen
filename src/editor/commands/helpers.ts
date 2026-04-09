import type { EditorState } from "@/hooks/useEditorHistory";

const DEFAULT_FRAME_STYLE = {
	padding: 14,
	shadowIntensity: 0.32,
	borderRadius: 18,
} as const;

export function applyBackgroundlessPreset(): Partial<EditorState> {
	return {
		wallpaper: "none",
		padding: 0,
		shadowIntensity: 0,
		borderRadius: 0,
		showBlur: false,
		aspectRatio: "native",
	};
}

export function restoreFrameDefaultsIfNeeded(prev: EditorState): Partial<EditorState> {
	return {
		padding: prev.padding === 0 ? DEFAULT_FRAME_STYLE.padding : prev.padding,
		shadowIntensity:
			prev.shadowIntensity === 0 ? DEFAULT_FRAME_STYLE.shadowIntensity : prev.shadowIntensity,
		borderRadius: prev.borderRadius === 0 ? DEFAULT_FRAME_STYLE.borderRadius : prev.borderRadius,
	};
}

export function overlapsTrimRegion(
	startMs: number,
	endMs: number,
	trimRegions: EditorState["trimRegions"],
): boolean {
	return trimRegions.some((region) => endMs > region.startMs && startMs < region.endMs);
}
