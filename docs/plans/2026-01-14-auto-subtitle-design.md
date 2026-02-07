# Auto-Subtitle Feature Design

**Date:** 2026-01-14  
**Status:** Approved  
**Author:** AI Assistant with User Input

---

## Overview

Add CapCut-style auto-subtitle generation to the video editor. Users can automatically transcribe video audio to generate timed subtitles, then customize fonts, positioning, and styling.

## Transcription Engine

**Provider:** AssemblyAI (Cloud API)  
**Key Management:** User provides their own API key on first use (saved locally)

## Languages Supported

| Code | Language   |
|------|------------|
| auto | Auto-detect |
| en   | English    |
| id   | Indonesian |
| zh   | Chinese    |
| ja   | Japanese   |
| ko   | Korean     |
| es   | Spanish    |
| pt   | Portuguese |
| vi   | Vietnamese |
| th   | Thai       |

---

## Data Model

### New Types (types.ts)

```typescript
export type SubtitleLanguage = 
  | 'auto' 
  | 'en' | 'id' | 'zh' | 'ja' | 'ko' | 'es' | 'pt' | 'vi' | 'th';

export type SubtitlePositionPreset = 
  | 'bottom-center' 
  | 'top-center' 
  | 'middle-center' 
  | 'custom';

export interface SubtitleStyle {
  color: string;                    // Text color (default: #FFFFFF)
  backgroundColor: string;          // Background box color or 'transparent'
  fontSize: number;                 // In pixels (default: 32)
  fontFamily: string;               // Font family (default: 'Inter')
  fontWeight: 'normal' | 'bold';
  textAlign: 'left' | 'center' | 'right';
  strokeColor: string;              // Text outline color (default: #000000)
  strokeWidth: number;              // Outline width 0-4px
}

export interface SubtitleWord {
  text: string;
  startMs: number;
  endMs: number;
  confidence: number;
}

export interface SubtitleRegion {
  id: string;
  startMs: number;                  // From AssemblyAI word.start
  endMs: number;                    // From AssemblyAI word.end
  text: string;                     // Joined words respecting maxWordsPerLine
  words: SubtitleWord[];            // Individual word timings for highlighting
  positionPreset: SubtitlePositionPreset;
  customPosition?: { x: number; y: number };
  style: SubtitleStyle;
}

export interface SubtitleGenerationConfig {
  language: SubtitleLanguage;
  maxWordsPerLine: number;          // 2-8 words, default 4
  defaultStyle: SubtitleStyle;
  defaultPosition: SubtitlePositionPreset;
}

// Default values
export const DEFAULT_SUBTITLE_STYLE: SubtitleStyle = {
  color: '#FFFFFF',
  backgroundColor: '#000000CC',     // Semi-transparent black
  fontSize: 32,
  fontFamily: 'Inter',
  fontWeight: 'bold',
  textAlign: 'center',
  strokeColor: '#000000',
  strokeWidth: 0,
};

export const DEFAULT_SUBTITLE_CONFIG: SubtitleGenerationConfig = {
  language: 'auto',
  maxWordsPerLine: 4,
  defaultStyle: DEFAULT_SUBTITLE_STYLE,
  defaultPosition: 'bottom-center',
};
```

---

## Architecture

### New Files

```
src/
├── components/video-editor/
│   ├── subtitle/
│   │   ├── SubtitleOverlay.tsx       # Renders subtitle on video (like AnnotationOverlay)
│   │   ├── SubtitleSettingsPanel.tsx # Editing panel when subtitle selected
│   │   └── SubtitleGenerateDialog.tsx # Modal wizard for auto-generation
│   └── timeline/
│       └── TimelineEditor.tsx        # (Modified) Add subtitle row
├── lib/
│   └── assemblyai.ts                 # AssemblyAI service wrapper
├── hooks/
│   └── useSubtitles.ts               # Subtitle state management hook
└── main/
    └── services/
        └── transcription.ts          # Handles API calls + audio extraction
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     VideoEditor.tsx                              │
├─────────────────────────────────────────────────────────────────┤
│  State: subtitleRegions[], selectedSubtitleId, subtitleConfig   │
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────────────┐   │
│  │ VideoPlayback │   │ TimelineRow  │   │ SubtitleSettings   │   │
│  │ + Overlay     │   │ (Subtitle)   │   │ Panel              │   │
│  └──────────────┘   └──────────────┘   └────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 SubtitleGenerateDialog                           │
│  - Language selection                                            │
│  - Max words per line slider                                     │
│  - Style presets                                                 │
│  - Position presets                                              │
│  - "Generate" button → triggers transcription                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               Electron Main Process                              │
│  1. Extract audio from video (ffmpeg)                            │
│  2. Upload to AssemblyAI                                         │
│  3. Poll for completion                                          │
│  4. Return words[] with timestamps                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               Renderer: Process Response                         │
│  1. Group words by maxWordsPerLine                               │
│  2. Create SubtitleRegion[] with timing from word boundaries     │
│  3. Apply default style & position                               │
│  4. Set state → subtitles appear in timeline + video             │
└─────────────────────────────────────────────────────────────────┘
```

---

## User Interface

### Timeline Integration

New "Subtitle" row in TimelineEditor (alongside Zoom/Trim/Annotation):

