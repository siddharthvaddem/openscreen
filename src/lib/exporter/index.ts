export { VideoExporter } from './videoExporter';
export { VideoFileDecoder } from './videoDecoder';
export { FrameRenderer } from './frameRenderer';
export { VideoMuxer } from './muxer';
export { AudioExtractor } from './audioExtractor';
export { GifExporter, calculateOutputDimensions } from './gifExporter';
export type { 
  ExportConfig, 
  ExportProgress, 
  ExportResult, 
  VideoFrameData, 
  ExportQuality,
  ExportFormat,
  GifFrameRate,
  GifSizePreset,
  GifExportConfig,
  ExportSettings,
} from './types';
export { 
  GIF_SIZE_PRESETS, 
  GIF_FRAME_RATES, 
  VALID_GIF_FRAME_RATES, 
  isValidGifFrameRate 
} from './types';

