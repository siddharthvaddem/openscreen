import Block from "@uiw/react-color-block";
import {
	AlignCenter,
	AlignLeft,
	AlignRight,
	Bold,
	ChevronDown,
	Copy,
	Image as ImageIcon,
	Italic,
	Trash2,
	Type,
	Underline,
	Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useScopedT } from "@/contexts/I18nContext";
import { type CustomFont, getCustomFonts } from "@/lib/customFonts";
import { cn } from "@/lib/utils";
import ColorPicker from "../ui/color-picker";
import { AddCustomFontDialog } from "./AddCustomFontDialog";
import { getArrowComponent } from "./ArrowSvgs";
import {
	type AnnotationRegion,
	type AnnotationType,
	type ArrowDirection,
	type FigureData,
} from "./types";

interface AnnotationSettingsPanelProps {
	annotation: AnnotationRegion;
	onContentChange: (content: string) => void;
	onTypeChange: (type: AnnotationType) => void;
	onStyleChange: (style: Partial<AnnotationRegion["style"]>) => void;
	onFigureDataChange?: (figureData: FigureData) => void;
	onDuplicate?: () => void;
	onDelete: () => void;
}

const FONT_FAMILIES = [
	{ value: "system-ui, -apple-system, sans-serif", labelKey: "classic" },
	{ value: "Georgia, serif", labelKey: "editor" },
	{ value: "Impact, Arial Black, sans-serif", labelKey: "strong" },
	{ value: "Courier New, monospace", labelKey: "typewriter" },
	{ value: "Brush Script MT, cursive", labelKey: "deco" },
	{ value: "Arial, sans-serif", labelKey: "simple" },
	{ value: "Verdana, sans-serif", labelKey: "modern" },
	{ value: "Trebuchet MS, sans-serif", labelKey: "clean" },
];

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 96, 128];

