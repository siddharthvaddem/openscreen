// src/utils/keystrokeFilterUtils.ts

import type { KeystrokeRegion } from '../components/video-editor/types';

/**
 * Determines if a keystroke region represents a hotkey/shortcut.
 * 
 * A hotkey is defined as any keystroke that includes at least one modifier key:
 * - Ctrl
 * - Alt
 * - Shift
 * - Meta (Windows/Command key)
 * 
 * Examples of hotkeys: "Ctrl + C", "Alt + Tab", "Shift + Delete"
 * Examples of non-hotkeys: "A", "Enter", "1", "Left Click"
 * 
 * @param region - The keystroke region to check
 * @returns true if the region represents a hotkey, false otherwise
 */
export function isHotkeyRegion(region: KeystrokeRegion): boolean {
  const text = region.text.toLowerCase();
  
  // Check for modifier keys in the text
  // These are formatted as "Ctrl + C", "Alt + Tab", etc.
  const hasCtrl = text.includes('ctrl');
  const hasAlt = text.includes('alt');
  const hasShift = text.includes('shift');
  const hasMeta = text.includes('meta') || text.includes('cmd') || text.includes('command');
  
  return hasCtrl || hasAlt || hasShift || hasMeta;
}

/**
 * Filters keystroke regions based on the showOnlyHotkeys setting.
 * 
 * When showOnlyHotkeys is true, only regions with modifier keys are returned.
 * When showOnlyHotkeys is false, all regions are returned.
 * 
 * This is a runtime filter that can be applied at any time, allowing users
 * to toggle between showing all keystrokes and showing only shortcuts.
 * 
 * @param regions - Array of keystroke regions to filter
 * @param showOnlyHotkeys - Whether to show only hotkeys/shortcuts
 * @returns Filtered array of keystroke regions
 */
export function filterKeystrokeRegions(
  regions: KeystrokeRegion[],
  showOnlyHotkeys: boolean
): KeystrokeRegion[] {
  if (!showOnlyHotkeys) {
    return regions;
  }
  
  return regions.filter(isHotkeyRegion);
}

/**
 * Gets the visible keystroke regions for a given time, applying the hotkey filter.
 * 
 * This combines time-based visibility with the hotkey filter, returning only
 * regions that are both active at the current time and pass the hotkey filter.
 * 
 * @param regions - Array of all keystroke regions
 * @param currentTimeMs - Current playback time in milliseconds
 * @param showOnlyHotkeys - Whether to show only hotkeys/shortcuts
 * @returns Array of visible keystroke regions at the current time
 */
export function getVisibleKeystrokeRegions(
  regions: KeystrokeRegion[],
  currentTimeMs: number,
  showOnlyHotkeys: boolean
): KeystrokeRegion[] {
  // First filter by hotkey setting
  const filtered = filterKeystrokeRegions(regions, showOnlyHotkeys);
  
  // Then filter by time
  return filtered.filter(
    region => currentTimeMs >= region.startMs && currentTimeMs <= region.endMs
  );
}
