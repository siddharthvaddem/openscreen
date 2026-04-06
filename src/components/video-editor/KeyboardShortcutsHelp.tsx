import { HelpCircle, Settings2 } from "lucide-react";
import { useScopedT } from "@/contexts/I18nContext";
import { useShortcuts } from "@/contexts/ShortcutsContext";
import { FIXED_SHORTCUTS, formatBinding, SHORTCUT_ACTIONS } from "@/lib/shortcuts";

export function KeyboardShortcutsHelp() {
	const { shortcuts, isMac, openConfig } = useShortcuts();
	const t = useScopedT("shortcuts");

	return (
		<div className="relative group">
			<HelpCircle className="w-4 h-4 text-slate-500 hover:text-[#34B27B] transition-colors cursor-help" />

			<div className="absolute right-0 top-full mt-2 w-64 bg-[#09090b] border border-white/10 rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-xl z-50">
				<div className="flex items-center justify-between mb-2">
					<span className="text-xs font-semibold text-slate-200">{t("title")}</span>
					<button
						type="button"
						onClick={openConfig}
						title="Customize shortcuts"
						className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-[#34B27B] transition-colors"
					>
						<Settings2 className="w-3 h-3" />
						{t("customize")}
					</button>
				</div>

				<div className="space-y-1.5 text-[10px]">
					{SHORTCUT_ACTIONS.map((action) => (
						<div key={action} className="flex items-center justify-between">
							<span className="text-slate-400">{t(`actions.${action}`)}</span>
							<kbd className="px-1 py-0.5 bg-white/5 border border-white/10 rounded text-[#34B27B] font-mono">
								{formatBinding(shortcuts[action], isMac)}
							</kbd>
						</div>
					))}

					<div className="pt-1 border-t border-white/5 mt-1 space-y-1.5">
						{FIXED_SHORTCUTS.map((fixed) => (
							<div key={fixed.i18nKey} className="flex items-center justify-between">
								<span className="text-slate-400">
									{t(`fixedActions.${fixed.i18nKey}`, { defaultValue: fixed.label })}
								</span>
								<kbd className="px-1 py-0.5 bg-white/5 border border-white/10 rounded text-[#34B27B] font-mono">
									{isMac
										? fixed.display
												.replace(/Ctrl/g, "⌘")
												.replace(/Shift/g, "⇧")
												.replace(/Alt/g, "⌥")
										: fixed.display}
								</kbd>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
