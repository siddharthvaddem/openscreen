import { Button } from '@/components/ui/button';
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

  return (
    <div className="flex-[2] min-w-0 bg-[#09090b] border border-white/5 rounded-2xl p-4 flex flex-col shadow-xl h-full overflow-y-auto custom-scrollbar">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-200">Webcam</span>
        <span className="text-[10px] uppercase tracking-wider font-medium text-[#34B27B] bg-[#34B27B]/10 px-2 py-1 rounded-full">
          Active
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-slate-200 mb-2 block">Position</label>
          <div className="grid grid-cols-2 gap-2">
            {POSITION_PRESETS.map((preset) => (
              <Button
                key={preset.value}
                type="button"
                variant="outline"
                onClick={() => handlePositionChange(preset.value)}
                className={cn(
                  'h-8 border text-xs',
                  settings.position === preset.value
                    ? 'bg-[#34B27B] border-[#34B27B] text-white hover:bg-[#34B27B]/90'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10',
                )}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-200 mb-2 block">Shape</label>
          <div className="grid grid-cols-3 gap-2">
            {SHAPES.map((shape) => (
              <Button
                key={shape}
                type="button"
                variant="outline"
                onClick={() => handleShapeChange(shape)}
                className={cn(
                  'h-8 border text-xs capitalize',
                  settings.shape === shape
                    ? 'bg-[#34B27B] border-[#34B27B] text-white hover:bg-[#34B27B]/90'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10',
                )}
              >
                {shape}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="webcam-shadow" className="text-xs font-medium text-slate-200">Shadow Intensity</label>
            <span className="text-xs text-slate-400">{Math.round(settings.shadowIntensity)}%</span>
          </div>
          <input
            id="webcam-shadow"
            type="range"
            min={0}
            max={100}
            step={1}
            value={settings.shadowIntensity}
            onChange={(event) =>
              onChange({
                ...settings,
                shadowIntensity: Number(event.target.value),
              })
            }
            className="w-full accent-[#34B27B]"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="webcam-size" className="text-xs font-medium text-slate-200">Size</label>
            <span className="text-xs text-slate-400">{Math.round(settings.sizePercent)}%</span>
          </div>
          <input
            id="webcam-size"
            type="range"
            min={10}
            max={40}
            step={1}
            value={settings.sizePercent}
            onChange={(event) =>
              onChange({
                ...settings,
                sizePercent: Number(event.target.value),
              })
            }
            className="w-full accent-[#34B27B]"
          />
        </div>
      </div>
    </div>
  );
}
