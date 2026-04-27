---
RFC: 0001
Title: Agent architecture v1
Author: enriquefft
Status: Draft
Created: 2026-04-27
Tracking: https://github.com/siddharthvaddem/openscreen/issues/349
---

# RFC 0001 — Agent architecture v1

## Summary

Shift verbs from CLI action handlers (load-mutate-save inline) to pure state transitions with metadata, so any transport — Commander CLI, MCP server, in-process IPC against the running GUI, future SDK — can fan out from one definition. PR #350 establishes the verb vocabulary and the agent-callable thesis; this RFC proposes the shape that lets that vocabulary scale past the eight verbs it ships with.

## Motivation

PR #350 ships eight verbs (`project`, `zoom`, `trim`, `speed`, `annotate`, `shortcuts`, `render`, `gif`) as Commander action handlers that load the project file, mutate it, and save it. The architecture is sound for eight. It will not scale to fifty.

The roadmap implied by issue #349 and existing GUI features pushes well past eight: keyframe animations, multi-region annotations, audio waveform editing, transitions, captions, layouts. Every one of those is at least one verb category, and most are several. The CLI surface today is already a load-bearing public contract once anyone builds tooling on top of `--json` output.

Three forces compound per verb under the current shape:

1. Each new verb gets re-implemented in every transport (CLI today, MCP soon, IPC against the running GUI eventually).
2. Each new verb writes the project file directly, which means each new verb is a new chance to desync against the running GUI (see [state coordination companion](./0001-agent-architecture/state-coordination.md)).
3. Each new verb's argument shape and result envelope are public on first ship, so the ergonomic decisions made today are the ones agents will be coding against tomorrow.

