export interface ExportConfig {
  width: number;
  height: number;
  frameRate: number;
  bitrate: number;
  codec?: string;
}

export interface ExportProgress {
  currentFrame: number;
  totalFrames: number;
  percentage: number;
  estimatedTimeRemaining: number; // in seconds
}

export interface ExportResult {
  success: boolean;
  blob?: Blob;
  error?: string;
}

export interface VideoFrameData {
  frame: VideoFrame;
  timestamp: number; // in microseconds
  duration: number; // in microseconds
}

export type ExportQuality = 'medium' | 'good' | 'source';
export type ExportFormat = 'mp4' | 'gif';
