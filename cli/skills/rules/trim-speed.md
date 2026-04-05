# Trim and Speed Regions

## Trim regions

Trim regions define sections of the video to **cut out** (remove from final output).

### Adding a trim

```bash
openscreen --json trim add \
  --project demo.openscreen \
  --start 10000 \
  --end 15000
```

This removes the section from 10s to 15s from the final video.

### Listing and removing trims

```bash
openscreen --json trim list --project demo.openscreen
openscreen --json trim remove --project demo.openscreen --id trim-abc12345
```

### Best practices for trims
- Use trims to remove dead time (loading screens, mistakes, pauses)
- Multiple non-overlapping trims are fine
- Check `project info` region counts to verify trims were added

## Speed regions

Speed regions change the playback speed for a section of the video.

### Adding a speed change

```bash
openscreen --json speed add \
  --project demo.openscreen \
  --start 5000 \
  --end 10000 \
  --speed 2
```

### Valid speed values

- `0.25` — Quarter speed (slow motion)
- `0.5` — Half speed
- `0.75` — Three-quarter speed
- `1.25` — Slightly fast
- `1.5` — Default fast-forward
- `1.75` — Quick
- `2` — Double speed

**Note:** Only these exact values are accepted. 1.0 (normal speed) is not listed because it's the implicit default for sections without speed regions.

### Listing and removing speed regions

```bash
openscreen --json speed list --project demo.openscreen
openscreen --json speed remove --project demo.openscreen --id speed-abc12345
```

### Best practices for speed
- **2x speed** for repetitive actions (typing, scrolling, loading)
- **0.5x speed** for complex UI interactions you want viewers to follow
- **1.5x** is a good default for "fast but still readable"
- Avoid speed changes shorter than 1 second — they feel jarring
