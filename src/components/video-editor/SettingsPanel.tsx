import Block from "@uiw/react-color-block";
import {
	Bug,
	Crop,
	Download,
	Film,
	Image,
	Lock,
	Palette,
	Sparkles,
	Star,
	Trash2,
	Unlock,
	Upload,
	X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useScopedT } from "@/contexts/I18nContext";
import { getAssetPath } from "@/lib/assetPath";
import { WEBCAM_LAYOUT_PRESETS } from "@/lib/compositeLayout";
import type { ExportFormat, ExportQuality, GifFrameRate, GifSizePreset } from "@/lib/exporter";
import { GIF_FRAME_RATES, GIF_SIZE_PRESETS } from "@/lib/exporter";
import { cn } from "@/lib/utils";
import { type AspectRatio, isPortraitAspectRatio } from "@/utils/aspectRatioUtils";
import { getTestId } from "@/utils/getTestId";
import { AnnotationSettingsPanel } from "./AnnotationSettingsPanel";
import { CropControl } from "./CropControl";
import { KeyboardShortcutsHelp } from "./KeyboardShortcutsHelp";
import type {
	AnnotationRegion,
	AnnotationType,
	CropRegion,
	FigureData,
	PlaybackSpeed,
	WebcamLayoutPreset,
	WebcamMaskShape,
	ZoomDepth,
	ZoomFocusMode,
} from "./types";
import { SPEED_OPTIONS } from "./types";

const WALLPAPER_COUNT = 18;
const WALLPAPER_RELATIVE = Array.from(
	{ length: WALLPAPER_COUNT },
	(_, i) => `wallpapers/wallpaper${i + 1}.jpg`,
);
const GRADIENTS = [
	"linear-gradient( 111.6deg,  rgba(114,167,232,1) 9.4%, rgba(253,129,82,1) 43.9%, rgba(253,129,82,1) 54.8%, rgba(249,202,86,1) 86.3% )",
	"linear-gradient(120deg, #d4fc79 0%, #96e6a1 100%)",
	"radial-gradient( circle farthest-corner at 3.2% 49.6%,  rgba(80,12,139,0.87) 0%, rgba(161,10,144,0.72) 83.6% )",
	"linear-gradient( 111.6deg,  rgba(0,56,68,1) 0%, rgba(163,217,185,1) 51.5%, rgba(231, 148, 6, 1) 88.6% )",
	"linear-gradient( 107.7deg,  rgba(235,230,44,0.55) 8.4%, rgba(252,152,15,1) 90.3% )",
	"linear-gradient( 91deg,  rgba(72,154,78,1) 5.2%, rgba(251,206,70,1) 95.9% )",
	"radial-gradient( circle farthest-corner at 10% 20%,  rgba(2,37,78,1) 0%, rgba(4,56,126,1) 19.7%, rgba(85,245,221,1) 100.2% )",
	"linear-gradient( 109.6deg,  rgba(15,2,2,1) 11.2%, rgba(36,163,190,1) 91.1% )",
	"linear-gradient(135deg, #FBC8B4, #2447B1)",
	"linear-gradient(109.6deg, #F635A6, #36D860)",
	"linear-gradient(90deg, #FF0101, #4DFF01)",
	"linear-gradient(315deg, #EC0101, #5044A9)",
	"linear-gradient(45deg, #ff9a9e 0%, #fad0c4 99%, #fad0c4 100%)",
	"linear-gradient(to top, #a18cd1 0%, #fbc2eb 100%)",
	"linear-gradient(to right, #ff8177 0%, #ff867a 0%, #ff8c7f 21%, #f99185 52%, #cf556c 78%, #b12a5b 100%)",
	"linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)",
	"linear-gradient(to right, #4facfe 0%, #00f2fe 100%)",
	"linear-gradient(to top, #fcc5e4 0%, #fda34b 15%, #ff7882 35%, #c8699e 52%, #7046aa 71%, #0c1db8 87%, #020f75 100%)",
	"linear-gradient(to right, #fa709a 0%, #fee140 100%)",
	"linear-gradient(to top, #30cfd0 0%, #330867 100%)",
	"linear-gradient(to top, #c471f5 0%, #fa71cd 100%)",
	"linear-gradient(to right, #f78ca0 0%, #f9748f 19%, #fd868c 60%, #fe9a8b 100%)",
	"linear-gradient(to top, #48c6ef 0%, #6f86d6 100%)",
	"linear-gradient(to right, #0acffe 0%, #495aff 100%)",
];

