import type { SubtitleRegion, SubtitleStyle, SubtitlePositionPreset, SubtitleWord } from '@/components/video-editor/types';

export interface TranscriptionWord {
  text: string;
  startMs: number;
  endMs: number;
  confidence: number;
}

/**
 * Groups transcription words into subtitle regions based on word limits and sentence boundaries.
 * 
 * @param words - Array of transcribed words with timing information
 * @param maxWordsPerLine - Maximum number of words per subtitle line (2-8)
 * @param defaultStyle - Default style to apply to all subtitles
 * @param defaultPosition - Default position preset for subtitles
 * @returns Array of SubtitleRegion objects ready for display
 */
export function groupWordsIntoSubtitles(
  words: TranscriptionWord[],
  maxWordsPerLine: number,
  defaultStyle: SubtitleStyle,
  defaultPosition: SubtitlePositionPreset,
): SubtitleRegion[] {
  if (!words || words.length === 0) return [];
  
  const subtitles: SubtitleRegion[] = [];
  let currentGroup: TranscriptionWord[] = [];
  let idCounter = 1;

  for (const word of words) {
    currentGroup.push(word);
    
    // Split when reaching maxWordsPerLine OR natural sentence end
    const isSentenceEnd = /[.!?]$/.test(word.text);
    const reachedMaxWords = currentGroup.length >= maxWordsPerLine;
    
    if (reachedMaxWords || isSentenceEnd) {
      const subtitleWords: SubtitleWord[] = currentGroup.map(w => ({
        text: w.text,
        startMs: w.startMs,
        endMs: w.endMs,
        confidence: w.confidence,
      }));
      
      subtitles.push({
        id: `subtitle-${idCounter++}`,
        startMs: currentGroup[0].startMs,
        endMs: currentGroup[currentGroup.length - 1].endMs,
        text: currentGroup.map(w => w.text).join(' '),
        words: subtitleWords,
        positionPreset: defaultPosition,
        style: { ...defaultStyle },
      });
      currentGroup = [];
    }
  }
  
  // Handle remaining words
  if (currentGroup.length > 0) {
    const subtitleWords: SubtitleWord[] = currentGroup.map(w => ({
      text: w.text,
      startMs: w.startMs,
      endMs: w.endMs,
      confidence: w.confidence,
    }));
    
    subtitles.push({
      id: `subtitle-${idCounter++}`,
      startMs: currentGroup[0].startMs,
      endMs: currentGroup[currentGroup.length - 1].endMs,
      text: currentGroup.map(w => w.text).join(' '),
      words: subtitleWords,
      positionPreset: defaultPosition,
      style: { ...defaultStyle },
    });
  }
  
  return subtitles;
}
