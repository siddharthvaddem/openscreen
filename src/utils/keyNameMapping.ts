// src/utils/keyNameMapping.ts

import type { KeystrokeEvent, MouseActionEvent } from '../types/keystrokeEvents';

/**
 * uiohook-napi key codes for special keys
 * Reference: https://github.com/kwhat/libuiohook/blob/master/include/uiohook.h
 */
const SPECIAL_KEY_CODES: Record<number, string> = {
  // Function keys
  0x003B: 'F1',
  0x003C: 'F2',
  0x003D: 'F3',
  0x003E: 'F4',
  0x003F: 'F5',
  0x0040: 'F6',
  0x0041: 'F7',
  0x0042: 'F8',
  0x0043: 'F9',
  0x0044: 'F10',
  0x0057: 'F11',
  0x0058: 'F12',
  
  // Navigation keys
  0x001C: 'Enter',
  0x000E: 'Backspace',
  0x000F: 'Tab',
  0x0039: 'Space',
  0x0001: 'Escape',
  
  // Arrow keys
  0xE048: 'Up',
  0xE050: 'Down',
  0xE04B: 'Left',
  0xE04D: 'Right',
  
  // Editing keys
  0xE052: 'Insert',
  0xE053: 'Delete',
  0xE047: 'Home',
  0xE04F: 'End',
  0xE049: 'Page Up',
  0xE051: 'Page Down',
  
  // Lock keys
  0x003A: 'Caps Lock',
  0x0045: 'Num Lock',
  0x0046: 'Scroll Lock',
  
  // Modifier keys (standalone display)
  0x001D: 'Ctrl',
  0xE01D: 'Ctrl',
  0x0038: 'Alt',
  0xE038: 'Alt',
  0x002A: 'Shift',
  0x0036: 'Shift',
  0xE05B: 'Meta',
  0xE05C: 'Meta',
  
  // Misc keys
  0xE037: 'Print Screen',
  0x0E45: 'Pause',
  
  // Numpad
  0x0052: 'Num 0',
  0x004F: 'Num 1',
  0x0050: 'Num 2',
  0x0051: 'Num 3',
  0x004B: 'Num 4',
  0x004C: 'Num 5',
  0x004D: 'Num 6',
  0x0047: 'Num 7',
  0x0048: 'Num 8',
  0x0049: 'Num 9',
  0x0053: 'Num .',
  0xE035: 'Num /',
  0x0037: 'Num *',
  0x004A: 'Num -',
  0x004E: 'Num +',
  0xE01C: 'Num Enter',
};

/**
 * Alphanumeric key codes (A-Z, 0-9)
 */
const ALPHA_KEY_CODES: Record<number, string> = {
  // Letters A-Z
  0x001E: 'A', 0x0030: 'B', 0x002E: 'C', 0x0020: 'D', 0x0012: 'E',
  0x0021: 'F', 0x0022: 'G', 0x0023: 'H', 0x0017: 'I', 0x0024: 'J',
  0x0025: 'K', 0x0026: 'L', 0x0032: 'M', 0x0031: 'N', 0x0018: 'O',
  0x0019: 'P', 0x0010: 'Q', 0x0013: 'R', 0x001F: 'S', 0x0014: 'T',
  0x0016: 'U', 0x002F: 'V', 0x0011: 'W', 0x002D: 'X', 0x0015: 'Y',
  0x002C: 'Z',
  
  // Numbers 0-9 (top row)
  0x000B: '0', 0x0002: '1', 0x0003: '2', 0x0004: '3', 0x0005: '4',
  0x0006: '5', 0x0007: '6', 0x0008: '7', 0x0009: '8', 0x000A: '9',
};

/**
 * Symbol key codes
 */
const SYMBOL_KEY_CODES: Record<number, string> = {
  0x0029: '`',
  0x000C: '-',
  0x000D: '=',
  0x001A: '[',
  0x001B: ']',
  0x002B: '\\',
  0x0027: ';',
  0x0028: "'",
  0x0033: ',',
  0x0034: '.',
  0x0035: '/',
};

