# OpenScreen CLI & Agent Interface

A command-line interface for OpenScreen, designed to be driven either by a human or by an AI agent. The CLI can create and edit `.openscreen` project files, add zoom/trim/speed/annotation regions, and render finished MP4s or GIFs through a headless Electron process — without opening the GUI.

Inspired by [Remotion's approach](https://github.com/remotion-dev/remotion): a CLI is the primary agent interface, agent skills (`SKILL.md` + rule files) teach agents how to use it, and a minimal MCP server handles documentation discovery.

---

## Table of contents

- [Architecture — two tiers](#architecture--two-tiers)
- [Prerequisites](#prerequisites)
- [Install](#install)
- [Quick start](#quick-start)
- [Commands](#commands)
- [JSON output for agents](#json-output-for-agents)
- [Using it with an AI agent](#using-it-with-an-ai-agent)
- [MCP server (optional)](#mcp-server-optional)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## Architecture — two tiers

The CLI splits work between a fast pure-Node.js layer and a slower Electron-backed layer:

| Tier | What runs | Commands | Latency |
|---|---|---|---|
| **1. Pure Node.js (~80%)** | Plain TypeScript via `tsx`. No browser, no Electron. | `project create/info/validate/edit`, `zoom/trim/speed/annotate add/list/remove`, `shortcuts get/set` | **Milliseconds** |
| **2. Electron headless (~20%)** | Spawns a hidden `BrowserWindow`, runs the full WebCodecs + PixiJS export pipeline, streams progress back via stdout. | `render` (MP4), `gif` | **Seconds to minutes**, depending on source video length and quality |

The shared code both tiers rely on lives in `src/shared/*` (project schema, types, shortcuts, aspect ratios, export types). The GUI imports the same modules through thin re-export stubs — the CLI refactor is a pure extraction with zero functional changes to the desktop app.

---

## Prerequisites

- **Node.js 22.22.1** (pinned in `package.json#engines` — earlier versions may work but this is the only version CI covers)
- **npm 10.9.4**
- **ffmpeg** (optional, recommended) — used by the skill's troubleshooting flow to probe video duration before adding regions. Install with `brew install ffmpeg` / `apt install ffmpeg` / equivalent.
- **OpenScreen repo cloned** — this CLI currently ships as part of the main repo, not as a standalone package. See [Install](#install) below.

---

## Install

### Clone and install dependencies

```bash
git clone https://github.com/siddharthvaddem/openscreen.git
cd openscreen
npm install
```

That's enough to run Tier 1 commands (project/region/shortcut management). Tier 2 rendering also needs a one-time Vite + Electron build so the headless bridge has a `dist-electron/main.js` to spawn:

```bash
npm run build-vite
```

Rerun `npm run build-vite` whenever you pull changes that touch `electron/` or `src/`.

### Three ways to invoke the CLI

Pick whichever matches your workflow.

**a. Via npm script (repo-local, always works):**

```bash
npm run cli -- --json project info --project demo.openscreen
```

The `--` is important — it passes everything after it through to the CLI instead of being eaten by npm.

**b. Via the shim script (repo-local, no npm wrapper overhead):**

```bash
./cli/bin/openscreen.mjs --json project info --project demo.openscreen
```

**c. Globally on PATH via `npm link` (recommended for day-to-day):**

```bash
# one-time, from the repo root
npm link

# then from anywhere
openscreen --json project info --project ~/demo.openscreen
```

`npm link` creates a symlink in your global npm prefix pointing at `cli/bin/openscreen.mjs` in the repo. To uninstall later: `npm unlink -g openscreen`.

> **Note:** `npm i -g openscreen` (publishing the package globally) is not wired yet — it would require moving `tsx` from devDependencies into runtime dependencies and setting up a build step. Until then, `npm link` from a local clone is the way to get `openscreen` onto your PATH.

All three invocations drive the same entrypoint, produce the same output, and have the same exit codes. The rest of this doc uses the `openscreen <cmd>` form for readability — mentally substitute `npm run cli -- <cmd>` if you haven't linked.

---

## Quick start

End-to-end: record something in the OpenScreen app, polish it with the CLI, render the result.

```bash
# 1. Record in the GUI. OpenScreen writes a .openscreen project into
#    ~/Library/Application Support/openscreen/recordings/ (on macOS).
#    On Linux/Windows it lives under the OS's XDG/AppData equivalent.

# 2. Inspect what's in the project
openscreen --json project info --project ~/Library/Application\ Support/openscreen/recordings/my-demo.openscreen

# 3. Copy it somewhere you want to work on (the GUI also writes here, so
#    editing the original in-place can confuse the app)
cp ~/Library/Application\ Support/openscreen/recordings/my-demo.openscreen /tmp/polished.openscreen

# 4. Add a zoom at 2s that lasts 3s, centered on the top-right quadrant
openscreen --json zoom add \
  --project /tmp/polished.openscreen \
  --start 2000 --end 5000 \
  --depth 3 \
  --focus-x 0.75 --focus-y 0.25

# 5. Speed up a boring nav section 1.5x
openscreen --json speed add \
  --project /tmp/polished.openscreen \
  --start 8000 --end 14000 \
  --speed 1.5

# 6. Trim dead time at the end
openscreen --json trim add \
  --project /tmp/polished.openscreen \
  --start 30000 --end 35000

# 7. Add a text callout
openscreen --json annotate add \
  --project /tmp/polished.openscreen \
  --type text \
  --content "Click here →" \
  --start 3000 --end 5000 \
  --position-x 60 --position-y 30

# 8. Sanity check
openscreen --json project validate --project /tmp/polished.openscreen

# 9. Render MP4 (spawns headless Electron)
openscreen render \
  --project /tmp/polished.openscreen \
  --output /tmp/polished.mp4 \
  --quality good \
  --overwrite
```

**Tip:** use `--json` for scripting, drop it for interactive work — the CLI autodetects whether to print human tables or JSON envelopes.

---

## Commands

Run `openscreen <command> --help` for per-command options. These are the ones that exist:

### Project lifecycle

| Command | Purpose |
|---|---|
| `project create` | Create a new `.openscreen` from a screen recording (and optional webcam track). |
| `project info` | Print version, media paths, all editor settings, and region counts. |
| `project validate` | Verify the file is well-formed (specific field-level errors on failure). |
| `project edit` | Modify any setting (wallpaper, padding, aspect ratio, export quality, gif settings…) without recreating the project. |

### Regions

| Command | Purpose |
|---|---|
| `zoom add/list/remove` | Manage zoom regions (`--depth 1..6`, optional `--focus-x/--focus-y 0..1`, optional `--focus-mode auto` for cursor-tracked follow). |
| `trim add/list/remove` | Cut sections out of the final video. |
| `speed add/list/remove` | Change playback speed for a section (`0.25, 0.5, 0.75, 1.25, 1.5, 1.75, 2`). |
| `annotate add/list/remove` | Overlay text, images, or arrows. `--type text\|image\|figure`, plus styling and position options. |

### Export

| Command | Purpose |
|---|---|
| `render` | Export as MP4 via headless Electron (`--quality medium\|good\|source`). |
| `gif` | Export as GIF (`--frame-rate 15\|20\|25\|30`, `--size-preset medium\|large\|original`, `--loop`/`--no-loop` to override the project's loop setting). |

### Shortcuts

| Command | Purpose |
|---|---|
| `shortcuts get` | Show the active editor keybindings. Surfaces an error if `shortcuts.json` is malformed instead of silently lying. |
| `shortcuts set` | Set a binding (`--action addZoom --key z --ctrl`). Self-healing: if the existing shortcuts file is corrupt, falls back to defaults and overwrites with the new value. |

Every region command validates input up-front: invalid numeric flags (`--start abc`), out-of-range values (`--padding 200`), unknown boolean literals (`--show-blur maybe`), and unknown enum values all fail fast with clear errors rather than silently coercing.

---

## JSON output for agents

Every command supports `--json`. Shape contracts:

**`project info`** — single envelope:
```json
{
  "version": 2,
  "media": { "screenVideoPath": "/abs/path.webm" },
  "settings": { "wallpaper": "/wallpapers/wallpaper1.jpg", "padding": 50, /* ... */ },
  "regions": { "zooms": 1, "trims": 0, "speeds": 2, "annotations": 3 }
}
```

**`zoom add` / `trim add` / `speed add` / `annotate add`** — returns the created region verbatim:
```json
{ "id": "zoom-a1b2c3d4", "startMs": 2000, "endMs": 5000, "depth": 3, "focus": { "cx": 0.75, "cy": 0.25 }, "focusMode": "manual" }
```

**`zoom list` / etc.** — returns an array with **the same shape** as `add`:
```json
[
  { "id": "zoom-a1b2c3d4", "startMs": 2000, "endMs": 5000, "depth": 3, "focus": { "cx": 0.75, "cy": 0.25 }, "focusMode": "manual" }
]
```

(Agents can reuse a single parser for add and list output.)

**`render` / `gif`** — progress and result use **different streams**:

- **stderr** — newline-delimited progress ticks: `{"progress":45,"current":135,"total":300}`. During the encoding phase the `phase` key is absent; it only appears once with value `"finalizing"` at the end.
- **stdout** — a single terminal envelope on success: `{"success":true,"path":"/abs/out.mp4","format":"mp4","size":30156365}`
- On failure, stdout is empty; a single `{"error":"..."}` line goes to stderr and the process exits non-zero.

That split lets agents pipe stdout through `jq` and get exactly one parseable JSON object per render:

```bash
if ! openscreen --json render ... 1>/tmp/out 2>/tmp/err; then
  jq -r '.error' </tmp/err
  exit 1
fi
jq -r '.path' </tmp/out
```

**Validation errors** — emitted to stderr as `{"error":"..."}`, exit code 1. Same shape as render failures.

---

## Using it with an AI agent

The CLI ships with an [AgentSkills](https://agentskills.io) directory at `cli/skills/` containing a `SKILL.md` plus six rule files:

```
cli/skills/
├── SKILL.md               ← entry point the agent reads first
└── rules/
    ├── project-setup.md
    ├── zoom-regions.md
    ├── trim-speed.md
    ├── annotations.md
    ├── export-render.md
    └── troubleshooting.md
```

The rules cover, at minimum: how to create/edit projects, when to use which zoom depth, valid speed values, annotation positioning conventions, the `render`/`gif` progress contract, and how to recover from common errors.

### With Claude Code

Symlink the skill into your local skill directory:

```bash
mkdir -p ~/.claude/skills
ln -s "$(pwd)/cli/skills" ~/.claude/skills/openscreen
```

Then tell Claude Code *"use the openscreen skill to turn `my-demo.openscreen` into a polished 30-second clip"* and it will load `SKILL.md`, walk the rule files as needed, and drive the CLI directly.

### With Cursor / Copilot / etc.

Point the agent at `cli/skills/SKILL.md` as context. The rule files are written to be standalone — an agent that reads them in isolation should be able to produce correct CLI invocations.

### Self-driving end-to-end

The intended flow is:

1. **Record** in the OpenScreen app (puts a `.openscreen` project file in the recordings directory)
2. **Hand the file to the agent**: *"polish this into a 20s demo showing the settings menu — add a zoom on the avatar and a callout on the save button"*
3. **Agent reads** `SKILL.md` + relevant rules
4. **Agent probes** the video duration (skill tells it to use `ffprobe` first so it doesn't place regions past the end of the source)
5. **Agent drives** the CLI through `project info` → `zoom add` / `annotate add` / etc. → `project validate` → `render`
6. **Agent returns** the final MP4 path from the stdout envelope

This has been end-to-end tested on real 47-second recordings — see the PR that introduced this CLI for a walk-through.

---

## MCP server (optional)

There's a minimal Model Context Protocol server at `cli/src/mcp-server.ts` that exposes a single `openscreen_help` tool. Agents without direct filesystem access to the skill directory can use it to fetch skill content by keyword (e.g. *"zoom"*, *"gif"*, *"troubleshoot"*).

Run it:

```bash
npm run mcp-server
```

Then wire it into your agent's MCP config (Claude Desktop, Cursor, etc.) as a local stdio server. The server is intentionally tiny — for production agent workflows, having shell access to the CLI directly is strictly more capable than the MCP surface.

---

## Troubleshooting

The most common failure modes are covered in [`cli/skills/rules/troubleshooting.md`](./skills/rules/troubleshooting.md). Quick pointers:

| Symptom | Likely cause | Fix |
|---|---|---|
| `Error: Project file not found` | Relative path in a different cwd | Use absolute paths — the skill's rules recommend this for anything automated. |
| `Error: Invalid project data: missing 'version' field` | File isn't an `.openscreen` project (or was corrupted mid-write) | Re-create via `project create` or restore from backup. |
| `render` fails partway with `Video decode ended early at X.Ys (needed Y.Ys)` | A region's timestamp extends past the source video duration | Probe first: `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 recording.webm`. The CLI does not auto-probe; this is a deliberate skill-docs instruction. |
| `Cannot find Electron main.js. Run 'npm run build-vite' first` | Tier-2 render commands need `dist-electron/main.js` to spawn | Run `npm run build-vite`. |
| `Error: Invalid JSON in shortcuts file …` from `shortcuts get` | Corrupt `shortcuts.json` | Run `shortcuts set` with any valid binding — the write path self-heals. |

For anything else, check the exit code (`$?`) and the `{"error": "..."}` line on stderr — everything the CLI emits is machine-readable under `--json`, and text mode tries hard to explain *why* a failure happened (which field, which file, which value).

---

## Contributing

The CLI lives under `cli/src/`:

```
cli/src/
├── index.ts              ← entrypoint, wires up commander
├── cli-parsers.ts        ← validating argument parsers (parseIntArg, parseFloatArg, …)
├── output.ts             ← dual --json / human output helpers
├── commands/             ← one file per top-level command
│   ├── project.ts
│   ├── zoom.ts
│   ├── trim.ts
│   ├── speed.ts
│   ├── annotate.ts
│   ├── render.ts
│   └── shortcuts.ts
├── core/                 ← business logic, pure Node.js
│   ├── project-manager.ts
│   ├── region-manager.ts
│   └── electron-bridge.ts (spawns headless Electron for Tier 2)
└── mcp-server.ts         ← MCP doc-search server
```

Shared pure-TypeScript modules (used by both CLI and GUI) live under [`src/shared/`](../src/shared). Changes there need to type-check under both `npm run cli:typecheck` and the root `tsc --noEmit`.

When adding a new command:

1. Create `cli/src/commands/<name>.ts` exporting a commander `Command`
2. Register it in `cli/src/index.ts`
3. Wire any new validation through `cli/src/cli-parsers.ts` (don't call bare `parseInt` / `parseFloat` — they silently accept junk like `"10%"`)
4. Use `outputSuccess`/`outputList`/`outputError` from `cli/src/output.ts` — never call `console.log` directly
5. Add a rule file under `cli/skills/rules/` describing the new command for agents
6. Add tests under `src/components/video-editor/projectPersistence.test.ts` (or wherever is closest to the shared logic you touched)

Run the full quality gate before sending a PR:

```bash
npm run cli:typecheck    # CLI TS project
npx tsc --noEmit          # root TS project (catches shared-module regressions)
npm run lint              # biome
npm test                  # vitest (excludes *.browser.test.* which need Playwright)
```
