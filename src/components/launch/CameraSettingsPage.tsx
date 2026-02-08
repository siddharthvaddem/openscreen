import { useEffect, useCallback, useState, useRef } from "react";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  getCameraSettings,
  setCameraSettings,
  RESOLUTION_OPTIONS,
  type CameraResolution,
} from "../../stores/cameraSettings";
import { cn } from "@/lib/utils";
import { BsCameraVideo } from "react-icons/bs";
import { FaCheck } from "react-icons/fa";
import { X } from "lucide-react";
import { useCamera } from "../../hooks/useCamera";

/**
 * Standalone Camera Settings Page
 * Rendered in a separate Electron child window
 */
export function CameraSettingsPage() {
  const [settings, setSettings] = useState(() => getCameraSettings());

  const {
    devices,
    selectedDeviceId,
    selectDevice,
    stream,
    isEnabled,
    enable,
    disable,
    error,
    permissionState,
  } = useCamera({
    resolution: settings.resolution,
  });

  // Track user's intended enabled state (separate from hook's isEnabled which changes on cleanup)
  const userEnabledRef = useRef<boolean>(settings.enabled);

  useEffect(() => {
    if (isEnabled) {
      userEnabledRef.current = true;
    }
  }, [isEnabled]);

  // Restore camera state on mount
  useEffect(() => {
    const saved = getCameraSettings();
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

  // Persist device selection
  useEffect(() => {
    if (selectedDeviceId) {
      setCameraSettings({ deviceId: selectedDeviceId });
    }
  }, [selectedDeviceId]);

  // Save all settings before window closes
  useEffect(() => {
    const handleBeforeUnload = () => {
      setCameraSettings({
        deviceId: selectedDeviceId,
        enabled: userEnabledRef.current,
        resolution: settings.resolution,
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [selectedDeviceId, settings]);

  // Video preview ref
  const videoRef = useRef<HTMLVideoElement>(null);

  // Attach stream to video element for preview
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handleDeviceSelect = useCallback(async (deviceId: string) => {
    await selectDevice(deviceId);
    userEnabledRef.current = true;
    setCameraSettings({ deviceId, enabled: true });
  }, [selectDevice]);

  const handleToggle = useCallback(() => {
    if (isEnabled) {
      disable();
      userEnabledRef.current = false;
      setCameraSettings({ enabled: false });
    } else {
      enable().catch(console.error);
      userEnabledRef.current = true;
      setCameraSettings({ enabled: true });
    }
  }, [isEnabled, enable, disable]);

  const handleResolutionChange = (value: CameraResolution) => {
    setSettings(prev => ({ ...prev, resolution: value }));
    setCameraSettings({ resolution: value });
  };

  const handleClose = useCallback(() => {
    setCameraSettings({
      deviceId: selectedDeviceId,
      enabled: userEnabledRef.current,
      resolution: settings.resolution,
    });

    setTimeout(() => {
      window.close();
    }, 50);
  }, [selectedDeviceId, settings]);

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
          <BsCameraVideo size={14} className="text-white/70" />
          Camera Settings
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
        {/* Camera Preview */}
        {isEnabled && stream && (
          <div className="px-4 pt-3 pb-2">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full rounded-lg bg-zinc-900 object-cover"
              style={{ aspectRatio: '16/9', transform: 'scaleX(-1)' }}
            />
          </div>
        )}

        {/* Device List */}
        <div className="px-2 py-2">
          <div className="px-2 pb-1.5">
            <span className="text-xs text-zinc-500 uppercase tracking-wide">Select Camera</span>
          </div>
          <div className="max-h-28 overflow-y-auto">
            {devices.length === 0 ? (
              <div className="px-2 py-3 text-center text-zinc-400 text-xs">
                No cameras found
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
                    {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Enable/Disable Toggle */}
        <div className="px-4 py-3 border-t border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300">Enable Camera</span>
            <Switch
              checked={isEnabled}
              onCheckedChange={handleToggle}
              className="data-[state=checked]:bg-emerald-500 h-5 w-9"
            />
          </div>
        </div>

        {/* Resolution */}
        <div className="px-4 py-3 border-t border-white/10">
          <div className="pb-2">
            <span className="text-xs text-zinc-500 uppercase tracking-wide">Quality</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300">Resolution</span>
            <Select
              value={settings.resolution}
              onValueChange={(v) => handleResolutionChange(v as CameraResolution)}
            >
              <SelectTrigger className="w-32 h-8 text-xs bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESOLUTION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              Camera access denied. Please enable in system settings.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
