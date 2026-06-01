import { useCallback, useRef, useState } from "react";
import {
	DEFAULT_EDITOR_APPEARANCE_SETTINGS,
	DEFAULT_EDITOR_LAYOUT_SETTINGS,
	DEFAULT_WEBCAM_SETTINGS,
} from "@/components/video-editor/editorDefaults";
import type {
	AnnotationRegion,
	CropRegion,
	SpeedRegion,
	TrimRegion,
	WebcamLayoutPreset,
	WebcamMaskShape,
	WebcamPosition,
	WebcamSizePreset,
	ZoomRegion,
} from "@/components/video-editor/types";
import { DEFAULT_CROP_REGION } from "@/components/video-editor/types";
import type { AspectRatio } from "@/utils/aspectRatioUtils";

// Undoable state — selection IDs are intentionally excluded (undoing a
// selection change would feel surprising to the user).
export interface EditorState {
	zoomRegions: ZoomRegion[];
	trimRegions: TrimRegion[];
	speedRegions: SpeedRegion[];
	annotationRegions: AnnotationRegion[];
	cropRegion: CropRegion;
	wallpaper: string;
	shadowIntensity: number;
	showBlur: boolean;
	showTrimWaveform: boolean;
	motionBlurAmount: number;
	borderRadius: number;
	padding: number;
	aspectRatio: AspectRatio;
	webcamLayoutPreset: WebcamLayoutPreset;
	webcamMaskShape: WebcamMaskShape;
	webcamSizePreset: WebcamSizePreset;
	webcamPosition: WebcamPosition | null;
}

export const INITIAL_EDITOR_STATE: EditorState = {
	zoomRegions: [],
	trimRegions: [],
	speedRegions: [],
	annotationRegions: [],
	cropRegion: DEFAULT_CROP_REGION,
	wallpaper: DEFAULT_EDITOR_LAYOUT_SETTINGS.wallpaper,
	shadowIntensity: DEFAULT_EDITOR_APPEARANCE_SETTINGS.shadowIntensity,
	showBlur: DEFAULT_EDITOR_APPEARANCE_SETTINGS.showBlur,
	showTrimWaveform: DEFAULT_EDITOR_APPEARANCE_SETTINGS.showTrimWaveform,
	motionBlurAmount: DEFAULT_EDITOR_APPEARANCE_SETTINGS.motionBlurAmount,
	borderRadius: DEFAULT_EDITOR_APPEARANCE_SETTINGS.borderRadius,
	padding: DEFAULT_EDITOR_LAYOUT_SETTINGS.padding,
	aspectRatio: DEFAULT_EDITOR_LAYOUT_SETTINGS.aspectRatio,
	webcamLayoutPreset: DEFAULT_WEBCAM_SETTINGS.layoutPreset,
	webcamMaskShape: DEFAULT_WEBCAM_SETTINGS.maskShape,
	webcamSizePreset: DEFAULT_WEBCAM_SETTINGS.sizePreset,
	webcamPosition: DEFAULT_WEBCAM_SETTINGS.position,
};

type StateUpdate = Partial<EditorState> | ((prev: EditorState) => Partial<EditorState>);

interface History {
	past: EditorState[];
	present: EditorState;
	future: EditorState[];
}

const MAX_HISTORY = 80;

function resolve(present: EditorState, update: StateUpdate): EditorState {
	const partial = typeof update === "function" ? update(present) : update;
	return { ...present, ...partial };
}

function withCheckpoint(history: History, newPresent: EditorState): History {
	return {
		past: [...history.past.slice(-(MAX_HISTORY - 1)), history.present],
		present: newPresent,
		future: [],
	};
}

export function useEditorHistory(initial: EditorState = INITIAL_EDITOR_STATE) {
	const [history, setHistory] = useState<History>({ past: [], present: initial, future: [] });

	// Tracks whether a live-update series (e.g. slider drag) is in progress.
	// The first updateState call saves the pre-interaction state as a checkpoint.
	const dirtyRef = useRef(false);

	const pushState = useCallback((update: StateUpdate) => {
		setHistory((prev) => withCheckpoint(prev, resolve(prev.present, update)));
		dirtyRef.current = false;
	}, []);

	const updateState = useCallback((update: StateUpdate) => {
		const isFirst = !dirtyRef.current;
		dirtyRef.current = true;
		setHistory((prev) => {
			const next = resolve(prev.present, update);
			return isFirst ? withCheckpoint(prev, next) : { ...prev, present: next };
		});
	}, []);

	const commitState = useCallback(() => {
		dirtyRef.current = false;
	}, []);

	const undo = useCallback(() => {
		setHistory((prev) => {
			if (!prev.past.length) return prev;
			const previous = prev.past[prev.past.length - 1];
			return {
				past: prev.past.slice(0, -1),
				present: previous,
				future: [prev.present, ...prev.future],
			};
		});
		dirtyRef.current = false;
	}, []);

	const redo = useCallback(() => {
		setHistory((prev) => {
			if (!prev.future.length) return prev;
			const [next, ...remainingFuture] = prev.future;
			return { past: [...prev.past, prev.present], present: next, future: remainingFuture };
		});
		dirtyRef.current = false;
	}, []);

	const resetState = useCallback((newInitial: EditorState = INITIAL_EDITOR_STATE) => {
		setHistory({ past: [], present: newInitial, future: [] });
		dirtyRef.current = false;
	}, []);

	return {
		state: history.present,
		pushState,
		updateState,
		commitState,
		undo,
		redo,
		resetState,
		canUndo: history.past.length > 0,
		canRedo: history.future.length > 0,
	};
}
