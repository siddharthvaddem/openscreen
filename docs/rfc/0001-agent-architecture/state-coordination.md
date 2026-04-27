---
RFC: 0001
Title: Agent architecture v1 — state coordination
Author: enriquefft
Status: Draft
Created: 2026-04-27
Companion-To: ../0001-agent-architecture.md
---

# State coordination between GUI and external mutators

**Scope.** Define how the OpenScreen editor (GUI) and external mutators (CLI today, MCP / SDK / HTTP tomorrow) coexist as writers against the same project state without desync, lost edits, or silent attribution gaps. Source: re-review of PR #350 at `61f5f87`. This is a companion to [RFC 0001 — Agent architecture v1](../0001-agent-architecture.md), expanding on architectural concern #4.

## 1. The desync surface today

The current model is "everyone reads and writes the project JSON file." That works for one writer, fails for two. Concrete scenarios that exist or will exist once the CLI ships:

| # | Scenario | Today's outcome |
|---|---|---|
| 1 | CLI edits while GUI has the project open and clean | GUI displays stale state. Next GUI save clobbers CLI changes. |
| 2 | CLI edits while GUI is dirty | GUI save silently overwrites CLI changes. No prompt. |
| 3 | Two CLI invocations race | Both `readFileSync`, mutate, write. Last write wins. No detection. |
| 4 | `openscreen render` reads project mid-GUI-edit | Renders pre-save state; user sees yesterday's edits in their export. |
| 5 | GUI undo after CLI edit | Undoes to GUI's last in-memory snapshot, silently reverting CLI work. |
| 6 | MCP edit while GUI open | Same as 1/2 — MCP today shells out, tomorrow won't. |
| 7 | Two Electron instances (no `requestSingleInstanceLock`) | Both share `userData`, race on `shortcuts.json` and recordings dir. |
| 8 | `shortcuts set` via CLI while GUI has shortcuts dialog open | GUI dialog save overwrites CLI change, or vice versa. |
| 9 | External edit (user opens `.openscreen` in vim) | Invisible to GUI. Save clobbers. |
| 10 | Crash mid-write on the GUI side | GUI uses `fs.writeFile` non-atomically (electron/ipc/handlers.ts:809). Truncated JSON on power loss. CLI is atomic; GUI isn't. |
| 11 | Attribution | The project file records nothing about *who* made an edit. No audit trail. |
| 12 | Symlink / canonical path mismatch | CLI's `path.resolve(opts.project)` vs GUI's open-document path may resolve to the same inode through different strings. |

Surfaces 1–6 are the load-bearing problems for the agents-as-users thesis. The rest are real but secondary.

## 2. Prior art

**Figma.** Server-mediated CRDT. All operations commute, all clients converge, all edits go through one process. Wonderful. Requires a server, a CRDT representation of every node, and an ops-not-files persistence model. Overkill for one user on one machine where the second writer is an agent the user invoked themselves.

**VS Code.** Filesystem is the source of truth. The editor watches files (`chokidar`), and on external change it auto-reloads clean buffers and prompts on dirty buffers. Conflicts are a UI question, not a data structure. Multi-window coordination is via OS-level lock files plus the `code` CLI's "open in existing window" feature, which routes through a Unix socket (`%TMP%\vscode-ipc-*.sock`). Three-way merge is delegated to git when needed. Pragmatic. Fits a single-user, file-based world.

**Emacs / Kakoune (daemon model).** When the GUI is running, the GUI *is* the source of truth. CLI clients (`emacsclient`, `kak -c`) connect via a Unix socket and submit operations into the running editor's command loop. The file is just persistence. The CLI is fully functional whether or not a daemon is running — when it isn't, the CLI either spawns one or operates standalone on the file. This is the closest fit to OpenScreen's invariants: one user, one project, optionally one running editor, optional headless agents.

**Notion / Obsidian.** File watcher + last-write-wins, with conflict copies (`Project (conflict 2026-04-25).md`). Cheap, ugly, occasionally wrong, never silently wrong.

**Git.** Operation log + 3-way merge + content-addressed history. The merge cost only pays off when there are real concurrent writers; for our case the merge UX would dominate the affordances we want to ship.

## 3. Proposed model: editor-as-server, file-as-persistence, log-as-history

One mechanism, three components, addresses every surface in §1.

### 3.1 Editor-as-server

When the GUI is running, it *is* the source of truth. External mutators (CLI, MCP, SDK) detect the running editor via a lockfile and route operations through it.

```
~/.openscreen/state/
  editor.lock        # PID, IPC socket path, project path, started_at
  editor.sock        # Unix domain socket (or named pipe on Windows)
```

On startup the GUI:
1. Acquires `app.requestSingleInstanceLock()` (closes surface 7).
2. Writes `editor.lock` with its PID and socket path.
3. Starts the IPC server inside the existing main process.

External mutators on every invocation:
1. Read `editor.lock`.
2. If the PID is alive AND the lock's project path matches `--project`, **route the operation to the GUI over the socket**, do *not* touch the file.
3. Otherwise, edit the file directly (and atomically) per §3.2.

The IPC payload is *the same verb args the CLI parses*. The GUI calls the same `region-manager.addZoomRegion` (or its in-process equivalent) the CLI would call against the file. Same Zod schema. Same return type. One canonical action set, two transports.

This collapses surfaces 1, 2, 4, 6, 8 simultaneously: when the GUI is running, the GUI's `useEditorHistory` reducer sees the CLI op as a regular edit. Undo works across processes (closes surface 5). The GUI never has stale state because there *is no other state* to be stale relative to.

