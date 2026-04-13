import { Info, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useScopedT } from "@/contexts/I18nContext";
import { cn } from "@/lib/utils";
import {
	type AnnotationRegion,
	type BlurData,
	type BlurShape,
	DEFAULT_BLUR_DATA,
	MAX_BLUR_INTENSITY,
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

	return (
		<div className="flex-[2] min-w-0 editor-panel rounded-2xl p-4 flex flex-col shadow-xl h-full overflow-y-auto custom-scrollbar">
			<div className="mb-6">
				<div className="flex items-center justify-between mb-4">
					<span className="text-sm font-medium editor-text">{t("annotation.blurShape")}</span>
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
										: "bg-background border-input hover:bg-accent hover:border-white/20",
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

				<div className="mt-4 p-3 rounded-lg bg-background border border-input">
					<div className="flex items-center justify-between mb-2">
						<span className="text-xs font-medium text-slate-300">
							{t("annotation.blurIntensity")}
						</span>
						<span className="text-[10px] editor-text-muted font-mono">
							{Math.round(blurRegion.blurData?.intensity ?? DEFAULT_BLUR_DATA.intensity)}px
						</span>
					</div>
					<Slider
						value={[blurRegion.blurData?.intensity ?? DEFAULT_BLUR_DATA.intensity]}
						onValueChange={(values) => {
							onBlurDataChange({
								...DEFAULT_BLUR_DATA,
								...blurRegion.blurData,
								intensity: values[0],
							});
						}}
						onValueCommit={() => onBlurDataCommit?.()}
						min={MIN_BLUR_INTENSITY}
						max={MAX_BLUR_INTENSITY}
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

				<div className="mt-6 p-3 editor-panel-soft rounded-lg border editor-border">
					<div className="flex items-center gap-2 mb-2 text-slate-300">
						<Info className="w-3.5 h-3.5" />
						<span className="text-xs font-medium">{t("annotation.shortcutsAndTips")}</span>
					</div>
					<ul className="text-[10px] editor-text-muted space-y-1.5 list-disc pl-3 leading-relaxed">
						<li>{t("annotation.tipMovePlayhead")}</li>
					</ul>
				</div>
			</div>
		</div>
	);
}
