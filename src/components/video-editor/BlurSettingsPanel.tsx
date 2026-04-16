import { Info, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useScopedT } from "@/contexts/I18nContext";
import { getBlurOverlayColor } from "@/lib/blurEffects";
import { cn } from "@/lib/utils";
import {
	type AnnotationRegion,
	type BlurColor,
	type BlurData,
	type BlurShape,
	DEFAULT_BLUR_BLOCK_SIZE,
	DEFAULT_BLUR_DATA,
	MAX_BLUR_BLOCK_SIZE,
	MAX_BLUR_INTENSITY,
	MIN_BLUR_BLOCK_SIZE,
	MIN_BLUR_INTENSITY,
} from "./types";

interface BlurSettingsPanelProps {
	blurRegion: AnnotationRegion;
	onBlurDataChange: (blurData: BlurData) => void;
	onBlurDataCommit?: () => void;
	onDelete: () => void;
}

export function BlurSettingsPanel({
	blurRegion,
	onBlurDataChange,
	onBlurDataCommit,
	onDelete,
}: BlurSettingsPanelProps) {
	const t = useScopedT("settings");

	const blurShapeOptions: Array<{ value: BlurShape; labelKey: string }> = [
		{ value: "rectangle", labelKey: "blurShapeRectangle" },
		{ value: "oval", labelKey: "blurShapeOval" },
	];
	const blurColorOptions: Array<{ value: BlurColor; labelKey: string }> = [
		{ value: "white", labelKey: "blurColorWhite" },
		{ value: "black", labelKey: "blurColorBlack" },
	];

	return (
		<div className="flex-[2] min-w-0 bg-[#09090b] border border-white/5 rounded-2xl p-4 flex flex-col shadow-xl h-full overflow-y-auto custom-scrollbar">
			<div className="mb-6">
				<div className="flex items-center justify-between mb-4">
					<span className="text-sm font-medium text-slate-200">{t("annotation.blurShape")}</span>
					<span className="text-[10px] uppercase tracking-wider font-medium text-[#34B27B] bg-[#34B27B]/10 px-2 py-1 rounded-full">
						{t("annotation.active")}
					</span>
				</div>

				<div className="grid grid-cols-2 gap-2">
					{blurShapeOptions.map((shape) => {
						const activeShape = blurRegion.blurData?.shape || DEFAULT_BLUR_DATA.shape;
						const isActive = activeShape === shape.value;
						return (
							<button
								key={shape.value}
								onClick={() => {
									const nextBlurData: BlurData = {
										...DEFAULT_BLUR_DATA,
										...blurRegion.blurData,
										shape: shape.value,
									};
									onBlurDataChange(nextBlurData);
									requestAnimationFrame(() => {
										onBlurDataCommit?.();
									});
								}}
								className={cn(
									"h-16 rounded-lg border flex flex-col items-center justify-center transition-all p-2 gap-1",
									isActive
										? "bg-[#34B27B] border-[#34B27B]"
										: "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20",
								)}
							>
								{shape.value === "rectangle" && (
									<div
										className={cn(
											"w-8 h-5 border-2 rounded-sm",
											isActive ? "border-white" : "border-slate-400",
										)}
									/>
								)}
								{shape.value === "oval" && (
									<div
										className={cn(
											"w-8 h-5 border-2 rounded-full",
											isActive ? "border-white" : "border-slate-400",
										)}
									/>
								)}
								<span className="text-[10px] leading-none">
									{t(`annotation.${shape.labelKey}`)}
								</span>
							</button>
						);
					})}
				</div>

				<div className="mt-4">
					<label className="text-xs font-medium text-slate-300 mb-2 block">
						{t("annotation.blurType")}
					</label>
					<Select
						value={blurRegion.blurData?.type ?? DEFAULT_BLUR_DATA.type}
						onValueChange={(value) => {
							const nextBlurData: BlurData = {
								...DEFAULT_BLUR_DATA,
								...blurRegion.blurData,
								type: value === "mosaic" ? "mosaic" : "blur",
							};
							onBlurDataChange(nextBlurData);
							requestAnimationFrame(() => {
								onBlurDataCommit?.();
							});
						}}
					>
						<SelectTrigger className="w-full bg-white/5 border-white/10 text-slate-200 h-9 text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent className="bg-[#1a1a1c] border-white/10 text-slate-200">
							<SelectItem value="blur">{t("annotation.blurTypeBlur")}</SelectItem>
							<SelectItem value="mosaic">{t("annotation.blurTypeMosaic")}</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div className="mt-4">
					<label className="text-xs font-medium text-slate-300 mb-2 block">
						{t("annotation.blurColor")}
					</label>
					<div className="grid grid-cols-2 gap-2">
						{blurColorOptions.map((option) => {
							const activeColor = blurRegion.blurData?.color ?? DEFAULT_BLUR_DATA.color;
							const isActive = activeColor === option.value;
							return (
								<button
									key={option.value}
									onClick={() => {
										const nextBlurData: BlurData = {
											...DEFAULT_BLUR_DATA,
											...blurRegion.blurData,
											color: option.value,
										};
										onBlurDataChange(nextBlurData);
										requestAnimationFrame(() => {
											onBlurDataCommit?.();
										});
									}}
									className={cn(
										"h-10 rounded-lg border flex items-center gap-2 px-3 transition-all",
										isActive
											? "bg-[#34B27B] border-[#34B27B]"
											: "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20",
									)}
								>
									<div
										className="w-4 h-4 rounded-full border border-white/20"
										style={{
											backgroundColor: getBlurOverlayColor({
												...DEFAULT_BLUR_DATA,
												...blurRegion.blurData,
												color: option.value,
											}),
										}}
									/>
									<span className="text-xs text-slate-200">
										{t(`annotation.${option.labelKey}`)}
									</span>
								</button>
							);
						})}
					</div>
				</div>

				<div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10">
					<div className="flex items-center justify-between mb-2">
						<span className="text-xs font-medium text-slate-300">
							{blurRegion.blurData?.type === "mosaic"
								? t("annotation.mosaicBlockSize")
								: t("annotation.blurIntensity")}
						</span>
						<span className="text-[10px] text-slate-400 font-mono">
							{Math.round(
								blurRegion.blurData?.type === "mosaic"
									? (blurRegion.blurData?.blockSize ?? DEFAULT_BLUR_BLOCK_SIZE)
									: (blurRegion.blurData?.intensity ?? DEFAULT_BLUR_DATA.intensity),
							)}
							px
						</span>
					</div>
					<Slider
						value={[
							blurRegion.blurData?.type === "mosaic"
								? (blurRegion.blurData?.blockSize ?? DEFAULT_BLUR_BLOCK_SIZE)
								: (blurRegion.blurData?.intensity ?? DEFAULT_BLUR_DATA.intensity),
						]}
						onValueChange={(values) => {
							onBlurDataChange({
								...DEFAULT_BLUR_DATA,
								...blurRegion.blurData,
								...(blurRegion.blurData?.type === "mosaic"
									? { blockSize: values[0] }
									: { intensity: values[0] }),
							});
						}}
						onValueCommit={() => onBlurDataCommit?.()}
						min={blurRegion.blurData?.type === "mosaic" ? MIN_BLUR_BLOCK_SIZE : MIN_BLUR_INTENSITY}
						max={blurRegion.blurData?.type === "mosaic" ? MAX_BLUR_BLOCK_SIZE : MAX_BLUR_INTENSITY}
						step={1}
						className="w-full [&_[role=slider]]:bg-[#34B27B] [&_[role=slider]]:border-[#34B27B] [&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
					/>
				</div>

				<Button
					onClick={onDelete}
					variant="destructive"
					size="sm"
					className="w-full gap-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30 transition-all mt-4"
				>
					<Trash2 className="w-4 h-4" />
					{t("annotation.deleteAnnotation")}
				</Button>

				<div className="mt-6 p-3 bg-white/5 rounded-lg border border-white/5">
					<div className="flex items-center gap-2 mb-2 text-slate-300">
						<Info className="w-3.5 h-3.5" />
						<span className="text-xs font-medium">{t("annotation.shortcutsAndTips")}</span>
					</div>
					<ul className="text-[10px] text-slate-400 space-y-1.5 list-disc pl-3 leading-relaxed">
						<li>{t("annotation.tipMovePlayhead")}</li>
					</ul>
				</div>
			</div>
		</div>
	);
}