```
┌────────────────────────────────────────────────────────────────────┐
│ 🔍 Zoom       │██████░░░░░░░░░██████████░░░░░░░░░░░░░░░░░░░░░░░░░░│
│ ✂️ Trim       │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│ 📝 Annotation │░░░░░░░████░░░░░░░░░░░░░░░░░░░░█████░░░░░░░░░░░░░░│
│ 💬 Subtitle   │░░░██░░░██░░░██░░░██░░░██░░░░░░░░░░░░░░░░░░░░░░░░│  ← NEW
│               │ [🪄 Auto Generate]  [+ Add Manual]               │
└────────────────────────────────────────────────────────────────────┘
```

### SubtitleGenerateDialog (Modal)

```
┌──────────────────────────────────────────────────────────────┐
│  🎯 Generate Subtitles                              [✕]      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Language                                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 🌐 Auto-detect (Recommended)                    ▼    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Max Words Per Line                                          │
│  ──●────────────────────────  4 words                        │
│    2   3   4   5   6   7   8                                 │
│                                                              │
│  Position                                                    │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                        │
│  │ Bottom  │ │   Top   │ │ Middle  │                        │
│  │ Center● │ │ Center  │ │ Center  │                        │
│  └─────────┘ └─────────┘ └─────────┘                        │
│                                                              │
│  Style Preview                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │    ┌─────────────────────────────────────┐          │   │
│  │    │ Sample subtitle text here           │          │   │
│  │    └─────────────────────────────────────┘          │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         🪄 Generate Subtitles                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Processing takes ~30 seconds per minute of video           │
└──────────────────────────────────────────────────────────────┘
```

### Progress State

```
┌──────────────────────────────────────────────────────────────┐
│  🎯 Generating Subtitles...                         [✕]      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ████████████████████░░░░░░░░░░░░░░░░  45%                   │
│                                                              │
│  Transcribing audio...                                       │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    Cancel                               │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### SubtitleSettingsPanel (Edit Mode)

When subtitle is selected:

- **Text Content** - Editable textarea
- **Font Style** - Dropdown (Classic, Editor, Strong, etc.)
- **Font Size** - Dropdown (12px - 128px)
- **Formatting** - Bold/Italic/Underline toggles
- **Alignment** - Left/Center/Right
- **Text Color** - Color picker
- **Background Color** - Color picker with transparency
- **Position Presets** - Bottom/Top/Middle/Custom
- **Outline** - Width slider + color picker
- **Split at Max Words** - Re-split option with word count
- **Delete Button**

---

## Backend Integration

### Electron IPC API

```typescript
// src/main/services/transcription.ts

export interface TranscriptionRequest {
  videoPath: string;
  language: string;  // 'auto', 'en', 'id', etc.
}

export interface TranscriptionWord {
  text: string;
  startMs: number;
  endMs: number;
  confidence: number;
}

export interface TranscriptionResult {
  success: boolean;
  words?: TranscriptionWord[];
  error?: string;
}
```

### Word Grouping Algorithm

```typescript
function groupWordsIntoSubtitles(
  words: TranscriptionWord[],
  maxWordsPerLine: number,
  defaultStyle: SubtitleStyle,
  defaultPosition: SubtitlePositionPreset,
): SubtitleRegion[] {
  const subtitles: SubtitleRegion[] = [];
  let currentGroup: TranscriptionWord[] = [];
  let idCounter = 1;

  for (const word of words) {
    currentGroup.push(word);
    
    // Split when reaching maxWordsPerLine OR natural sentence end
    const isSentenceEnd = /[.!?]$/.test(word.text);
    const reachedMaxWords = currentGroup.length >= maxWordsPerLine;
    
    if (reachedMaxWords || isSentenceEnd) {
      subtitles.push({
        id: `subtitle-${idCounter++}`,
        startMs: currentGroup[0].startMs,
        endMs: currentGroup[currentGroup.length - 1].endMs,
        text: currentGroup.map(w => w.text).join(' '),
        words: [...currentGroup],
        positionPreset: defaultPosition,
        style: { ...defaultStyle },
      });
      currentGroup = [];
    }
  }
  
  // Handle remaining words
  if (currentGroup.length > 0) {
    subtitles.push({
      id: `subtitle-${idCounter++}`,
      startMs: currentGroup[0].startMs,
      endMs: currentGroup[currentGroup.length - 1].endMs,
      text: currentGroup.map(w => w.text).join(' '),
      words: [...currentGroup],
      positionPreset: defaultPosition,
      style: { ...defaultStyle },
    });
  }
  
  return subtitles;
}
```

---

## API Key Flow

1. User clicks "Auto Generate" button
2. If no API key stored, show input prompt:
   - Text input for API key
   - Link to AssemblyAI signup (https://www.assemblyai.com)
   - "Save & Continue" button
3. Key saved to electron-store for future sessions
4. Proceed to generation dialog

---

## Export Integration

Subtitles render to canvas during export (similar to annotations):

- **MP4 Export:** Render subtitle text on each frame
- **GIF Export:** Render subtitle text on each frame
- Respects all styling: font, color, background, outline, position

---

## Implementation Phases

| Phase | Description | Est. Time |
|-------|-------------|-----------|
| 1 | Core types & state management | 1 day |
| 2 | Manual subtitle creation (overlay + settings panel) | 2 days |
| 3 | AssemblyAI integration (main process + IPC) | 2 days |
| 4 | Auto-generation UI (dialog + word grouping) | 1 day |
| 5 | Export integration (MP4 + GIF) | 1 day |

**Total Estimated Time:** ~7 days

---

## Technical Notes

- AssemblyAI provides word-level timestamps in milliseconds
- API key should be stored securely in electron-store (not plaintext config)
- Audio extraction uses existing ffmpeg integration
- Word grouping respects natural sentence boundaries (. ! ?)
- Subtitle rendering uses canvas 2D context for export
