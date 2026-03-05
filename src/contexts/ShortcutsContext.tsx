import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_SHORTCUTS, mergeWithDefaults, type ShortcutsConfig } from '@/lib/shortcuts';
import { isMac as getIsMac } from '@/utils/platformUtils';

interface ShortcutsContextValue {
  shortcuts: ShortcutsConfig;
  isMac: boolean;
  setShortcuts: (config: ShortcutsConfig) => void;
  persistShortcuts: (config?: ShortcutsConfig) => Promise<void>;
  isConfigOpen: boolean;
  openConfig: () => void;
  closeConfig: () => void;
}

const ShortcutsContext = createContext<ShortcutsContextValue | null>(null);

export function useShortcuts(): ShortcutsContextValue {
  const ctx = useContext(ShortcutsContext);
  if (!ctx) throw new Error('useShortcuts must be used within <ShortcutsProvider>');
  return ctx;
}

export function ShortcutsProvider({ children }: { children: ReactNode }) {
  const [shortcuts, setShortcuts] = useState<ShortcutsConfig>(DEFAULT_SHORTCUTS);
  const [isMac, setIsMac] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  useEffect(() => {
    getIsMac().then(setIsMac).catch(() => {});

    window.electronAPI.getShortcuts?.()
      .then((saved) => {
        if (saved) {
          setShortcuts(mergeWithDefaults(saved as Partial<ShortcutsConfig>));
        }
      })
      .catch(() => {});
  }, []);

  const persistShortcuts = useCallback(
    async (config?: ShortcutsConfig) => {
      await window.electronAPI.saveShortcuts?.(config ?? shortcuts);
    },
    [shortcuts],
  );

  const openConfig = useCallback(() => setIsConfigOpen(true), []);
  const closeConfig = useCallback(() => setIsConfigOpen(false), []);

  const value = useMemo<ShortcutsContextValue>(
    () => ({ shortcuts, isMac, setShortcuts, persistShortcuts, isConfigOpen, openConfig, closeConfig }),
    [shortcuts, isMac, persistShortcuts, isConfigOpen, openConfig, closeConfig],
  );

  return (
    <ShortcutsContext.Provider value={value}>
      {children}
    </ShortcutsContext.Provider>
  );
}
