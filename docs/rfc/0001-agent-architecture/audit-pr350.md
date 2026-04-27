---
RFC: 0001
Title: Agent architecture v1 — audit of PR #350
Author: enriquefft
Status: Draft
Created: 2026-04-27
Companion-To: ../0001-agent-architecture.md
---

# Audit: current state of PR #350

This is the evidence base for [RFC 0001 — Agent architecture v1](../0001-agent-architecture.md). It catalogs concrete code-level findings from a re-review of PR #350 at `61f5f87` that motivate the architectural concerns in the RFC index. It is not a personal review of the PR — items that are pure procedural review (cosmetic nits, doc-line drift, markdown-lint) are excluded. What remains is the set of facts the RFC's claims rest on.

CI gates verified locally on Linux at the time of audit:

- `npm run lint` ✓
- `npx tsc --noEmit` ✓
- `npx vite build` ✓
- `npm run i18n:check` ✓

PR #350's prior P1 cluster (NaN propagation, `parseBool` typo coercion, depth/range enforcement, GIF preset validation) has been cleanly addressed via `cli/src/cli-parsers.ts`. The architecture is sound for eight verbs; the items below are about the shape it locks in for the next forty.

---

## Security and IPC surface

### 1. No IPC sender validation

`electron/ipc/handlers.ts` — every `ipcMain.handle` ignores the `event` argument. Combined with `webSecurity: false` on both the editor window and the new headless export window (`electron/main.ts:440`), a hostile sub-resource loaded from a malicious project file can call any handler — `read-binary-file`, `save-shortcuts`, `open-external-url`. Validate `event.senderFrame.url` (or a per-window token) on every filesystem-touching handler.

This matters to the RFC because the IPC layer is the same surface that editor-as-server (RFC §3.1 of the [state coordination companion](./state-coordination.md)) will route external mutator traffic through. The hardening pass needs to happen *before* that traffic exists, not after.

### 2. Preload exposes the full `electronAPI` (~30 methods) to the headless `cli-export` renderer

`electron/preload.ts` is unconditional. The CLI export only needs `cliExportMessage`, `readBinaryFile`, `getCursorTelemetry`, `saveExportedVideo`. Gate by `windowType` query or by URL on construction.

