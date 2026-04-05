import { randomUUID } from "node:crypto";
import type {
	AnnotationRegion,
	AnnotationTextStyle,
	AnnotationType,
	ArrowDirection,
	FigureData,
	PlaybackSpeed,
	SpeedRegion,
	TrimRegion,
	ZoomDepth,
	ZoomFocusMode,
	ZoomRegion,
} from "../../../src/shared/types";
import {
	DEFAULT_ANNOTATION_POSITION,
	DEFAULT_ANNOTATION_SIZE,
	DEFAULT_ANNOTATION_STYLE,
	DEFAULT_FIGURE_DATA,
	DEFAULT_ZOOM_DEPTH,
} from "../../../src/shared/types";
import { loadProject, saveProject } from "./project-manager";

const VALID_SPEEDS: readonly PlaybackSpeed[] = [0.25, 0.5, 0.75, 1.25, 1.5, 1.75, 2];

function validateTimeRange(startMs: number, endMs: number): void {
	if (startMs < 0) throw new Error(`startMs must be >= 0, got ${startMs}`);
	if (endMs <= startMs)
		throw new Error(`endMs (${endMs}) must be greater than startMs (${startMs})`);
}

// ── Zoom regions ──────────────────────────────────────────────────────

export interface AddZoomOptions {
	startMs: number;
	endMs: number;
	depth?: ZoomDepth;
	focusX?: number;
	focusY?: number;
	focusMode?: ZoomFocusMode;
}

export function addZoomRegion(projectPath: string, opts: AddZoomOptions): ZoomRegion {
	validateTimeRange(opts.startMs, opts.endMs);
	const project = loadProject(projectPath);
	const region: ZoomRegion = {
		id: `zoom-${randomUUID().slice(0, 8)}`,
		startMs: opts.startMs,
		endMs: opts.endMs,
		depth: opts.depth ?? DEFAULT_ZOOM_DEPTH,
		focus: {
			cx: opts.focusX ?? 0.5,
			cy: opts.focusY ?? 0.5,
		},
		focusMode: opts.focusMode ?? "manual",
	};
	project.editor.zoomRegions.push(region);
	saveProject(projectPath, project);
	return region;
}

export function listZoomRegions(projectPath: string): ZoomRegion[] {
	return loadProject(projectPath).editor.zoomRegions;
}

export function removeZoomRegion(projectPath: string, id: string): boolean {
	const project = loadProject(projectPath);
	const before = project.editor.zoomRegions.length;
	project.editor.zoomRegions = project.editor.zoomRegions.filter((r) => r.id !== id);
	if (project.editor.zoomRegions.length === before) return false;
	saveProject(projectPath, project);
	return true;
}

// ── Trim regions ──────────────────────────────────────────────────────

export interface AddTrimOptions {
	startMs: number;
	endMs: number;
}

export function addTrimRegion(projectPath: string, opts: AddTrimOptions): TrimRegion {
	validateTimeRange(opts.startMs, opts.endMs);
	const project = loadProject(projectPath);
	const region: TrimRegion = {
		id: `trim-${randomUUID().slice(0, 8)}`,
		startMs: opts.startMs,
		endMs: opts.endMs,
	};
	project.editor.trimRegions.push(region);
	saveProject(projectPath, project);
	return region;
}

export function listTrimRegions(projectPath: string): TrimRegion[] {
	return loadProject(projectPath).editor.trimRegions;
}

export function removeTrimRegion(projectPath: string, id: string): boolean {
	const project = loadProject(projectPath);
	const before = project.editor.trimRegions.length;
	project.editor.trimRegions = project.editor.trimRegions.filter((r) => r.id !== id);
	if (project.editor.trimRegions.length === before) return false;
	saveProject(projectPath, project);
	return true;
}

// ── Speed regions ─────────────────────────────────────────────────────

export interface AddSpeedOptions {
	startMs: number;
	endMs: number;
	speed: PlaybackSpeed;
}

