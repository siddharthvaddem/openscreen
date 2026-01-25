// src/components/keystroke-overlay/KeystrokeOverlay.tsx

import { useState, useEffect, useCallback, useRef } from 'react';
import type { KeystrokeEvent, MouseActionEvent } from '../../types/keystrokeEvents';
import { DEFAULT_KEYSTROKE_SETTINGS } from '../../types/keystrokeSettings';
import { parseKeystrokeToKeys, parseMouseActionToKeys, type ParsedKey } from '../../utils/keyNameMapping';
import { KeyCapGroup } from './KeyCapGroup';
import styles from './KeystrokeOverlay.module.css';

// Use global types from electron-env.d.ts for IPC compatibility
type KeystrokeSettingsType = KeystrokeSettings;
type InputEventType = KeystrokeOrMouseEvent;

/**
 * Extended DisplayEntry that stores ParsedKey[] for keyviz-style rendering
 * instead of just text string
 */
interface KeyCapDisplayEntry {
  id: string;
  keys: ParsedKey[];
  type: 'keystroke' | 'mouse';
  timestamp: number;
  fadeStartTime: number;
}

/**
 * Generate a unique ID for display entries
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * KeystrokeOverlay Component
 * 
 * Displays keyboard keystrokes and mouse actions with fade animations.
 * This component runs in a transparent, click-through overlay window.
 * Uses keyviz-style KeyCapGroup for visual display.
 * 
 * Requirements:
 * - 1.1: Render each key as a separate KeyCap element
 * - 1.2: Display each key as a distinct KeyCap arranged horizontally
 * - 6.1: Apply textScale setting to all KeyCap dimensions
 * - 6.2: Respect fadeDelayMs setting for when fade animation begins
 * - 6.3: Respect fadeDurationMs setting for fade animation duration
 */
export function KeystrokeOverlay() {
  const [entries, setEntries] = useState<KeyCapDisplayEntry[]>([]);
  const [settings, setSettings] = useState<KeystrokeSettingsType>(DEFAULT_KEYSTROKE_SETTINGS);
  const lastEventRef = useRef<{ timestamp: number; keys: ParsedKey[] } | null>(null);

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
   * Parses keystroke/mouse events into ParsedKey arrays for keyviz-style display
   */
  const createDisplayEntry = useCallback((event: InputEventType): KeyCapDisplayEntry => {
    const keys = event.type === 'keystroke' 
      ? parseKeystrokeToKeys(event as KeystrokeEvent)
      : parseMouseActionToKeys(event as MouseActionEvent);

    return {
      id: generateId(),
      keys,
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
            // Combine keys arrays for grouped keystrokes
            const updatedEntry: KeyCapDisplayEntry = {
              ...lastEntry,
              keys: [...lastEntry.keys, ...newEntry.keys],
              fadeStartTime: now + settings.fadeDelayMs,
            };
            
            lastEventRef.current = { timestamp: event.timestamp, keys: newEntry.keys };
            return [...prevEntries.slice(0, -1), updatedEntry];
          }
        }
      }

      lastEventRef.current = { timestamp: event.timestamp, keys: newEntry.keys };
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
   * Requirements: 6.2, 6.3
   */
  const getEntryOpacity = (entry: KeyCapDisplayEntry): number => {
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
            <KeyCapGroup keys={entry.keys} textScale={settings.textScale} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default KeystrokeOverlay;
