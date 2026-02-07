import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown, Plus, Star, RotateCcw, Copy, Pencil, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { SavePresetModal } from './SavePresetModal';
import type { Preset, PresetSettings } from './types';

interface PresetSelectorProps {
  presets: Preset[];
  defaultPresetId: string | null;
  currentSettings: PresetSettings;
  onApplyPreset: (preset: Preset) => void;
  onSavePreset: (name: string, settings: PresetSettings, isDefault: boolean) => Promise<Preset | null>;
  onDeletePreset: (id: string) => Promise<boolean>;
  onDuplicatePreset: (id: string) => Promise<Preset | null>;
  onRenamePreset: (id: string, name: string) => Promise<boolean>;
  onSetDefaultPreset: (id: string | null) => Promise<boolean>;
  onResetToDefaults: () => void;
}

export function PresetSelector({
  presets,
  defaultPresetId,
  currentSettings,
  onApplyPreset,
  onSavePreset,
  onDeletePreset,
  onDuplicatePreset,
  onRenamePreset,
  onSetDefaultPreset,
  onResetToDefaults,
}: PresetSelectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleSavePreset = async (name: string, isDefault: boolean) => {
    const preset = await onSavePreset(name, currentSettings, isDefault);
    if (preset) {
      toast.success(`Preset "${name}" saved`);
    } else {
      toast.error('Failed to save preset');
    }
  };

  const handleApplyPreset = (preset: Preset) => {
    onApplyPreset(preset);
    toast.success(`Applied preset "${preset.name}"`);
  };

  const handleDeletePreset = async (preset: Preset) => {
    const success = await onDeletePreset(preset.id);
    if (success) {
      toast.success(`Deleted preset "${preset.name}"`);
    } else {
      toast.error('Failed to delete preset');
    }
  };

  const handleDuplicatePreset = async (preset: Preset) => {
    const newPreset = await onDuplicatePreset(preset.id);
    if (newPreset) {
      toast.success(`Duplicated as "${newPreset.name}"`);
    } else {
      toast.error('Failed to duplicate preset');
    }
  };

  const handleSetDefault = async (preset: Preset) => {
    const newDefaultId = preset.isDefault ? null : preset.id;
    const success = await onSetDefaultPreset(newDefaultId);
    if (success) {
      if (newDefaultId) {
        toast.success(`"${preset.name}" set as default`);
      } else {
        toast.success(`Removed default preset`);
      }
    } else {
      toast.error('Failed to update default preset');
    }
  };

  const handleStartRename = (preset: Preset) => {
    setEditingPresetId(preset.id);
    setEditingName(preset.name);
  };

  const handleFinishRename = async (presetId: string) => {
    if (editingName.trim()) {
      const success = await onRenamePreset(presetId, editingName.trim());
      if (success) {
        toast.success('Preset renamed');
      } else {
        toast.error('Failed to rename preset');
      }
    }
    setEditingPresetId(null);
    setEditingName('');
  };

  const handleResetToDefaults = () => {
    onResetToDefaults();
    toast.success('Reset to default settings');
  };

  const truncateName = (name: string, maxLength: number = 20) => {
    if (name.length <= maxLength) return name;
    return name.slice(0, maxLength) + '...';
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-200">Presets</span>
      </div>
      
      <div className="flex gap-2">
        {/* Preset Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="flex-1 justify-between bg-white/5 text-slate-200 border-white/10 hover:bg-white/10 hover:text-white h-9"
            >
              <span className="truncate">
                {presets.length === 0 ? 'No presets yet' : 'Select preset...'}
              </span>
              <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            className="w-56 bg-[#18181b] border-white/10 text-slate-200"
            align="start"
          >
            {presets.length === 0 ? (
              <div className="px-2 py-3 text-center text-sm text-slate-400">
                No presets saved yet
              </div>
            ) : (
              presets.map((preset) => (
                <DropdownMenuSub key={preset.id}>
                  <DropdownMenuSubTrigger 
                    className="flex items-center gap-2 cursor-pointer hover:bg-white/10 focus:bg-white/10"
                    onClick={(e) => {
                      // Allow click to apply preset if not clicking submenu arrow
                      if (!(e.target as HTMLElement).closest('[data-radix-collection-item]')) {
                        handleApplyPreset(preset);
                      }
                    }}
                  >
                    {preset.id === defaultPresetId && (
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    )}
                    {editingPresetId === preset.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => handleFinishRename(preset.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleFinishRename(preset.id);
                          } else if (e.key === 'Escape') {
                            setEditingPresetId(null);
                            setEditingName('');
                          }
                        }}
                        className="flex-1 bg-transparent border-b border-[#34B27B] outline-none text-sm"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="flex-1 truncate">{truncateName(preset.name)}</span>
                    )}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="bg-[#18181b] border-white/10 text-slate-200">
                    <DropdownMenuItem 
                      onClick={() => handleApplyPreset(preset)}
                      className="cursor-pointer hover:bg-white/10 focus:bg-white/10"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Apply
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleStartRename(preset)}
                      className="cursor-pointer hover:bg-white/10 focus:bg-white/10"
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDuplicatePreset(preset)}
                      className="cursor-pointer hover:bg-white/10 focus:bg-white/10"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleSetDefault(preset)}
                      className="cursor-pointer hover:bg-white/10 focus:bg-white/10"
                    >
                      <Star className={`w-4 h-4 mr-2 ${preset.id === defaultPresetId ? 'text-yellow-400 fill-yellow-400' : ''}`} />
                      {preset.id === defaultPresetId ? 'Remove Default' : 'Set as Default'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem 
                      onClick={() => handleDeletePreset(preset)}
                      className="cursor-pointer text-red-400 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-400"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              ))
            )}
            
            {presets.length > 0 && <DropdownMenuSeparator className="bg-white/10" />}
            
            <DropdownMenuItem 
              onClick={handleResetToDefaults}
              className="cursor-pointer hover:bg-white/10 focus:bg-white/10 text-slate-400"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to defaults
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Save Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsModalOpen(true)}
          className="bg-[#34B27B] text-white border-[#34B27B] hover:bg-[#34B27B]/80 hover:text-white h-9 w-9"
          title="Save current settings as preset"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <SavePresetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePreset}
        currentSettings={currentSettings}
      />
    </div>
  );
}
