import {
	type CropRegion,
	DEFAULT_CROP_REGION,
	DEFAULT_WEBCAM_LAYOUT_PRESET,
	DEFAULT_WEBCAM_MASK_SHAPE,
	DEFAULT_WEBCAM_POSITION,
	DEFAULT_WEBCAM_SIZE_PRESET,
	type WebcamLayoutPreset,
	type WebcamMaskShape,
	type WebcamPosition,
	type WebcamSizePreset,
} from "@/components/video-editor/types";
import {
	type CursorHighlightConfig,
	DEFAULT_CURSOR_HIGHLIGHT,
} from "@/components/video-editor/videoPlayback/cursorHighlight";
import type { ExportFormat, ExportQuality, GifFrameRate, GifSizePreset } from "@/lib/exporter";
import { DEFAULT_WALLPAPER } from "@/lib/wallpaper";
import type { AspectRatio } from "@/utils/aspectRatioUtils";

const PREFS_KEY = "openscreen_user_preferences";

const VALID_ASPECT_RATIOS: readonly string[] = [
	"16:9",
	"9:16",
	"1:1",
	"4:3",
	"4:5",
	"16:10",
	"10:16",
	"native",
];

export interface UserPreferences {
	/** Default wallpaper/background for new edits. */
	wallpaper: string;
	/** Uploaded background images available in the background picker. */
	customImages: string[];
	/** Default shadow intensity for the screen layer. */
	shadowIntensity: number;
	/** Default blur toggle. */
	showBlur: boolean;
	/** Default motion blur amount. */
	motionBlurAmount: number;
	/** Default screen corner radius. */
	borderRadius: number;
	/** Default padding % */
	padding: number;
	/** Default crop region */
	cropRegion: CropRegion;
	/** Default aspect ratio */
	aspectRatio: AspectRatio;
	/** Default webcam layout mode */
	webcamLayoutPreset: WebcamLayoutPreset;
	/** Default webcam mask shape */
	webcamMaskShape: WebcamMaskShape;
	/** Default webcam size */
	webcamSizePreset: WebcamSizePreset;
	/** Default picture-in-picture webcam position */
	webcamPosition: WebcamPosition | null;
	/** Default export quality */
	exportQuality: ExportQuality;
	/** Default export format */
	exportFormat: ExportFormat;
	/** Save exports to Downloads without showing the OS save dialog. */
	autoSaveExportToDownloads: boolean;
	/** Default GIF frame rate */
	gifFrameRate: GifFrameRate;
	/** Default GIF loop setting */
	gifLoop: boolean;
	/** Default GIF size preset */
	gifSizePreset: GifSizePreset;
	/** Default cursor highlight settings */
	cursorHighlight: CursorHighlightConfig;
	/** Folder used for the most recent successful export, if any */
	exportFolder: string | null;
}

const DEFAULT_PREFS: UserPreferences = {
	wallpaper: DEFAULT_WALLPAPER,
	customImages: [],
	shadowIntensity: 0,
	showBlur: false,
	motionBlurAmount: 0,
	borderRadius: 0,
	padding: 50,
	cropRegion: DEFAULT_CROP_REGION,
	aspectRatio: "16:9",
	webcamLayoutPreset: DEFAULT_WEBCAM_LAYOUT_PRESET,
	webcamMaskShape: DEFAULT_WEBCAM_MASK_SHAPE,
	webcamSizePreset: DEFAULT_WEBCAM_SIZE_PRESET,
	webcamPosition: DEFAULT_WEBCAM_POSITION,
	exportQuality: "good",
	exportFormat: "mp4",
	autoSaveExportToDownloads: false,
	gifFrameRate: 15,
	gifLoop: true,
	gifSizePreset: "medium",
	cursorHighlight: DEFAULT_CURSOR_HIGHLIGHT,
	exportFolder: null,
};

function cloneDefaultPreferences(): UserPreferences {
	return {
		...DEFAULT_PREFS,
		customImages: [...DEFAULT_PREFS.customImages],
		cropRegion: { ...DEFAULT_PREFS.cropRegion },
		webcamPosition: DEFAULT_PREFS.webcamPosition ? { ...DEFAULT_PREFS.webcamPosition } : null,
		cursorHighlight: { ...DEFAULT_PREFS.cursorHighlight },
	};
}

function safeJsonParse(text: string | null): Record<string, unknown> | null {
	if (!text) return null;
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}

function finiteNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value);
}

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

