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
					className="h-7 px-2 text-xs editor-text-muted hover:text-foreground hover:bg-accent transition-all gap-1.5"
				>
					<HelpCircle className="w-3.5 h-3.5" />
					<span className="font-medium">{t("tutorial.triggerLabel")}</span>
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-2xl editor-panel [&>button]:text-muted-foreground [&>button:hover]:text-foreground">
				<DialogHeader>
					<DialogTitle className="text-xl font-semibold editor-text flex items-center gap-2">
						<Scissors className="w-5 h-5 text-[#ef4444]" /> {t("tutorial.title")}
					</DialogTitle>
					<DialogDescription className="editor-text-muted">
						{t("tutorial.description")}
					</DialogDescription>
				</DialogHeader>
				<div className="mt-4 space-y-8">
					{/* Explanation */}
					<div className="editor-panel-soft rounded-lg p-4">
						<p className="editor-text-muted leading-relaxed">
							{t("tutorial.explanationBefore")}
							<span className="text-[#ef4444] font-bold"> {t("tutorial.remove")}</span>
							{t("tutorial.explanationMiddle")}
							<span className="text-[#ef4444] font-bold"> {t("tutorial.covered")}</span>
							{t("tutorial.explanationAfter")}
						</p>
					</div>
					{/* Visual Illustration */}
					<div className="space-y-2">
						<h3 className="text-sm font-medium editor-text-muted uppercase tracking-wider">
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
							<div className="absolute left-[5%] text-[10px] editor-text-muted font-medium">
								{t("tutorial.kept")}
							</div>
							<div className="absolute left-[50%] text-[10px] editor-text-muted font-medium">
								{t("tutorial.kept")}
							</div>
							<div className="absolute left-[90%] text-[10px] editor-text-muted font-medium">
								{t("tutorial.kept")}
							</div>
						</div>
						<div className="flex justify-center mt-2">
							<ArrowRight className="w-4 h-4 editor-text-faint rotate-90" />
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
							<span className="absolute right-4 text-xs editor-text-muted">
								{t("tutorial.finalVideo")}
							</span>
						</div>
					</div>
					{/* Steps */}
					<div className="grid grid-cols-2 gap-4">
						<div className="p-3 rounded editor-panel-soft">
							<div className="text-[#ef4444] font-bold mb-1">{t("tutorial.step1Title")}</div>
							<p className="text-xs editor-text-muted">
								{t("tutorial.step1DescriptionBefore")}
								<kbd className="editor-kbd px-1 rounded">T</kbd>
								{t("tutorial.step1DescriptionAfter")}
							</p>
						</div>
						<div className="p-3 rounded editor-panel-soft">
							<div className="text-[#ef4444] font-bold mb-1">{t("tutorial.step2Title")}</div>
							<p className="text-xs editor-text-muted">{t("tutorial.step2Description")}</p>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
