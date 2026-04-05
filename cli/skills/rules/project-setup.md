# Project Setup

## Creating a project

Every OpenScreen workflow starts with creating a `.openscreen` project file from a video recording:

```bash
openscreen --json project create \
  --video /path/to/recording.webm \
  --output /path/to/project.openscreen \
  --wallpaper wallpaper3 \
  --padding 32 \
  --border-radius 12 \
  --aspect-ratio 16:9
```

**Required:** `--video` (path to screen recording) and `--output` (path for project file).

**Optional settings:**
- `--wallpaper` — wallpaper1 through wallpaper18, or a hex color
- `--padding` — 0 to 100 (default: 50)
- `--border-radius` — corner radius in pixels (default: 0)
- `--aspect-ratio` — 16:9, 9:16, 1:1, 4:3, 4:5, 16:10, 10:16, native (default: 16:9)
- `--webcam` — path to webcam video for picture-in-picture
- `--shadow-intensity` — shadow amount (default: 0)
- `--export-quality` — medium, good, source (default: good)
- `--export-format` — mp4, gif (default: mp4)

## Inspecting a project

```bash
openscreen --json project info --project demo.openscreen
```

Returns: version, media paths, all settings, region counts.

## Validating a project

```bash
openscreen --json project validate --project demo.openscreen
```

Returns `{ "valid": true }` or an error. Use this to verify project integrity before rendering.

## Editing settings

Modify any setting without recreating the project:

```bash
openscreen --json project edit \
  --project demo.openscreen \
  --wallpaper wallpaper5 \
  --padding 40 \
  --aspect-ratio 1:1 \
  --export-quality source
```

Only specified options are changed; others remain unchanged.

## Project file format

`.openscreen` files are JSON with this structure:
- `version`: 2 (current)
- `media.screenVideoPath`: absolute path to screen recording
- `media.webcamVideoPath`: optional webcam video path
- `editor`: all settings and regions

**Important:** Video paths in the project are absolute. If you move video files, update the project.

## Common workflow

```bash
# 1. Create project
openscreen --json project create --video rec.webm --output demo.openscreen

# 2. Add effects (zoom, trim, speed, annotations)
openscreen --json zoom add --project demo.openscreen --start 2000 --end 5000 --depth 3
openscreen --json annotate add --project demo.openscreen --type text --content "Step 1" --start 0 --end 3000

# 3. Verify
openscreen --json project info --project demo.openscreen

# 4. Render
openscreen render --project demo.openscreen --output demo.mp4
```
