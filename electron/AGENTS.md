# electron/ - Main Process

## Package Identity
Electron main process handling window management, system APIs, IPC communication, and native services (keystroke capture, transcription, secure storage).

## Structure
```
electron/
├── main.ts              # App entry, window creation, tray
├── windows.ts           # Window factory functions
├── preload.ts           # Context bridge API exposure
├── ipc/                 # IPC handlers by feature
│   ├── handlers.ts      # Core IPC (sources, recording, files)
│   ├── presets.ts       # Preset CRUD
│   ├── keystrokeSettings.ts  # Keystroke config
│   └── keystrokeEditor.ts    # Keystroke recording for editor
└── services/            # Native service implementations
    ├── keystrokeService.ts      # uiohook-napi wrapper
    ├── keystrokeEventRecorder.ts # Event capture during recording
    ├── mouseEventDetector.ts    # Mouse event detection
    ├── transcription.ts         # AssemblyAI integration
    └── secureStorage.ts         # Encrypted credential storage
```

## Patterns & Conventions

### IPC Handlers
- ✅ DO: Group related handlers in feature files (`presets.ts`, `keystrokeSettings.ts`)
- ✅ DO: Use `ipcMain.handle()` for request-response, `ipcMain.on()` for events
- ✅ DO: Return `{ success: boolean, data?, error? }` objects
- ✅ DO: Register handlers in `main.ts` using `registerXxxHandlers()`

**Example IPC pattern (from `ipc/keystrokeSettings.ts`):**
```ts
export function getKeystrokeSettings() {
  const settings = store.get('keystrokeSettings', DEFAULT_SETTINGS);
  return { success: true, settings };
}

// Register in main.ts:
ipcMain.handle('keystroke:get-settings', getKeystrokeSettings);
```

### Preload Script
- ✅ DO: Group APIs by feature namespace (`keystroke`, `autoZoom`, `secureStorage`)
- ✅ DO: Use async functions for `ipcRenderer.invoke()`
- ✅ DO: Return cleanup functions for event listeners
- ❌ DON'T: Expose raw `ipcRenderer`—use contextBridge only

**Preload API structure (from `preload.ts`):**
```ts
contextBridge.exposeInMainWorld('electronAPI', {
  keystroke: {
    start: () => ipcRenderer.invoke('keystroke:start'),
    onEvent: (callback) => {
      const listener = (_, event) => callback(event);
      ipcRenderer.on('keystroke:event', listener);
      return () => ipcRenderer.removeListener('keystroke:event', listener);
    },
  },
  // ... more namespaces
});
```

### Services
- ✅ DO: Create singletons for native module wrappers
- ✅ DO: Handle platform differences (check `process.platform`)
- ✅ DO: Gracefully handle missing optional dependencies

**Example service pattern (from `services/transcription.ts`):**
```ts
export async function transcribeVideo(
  request: TranscriptionRequest,
  onProgress?: (progress: TranscriptionProgress) => void
): Promise<TranscriptionResult> {
  // Implementation with progress callbacks
}
```

### Window Management
- ✅ DO: Use factory functions in `windows.ts`
- ✅ DO: Track window references in `main.ts`
- ✅ DO: Clean up listeners on window close

## Key Files
| Purpose           | File                                  |
| ----------------- | ------------------------------------- |
| App entry         | `electron/main.ts`                      |
| Window factories  | `electron/windows.ts`                   |
| Context bridge    | `electron/preload.ts`                   |
| Core IPC          | `electron/ipc/handlers.ts`              |
| Keystroke capture | `electron/services/keystrokeService.ts` |
| Secure storage    | `electron/services/secureStorage.ts`    |

## JIT Search Commands
```bash
# Find IPC handler
rg -n "ipcMain.handle\(" electron

# Find service function
rg -n "export function|export async function" electron/services

# Find preload API
rg -n "invoke\('" electron/preload.ts

# Find window creation
rg -n "new BrowserWindow" electron
```

## Common Gotchas
- **Native modules**: `uiohook-napi`, `koffi` are external—don't bundle (see `vite.config.ts`)
- **Platform checks**: Wrap platform-specific code with `process.platform` checks
- **Recordings path**: Use `RECORDINGS_DIR` from `main.ts` for file storage
- **Type sharing**: Import types from `../../src/types/` for consistency

## Pre-PR Checks
```bash
npm run lint && npm test && npm run build
```
