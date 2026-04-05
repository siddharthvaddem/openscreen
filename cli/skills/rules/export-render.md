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

Progress is reported as JSON lines when using `--json`:
```json
{"progress": 45, "current": 135, "total": 300, "phase": "extracting"}
```

## Rendering to GIF

```bash
openscreen gif \
  --project demo.openscreen \
  --output demo.gif \
  --frame-rate 15 \
  --size-preset medium \
  --loop \
  --overwrite
```

### GIF settings
- `--frame-rate` — 15 (balanced), 20 (smooth), 25 (very smooth), 30 (maximum)
- `--size-preset` — medium (720p), large (1080p), original
- `--loop` — loop the GIF (default: true)

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