The principle generalizes: every transport gets the minimum capability surface it needs. A `defineVerb` registry with per-verb permissions (RFC concern #9) is the structural fix; preload gating is the immediate one.

### 3. No `app.requestSingleInstanceLock()`

`electron/main.ts:482`. Running `openscreen render` while the GUI is open spawns a second Electron sharing `userData` — two processes race on `shortcuts.json` and the recordings directory. Either acquire the lock and refuse CLI invocation when the GUI is open, or give CLI mode a separate userData via `app.setPath`.

This is the single-instance enforcement that the editor-as-server model requires (state coordination surface 7). Without it, "the GUI is the source of truth when running" is meaningless because there can be two GUIs.

## Reliability of the programmatic surface

### 4. Error swallowing in `runExport`

`cli/src/core/electron-bridge.ts:209-211`. The outer catch calls `outputError` (sets `process.exitCode = 1`) but doesn't rethrow. `render.ts:13-23` does the same. The CLI sets a non-zero exit code, but programmatic callers (tests, future SDK consumers, MCP tools) cannot distinguish success from failure.

This is RFC concern #5 — `outputJson(data: unknown)` is already the public contract — made concrete. The CLI's exit code is a transport detail; the result envelope is the contract. Either rethrow in the catch, or change `runExport` to return `Promise<{ ok: boolean; error?: ... }>`. A `CommandResult<TVerb>` discriminated union forces this everywhere.

### 5. Early `return` on existing-output check

`electron-bridge.ts:60-68`. Works thanks to `process.exitCode` for the CLI path, but combined with #4 it means programmatic callers see no rejection. Throw instead.

Same shape of problem: success/failure leaks through the transport instead of the result.

### 6. JSON-mode stdout pollution

`cli/src/core/electron-bridge.ts:94-96` — `--json` mode still emits "Exporting MP4 to /path…" via `outputText`. Worse, child stdout is piped to parent stdout with non-`__cli` lines silently dropped — any Electron `console.log` (preload errors, GPU init, etc.) becomes invisible to the JSON consumer. Route the child's stdout to stderr; only forward `__cli` envelopes on stdout.

Once an external script depends on JSON output, this becomes a contract bug, not a polish item. RFC concern #5 again.

## Single source of truth

### 7. `WebcamLayoutPreset` / `WebcamSizePreset` declared twice

`src/shared/types.ts:8,11` and `src/lib/compositeLayout.ts:18,20`. Same literal types. The renderer transitively pulls both. Delete the `compositeLayout.ts` declarations and re-import from `@/shared/types`.

### 8. Export-quality / GIF-size-preset / export-format enums in three places

`src/shared/project-schema.ts:478,491-495`, `cli/src/core/project-manager.ts:182-184`, `cli/src/commands/render.ts:26`. Export the literal arrays from `src/shared/export-types.ts` (where `VALID_GIF_FRAME_RATES` already lives) and use them everywhere.

### 9. `normalizeProjectEditor` is hand-rolled coercion, not validation

`src/shared/project-schema.ts:217-497` silently coerces malformed input to defaults. The CLI then re-implements partial strict validation (`project-manager.ts:182-235`) and *also* re-runs the same coercion at line 258. Three layers, one schema.

**Recommended fix:** replace with one Zod schema (zod is already a dependency). `.parse()` at the CLI/MCP boundary (reject malformed). `.catch(default)` per-field for the GUI's tolerant load path. Eliminates ~250 LOC of normalization, ~50 LOC of CLI re-validation, and gives MCP/CLI/renderer one canonical schema. This single change collapses items 8, 11, and the IPC casts in 12.

This is the single-source-of-truth keystone for the RFC. The Zod schema is what `defineVerb` consumes for `args` and `returns`. Without it, the verb registry is shaped by hand-rolled validation that already drifts in three places.

### 10. Five re-export "glue" files

`src/components/video-editor/projectPersistence.ts` (15 LOC), `src/components/video-editor/types.ts` (47 LOC, mostly re-export), `src/lib/recordingSession.ts` (8 LOC), `src/lib/shortcuts.ts` (32 LOC), `src/utils/aspectRatioUtils.ts` (10 LOC). They give every renderer file two canonical import paths and silently allow drift. Either delete them (and update ~30 import sites to `@/shared/*`), or keep only the genuinely browser-bound exports (e.g. `matchesShortcut`). `src/shared/index.ts` is a barrel with zero importers — delete or commit to using it everywhere.

The verb registry has to live in one place; that requires the type/contract layer underneath it to also live in one place.

## CLI validation as the boundary

### 11. `program.allowUnknownOption(false)` is not set

`cli/src/index.ts:42`, and not propagated to subcommands. `--gif-loooop=true` is silently ignored. Recurse via `program.commands.forEach` to apply.

The CLI is a typed boundary or it isn't. Silent flag drops are the same class of failure as silent enum coercion.

### 12. Several enum flags are not guarded at parse time

`cli-parsers.ts` is the right pattern; it just needs two more helpers (`parseStringEnum`, `parseFloatEnum`) wired in:

- `speed add --speed` — schema accepts 7 discrete values, CLI accepts any float
- `zoom add --focus-mode` (`manual | auto`)
- `annotate add --type` (`text | image | figure | blur`)
- `annotate add --arrow-direction` (8-way enum)
- `annotate add --font-weight` / `--text-align`
- `render --quality` / `gif --quality`

All currently round-trip through the CLI as raw strings.

This is what RFC concern #5 looks like in practice: the public contract today is "any string the parser accepts," which means tomorrow's strict-mode breaks every script that relied on tolerance.

### 13. `render --frame-rate` bypasses the strict parser

`cli/src/commands/render.ts:39` does a local `Number.parseInt(opts.frameRate, 10)`. Use `parseIntArg("--frame-rate")` to match the others.

### 14. `project create` lacks the validation `project edit` has

`editProject` runs `validateEditOptions` (project-manager.ts:207-234) before normalizing; `createProject` only normalizes (silent clamp). Symmetric validation closes this gap; collapses entirely if you adopt #9.

### 15. `as` casting in the IPC and shortcuts paths

`cli/src/core/electron-bridge.ts:136-162` (5 casts on `unknown` IPC fields — `(msg.data.totalFrames as number) ?? 100` doesn't actually catch wrong types, since `("foo" as number) ?? 100` returns `"foo"`); `cli/src/commands/shortcuts.ts:58,134,142,143` (4 casts); `cli/src/core/project-manager.ts:58,76,91,224` (4 casts including `as GifFrameRate` inside the typeguard that was supposed to narrow it).

The IPC layer is the highest-value Zod boundary: `z.discriminatedUnion("type", [progress, status, done, error])` removes the 5 casts and locks the contract with the main-process emitter. The casts are evidence that the type layer doesn't yet match the runtime layer — which is exactly what `defineVerb` plus a Zod schema fixes structurally.

## MCP server design

### 16. The MCP surface is documentation-only

`cli/src/mcp-server.ts` registers one `openscreen_help` tool that returns concatenated skill markdown. The CLI has 19 typed actions (project/zoom/trim/speed/annotate/shortcuts CRUD plus render/gif) and zero are MCP-exposed. An MCP-connected agent can discover what `openscreen` is, but to use it must shell out to bash — defeating the typed-boundary value of MCP.

This is the most direct evidence for the RFC's central claim. The "command surface" is the moat; the MCP server is currently the docs-aisle of a store with no checkout.

**Recommendation:** wrap each pure-Node action (`project-manager`, `region-manager`) as a tool with the Zod schema from #9, namespaced `openscreen.{project,zoom,trim,speed,annotate,shortcuts}.{verb}` so the MCP vocabulary mirrors CLI verbs. `render`/`gif` become long-running tools with progress notifications. Move the seven skill markdowns to MCP **resources** so agents list/read by URI instead of substring-querying via a tool. CLI and MCP then share one canonical action set backed by one schema — the `defineVerb` registry of the RFC.

---

## How the audit maps to the RFC

| Audit item | RFC concern |
|---|---|
| 1, 2, 3 (IPC hardening, single-instance lock) | State coordination companion §3.1 (editor-as-server prerequisites) |
| 4, 5, 6 (error/exit/stdout) | RFC concern #5 (`CommandResult<TVerb>`) |
| 7, 8, 9, 10 (duplicate types, glue files) | RFC concern #2 (verb registry needs SSOT types) |
| 11, 12, 13, 14 (CLI validation gaps) | RFC concern #5 (typed public contract) |
| 15 (`as` casts in IPC) | RFC concern #1 (pure transitions need typed args) and #5 |
| 16 (MCP is documentation-only) | RFC concerns #1, #2, #3 (verbs as transitions, registry, transport abstraction) |

The recurring pattern: a single Zod-schema-driven verb registry with a typed `CommandResult` envelope collapses most of the listed items at once. That's the RFC's proposal.
