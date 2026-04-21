import { normalizeBlurColor, normalizeBlurType } from "@/lib/blurEffects";
import type { ExportFormat, ExportQuality, GifFrameRate, GifSizePreset } from "@/lib/exporter";
import type { ProjectMedia } from "@/lib/recordingSession";
import { normalizeProjectMedia } from "@/lib/recordingSession";
import { ASPECT_RATIOS, type AspectRatio, isPortraitAspectRatio } from "@/utils/aspectRatioUtils";
import {
	type AnnotationRegion,
	type CropRegion,
	clampPlaybackSpeed,
	DEFAULT_ANNOTATION_POSITION,
	DEFAULT_ANNOTATION_SIZE,
	DEFAULT_ANNOTATION_STYLE,
	DEFAULT_BLUR_BLOCK_SIZE,
	DEFAULT_BLUR_DATA,
	DEFAULT_BLUR_FREEHAND_POINTS,
	DEFAULT_BLUR_INTENSITY,
	DEFAULT_CROP_REGION,
	DEFAULT_FIGURE_DATA,
	DEFAULT_PLAYBACK_SPEED,
	DEFAULT_WEBCAM_LAYOUT_PRESET,
	DEFAULT_WEBCAM_MASK_SHAPE,
	DEFAULT_WEBCAM_POSITION,
	DEFAULT_WEBCAM_SIZE_PRESET,
	DEFAULT_ZOOM_DEPTH,
	MAX_BLUR_BLOCK_SIZE,
	MAX_BLUR_INTENSITY,
	MAX_PLAYBACK_SPEED,
	MIN_BLUR_BLOCK_SIZE,
	MIN_BLUR_INTENSITY,
	MIN_PLAYBACK_SPEED,
	type SpeedRegion,
	type TrimRegion,
	type WebcamLayoutPreset,
	type WebcamMaskShape,
	type WebcamPosition,
	type WebcamSizePreset,
	type ZoomRegion,
} from "./types";

const WALLPAPER_COUNT = 18;
const VALID_BLUR_SHAPES = new Set(["rectangle", "oval", "freehand"] as const);

export const WALLPAPER_PATHS = Array.from(
	{ length: WALLPAPER_COUNT },
	(_, i) => `/wallpapers/wallpaper${i + 1}.jpg`,
);

export const PROJECT_VERSION = 2;

export interface ProjectEditorState {
	wallpaper: string;
	shadowIntensity: number;
	showBlur: boolean;
	motionBlurAmount: number;
	borderRadius: number;
	padding: number;
	cropRegion: CropRegion;
	zoomRegions: ZoomRegion[];
	trimRegions: TrimRegion[];
	speedRegions: SpeedRegion[];
	annotationRegions: AnnotationRegion[];
	aspectRatio: AspectRatio;
	webcamLayoutPreset: WebcamLayoutPreset;
	webcamMaskShape: WebcamMaskShape;
	webcamSizePreset: WebcamSizePreset;
	webcamPosition: WebcamPosition | null;
	exportQuality: ExportQuality;
	exportFormat: ExportFormat;
	gifFrameRate: GifFrameRate;
	gifLoop: boolean;
	gifSizePreset: GifSizePreset;
}

export interface EditorProjectData {
	version: number;
	media?: ProjectMedia;
	editor: ProjectEditorState;
	videoPath?: string;
}

function isFiniteNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value);
}

function computeNormalizedWebcamLayoutPreset(
	webcamLayoutPreset: Partial<ProjectEditorState>["webcamLayoutPreset"],
	normalizedAspectRatio: AspectRatio,
): WebcamLayoutPreset {
	switch (webcamLayoutPreset) {
		case "picture-in-picture":
			return webcamLayoutPreset;
		case "vertical-stack":
			return isPortraitAspectRatio(normalizedAspectRatio)
				? webcamLayoutPreset
				: DEFAULT_WEBCAM_LAYOUT_PRESET;
		case "dual-frame":
			return isPortraitAspectRatio(normalizedAspectRatio)
				? DEFAULT_WEBCAM_LAYOUT_PRESET
				: webcamLayoutPreset;
		default:
			return DEFAULT_WEBCAM_LAYOUT_PRESET;
	}
}

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

