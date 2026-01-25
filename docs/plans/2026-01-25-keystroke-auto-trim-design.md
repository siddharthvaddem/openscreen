# Keystroke Auto-Trim Duration Design

## Overview

Simplify keystroke duration management by removing duplicate controls and adding auto-trim to prevent overlap. Duration is controlled exclusively via timeline resize.

## Problem

Currently there are two ways to control keystroke duration:
1. `lingerDurationMs` slider in settings panel
2. Resize region in timeline (changes `startMs`/`endMs`)

These are not synchronized, causing confusion. Additionally, rapid keystrokes create overlapping regions that stack visually.

## Solution

### 1. Single Source of Truth

Duration controlled only via timeline resize. Remove "Linger Duration" slider from `KeystrokeSettingsPanel`.

### 2. Auto-Trim on Generation

When generating keystroke regions from recorded events, if a new keystroke starts before the previous one ends, trim the previous keystroke's `endMs` to the new keystroke's `startMs`.

**Algorithm:**
```
for each event (sorted by timestamp):
  region.startMs = event.timestamp
  region.endMs = event.timestamp + DEFAULT_DURATION (1500ms)
  
  if previous_region exists AND region.startMs < previous_region.endMs:
    previous_region.endMs = region.startMs  // trim
```

### 3. Constants

- `DEFAULT_KEYSTROKE_DURATION_MS = 1500` - Initial duration before trim
- No minimum duration - keystroke displayed regardless of final duration

## Example

**Input events:**
- Shift+C at 0ms
- Shift+D at 500ms  
- Shift+E at 2500ms

**Output regions:**
- Shift+C: 0ms - 500ms (trimmed from 1500ms)
- Shift+D: 500ms - 2000ms (not trimmed)
- Shift+E: 2500ms - 4000ms

## Files to Modify

1. `src/utils/keystrokeRegionGenerator.ts` - Add auto-trim logic
2. `src/components/video-editor/keystroke/KeystrokeSettingsPanel.tsx` - Remove Linger Duration slider
3. `src/components/video-editor/types.ts` - Remove `lingerDurationMs` from `KeystrokeStyle` (optional, can keep for backwards compat)

## Testing

Property-based test: For any sequence of keystroke events sorted by timestamp, no two generated regions should overlap (region[i].endMs <= region[i+1].startMs).
