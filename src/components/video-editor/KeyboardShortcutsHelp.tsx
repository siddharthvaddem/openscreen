import { HelpCircle, Settings2 } from "lucide-react";
import { useState, useEffect } from "react";
import { formatShortcut } from "@/utils/platformUtils";
import { useShortcuts } from "@/contexts/ShortcutsContext";
import { formatBinding, SHORTCUT_LABELS, SHORTCUT_ACTIONS } from "@/lib/shortcuts";

export function KeyboardShortcutsHelp() {
  const { shortcuts, isMac, openConfig } = useShortcuts();

  const [scrollLabels, setScrollLabels] = useState({ pan: 'Shift + Ctrl + Scroll', zoom: 'Ctrl + Scroll' });

  useEffect(() => {
    Promise.all([
      formatShortcut(['shift', 'mod', 'Scroll']),
      formatShortcut(['mod', 'Scroll']),
    ]).then(([pan, zoom]) => setScrollLabels({ pan, zoom }));
  }, []);

  return (
    <div className="relative group">
      <HelpCircle className="w-4 h-4 text-slate-500 hover:text-[#34B27B] transition-colors cursor-help" />

      <div className="absolute right-0 top-full mt-2 w-64 bg-[#09090b] border border-white/10 rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-xl z-50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-200">Keyboard Shortcuts</span>
          <button
            type="button"
            onClick={openConfig}
            title="Customize shortcuts"
            className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-[#34B27B] transition-colors"
          >
            <Settings2 className="w-3 h-3" />
            Customize
          </button>
        </div>

        <div className="space-y-1.5 text-[10px]">
          {SHORTCUT_ACTIONS.map((action) => (
            <div key={action} className="flex items-center justify-between">
              <span className="text-slate-400">{SHORTCUT_LABELS[action]}</span>
              <kbd className="px-1 py-0.5 bg-white/5 border border-white/10 rounded text-[#34B27B] font-mono">
                {formatBinding(shortcuts[action], isMac)}
              </kbd>
            </div>
          ))}

          <div className="pt-1 border-t border-white/5 mt-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Pan Timeline</span>
              <kbd className="px-1 py-0.5 bg-white/5 border border-white/10 rounded text-[#34B27B] font-mono">{scrollLabels.pan}</kbd>
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-slate-400">Zoom Timeline</span>
              <kbd className="px-1 py-0.5 bg-white/5 border border-white/10 rounded text-[#34B27B] font-mono">{scrollLabels.zoom}</kbd>
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-slate-400">Cycle Annotations</span>
              <kbd className="px-1 py-0.5 bg-white/5 border border-white/10 rounded text-[#34B27B] font-mono">Tab</kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
