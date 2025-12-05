export { VideoExporter } from './videoExporter';
export { VideoFileDecoder } from './videoDecoder';
export { FrameRenderer } from './frameRenderer';
export { VideoMuxer } from './muxer';
export type { ExportConfig, ExportProgress, ExportResult, VideoFrameData, ExportQuality } from './types';

// Optimized export modules - temporarily disabled due to mp4box compatibility issues
export { createExporter } from './optimized-exporter';
// export { OptimizedVideoExporter } from './optimized-exporter';
// export { WebCodecsDecoder, createDecoderFromUrl, isWebCodecsDecoderSupported } from './webcodecs-decoder';
// export { OffscreenRenderer, isOffscreenCanvasSupported } from './offscreen-renderer';
