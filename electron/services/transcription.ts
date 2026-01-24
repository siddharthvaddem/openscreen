/**
 * Transcription Service for AssemblyAI integration
 * Handles audio extraction and transcription using AssemblyAI
 */

import { AssemblyAI } from 'assemblyai';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import type { TranscriptionRequest, TranscriptionResult, TranscriptionWord, TranscriptionProgress } from '../../src/types/transcription';

/**
 * Get the ffmpeg binary path based on platform
 * In development: uses system ffmpeg
 * In production: uses bundled ffmpeg
 */
function getFFmpegPath(): string {
  // Try to use bundled ffmpeg first in production
  const { app } = require('electron');
  if (app.isPackaged) {
    const platform = process.platform;
    const ffmpegName = platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
    const resourcePath = path.join(process.resourcesPath, 'bin', ffmpegName);
    if (fs.existsSync(resourcePath)) {
      return resourcePath;
    }
  }
  // Fallback to system ffmpeg
  return process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
}

/**
 * Extract audio from video using ffmpeg
 * @param videoPath - Path to the source video file
 * @returns Path to the extracted audio file (WAV format)
 */
async function extractAudio(videoPath: string): Promise<string> {
  const tempDir = os.tmpdir();
  const audioPath = path.join(tempDir, `audio-${Date.now()}.wav`);
  const ffmpegPath = getFFmpegPath();

  return new Promise((resolve, reject) => {
    // Use ffmpeg to extract audio
    const ffmpeg = spawn(ffmpegPath, [
      '-i', videoPath,
      '-vn',              // No video
      '-acodec', 'pcm_s16le',  // WAV format
      '-ar', '16000',     // 16kHz sample rate (optimal for speech recognition)
      '-ac', '1',         // Mono audio
      '-y',               // Overwrite output file
      audioPath
    ]);

    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(audioPath);
      } else {
        reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`));
      }
    });

    ffmpeg.on('error', (err) => {
      reject(new Error(`Failed to spawn ffmpeg: ${err.message}. Make sure ffmpeg is installed and in PATH.`));
    });
  });
}

/**
 * Transcribe a video file using AssemblyAI
 * @param request - Transcription request with video path, language, and API key
 * @param onProgress - Optional callback for progress updates
 * @returns Transcription result with word-level timestamps
 */
export async function transcribeVideo(
  request: TranscriptionRequest,
  onProgress?: (progress: TranscriptionProgress) => void
): Promise<TranscriptionResult> {
  try {
    // Validate inputs
    if (!request.videoPath) {
      return { success: false, error: 'Video path is required' };
    }
    if (!request.apiKey) {
      return { success: false, error: 'AssemblyAI API key is required' };
    }

    // Check if video file exists
    if (!fs.existsSync(request.videoPath)) {
      return { success: false, error: `Video file not found: ${request.videoPath}` };
    }

    // Step 1: Extract audio from video
    onProgress?.({ 
      status: 'extracting', 
      progress: 10, 
      message: 'Extracting audio from video...' 
    });

    let audioPath: string;
    try {
      audioPath = await extractAudio(request.videoPath);
    } catch (error) {
      return {
        success: false,
        error: `Failed to extract audio: ${error instanceof Error ? error.message : String(error)}`
      };
    }

    // Step 2: Initialize AssemblyAI client
    onProgress?.({ 
      status: 'uploading', 
      progress: 20, 
      message: 'Uploading audio to AssemblyAI...' 
    });

    const client = new AssemblyAI({ apiKey: request.apiKey });

    // Step 3: Transcribe with AssemblyAI
    onProgress?.({ 
      status: 'transcribing', 
      progress: 30, 
      message: 'Transcribing audio (this may take a few minutes)...' 
    });

    // Build transcription config
    const transcriptConfig: Parameters<typeof client.transcripts.transcribe>[0] = {
      audio: audioPath,
    };

    // Set language (undefined for auto-detection)
    if (request.language && request.language !== 'auto') {
      transcriptConfig.language_code = request.language as any;
    }

    const transcript = await client.transcripts.transcribe(transcriptConfig);

    // Step 4: Process results
    onProgress?.({ 
      status: 'processing', 
      progress: 90, 
      message: 'Processing transcription results...' 
    });

    // Clean up temp audio file
    try {
      fs.unlinkSync(audioPath);
    } catch {
      // Ignore cleanup errors - temp file will be cleaned up by OS eventually
      console.warn('Failed to cleanup temp audio file:', audioPath);
    }

    // Check for transcription errors
    if (transcript.status === 'error') {
      return {
        success: false,
        error: transcript.error || 'Transcription failed',
      };
    }

    // Map AssemblyAI words to our format
    const words: TranscriptionWord[] = (transcript.words || []).map((w: { text: string; start: number; end: number; confidence: number }) => ({
      text: w.text,
      startMs: w.start,
      endMs: w.end,
      confidence: w.confidence,
    }));

    onProgress?.({ 
      status: 'complete', 
      progress: 100, 
      message: `Transcription complete! ${words.length} words detected.` 
    });

    return {
      success: true,
      words,
    };
  } catch (error) {
    console.error('Transcription error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown transcription error',
    };
  }
}
