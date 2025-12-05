/**
 * Exporter factory - provides a stable export API
 * 
 * This module provides a factory function that returns the best available
 * exporter implementation. Currently uses the stable VideoExporter.
 * 
 * Future optimizations (WebCodecs + mp4box) are available but disabled
 * due to mp4box compatibility issues in the Vite/Electron environment.
 */

import type { ExportConfig, ExportProgress, ExportResult } from './types';
import type { ZoomRegion, CropRegion, TrimRegion, AnnotationRegion } from '@/components/video-editor/types';

interface ExporterConfig extends ExportConfig {
    videoUrl: string;
    wallpaper: string;
    zoomRegions: ZoomRegion[];
    trimRegions?: TrimRegion[];
    showShadow: boolean;
    shadowIntensity: number;
    showBlur: boolean;
    motionBlurEnabled?: boolean;
    borderRadius?: number;
    padding?: number;
    videoPadding?: number;
    cropRegion: CropRegion;
    annotationRegions?: AnnotationRegion[];
    previewWidth?: number;
    previewHeight?: number;
    onProgress?: (progress: ExportProgress) => void;
}

/**
 * Factory function to create the best available exporter
 * Currently uses the stable VideoExporter implementation
 */
export async function createExporter(
    config: ExporterConfig
): Promise<{ export: () => Promise<ExportResult>; cancel: () => void }> {
    console.log('[createExporter] Using VideoExporter (stable path)');
    const { VideoExporter } = await import('./videoExporter');
    const exporter = new VideoExporter(config);
    return {
        export: () => exporter.export(),
        cancel: () => exporter.cancel(),
    };
}