function isFileUrl(value: string): boolean {
	return /^file:\/\//i.test(value);
}

function encodePathSegments(pathname: string, keepWindowsDrive = false): string {
	return pathname
		.split("/")
		.map((segment, index) => {
			if (!segment) return "";
			if (keepWindowsDrive && index === 1 && /^[a-zA-Z]:$/.test(segment)) {
				return segment;
			}
			return encodeURIComponent(segment);
		})
		.join("/");
}

export function toFileUrl(filePath: string): string {
	const normalized = filePath.replace(/\\/g, "/");

	// Windows drive path: C:/Users/...
	if (/^[a-zA-Z]:\//.test(normalized)) {
		return `file://${encodePathSegments(`/${normalized}`, true)}`;
	}

	// UNC path: //server/share/...
	if (normalized.startsWith("//")) {
		const [host, ...pathParts] = normalized.replace(/^\/+/, "").split("/");
		const encodedPath = pathParts.map((part) => encodeURIComponent(part)).join("/");
		return encodedPath ? `file://${host}/${encodedPath}` : `file://${host}/`;
	}

	const absolutePath = normalized.startsWith("/") ? normalized : `/${normalized}`;
	return `file://${encodePathSegments(absolutePath)}`;
}

export function fromFileUrl(fileUrl: string): string {
	const value = fileUrl.trim();
	if (!isFileUrl(value)) {
		return fileUrl;
	}

	try {
		const url = new URL(value);
		const pathname = decodeURIComponent(url.pathname);

		if (url.host && url.host !== "localhost") {
			return `//${url.host}${pathname}`;
		}

		if (/^\/[a-zA-Z]:/.test(pathname)) {
			return pathname.slice(1);
		}

		return pathname;
	} catch {
		const rawFallbackPath = value.replace(/^file:\/\//i, "");
		let fallbackPath = rawFallbackPath;
		try {
			fallbackPath = decodeURIComponent(rawFallbackPath);
		} catch {
			// Keep raw best-effort path if percent decoding fails.
		}
		return fallbackPath.replace(/^\/([a-zA-Z]:)/, "$1");
	}
}

export function deriveNextId(prefix: string, ids: string[]): number {
	const max = ids.reduce((acc, id) => {
		const match = id.match(new RegExp(`^${prefix}-(\\d+)$`));
		if (!match) return acc;
		const value = Number(match[1]);
		return Number.isFinite(value) ? Math.max(acc, value) : acc;
	}, 0);
	return max + 1;
}

export function validateProjectData(candidate: unknown): candidate is EditorProjectData {
	if (!candidate || typeof candidate !== "object") return false;
	const project = candidate as Partial<EditorProjectData>;
	if (typeof project.version !== "number") return false;
	if (!resolveProjectMedia(project)) return false;
	if (!project.editor || typeof project.editor !== "object") return false;
	return true;
}

export function resolveProjectMedia(
	candidate: Partial<EditorProjectData> | { media?: unknown; videoPath?: unknown },
): ProjectMedia | null {
	const media = normalizeProjectMedia(candidate.media);
	if (media) {
		return media;
	}

	if (typeof candidate.videoPath === "string" && candidate.videoPath.trim()) {
		return { screenVideoPath: candidate.videoPath };
	}

	return null;
}

export function normalizeProjectEditor(editor: Partial<ProjectEditorState>): ProjectEditorState {
	const validAspectRatios = new Set<AspectRatio>(ASPECT_RATIOS);
	const normalizedAspectRatio: AspectRatio = validAspectRatios.has(
		editor.aspectRatio as AspectRatio,
	)
		? (editor.aspectRatio as AspectRatio)
		: "16:9";
	const normalizedWebcamLayoutPreset = computeNormalizedWebcamLayoutPreset(
		editor.webcamLayoutPreset,
		normalizedAspectRatio,
	);
	const normalizedWebcamPosition: WebcamPosition | null =
		normalizedWebcamLayoutPreset === "picture-in-picture" &&
		editor.webcamPosition &&
		typeof editor.webcamPosition === "object" &&
		isFiniteNumber((editor.webcamPosition as WebcamPosition).cx) &&
		isFiniteNumber((editor.webcamPosition as WebcamPosition).cy)
			? {
					cx: clamp((editor.webcamPosition as WebcamPosition).cx, 0, 1),
					cy: clamp((editor.webcamPosition as WebcamPosition).cy, 0, 1),
				}
			: DEFAULT_WEBCAM_POSITION;

	const normalizedZoomRegions: ZoomRegion[] = Array.isArray(editor.zoomRegions)
		? editor.zoomRegions
				.filter((region): region is ZoomRegion => Boolean(region && typeof region.id === "string"))
				.map((region) => {
					const rawStart = isFiniteNumber(region.startMs) ? Math.round(region.startMs) : 0;
					const rawEnd = isFiniteNumber(region.endMs) ? Math.round(region.endMs) : rawStart + 1000;
					const startMs = Math.max(0, Math.min(rawStart, rawEnd));
					const endMs = Math.max(startMs + 1, rawEnd);

					return {
						id: region.id,
						startMs,
						endMs,
						depth: [1, 2, 3, 4, 5, 6].includes(region.depth) ? region.depth : DEFAULT_ZOOM_DEPTH,
						focus: {
							cx: clamp(isFiniteNumber(region.focus?.cx) ? region.focus.cx : 0.5, 0, 1),
							cy: clamp(isFiniteNumber(region.focus?.cy) ? region.focus.cy : 0.5, 0, 1),
						},
						focusMode: region.focusMode === "auto" ? "auto" : "manual",
					};
				})
		: [];

	const normalizedTrimRegions: TrimRegion[] = Array.isArray(editor.trimRegions)
		? editor.trimRegions
				.filter((region): region is TrimRegion => Boolean(region && typeof region.id === "string"))
				.map((region) => {
					const rawStart = isFiniteNumber(region.startMs) ? Math.round(region.startMs) : 0;
					const rawEnd = isFiniteNumber(region.endMs) ? Math.round(region.endMs) : rawStart + 1000;
					const startMs = Math.max(0, Math.min(rawStart, rawEnd));
					const endMs = Math.max(startMs + 1, rawEnd);
					return {
						id: region.id,
						startMs,
						endMs,
					};
				})
		: [];

	const normalizedSpeedRegions: SpeedRegion[] = Array.isArray(editor.speedRegions)
		? editor.speedRegions
				.filter((region): region is SpeedRegion => Boolean(region && typeof region.id === "string"))
				.map((region) => {
					const rawStart = isFiniteNumber(region.startMs) ? Math.round(region.startMs) : 0;
					const rawEnd = isFiniteNumber(region.endMs) ? Math.round(region.endMs) : rawStart + 1000;
					const startMs = Math.max(0, Math.min(rawStart, rawEnd));
					const endMs = Math.max(startMs + 1, rawEnd);

					const speed =
						isFiniteNumber(region.speed) &&
						region.speed >= MIN_PLAYBACK_SPEED &&
						region.speed <= MAX_PLAYBACK_SPEED
							? clampPlaybackSpeed(region.speed)
							: DEFAULT_PLAYBACK_SPEED;

					return {
						id: region.id,
						startMs,
						endMs,
						speed,
					};
				})
		: [];

	const normalizedAnnotationRegions: AnnotationRegion[] = Array.isArray(editor.annotationRegions)
		? editor.annotationRegions
				.filter((region): region is AnnotationRegion =>
					Boolean(region && typeof region.id === "string"),
				)
				.map((region, index) => {
					const rawStart = isFiniteNumber(region.startMs) ? Math.round(region.startMs) : 0;
					const rawEnd = isFiniteNumber(region.endMs) ? Math.round(region.endMs) : rawStart + 1000;
					const startMs = Math.max(0, Math.min(rawStart, rawEnd));
					const endMs = Math.max(startMs + 1, rawEnd);
					const blurShape =
						typeof region.blurData?.shape === "string" &&
						VALID_BLUR_SHAPES.has(region.blurData.shape)
							? region.blurData.shape
							: DEFAULT_BLUR_DATA.shape;
					const blurType = normalizeBlurType(region.blurData?.type);
					const blurColor = normalizeBlurColor(region.blurData?.color);

					return {
						id: region.id,
						startMs,
						endMs,
						type:
							region.type === "image" || region.type === "figure" || region.type === "blur"
								? region.type
								: "text",
						content: typeof region.content === "string" ? region.content : "",
						textContent: typeof region.textContent === "string" ? region.textContent : undefined,
						imageContent: typeof region.imageContent === "string" ? region.imageContent : undefined,
						position: {
							x: clamp(
								isFiniteNumber(region.position?.x)
									? region.position.x
									: DEFAULT_ANNOTATION_POSITION.x,
								0,
								100,
							),
							y: clamp(
								isFiniteNumber(region.position?.y)
									? region.position.y
									: DEFAULT_ANNOTATION_POSITION.y,
								0,
								100,
							),
						},
						size: {
							width: clamp(
								isFiniteNumber(region.size?.width)
									? region.size.width
									: DEFAULT_ANNOTATION_SIZE.width,
								1,
								200,
							),
							height: clamp(
								isFiniteNumber(region.size?.height)
									? region.size.height
									: DEFAULT_ANNOTATION_SIZE.height,
								1,
								200,
							),
						},
						style: {
							...DEFAULT_ANNOTATION_STYLE,
							...(region.style && typeof region.style === "object" ? region.style : {}),
						},
						zIndex: isFiniteNumber(region.zIndex) ? region.zIndex : index + 1,
						figureData: region.figureData
							? {
									...DEFAULT_FIGURE_DATA,
									...region.figureData,
								}
							: undefined,
						blurData:
							region.blurData && typeof region.blurData === "object"
								? {
										...DEFAULT_BLUR_DATA,
										...region.blurData,
										type: blurType,
										shape: blurShape,
										color: blurColor,
										intensity: isFiniteNumber(region.blurData.intensity)
											? clamp(region.blurData.intensity, MIN_BLUR_INTENSITY, MAX_BLUR_INTENSITY)
											: DEFAULT_BLUR_INTENSITY,
										blockSize: isFiniteNumber(region.blurData.blockSize)
											? clamp(region.blurData.blockSize, MIN_BLUR_BLOCK_SIZE, MAX_BLUR_BLOCK_SIZE)
											: DEFAULT_BLUR_BLOCK_SIZE,
										freehandPoints: Array.isArray(region.blurData.freehandPoints)
											? region.blurData.freehandPoints
													.filter(
														(
															point,
														): point is {
															x: number;
															y: number;
														} =>
															Boolean(
																point &&
																	isFiniteNumber((point as { x?: unknown }).x) &&
																	isFiniteNumber((point as { y?: unknown }).y),
															),
													)
													.map((point) => ({
														x: clamp(point.x, 0, 100),
														y: clamp(point.y, 0, 100),
													}))
											: DEFAULT_BLUR_FREEHAND_POINTS,
									}
								: undefined,
					};
				})
		: [];

	const rawCropX = isFiniteNumber(editor.cropRegion?.x)
		? editor.cropRegion.x
		: DEFAULT_CROP_REGION.x;
	const rawCropY = isFiniteNumber(editor.cropRegion?.y)
		? editor.cropRegion.y
		: DEFAULT_CROP_REGION.y;
	const rawCropWidth = isFiniteNumber(editor.cropRegion?.width)
		? editor.cropRegion.width
		: DEFAULT_CROP_REGION.width;
	const rawCropHeight = isFiniteNumber(editor.cropRegion?.height)
		? editor.cropRegion.height
		: DEFAULT_CROP_REGION.height;

	const cropX = clamp(rawCropX, 0, 1);
	const cropY = clamp(rawCropY, 0, 1);
	const cropWidth = clamp(rawCropWidth, 0.01, 1 - cropX);
	const cropHeight = clamp(rawCropHeight, 0.01, 1 - cropY);

	return {
		wallpaper: typeof editor.wallpaper === "string" ? editor.wallpaper : WALLPAPER_PATHS[0],
		shadowIntensity: typeof editor.shadowIntensity === "number" ? editor.shadowIntensity : 0,
		showBlur: typeof editor.showBlur === "boolean" ? editor.showBlur : false,
		motionBlurAmount: isFiniteNumber(editor.motionBlurAmount)
			? clamp(editor.motionBlurAmount, 0, 1)
			: typeof (editor as { motionBlurEnabled?: unknown }).motionBlurEnabled === "boolean"
				? (editor as { motionBlurEnabled?: boolean }).motionBlurEnabled
					? 0.35
					: 0
				: 0,
		borderRadius: typeof editor.borderRadius === "number" ? editor.borderRadius : 0,
		padding: isFiniteNumber(editor.padding) ? clamp(editor.padding, 0, 100) : 50,
		cropRegion: {
			x: cropX,
			y: cropY,
			width: cropWidth,
			height: cropHeight,
		},
		zoomRegions: normalizedZoomRegions,
		trimRegions: normalizedTrimRegions,
		speedRegions: normalizedSpeedRegions,
		annotationRegions: normalizedAnnotationRegions,
		aspectRatio: normalizedAspectRatio,
		webcamLayoutPreset: normalizedWebcamLayoutPreset,
		webcamMaskShape:
			editor.webcamMaskShape === "rectangle" ||
			editor.webcamMaskShape === "circle" ||
			editor.webcamMaskShape === "square" ||
			editor.webcamMaskShape === "rounded"
				? editor.webcamMaskShape
				: DEFAULT_WEBCAM_MASK_SHAPE,
		webcamSizePreset:
			typeof editor.webcamSizePreset === "number" && isFiniteNumber(editor.webcamSizePreset)
				? Math.max(10, Math.min(50, editor.webcamSizePreset))
				: DEFAULT_WEBCAM_SIZE_PRESET,
		webcamPosition: normalizedWebcamPosition,
		exportQuality:
			editor.exportQuality === "medium" || editor.exportQuality === "source"
				? editor.exportQuality
				: "good",
		exportFormat: editor.exportFormat === "gif" ? "gif" : "mp4",
		gifFrameRate:
			editor.gifFrameRate === 15 ||
			editor.gifFrameRate === 20 ||
			editor.gifFrameRate === 25 ||
			editor.gifFrameRate === 30
				? editor.gifFrameRate
				: 15,
		gifLoop: typeof editor.gifLoop === "boolean" ? editor.gifLoop : true,
		gifSizePreset:
			editor.gifSizePreset === "medium" ||
			editor.gifSizePreset === "large" ||
			editor.gifSizePreset === "original"
				? editor.gifSizePreset
				: "medium",
	};
}

export function createProjectData(
	media: ProjectMedia,
	editor: ProjectEditorState,
): EditorProjectData {
	return {
		version: PROJECT_VERSION,
		media,
		editor,
	};
}

export function createProjectSnapshot(
	media: ProjectMedia,
	editor: Partial<ProjectEditorState>,
): string {
	return JSON.stringify(createProjectData(media, normalizeProjectEditor(editor)));
}

export function hasProjectUnsavedChanges(
	currentSnapshot: string | null,
	baselineSnapshot: string | null,
): boolean {
	return Boolean(
		currentSnapshot !== null && baselineSnapshot !== null && currentSnapshot !== baselineSnapshot,
	);
}
