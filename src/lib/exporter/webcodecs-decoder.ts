/**
 * WebCodecs-based video decoder with mp4box.js demuxer
 * 
 * This decoder provides parallel frame decoding capabilities,
 * significantly improving export performance on Apple Silicon.
 */

// mp4box has a non-standard export, need to handle both CommonJS and ESM
// @ts-ignore - mp4box types are not perfect
import MP4BoxModule from 'mp4box';

// Get the actual MP4Box object (handle different module formats)
const MP4Box = (MP4BoxModule as any).default || MP4BoxModule;

// Types for mp4box.js (simplified for our use case)
interface MP4Sample {
    data: ArrayBuffer;
    cts: number;  // Composition timestamp
    dts: number;  // Decode timestamp
    duration: number;
    is_sync: boolean;
    number: number;
    timescale: number;
}

interface MP4VideoTrack {
    id: number;
    nb_samples: number;
    timescale: number;
    duration: number;
    codec: string;
    width: number;
    height: number;
    video: {
        width: number;
        height: number;
    };
}

interface MP4Info {
    duration: number;
    timescale: number;
    isFragmented: boolean;
    tracks: MP4VideoTrack[];
    videoTracks: MP4VideoTrack[];
}

export interface DecodedFrame {
    frame: VideoFrame;
    timestamp: number;  // microseconds
    frameIndex: number;
}

export interface WebCodecsDecoderConfig {
    /** Video file to decode (File or Blob) */
    file: File | Blob;
    /** Callback when a frame is decoded */
    onFrame?: (frame: DecodedFrame) => void;
    /** Callback when decoding progress updates */
    onProgress?: (decoded: number, total: number) => void;
    /** Callback on error */
    onError?: (error: Error) => void;
}

/**
 * High-performance video decoder using WebCodecs and mp4box.js
 * 
 * This replaces the HTMLVideoElement-based approach with direct
 * access to the hardware decoder, enabling parallel frame processing.
 */
export class WebCodecsDecoder {
    private mp4boxFile: any = null;
    private decoder: VideoDecoder | null = null;
    private videoTrack: MP4VideoTrack | null = null;
    private frameBuffer: Map<number, VideoFrame> = new Map();
    private pendingFrames: Map<number, (frame: VideoFrame) => void> = new Map();
    private decodedCount = 0;
    private totalSamples = 0;
    private config: WebCodecsDecoderConfig;

    constructor(config: WebCodecsDecoderConfig) {
        this.config = config;
    }

    /**
     * Initialize the decoder with video file
     */
    async initialize(): Promise<{
        width: number;
        height: number;
        duration: number;
        frameRate: number;
        totalFrames: number;
    }> {
        return new Promise((resolve, reject) => {
            // Create mp4box file instance
            if (typeof MP4Box.createFile !== 'function') {
                reject(new Error('MP4Box.createFile is not available - mp4box may not be loaded correctly'));
                return;
            }

            this.mp4boxFile = MP4Box.createFile();

            this.mp4boxFile.onError = (error: Error) => {
                reject(error);
                this.config.onError?.(error);
            };

            this.mp4boxFile.onReady = (info: MP4Info) => {
                const videoTrack = info.videoTracks[0];
                if (!videoTrack) {
                    reject(new Error('No video track found'));
                    return;
                }

                this.videoTrack = videoTrack;
                this.totalSamples = videoTrack.nb_samples;

                // Generate codec config for VideoDecoder
                const codecConfig = this.getVideoDecoderConfig(videoTrack);

                // Initialize VideoDecoder
                this.initializeDecoder(codecConfig);

                // Set up sample extraction
                this.mp4boxFile.setExtractionOptions(videoTrack.id, null, {
                    nbSamples: Infinity,
                });

                // Calculate video info
                const duration = videoTrack.duration / videoTrack.timescale;
                const frameRate = videoTrack.nb_samples / duration;

                resolve({
                    width: videoTrack.video.width,
                    height: videoTrack.video.height,
                    duration,
                    frameRate,
                    totalFrames: videoTrack.nb_samples,
                });
            };

            this.mp4boxFile.onSamples = (
                _trackId: number,
                _ref: any,
                samples: MP4Sample[]
            ) => {
                this.processSamples(samples);
            };

            // Load the file
            this.loadFile();
        });
    }

    /**
     * Load file data into mp4box
     */
    private async loadFile(): Promise<void> {
        const file = this.config.file;
        const arrayBuffer = await file.arrayBuffer();

        // mp4box requires the buffer to have a fileStart property
        (arrayBuffer as any).fileStart = 0;

        this.mp4boxFile.appendBuffer(arrayBuffer);
        this.mp4boxFile.flush();
    }

