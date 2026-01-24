import { Button } from "@/components/ui/button";
import { Trash2, Bold, AlignLeft, AlignCenter, AlignRight, ChevronDown } from "lucide-react";
import Block from '@uiw/react-color-block';
import type { SubtitleRegion, SubtitleStyle, SubtitlePositionPreset } from "../types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface SubtitleSettingsPanelProps {
  subtitle: SubtitleRegion;
  onContentChange: (text: string) => void;
  onStyleChange: (style: Partial<SubtitleStyle>) => void;
  onPositionChange: (position: SubtitlePositionPreset, customPosition?: { x: number; y: number }) => void;
  onDelete: () => void;
}

const FONT_FAMILIES = [
  { value: 'system-ui, -apple-system, sans-serif', label: 'Classic' },
  { value: 'Georgia, serif', label: 'Editor' },
  { value: 'Impact, Arial Black, sans-serif', label: 'Strong' },
  { value: 'Courier New, monospace', label: 'Typewriter' },
  { value: 'Brush Script MT, cursive', label: 'Deco' },
  { value: 'Arial, sans-serif', label: 'Simple' },
  { value: 'Verdana, sans-serif', label: 'Modern' },
  { value: 'Trebuchet MS, sans-serif', label: 'Clean' },
];

const FONT_SIZES = [16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64];

const POSITION_PRESETS: { value: SubtitlePositionPreset; label: string }[] = [
  { value: 'bottom-center', label: 'Bottom' },
  { value: 'top-center', label: 'Top' },
  { value: 'middle-center', label: 'Middle' },
  { value: 'custom', label: 'Custom' },
];