/**
 * Modifier key codes that should be excluded from main key display
 * when they appear as the primary key (they're shown in modifier prefix)
 */
const MODIFIER_KEY_CODES = new Set([
  0x001D, 0xE01D, // Ctrl
  0x0038, 0xE038, // Alt
  0x002A, 0x0036, // Shift
  0xE05B, 0xE05C, // Meta
]);

/**
 * Get the display name for a key code
 * 
 * Requirements:
 * - 3.5: Display special keys with readable names
 * - 3.6: Support function keys F1-F12
 * 
 * @param keyCode The uiohook key code
 * @returns Human-readable key name
 */
export function getKeyDisplayName(keyCode: number): string {
  // Check special keys first
  if (SPECIAL_KEY_CODES[keyCode]) {
    return SPECIAL_KEY_CODES[keyCode];
  }
  
  // Check alphanumeric keys
  if (ALPHA_KEY_CODES[keyCode]) {
    return ALPHA_KEY_CODES[keyCode];
  }
  
  // Check symbol keys
  if (SYMBOL_KEY_CODES[keyCode]) {
    return SYMBOL_KEY_CODES[keyCode];
  }
  
  // Unknown key - return hex code
  return `Key(0x${keyCode.toString(16).toUpperCase().padStart(4, '0')})`;
}

/**
 * Check if a key code is a modifier key
 */
export function isModifierKeyCode(keyCode: number): boolean {
  return MODIFIER_KEY_CODES.has(keyCode);
}

/**
 * Format modifiers in the standard order: Ctrl + Alt + Shift + Meta
 * 
 * Requirements:
 * - 3.3: Display modifier keys in consistent order
 * 
 * @param modifiers The modifier state object
 * @returns Formatted modifier string (e.g., "Ctrl + Alt + ")
 */
export function formatModifiers(modifiers: KeystrokeEvent['modifiers']): string {
  const parts: string[] = [];
  
  // Order: Ctrl, Alt, Shift, Meta
  if (modifiers.ctrl) parts.push('Ctrl');
  if (modifiers.alt) parts.push('Alt');
  if (modifiers.shift) parts.push('Shift');
  if (modifiers.meta) parts.push('Meta');
  
  return parts.length > 0 ? parts.join(' + ') + ' + ' : '';
}

/**
 * Format a keystroke event for display
 * 
 * Requirements:
 * - 3.1: Display the key name
 * - 3.2: Display modifier key combinations
 * - 3.3: Display modifier keys in consistent order
 * 
 * @param event The keystroke event
 * @returns Formatted string (e.g., "Ctrl + C", "Enter", "Shift")
 */
export function formatKeystroke(event: KeystrokeEvent): string {
  const keyName = getKeyDisplayName(event.keyCode);
  const isModifierOnly = isModifierKeyCode(event.keyCode);
  
  // If it's a modifier-only press, just show the modifier name
  if (isModifierOnly) {
    return keyName;
  }
  
  // Format with modifiers prefix
  const modifierPrefix = formatModifiers(event.modifiers);
  return modifierPrefix + keyName;
}

/**
 * Format a mouse action event for display
 * 
 * Requirements:
 * - 4.1: Display "Left Click"
 * - 4.2: Display "Right Click"
 * - 4.3: Display "Middle Click"
 * - 4.4: Include modifiers if present
 * 
 * @param event The mouse action event
 * @returns Formatted string (e.g., "Left Click", "Ctrl + Right Click")
 */
export function formatMouseAction(event: MouseActionEvent): string {
  const buttonNames: Record<string, string> = {
    left: 'Left Click',
    right: 'Right Click',
    middle: 'Middle Click',
  };
  
  const buttonName = buttonNames[event.button];
  const modifierPrefix = formatModifiers(event.modifiers);
  
  return modifierPrefix + buttonName;
}
