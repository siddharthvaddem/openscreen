import fs from "node:fs";
import path from "node:path";
import { ASPECT_RATIOS, type AspectRatio } from "../../../src/shared/aspect-ratios";
import {
	type ExportFormat,
	type ExportQuality,
	type GifFrameRate,
	type GifSizePreset,
	VALID_GIF_FRAME_RATES,
} from "../../../src/shared/export-types";
import {
	createProjectData,
	type EditorProjectData,
	normalizeProjectEditor,
	PROJECT_VERSION,
	type ProjectEditorState,
	resolveProjectMedia,
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

	// Inline the shared validateProjectData checks so we can surface *which*
	// field failed (CLI users need actionable errors) and reuse the media we
	// resolve here instead of calling resolveProjectMedia twice.
	if (!parsed || typeof parsed !== "object") {
		throw new Error(`Invalid project data in ${absPath}: expected a JSON object`);
	}
	const project = parsed as Partial<EditorProjectData>;
	if (typeof project.version !== "number") {
		throw new Error(`Invalid project data in ${absPath}: missing or invalid 'version' field`);
	}
	const media = resolveProjectMedia(project);
	if (!media) {
		throw new Error(
			`Invalid project data in ${absPath}: missing screen video reference (expected 'media.screenVideoPath' or legacy 'videoPath')`,
		);
	}
	if (!project.editor || typeof project.editor !== "object") {
		throw new Error(`Invalid project data in ${absPath}: missing 'editor' section`);
	}

	return {
		...(project as EditorProjectData),
		media,
		editor: normalizeProjectEditor(project.editor),
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

// Translate wallpaper shortcuts (wallpaper1..wallpaper18) into the bundled
// path the renderer expects (/wallpapers/wallpaperN.jpg). Hex colors, absolute
// paths, and anything already matching a known wallpaper path pass through
// unchanged so GUI-saved projects stay valid.
function normalizeWallpaperInput(value: string): string {
	const match = /^wallpaper(\d+)$/.exec(value);
	if (!match) return value;
	const index = Number.parseInt(match[1], 10);
	if (!Number.isFinite(index) || index < 1 || index > WALLPAPER_PATHS.length) {
		throw new Error(
			`Invalid wallpaper shortcut: ${value}. Expected wallpaper1 through wallpaper${WALLPAPER_PATHS.length}, a hex color (#rrggbb), or an absolute path.`,
		);
	}
	return WALLPAPER_PATHS[index - 1];
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

	if (options.wallpaper !== undefined)
		editorOverrides.wallpaper = normalizeWallpaperInput(options.wallpaper);
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

const VALID_EXPORT_QUALITIES: ReadonlyArray<ExportQuality> = ["medium", "good", "source"];
const VALID_EXPORT_FORMATS: ReadonlyArray<ExportFormat> = ["mp4", "gif"];
const VALID_GIF_SIZE_PRESETS: ReadonlyArray<GifSizePreset> = ["medium", "large", "original"];

// CLI-layer validation. normalizeProjectEditor silently clamps out-of-range
// values (sensible for the GUI, but surprising on the command line — a user
// who passes --padding 200 should see an error instead of getting 100). Reject
// invalid inputs up-front so the failure is visible at the edit call site.
function validateEditOptions(edits: EditProjectOptions): void {
	if (edits.padding !== undefined) {
		if (!Number.isFinite(edits.padding) || edits.padding < 0 || edits.padding > 100) {
			throw new Error(`Invalid padding: ${edits.padding}. Must be between 0 and 100.`);
		}
	}
	if (edits.motionBlurAmount !== undefined) {
		if (
			!Number.isFinite(edits.motionBlurAmount) ||
			edits.motionBlurAmount < 0 ||
			edits.motionBlurAmount > 1
		) {
			throw new Error(
				`Invalid motion blur amount: ${edits.motionBlurAmount}. Must be between 0 and 1.`,
			);
		}
	}
	if (edits.aspectRatio !== undefined && !ASPECT_RATIOS.includes(edits.aspectRatio)) {
		throw new Error(
			`Invalid aspect ratio: ${edits.aspectRatio}. Valid values: ${ASPECT_RATIOS.join(", ")}.`,
		);
	}
	if (edits.exportQuality !== undefined && !VALID_EXPORT_QUALITIES.includes(edits.exportQuality)) {
		throw new Error(
			`Invalid export quality: ${edits.exportQuality}. Valid values: ${VALID_EXPORT_QUALITIES.join(", ")}.`,
		);
	}
	if (edits.exportFormat !== undefined && !VALID_EXPORT_FORMATS.includes(edits.exportFormat)) {
		throw new Error(
			`Invalid export format: ${edits.exportFormat}. Valid values: ${VALID_EXPORT_FORMATS.join(", ")}.`,
		);
	}
	if (
		edits.gifFrameRate !== undefined &&
		!VALID_GIF_FRAME_RATES.includes(edits.gifFrameRate as GifFrameRate)
	) {
		throw new Error(
			`Invalid GIF frame rate: ${edits.gifFrameRate}. Valid values: ${VALID_GIF_FRAME_RATES.join(", ")}.`,
		);
	}
	if (edits.gifSizePreset !== undefined && !VALID_GIF_SIZE_PRESETS.includes(edits.gifSizePreset)) {
		throw new Error(
			`Invalid GIF size preset: ${edits.gifSizePreset}. Valid values: ${VALID_GIF_SIZE_PRESETS.join(", ")}.`,
		);
	}
}

export function editProject(projectPath: string, edits: EditProjectOptions): EditorProjectData {
	validateEditOptions(edits);
	const project = loadProject(projectPath);

	const updatedEditor: ProjectEditorState = { ...project.editor };

	if (edits.wallpaper !== undefined)
		updatedEditor.wallpaper = normalizeWallpaperInput(edits.wallpaper);
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
