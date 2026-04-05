# Frames and Stills

Capture individual frames or frame sequences from a project with all effects applied (zooms, annotations, wallpaper, etc.).

## Capturing a single still

```bash
openscreen still \
  --project demo.openscreen \
  --output thumbnail.png \
  --frame 5000 \
  --format png \
  --scale 1
```

### Parameters
- `--frame <ms>` — Timestamp to capture (default: 0, i.e., first frame)
- `--format` — `png` (default, lossless) or `jpeg` (smaller)
- `--jpeg-quality` — 1-100 (default: 90, only for JPEG)
- `--scale` — Device scale factor for higher resolution (default: 1)

### Use cases
- **Thumbnails** for video previews
- **Screenshots** of specific moments with effects applied
- **Visual verification** before full render

## Exporting frame sequences

```bash
openscreen frames \
  --project demo.openscreen \
  --output-dir ./frames \
  --start 0 \
  --end 10000 \
  --every-nth 5 \
  --format png
```

### Parameters
- `--output-dir` — Directory for frame images (required, created if missing)
- `--start <ms>` — Start timestamp (default: 0)
- `--end <ms>` — End timestamp (default: full video)
- `--every-nth <n>` — Export every Nth frame (default: 1 = all frames)
- `--format` — `png` or `jpeg` (default: png)

### Use cases
- **Sprite sheets** for web previews
- **Frame-by-frame review** of effects
- **Custom video compositing** pipelines

## Best practices

- Use `--every-nth 30` (at 30fps) to get one frame per second — good for previews
- Use `--scale 2` for retina-quality stills
- JPEG is ~5x smaller than PNG for screenshots with gradients
- Frame extraction is slower than rendering because each frame requires full effect processing
