# Troubleshooting

## Common errors

### "Project file not found"
```bash
# Use absolute paths for reliability
openscreen --json project info --project /absolute/path/to/demo.openscreen
```

### "Invalid JSON in project file"
The `.openscreen` file is corrupt. Validate it:
```bash
openscreen --json project validate --project demo.openscreen
```

### "Video file not found"
Video paths in projects are absolute. If you moved the video:
```bash
# Re-create the project with the new path
openscreen --json project create --video /new/path/recording.webm --output demo.openscreen
```

### "Invalid project data"
The project file is missing required fields. It needs: `version`, `media` (or `videoPath`), and `editor`.

### Render commands fail with "requires Electron headless bridge"
The `render`, `gif`, `still`, and `frames` commands need the Electron app installed. These commands are Phase 3 features.

## Debugging tips

### Inspect project state

```bash
# Full JSON dump
openscreen --json project info --project demo.openscreen

# List all regions
openscreen --json zoom list --project demo.openscreen
openscreen --json trim list --project demo.openscreen
openscreen --json speed list --project demo.openscreen
openscreen --json annotate list --project demo.openscreen
```

### Verify region IDs

Region IDs are generated automatically (e.g., `zoom-4b224352`). To remove a region, use the exact ID from the list output.

### Check exit codes

- Exit code 0 = success
- Non-zero = error (details in stderr or JSON error output)

```bash
openscreen --json project validate --project demo.openscreen
echo "Exit code: $?"
```

## Performance notes

- CLI commands that manipulate project files (create, edit, zoom/trim/speed/annotate add/remove) are pure Node.js and run in milliseconds
- Render, still, and frames commands spawn Electron headlessly — expect seconds to minutes depending on video length and quality
- Use `--quiet` to suppress progress output for faster piped workflows
