import { Download, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useScopedT } from "@/contexts/I18nContext";
import type { ExportProgress } from "@/lib/exporter";

interface ExportDialogProps {
	isOpen: boolean;
	onClose: () => void;
	progress: ExportProgress | null;
	isExporting: boolean;
	error: string | null;
	onCancel?: () => void;
	exportFormat?: "mp4" | "gif";
	exportedFilePath?: string;
	onShowInFolder?: () => void;
}

export function ExportDialog({
	isOpen,
	onClose,
	progress,
	isExporting,
	error,
	onCancel,
	exportFormat = "mp4",
	exportedFilePath,
	onShowInFolder,
}: ExportDialogProps) {
	const t = useScopedT("dialogs");
	const [showSuccess, setShowSuccess] = useState(false);

	// Reset showSuccess when a new export starts or dialog reopens
	useEffect(() => {
		if (isExporting) {
			setShowSuccess(false);
		}
	}, [isExporting]);

	// Reset showSuccess when dialog opens fresh
	useEffect(() => {
		if (isOpen && !isExporting && !progress) {
			setShowSuccess(false);
		}
	}, [isOpen, isExporting, progress]);

	useEffect(() => {
		if (!isExporting && progress && progress.percentage >= 100 && !error) {
			setShowSuccess(true);
			const timer = setTimeout(() => {
				setShowSuccess(false);
				onClose();
			}, 2000);
			return () => clearTimeout(timer);
		}
	}, [isExporting, progress, error, onClose]);

	if (!isOpen) return null;

	const formatLabel = exportFormat === "gif" ? "GIF" : "Video";

	// Determine if we're in the compiling phase (frames done but still exporting)
	const isCompiling =
		isExporting && progress && progress.percentage >= 100 && exportFormat === "gif";
	const isFinalizing = progress?.phase === "finalizing";
	const renderProgress = progress?.renderProgress;

	// Get status message based on phase
	const getStatusMessage = () => {
		if (error) return t("export.tryAgain");
		if (isCompiling || isFinalizing) {
			if (exportFormat === "mp4") {
				return t("export.finalizingVideo");
			}
			if (renderProgress !== undefined && renderProgress > 0) {
				return t("export.compilingGifProgress", { progress: String(renderProgress) });
			}
			return t("export.compilingGifWait");
		}
		return t("export.takeMoment");
	};

	// Get title based on phase
	const getTitle = () => {
		if (error) return t("export.failed");
		if (isFinalizing && exportFormat === "mp4") return t("export.finalizingVideoTitle");
		if (isCompiling || isFinalizing) return t("export.compilingGif");
		return t("export.exportingFormat", { format: formatLabel });
	};

	return (
		<>
			<div
				className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 animate-in fade-in duration-200"
				onClick={isExporting ? undefined : onClose}
			/>
			<div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[60] editor-panel rounded-2xl shadow-2xl p-8 w-[90vw] max-w-md animate-in zoom-in-95 duration-200">
				<div className="flex items-center justify-between mb-6">
					<div className="flex items-center gap-4">
						{showSuccess ? (
							<>
								<div className="w-12 h-12 rounded-full bg-[#34B27B]/20 flex items-center justify-center ring-1 ring-[#34B27B]/50">
									<Download className="w-6 h-6 text-[#34B27B]" />
								</div>
								<div className="flex flex-col gap-2">
									<span className="text-xl font-bold editor-text-strong block">
										{t("export.complete")}
									</span>
									<span className="text-sm editor-text-muted">
										{t("export.yourFormatReady", { format: formatLabel.toLowerCase() })}
									</span>
									{exportedFilePath && (
										<Button
											variant="secondary"
											onClick={onShowInFolder}
											className="mt-2 w-fit px-3 py-1 text-sm rounded-md editor-panel-soft editor-text"
										>
											{t("export.showInFolder")}
										</Button>
									)}
									{exportedFilePath && (
										<span className="text-xs editor-text-faint break-all max-w-xs mt-1">
											{exportedFilePath.split("/").pop()}
										</span>
									)}
								</div>
							</>
						) : (
							<>
								{isExporting ? (
									<div className="w-12 h-12 rounded-full bg-[#34B27B]/10 flex items-center justify-center">
										<Loader2 className="w-6 h-6 text-[#34B27B] animate-spin" />
									</div>
								) : (
									<div className="w-12 h-12 rounded-full editor-panel-soft flex items-center justify-center editor-border">
										<Download className="w-6 h-6 editor-text" />
									</div>
								)}
								<div>
									<span className="text-xl font-bold editor-text-strong block">{getTitle()}</span>
									<span className="text-sm editor-text-muted">{getStatusMessage()}</span>
								</div>
							</>
						)}
					</div>
					{!isExporting && (
						<Button
							variant="ghost"
							size="icon"
							onClick={onClose}
							className="editor-hover text-muted-foreground hover:text-foreground rounded-full"
						>
							<X className="w-5 h-5" />
						</Button>
					)}
				</div>

				{error && (
					<div className="mb-6 animate-in slide-in-from-top-2">
						<div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
							<div className="p-1 bg-red-500/20 rounded-full">
								<X className="w-3 h-3 text-red-400" />
							</div>
							<p className="text-sm text-red-400 leading-relaxed">{error}</p>
						</div>
					</div>
				)}

				{isExporting && progress && (
					<div className="space-y-6">
						<div className="space-y-2">
							<div className="flex justify-between text-xs font-medium editor-text-muted uppercase tracking-wider">
								<span>
									{isCompiling || isFinalizing
										? t("export.compiling")
										: t("export.renderingFrames")}
								</span>
								<span className="font-mono editor-text">
									{isCompiling || isFinalizing ? (
										renderProgress !== undefined && renderProgress > 0 ? (
											`${renderProgress}%`
										) : (
											<span className="flex items-center gap-2">
												<Loader2 className="w-3 h-3 animate-spin" />
												{t("export.processing")}
											</span>
										)
									) : (
										`${progress.percentage.toFixed(0)}%`
									)}
								</span>
							</div>
							<div className="h-2 bg-muted rounded-full overflow-hidden border editor-border">
								{isCompiling || isFinalizing ? (
									// Show render progress if available, otherwise animated indeterminate bar
									renderProgress !== undefined && renderProgress > 0 ? (
										<div
											className="h-full bg-[#34B27B] shadow-[0_0_10px_rgba(52,178,123,0.3)] transition-all duration-300 ease-out"
											style={{ width: `${renderProgress}%` }}
										/>
									) : (
										<div className="h-full w-full relative overflow-hidden">
											<div
												className="absolute h-full w-1/3 bg-[#34B27B] shadow-[0_0_10px_rgba(52,178,123,0.3)]"
												style={{
													animation: "indeterminate 1.5s ease-in-out infinite",
												}}
											/>
											<style>{`
                        @keyframes indeterminate {
                          0% { transform: translateX(-100%); }
                          100% { transform: translateX(400%); }
                        }
                      `}</style>
										</div>
									)
								) : (
									<div
										className="h-full bg-[#34B27B] shadow-[0_0_10px_rgba(52,178,123,0.3)] transition-all duration-300 ease-out"
										style={{ width: `${Math.min(progress.percentage, 100)}%` }}
									/>
								)}
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="editor-panel-soft rounded-xl p-3">
								<div className="text-[10px] editor-text-faint uppercase tracking-wider mb-1">
									{isCompiling || isFinalizing ? t("export.status") : t("export.format")}
								</div>
								<div className="editor-text font-medium text-sm">
									{isFinalizing && exportFormat === "mp4"
										? t("export.finalizing")
										: isCompiling || isFinalizing
											? t("export.compilingStatus")
											: formatLabel}
								</div>
							</div>
							<div className="editor-panel-soft rounded-xl p-3">
								<div className="text-[10px] editor-text-faint uppercase tracking-wider mb-1">
									{t("export.frames")}
								</div>
								<div className="editor-text font-medium text-sm">
									{progress.currentFrame} / {progress.totalFrames}
								</div>
							</div>
						</div>

						{onCancel && (
							<div className="pt-2">
								<Button
									onClick={onCancel}
									variant="destructive"
									className="w-full py-6 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30 transition-all rounded-xl"
								>
									{t("export.cancelExport")}
								</Button>
							</div>
						)}
					</div>
				)}

				{showSuccess && (
					<div className="text-center py-4 animate-in zoom-in-95">
						<p className="text-lg text-slate-200 font-medium">
							{t("export.savedSuccessfully", { format: formatLabel })}
						</p>
					</div>
				)}
			</div>
		</>
	);
}
