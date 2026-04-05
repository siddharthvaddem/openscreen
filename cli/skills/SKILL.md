---
name: openscreen
description: >-
  CLI for OpenScreen — screen recording and video editing.
  Create, inspect, and modify .openscreen project files.
  Add zoom/trim/speed effects and annotations.
  Capture stills, export frame sequences, render to MP4 or GIF.
metadata:
  tags: [video, screen-recording, editing, export, cli]
---

# OpenScreen CLI

A command-line interface for programmatically creating and editing screen recording projects. Designed for AI agents.

## Quick Start

```bash
# Create a project from a screen recording
openscreen project create --video recording.webm --output demo.openscreen

# Add a zoom effect at 2-5 seconds, depth 4
openscreen zoom add --project demo.openscreen --start 2000 --end 5000 --depth 4

# Add a text annotation
openscreen annotate add --project demo.openscreen --type text --content "Click here" --start 3000 --end 6000

# Inspect the project
openscreen --json project info --project demo.openscreen

# Render to MP4 (requires Electron)
openscreen render --project demo.openscreen --output demo.mp4
```

## Always use `--json` for agent consumption

All commands support `--json` for structured output. Without it, output is human-readable tables.

```bash
# Agent-friendly
openscreen --json zoom list --project demo.openscreen

# Human-friendly (default)
openscreen zoom list --project demo.openscreen
```

## When working with projects
Load ./rules/project-setup.md

## When adding zoom effects
Load ./rules/zoom-regions.md

## When trimming or changing speed
Load ./rules/trim-speed.md

## When adding annotations
Load ./rules/annotations.md

## When rendering or exporting
Load ./rules/export-render.md

## When capturing frames or stills
Load ./rules/frames-stills.md

## When troubleshooting
Load ./rules/troubleshooting.md
