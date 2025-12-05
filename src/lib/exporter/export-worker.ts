/**
 * Export Worker - Runs video decoding, rendering, and encoding in a Web Worker
 * 
 * This worker handles the heavy lifting of video export, keeping the main
 * thread responsive for UI updates.
 */

import { OffscreenRenderer, type OffscreenRenderConfig } from './offscreen-renderer';
import type { ZoomRegion, CropRegion, AnnotationRegion, TrimRegion } from '@/components/video-editor/types';

// Message types for worker communication
export interface WorkerMessage {
    type: string;
    id?: number;
    payload?: any;
}

export interface InitMessage extends WorkerMessage {
    type: 'init';
    payload: {
        videoData: ArrayBuffer;
        width: number;
        height: number;
        frameRate: number;
        bitrate: number;
        codec: string;
        wallpaper: string;
        zoomRegions: ZoomRegion[];
        trimRegions?: TrimRegion[];
        showShadow: boolean;
        shadowIntensity: number;
        showBlur: boolean;
        motionBlurEnabled?: boolean;
        borderRadius?: number;
        padding?: number;
        cropRegion: CropRegion;
        videoWidth: number;
        videoHeight: number;
        annotationRegions?: AnnotationRegion[];
        previewWidth?: number;
        previewHeight?: number;
    };
}

export interface ProgressMessage extends WorkerMessage {
    type: 'progress';
    payload: {
        currentFrame: number;
        totalFrames: number;
        percentage: number;
    };
}

export interface CompleteMessage extends WorkerMessage {
    type: 'complete';
    payload: {
        videoData: ArrayBuffer;
    };
}

export interface ErrorMessage extends WorkerMessage {
    type: 'error';
    payload: {
        message: string;
        stack?: string;
    };
}

// Worker state
let renderer: OffscreenRenderer | null = null;
let encoder: VideoEncoder | null = null;
let encodedChunks: EncodedVideoChunk[] = [];
let config: InitMessage['payload'] | null = null;

/**
 * Handle incoming messages from main thread
 */
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
    const message = event.data;

    try {
        switch (message.type) {
            case 'init':
                await handleInit(message as InitMessage);
                break;
            case 'start':
                await handleStart();
                break;
            case 'cancel':
                handleCancel();
                break;
            default:
                console.warn('[ExportWorker] Unknown message type:', message.type);
        }
    } catch (error) {
        sendError(error instanceof Error ? error : new Error(String(error)));
    }
};

/**
 * Initialize the export pipeline
 */
async function handleInit(message: InitMessage): Promise<void> {
    config = message.payload;

    // Initialize renderer
    const renderConfig: OffscreenRenderConfig = {
        width: config.width,
        height: config.height,
        wallpaper: config.wallpaper,
        zoomRegions: config.zoomRegions,
        showShadow: config.showShadow,
        shadowIntensity: config.shadowIntensity,
        showBlur: config.showBlur,
        motionBlurEnabled: config.motionBlurEnabled,
        borderRadius: config.borderRadius,
        padding: config.padding,
        cropRegion: config.cropRegion,
        videoWidth: config.videoWidth,
        videoHeight: config.videoHeight,
        annotationRegions: config.annotationRegions,
        previewWidth: config.previewWidth,
        previewHeight: config.previewHeight,
    };

    renderer = new OffscreenRenderer(renderConfig);
    await renderer.initialize();

    // Initialize encoder
    encodedChunks = [];
    encoder = new VideoEncoder({
        output: (chunk, _meta) => {
            encodedChunks.push(chunk);
        },
        error: (error) => {
            sendError(error);
        },
    });

    const encoderConfig: VideoEncoderConfig = {
        codec: config.codec || 'avc1.640033',
        width: config.width,
        height: config.height,
        bitrate: config.bitrate,
        framerate: config.frameRate,
        latencyMode: 'quality',
        bitrateMode: 'variable',
        hardwareAcceleration: 'prefer-hardware',
    };

    // Check hardware support
    const hardwareSupport = await VideoEncoder.isConfigSupported(encoderConfig);
    if (hardwareSupport.supported) {
        encoder.configure(encoderConfig);
    } else {
        encoderConfig.hardwareAcceleration = 'prefer-software';
        encoder.configure(encoderConfig);
    }

    // Send ready message
    self.postMessage({ type: 'ready' });
}

/**
 * Start the export process
 */
async function handleStart(): Promise<void> {
    if (!config || !renderer || !encoder) {
        throw new Error('Worker not initialized');
    }

    // Note: This is a placeholder - in a full implementation:
    // 1. We would use WebCodecsDecoder to decode frames from config.videoData
    // 2. For now, the actual heavy lifting is done in optimized-exporter.ts
    // 3. This worker structure is ready for future parallel processing
    void config.videoData; // Acknowledge the parameter

    // Calculate total frames
    const trimRegions = config.trimRegions || [];
    const totalTrimDuration = trimRegions.reduce((sum, region) => {
        return sum + (region.endMs - region.startMs) / 1000;
    }, 0);

    // We need to get video duration - for now, estimate from video data size
    // In a full implementation, this would come from WebCodecs VideoDecoder
    const estimatedDuration = 30; // seconds (placeholder)
    const effectiveDuration = estimatedDuration - totalTrimDuration;
    const totalFrames = Math.ceil(effectiveDuration * config.frameRate);

    // Process frames - placeholder loop
    // The actual frame processing will be integrated when WebCodecsDecoder
    // is available in the worker context
    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
        // Note: In a full implementation, we would:
        // 1. Use WebCodecsDecoder to decode the frame
        // 2. Pass the decoded VideoFrame to the renderer
        // 3. Encode the rendered frame

        // For now, this is a placeholder that shows the structure
        // The actual frame processing will be integrated in videoExporter.ts

        // Send progress
        sendProgress(frameIndex + 1, totalFrames);
    }

    // Flush encoder
    await encoder.flush();

    // TODO: Mux encoded chunks into MP4
    // For now, send placeholder complete message
    self.postMessage({
        type: 'complete',
        payload: { videoData: new ArrayBuffer(0) },
    });
}

/**
 * Handle export cancellation
 */
function handleCancel(): void {
    if (encoder && encoder.state !== 'closed') {
        encoder.close();
    }
    encoder = null;
    renderer?.destroy();
    renderer = null;
    encodedChunks = [];
    config = null;
}

/**
 * Send progress update to main thread
 */
function sendProgress(currentFrame: number, totalFrames: number): void {
    self.postMessage({
        type: 'progress',
        payload: {
            currentFrame,
            totalFrames,
            percentage: (currentFrame / totalFrames) * 100,
        },
    } as ProgressMessage);
}

/**
 * Send error to main thread
 */
function sendError(error: Error): void {
    const msg: ErrorMessage = {
        type: 'error',
        payload: {
            message: error.message,
            stack: error.stack,
        },
    };
    self.postMessage(msg);
}