interface SettingsPanelProps {
	selected: string;
	onWallpaperChange: (path: string) => void;
	selectedZoomDepth?: ZoomDepth | null;
	onZoomDepthChange?: (depth: ZoomDepth) => void;
	selectedZoomFocusMode?: ZoomFocusMode | null;
	onZoomFocusModeChange?: (mode: ZoomFocusMode) => void;
	hasCursorTelemetry?: boolean;
	selectedZoomId?: string | null;
	onZoomDelete?: (id: string) => void;
	selectedTrimId?: string | null;
	onTrimDelete?: (id: string) => void;
	shadowIntensity?: number;
	onShadowChange?: (intensity: number) => void;
	onShadowCommit?: () => void;
	showBlur?: boolean;
	onBlurChange?: (showBlur: boolean) => void;
	motionBlurAmount?: number;
	onMotionBlurChange?: (amount: number) => void;
	onMotionBlurCommit?: () => void;
	borderRadius?: number;
	onBorderRadiusChange?: (radius: number) => void;
	onBorderRadiusCommit?: () => void;
	padding?: number;
	onPaddingChange?: (padding: number) => void;
	onPaddingCommit?: () => void;
	cropRegion?: CropRegion;
	onCropChange?: (region: CropRegion) => void;
	aspectRatio: AspectRatio;
	videoElement?: HTMLVideoElement | null;
	exportQuality?: ExportQuality;
	onExportQualityChange?: (quality: ExportQuality) => void;
	// Export format settings
	exportFormat?: ExportFormat;
	onExportFormatChange?: (format: ExportFormat) => void;
	gifFrameRate?: GifFrameRate;
	onGifFrameRateChange?: (rate: GifFrameRate) => void;
	gifLoop?: boolean;
	onGifLoopChange?: (loop: boolean) => void;
	gifSizePreset?: GifSizePreset;
	onGifSizePresetChange?: (preset: GifSizePreset) => void;
	gifOutputDimensions?: { width: number; height: number };
	onExport?: () => void;
	unsavedExport?: { arrayBuffer: ArrayBuffer; fileName: string; format: string } | null;
	onSaveUnsavedExport?: () => void;
	selectedAnnotationId?: string | null;
	annotationRegions?: AnnotationRegion[];
	onAnnotationContentChange?: (id: string, content: string) => void;
	onAnnotationTypeChange?: (id: string, type: AnnotationType) => void;
	onAnnotationStyleChange?: (id: string, style: Partial<AnnotationRegion["style"]>) => void;
	onAnnotationFigureDataChange?: (id: string, figureData: FigureData) => void;
	onAnnotationDelete?: (id: string) => void;
	selectedSpeedId?: string | null;
	selectedSpeedValue?: PlaybackSpeed | null;
	onSpeedChange?: (speed: PlaybackSpeed) => void;
	onSpeedDelete?: (id: string) => void;
	hasWebcam?: boolean;
	webcamLayoutPreset?: WebcamLayoutPreset;
	onWebcamLayoutPresetChange?: (preset: WebcamLayoutPreset) => void;
	webcamMaskShape?: import("./types").WebcamMaskShape;
	onWebcamMaskShapeChange?: (shape: import("./types").WebcamMaskShape) => void;
}

export default SettingsPanel;

const ZOOM_DEPTH_OPTIONS: Array<{ depth: ZoomDepth; label: string }> = [
	{ depth: 1, label: "1.25×" },
	{ depth: 2, label: "1.5×" },
	{ depth: 3, label: "1.8×" },
	{ depth: 4, label: "2.2×" },
	{ depth: 5, label: "3.5×" },
	{ depth: 6, label: "5×" },
];

