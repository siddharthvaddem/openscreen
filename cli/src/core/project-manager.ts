import fs from "node:fs";
import path from "node:path";
import type { AspectRatio } from "../../../src/shared/aspect-ratios";
import type {
	ExportFormat,
	ExportQuality,
	GifFrameRate,
	GifSizePreset,
} from "../../../src/shared/export-types";
import {
	createProjectData,
	type EditorProjectData,
	normalizeProjectEditor,
	PROJECT_VERSION,
	type ProjectEditorState,
	validateProjectData,
	WALLPAPER_PATHS,
} from "../../../src/shared/project-schema";
import type { ProjectMedia } from "../../../src/shared/recording-session";

export interface CreateProjectOptions {
	videoPath: string;
	webcamPath?: string;
	wallpaper?: string;
	padding?: number;
	borderRadius?: number;
	aspectRatio?: AspectRatio;
	shadowIntensity?: number;
	showBlur?: boolean;
	motionBlurAmount?: number;
	exportQuality?: ExportQuality;
	exportFormat?: ExportFormat;
}

export interface EditProjectOptions {
	wallpaper?: string;
	padding?: number;
	borderRadius?: number;
	shadowIntensity?: number;
	showBlur?: boolean;
	motionBlurAmount?: number;
	aspectRatio?: AspectRatio;
	exportQuality?: ExportQuality;
	exportFormat?: ExportFormat;
	gifFrameRate?: GifFrameRate;
	gifLoop?: boolean;
	gifSizePreset?: GifSizePreset;
}

export function loadProject(projectPath: string): EditorProjectData {
	const absPath = path.resolve(projectPath);

	let raw: string;
	try {
		raw = fs.readFileSync(absPath, "utf-8");
	} catch (e) {
		const err = e as NodeJS.ErrnoException;
		if (err.code === "ENOENT") throw new Error(`Project file not found: ${absPath}`);
		throw new Error(`Failed to read project file: ${absPath}: ${err.message}`);
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new Error(`Invalid JSON in project file: ${absPath}`);
	}

	if (!validateProjectData(parsed)) {
		throw new Error(`Invalid project data in: ${absPath}`);
	}

	return {
		...parsed,
		editor: normalizeProjectEditor(parsed.editor),
	};
}

export function saveProject(projectPath: string, data: EditorProjectData): void {
	const absPath = path.resolve(projectPath);
	fs.mkdirSync(path.dirname(absPath), { recursive: true });

	// Atomic write: write to temp file then rename
	const tmpPath = `${absPath}.tmp`;
	fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
	fs.renameSync(tmpPath, absPath);
}

export function createProject(
	options: CreateProjectOptions,
	outputPath: string,
): EditorProjectData {
	const videoAbsPath = path.resolve(options.videoPath);
	try {
		fs.accessSync(videoAbsPath);
	} catch {
		throw new Error(`Video file not found: ${videoAbsPath}`);
	}

	const media: ProjectMedia = {
		screenVideoPath: videoAbsPath,
	};

	if (options.webcamPath) {
		const webcamAbsPath = path.resolve(options.webcamPath);
		try {
			fs.accessSync(webcamAbsPath);
		} catch {
			throw new Error(`Webcam video file not found: ${webcamAbsPath}`);
		}
		media.webcamVideoPath = webcamAbsPath;
	}

	const editorOverrides: Partial<ProjectEditorState> = {};

	if (options.wallpaper !== undefined) editorOverrides.wallpaper = options.wallpaper;
	if (options.padding !== undefined) editorOverrides.padding = options.padding;
	if (options.borderRadius !== undefined) editorOverrides.borderRadius = options.borderRadius;
	if (options.aspectRatio !== undefined) editorOverrides.aspectRatio = options.aspectRatio;
	if (options.shadowIntensity !== undefined)
		editorOverrides.shadowIntensity = options.shadowIntensity;
	if (options.showBlur !== undefined) editorOverrides.showBlur = options.showBlur;
	if (options.motionBlurAmount !== undefined)
		editorOverrides.motionBlurAmount = options.motionBlurAmount;
	if (options.exportQuality !== undefined) editorOverrides.exportQuality = options.exportQuality;
	if (options.exportFormat !== undefined) editorOverrides.exportFormat = options.exportFormat;

	const editor = normalizeProjectEditor(editorOverrides);
	const project = createProjectData(media, editor);

	saveProject(outputPath, project);
	return project;
}

export function editProject(projectPath: string, edits: EditProjectOptions): EditorProjectData {
	const project = loadProject(projectPath);

	const updatedEditor: ProjectEditorState = { ...project.editor };

	if (edits.wallpaper !== undefined) updatedEditor.wallpaper = edits.wallpaper;
	if (edits.padding !== undefined) updatedEditor.padding = edits.padding;
	if (edits.borderRadius !== undefined) updatedEditor.borderRadius = edits.borderRadius;
	if (edits.shadowIntensity !== undefined) updatedEditor.shadowIntensity = edits.shadowIntensity;
	if (edits.showBlur !== undefined) updatedEditor.showBlur = edits.showBlur;
	if (edits.motionBlurAmount !== undefined) updatedEditor.motionBlurAmount = edits.motionBlurAmount;
	if (edits.aspectRatio !== undefined) updatedEditor.aspectRatio = edits.aspectRatio;
	if (edits.exportQuality !== undefined) updatedEditor.exportQuality = edits.exportQuality;
	if (edits.exportFormat !== undefined) updatedEditor.exportFormat = edits.exportFormat;
	if (edits.gifFrameRate !== undefined) updatedEditor.gifFrameRate = edits.gifFrameRate;
	if (edits.gifLoop !== undefined) updatedEditor.gifLoop = edits.gifLoop;
	if (edits.gifSizePreset !== undefined) updatedEditor.gifSizePreset = edits.gifSizePreset;

	// Re-normalize to ensure constraints are met
	const normalizedEditor = normalizeProjectEditor(updatedEditor);
	const updated: EditorProjectData = { ...project, editor: normalizedEditor };

	saveProject(projectPath, updated);
	return updated;
}

export function inspectProject(projectPath: string): {
	version: number;
	media: ProjectMedia | undefined;
	settings: Record<string, unknown>;
	regions: {
		zooms: number;
		trims: number;
		speeds: number;
		annotations: number;
	};
} {
	const project = loadProject(projectPath);

	return {
		version: project.version,
		media: project.media,
		settings: {
			wallpaper: project.editor.wallpaper,
			padding: project.editor.padding,
			borderRadius: project.editor.borderRadius,
			shadowIntensity: project.editor.shadowIntensity,
			showBlur: project.editor.showBlur,
			motionBlurAmount: project.editor.motionBlurAmount,
			aspectRatio: project.editor.aspectRatio,
			cropRegion: project.editor.cropRegion,
			webcamLayoutPreset: project.editor.webcamLayoutPreset,
			webcamMaskShape: project.editor.webcamMaskShape,
			exportQuality: project.editor.exportQuality,
			exportFormat: project.editor.exportFormat,
			gifFrameRate: project.editor.gifFrameRate,
			gifLoop: project.editor.gifLoop,
			gifSizePreset: project.editor.gifSizePreset,
		},
		regions: {
			zooms: project.editor.zoomRegions.length,
			trims: project.editor.trimRegions.length,
			speeds: project.editor.speedRegions.length,
			annotations: project.editor.annotationRegions.length,
		},
	};
}

export { WALLPAPER_PATHS, PROJECT_VERSION };
export type { EditorProjectData, ProjectEditorState };
