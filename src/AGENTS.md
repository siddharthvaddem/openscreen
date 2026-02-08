# src/ - React Renderer Process

## Package Identity
React frontend for OpenScreen desktop app. Handles all UI, video preview, editing controls, and export dialogs.

## Setup & Run
```bash
# From repo root
npm run dev     # Starts Vite + Electron
npm test        # Runs Vitest
npm run lint    # ESLint
```

## Directory Structure
```
src/
├── components/          # React components
│   ├── ui/             # shadcn/ui primitives (don't edit directly)
│   ├── video-editor/   # Main editor UI
│   ├── keystroke-overlay/  # Key visualization overlay
│   └── launch/         # HUD, source selector windows
├── hooks/              # Custom React hooks
├── lib/                # Core logic & utilities
│   └── exporter/       # Video/GIF export engine
├── stores/             # State persistence (localStorage)
├── types/              # TypeScript interfaces
└── utils/              # Pure utility functions
```

## Patterns & Conventions

### Components
- ✅ DO: Functional components with TypeScript
- ✅ DO: Use `cn()` for conditional classes: `src/components/ui/button.tsx`
- ✅ DO: Use shadcn/ui primitives from `@/components/ui/`
- ❌ DON'T: Create class components
- ❌ DON'T: Hardcode colors—use Tailwind CSS variables

**Example component pattern:**
```tsx
// src/components/video-editor/SettingsPanel.tsx
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export function SettingsPanel({ className, ...props }) {
  return <div className={cn("p-4", className)} {...props} />
}
```

### Hooks
- ✅ DO: Name hooks `useXxx`
- ✅ DO: Colocate tests: `useKeystrokeSettings.ts` → `useKeystrokeSettings.test.ts`
- ✅ DO: Return object with state + actions (see `src/hooks/useKeystrokeSettings.ts`)
- ✅ DO: Check `window.electronAPI` availability before IPC calls

**Example hook pattern:**
```ts
// src/hooks/useKeystrokeSettings.ts
export function useKeystrokeSettings() {
  const [settings, setSettings] = useState(DEFAULT_KEYSTROKE_SETTINGS);
  const updateSettings = useCallback(async (updates) => {
    if (!window.electronAPI?.keystroke) return;
    // ... IPC call
  }, []);
  return { settings, updateSettings };
}
```

### Types
- ✅ DO: Export interface + `DEFAULT_*` constant together
- ✅ DO: Place in `src/types/` with descriptive filename
- ✅ DO: Add JSDoc for complex types (see `src/types/keystrokeSettings.ts`)

### Stores
- ✅ DO: Use localStorage for renderer-only persistence
- ✅ DO: Follow pattern in `src/stores/audioSettings.ts` (safe parse, defaults)
- ❌ DON'T: Store secrets in localStorage—use secureStorage IPC

## Key Files
| Purpose          | File                                        |
| ---------------- | ------------------------------------------- |
| App entry/router | `src/App.tsx`                                 |
| Main editor      | `src/components/video-editor/VideoEditor.tsx` |
| UI primitives    | `src/components/ui/*.tsx`                     |
| Utils            | `src/lib/utils.ts`                            |
| Exporter entry   | `src/lib/exporter/index.ts`                   |
| Type definitions | `src/types/*.ts`                              |

### Webcam Overlay Feature
- **Recording**: `src/hooks/useScreenRecorder.ts` — Dual recording (screen + webcam), `useCamSettings.ts` for toggle state
- **Editor**: `src/components/video-editor/WebcamOverlay.tsx` — Draggable overlay with shape/position presets
- **Timeline**: Webcam visibility row in `TimelineEditor.tsx` (`WEBCAM_ROW_ID`)
- **Export**: `src/lib/exporter/frameRenderer.ts` — `renderWebcam()` composites webcam onto export frames
- **Types**: `src/components/video-editor/types.ts` — `WebcamRegion`, `WebcamOverlaySettings`, `WebcamPositionPreset`, `WebcamShape`
- **Permissions**: `electron/permissions.ts` — Camera permission handler
- **File Discovery**: `electron/ipc/handlers.ts` — `webcam:get-webcam-video-path` IPC handler
- **File Convention**: Screen `recording-{ts}.webm`, webcam `recording-{ts}.webcam.webm`

## JIT Search Commands
```bash
# Find component by name
rg -n "export function ComponentName" src/components

# Find all hooks
rg -n "export function use" src/hooks

# Find type definitions
rg -n "export interface" src/types

# Find test files
fd -e test.ts src

# Find shadcn component usage
rg -n "from.*@/components/ui" src
```

## Common Gotchas
- **Electron API**: Check `window.electronAPI?.xxx` exists before calling
- **Imports**: Always use `@/` alias, never relative paths crossing directories
- **UI Components**: Add new shadcn components via `npx shadcn@latest add <name>`
- **Tests**: Use `vitest` globals—no need to import `describe`, `it`, `expect`

## Pre-PR Checks
```bash
npm run lint && npm test && npm run build
```
