# Annotations

Annotations overlay text, images, or arrow figures on top of the video at specific time ranges.

## Adding a text annotation

```bash
openscreen --json annotate add \
  --project demo.openscreen \
  --type text \
  --content "Click the Settings button" \
  --start 3000 \
  --end 6000 \
  --position-x 60 \
  --position-y 30 \
  --font-size 32 \
  --color "#ffffff" \
  --bg-color "#000000"
```

## Adding a figure (arrow) annotation

```bash
openscreen --json annotate add \
  --project demo.openscreen \
  --type figure \
  --content "" \
  --start 3000 \
  --end 6000 \
  --position-x 50 \
  --position-y 50 \
  --arrow-direction down-right \
  --arrow-color "#ff0000"
```

### Arrow directions
`up`, `down`, `left`, `right`, `up-right`, `up-left`, `down-right`, `down-left`

## Parameters

### Required
- `--type` — `text`, `image`, or `figure`
- `--content` — Text content, image data URL, or empty string for figures
- `--start <ms>` — When the annotation appears
- `--end <ms>` — When the annotation disappears

### Position and size (optional)
- `--position-x <0-100>` — Horizontal position (percent of viewport, default: 50)
- `--position-y <0-100>` — Vertical position (percent of viewport, default: 50)
- `--width <n>` — Width (percent of viewport, default: 30)
- `--height <n>` — Height (percent of viewport, default: 20)

### Text styling (optional)
- `--font-size <px>` — Font size in pixels (default: 32)
- `--color <hex>` — Text color (default: #ffffff)
- `--bg-color <hex>` — Background color (default: transparent)
- `--font-family <name>` — Font family (default: Inter)
- `--font-weight <w>` — `normal` or `bold` (default: bold)
- `--text-align <a>` — `left`, `center`, or `right` (default: center)

## Listing and removing

```bash
openscreen --json annotate list --project demo.openscreen
openscreen --json annotate remove --project demo.openscreen --id annotation-abc12345
```

## Best practices

- **Keep annotations short** — 2-5 words for callouts, 1-2 sentences for explanations
- **Position away from action** — place annotations where they don't cover the UI being demonstrated
- **Use arrows** to point at specific UI elements instead of long text descriptions
- **Consistent timing** — show annotations for at least 2 seconds so they can be read
- **High contrast** — white text on dark background or dark text on light background