export function SettingsPanel({
	selected,
	onWallpaperChange,
	selectedZoomDepth,
	onZoomDepthChange,
	selectedZoomFocusMode,
	onZoomFocusModeChange,
	hasCursorTelemetry = false,
	selectedZoomId,
	onZoomDelete,
	selectedTrimId,
	onTrimDelete,
	shadowIntensity = 0,
	onShadowChange,
	onShadowCommit,
	showBlur,
	onBlurChange,
	motionBlurAmount = 0,
	onMotionBlurChange,
	onMotionBlurCommit,
	borderRadius = 0,
	onBorderRadiusChange,
	onBorderRadiusCommit,
	padding = 50,
	onPaddingChange,
	onPaddingCommit,
	cropRegion,
	onCropChange,
	aspectRatio,
	videoElement,
	exportQuality = "good",
	onExportQualityChange,
	exportFormat = "mp4",
	onExportFormatChange,
	gifFrameRate = 15,
	onGifFrameRateChange,
	gifLoop = true,
	onGifLoopChange,
	gifSizePreset = "medium",
	onGifSizePresetChange,
	gifOutputDimensions = { width: 1280, height: 720 },
	onExport,
	unsavedExport,
	onSaveUnsavedExport,
	selectedAnnotationId,
	annotationRegions = [],
	onAnnotationContentChange,
	onAnnotationTypeChange,
	onAnnotationStyleChange,
	onAnnotationFigureDataChange,
	onAnnotationDelete,
	selectedSpeedId,
	selectedSpeedValue,
	onSpeedChange,
	onSpeedDelete,
	hasWebcam = false,
	webcamLayoutPreset = "picture-in-picture",
	onWebcamLayoutPresetChange,
	webcamMaskShape = "rectangle",
	onWebcamMaskShapeChange,
}: SettingsPanelProps) {
	const t = useScopedT("settings");
	const [wallpaperPaths, setWallpaperPaths] = useState<string[]>([]);
	const [customImages, setCustomImages] = useState<string[]>([]);
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const resolved = await Promise.all(WALLPAPER_RELATIVE.map((p) => getAssetPath(p)));
				if (mounted) setWallpaperPaths(resolved);
			} catch (_err) {
				if (mounted) setWallpaperPaths(WALLPAPER_RELATIVE.map((p) => `/${p}`));
			}
		})();
		return () => {
			mounted = false;
		};
	}, []);
	const colorPalette = [
		"#FF0000",
		"#FFD700",
		"#00FF00",
		"#FFFFFF",
		"#0000FF",
		"#FF6B00",
		"#9B59B6",
		"#E91E63",
		"#00BCD4",
		"#FF5722",
		"#8BC34A",
		"#FFC107",
		"#34B27B",
		"#000000",
		"#607D8B",
		"#795548",
	];

	const [selectedColor, setSelectedColor] = useState("#ADADAD");
	const [gradient, setGradient] = useState<string>(GRADIENTS[0]);
	const [showCropModal, setShowCropModal] = useState(false);
	const cropSnapshotRef = useRef<CropRegion | null>(null);
	const [cropAspectLocked, setCropAspectLocked] = useState(false);
	const [cropAspectRatio, setCropAspectRatio] = useState("");

	const videoWidth = videoElement?.videoWidth || 1920;
	const videoHeight = videoElement?.videoHeight || 1080;

	const handleCropNumericChange = useCallback(
		(field: "x" | "y" | "width" | "height", pixelValue: number) => {
			if (!cropRegion || !onCropChange) return;

			const next = { ...cropRegion };
			switch (field) {
				case "x":
					next.x = Math.max(0, Math.min(pixelValue / videoWidth, 1 - next.width));
					break;
				case "y":
					next.y = Math.max(0, Math.min(pixelValue / videoHeight, 1 - next.height));
					break;
				case "width": {
					const newWidth = Math.max(0.05, Math.min(pixelValue / videoWidth, 1 - next.x));
					if (cropAspectLocked && next.width > 0 && next.height > 0) {
						const ratio = next.width / next.height;
						const newHeight = newWidth / ratio;
						if (next.y + newHeight <= 1) {
							next.width = newWidth;
							next.height = newHeight;
						}
					} else {
						next.width = newWidth;
					}
					break;
				}
				case "height": {
					const newHeight = Math.max(0.05, Math.min(pixelValue / videoHeight, 1 - next.y));
					if (cropAspectLocked && next.width > 0 && next.height > 0) {
						const ratio = next.width / next.height;
						const newWidth = newHeight * ratio;
						if (next.x + newWidth <= 1) {
							next.height = newHeight;
							next.width = newWidth;
						}
					} else {
						next.height = newHeight;
					}
					break;
				}
			}

			onCropChange(next);
		},
		[cropRegion, onCropChange, videoWidth, videoHeight, cropAspectLocked],
	);

	const applyCropAspectPreset = useCallback(
		(preset: string) => {
			if (!cropRegion || !onCropChange) return;

			setCropAspectRatio(preset);
			if (preset === "") {
				setCropAspectLocked(false);
				return;
			}

			const [wStr, hStr] = preset.split(":");
			const targetRatio = Number(wStr) / Number(hStr);
			const next = { ...cropRegion };

			const nextHeight = (next.width * videoWidth) / (targetRatio * videoHeight);
			if (next.y + nextHeight <= 1 && nextHeight >= 0.05) {
				next.height = nextHeight;
			} else {
				const nextWidth = (next.height * videoHeight * targetRatio) / videoWidth;
				if (next.x + nextWidth <= 1 && nextWidth >= 0.05) {
					next.width = nextWidth;
				}
			}

			onCropChange(next);
			setCropAspectLocked(true);
		},
		[cropRegion, onCropChange, videoWidth, videoHeight],
	);

	const getCropPixelValue = useCallback(
		(field: "x" | "y" | "width" | "height"): number => {
			if (!cropRegion) return 0;
			switch (field) {
				case "x":
					return Math.round(cropRegion.x * videoWidth);
				case "y":
					return Math.round(cropRegion.y * videoHeight);
				case "width":
					return Math.round(cropRegion.width * videoWidth);
				case "height":
					return Math.round(cropRegion.height * videoHeight);
			}
		},
		[cropRegion, videoWidth, videoHeight],
	);

	const zoomEnabled = Boolean(selectedZoomDepth);
	const trimEnabled = Boolean(selectedTrimId);

	const handleDeleteClick = () => {
		if (selectedZoomId && onZoomDelete) {
			onZoomDelete(selectedZoomId);
		}
	};

	const handleTrimDeleteClick = () => {
		if (selectedTrimId && onTrimDelete) {
			onTrimDelete(selectedTrimId);
		}
	};

	const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
		const files = event.target.files;
		if (!files || files.length === 0) return;

		const file = files[0];

		// Validate file type - only allow JPG/JPEG
		const validTypes = ["image/jpeg", "image/jpg"];
		if (!validTypes.includes(file.type)) {
			toast.error(t("imageUpload.invalidFileType"), {
				description: t("imageUpload.jpgOnly"),
			});
			event.target.value = "";
			return;
		}

		const reader = new FileReader();

		reader.onload = (e) => {
			const dataUrl = e.target?.result as string;
			if (dataUrl) {
				setCustomImages((prev) => [...prev, dataUrl]);
				onWallpaperChange(dataUrl);
				toast.success(t("imageUpload.uploadSuccess"));
			}
		};

		reader.onerror = () => {
			toast.error(t("imageUpload.failedToUpload"), {
				description: t("imageUpload.errorReading"),
			});
		};

		reader.readAsDataURL(file);
		// Reset input so the same file can be selected again
		event.target.value = "";
	};

	const handleRemoveCustomImage = (imageUrl: string, event: React.MouseEvent) => {
		event.stopPropagation();
		setCustomImages((prev) => prev.filter((img) => img !== imageUrl));
		// If the removed image was selected, clear selection
		if (selected === imageUrl) {
			onWallpaperChange(wallpaperPaths[0] || WALLPAPER_RELATIVE[0]);
		}
	};

	const handleCropToggle = () => {
		if (!showCropModal && cropRegion) {
			cropSnapshotRef.current = { ...cropRegion };
		}
		setShowCropModal(!showCropModal);
	};

	const handleCropCancel = () => {
		if (cropSnapshotRef.current && onCropChange) {
			onCropChange(cropSnapshotRef.current);
		}
		setShowCropModal(false);
	};

	// Find selected annotation
	const selectedAnnotation = selectedAnnotationId
		? annotationRegions.find((a) => a.id === selectedAnnotationId)
		: null;

	// If an annotation is selected, show annotation settings instead
	if (
		selectedAnnotation &&
		onAnnotationContentChange &&
		onAnnotationTypeChange &&
		onAnnotationStyleChange &&
		onAnnotationDelete
	) {
		return (
			<AnnotationSettingsPanel
				annotation={selectedAnnotation}
				onContentChange={(content) => onAnnotationContentChange(selectedAnnotation.id, content)}
				onTypeChange={(type) => onAnnotationTypeChange(selectedAnnotation.id, type)}
				onStyleChange={(style) => onAnnotationStyleChange(selectedAnnotation.id, style)}
				onFigureDataChange={
					onAnnotationFigureDataChange
						? (figureData) => onAnnotationFigureDataChange(selectedAnnotation.id, figureData)
						: undefined
				}
				onDelete={() => onAnnotationDelete(selectedAnnotation.id)}
			/>
		);
	}

	return (
		<div className="flex-[2] min-w-0 bg-[#09090b] border border-white/5 rounded-2xl flex flex-col shadow-xl h-full overflow-hidden">
			<div className="flex-1 overflow-y-auto custom-scrollbar p-4 pb-0">
				<div className="mb-4">
					<div className="flex items-center justify-between mb-3">
						<span className="text-sm font-medium text-slate-200">{t("zoom.level")}</span>
						<div className="flex items-center gap-2">
							{zoomEnabled && selectedZoomDepth && (
								<span className="text-[10px] uppercase tracking-wider font-medium text-[#34B27B] bg-[#34B27B]/10 px-2 py-0.5 rounded-full">
									{ZOOM_DEPTH_OPTIONS.find((o) => o.depth === selectedZoomDepth)?.label}
								</span>
							)}
							<KeyboardShortcutsHelp />
						</div>
					</div>
					<div className="grid grid-cols-6 gap-1.5">
						{ZOOM_DEPTH_OPTIONS.map((option) => {
							const isActive = selectedZoomDepth === option.depth;
							return (
								<Button
									key={option.depth}
									type="button"
									disabled={!zoomEnabled}
									onClick={() => onZoomDepthChange?.(option.depth)}
									className={cn(
										"h-auto w-full rounded-lg border px-1 py-2 text-center shadow-sm transition-all",
										"duration-200 ease-out",
										zoomEnabled ? "opacity-100 cursor-pointer" : "opacity-40 cursor-not-allowed",
										isActive
											? "border-[#34B27B] bg-[#34B27B] text-white shadow-[#34B27B]/20"
											: "border-white/5 bg-white/5 text-slate-400 hover:bg-white/10 hover:border-white/10 hover:text-slate-200",
									)}
								>
									<span className="text-xs font-semibold">{option.label}</span>
								</Button>
							);
						})}
					</div>
					{!zoomEnabled && (
						<p className="text-[10px] text-slate-500 mt-2 text-center">{t("zoom.selectRegion")}</p>
					)}
					{zoomEnabled && hasCursorTelemetry && (
						<div className="mt-3">
							<span className="text-sm font-medium text-slate-200 mb-2 block">
								{t("zoom.focusMode.title")}
							</span>
							<div className="grid grid-cols-2 gap-1.5">
								{(["manual", "auto"] as const).map((mode) => {
									const isActive = selectedZoomFocusMode === mode;
									return (
										<Button
											key={mode}
											type="button"
											onClick={() => onZoomFocusModeChange?.(mode)}
											className={cn(
												"h-auto w-full rounded-lg border px-2 py-2 text-center shadow-sm transition-all",
												"duration-200 ease-out cursor-pointer",
												isActive
													? "border-[#34B27B] bg-[#34B27B] text-white shadow-[#34B27B]/20"
													: "border-white/5 bg-white/5 text-slate-400 hover:bg-white/10 hover:border-white/10 hover:text-slate-200",
											)}
										>
											<span className="text-xs font-semibold capitalize">
												{t(`zoom.focusMode.${mode}`)}
											</span>
										</Button>
									);
								})}
							</div>
							{selectedZoomFocusMode === "auto" && (
								<p className="text-[10px] text-slate-500 mt-1.5">
									{t("zoom.focusMode.autoDescription")}
								</p>
							)}
						</div>
					)}
					{zoomEnabled && (
						<Button
							onClick={handleDeleteClick}
							variant="destructive"
							size="sm"
							className="mt-2 w-full gap-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30 transition-all h-8 text-xs"
						>
							<Trash2 className="w-3 h-3" />
							{t("zoom.deleteZoom")}
						</Button>
					)}
				</div>

				{trimEnabled && (
					<div className="mb-4">
						<Button
							onClick={handleTrimDeleteClick}
							variant="destructive"
							size="sm"
							className="w-full gap-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30 transition-all h-8 text-xs"
						>
							<Trash2 className="w-3 h-3" />
							{t("trim.deleteRegion")}
						</Button>
					</div>
				)}

				<div className="mb-4">
					<div className="flex items-center justify-between mb-3">
						<span className="text-sm font-medium text-slate-200">{t("speed.playbackSpeed")}</span>
						{selectedSpeedId && selectedSpeedValue && (
							<span className="text-[10px] uppercase tracking-wider font-medium text-[#d97706] bg-[#d97706]/10 px-2 py-0.5 rounded-full">
								{SPEED_OPTIONS.find((o) => o.speed === selectedSpeedValue)?.label ??
									`${selectedSpeedValue}×`}
							</span>
						)}
					</div>
					<div className="grid grid-cols-7 gap-1.5">
						{SPEED_OPTIONS.map((option) => {
							const isActive = selectedSpeedValue === option.speed;
							return (
								<Button
									key={option.speed}
									type="button"
									disabled={!selectedSpeedId}
									onClick={() => onSpeedChange?.(option.speed)}
									className={cn(
										"h-auto w-full rounded-lg border px-1 py-2 text-center shadow-sm transition-all",
										"duration-200 ease-out",
										selectedSpeedId
											? "opacity-100 cursor-pointer"
											: "opacity-40 cursor-not-allowed",
										isActive
											? "border-[#d97706] bg-[#d97706] text-white shadow-[#d97706]/20"
											: "border-white/5 bg-white/5 text-slate-400 hover:bg-white/10 hover:border-white/10 hover:text-slate-200",
									)}
								>
									<span className="text-xs font-semibold">{option.label}</span>
								</Button>
							);
						})}
					</div>
					{!selectedSpeedId && (
						<p className="text-[10px] text-slate-500 mt-2 text-center">{t("speed.selectRegion")}</p>
					)}
					{selectedSpeedId && (
						<Button
							onClick={() => selectedSpeedId && onSpeedDelete?.(selectedSpeedId)}
							variant="destructive"
							size="sm"
							className="mt-2 w-full gap-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30 transition-all h-8 text-xs"
						>
							<Trash2 className="w-3 h-3" />
							{t("speed.deleteRegion")}
						</Button>
					)}
				</div>

				<Accordion
					type="multiple"
					defaultValue={hasWebcam ? ["layout", "effects", "background"] : ["effects", "background"]}
					className="space-y-1"
				>
					{hasWebcam && (
						<AccordionItem
							value="layout"
							className="border-white/5 rounded-xl bg-white/[0.02] px-3"
						>
							<AccordionTrigger className="py-2.5 hover:no-underline">
								<div className="flex items-center gap-2">
									<Sparkles className="w-4 h-4 text-[#34B27B]" />
									<span className="text-xs font-medium">{t("layout.title")}</span>
								</div>
							</AccordionTrigger>
							<AccordionContent className="pb-3">
								<div className="p-2 rounded-lg bg-white/5 border border-white/5">
									<div className="text-[10px] font-medium text-slate-300 mb-1.5">
										{t("layout.preset")}
									</div>
									<Select
										value={webcamLayoutPreset}
										onValueChange={(value: WebcamLayoutPreset) =>
											onWebcamLayoutPresetChange?.(value)
										}
									>
										<SelectTrigger className="h-8 bg-black/20 border-white/10 text-xs">
											<SelectValue placeholder={t("layout.selectPreset")} />
										</SelectTrigger>
										<SelectContent>
											{WEBCAM_LAYOUT_PRESETS.filter(
												(preset) =>
													preset.value === "picture-in-picture" ||
													isPortraitAspectRatio(aspectRatio),
											).map((preset) => (
												<SelectItem key={preset.value} value={preset.value} className="text-xs">
													{preset.value === "picture-in-picture"
														? t("layout.pictureInPicture")
														: t("layout.verticalStack")}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								{webcamLayoutPreset === "picture-in-picture" && (
									<div className="mt-2 p-2 rounded-lg bg-white/5 border border-white/5">
										<div className="text-[10px] font-medium text-slate-300 mb-1.5">
											{t("layout.webcamShape")}
										</div>
										<div className="grid grid-cols-4 gap-1.5">
											{(
												[
													{ value: "rectangle", label: "Rect" },
													{ value: "circle", label: "Circle" },
													{ value: "square", label: "Square" },
													{ value: "rounded", label: "Rounded" },
												] as Array<{ value: WebcamMaskShape; label: string }>
											).map((shape) => (
												<button
													key={shape.value}
													type="button"
													onClick={() => onWebcamMaskShapeChange?.(shape.value)}
													className={cn(
														"h-10 rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-all",
														webcamMaskShape === shape.value
															? "bg-[#34B27B] border-[#34B27B] text-white"
															: "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-slate-400",
													)}
												>
													<svg
														width="16"
														height="16"
														viewBox="0 0 16 16"
														fill="none"
														xmlns="http://www.w3.org/2000/svg"
													>
														{shape.value === "rectangle" && (
															<rect
																x="1"
																y="3"
																width="14"
																height="10"
																rx="2"
																stroke="currentColor"
																strokeWidth="1.5"
															/>
														)}
														{shape.value === "circle" && (
															<circle
																cx="8"
																cy="8"
																r="6.5"
																stroke="currentColor"
																strokeWidth="1.5"
															/>
														)}
														{shape.value === "square" && (
															<rect
																x="2"
																y="2"
																width="12"
																height="12"
																rx="1"
																stroke="currentColor"
																strokeWidth="1.5"
															/>
														)}
														{shape.value === "rounded" && (
															<rect
																x="1"
																y="3"
																width="14"
																height="10"
																rx="5"
																stroke="currentColor"
																strokeWidth="1.5"
															/>
														)}
													</svg>
													<span className="text-[8px] leading-none">{shape.label}</span>
												</button>
											))}
										</div>
									</div>
								)}
							</AccordionContent>
						</AccordionItem>
					)}

					<AccordionItem value="effects" className="border-white/5 rounded-xl bg-white/[0.02] px-3">
						<AccordionTrigger className="py-2.5 hover:no-underline">
							<div className="flex items-center gap-2">
								<Sparkles className="w-4 h-4 text-[#34B27B]" />
								<span className="text-xs font-medium">{t("effects.title")}</span>
							</div>
						</AccordionTrigger>
						<AccordionContent className="pb-3">
							<div className="grid grid-cols-2 gap-2 mb-3">
								<div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
									<div className="text-[10px] font-medium text-slate-300">
										{t("effects.blurBg")}
									</div>
									<Switch
										checked={showBlur}
										onCheckedChange={onBlurChange}
										className="data-[state=checked]:bg-[#34B27B] scale-90"
									/>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-2">
								<div className="p-2 rounded-lg bg-white/5 border border-white/5">
									<div className="flex items-center justify-between mb-1">
										<div className="text-[10px] font-medium text-slate-300">
											{t("effects.motionBlur")}
										</div>
										<span className="text-[10px] text-slate-500 font-mono">
											{motionBlurAmount === 0 ? t("effects.off") : motionBlurAmount.toFixed(2)}
										</span>
									</div>
									<Slider
										value={[motionBlurAmount]}
										onValueChange={(values) => onMotionBlurChange?.(values[0])}
										onValueCommit={() => onMotionBlurCommit?.()}
										min={0}
										max={1}
										step={0.01}
										className="w-full [&_[role=slider]]:bg-[#34B27B] [&_[role=slider]]:border-[#34B27B] [&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
									/>
								</div>
								<div className="p-2 rounded-lg bg-white/5 border border-white/5">
									<div className="flex items-center justify-between mb-1">
										<div className="text-[10px] font-medium text-slate-300">
											{t("effects.shadow")}
										</div>
										<span className="text-[10px] text-slate-500 font-mono">
											{Math.round(shadowIntensity * 100)}%
										</span>
									</div>
									<Slider
										value={[shadowIntensity]}
										onValueChange={(values) => onShadowChange?.(values[0])}
										onValueCommit={() => onShadowCommit?.()}
										min={0}
										max={1}
										step={0.01}
										className="w-full [&_[role=slider]]:bg-[#34B27B] [&_[role=slider]]:border-[#34B27B] [&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
									/>
								</div>
								<div className="p-2 rounded-lg bg-white/5 border border-white/5">
									<div className="flex items-center justify-between mb-1">
										<div className="text-[10px] font-medium text-slate-300">
											{t("effects.roundness")}
										</div>
										<span className="text-[10px] text-slate-500 font-mono">{borderRadius}px</span>
									</div>
									<Slider
										value={[borderRadius]}
										onValueChange={(values) => onBorderRadiusChange?.(values[0])}
										onValueCommit={() => onBorderRadiusCommit?.()}
										min={0}
										max={16}
										step={0.5}
										className="w-full [&_[role=slider]]:bg-[#34B27B] [&_[role=slider]]:border-[#34B27B] [&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
									/>
								</div>
								<div
									className={`p-2 rounded-lg bg-white/5 border border-white/5 ${webcamLayoutPreset === "vertical-stack" ? "opacity-40 pointer-events-none" : ""}`}
								>
									<div className="flex items-center justify-between mb-1">
										<div className="text-[10px] font-medium text-slate-300">
											{t("effects.padding")}
										</div>
										<span className="text-[10px] text-slate-500 font-mono">
											{webcamLayoutPreset === "vertical-stack" ? "—" : `${padding}%`}
										</span>
									</div>
									<Slider
										value={[webcamLayoutPreset === "vertical-stack" ? 0 : padding]}
										onValueChange={(values) => onPaddingChange?.(values[0])}
										onValueCommit={() => onPaddingCommit?.()}
										min={0}
										max={100}
										step={1}
										disabled={webcamLayoutPreset === "vertical-stack"}
										className="w-full [&_[role=slider]]:bg-[#34B27B] [&_[role=slider]]:border-[#34B27B] [&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
									/>
								</div>
							</div>

							<Button
								onClick={handleCropToggle}
								variant="outline"
								className="w-full mt-2 gap-1.5 bg-white/5 text-slate-200 border-white/10 hover:bg-white/10 hover:border-white/20 hover:text-white text-[10px] h-8 transition-all"
							>
								<Crop className="w-3 h-3" />
								{t("crop.cropVideo")}
							</Button>
						</AccordionContent>
					</AccordionItem>

					<AccordionItem
						value="background"
						className="border-white/5 rounded-xl bg-white/[0.02] px-3"
					>
						<AccordionTrigger className="py-2.5 hover:no-underline">
							<div className="flex items-center gap-2">
								<Palette className="w-4 h-4 text-[#34B27B]" />
								<span className="text-xs font-medium">{t("background.title")}</span>
							</div>
						</AccordionTrigger>
						<AccordionContent className="pb-3">
							<Tabs defaultValue="image" className="w-full">
								<TabsList className="mb-2 bg-white/5 border border-white/5 p-0.5 w-full grid grid-cols-3 h-7 rounded-lg">
									<TabsTrigger
										value="image"
										className="data-[state=active]:bg-[#34B27B] data-[state=active]:text-white text-slate-400 text-[10px] py-1 rounded-md transition-all"
									>
										{t("background.image")}
									</TabsTrigger>
									<TabsTrigger
										value="color"
										className="data-[state=active]:bg-[#34B27B] data-[state=active]:text-white text-slate-400 text-[10px] py-1 rounded-md transition-all"
									>
										{t("background.color")}
									</TabsTrigger>
									<TabsTrigger
										value="gradient"
										className="data-[state=active]:bg-[#34B27B] data-[state=active]:text-white text-slate-400 text-[10px] py-1 rounded-md transition-all"
									>
										{t("background.gradient")}
									</TabsTrigger>
								</TabsList>

								<div className="max-h-[min(200px,25vh)] overflow-y-auto custom-scrollbar">
									<TabsContent value="image" className="mt-0 space-y-2">
										<input
											type="file"
											ref={fileInputRef}
											onChange={handleImageUpload}
											accept=".jpg,.jpeg,image/jpeg"
											className="hidden"
										/>
										<Button
											onClick={() => fileInputRef.current?.click()}
											variant="outline"
											className="w-full gap-2 bg-white/5 text-slate-200 border-white/10 hover:bg-[#34B27B] hover:text-white hover:border-[#34B27B] transition-all h-7 text-[10px]"
										>
											<Upload className="w-3 h-3" />
											{t("background.uploadCustom")}
										</Button>

										<div className="grid grid-cols-7 gap-1.5">
											{customImages.map((imageUrl, idx) => {
												const isSelected = selected === imageUrl;
												return (
													<div
														key={`custom-${idx}`}
														className={cn(
															"aspect-square w-9 h-9 rounded-md border-2 overflow-hidden cursor-pointer transition-all duration-200 relative group shadow-sm",
															isSelected
																? "border-[#34B27B] ring-1 ring-[#34B27B]/30"
																: "border-white/10 hover:border-[#34B27B]/40 opacity-80 hover:opacity-100 bg-white/5",
														)}
														style={{
															backgroundImage: `url(${imageUrl})`,
															backgroundSize: "cover",
															backgroundPosition: "center",
														}}
														onClick={() => onWallpaperChange(imageUrl)}
														role="button"
													>
														<button
															onClick={(e) => handleRemoveCustomImage(imageUrl, e)}
															className="absolute top-0.5 right-0.5 w-3 h-3 bg-red-500/90 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
														>
															<X className="w-2 h-2 text-white" />
														</button>
													</div>
												);
											})}

											{(wallpaperPaths.length > 0
												? wallpaperPaths
												: WALLPAPER_RELATIVE.map((p) => `/${p}`)
											).map((path) => {
												const isSelected = (() => {
													if (!selected) return false;
													if (selected === path) return true;
													try {
														const clean = (s: string) =>
															s.replace(/^file:\/\//, "").replace(/^\//, "");
														if (clean(selected).endsWith(clean(path))) return true;
														if (clean(path).endsWith(clean(selected))) return true;
													} catch {
														// Best-effort comparison; fallback to strict match.
													}
													return false;
												})();
												return (
													<div
														key={path}
														className={cn(
															"aspect-square w-9 h-9 rounded-md border-2 overflow-hidden cursor-pointer transition-all duration-200 shadow-sm",
															isSelected
																? "border-[#34B27B] ring-1 ring-[#34B27B]/30"
																: "border-white/10 hover:border-[#34B27B]/40 opacity-80 hover:opacity-100 bg-white/5",
														)}
														style={{
															backgroundImage: `url(${path})`,
															backgroundSize: "cover",
															backgroundPosition: "center",
														}}
														onClick={() => onWallpaperChange(path)}
														role="button"
													/>
												);
											})}
										</div>
									</TabsContent>

									<TabsContent value="color" className="mt-0">
										<div className="p-1">
											<Block
												color={selectedColor}
												colors={colorPalette}
												onChange={(color) => {
													setSelectedColor(color.hex);
													onWallpaperChange(color.hex);
												}}
												style={{
													width: "100%",
													borderRadius: "8px",
												}}
											/>
										</div>
									</TabsContent>

									<TabsContent value="gradient" className="mt-0">
										<div className="grid grid-cols-7 gap-1.5">
											{GRADIENTS.map((g, idx) => (
												<div
													key={g}
													className={cn(
														"aspect-square w-9 h-9 rounded-md border-2 overflow-hidden cursor-pointer transition-all duration-200 shadow-sm",
														gradient === g
															? "border-[#34B27B] ring-1 ring-[#34B27B]/30"
															: "border-white/10 hover:border-[#34B27B]/40 opacity-80 hover:opacity-100 bg-white/5",
													)}
													style={{ background: g }}
													aria-label={t("background.gradientLabel", { index: idx + 1 })}
													onClick={() => {
														setGradient(g);
														onWallpaperChange(g);
													}}
													role="button"
												/>
											))}
										</div>
									</TabsContent>
								</div>
							</Tabs>
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			</div>

			{showCropModal && cropRegion && onCropChange && (
				<>
					<div
						className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-in fade-in duration-200"
						onClick={handleCropCancel}
					/>
					<div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[60] bg-[#09090b] rounded-2xl shadow-2xl border border-white/10 p-8 w-[90vw] max-w-5xl max-h-[90vh] overflow-auto animate-in zoom-in-95 duration-200">
						<div className="flex items-center justify-between mb-6">
							<div>
								<span className="text-xl font-bold text-slate-200">{t("crop.cropVideo")}</span>
								<p className="text-sm text-slate-400 mt-2">{t("crop.dragInstruction")}</p>
							</div>
							<Button
								variant="ghost"
								size="icon"
								onClick={handleCropCancel}
								className="hover:bg-white/10 text-slate-400 hover:text-white"
							>
								<X className="w-5 h-5" />
							</Button>
						</div>
						<CropControl
							videoElement={videoElement || null}
							cropRegion={cropRegion}
							onCropChange={onCropChange}
							aspectRatio={aspectRatio}
						/>
						<div className="mt-6 space-y-4">
							<div className="flex flex-wrap items-end gap-3">
								{[
									{ label: "X", field: "x" as const, max: videoWidth },
									{ label: "Y", field: "y" as const, max: videoHeight },
									{ label: "W", field: "width" as const, max: videoWidth },
									{ label: "H", field: "height" as const, max: videoHeight },
								].map(({ label, field, max }) => (
									<div key={field} className="flex flex-col gap-1">
										<label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
											{label}
										</label>
										<input
											type="number"
											min={0}
											max={max}
											value={getCropPixelValue(field)}
											onChange={(e) => handleCropNumericChange(field, Number(e.target.value))}
											className="w-[90px] h-8 rounded-md border border-white/10 bg-white/5 px-2 text-xs text-slate-200 outline-none focus:border-[#34B27B]/50 focus:ring-1 focus:ring-[#34B27B]/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
										/>
									</div>
								))}

								<div className="flex flex-col gap-1">
									<label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
										{t("crop.ratio")}
									</label>
									<div className="flex items-center gap-1.5">
										<select
											value={cropAspectRatio}
											onChange={(e) => applyCropAspectPreset(e.target.value)}
											className="h-8 rounded-md border border-white/10 bg-[#1a1a1f] px-2 text-xs text-slate-200 outline-none focus:border-[#34B27B]/50 cursor-pointer"
										>
											<option value="" className="bg-[#1a1a1f] text-slate-200">
												{t("crop.free")}
											</option>
											<option value="16:9" className="bg-[#1a1a1f] text-slate-200">
												16:9
											</option>
											<option value="9:16" className="bg-[#1a1a1f] text-slate-200">
												9:16
											</option>
											<option value="4:3" className="bg-[#1a1a1f] text-slate-200">
												4:3
											</option>
											<option value="3:4" className="bg-[#1a1a1f] text-slate-200">
												3:4
											</option>
											<option value="1:1" className="bg-[#1a1a1f] text-slate-200">
												1:1
											</option>
											<option value="21:9" className="bg-[#1a1a1f] text-slate-200">
												21:9
											</option>
										</select>
										<button
											type="button"
											onClick={() => setCropAspectLocked((prev) => !prev)}
											className={cn(
												"h-8 w-8 flex items-center justify-center rounded-md border transition-all",
												cropAspectLocked
													? "border-[#34B27B]/50 bg-[#34B27B]/10 text-[#34B27B]"
													: "border-white/10 bg-white/5 text-slate-400 hover:text-slate-200",
											)}
											title={
												cropAspectLocked ? t("crop.unlockAspectRatio") : t("crop.lockAspectRatio")
											}
										>
											{cropAspectLocked ? (
												<Lock className="w-3.5 h-3.5" />
											) : (
												<Unlock className="w-3.5 h-3.5" />
											)}
										</button>
									</div>
								</div>

								<p className="text-[10px] text-slate-500 self-center ml-2">
									{videoWidth} × {videoHeight}px
								</p>
							</div>

							<div className="flex justify-end">
								<Button
									onClick={() => setShowCropModal(false)}
									size="lg"
									className="bg-[#34B27B] hover:bg-[#34B27B]/90 text-white"
								>
									{t("crop.done")}
								</Button>
							</div>
						</div>
					</div>
				</>
			)}

			<div className="flex-shrink-0 p-4 pt-3 border-t border-white/5 bg-[#09090b]">
				<div className="flex items-center gap-2 mb-3">
					<button
						onClick={() => onExportFormatChange?.("mp4")}
						className={cn(
							"flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border transition-all text-xs font-medium",
							exportFormat === "mp4"
								? "bg-[#34B27B]/10 border-[#34B27B]/50 text-white"
								: "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200",
						)}
					>
						<Film className="w-3.5 h-3.5" />
						{t("exportFormat.mp4")}
					</button>
					<button
						data-testid={getTestId("gif-format-button")}
						onClick={() => onExportFormatChange?.("gif")}
						className={cn(
							"flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border transition-all text-xs font-medium",
							exportFormat === "gif"
								? "bg-[#34B27B]/10 border-[#34B27B]/50 text-white"
								: "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200",
						)}
					>
						<Image className="w-3.5 h-3.5" />
						{t("exportFormat.gif")}
					</button>
				</div>

				{exportFormat === "mp4" && (
					<div className="mb-3 bg-white/5 border border-white/5 p-0.5 w-full grid grid-cols-3 h-7 rounded-lg">
						<button
							onClick={() => onExportQualityChange?.("medium")}
							className={cn(
								"rounded-md transition-all text-[10px] font-medium",
								exportQuality === "medium"
									? "bg-white text-black"
									: "text-slate-400 hover:text-slate-200",
							)}
						>
							{t("exportQuality.low")}
						</button>
						<button
							onClick={() => onExportQualityChange?.("good")}
							className={cn(
								"rounded-md transition-all text-[10px] font-medium",
								exportQuality === "good"
									? "bg-white text-black"
									: "text-slate-400 hover:text-slate-200",
							)}
						>
							{t("exportQuality.medium")}
						</button>
						<button
							onClick={() => onExportQualityChange?.("source")}
							className={cn(
								"rounded-md transition-all text-[10px] font-medium",
								exportQuality === "source"
									? "bg-white text-black"
									: "text-slate-400 hover:text-slate-200",
							)}
						>
							{t("exportQuality.high")}
						</button>
					</div>
				)}

				{exportFormat === "gif" && (
					<div className="mb-3 space-y-2">
						<div className="flex items-center gap-2">
							<div className="flex-1 bg-white/5 border border-white/5 p-0.5 grid grid-cols-4 h-7 rounded-lg">
								{GIF_FRAME_RATES.map((rate) => (
									<button
										key={rate.value}
										onClick={() => onGifFrameRateChange?.(rate.value)}
										className={cn(
											"rounded-md transition-all text-[10px] font-medium",
											gifFrameRate === rate.value
												? "bg-white text-black"
												: "text-slate-400 hover:text-slate-200",
										)}
									>
										{rate.value}
									</button>
								))}
							</div>
							<div className="flex-1 bg-white/5 border border-white/5 p-0.5 grid grid-cols-3 h-7 rounded-lg">
								{Object.entries(GIF_SIZE_PRESETS).map(([key, _preset]) => (
									<button
										key={key}
										data-testid={getTestId(`gif-size-button-${key}`)}
										onClick={() => onGifSizePresetChange?.(key as GifSizePreset)}
										className={cn(
											"rounded-md transition-all text-[10px] font-medium",
											gifSizePreset === key
												? "bg-white text-black"
												: "text-slate-400 hover:text-slate-200",
										)}
									>
										{key === "original" ? "Orig" : key.charAt(0).toUpperCase() + key.slice(1, 3)}
									</button>
								))}
							</div>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-[10px] text-slate-500">
								{gifOutputDimensions.width} × {gifOutputDimensions.height}px
							</span>
							<div className="flex items-center gap-2">
								<span className="text-[10px] text-slate-400">{t("gifSettings.loop")}</span>
								<Switch
									checked={gifLoop}
									onCheckedChange={onGifLoopChange}
									className="data-[state=checked]:bg-[#34B27B] scale-75"
								/>
							</div>
						</div>
					</div>
				)}

				{unsavedExport && (
					<Button
						type="button"
						size="lg"
						onClick={onSaveUnsavedExport}
						className="w-full mb-2 py-5 text-sm font-semibold flex items-center justify-center gap-2 bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 hover:bg-indigo-500/90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
					>
						<Download className="w-4 h-4" />
						{t("export.chooseSaveLocation")}
					</Button>
				)}
				<Button
					data-testid={getTestId("export-button")}
					type="button"
					size="lg"
					onClick={onExport}
					className="w-full py-5 text-sm font-semibold flex items-center justify-center gap-2 bg-[#34B27B] text-white rounded-xl shadow-lg shadow-[#34B27B]/20 hover:bg-[#34B27B]/90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
				>
					<Download className="w-4 h-4" />
					{exportFormat === "gif" ? t("export.gifButton") : t("export.videoButton")}
				</Button>

				<div className="flex gap-2 mt-3">
					<button
						type="button"
						onClick={() => {
							window.electronAPI?.openExternalUrl(
								"https://github.com/siddharthvaddem/openscreen/issues/new/choose",
							);
						}}
						className="flex-1 flex items-center justify-center gap-1.5 text-[10px] text-slate-500 hover:text-slate-300 py-1.5 transition-colors"
					>
						<Bug className="w-3 h-3 text-[#34B27B]" />
						{t("links.reportBug")}
					</button>
					<button
						type="button"
						onClick={() => {
							window.electronAPI?.openExternalUrl("https://github.com/siddharthvaddem/openscreen");
						}}
						className="flex-1 flex items-center justify-center gap-1.5 text-[10px] text-slate-500 hover:text-slate-300 py-1.5 transition-colors"
					>
						<Star className="w-3 h-3 text-yellow-400" />
						{t("links.starOnGithub")}
					</button>
				</div>
			</div>
		</div>
	);
}
