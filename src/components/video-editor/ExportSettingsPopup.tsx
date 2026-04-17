import { Download, Film, Image, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useScopedT } from "@/contexts/I18nContext";
import type { ExportFormat, ExportQuality, GifFrameRate, GifSizePreset } from "@/lib/exporter";
import { GIF_FRAME_RATES, GIF_SIZE_PRESETS } from "@/lib/exporter";
import { cn } from "@/lib/utils";
import { getTestId } from "@/utils/getTestId";

interface ExportSettingsPopupProps {
	isOpen: boolean;
	onClose: () => void;
	exportFormat: ExportFormat;
	onExportFormatChange: (format: ExportFormat) => void;
	exportQuality: ExportQuality;
	onExportQualityChange: (quality: ExportQuality) => void;
	gifFrameRate: GifFrameRate;
	onGifFrameRateChange: (rate: GifFrameRate) => void;
	gifSizePreset: GifSizePreset;
	onGifSizePresetChange: (preset: GifSizePreset) => void;
	gifLoop: boolean;
	onGifLoopChange: (enabled: boolean) => void;
	gifOutputDimensions: { width: number; height: number };
	onExport: () => void;
	unsavedExport: {
		arrayBuffer: ArrayBuffer;
		fileName: string;
		format: string;
	} | null;
	onSaveUnsavedExport?: () => void;
}

export function ExportSettingsPopup({
	isOpen,
	onClose,
	exportFormat,
	onExportFormatChange,
	exportQuality,
	onExportQualityChange,
	gifFrameRate,
	onGifFrameRateChange,
	gifSizePreset,
	onGifSizePresetChange,
	gifLoop,
	onGifLoopChange,
	gifOutputDimensions,
	onExport,
	unsavedExport,
	onSaveUnsavedExport,
}: ExportSettingsPopupProps) {
	const t = useScopedT("settings");

	if (!isOpen) return null;

	return (
		<>
			<div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70]" onClick={onClose} />
			<div className="fixed top-1/2 left-1/2 z-[80] w-[min(92vw,460px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#09090b] p-5 shadow-2xl shadow-black/50">
				<div className="mb-4 flex items-center justify-between">
					<div>
						<p className="text-sm font-semibold text-slate-100">{t("export.videoButton")}</p>
						<p className="text-xs text-slate-400">Choose format and quality before exporting.</p>
					</div>
					<Button
						variant="ghost"
						size="icon"
						onClick={onClose}
						className="h-8 w-8 rounded-full text-slate-400 hover:bg-white/10 hover:text-slate-200"
					>
						<X className="h-4 w-4" />
					</Button>
				</div>

				<div className="mb-3 flex items-center gap-2">
					<button
						onClick={() => onExportFormatChange("mp4")}
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
						onClick={() => onExportFormatChange("gif")}
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
					<div className="mb-3 bg-white/5 border border-white/5 p-0.5 w-full grid grid-cols-3 h-8 rounded-lg">
						<button
							onClick={() => onExportQualityChange("medium")}
							className={cn(
								"rounded-md transition-all text-xs font-medium",
								exportQuality === "medium"
									? "bg-white text-black"
									: "text-slate-400 hover:text-slate-200",
							)}
						>
							{t("exportQuality.low")}
						</button>
						<button
							onClick={() => onExportQualityChange("good")}
							className={cn(
								"rounded-md transition-all text-xs font-medium",
								exportQuality === "good"
									? "bg-white text-black"
									: "text-slate-400 hover:text-slate-200",
							)}
						>
							{t("exportQuality.medium")}
						</button>
						<button
							onClick={() => onExportQualityChange("source")}
							className={cn(
								"rounded-md transition-all text-xs font-medium",
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
							<div className="flex-1 bg-white/5 border border-white/5 p-0.5 grid grid-cols-4 h-8 rounded-lg">
								{GIF_FRAME_RATES.map((rate) => (
									<button
										key={rate.value}
										onClick={() => onGifFrameRateChange(rate.value)}
										className={cn(
											"rounded-md transition-all text-xs font-medium",
											gifFrameRate === rate.value
												? "bg-white text-black"
												: "text-slate-400 hover:text-slate-200",
										)}
									>
										{rate.value}
									</button>
								))}
							</div>
							<div className="flex-1 bg-white/5 border border-white/5 p-0.5 grid grid-cols-3 h-8 rounded-lg">
								{Object.entries(GIF_SIZE_PRESETS).map(([key, _preset]) => (
									<button
										key={key}
										data-testid={getTestId(`gif-size-button-${key}`)}
										onClick={() => onGifSizePresetChange(key as GifSizePreset)}
										className={cn(
											"rounded-md transition-all text-xs font-medium",
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
								{gifOutputDimensions.width} x {gifOutputDimensions.height}px
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
						className="w-full mb-2 py-5 text-sm font-semibold flex items-center justify-center gap-2 bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 hover:bg-indigo-500/90"
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
					className="w-full py-5 text-sm font-semibold flex items-center justify-center gap-2 bg-[#34B27B] text-white rounded-xl shadow-lg shadow-[#34B27B]/20 hover:bg-[#34B27B]/90"
				>
					<Download className="w-4 h-4" />
					{exportFormat === "gif" ? t("export.gifButton") : t("export.videoButton")}
				</Button>
			</div>
		</>
	);
}