function normalizeCropRegion(value: unknown): CropRegion {
	if (!value || typeof value !== "object") return { ...DEFAULT_PREFS.cropRegion };
	const crop = value as Partial<CropRegion>;
	const x = finiteNumber(crop.x) ? clamp(crop.x, 0, 1) : DEFAULT_PREFS.cropRegion.x;
	const y = finiteNumber(crop.y) ? clamp(crop.y, 0, 1) : DEFAULT_PREFS.cropRegion.y;
	const width = finiteNumber(crop.width)
		? clamp(crop.width, 0.01, 1 - x)
		: DEFAULT_PREFS.cropRegion.width;
	const height = finiteNumber(crop.height)
		? clamp(crop.height, 0.01, 1 - y)
		: DEFAULT_PREFS.cropRegion.height;
	return { x, y, width, height };
}

function normalizeWebcamPosition(value: unknown): WebcamPosition | null {
	if (!value || typeof value !== "object") {
		return DEFAULT_PREFS.webcamPosition ? { ...DEFAULT_PREFS.webcamPosition } : null;
	}
	const position = value as Partial<WebcamPosition>;
	return finiteNumber(position.cx) && finiteNumber(position.cy)
		? { cx: clamp(position.cx, 0, 1), cy: clamp(position.cy, 0, 1) }
		: DEFAULT_PREFS.webcamPosition
			? { ...DEFAULT_PREFS.webcamPosition }
			: null;
}

function normalizeCursorHighlight(value: unknown): CursorHighlightConfig {
	if (!value || typeof value !== "object") return { ...DEFAULT_PREFS.cursorHighlight };
	const highlight = value as Partial<CursorHighlightConfig>;
	return {
		enabled:
			typeof highlight.enabled === "boolean"
				? highlight.enabled
				: DEFAULT_PREFS.cursorHighlight.enabled,
		style:
			highlight.style === "dot" || highlight.style === "ring"
				? highlight.style
				: DEFAULT_PREFS.cursorHighlight.style,
		sizePx: finiteNumber(highlight.sizePx)
			? clamp(highlight.sizePx, 10, 36)
			: DEFAULT_PREFS.cursorHighlight.sizePx,
		color:
			typeof highlight.color === "string" &&
			/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(highlight.color)
				? highlight.color
				: DEFAULT_PREFS.cursorHighlight.color,
		opacity: finiteNumber(highlight.opacity)
			? clamp(highlight.opacity, 0, 1)
			: DEFAULT_PREFS.cursorHighlight.opacity,
		onlyOnClicks:
			typeof highlight.onlyOnClicks === "boolean"
				? highlight.onlyOnClicks
				: DEFAULT_PREFS.cursorHighlight.onlyOnClicks,
		clickEmphasisDurationMs:
			finiteNumber(highlight.clickEmphasisDurationMs) && highlight.clickEmphasisDurationMs > 0
				? highlight.clickEmphasisDurationMs
				: DEFAULT_PREFS.cursorHighlight.clickEmphasisDurationMs,
		offsetXNorm: finiteNumber(highlight.offsetXNorm)
			? clamp(highlight.offsetXNorm, -1, 1)
			: DEFAULT_PREFS.cursorHighlight.offsetXNorm,
		offsetYNorm: finiteNumber(highlight.offsetYNorm)
			? clamp(highlight.offsetYNorm, -1, 1)
			: DEFAULT_PREFS.cursorHighlight.offsetYNorm,
	};
}

function isPersistableBackgroundReference(value: string): boolean {
	return /^(file:\/\/|https?:\/\/)/.test(value) || value.startsWith("/wallpapers/");
}

function normalizeCustomImages(value: unknown): string[] {
	if (!Array.isArray(value)) return [...DEFAULT_PREFS.customImages];
	return Array.from(
		new Set(
			value.filter(
				(item): item is string =>
					typeof item === "string" && isPersistableBackgroundReference(item),
			),
		),
	).slice(0, 20);
}

/**
 * Load persisted user preferences from localStorage.
 * Returns defaults for any missing or invalid fields.
 */
