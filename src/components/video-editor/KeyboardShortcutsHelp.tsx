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
        <div className="text-xs font-semibold text-slate-200 mb-2">Keyboard Shortcuts</div>
        <div className="space-y-1.5 text-[10px]">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Add Zoom</span>
            <kbd className="px-1 py-0.5 bg-white/5 border border-white/10 rounded text-[#34B27B] font-mono">Z</kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Add Annotation</span>
            <kbd className="px-1 py-0.5 bg-white/5 border border-white/10 rounded text-[#34B27B] font-mono">A</kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Add Keyframe</span>
            <kbd className="px-1 py-0.5 bg-white/5 border border-white/10 rounded text-[#34B27B] font-mono">F</kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Add Trim</span>
            <kbd className="px-1 py-0.5 bg-white/5 border border-white/10 rounded text-[#34B27B] font-mono">T</kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Delete Selected</span>
            <kbd className="px-1 py-0.5 bg-white/5 border border-white/10 rounded text-[#34B27B] font-mono">{shortcuts.delete}</kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Pan Timeline</span>
            <kbd className="px-1 py-0.5 bg-white/5 border border-white/10 rounded text-[#34B27B] font-mono">{shortcuts.pan}</kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Zoom Timeline</span>
            <kbd className="px-1 py-0.5 bg-white/5 border border-white/10 rounded text-[#34B27B] font-mono">{shortcuts.zoom}</kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Pause/Play</span>
            <kbd className="px-1 py-0.5 bg-white/5 border border-white/10 rounded text-[#34B27B] font-mono">Space</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