    /**
     * Get VideoDecoder config from mp4box track info
     */
    private getVideoDecoderConfig(track: MP4VideoTrack): VideoDecoderConfig {
        // Get the track's description (avcC/hvcC box) for decoder init
        const trak = this.mp4boxFile.getTrackById(track.id);
        const entry = trak.mdia.minf.stbl.stsd.entries[0];

        let description: Uint8Array | undefined;

        // Handle H.264 (avc1) - simplified approach
        // @ts-ignore - mp4box internal API
        if (entry.avcC) {
            try {
                // Use mp4box's internal method to get the raw bytes
                const box = entry.avcC;
                const size = box.getSize ? box.getSize() : 0;
                if (size > 0) {
                    const buffer = new ArrayBuffer(size);
                    const view = new DataView(buffer);
                    // @ts-ignore
                    box.write(view, 0);
                    description = new Uint8Array(buffer);
                }
            } catch (e) {
                console.warn('[WebCodecsDecoder] Could not extract avcC description:', e);
            }
        }
        // Handle H.265 (hvc1/hev1)
        // @ts-ignore - mp4box internal API
        else if (entry.hvcC) {
            try {
                const box = entry.hvcC;
                const size = box.getSize ? box.getSize() : 0;
                if (size > 0) {
                    const buffer = new ArrayBuffer(size);
                    const view = new DataView(buffer);
                    // @ts-ignore
                    box.write(view, 0);
                    description = new Uint8Array(buffer);
                }
            } catch (e) {
                console.warn('[WebCodecsDecoder] Could not extract hvcC description:', e);
            }
        }

        return {
            codec: track.codec,
            codedWidth: track.video.width,
            codedHeight: track.video.height,
            description,
            hardwareAcceleration: 'prefer-hardware',
        };
    }

    /**
     * Initialize VideoDecoder
     */
    private initializeDecoder(config: VideoDecoderConfig): void {
        this.decoder = new VideoDecoder({
            output: (frame: VideoFrame) => {
                this.handleDecodedFrame(frame);
            },
            error: (error: Error) => {
                console.error('[WebCodecsDecoder] Decoder error:', error);
                this.config.onError?.(error);
            },
        });

        this.decoder.configure(config);
    }

    /**
     * Process samples from mp4box
     */
    private processSamples(samples: MP4Sample[]): void {
        if (!this.decoder || !this.videoTrack) return;

        for (const sample of samples) {
            const chunk = new EncodedVideoChunk({
                type: sample.is_sync ? 'key' : 'delta',
                timestamp: (sample.cts * 1_000_000) / sample.timescale,
                duration: (sample.duration * 1_000_000) / sample.timescale,
                data: sample.data,
            });

            this.decoder.decode(chunk);
        }
    }

    /**
     * Handle decoded frame from VideoDecoder
     */
    private handleDecodedFrame(frame: VideoFrame): void {
        this.decodedCount++;

        // Check if someone is waiting for this frame
        const frameIndex = this.decodedCount - 1;
        const pendingResolver = this.pendingFrames.get(frameIndex);

        if (pendingResolver) {
            pendingResolver(frame);
            this.pendingFrames.delete(frameIndex);
        } else {
            // Store in buffer for later retrieval
            this.frameBuffer.set(frameIndex, frame);
        }

        // Notify progress
        this.config.onProgress?.(this.decodedCount, this.totalSamples);

        // Call frame callback if provided
        this.config.onFrame?.({
            frame,
            timestamp: frame.timestamp ?? 0,
            frameIndex,
        });
    }

    /**
     * Get a specific frame by index
     * Returns a Promise that resolves when the frame is available
     */
    async getFrame(frameIndex: number): Promise<VideoFrame> {
        // Check if frame is already in buffer
        const bufferedFrame = this.frameBuffer.get(frameIndex);
        if (bufferedFrame) {
            this.frameBuffer.delete(frameIndex);
            return bufferedFrame;
        }

        // Wait for frame to be decoded
        return new Promise((resolve) => {
            this.pendingFrames.set(frameIndex, resolve);
        });
    }

    /**
     * Start the decoding process
     * This will begin extracting and decoding all samples
     */
    startDecoding(): void {
        if (!this.mp4boxFile) {
            throw new Error('Decoder not initialized');
        }
        this.mp4boxFile.start();
    }

    /**
     * Wait for all frames to be decoded
     */
    async waitForCompletion(): Promise<void> {
        if (!this.decoder) return;
        await this.decoder.flush();
    }

    /**
     * Get video info
     */
    getInfo(): { width: number; height: number; totalFrames: number; timescale: number } | null {
        if (!this.videoTrack) return null;
        return {
            width: this.videoTrack.video.width,
            height: this.videoTrack.video.height,
            totalFrames: this.videoTrack.nb_samples,
            timescale: this.videoTrack.timescale,
        };
    }

    /**
     * Clean up resources
     */
    destroy(): void {
        // Close all buffered frames
        for (const frame of this.frameBuffer.values()) {
            frame.close();
        }
        this.frameBuffer.clear();
        this.pendingFrames.clear();

        // Close decoder
        if (this.decoder && this.decoder.state !== 'closed') {
            this.decoder.close();
        }
        this.decoder = null;
        this.mp4boxFile = null;
        this.videoTrack = null;
    }
}

/**
 * Create a WebCodecs decoder from a video URL
 * Fetches the video file and creates a decoder
 */
export async function createDecoderFromUrl(
    url: string,
    options?: Partial<WebCodecsDecoderConfig>
): Promise<WebCodecsDecoder> {
    // Handle file:// URLs for Electron
    let response: Response;

    if (url.startsWith('file://')) {
        // For Electron, we need to use a different approach
        // The video URL should be accessible via fetch in Electron with nodeIntegration
        response = await fetch(url);
    } else {
        response = await fetch(url);
    }

    const blob = await response.blob();

    const decoder = new WebCodecsDecoder({
        file: blob,
        ...options,
    });

    return decoder;
}

/**
 * Check if WebCodecs VideoDecoder is available
 */
export function isWebCodecsDecoderSupported(): boolean {
    return typeof VideoDecoder !== 'undefined' && typeof EncodedVideoChunk !== 'undefined';
}