export function loadUserPreferences(): UserPreferences {
	let raw: Record<string, unknown> | null = null;
	try {
		raw = safeJsonParse(localStorage.getItem(PREFS_KEY));
	} catch {
		return cloneDefaultPreferences();
	}
	if (!raw || typeof raw !== "object") return cloneDefaultPreferences();

	return {
		wallpaper:
			typeof raw.wallpaper === "string" &&
			raw.wallpaper.trim() &&
			isPersistableBackgroundReference(raw.wallpaper)
				? raw.wallpaper
				: DEFAULT_PREFS.wallpaper,
		customImages: normalizeCustomImages(raw.customImages),
		shadowIntensity: finiteNumber(raw.shadowIntensity)
			? clamp(raw.shadowIntensity, 0, 1)
			: DEFAULT_PREFS.shadowIntensity,
		showBlur: typeof raw.showBlur === "boolean" ? raw.showBlur : DEFAULT_PREFS.showBlur,
		motionBlurAmount: finiteNumber(raw.motionBlurAmount)
			? clamp(raw.motionBlurAmount, 0, 1)
			: DEFAULT_PREFS.motionBlurAmount,
		borderRadius: finiteNumber(raw.borderRadius)
			? Math.max(0, raw.borderRadius)
			: DEFAULT_PREFS.borderRadius,
		padding:
			finiteNumber(raw.padding) && raw.padding >= 0 && raw.padding <= 100
				? raw.padding
				: DEFAULT_PREFS.padding,
		cropRegion: normalizeCropRegion(raw.cropRegion),
		aspectRatio:
			typeof raw.aspectRatio === "string" && VALID_ASPECT_RATIOS.includes(raw.aspectRatio)
				? (raw.aspectRatio as AspectRatio)
				: DEFAULT_PREFS.aspectRatio,
		webcamLayoutPreset:
			raw.webcamLayoutPreset === "picture-in-picture" ||
			raw.webcamLayoutPreset === "vertical-stack" ||
			raw.webcamLayoutPreset === "dual-frame"
				? raw.webcamLayoutPreset
				: DEFAULT_PREFS.webcamLayoutPreset,
		webcamMaskShape:
			raw.webcamMaskShape === "rectangle" ||
			raw.webcamMaskShape === "circle" ||
			raw.webcamMaskShape === "square" ||
			raw.webcamMaskShape === "rounded"
				? raw.webcamMaskShape
				: DEFAULT_PREFS.webcamMaskShape,
		webcamSizePreset:
			finiteNumber(raw.webcamSizePreset) && raw.webcamSizePreset >= 10 && raw.webcamSizePreset <= 50
				? raw.webcamSizePreset
				: DEFAULT_PREFS.webcamSizePreset,
		webcamPosition: normalizeWebcamPosition(raw.webcamPosition),
		exportQuality:
			raw.exportQuality === "medium" ||
			raw.exportQuality === "good" ||
			raw.exportQuality === "source"
				? (raw.exportQuality as ExportQuality)
				: DEFAULT_PREFS.exportQuality,
		exportFormat:
			raw.exportFormat === "gif" || raw.exportFormat === "mp4"
				? (raw.exportFormat as ExportFormat)
				: DEFAULT_PREFS.exportFormat,
		autoSaveExportToDownloads:
			typeof raw.autoSaveExportToDownloads === "boolean"
				? raw.autoSaveExportToDownloads
				: DEFAULT_PREFS.autoSaveExportToDownloads,
		gifFrameRate:
			raw.gifFrameRate === 15 ||
			raw.gifFrameRate === 20 ||
			raw.gifFrameRate === 25 ||
			raw.gifFrameRate === 30
				? raw.gifFrameRate
				: DEFAULT_PREFS.gifFrameRate,
		gifLoop: typeof raw.gifLoop === "boolean" ? raw.gifLoop : DEFAULT_PREFS.gifLoop,
		gifSizePreset:
			raw.gifSizePreset === "medium" ||
			raw.gifSizePreset === "large" ||
			raw.gifSizePreset === "original"
				? raw.gifSizePreset
				: DEFAULT_PREFS.gifSizePreset,
		cursorHighlight: normalizeCursorHighlight(raw.cursorHighlight),
		exportFolder:
			typeof raw.exportFolder === "string" && raw.exportFolder.length > 0
				? raw.exportFolder
				: DEFAULT_PREFS.exportFolder,
	};
}

/**
 * Extracts the parent directory from a saved file path. Handles both POSIX
 * and Windows separators since the path comes from the OS save dialog.
 *
 * Root directories are preserved with their trailing separator so that the
 * value is still a valid directory path:
 *   "/video.mp4"      -> "/"
 *   "C:\\video.mp4"   -> "C:\\"
 *
 * Returns null if no separator is found.
 */
export function parentDirectoryOf(filePath: string): string | null {
	const lastSep = Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\"));
	if (lastSep < 0) return null;

	// POSIX root, e.g. "/video.mp4" -> "/"
	if (lastSep === 0) return filePath[0];

	// Windows drive root, e.g. "C:\\video.mp4" -> "C:\\"
	if (lastSep === 2 && /^[A-Za-z]:[/\\]/.test(filePath)) {
		return filePath.slice(0, lastSep + 1);
	}

	return filePath.slice(0, lastSep);
}

/**
 * Returns the remembered export folder as `string | undefined`, suitable for
 * passing directly to IPC handlers that treat absence as "use the default".
 */
export function getExportFolder(): string | undefined {
	return loadUserPreferences().exportFolder ?? undefined;
}

/**
 * Persist user preferences to localStorage.
 * Only the explicitly provided fields are updated.
 */
export function saveUserPreferences(partial: Partial<UserPreferences>): void {
	const current = loadUserPreferences();
	const merged = { ...current, ...partial };
	try {
		localStorage.setItem(PREFS_KEY, JSON.stringify(merged));
	} catch {
		// localStorage may be unavailable (e.g. private browsing quota exceeded)
	}
}
