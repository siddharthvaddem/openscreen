import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, ChevronDown } from "lucide-react";
import Block from '@uiw/react-color-block';
import type { KeystrokeRegion, KeystrokeStyle, KeystrokePositionPreset, AnimationPreset } from "../types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface KeystrokeSettingsPanelProps {
  keystroke: KeystrokeRegion;
  onStyleChange: (style: Partial<KeystrokeStyle>) => void;
  onPositionChange: (position: KeystrokePositionPreset) => void;
  onApplyStyleToAll?: (style: Partial<KeystrokeStyle>, position?: KeystrokePositionPreset) => void;
  onDelete: () => void;
}

const POSITION_PRESETS: { value: KeystrokePositionPreset; label: string }[] = [
  { value: 'bottom-center', label: 'Bottom Center' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'top-center', label: 'Top Center' },
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-right', label: 'Top Right' },
];

const ANIMATION_PRESETS: { value: AnimationPreset; label: string }[] = [
  { value: 'fade', label: 'Fade' },
  { value: 'slide-up', label: 'Slide Up' },
  { value: 'slide-down', label: 'Slide Down' },
  { value: 'scale', label: 'Scale' },
  { value: 'none', label: 'None' },
];

/**
 * KeystrokeSettingsPanel Component
 * 
 * Provides controls for customizing keystroke overlay appearance and behavior.
 * Follows the same pattern as SubtitleSettingsPanel.
 * 
 * Requirements:
 * - 7.1: Text scale (0.5 - 2.0)
 * - 7.2: Position preset selector
 * - 7.3: Background color with opacity
 * - 7.4: Text color
 * - 7.5: Border radius (0 - 16px)
 * - 7.6: Fade duration
 * - 7.7: Linger duration
 * - 7.8: Hotkey filter toggle
 * - 7.9: Modifier key color
 * - 8.1.1: Animation in preset
 * - 8.1.2: Animation out preset
 */
