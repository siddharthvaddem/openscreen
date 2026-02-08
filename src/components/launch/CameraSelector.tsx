import { useEffect, useCallback, useState } from "react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { BsCameraVideo, BsCameraVideoOff } from "react-icons/bs";
import styles from "./LaunchWindow.module.css";

// ============================================
// Types
// ============================================

interface CameraSelectorProps {
  disabled?: boolean;
  className?: string;
  isEnabled: boolean;
  permissionState: 'granted' | 'denied' | 'prompt' | 'unknown';
  error: Error | null;
  devices: MediaDeviceInfo[];
}

// ============================================
// Component
// ============================================

export function CameraSelector({
  disabled = false,
  className,
  isEnabled,
  permissionState,
  error,
  devices,
}: CameraSelectorProps) {
  const [settingsWindowOpen, setSettingsWindowOpen] = useState(false);

  useEffect(() => {
    return () => {
      setSettingsWindowOpen(false);
    };
  }, []);

  const openCamSettings = useCallback(() => {
    if (settingsWindowOpen) return;

    const baseUrl = window.location.origin + window.location.pathname;
    const settingsUrl = `${baseUrl}?windowType=cam-settings`;

    const childWindow = window.open(
      settingsUrl,
      'cam-settings',
      'width=340,height=480'
    );

    if (childWindow) {
      setSettingsWindowOpen(true);

      const checkClosed = setInterval(() => {
        if (childWindow.closed) {
          clearInterval(checkClosed);
          setSettingsWindowOpen(false);
        }
      }, 500);
    }
  }, [settingsWindowOpen]);

  const hasDevices = devices.length > 0;
  const noCameraDetected = !hasDevices || permissionState === 'denied';

  const getIcon = () => {
    if (noCameraDetected || !isEnabled) {
      return (
        <BsCameraVideoOff
          size={14}
          className={permissionState === 'denied' ? "text-red-400/50" : "text-zinc-400"}
        />
      );
    }
    return <BsCameraVideo size={14} className="text-green-400" />;
  };

  const getTooltip = () => {
    if (permissionState === 'denied') {
      return "Camera permission denied";
    }
    if (!hasDevices) {
      return "No camera detected";
    }
    if (error) {
      return error.message;
    }
    return isEnabled ? "Camera enabled — Click to configure" : "Camera disabled — Click to configure";
  };

  return (
    <Button
      variant="link"
      size="sm"
      className={cn(
        "gap-1.5 text-white bg-transparent hover:bg-transparent px-0 text-xs",
        styles.electronNoDrag,
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      disabled={disabled}
      title={getTooltip()}
      onClick={openCamSettings}
    >
      {getIcon()}
      <span className={cn(
        !isEnabled && "text-zinc-400"
      )}>
        Cam
      </span>
    </Button>
  );
}