The cost of fixing this *now*, with eight verbs and zero external consumers, is bounded. The cost of fixing it after fifty verbs and a published MCP server is not. This RFC proposes the shape; the [PR #350 audit companion](./0001-agent-architecture/audit-pr350.md) grounds the argument in concrete code.

## Architectural concerns

Nine concrete shape problems in the current design. Each is a load-bearing decision that will be expensive to revisit later.

### 1. Verbs aren't pure `(state, args) → (state', result)`

`addZoomRegion(path, args)` does load-mutate-save inline (`cli/src/commands/zoom.ts:18-35`). Every verb owns its own filesystem dance. There is no way to:

- run a verb in-process against a running GUI's state (no GUI integration without re-implementation),
- replay a verb from a log (no reproducible sessions, no cross-process undo),
- batch verbs atomically (every verb is its own write, see #8),
- test a verb without a real filesystem fixture.

Pure transitions buy all four for free.

### 2. No verb registry

The CLI imports the managers (`project-manager`, `region-manager`, etc.) directly from each command handler. `cli/src/mcp-server.ts` imports neither — its only tool is `openscreen_help`, which serves concatenated skill markdown. The moment MCP needs real action verbs, every verb will be defined twice: once as a Commander handler, once as a tool. Future SDK and IPC are a third and fourth.

A single `defineVerb({ name, args, returns, mutates, replay, exec })` is the SSOT for fan-out. Transports become thin shells over the registry.

### 3. No transport abstraction

`outputJson(data: unknown)` at `cli/src/output.ts:16` plus a module-global `jsonMode` is welded to Commander. The contract between "verb finished" and "user sees a result" is implicit. MCP, SDK, and IPC each have to re-implement parse + dispatch + result shaping. They will diverge.

### 4. GUI/CLI state coordination is unspecified

There are roughly twelve desync, race, and attribution scenarios that exist or will exist once the CLI ships (see [state coordination companion](./0001-agent-architecture/state-coordination.md) for the full table). They collapse to one decision: the state source is hardcoded to disk. Every verb does `loadProject(path)`, mutates, and writes back. The running GUI is invisible to the CLI and the CLI is invisible to the GUI.

The verb-shape decision and the state-source decision are coupled: `defineVerb` is what makes "state source is pluggable (Disk / RunningEditor / InMemoryTest)" cheap. Without it, every verb hardcodes its source.

### 5. `outputJson(data: unknown)` is already the public contract

The first external script that depends on a current `--json` shape freezes that shape. There is no version tag, no discriminator, no schema. Today's `outputJson(data: unknown)` is tomorrow's "we can't change the result envelope without breaking three integrations."

A `CommandResult<TVerb>` discriminated union (`{ ok: true, verb, data } | { ok: false, verb, error }`), with the `data` shape derived from the verb's `returns` schema, costs almost nothing to introduce *before* there are external consumers. After is a different story.

### 6. No project-file migration runner

`schemaVersion: 1` is declared (`src/shared/project-schema.ts`) without a `migrate(v1 → v2)` framework. When the schema first evolves — adding a field, renaming one, splitting a structure — every existing user file needs to round-trip safely. A migration runner is two functions and a registry; retrofitting it after v2 ships is a coordination problem.

### 7. `useEditorHistory` is React-state-only

The undo/redo stack lives in `src/hooks/useEditorHistory.ts:85` and is consumed only from `VideoEditor.tsx:87`. CLI edits today are completely invisible to it: a CLI edit followed by a GUI undo silently reverts the CLI work, because undo restores the GUI's last in-memory snapshot, which predates the CLI write.

History needs to live at the state layer (where verbs commit), with React as a subscriber. This is a precondition for cross-process undo, which is a precondition for the CLI being safe to use against an open project.

### 8. No batch primitive

Each verb is its own load-mutate-save. A 10-verb keyframe batch is 10 reads, 10 writes, 10 history entries, 10 chances to half-apply on crash. A batch primitive — `executeBatch([verb, verb, verb])` that loads once, mutates n times, writes once, records one history entry — is something verbs *don't get for free* under the current shape.

### 9. No actor in the verb signature

The project file records nothing about who made an edit. Audit, attribution, per-verb permission gates (e.g. "MCP cannot delete projects"), rate limiting — all of these want `actor` as a first-class arg of `executeVerb`, not glued on by transport. Threading it later means touching every handler.

## Detailed design

The shape is a verb registry whose entries are pure transitions plus metadata.

```ts
defineVerb({
  name: "zoom.add",
  args: ZoomAddArgsSchema,           // Zod
  returns: ZoomAddResultSchema,      // Zod
  mutates: true,                     // false → read-only verb
  replay: false,                     // true → safe to re-execute from log
  exec: (state, args, ctx) => {
    // pure: returns next state + result, no I/O, no global side effects
    return { state: nextState, result };
  },
});
```

Four observations collapse out of this shape:

**(a) Verbs are pure transitions.** No filesystem, no IPC, no Electron, no React. Just `(state, args, ctx) → (state', result)`. The same `exec` runs against the file, against the running GUI's in-memory state, against an in-memory test fixture, or against a replayed log entry, with no per-verb conditional code.

**(b) Transports are thin shells.** Commander, MCP, SDK, and IPC each parse their input, look up the verb in the registry, validate args via the verb's Zod schema, call a shared `executeVerb(verb, args, ctx)`, and shape the return as `CommandResult<TVerb>`. None of them re-implement the verb. Adding a transport is a fixed cost, not a per-verb cost.

**(c) State source is pluggable.** `executeVerb` takes a `StateSource` from `ctx`:

- `DiskStateSource` — load file, run exec, save atomically with `editVersion` OCC.
- `RunningEditorStateSource` — connect over Unix socket to the GUI, submit the verb call, get the result back. The GUI's main process runs `exec` against its in-memory state, dispatches the result through `useEditorHistory`, and replies.
- `InMemoryStateSource` — for tests. No filesystem, no IPC.

The choice happens once per process, at startup, by detecting `editor.lock` and matching project paths. Verbs do not see the difference.

**(d) History at the state layer.** The reducer that owns "current state + undo stack" lives one level below React. `useEditorHistory` becomes a subscriber that re-renders on commits. CLI edits, MCP edits, IPC edits all funnel through the same commit path and produce the same history entries. Cross-process undo falls out: when the GUI launches and finds the project's `editVersion` ahead of its last-seen version, it replays log entries since that version into the history stack.

The companion [state coordination doc](./0001-agent-architecture/state-coordination.md) covers the full design for the editor-as-server model, the OCC discipline on the file, and the operation log. The [PR #350 audit](./0001-agent-architecture/audit-pr350.md) grounds the per-verb concerns above in specific code references.

## Drawbacks

**Refactor cost on the eight existing verbs.** Each handler in `cli/src/commands/` has to be split into a pure `exec` and a thin transport shell. Estimated at one to two days for the eight, mostly mechanical.

**A small abstraction layer that agents and CLI both pay for.** `defineVerb` plus `executeVerb` plus `StateSource` plus `CommandResult` is maybe 400 LOC of plumbing. Every verb pays a small indirection cost at call time. For the audience (agents and scripts) the indirection is invisible.

**Possible YAGNI if MCP/SDK ambitions are scaled back.** If the project decides MCP is documentation-only forever, IPC is never needed, and the CLI is the only transport that will ever exist, then `defineVerb` is overkill and direct Commander handlers are fine. Issue #349 reads as the opposite trajectory, which is why this RFC is being written now.

## Alternatives considered

**(a) Keep the current shape and accept duplication across transports.** Cheapest today. Each new verb gets re-implemented in MCP, then again in IPC, then again in SDK. Each duplicate is a chance for behavior drift. Once external scripts depend on `--json` output shapes, those shapes are also frozen across all four transports independently. This is the path the codebase is on by default if no shape decision is made.

**(b) CRDT model (Figma-style).** Server-mediated CRDT means all operations commute and all clients converge. Clean, well-understood. Wildly overkill for a single-user desktop tool where the second writer is an agent the same user invoked. Costs: a server, a CRDT representation of every project node, an ops-not-files persistence model. Buys nothing the proposed model doesn't already buy for our use case. See the prior-art section of the [state coordination doc](./0001-agent-architecture/state-coordination.md).

**(c) Daemon-only model (Emacs-style).** The GUI is always the source of truth; the CLI cannot run standalone, only as a client of a running editor. Conceptually clean — eliminates the dual-source problem entirely. Loses the headless render path and the "edit a file from a Makefile" workflow. The hybrid (editor-as-server when the GUI is running, atomic file writes when it isn't) covers more ground for slightly more complexity. Covered in detail in the companion doc.

## Rollout plan

PR #350 has discussed splitting itself into smaller pieces. The RFC's preferred sequence:

1. **Verb registry foundation.** Add `defineVerb`, `executeVerb`, `StateSource`, `CommandResult`. Migrate two of the eight existing verbs (e.g. `zoom.add`, `zoom.remove`) as proof. No external behavior change.
2. **Migrate the rest of the eight verbs** to the registry. Still no external behavior change.
3. **Wire the MCP server to the registry.** Each verb becomes an MCP tool, namespaced `openscreen.{category}.{verb}`. Long-running verbs (`render`, `gif`) get progress notifications. Skill markdowns move to MCP resources.
4. **Add `editVersion` + atomic write on the GUI side.** Smallest piece of the state coordination work. Closes the two-CLI race and the partial-write surface. No new architecture.
5. **Add the operation log and editor-as-server IPC.** The big unlock — closes the GUI-open-while-CLI-edits surfaces. Builds on (1)–(4).

**Gate before the next verb category lands:** the next major verb category (annotations expansion, keyframes, animations) does not start until at least PRs (1) and (2) are in. The architectural cost of new verbs under the new shape is bounded; under the current shape it compounds.

Each step is independently shippable and the verb count is small enough that the migration is bounded. None of the steps require the whole edifice to be in place before they pay rent.

## Companion docs

- **[State coordination](./0001-agent-architecture/state-coordination.md)** — full design for the twelve GUI/CLI desync surfaces, the editor-as-server model, file-as-persistence with optimistic concurrency, and the operation log. The deep dive behind concern #4.

- **[Audit: PR #350](./0001-agent-architecture/audit-pr350.md)** — current-state findings from the PR review. Concrete code references that motivate this RFC's claims; not a personal review, evidence base.
