# Zoom Regions

Zoom regions create automatic zoom-in effects at specific timestamps in the recording.

## Adding a zoom

```bash
openscreen --json zoom add \
  --project demo.openscreen \
  --start 2000 \
  --end 5000 \
  --depth 3 \
  --focus-x 0.5 \
  --focus-y 0.5 \
  --focus-mode manual
```

### Parameters

- `--start <ms>` — Start time in milliseconds (required)
- `--end <ms>` — End time in milliseconds (required)
- `--depth <1-6>` — Zoom level (required for meaningful zoom):
  - 1 = 1.25x (subtle)
  - 2 = 1.5x (gentle)
  - 3 = 1.8x (default, good for UI demos)
  - 4 = 2.2x (close-up)
  - 5 = 3.5x (detail view)
  - 6 = 5.0x (extreme close-up)
- `--focus-x <0-1>` — Horizontal focus center, normalized (default: 0.5 = center)
- `--focus-y <0-1>` — Vertical focus center, normalized (default: 0.5 = center)
- `--focus-mode` — `manual` (default) or `auto` (follows cursor telemetry)

### Focus coordinates

Focus is normalized 0-1 where (0,0) is top-left and (1,1) is bottom-right:
- `(0.5, 0.5)` = center of screen
- `(0, 0)` = top-left corner
- `(1, 1)` = bottom-right corner
- `(0.75, 0.25)` = upper-right area

## Listing zooms

```bash
openscreen --json zoom list --project demo.openscreen
```

Returns an array of zoom regions with id, start/end times, depth, and focus.

## Removing a zoom

```bash
openscreen --json zoom remove --project demo.openscreen --id zoom-abc12345
```

Use the ID from the `list` or `add` output.

## Best practices

- **Depth 3** is good for most UI demos — noticeable but not jarring
- **Depth 5-6** is best for showing small text or tiny UI elements
- **Keep zooms 2-5 seconds** — shorter is more punchy
- **Avoid overlapping zooms** — the renderer handles one zoom at a time
- **Use `--focus-mode auto`** if cursor telemetry exists — it follows the mouse automatically