export function addSpeedRegion(projectPath: string, opts: AddSpeedOptions): SpeedRegion {
	validateTimeRange(opts.startMs, opts.endMs);
	if (!VALID_SPEEDS.includes(opts.speed)) {
		throw new Error(`Invalid speed: ${opts.speed}. Valid values: ${VALID_SPEEDS.join(", ")}`);
	}
	const project = loadProject(projectPath);
	const region: SpeedRegion = {
		id: `speed-${randomUUID().slice(0, 8)}`,
		startMs: opts.startMs,
		endMs: opts.endMs,
		speed: opts.speed,
	};
	project.editor.speedRegions.push(region);
	saveProject(projectPath, project);
	return region;
}

export function listSpeedRegions(projectPath: string): SpeedRegion[] {
	return loadProject(projectPath).editor.speedRegions;
}

export function removeSpeedRegion(projectPath: string, id: string): boolean {
	const project = loadProject(projectPath);
	const before = project.editor.speedRegions.length;
	project.editor.speedRegions = project.editor.speedRegions.filter((r) => r.id !== id);
	if (project.editor.speedRegions.length === before) return false;
	saveProject(projectPath, project);
	return true;
}

// ── Annotation regions ────────────────────────────────────────────────

export interface AddAnnotationOptions {
	type: AnnotationType;
	content: string;
	startMs: number;
	endMs: number;
	positionX?: number;
	positionY?: number;
	width?: number;
	height?: number;
	fontSize?: number;
	color?: string;
	bgColor?: string;
	fontFamily?: string;
	fontWeight?: "normal" | "bold";
	fontStyle?: "normal" | "italic";
	textAlign?: "left" | "center" | "right";
	arrowDirection?: ArrowDirection;
	arrowColor?: string;
}

export function addAnnotationRegion(
	projectPath: string,
	opts: AddAnnotationOptions,
): AnnotationRegion {
	validateTimeRange(opts.startMs, opts.endMs);
	const project = loadProject(projectPath);

	const style: AnnotationTextStyle = {
		...DEFAULT_ANNOTATION_STYLE,
		...(opts.fontSize !== undefined ? { fontSize: opts.fontSize } : {}),
		...(opts.color !== undefined ? { color: opts.color } : {}),
		...(opts.bgColor !== undefined ? { backgroundColor: opts.bgColor } : {}),
		...(opts.fontFamily !== undefined ? { fontFamily: opts.fontFamily } : {}),
		...(opts.fontWeight !== undefined ? { fontWeight: opts.fontWeight } : {}),
		...(opts.fontStyle !== undefined ? { fontStyle: opts.fontStyle } : {}),
		...(opts.textAlign !== undefined ? { textAlign: opts.textAlign } : {}),
	};

	const figureData: FigureData | undefined =
		opts.type === "figure"
			? {
					...DEFAULT_FIGURE_DATA,
					...(opts.arrowDirection !== undefined ? { arrowDirection: opts.arrowDirection } : {}),
					...(opts.arrowColor !== undefined ? { color: opts.arrowColor } : {}),
				}
			: undefined;

	const region: AnnotationRegion = {
		id: `annotation-${randomUUID().slice(0, 8)}`,
		startMs: opts.startMs,
		endMs: opts.endMs,
		type: opts.type,
		content: opts.content,
		textContent: opts.type === "text" ? opts.content : undefined,
		imageContent: opts.type === "image" ? opts.content : undefined,
		position: {
			x: opts.positionX ?? DEFAULT_ANNOTATION_POSITION.x,
			y: opts.positionY ?? DEFAULT_ANNOTATION_POSITION.y,
		},
		size: {
			width: opts.width ?? DEFAULT_ANNOTATION_SIZE.width,
			height: opts.height ?? DEFAULT_ANNOTATION_SIZE.height,
		},
		style,
		zIndex: project.editor.annotationRegions.length + 1,
		figureData,
	};

	project.editor.annotationRegions.push(region);
	saveProject(projectPath, project);
	return region;
}

export function listAnnotationRegions(projectPath: string): AnnotationRegion[] {
	return loadProject(projectPath).editor.annotationRegions;
}

export function removeAnnotationRegion(projectPath: string, id: string): boolean {
	const project = loadProject(projectPath);
	const before = project.editor.annotationRegions.length;
	project.editor.annotationRegions = project.editor.annotationRegions.filter((r) => r.id !== id);
	if (project.editor.annotationRegions.length === before) return false;
	saveProject(projectPath, project);
	return true;
}
