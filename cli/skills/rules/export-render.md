# Rendering and Export

## Rendering to MP4

```bash
openscreen render \
  --project demo.openscreen \
  --output demo.mp4 \
  --quality good \
  --overwrite
```

### Quality settings
- `medium` — Faster render, smaller file, lower quality
- `good` — Default, balanced quality and size
- `source` — Highest quality, preserves source resolution

### What happens during render

The render command spawns OpenScreen's Electron renderer headlessly. It:
1. Loads the project and video file
2. Decodes video frames via WebCodecs
3. Applies all effects (zooms, wallpaper, padding, shadows, annotations) via PixiJS
4. Encodes to H.264 MP4 with audio

Progress and the final result use **different streams** in `--json` mode so stdout stays parseable as a single JSON object:

- **stderr** — newline-delimited progress ticks, one per frame:
  ```json
  {"progress": 45, "current": 135, "total": 300}
  {"progress": 100, "current": 300, "total": 300, "phase": "finalizing"}
  ```
- **stdout** — a single terminal envelope:
  ```json
  {"success": true, "path": "/abs/path/demo.mp4", "format": "mp4", "size": 1076106}
  ```

This means agents can pipe `openscreen --json render ... | jq .` and get exactly one parseable object on success, while still tailing progress via `2>`. The `phase` key is only present during the `finalizing` phase; during frame extraction it is absent.

**On failure**, stdout is empty — the only signal is a single `{"error": "..."}` line on stderr plus a non-zero exit code. Agents that pipe only stdout through `jq` should also check the exit code (`$?`) and read stderr for the error envelope:

```bash
if ! openscreen --json render ... 1>/tmp/out 2>/tmp/err; then
  jq -r '.error' </tmp/err
  exit 1
fi
jq -r '.path' </tmp/out
```

## Rendering to GIF

```bash
openscreen gif \
  --project demo.openscreen \
  --output demo.gif \
  --frame-rate 15 \
  --size-preset medium \
  --overwrite
```

### GIF settings
- `--frame-rate` — 15 (balanced), 20 (smooth), 25 (very smooth), 30 (maximum)
- `--size-preset` — medium (720p), large (1080p), original
- `--loop` / `--no-loop` — override the project's loop setting. If neither is passed, the GIF uses the project's `editor.gifLoop` (default: loop). Pass `--no-loop` to force a non-looping GIF regardless of project state.

### GIF best practices
- **15 FPS** is usually enough for UI demos
- **medium** size keeps file sizes reasonable
- GIFs are much larger than MP4s — use for short clips (< 30 seconds)

## Pre-render checklist

Before rendering, verify your project:

```bash
# Check project is valid
openscreen --json project validate --project demo.openscreen

# Review what's in the project
openscreen --json project info --project demo.openscreen

# Check regions look correct
openscreen --json zoom list --project demo.openscreen
openscreen --json trim list --project demo.openscreen
```

## Export settings in the project

You can set default export settings in the project itself:

```bash
openscreen --json project edit \
  --project demo.openscreen \
  --export-quality source \
  --export-format mp4
```

The render command uses these defaults unless overridden by command flags.
