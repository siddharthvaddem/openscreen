# Auto Screen MCP-Controlled Editor Implementation Plan

> **For Hermes:** Use subagent-driven-development style execution, but keep shared-file edits serialized.

**Goal:** Turn Auto Screen into a locally controllable desktop editor where CLI agents can issue structured edit commands and see real-time updates in the app.

**Architecture:** Electron main process hosts a localhost control server plus token auth. Renderer remains the source of truth for editor state. A typed IPC command bridge forwards structured commands from main to renderer, and renderer responds with typed results/snapshots. MCP integration can sit on top of the localhost control server.

**Tech Stack:** Electron, Vite, React, TypeScript, existing editor history/controller/exporter stack.

---

## Phase 1: Shared command model
- Add typed command/request/response envelopes in `src/editor/commands/types.ts`
- Cover tools:
  - `get_project_state`
  - `remove_background`
  - `set_background`
  - `apply_auto_edit`
  - `add_trim_region`
  - `add_speed_region`
  - `add_zoom_region`
  - `undo`
  - `redo`
  - `export_video`

## Phase 2: Renderer command execution
- Add reusable command helpers in `src/editor/commands/regions.ts`
- Expand `src/editor/useEditorController.ts` with:
  - addTrimRegion
  - addSpeedRegion
  - addZoomRegion
  - undo
  - redo
  - exportVideo (bridge to existing export callback)
  - executeCommand(name, input)
- Keep all mutations flowing through existing `pushState` / `undo` / `redo`

## Phase 3: Main/renderer bridge
- Expose preload APIs for:
  - register inbound command listener
  - send command result to main
  - publish state snapshot to main
- Add main-process request/response bridge with correlation IDs

## Phase 4: Local control server
- Add localhost HTTP server in Electron main, bound to `127.0.0.1`
- Token auth model:
  - app generates local token
  - caller sends `Authorization: Bearer <token>`
- Endpoints:
  - `GET /mcp/state`
  - `POST /mcp/command`
  - optional `GET /mcp/session`

## Phase 5: Demo flow
- Editor publishes current state to main
- Main server accepts command JSON
- Main forwards command to renderer
- Renderer executes and returns structured result
- App UI updates in real time

## Notes
- For this pass, HTTP control server is enough to prove the architecture. MCP stdio wrapper can be added on top afterward.
- `export_video` should use current renderer export pipeline; do not migrate export logic to main.
- Do not use UI automation; use structured editor commands only.
