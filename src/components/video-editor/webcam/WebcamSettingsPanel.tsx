import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import type { WebcamOverlaySettings, WebcamPositionPreset, WebcamShape } from '../types';

interface WebcamSettingsPanelProps {
  settings: WebcamOverlaySettings;
  onChange: (next: WebcamOverlaySettings) => void;
}

const POSITION_PRESETS: Array<{ value: Exclude<WebcamPositionPreset, 'custom'>; label: string }> = [
  { value: 'top-left', label: 'Top-Left' },
  { value: 'top-right', label: 'Top-Right' },
  { value: 'bottom-left', label: 'Bottom-Left' },
  { value: 'bottom-right', label: 'Bottom-Right' },
];

const SHAPES: WebcamShape[] = ['rounded', 'circle', 'square'];

export function WebcamSettingsPanel({ settings, onChange }: WebcamSettingsPanelProps) {
  const handlePositionChange = (position: Exclude<WebcamPositionPreset, 'custom'>) => {
    onChange({
      ...settings,
      position,
      customPosition: undefined,
    });
  };

  const handleShapeChange = (shape: WebcamShape) => {
    onChange({
      ...settings,
      shape,
    });
  };

  const handleShadowChange = (value: number[]) => {
    onChange({
      ...settings,
      shadowIntensity: value[0],
    });
  };

  const handleSizeChange = (value: number[]) => {
    onChange({
      ...settings,
      sizePercent: value[0],
    });
  };

  return (
    <div className="flex-[2] min-w-0 bg-[#09090b] border border-white/5 rounded-2xl flex flex-col shadow-xl h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        <div className="mb-6 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-200">Webcam</span>
          <span className="text-[10px] uppercase tracking-wider font-medium text-[#34B27B] bg-[#34B27B]/10 px-2 py-1 rounded-full">
            Active
          </span>
        </div>

        <div className="space-y-6">
          <div>
            <label className="text-xs font-medium text-slate-200 mb-3 block">Position</label>
            <div className="grid grid-cols-2 gap-2">
              {POSITION_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  type="button"
                  variant="outline"
                  onClick={() => handlePositionChange(preset.value)}
                  className={cn(
                    'h-9 border text-xs font-medium transition-all duration-200',
                    settings.position === preset.value
                      ? 'bg-[#34B27B] border-[#34B27B] text-white shadow-lg shadow-[#34B27B]/20'
                      : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200 hover:border-white/10',
                  )}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-200 mb-3 block">Shape</label>
            <div className="grid grid-cols-3 gap-2">
              {SHAPES.map((shape) => (
                <Button
                  key={shape}
                  type="button"
                  variant="outline"
                  onClick={() => handleShapeChange(shape)}
                  className={cn(
                    'h-9 border text-xs font-medium capitalize transition-all duration-200',
                    settings.shape === shape
                      ? 'bg-[#34B27B] border-[#34B27B] text-white shadow-lg shadow-[#34B27B]/20'
                      : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200 hover:border-white/10',
                  )}
                >
                  {shape}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <label htmlFor="webcam-shadow" className="text-[10px] font-medium text-slate-300">Shadow Intensity</label>
                <span className="text-[10px] text-slate-500 font-mono">{Math.round(settings.shadowIntensity)}%</span>
              </div>
              <Slider
                id="webcam-shadow"
                value={[settings.shadowIntensity]}
                min={0}
                max={100}
                step={1}
                onValueChange={handleShadowChange}
                className="w-full [&_[role=slider]]:bg-[#34B27B] [&_[role=slider]]:border-[#34B27B] [&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
              />
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <label htmlFor="webcam-size" className="text-[10px] font-medium text-slate-300">Size</label>
                <span className="text-[10px] text-slate-500 font-mono">{Math.round(settings.sizePercent)}%</span>
              </div>
              <Slider
                id="webcam-size"
                value={[settings.sizePercent]}
                min={10}
                max={40}
                step={1}
                onValueChange={handleSizeChange}
                className="w-full [&_[role=slider]]:bg-[#34B27B] [&_[role=slider]]:border-[#34B27B] [&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
