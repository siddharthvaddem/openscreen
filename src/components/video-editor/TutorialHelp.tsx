import { ArrowRight, HelpCircle, Scissors } from "lucide-react";
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

export function TutorialHelp() {
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
					<span className="font-medium">{t("tutorial.triggerLabel")}</span>
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-2xl bg-[#09090b] border-white/10 [&>button]:text-slate-400 [&>button:hover]:text-white">
				<DialogHeader>
					<DialogTitle className="text-xl font-semibold text-slate-200 flex items-center gap-2">
						<Scissors className="w-5 h-5 text-[#ef4444]" /> {t("tutorial.title")}
					</DialogTitle>
					<DialogDescription className="text-slate-400">
						{t("tutorial.description")}
					</DialogDescription>
				</DialogHeader>
				<div className="mt-4 space-y-8">
					{/* Explanation */}
					<div className="bg-white/5 rounded-lg p-4 border border-white/5">
						<p className="text-slate-300 leading-relaxed">
							{t("tutorial.explanation")}
							<span className="text-[#ef4444] font-bold"> {t("tutorial.explanationRemove")}</span>
							<span className="text-[#ef4444] font-bold"> {t("tutorial.explanationCovered")}</span>
							{t("tutorial.explanationEnd")}
						</p>
					</div>
					{/* Visual Illustration */}
					<div className="space-y-2">
						<h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
							{t("tutorial.visualExample")}
						</h3>
						<div className="relative h-24 bg-[#000] rounded-lg border border-white/10 flex items-center px-4 overflow-hidden select-none">
							{/* Background track (Kept parts) */}
							<div className="absolute inset-x-4 h-2 bg-slate-600 rounded-full overflow-hidden">
								{/* Solid line representing video */}
							</div>
							{/* Removed Segment 1 */}
							<div
								className="absolute left-[20%] h-8 bg-[#ef4444]/20 border border-[#ef4444] rounded flex flex-col items-center justify-center z-10"
								style={{ width: "20%" }}
							>
								<span className="text-[10px] font-bold text-[#ef4444] bg-black/50 px-1 rounded">
									{t("tutorial.removed")}
								</span>
							</div>
							{/* Removed Segment 2 */}
							<div
								className="absolute left-[65%] h-8 bg-[#ef4444]/20 border border-[#ef4444] rounded flex flex-col items-center justify-center z-10"
								style={{ width: "15%" }}
							>
								<span className="text-[10px] font-bold text-[#ef4444] bg-black/50 px-1 rounded">
									{t("tutorial.removed")}
								</span>
							</div>
							{/* Labels for kept parts */}
							<div className="absolute left-[5%] text-[10px] text-slate-400 font-medium">
								{t("tutorial.kept")}
							</div>
							<div className="absolute left-[50%] text-[10px] text-slate-400 font-medium">
								{t("tutorial.kept")}
							</div>
							<div className="absolute left-[90%] text-[10px] text-slate-400 font-medium">
								{t("tutorial.kept")}
							</div>
						</div>
						<div className="flex justify-center mt-2">
							<ArrowRight className="w-4 h-4 text-slate-600 rotate-90" />
						</div>
						{/* Result */}
						<div className="relative h-12 bg-[#000] rounded-lg border border-white/10 flex items-center justify-center gap-1 px-4 select-none">
							<div
								className="h-8 bg-slate-700 rounded flex items-center justify-center opacity-80"
								style={{ width: "30%" }}
							>
								<span className="text-[10px] text-white font-medium">{t("tutorial.part1")}</span>
							</div>
							<div
								className="h-8 bg-slate-700 rounded flex items-center justify-center opacity-80"
								style={{ width: "30%" }}
							>
								<span className="text-[10px] text-white font-medium">{t("tutorial.part2")}</span>
							</div>
							<div
								className="h-8 bg-slate-700 rounded flex items-center justify-center opacity-80"
								style={{ width: "30%" }}
							>
								<span className="text-[10px] text-white font-medium">{t("tutorial.part3")}</span>
							</div>
							<span className="absolute right-4 text-xs text-slate-400">
								{t("tutorial.finalVideo")}
							</span>
						</div>
					</div>
					{/* Steps */}
					<div className="grid grid-cols-2 gap-4">
						<div className="p-3 rounded bg-white/5 border border-white/5">
							<div className="text-[#ef4444] font-bold mb-1">{t("tutorial.step1Title")}</div>
							<p className="text-xs text-slate-400">{t("tutorial.step1Description")}</p>
						</div>
						<div className="p-3 rounded bg-white/5 border border-white/5">
							<div className="text-[#ef4444] font-bold mb-1">{t("tutorial.step2Title")}</div>
							<p className="text-xs text-slate-400">{t("tutorial.step2Description")}</p>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
