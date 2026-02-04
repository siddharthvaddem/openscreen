# OpenScreen - AI Agent Guide

## Project Snapshot
- **Type**: Single-project Electron + React desktop app (screen recorder & video editor)
- **Stack**: Electron 39, React 18, TypeScript, Vite, Tailwind CSS, PixiJS
- **Testing**: Vitest with colocated tests (`*.test.ts`)
- **Sub-guides**: See `src/AGENTS.md`, `electron/AGENTS.md`, `src/lib/exporter/AGENTS.md`

## Quick Commands
```bash
# Install
npm install

# Dev (runs Vite + Electron)
npm run dev

# Build (all platforms)
npm run build

# Platform-specific builds
npm run build:mac
npm run build:win
npm run build:linux

# Test
npm test              # Run once
npm run test:watch    # Watch mode

# Lint
npm run lint
```

## Universal Conventions

### TypeScript
- Strict mode enabled (`noUnusedLocals`, `noUnusedParameters`)
- Use `@/` alias for `src/` imports (e.g., `@/components/ui/button`)
- Define types in `src/types/` with `DEFAULT_*` exports

### Styling
- Tailwind CSS with CSS variables (`hsl(var(--background))`)
- shadcn/ui components in `src/components/ui/`
- Use `cn()` from `@/lib/utils` for class merging

### Code Style
- Functional components only (no class components)
- Named exports preferred over default exports
- Tests colocated with source (`foo.ts` → `foo.test.ts`)

## Security & Secrets
- **NEVER** commit API keys or tokens
- Use `electron/services/secureStorage.ts` for encrypted key storage
- Renderer accesses secrets via `window.electronAPI.secureStorage`
- Environment variables not used; app-level storage only

## JIT Index

### Directory Map
- **Renderer (React)**: `src/` → [see src/AGENTS.md](src/AGENTS.md)
- **Main Process (Electron)**: `electron/` → [see electron/AGENTS.md](electron/AGENTS.md)
- **Video Export Engine**: `src/lib/exporter/` → [see src/lib/exporter/AGENTS.md](src/lib/exporter/AGENTS.md)
- **UI Primitives**: `src/components/ui/` (shadcn/ui, add via `npx shadcn@latest add`)
- **Static Assets**: `public/`

### Quick Find
```bash
# Find React component
rg -n "export function|export const" src/components --type ts

# Find hook
rg -n "export function use" src/hooks

# Find type definition
rg -n "export interface|export type" src/types

# Find IPC handler
rg -n "ipcMain.handle" electron/ipc

# Find tests
rg -l "\.test\.ts$" src electron
```

## Definition of Done
Before submitting PR:
1. `npm run lint` passes
2. `npm test` passes
3. `npm run build` succeeds (includes tsc)
4. Manual test of affected feature in dev mode