export function KeystrokeSettingsPanel({
  keystroke,
  onStyleChange,
  onPositionChange,
  onApplyStyleToAll,
  onDelete,
}: KeystrokeSettingsPanelProps) {
  const [applyToAll, setApplyToAll] = useState(false);

  /**
   * Routes style updates to either onApplyStyleToAll or onStyleChange
   * based on the applyToAll state.
   * 
   * When applyToAll is true, applies the style to all keystroke regions.
   * When applyToAll is false, applies the style only to the current keystroke.
   * 
   * Validates: Requirements 4.2
   */
  const handleStyleUpdate = (style: Partial<KeystrokeStyle>) => {
    if (applyToAll && onApplyStyleToAll) {
      onApplyStyleToAll(style);
    } else {
      onStyleChange(style);
    }
  };

  /**
   * Routes position updates to either onApplyStyleToAll or onPositionChange
   * based on the applyToAll state.
   * 
   * When applyToAll is true, applies the position to all keystroke regions.
   * When applyToAll is false, applies the position only to the current keystroke.
   * 
   * Validates: Requirements 4.3
   */
  const handlePositionUpdate = (position: KeystrokePositionPreset) => {
    if (applyToAll && onApplyStyleToAll) {
      onApplyStyleToAll({}, position);
    } else {
      onPositionChange(position);
    }
  };

  const colorPalette = [
    '#FF0000', // Red
    '#FFD700', // Yellow/Gold
    '#00FF00', // Green
    '#FFFFFF', // White
    '#0000FF', // Blue
    '#FF6B00', // Orange
    '#9B59B6', // Purple
    '#E91E63', // Pink
    '#00BCD4', // Cyan
    '#FF5722', // Deep Orange
    '#8BC34A', // Light Green
    '#FFC107', // Amber
    '#34B27B', // Brand Green
    '#000000', // Black
    '#607D8B', // Blue Grey
    '#795548', // Brown
  ];

  return (
    <div className="flex-[2] min-w-0 bg-[#09090b] border border-white/5 rounded-2xl p-4 flex flex-col shadow-xl h-full overflow-y-auto custom-scrollbar">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-slate-200">Keystroke Settings</span>
          <span className="text-[10px] uppercase tracking-wider font-medium text-[#34B27B] bg-[#34B27B]/10 px-2 py-1 rounded-full">
            Active
          </span>
        </div>
        
        {/* Keystroke Preview */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-200 mb-2 block">Keystroke</label>
            <div className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-200 text-sm">
              {keystroke.text}
            </div>
          </div>

          {/* Text Scale */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-200">Text Scale</label>
              <span className="text-[10px] text-slate-400">{keystroke.style.textScale.toFixed(1)}x</span>
            </div>
            <Slider
              value={[keystroke.style.textScale]}
              onValueChange={([value]) => handleStyleUpdate({ textScale: value })}
              min={0.5}
              max={2.0}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* Colors */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-medium text-slate-200 mb-2 block">Text</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full h-9 justify-start gap-2 bg-white/5 border-white/10 hover:bg-white/10 px-2"
                  >
                    <div 
                      className="w-4 h-4 rounded-full border border-white/20" 
                      style={{ backgroundColor: keystroke.style.textColor }}
                    />
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[260px] p-3 bg-[#1a1a1c] border border-white/10 rounded-xl shadow-xl">
                  <Block
                    color={keystroke.style.textColor}
                    colors={colorPalette}
                    onChange={(color) => {
                      handleStyleUpdate({ textColor: color.hex });
                    }}
                    style={{
                      borderRadius: '8px',
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-200 mb-2 block">Background</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full h-9 justify-start gap-2 bg-white/5 border-white/10 hover:bg-white/10 px-2"
                  >
                    <div 
                      className="w-4 h-4 rounded-full border border-white/20 relative overflow-hidden" 
                    >
                      <div className="absolute inset-0 checkerboard-bg opacity-50" />
                      <div 
                        className="absolute inset-0"
                        style={{ backgroundColor: keystroke.style.backgroundColor }}
                      />
                    </div>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[260px] p-3 bg-[#1a1a1c] border border-white/10 rounded-xl shadow-xl">
                  <Block
                    color={keystroke.style.backgroundColor === 'transparent' ? '#000000' : keystroke.style.backgroundColor}
                    colors={colorPalette}
                    onChange={(color) => {
                      handleStyleUpdate({ backgroundColor: color.hex });
                    }}
                    style={{
                      borderRadius: '8px',
                    }}
                  />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full mt-2 text-xs h-7 hover:bg-white/5 text-slate-400"
                    onClick={() => {
                      handleStyleUpdate({ backgroundColor: 'transparent' });
                    }}
                  >
                    Clear Background
                  </Button>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-200 mb-2 block">Modifier</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full h-9 justify-start gap-2 bg-white/5 border-white/10 hover:bg-white/10 px-2"
                  >
                    <div 
                      className="w-4 h-4 rounded-full border border-white/20" 
                      style={{ backgroundColor: keystroke.style.modifierColor }}
                    />
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[260px] p-3 bg-[#1a1a1c] border border-white/10 rounded-xl shadow-xl">
                  <Block
                    color={keystroke.style.modifierColor}
                    colors={colorPalette}
                    onChange={(color) => {
                      handleStyleUpdate({ modifierColor: color.hex });
                    }}
                    style={{
                      borderRadius: '8px',
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Border Radius */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-200">Border Radius</label>
              <span className="text-[10px] text-slate-400">{keystroke.style.borderRadius}px</span>
            </div>
            <Slider
              value={[keystroke.style.borderRadius]}
              onValueChange={([value]) => handleStyleUpdate({ borderRadius: value })}
              min={0}
              max={16}
              step={1}
              className="w-full"
            />
          </div>

          {/* Position Preset */}
          <div>
            <label className="text-xs font-medium text-slate-200 mb-2 block">Position</label>
            <div className="grid grid-cols-3 gap-2">
              {POSITION_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handlePositionUpdate(preset.value)}
                  className={cn(
                    "h-8 rounded-lg border flex items-center justify-center transition-all text-[10px] font-medium",
                    keystroke.positionPreset === preset.value
                      ? "bg-[#34B27B] border-[#34B27B] text-white"
                      : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:border-white/20"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Animation Settings */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-slate-200 block">Animation</label>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">Animation In</label>
                <Select 
                  value={keystroke.style.animationIn} 
                  onValueChange={(value: AnimationPreset) => handleStyleUpdate({ animationIn: value })}
                >
                  <SelectTrigger className="w-full bg-white/5 border-white/10 text-slate-200 h-9 text-xs">
                    <SelectValue placeholder="Select animation" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1c] border-white/10 text-slate-200">
                    {ANIMATION_PRESETS.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">Animation Out</label>
                <Select 
                  value={keystroke.style.animationOut} 
                  onValueChange={(value: AnimationPreset) => handleStyleUpdate({ animationOut: value })}
                >
                  <SelectTrigger className="w-full bg-white/5 border-white/10 text-slate-200 h-9 text-xs">
                    <SelectValue placeholder="Select animation" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1c] border-white/10 text-slate-200">
                    {ANIMATION_PRESETS.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Timing Settings */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-slate-200 block">Timing</label>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-slate-400">Fade Duration</span>
                <span className="text-[10px] text-slate-400">{keystroke.style.fadeDurationMs}ms</span>
              </div>
              <Slider
                value={[keystroke.style.fadeDurationMs]}
                onValueChange={([value]) => handleStyleUpdate({ fadeDurationMs: value })}
                min={0}
                max={1000}
                step={50}
                className="w-full"
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-slate-400">Linger Duration</span>
                <span className="text-[10px] text-slate-400">{keystroke.style.lingerDurationMs}ms</span>
              </div>
              <Slider
                value={[keystroke.style.lingerDurationMs]}
                onValueChange={([value]) => handleStyleUpdate({ lingerDurationMs: value })}
                min={500}
                max={5000}
                step={100}
                className="w-full"
              />
            </div>
          </div>

          {/* Hotkey Filter Toggle */}
          <div className="flex items-center justify-between py-2">
            <div>
              <label className="text-xs font-medium text-slate-200 block">Show Only Hotkeys</label>
              <span className="text-[10px] text-slate-400">Filter to show only shortcuts (Ctrl+C, Alt+Tab, etc.)</span>
            </div>
            <Switch
              checked={keystroke.style.showOnlyHotkeys}
              onCheckedChange={(checked) => handleStyleUpdate({ showOnlyHotkeys: checked })}
            />
          </div>

          {/* Apply to All Toggle */}
          <div className="flex items-center justify-between py-2">
            <div>
              <label className="text-xs font-medium text-slate-200 block">Apply to All</label>
              <span className="text-[10px] text-slate-400">Apply changes to all keystroke overlays</span>
            </div>
            <Switch
              checked={applyToAll}
              onCheckedChange={setApplyToAll}
            />
          </div>
        </div>

        <Button
          onClick={onDelete}
          variant="destructive"
          size="sm"
          className="w-full gap-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30 transition-all mt-6"
        >
          <Trash2 className="w-4 h-4" />
          Delete Keystroke
        </Button>
      </div>
    </div>
  );
}
