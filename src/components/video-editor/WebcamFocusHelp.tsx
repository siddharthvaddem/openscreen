import { HelpCircle, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { useScopedT } from "@/contexts/I18nContext";

export function WebcamFocusHelp() {
	const t = useScopedT("dialogs");
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="h-7 px-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-all gap-1.5"
				>
					<HelpCircle className="w-3.5 h-3.5" />
					<span className="font-medium">{t("webcamFocusTutorial.triggerLabel")}</span>
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-2xl bg-[#09090b] border-white/10 [&>button]:text-slate-400 [&>button:hover]:text-white">
				<DialogHeader>
					<DialogTitle className="text-xl font-semibold text-slate-200 flex items-center gap-2">
						<Video className="w-5 h-5 text-[#6366f1]" /> {t("webcamFocusTutorial.title")}
					</DialogTitle>
					<DialogDescription className="text-slate-400">
						{t("webcamFocusTutorial.description")}
					</DialogDescription>
				</DialogHeader>
				<div className="mt-4 space-y-8">
					{/* Explanation */}
					<div className="bg-white/5 rounded-lg p-4 border border-white/5">
						<p className="text-slate-300 leading-relaxed">
							{t("webcamFocusTutorial.explanation")}
						</p>
					</div>

					{/* Visual Illustration */}
					<div className="space-y-2">
						<h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
							{t("webcamFocusTutorial.visualExample")}
						</h3>

						{/* Before: timeline with a focus region */}
						<div className="relative h-24 bg-[#000] rounded-lg border border-white/10 flex items-center px-4 overflow-hidden select-none">
							<div className="absolute inset-x-4 h-2 bg-slate-700 rounded-full" />
							{/* Focus region */}
							<div
								className="absolute left-[35%] h-8 bg-[#6366f1]/20 border border-[#6366f1] rounded flex flex-col items-center justify-center z-10"
								style={{ width: "30%" }}
							>
								<Video className="w-3 h-3 text-[#6366f1] mb-0.5" />
								<span className="text-[10px] font-bold text-[#6366f1] bg-black/50 px-1 rounded">
									{t("webcamFocusTutorial.focusRegion")}
								</span>
							</div>
							{/* Labels */}
							<div className="absolute left-[8%] text-[10px] text-slate-400 font-medium">
								{t("webcamFocusTutorial.normal")}
							</div>
							<div className="absolute left-[72%] text-[10px] text-slate-400 font-medium">
								{t("webcamFocusTutorial.normal")}
							</div>
						</div>

						{/* After: split view */}
						<div className="grid grid-cols-2 gap-3 mt-3">
							{/* Outside region */}
							<div className="bg-[#000] rounded-lg border border-white/10 h-28 relative overflow-hidden">
								<div className="absolute inset-0 bg-slate-800/60 flex items-end justify-end p-1.5">
									<div className="w-10 h-8 bg-black rounded border border-white/20 flex items-center justify-center">
										<Video className="w-3 h-3 text-slate-400" />
									</div>
								</div>
								<p className="absolute bottom-1 left-2 text-[9px] text-slate-500">
									{t("webcamFocusTutorial.outsideRegion")}
								</p>
							</div>
							{/* Inside region */}
							<div className="bg-[#000] rounded-lg border border-[#6366f1]/40 h-28 relative overflow-hidden">
								<div className="absolute inset-0 bg-slate-900/80" style={{ filter: "blur(3px) brightness(0.5)" }} />
								<div className="absolute inset-0 flex items-center justify-center">
									<div className="w-16 h-24 bg-black rounded border border-[#6366f1]/60 flex items-center justify-center">
										<Video className="w-5 h-5 text-[#6366f1]" />
									</div>
								</div>
								<p className="absolute bottom-1 left-2 text-[9px] text-[#6366f1]">
									{t("webcamFocusTutorial.insideRegion")}
								</p>
							</div>
						</div>
					</div>

					{/* Steps */}
					<div className="grid grid-cols-2 gap-4">
						<div className="p-3 rounded bg-white/5 border border-white/5">
							<div className="text-[#6366f1] font-bold mb-1">
								{t("webcamFocusTutorial.step1Title")}
							</div>
							<p className="text-xs text-slate-400">
								{t("webcamFocusTutorial.step1Description")}
							</p>
						</div>
						<div className="p-3 rounded bg-white/5 border border-white/5">
							<div className="text-[#6366f1] font-bold mb-1">
								{t("webcamFocusTutorial.step2Title")}
							</div>
							<p className="text-xs text-slate-400">
								{t("webcamFocusTutorial.step2Description")}
							</p>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