### 3.2 File as persistence with OCC

When the GUI is *not* running (or is open on a different project), the file is the source of truth and the CLI writes it atomically. The file gains one new field:

```ts
{
  schemaVersion: 1,        // existing — for migrations
  editVersion: 47,         // NEW — monotonic, +1 per commit
  ...editor
}
```

Every reader records the `editVersion` it loaded. Every writer asserts the on-disk `editVersion` still matches before swapping the temp file in:

```ts
const { data, version: loadedVersion } = loadProject(path);
mutate(data);
data.editVersion = loadedVersion + 1;
saveProjectAtomic(path, data, { expectVersion: loadedVersion });
// → throws ConflictError on mismatch
```

This is optimistic concurrency, the cheapest mechanism that catches surface 3 (two-CLI race). For one user the check almost never fires; when it does the user sees `Conflict: project file changed since this command started. Re-run, or pass --force to overwrite.` rather than a silent overwrite.

The GUI adopts the same atomic write (temp + rename, closes surface 10) and the same `editVersion` discipline. Both writers produce the same on-disk shape. SSOT.

### 3.3 Operation log

Alongside the project file, every commit appends one line to `<project>.openscreen.log`:

```
{"ts":"2026-04-25T14:32:11Z","actor":"cli","verb":"zoom.add","args":{...},"editVersion":47,"hash":"sha256:..."}
```

The log is append-only, line-delimited JSON, atomically appended (`fs.openSync` with `O_APPEND`). Three uses:

1. **Attribution** (closes surface 11). Every edit names its actor: `gui`, `cli`, `mcp:<client-id>`, `sdk:<process-name>`.
2. **Cross-process undo** (closes surface 5). When the GUI launches and the file's `editVersion` is ahead of the GUI's last-seen version, the GUI replays the log entries since that version into `useEditorHistory`. Undo now traverses CLI edits.
3. **Reproducibility / debug**. The log is a script. `openscreen replay <project>.openscreen.log --from version=42` re-applies operations to a fresh project. This is also the contract for an SDK-callable verb that wants to record a session.

Rotating the log is the user's call (or a `openscreen log compact` verb that snapshots state and truncates).

### 3.4 File watcher

The GUI watches the project file with `chokidar`. If the file changes from outside (surface 9 — vim edits, git pull, Dropbox sync) the GUI:

- If `useEditorHistory` is clean: reload silently and append a synthetic `actor:"external"` log entry.
- If dirty: prompt the user (VS Code's pattern) — keep mine, take theirs, diff.

This handles every writer the editor-as-server model didn't catch.

### 3.5 Symlink canonicalization

Every actor canonicalizes the project path with `fs.realpath` before recording it in `editor.lock` or comparing to it. Closes surface 12.

## 4. How this satisfies the principles

**Single source of truth.** When the GUI is running, the GUI's in-memory state is the one truth and the file lags it. When the GUI is not running, the file is the one truth and `editVersion` enforces that one writer at a time committed. The operation log is a derived view, not a parallel state. The verb registry from the parent RFC index means the same operations execute in either path.

**Agents are users.** Agents talk to the editor through the same verb surface humans do — Commander for the CLI shell, MCP for a tool client, IPC socket for a co-resident process. Same Zod schema for args, same `CommandResult<V>` for returns, same operation log entry. There is no "this is how *agents* do it" carve-out, because agents and humans are both clients of the editor-as-server.

## 5. Tradeoffs

**Cost of building it.**
- Editor-as-server IPC: ~300 LOC. Unix socket + JSON-over-newline framing. Reuses the verb registry. Windows named-pipe variant adds maybe 50 LOC.
- `editVersion` + atomic write on GUI side: ~50 LOC.
- Operation log: ~150 LOC for append, replay, parse.
- File watcher with conflict UX: ~200 LOC for the React side, ~50 for chokidar wiring.
- Total: ~750 LOC and one new dependency (`chokidar`, already a common Electron transitive).

**What it does *not* give you.**
- Real multi-user, real-time collaboration. That's Figma territory and a year of work.
- Conflict-free merge. Two concurrent CLI writers still get one rejection on the second commit. For our use case (one user, agents serialized by them) that's the right rejection — the user re-runs and it succeeds.
- Network transparency. The IPC socket is local-only by design. A future "connect to a remote editor" feature is a separate transport.

**What it asks of the verb layer.**
- Verbs must be pure functions of `(state, args) → (state', result)`. No hidden side effects. This matches what `region-manager.ts` already does.
- Verbs must be JSON-serializable in args and result. They already are.
- Verbs must be idempotent under replay where reasonable, or be marked `replay: false`. `addZoomRegion` is not naturally idempotent (it generates a new ID); `removeZoomRegion` is. Mark accordingly in the registry.

**What it asks of the user.**
- Almost nothing. The CLI feels the same. The GUI feels the same. The only new visible surface is the conflict prompt, and that fires only when something genuinely conflicting happened.

## 6. Rollout

1. Land `editVersion` + atomic write on the GUI (surfaces 3, 10) — smallest, no new architecture.
2. Land the operation log (attribution, replay) — additive, no behavior change for existing flows.
3. Land the verb registry from the [parent RFC index](../0001-agent-architecture.md) — required for §3.1 to compile.
4. Land editor-as-server IPC (surfaces 1, 2, 4, 5, 6, 8) — the big unlock.
5. Land the file watcher + conflict UX (surface 9) — last because the prior steps reduce its trigger rate to near-zero.

Each step is independently shippable and improves the desync surface monotonically. None require the whole edifice to be in place before they pay rent.
