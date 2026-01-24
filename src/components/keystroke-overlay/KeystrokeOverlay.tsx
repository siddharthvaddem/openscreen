// src/components/keystroke-overlay/KeystrokeOverlay.tsx

import { useState, useEffect, useCallback, useRef } from 'react';
import type { DisplayEntry } from '../../types/keystrokeEvents';
import { DEFAULT_KEYSTROKE_SETTINGS } from '../../types/keystrokeSettings';
import { formatKeystroke, formatMouseAction } from '../../utils/keyNameMapping';
import styles from './KeystrokeOverlay.module.css';

// Use global types from electron-env.d.ts for IPC compatibility
type KeystrokeSettingsType = KeystrokeSettings;
type InputEventType = KeystrokeOrMouseEvent;

/**
 * Generate a unique ID for display entries
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * KeystrokeOverlay Component
 * 
 * Displays keyboard keystrokes and mouse actions with fade animations.
 * This component runs in a transparent, click-through overlay window.
 * 
 * Requirements:
 * - 3.1: Display key name when pressed
 * - 4.1: Display mouse clicks
 * - 5.1, 5.2, 5.3: Fade animation after delay
 * - 5.4: Multiple entries visible simultaneously
 */
export function KeystrokeOverlay() {
  const [entries, setEntries] = useState<DisplayEntry[]>([]);
  const [settings, setSettings] = useState<KeystrokeSettingsType>(DEFAULT_KEYSTROKE_SETTINGS);
  const lastEventRef = useRef<{ timestamp: number; text: string } | null>(null);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      if (window.electronAPI?.keystroke) {
        try {
          const loadedSettings = await window.electronAPI.keystroke.getSettings();
          if (loadedSettings) {
            setSettings(loadedSettings);
          }
        } catch (error) {
          console.error('Failed to load keystroke settings:', error);
        }
      }
    };
    loadSettings();
  }, []);

  /**
   * Create a display entry from an input event
   */
  const createDisplayEntry = useCallback((event: InputEventType): DisplayEntry => {
    const text = event.type === 'keystroke' 
      ? formatKeystroke(event as any)
      : formatMouseAction(event as any);

    return {
      id: generateId(),
      text,
      type: event.type,
      timestamp: event.timestamp,
      fadeStartTime: event.timestamp + settings.fadeDelayMs,
    };
  }, [settings.fadeDelayMs]);

  /**
   * Handle incoming input events
   * Groups rapid keystrokes within groupingThresholdMs
   */
  const handleInputEvent = useCallback((event: InputEventType) => {
    // Skip mouse events if disabled
    if (event.type === 'mouse' && !settings.showMouseClicks) {
      return;
    }

    const newEntry = createDisplayEntry(event);
    const now = Date.now();

    setEntries(prevEntries => {
      // Check for rapid keystroke grouping (only for keystrokes)
      if (event.type === 'keystroke' && lastEventRef.current) {
        const timeDiff = event.timestamp - lastEventRef.current.timestamp;
        
        if (timeDiff <= settings.groupingThresholdMs && prevEntries.length > 0) {
          // Group with the last entry
          const lastEntry = prevEntries[prevEntries.length - 1];
          if (lastEntry.type === 'keystroke') {
            const updatedEntry: DisplayEntry = {
              ...lastEntry,
              text: lastEntry.text + ' ' + newEntry.text,
              fadeStartTime: now + settings.fadeDelayMs,
            };
            
            lastEventRef.current = { timestamp: event.timestamp, text: newEntry.text };
            return [...prevEntries.slice(0, -1), updatedEntry];
          }
        }
      }

      lastEventRef.current = { timestamp: event.timestamp, text: newEntry.text };
      return [...prevEntries, newEntry];
    });
  }, [createDisplayEntry, settings.groupingThresholdMs, settings.showMouseClicks, settings.fadeDelayMs]);

  // Subscribe to keystroke events
  useEffect(() => {
    if (!window.electronAPI?.keystroke?.onEvent) {
      return;
    }

    const unsubscribe = window.electronAPI.keystroke.onEvent(handleInputEvent);
    return () => {
      unsubscribe();
    };
  }, [handleInputEvent]);

  // Cleanup expired entries
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setEntries(prevEntries => 
        prevEntries.filter(entry => {
          const expiryTime = entry.fadeStartTime + settings.fadeDurationMs;
          return now < expiryTime;
        })
      );
    }, 100); // Check every 100ms

    return () => clearInterval(interval);
  }, [settings.fadeDurationMs]);

  /**
   * Calculate opacity for an entry based on fade timing
   */
  const getEntryOpacity = (entry: DisplayEntry): number => {
    const now = Date.now();
    
    if (now < entry.fadeStartTime) {
      return 1; // Full opacity before fade starts
    }
    
    const fadeProgress = (now - entry.fadeStartTime) / settings.fadeDurationMs;
    return Math.max(0, 1 - fadeProgress);
  };

  return (
    <div 
      className={styles.overlay}
      style={{ 
        '--text-scale': settings.textScale,
      } as React.CSSProperties}
    >
      <div className={styles.entriesContainer}>
        {entries.map(entry => (
          <div
            key={entry.id}
            className={`${styles.entry} ${entry.type === 'mouse' ? styles.mouseEntry : styles.keystrokeEntry}`}
            style={{ opacity: getEntryOpacity(entry) }}
          >
            {entry.text}
          </div>
        ))}
      </div>
    </div>
  );
}

export default KeystrokeOverlay;