export function AnnotationSettingsPanel({
	annotation,
	onContentChange,
	onTypeChange,
	onStyleChange,
	onFigureDataChange,
	onDuplicate,
	onDelete,
}: AnnotationSettingsPanelProps) {
	const t = useScopedT("settings");
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [customFonts, setCustomFonts] = useState<CustomFont[]>([]);
	const fontStyleLabels: Record<string, string> = {
		classic: t("fontStyles.classic"),
		editor: t("fontStyles.editor"),
		strong: t("fontStyles.strong"),
		typewriter: t("fontStyles.typewriter"),
		deco: t("fontStyles.deco"),
		simple: t("fontStyles.simple"),
		modern: t("fontStyles.modern"),
		clean: t("fontStyles.clean"),
	};

	// Load custom fonts on mount
	useEffect(() => {
		setCustomFonts(getCustomFonts());
	}, []);

	const colorPalette = [
		"#FF0000", // Red
		"#FFD700", // Yellow/Gold
		"#00FF00", // Green
		"#FFFFFF", // White
		"#0000FF", // Blue
		"#FF6B00", // Orange
		"#9B59B6", // Purple
		"#E91E63", // Pink
		"#00BCD4", // Cyan
		"#FF5722", // Deep Orange
		"#8BC34A", // Light Green
		"#FFC107", // Amber
		"#34B27B", // Brand Green
		"#000000", // Black
		"#607D8B", // Blue Grey
		"#795548", // Brown
	];

	const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
		const files = event.target.files;
		if (!files || files.length === 0) return;

		const file = files[0];

		// Validate file type
		const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
		if (!validTypes.includes(file.type)) {
			toast.error(t("annotation.invalidImageType"), {
				description: t("annotation.imageFormatsOnly"),
			});
			event.target.value = "";
			return;
		}

		const reader = new FileReader();

		reader.onload = (e) => {
			const dataUrl = e.target?.result as string;
			if (dataUrl) {
				onContentChange(dataUrl);
				toast.success(t("annotation.imageUploadSuccess"));
			}
		};

		reader.onerror = () => {
			toast.error(t("annotation.failedImageUpload"), {
				description: "There was an error reading the file.",
			});
		};

		reader.readAsDataURL(file);
		event.target.value = "";
	};

	return (
		<div className="min-w-0 p-4 flex flex-col h-full overflow-y-auto custom-scrollbar">
			<div className="mb-3">
				<div className="mb-4">
					<span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
						{t("annotation.active")}
					</span>
					<div className="mt-1 text-xl font-semibold text-slate-100">{t("annotation.title")}</div>
				</div>

				{/* Type Selector */}
				<Tabs
					value={annotation.type}
					onValueChange={(value) => onTypeChange(value as AnnotationType)}
					className="mb-4"
				>
					<TabsList className="mb-4 bg-white/[0.035] border border-white/[0.06] p-0.5 w-full grid grid-cols-3 h-9 rounded-xl">
						<TabsTrigger
							value="text"
							className="data-[state=active]:bg-[#34B27B] data-[state=active]:text-white text-slate-400 rounded-lg transition-all gap-1.5 text-[11px]"
						>
							<Type className="w-4 h-4" />
							{t("annotation.typeText")}
						</TabsTrigger>
						<TabsTrigger
							value="image"
							className="data-[state=active]:bg-[#34B27B] data-[state=active]:text-white text-slate-400 rounded-lg transition-all gap-1.5 text-[11px]"
						>
							<ImageIcon className="w-4 h-4" />
							{t("annotation.typeImage")}
						</TabsTrigger>
						<TabsTrigger
							value="figure"
							className="data-[state=active]:bg-[#34B27B] data-[state=active]:text-white text-slate-400 rounded-lg transition-all gap-1.5 text-[11px]"
						>
							<svg
								className="w-4 h-4"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<path d="M4 12h16m0 0l-6-6m6 6l-6 6" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
							{t("annotation.typeArrow")}
						</TabsTrigger>
					</TabsList>

					{/* Text Content */}
					<TabsContent value="text" className="mt-0 space-y-4">
						<div>
							<label className="text-xs font-medium text-slate-200 mb-2 block">
								{t("annotation.textContent")}
							</label>
							<textarea
								value={annotation.textContent || annotation.content}
								onChange={(e) => onContentChange(e.target.value)}
								placeholder={t("annotation.textPlaceholder")}
								rows={5}
								className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-200 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#34B27B] focus:border-transparent resize-none"
							/>
						</div>

						{/* Styling Controls */}
						<div className="space-y-4">
							{/* Font Family & Size */}
							<div className="grid grid-cols-2 gap-2">
								<div>
									<label className="text-xs font-medium text-slate-200 mb-2 block">
										{t("annotation.fontStyle")}
									</label>
									<Select
										value={annotation.style.fontFamily}
										onValueChange={(value) => onStyleChange({ fontFamily: value })}
									>
										<SelectTrigger className="w-full bg-white/5 border-white/10 text-slate-200 h-9 text-xs">
											<SelectValue placeholder={t("annotation.selectStyle")} />
										</SelectTrigger>
										<SelectContent className="bg-[#1a1a1c] border-white/10 text-slate-200 max-h-[300px]">
											{FONT_FAMILIES.map((font) => (
												<SelectItem
													key={font.value}
													value={font.value}
													style={{ fontFamily: font.value }}
												>
													{fontStyleLabels[font.labelKey]}
												</SelectItem>
											))}
											{customFonts.length > 0 && (
												<>
													<div className="px-2 py-1.5 text-[10px] font-medium text-slate-400 uppercase tracking-wider">
														{t("annotation.customFonts")}
													</div>
													{customFonts.map((font) => (
														<SelectItem
															key={font.id}
															value={font.fontFamily}
															style={{ fontFamily: font.fontFamily }}
														>
															{font.name}
														</SelectItem>
													))}
												</>
											)}
										</SelectContent>
									</Select>
								</div>
								<div>
									<label className="text-xs font-medium text-slate-200 mb-2 block">
										{t("annotation.size")}
									</label>
									<Select
										value={annotation.style.fontSize.toString()}
										onValueChange={(value) => onStyleChange({ fontSize: parseInt(value) })}
									>
										<SelectTrigger className="w-full bg-white/5 border-white/10 text-slate-200 h-9 text-xs">
											<SelectValue placeholder={t("annotation.size")} />
										</SelectTrigger>
										<SelectContent className="bg-[#1a1a1c] border-white/10 text-slate-200 max-h-[200px]">
											{FONT_SIZES.map((size) => (
												<SelectItem key={size} value={size.toString()}>
													{size}px
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>

							{/* Add Custom Font Button */}
							<div>
								<AddCustomFontDialog
									onFontAdded={(font) => {
										setCustomFonts(getCustomFonts());
										onStyleChange({ fontFamily: font.fontFamily });
									}}
								/>
							</div>

							{/* Formatting Toggles */}
							<div className="flex items-center justify-between gap-2">
								<ToggleGroup
									type="multiple"
									className="justify-start bg-white/5 p-1 rounded-lg border border-white/5"
								>
									<ToggleGroupItem
										value="bold"
										aria-label="Toggle bold"
										data-state={annotation.style.fontWeight === "bold" ? "on" : "off"}
										onClick={() =>
											onStyleChange({
												fontWeight: annotation.style.fontWeight === "bold" ? "normal" : "bold",
											})
										}
										className="h-8 w-8 data-[state=on]:bg-[#34B27B] data-[state=on]:text-white text-slate-400 hover:bg-white/5 hover:text-slate-200"
									>
										<Bold className="h-4 w-4" />
									</ToggleGroupItem>
									<ToggleGroupItem
										value="italic"
										aria-label="Toggle italic"
										data-state={annotation.style.fontStyle === "italic" ? "on" : "off"}
										onClick={() =>
											onStyleChange({
												fontStyle: annotation.style.fontStyle === "italic" ? "normal" : "italic",
											})
										}
										className="h-8 w-8 data-[state=on]:bg-[#34B27B] data-[state=on]:text-white text-slate-400 hover:bg-white/5 hover:text-slate-200"
									>
										<Italic className="h-4 w-4" />
									</ToggleGroupItem>
									<ToggleGroupItem
										value="underline"
										aria-label="Toggle underline"
										data-state={annotation.style.textDecoration === "underline" ? "on" : "off"}
										onClick={() =>
											onStyleChange({
												textDecoration:
													annotation.style.textDecoration === "underline" ? "none" : "underline",
											})
										}
										className="h-8 w-8 data-[state=on]:bg-[#34B27B] data-[state=on]:text-white text-slate-400 hover:bg-white/5 hover:text-slate-200"
									>
										<Underline className="h-4 w-4" />
									</ToggleGroupItem>
								</ToggleGroup>

								<ToggleGroup
									type="single"
									value={annotation.style.textAlign}
									className="justify-start bg-white/5 p-1 rounded-lg border border-white/5"
								>
									<ToggleGroupItem
										value="left"
										aria-label="Align left"
										onClick={() => onStyleChange({ textAlign: "left" })}
										className="h-8 w-8 data-[state=on]:bg-[#34B27B] data-[state=on]:text-white text-slate-400 hover:bg-white/5 hover:text-slate-200"
									>
										<AlignLeft className="h-4 w-4" />
									</ToggleGroupItem>
									<ToggleGroupItem
										value="center"
										aria-label="Align center"
										onClick={() => onStyleChange({ textAlign: "center" })}
										className="h-8 w-8 data-[state=on]:bg-[#34B27B] data-[state=on]:text-white text-slate-400 hover:bg-white/5 hover:text-slate-200"
									>
										<AlignCenter className="h-4 w-4" />
									</ToggleGroupItem>
									<ToggleGroupItem
										value="right"
										aria-label="Align right"
										onClick={() => onStyleChange({ textAlign: "right" })}
										className="h-8 w-8 data-[state=on]:bg-[#34B27B] data-[state=on]:text-white text-slate-400 hover:bg-white/5 hover:text-slate-200"
									>
										<AlignRight className="h-4 w-4" />
									</ToggleGroupItem>
								</ToggleGroup>
							</div>

							{/* Colors */}
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="text-xs font-medium text-slate-200 mb-2 block">
										{t("annotation.textColor")}
									</label>
									<Popover>
										<PopoverTrigger asChild>
											<Button
												variant="outline"
												className="w-full h-9 justify-start gap-2 bg-white/5 border-white/10 hover:bg-white/10 px-2"
											>
												<div
													className="w-4 h-4 rounded-full border border-white/20"
													style={{ backgroundColor: annotation.style.color }}
												/>
												<span className="text-xs text-slate-300 truncate flex-1 text-left">
													{annotation.style.color}
												</span>
												<ChevronDown className="h-3 w-3 opacity-50" />
											</Button>
										</PopoverTrigger>
										<PopoverContent
											side="top"
											className="w-[260px] p-3 bg-[#1a1a1c] border border-white/10 rounded-xl shadow-xl"
										>
											<ColorPicker
												selectedColor={annotation.style.color}
												colorPalette={colorPalette}
												translations={{
													colorWheel: t("annotation.colorWheel"),
													colorPalette: t("annotation.colorPalette"),
												}}
												onUpdateColor={(color) => {
													onStyleChange({ color: color });
												}}
											/>
										</PopoverContent>
									</Popover>
								</div>
								<div>
									<label className="text-xs font-medium text-slate-200 mb-2 block">
										{t("annotation.background")}
									</label>
									<Popover>
										<PopoverTrigger asChild>
											<Button
												variant="outline"
												className="w-full h-9 justify-start gap-2 bg-white/5 border-white/10 hover:bg-white/10 px-2"
											>
												<div className="w-4 h-4 rounded-full border border-white/20 relative overflow-hidden">
													<div className="absolute inset-0 checkerboard-bg opacity-50" />
													<div
														className="absolute inset-0"
														style={{ backgroundColor: annotation.style.backgroundColor }}
													/>
												</div>
												<span className="text-xs text-slate-300 truncate flex-1 text-left">
													{annotation.style.backgroundColor === "transparent"
														? t("annotation.none")
														: t("annotation.color")}
												</span>
												<ChevronDown className="h-3 w-3 opacity-50" />
											</Button>
										</PopoverTrigger>
										<PopoverContent
											side="top"
											className="w-[260px] p-3 bg-[#1a1a1c] border border-white/10 rounded-xl shadow-xl"
										>
											<ColorPicker
												selectedColor={annotation.style.backgroundColor}
												colorPalette={colorPalette}
												translations={{
													colorWheel: t("annotation.colorWheel"),
													colorPalette: t("annotation.colorPalette"),
													clearBackground: t("annotation.clearBackground"),
												}}
												clearBackgroundOption={true}
												onUpdateColor={(color) => {
													onStyleChange({ backgroundColor: color });
												}}
											/>
										</PopoverContent>
									</Popover>
								</div>
							</div>
						</div>
					</TabsContent>

					{/* Image Upload */}
					<TabsContent value="image" className="mt-0 space-y-4">
						<input
							type="file"
							ref={fileInputRef}
							onChange={handleImageUpload}
							accept=".jpg,.jpeg,.png,.gif,.webp,image/*"
							className="hidden"
						/>
						<Button
							onClick={() => fileInputRef.current?.click()}
							variant="outline"
							className="w-full gap-2 bg-white/5 text-slate-200 border-white/10 hover:bg-[#34B27B] hover:text-white hover:border-[#34B27B] transition-all py-8"
						>
							<Upload className="w-5 h-5" />
							{t("annotation.uploadImage")}
						</Button>

						{annotation.content && annotation.content.startsWith("data:image") && (
							<div className="rounded-lg border border-white/10 overflow-hidden bg-white/5 p-2">
								<img
									src={annotation.content}
									alt="Uploaded annotation"
									className="w-full h-auto rounded-md"
								/>
							</div>
						)}

						<p className="text-xs text-slate-500 text-center leading-relaxed">
							{t("annotation.supportedFormats")}
						</p>
					</TabsContent>

					<TabsContent value="figure" className="mt-0 space-y-4">
						<div>
							<label className="text-xs font-medium text-slate-200 mb-3 block">
								{t("annotation.arrowDirection")}
							</label>
							<div className="grid grid-cols-4 gap-2">
								{(
									[
										"up",
										"down",
										"left",
										"right",
										"up-right",
										"up-left",
										"down-right",
										"down-left",
									] as ArrowDirection[]
								).map((direction) => {
									const ArrowComponent = getArrowComponent(direction);
									return (
										<button
											key={direction}
											onClick={() => {
												const newFigureData: FigureData = {
													...annotation.figureData!,
													arrowDirection: direction,
												};
												onFigureDataChange?.(newFigureData);
											}}
											className={cn(
												"h-16 rounded-lg border flex items-center justify-center transition-all p-2",
												annotation.figureData?.arrowDirection === direction
													? "bg-[#34B27B] border-[#34B27B]"
													: "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20",
											)}
										>
											<ArrowComponent
												color={
													annotation.figureData?.arrowDirection === direction
														? "#ffffff"
														: "#94a3b8"
												}
												strokeWidth={3}
											/>
										</button>
									);
								})}
							</div>
						</div>

						<div>
							<label className="text-xs font-medium text-slate-200 mb-2 block">
								{t("annotation.strokeWidth", {
									width: String(annotation.figureData?.strokeWidth || 4),
								})}
							</label>
							<Slider
								value={[annotation.figureData?.strokeWidth || 4]}
								onValueChange={([value]) => {
									const newFigureData: FigureData = {
										...annotation.figureData!,
										strokeWidth: value,
									};
									onFigureDataChange?.(newFigureData);
								}}
								min={1}
								max={6}
								step={1}
								className="w-full"
							/>
						</div>

						<div>
							<label className="text-xs font-medium text-slate-200 mb-2 block">
								{t("annotation.arrowColor")}
							</label>
							<Popover>
								<PopoverTrigger asChild>
									<Button
										variant="outline"
										className="w-full h-10 justify-start gap-2 bg-white/5 border-white/10 hover:bg-white/10"
									>
										<div
											className="w-5 h-5 rounded-full border border-white/20"
											style={{ backgroundColor: annotation.figureData?.color || "#34B27B" }}
										/>
										<span className="text-xs text-slate-300 truncate flex-1 text-left">
											{annotation.figureData?.color || "#34B27B"}
										</span>
										<ChevronDown className="h-3 w-3 opacity-50" />
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-[260px] p-3 bg-[#1a1a1c] border border-white/10 rounded-xl shadow-xl">
									<Block
										color={annotation.figureData?.color || "#34B27B"}
										colors={colorPalette}
										onChange={(color) => {
											const newFigureData: FigureData = {
												...annotation.figureData!,
												color: color.hex,
											};
											onFigureDataChange?.(newFigureData);
										}}
										style={{
											borderRadius: "8px",
										}}
									/>
								</PopoverContent>
							</Popover>
						</div>
					</TabsContent>
				</Tabs>

				<div className="mt-4 grid grid-cols-2 gap-2">
					<Button
						onClick={() => onDuplicate?.()}
						variant="outline"
						size="sm"
						disabled={!onDuplicate}
						className="w-full gap-2 bg-white/5 text-slate-200 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
					>
						<Copy className="w-4 h-4" />
						Duplicate
					</Button>

					<Button
						onClick={onDelete}
						variant="destructive"
						size="sm"
						className="w-full gap-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30 transition-all"
					>
						<Trash2 className="w-4 h-4" />
						{t("annotation.deleteAnnotation")}
					</Button>
				</div>
			</div>
		</div>
	);
}
