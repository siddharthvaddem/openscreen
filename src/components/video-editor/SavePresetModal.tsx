import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { PresetSettings } from './types';

interface SavePresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, isDefault: boolean) => Promise<void>;
  currentSettings: PresetSettings;
}

export function SavePresetModal({
  isOpen,
  onClose,
  onSave,
}: SavePresetModalProps) {
  const [name, setName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    
    setSaving(true);
    try {
      await onSave(name.trim(), isDefault);
      // Reset form
      setName('');
      setIsDefault(false);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setName('');
    setIsDefault(false);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && name.trim()) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="bg-[#09090b] border-white/10 text-slate-200 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-slate-100">
            Save as Preset
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-400">
            Save your current settings as a reusable preset.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name Input */}
          <div className="space-y-2">
            <label htmlFor="preset-name" className="text-sm font-medium text-slate-300">
              Name
            </label>
            <input
              id="preset-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="My Preset"
              autoFocus
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#34B27B]/50 focus:border-[#34B27B] transition-all"
              maxLength={50}
            />
          </div>

          {/* Set as Default Switch */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
            <div>
              <div className="text-sm font-medium text-slate-200">Set as default</div>
              <div className="text-xs text-slate-400">Auto-apply to new videos</div>
            </div>
            <Switch
              checked={isDefault}
              onCheckedChange={setIsDefault}
              className="data-[state=checked]:bg-[#34B27B]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={saving}
            className="bg-white/5 text-slate-200 border-white/10 hover:bg-white/10 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="bg-[#34B27B] text-white hover:bg-[#34B27B]/90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Preset'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
