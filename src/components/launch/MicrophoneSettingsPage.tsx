import { useEffect, useCallback, useState } from "react";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../ui/select";
import { 
  getAudioSettings, 
  setAudioSettings,
  SAMPLE_RATE_OPTIONS,
  CHANNEL_COUNT_OPTIONS,
  type SampleRate,
  type ChannelCount,
} from "../../stores/audioSettings";
import { cn } from "@/lib/utils";
import { FaMicrophone, FaCheck } from "react-icons/fa";
import { X } from "lucide-react";
import { useMicrophone } from "../../hooks/useMicrophone";

/**
 * Standalone Microphone Settings Page
 * Rendered in a separate Electron child window
 */
export function MicrophoneSettingsPage() {
  // Load initial settings from localStorage into state
  const [settings, setSettings] = useState(() => getAudioSettings());
  
  // Use microphone hook with current settings
  const {
    devices,
    selectedDeviceId,
    selectDevice,
    audioLevel,
    isEnabled,
    enable,
    disable,
    error,
    permissionState,
  } = useMicrophone({
    sampleRate: settings.sampleRate,
    channelCount: settings.channelCount,
    noiseSuppression: settings.noiseSuppression,
    echoCancellation: settings.echoCancellation,
    autoGainControl: settings.autoGainControl,
  });

  // Restore microphone state on mount
  useEffect(() => {
    const saved = getAudioSettings();
    if (saved.enabled && saved.deviceId) {
      selectDevice(saved.deviceId).catch(() => {
        if (saved.enabled) {
          enable().catch(console.error);
        }
      });
    } else if (saved.enabled) {
      enable().catch(console.error);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist enabled state and device
  useEffect(() => {
    setAudioSettings({
      deviceId: selectedDeviceId,
      enabled: isEnabled,
    });
  }, [selectedDeviceId, isEnabled]);

  // Save all settings before window closes (handles OS close button, Alt+F4, etc.)
  // The useMicrophone hook's cleanup effect handles stream cleanup on unmount
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Persist all current settings before window closes
      setAudioSettings({
        deviceId: selectedDeviceId,
        enabled: isEnabled,
        sampleRate: settings.sampleRate,
        channelCount: settings.channelCount,
        noiseSuppression: settings.noiseSuppression,
        echoCancellation: settings.echoCancellation,
        autoGainControl: settings.autoGainControl,
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [selectedDeviceId, isEnabled, settings]);

  // Handle device selection
  const handleDeviceSelect = useCallback(async (deviceId: string) => {
    await selectDevice(deviceId);
  }, [selectDevice]);

  // Handle mute toggle
  const handleMuteToggle = useCallback(() => {
    if (isEnabled) {
      disable();
    } else {
      enable().catch(console.error);
    }
  }, [isEnabled, enable, disable]);

  // Settings change handlers - update both state and localStorage
  const handleSampleRateChange = (value: SampleRate) => {
    setSettings(prev => ({ ...prev, sampleRate: value }));
    setAudioSettings({ sampleRate: value });
  };

  const handleChannelCountChange = (value: ChannelCount) => {
    setSettings(prev => ({ ...prev, channelCount: value }));
    setAudioSettings({ channelCount: value });
  };

  const handleNoiseSuppressionChange = (enabled: boolean) => {
    setSettings(prev => ({ ...prev, noiseSuppression: enabled }));
    setAudioSettings({ noiseSuppression: enabled });
  };

  const handleEchoCancellationChange = (enabled: boolean) => {
    setSettings(prev => ({ ...prev, echoCancellation: enabled }));
    setAudioSettings({ echoCancellation: enabled });
  };

  const handleAutoGainControlChange = (enabled: boolean) => {
    setSettings(prev => ({ ...prev, autoGainControl: enabled }));
    setAudioSettings({ autoGainControl: enabled });
  };

  // Close window - save all settings before closing
  const handleClose = useCallback(() => {
    // Explicitly save ALL current settings to localStorage before closing
    setAudioSettings({
      deviceId: selectedDeviceId,
      enabled: isEnabled,
      sampleRate: settings.sampleRate,
      channelCount: settings.channelCount,
      noiseSuppression: settings.noiseSuppression,
      echoCancellation: settings.echoCancellation,
      autoGainControl: settings.autoGainControl,
    });
    
    // Small delay to ensure localStorage write completes
    setTimeout(() => {
      window.close();
    }, 50);
  }, [selectedDeviceId, isEnabled, settings]);

  return (
    <div 
      className="w-full h-full flex flex-col overflow-hidden select-none"
      style={{
        background: 'linear-gradient(135deg, rgba(30,30,40,0.98) 0%, rgba(20,20,30,0.96) 100%)',
        borderRadius: 16,
        border: '1px solid rgba(80,80,120,0.25)',
      }}
    >
      {/* Draggable Header */}
      <div 
        className="px-4 pt-4 pb-3 border-b border-white/10 flex items-center justify-between"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2 text-white text-base font-medium">
          <FaMicrophone size={14} className="text-white/70" />
          Microphone Settings
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-zinc-400 hover:text-white hover:bg-white/10"
          onClick={handleClose}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <X size={14} />
        </Button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Device List */}
        <div className="px-2 py-2">
          <div className="px-2 pb-1.5">
            <span className="text-xs text-zinc-500 uppercase tracking-wide">Select Device</span>
          </div>
          <div className="max-h-28 overflow-y-auto">
            {devices.length === 0 ? (
              <div className="px-2 py-3 text-center text-zinc-400 text-xs">
                No microphones found
              </div>
            ) : (
              devices.map((device) => (
                <button
                  key={device.deviceId}
                  onClick={() => handleDeviceSelect(device.deviceId)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors",
                    "hover:bg-white/5",
                    selectedDeviceId === device.deviceId && "bg-white/10"
                  )}
                >
                  <div className={cn(
                    "flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center",
                    selectedDeviceId === device.deviceId
                      ? "border-emerald-400 bg-emerald-400"
                      : "border-zinc-500"
                  )}>
                    {selectedDeviceId === device.deviceId && (
                      <FaCheck size={8} className="text-zinc-900" />
                    )}
                  </div>
                  <span className={cn(
                    "text-xs truncate flex-1",
                    selectedDeviceId === device.deviceId
                      ? "text-white"
                      : "text-zinc-300"
                  )}>
                    {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Audio Level Meter */}
        {isEnabled && (
          <div className="px-4 py-3 border-t border-white/10">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-zinc-400">Input Level</span>
              <span className="text-xs text-zinc-500">{Math.round(audioLevel)}%</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-75",
                  audioLevel > 80 ? "bg-red-500" : 
                  audioLevel > 50 ? "bg-yellow-500" : 
                  "bg-emerald-400"
                )}
                style={{ width: `${audioLevel}%` }}
              />
            </div>
          </div>
        )}

        {/* Mute Toggle */}
        <div className="px-4 py-3 border-t border-white/10">
          <button
            onClick={handleMuteToggle}
            className="w-full flex items-center gap-2.5 py-1 text-left group"
          >
            <div className={cn(
              "flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
              !isEnabled
                ? "border-zinc-500 bg-zinc-700"
                : "border-zinc-600 bg-transparent"
            )}>
              {!isEnabled && (
                <FaCheck size={8} className="text-zinc-300" />
              )}
            </div>
            <span className="text-xs text-zinc-300 group-hover:text-white transition-colors">
              Mute microphone
            </span>
          </button>
        </div>

        {/* Audio Quality Settings */}
        <div className="px-4 py-3 border-t border-white/10">
          <div className="pb-2">
            <span className="text-xs text-zinc-500 uppercase tracking-wide">Audio Quality</span>
          </div>
          
          <div className="space-y-3">
            {/* Sample Rate */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-300">Sample Rate</span>
              <Select 
                value={String(settings.sampleRate)} 
                onValueChange={(v) => handleSampleRateChange(Number(v) as SampleRate)}
              >
                <SelectTrigger className="w-28 h-8 text-xs bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SAMPLE_RATE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Channel Count */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-300">Channels</span>
              <Select 
                value={String(settings.channelCount)} 
                onValueChange={(v) => handleChannelCountChange(Number(v) as ChannelCount)}
              >
                <SelectTrigger className="w-28 h-8 text-xs bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNEL_COUNT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Processing Settings */}
        <div className="px-4 py-3 border-t border-white/10">
          <div className="pb-2">
            <span className="text-xs text-zinc-500 uppercase tracking-wide">Processing</span>
          </div>
          
          <div className="space-y-3">
            {/* Noise Suppression */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-300">Noise Suppression</span>
              <Switch 
                checked={settings.noiseSuppression} 
                onCheckedChange={handleNoiseSuppressionChange}
                className="data-[state=checked]:bg-emerald-500 h-5 w-9"
              />
            </div>

            {/* Echo Cancellation */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-300">Echo Cancellation</span>
              <Switch 
                checked={settings.echoCancellation} 
                onCheckedChange={handleEchoCancellationChange}
                className="data-[state=checked]:bg-emerald-500 h-5 w-9"
              />
            </div>

            {/* Auto Gain Control */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-300">Auto Gain Control</span>
              <Switch 
                checked={settings.autoGainControl} 
                onCheckedChange={handleAutoGainControlChange}
                className="data-[state=checked]:bg-emerald-500 h-5 w-9"
              />
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="px-4 py-2.5 bg-red-500/10 border-t border-red-500/20">
            <p className="text-xs text-red-400 truncate" title={error.message}>
              {error.message}
            </p>
          </div>
        )}

        {/* Permission Denied Warning */}
        {permissionState === 'denied' && (
          <div className="px-4 py-2.5 bg-amber-500/10 border-t border-amber-500/20">
            <p className="text-xs text-amber-400">
              Microphone access denied. Please enable in system settings.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default MicrophoneSettingsPage;