export function SubtitleSettingsPanel({
  subtitle,
  onContentChange,
  onStyleChange,
  onPositionChange,
  onDelete,
}: SubtitleSettingsPanelProps) {
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
          <span className="text-sm font-medium text-slate-200">Subtitle Settings</span>
          <span className="text-[10px] uppercase tracking-wider font-medium text-[#34B27B] bg-[#34B27B]/10 px-2 py-1 rounded-full">
            Active
          </span>
        </div>
        
        {/* Text Content */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-200 mb-2 block">Text Content</label>
            <textarea
              value={subtitle.text}
              onChange={(e) => onContentChange(e.target.value)}
              placeholder="Enter subtitle text..."
              rows={3}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-200 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#34B27B] focus:border-transparent resize-none"
            />
          </div>

          {/* Font Family & Size */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-slate-200 mb-2 block">Font Style</label>
              <Select 
                value={subtitle.style.fontFamily} 
                onValueChange={(value) => onStyleChange({ fontFamily: value })}
              >
                <SelectTrigger className="w-full bg-white/5 border-white/10 text-slate-200 h-9 text-xs">
                  <SelectValue placeholder="Select style" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1c] border-white/10 text-slate-200">
                  {FONT_FAMILIES.map((font) => (
                    <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                      {font.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-200 mb-2 block">Size</label>
              <Select 
                value={subtitle.style.fontSize.toString()} 
                onValueChange={(value) => onStyleChange({ fontSize: parseInt(value) })}
              >
                <SelectTrigger className="w-full bg-white/5 border-white/10 text-slate-200 h-9 text-xs">
                  <SelectValue placeholder="Size" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1c] border-white/10 text-slate-200 max-h-[200px]">
                  {FONT_SIZES.map((size) => (
                    <SelectItem key={size} value={size.toString()}>
                      {size}px
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Formatting Toggles */}
          <div className="flex items-center justify-between gap-2">
            <ToggleGroup type="multiple" className="justify-start bg-white/5 p-1 rounded-lg border border-white/5">
              <ToggleGroupItem 
                value="bold" 
                aria-label="Toggle bold"
                data-state={subtitle.style.fontWeight === 'bold' ? 'on' : 'off'}
                onClick={() => onStyleChange({ fontWeight: subtitle.style.fontWeight === 'bold' ? 'normal' : 'bold' })}
                className="h-8 w-8 data-[state=on]:bg-[#34B27B] data-[state=on]:text-white text-slate-400 hover:bg-white/5 hover:text-slate-200"
              >
                <Bold className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>

            <ToggleGroup type="single" value={subtitle.style.textAlign} className="justify-start bg-white/5 p-1 rounded-lg border border-white/5">
              <ToggleGroupItem 
                value="left" 
                aria-label="Align left"
                onClick={() => onStyleChange({ textAlign: 'left' })}
                className="h-8 w-8 data-[state=on]:bg-[#34B27B] data-[state=on]:text-white text-slate-400 hover:bg-white/5 hover:text-slate-200"
              >
                <AlignLeft className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="center" 
                aria-label="Align center"
                onClick={() => onStyleChange({ textAlign: 'center' })}
                className="h-8 w-8 data-[state=on]:bg-[#34B27B] data-[state=on]:text-white text-slate-400 hover:bg-white/5 hover:text-slate-200"
              >
                <AlignCenter className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="right" 
                aria-label="Align right"
                onClick={() => onStyleChange({ textAlign: 'right' })}
                className="h-8 w-8 data-[state=on]:bg-[#34B27B] data-[state=on]:text-white text-slate-400 hover:bg-white/5 hover:text-slate-200"
              >
                <AlignRight className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-200 mb-2 block">Text Color</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full h-9 justify-start gap-2 bg-white/5 border-white/10 hover:bg-white/10 px-2"
                  >
                    <div 
                      className="w-4 h-4 rounded-full border border-white/20" 
                      style={{ backgroundColor: subtitle.style.color }}
                    />
                    <span className="text-xs text-slate-300 truncate flex-1 text-left">
                      {subtitle.style.color}
                    </span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[260px] p-3 bg-[#1a1a1c] border border-white/10 rounded-xl shadow-xl">
                  <Block
                    color={subtitle.style.color}
                    colors={colorPalette}
                    onChange={(color) => {
                      onStyleChange({ color: color.hex });
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
                        style={{ backgroundColor: subtitle.style.backgroundColor }}
                      />
                    </div>
                    <span className="text-xs text-slate-300 truncate flex-1 text-left">
                      {subtitle.style.backgroundColor === 'transparent' ? 'None' : 'Color'}
                    </span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[260px] p-3 bg-[#1a1a1c] border border-white/10 rounded-xl shadow-xl">
                  <Block
                    color={subtitle.style.backgroundColor === 'transparent' ? '#000000' : subtitle.style.backgroundColor}
                    colors={colorPalette}
                    onChange={(color) => {
                      onStyleChange({ backgroundColor: color.hex });
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
                      onStyleChange({ backgroundColor: 'transparent' });
                    }}
                  >
                    Clear Background
                  </Button>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Position Presets */}
          <div>
            <label className="text-xs font-medium text-slate-200 mb-2 block">Position</label>
            <div className="grid grid-cols-4 gap-2">
              {POSITION_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => onPositionChange(preset.value)}
                  className={cn(
                    "h-8 rounded-lg border flex items-center justify-center transition-all text-xs font-medium",
                    subtitle.positionPreset === preset.value
                      ? "bg-[#34B27B] border-[#34B27B] text-white"
                      : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:border-white/20"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {subtitle.positionPreset === 'custom' && (
              <p className="text-[10px] text-slate-500 mt-2">
                Drag the subtitle on the preview to position it.
              </p>
            )}
          </div>

          {/* Outline Section */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-slate-200 block">Text Outline</label>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-slate-400">Width</span>
                <span className="text-[10px] text-slate-400">{subtitle.style.strokeWidth}px</span>
              </div>
              <Slider
                value={[subtitle.style.strokeWidth]}
                onValueChange={([value]) => onStyleChange({ strokeWidth: value })}
                min={0}
                max={4}
                step={1}
                className="w-full"
              />
            </div>
            {subtitle.style.strokeWidth > 0 && (
              <div>
                <label className="text-xs font-medium text-slate-200 mb-2 block">Outline Color</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full h-9 justify-start gap-2 bg-white/5 border-white/10 hover:bg-white/10 px-2"
                    >
                      <div 
                        className="w-4 h-4 rounded-full border border-white/20" 
                        style={{ backgroundColor: subtitle.style.strokeColor }}
                      />
                      <span className="text-xs text-slate-300 truncate flex-1 text-left">
                        {subtitle.style.strokeColor}
                      </span>
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[260px] p-3 bg-[#1a1a1c] border border-white/10 rounded-xl shadow-xl">
                    <Block
                      color={subtitle.style.strokeColor}
                      colors={colorPalette}
                      onChange={(color) => {
                        onStyleChange({ strokeColor: color.hex });
                      }}
                      style={{
                        borderRadius: '8px',
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        </div>

        <Button
          onClick={onDelete}
          variant="destructive"
          size="sm"
          className="w-full gap-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30 transition-all mt-6"
        >
          <Trash2 className="w-4 h-4" />
          Delete Subtitle
        </Button>
      </div>
    </div>
  );
}
