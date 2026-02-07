import { useEffect, useCallback, useState } from "react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";
import styles from "./LaunchWindow.module.css";

// ============================================
// Types
// ============================================

interface MicrophoneSelectorProps {
  /** Disable the selector (e.g., during recording) */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
  /** Whether microphone is currently enabled */
  isEnabled: boolean;
  /** Current permission state */
  permissionState: 'granted' | 'denied' | 'prompt' | 'unknown';
  /** Current error, if any */
  error: Error | null;
  /** List of available audio input devices */
  devices: MediaDeviceInfo[];
}

// ============================================
// Component
// ============================================

export function MicrophoneSelector({
  disabled = false,
  className,
  isEnabled,
  permissionState,
  error,
  devices,
}: MicrophoneSelectorProps) {
  const [settingsWindowOpen, setSettingsWindowOpen] = useState(false);
  
  // Track child window
  useEffect(() => {
    // Close tracking when component unmounts
    return () => {
      setSettingsWindowOpen(false);
    };
  }, []);

  // Open microphone settings window
  const openMicSettings = useCallback(() => {
    if (settingsWindowOpen) return;
    
    // Get the base URL for the settings window
    const baseUrl = window.location.origin + window.location.pathname;
    const settingsUrl = `${baseUrl}?windowType=mic-settings`;
    
    // Open child window
    const childWindow = window.open(
      settingsUrl,
      'mic-settings',
      'width=340,height=520'
    );
    
    if (childWindow) {
      setSettingsWindowOpen(true);
      
      // Track when window closes
      const checkClosed = setInterval(() => {
        if (childWindow.closed) {
          clearInterval(checkClosed);
          setSettingsWindowOpen(false);
        }
      }, 500);
    }
  }, [settingsWindowOpen]);

  // Determine icon and state
  const hasDevices = devices.length > 0;
  const noMicrophoneDetected = !hasDevices || permissionState === 'denied';
  
  // Get icon based on state
  const getIcon = () => {
    if (noMicrophoneDetected || !isEnabled) {
      return <FaMicrophoneSlash size={14} className="text-zinc-400" />;
    }
    return <FaMicrophone size={14} className="text-white" />;
  };

  // Get tooltip text
  const getTooltip = () => {
    if (permissionState === 'denied') {
      return "Microphone permission denied";
    }
    if (!hasDevices) {
      return "No microphone detected";
    }
    if (error) {
      return error.message;
    }
    return isEnabled ? "Microphone enabled - Click to configure" : "Microphone disabled - Click to configure";
  };

  return (
    <Button
      variant="link"
      size="sm"
      className={cn(
        "gap-1 text-white bg-transparent hover:bg-transparent px-0 text-xs",
        styles.electronNoDrag,
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      disabled={disabled}
      title={getTooltip()}
      onClick={openMicSettings}
    >
      {getIcon()}
      <span className={cn(
        !isEnabled && "text-zinc-400"
      )}>
        Mic
      </span>
    </Button>
  );
}

export default MicrophoneSelector;
