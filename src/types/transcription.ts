/**
 * Transcription types for AssemblyAI integration
 */

export interface TranscriptionRequest {
  videoPath: string;
  language: string; // 'auto', 'en', 'id', etc.
  apiKey: string;
}

export interface TranscriptionWord {
  text: string;
  startMs: number;
  endMs: number;
  confidence: number;
}

export interface TranscriptionProgress {
  status: 'extracting' | 'uploading' | 'transcribing' | 'processing' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
}

export interface TranscriptionResult {
  success: boolean;
  words?: TranscriptionWord[];
  error?: string;
}
