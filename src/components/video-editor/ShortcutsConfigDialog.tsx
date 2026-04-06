import { Keyboard, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useScopedT } from "@/contexts/I18nContext";
import { useShortcuts } from "@/contexts/ShortcutsContext";
import {
	DEFAULT_SHORTCUTS,
	FIXED_SHORTCUTS,
	findConflict,
	formatBinding,
	SHORTCUT_ACTIONS,
	type ShortcutAction,
	type ShortcutBinding,
	type ShortcutConflict,
	type ShortcutsConfig,
} from "@/lib/shortcuts";

const MODIFIER_KEYS = new Set(["Control", "Shift", "Alt", "Meta"]);

export function ShortcutsConfigDialog() {
	const { shortcuts, isMac, isConfigOpen, closeConfig, setShortcuts, persistShortcuts } =
		useShortcuts();
	const t = useScopedT("shortcuts");
	const tc = useScopedT("common");

	const [draft, setDraft] = useState<ShortcutsConfig>(shortcuts);
	const [captureFor, setCaptureFor] = useState<ShortcutAction | null>(null);
	const [conflict, setConflict] = useState<{
		forAction: ShortcutAction;
		pending: ShortcutBinding;
		conflictWith: ShortcutConflict;
	} | null>(null);

	useEffect(() => {
		if (isConfigOpen) {
			setDraft(shortcuts);
			setCaptureFor(null);
			setConflict(null);
		}
	}, [isConfigOpen, shortcuts]);

	useEffect(() => {
		if (!captureFor) return;

		const handleCapture = (e: KeyboardEvent) => {
			e.preventDefault();
			e.stopPropagation();

			if (e.key === "Escape") {
				setCaptureFor(null);
				return;
			}

			if (MODIFIER_KEYS.has(e.key)) return;

			const binding: ShortcutBinding = {
				key: e.key.toLowerCase(),
				...(e.ctrlKey || e.metaKey ? { ctrl: true } : {}),
				...(e.shiftKey ? { shift: true } : {}),
				...(e.altKey ? { alt: true } : {}),
			};

			const found = findConflict(binding, captureFor, draft);
			setCaptureFor(null);

			if (found?.type === "fixed") {
				toast.error(t("reservedShortcut", { label: found.label }));
				return;
			}

			if (found?.type === "configurable") {
				setConflict({ forAction: captureFor, pending: binding, conflictWith: found });
				return;
			}

			setDraft((prev: ShortcutsConfig) => ({ ...prev, [captureFor]: binding }));
		};

		window.addEventListener("keydown", handleCapture, { capture: true });
		return () => window.removeEventListener("keydown", handleCapture, { capture: true });
	}, [captureFor, draft, t]);

	const handleSwap = useCallback(() => {
		if (!conflict || conflict.conflictWith.type !== "configurable") return;
		const { forAction, pending, conflictWith } = conflict;
		setDraft((prev: ShortcutsConfig) => ({
			...prev,
			[forAction]: pending,
			[conflictWith.action]: prev[forAction],
		}));
		setConflict(null);
	}, [conflict]);

	const handleCancelConflict = useCallback(() => setConflict(null), []);

	const handleSave = useCallback(async () => {
		setShortcuts(draft);
		await persistShortcuts(draft);
		toast.success(t("savedToast"));
		closeConfig();
	}, [draft, setShortcuts, persistShortcuts, closeConfig, t]);

	const handleReset = useCallback(() => {
		setDraft({ ...DEFAULT_SHORTCUTS });
		toast.info(t("resetToast"));
	}, [t]);

	const handleClose = useCallback(() => {
		setCaptureFor(null);
		setConflict(null);
		closeConfig();
	}, [closeConfig]);

	return (
		<Dialog
			open={isConfigOpen}
			onOpenChange={(open: boolean) => {
				if (!open) handleClose();
			}}
		>
			<DialogContent className="bg-[#09090b] border-white/10 text-white max-w-[420px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-sm">
						<Keyboard className="w-4 h-4 text-[#34B27B]" />
						{t("title")}
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-0.5">
					<p className="text-[10px] text-slate-500 mb-2 uppercase tracking-wide font-semibold">
						{t("configurable")}
					</p>
					{SHORTCUT_ACTIONS.map((action) => {
						const isCapturing = captureFor === action;
						const hasConflict = conflict?.forAction === action;
						return (
							<div key={action}>
								<div className="flex items-center justify-between py-1.5 px-1 border-b border-white/5">
									<span className="text-sm text-slate-300">{t(`actions.${action}`)}</span>
									<button
										type="button"
										onClick={() => {
											setConflict(null);
											setCaptureFor(isCapturing ? null : action);
										}}
										title={isCapturing ? t("pressEscToCancel") : t("clickToChange")}
										className={[
											"px-2 py-1 rounded text-xs font-mono border transition-all min-w-[90px] text-center select-none",
											isCapturing
												? "bg-[#34B27B]/20 border-[#34B27B] text-[#34B27B] animate-pulse"
												: hasConflict
													? "bg-amber-500/10 border-amber-500/50 text-amber-400"
													: "bg-white/5 border-white/10 text-slate-200 hover:border-[#34B27B]/50 hover:text-[#34B27B] cursor-pointer",
										].join(" ")}
									>
										{isCapturing ? t("pressKey") : formatBinding(draft[action], isMac)}
									</button>
								</div>
								{hasConflict && conflict?.conflictWith.type === "configurable" && (
									<div className="flex items-center justify-between px-1 py-1.5 mb-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-xs">
										<span className="text-amber-400">
											⚠{" "}
											{t("alreadyUsedBy", { action: t(`actions.${conflict.conflictWith.action}`) })}
										</span>
										<div className="flex gap-1.5">
											<button
												type="button"
												onClick={handleSwap}
												className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded text-amber-300 font-medium transition-colors"
											>
												{t("swap")}
											</button>
											<button
												type="button"
												onClick={handleCancelConflict}
												className="px-2 py-0.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-slate-400 transition-colors"
											>
												{tc("actions.cancel")}
											</button>
										</div>
									</div>
								)}
							</div>
						);
					})}
				</div>

				<div className="space-y-0.5 mt-2">
					<p className="text-[10px] text-slate-500 mb-2 uppercase tracking-wide font-semibold">
						{t("fixed")}
					</p>
					{FIXED_SHORTCUTS.map(({ i18nKey, label, display }) => (
						<div
							key={i18nKey}
							className="flex items-center justify-between py-1.5 px-1 border-b border-white/5 last:border-0"
						>
							<span className="text-sm text-slate-400">
								{t(`fixedActions.${i18nKey}`, { defaultValue: label })}
							</span>
							<kbd className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs font-mono text-slate-400 min-w-[90px] text-center">
								{display}
							</kbd>
						</div>
					))}
				</div>

				<p className="text-[10px] text-slate-500 mt-1">{t("helpText")}</p>

				<DialogFooter className="flex gap-2 sm:justify-between mt-2">
					<Button
						variant="ghost"
						size="sm"
						className="text-slate-400 hover:text-white gap-1.5"
						onClick={handleReset}
					>
						<RotateCcw className="w-3 h-3" />
						{t("resetToDefaults")}
					</Button>
					<div className="flex gap-2">
						<Button variant="ghost" size="sm" onClick={handleClose}>
							{tc("actions.cancel")}
						</Button>
						<Button
							size="sm"
							className="bg-[#34B27B] hover:bg-[#2d9e6c] text-white"
							onClick={handleSave}
						>
							{tc("actions.save")}
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
