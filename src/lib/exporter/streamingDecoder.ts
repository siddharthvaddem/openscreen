import { WebDemuxer } from "web-demuxer";
import type { SpeedRegion, TrimRegion } from "@/components/video-editor/types";

const SOURCE_LOAD_TIMEOUT_MS = 60_000;
const EPSILON_SEC = 0.001;
/**
 * Build a full WebCodecs-compatible AV1 codec string from the AV1CodecConfigurationRecord.
 * web-demuxer may return a bare "av01" when the WASM-side parser fails to read
 * the extradata (e.g. raw OBU sequence header from WebM instead of ISOBMFF av1C box).
 * This function parses the record if present, otherwise returns a safe default.
 *
 * @see https://aomediacodec.github.io/av1-isobmff/#av1codecconfigurationbox-section
 */
function buildAV1CodecString(description?: BufferSource): string {
	const fallback = "av01.0.01M.08";

	if (!description) return fallback;

	const bytes =
		description instanceof ArrayBuffer
			? new Uint8Array(description)
			: new Uint8Array(description.buffer, description.byteOffset, description.byteLength);

	// AV1CodecConfigurationRecord layout (4+ bytes):
	//   Byte 0: marker (1) | version (7)
	//   Byte 1: seq_profile (3) | seq_level_idx_0 (5)
	//   Byte 2: seq_tier_0 (1) | high_bitdepth (1) | twelve_bit (1) | ...
	// The spec says version should be 1, but Chrome/Electron's MediaRecorder
	// may write version 127 (0xFF first byte). We accept any version as long
	// as the marker bit is set and the record is long enough.
	if (bytes.length < 4) return fallback;
	if (!(bytes[0] & 0x80)) return fallback; // marker bit must be 1

	// Byte 1: seq_profile (3) | seq_level_idx_0 (5)
	const profile = (bytes[1] >> 5) & 0x07;
	const level = bytes[1] & 0x1f;

	// Byte 2: seq_tier_0 (1) | high_bitdepth (1) | twelve_bit (1) | monochrome (1) | ...
	const tier = (bytes[2] >> 7) & 0x01;
	const highBitdepth = (bytes[2] >> 6) & 0x01;
	const twelveBit = (bytes[2] >> 5) & 0x01;
	let bitdepth = 8;
	if (highBitdepth) bitdepth = twelveBit ? 12 : 10;

	const tierChar = tier ? "H" : "M";
	const levelStr = level.toString().padStart(2, "0");
	const bitdepthStr = bitdepth.toString().padStart(2, "0");

	return `av01.${profile}.${levelStr}${tierChar}.${bitdepthStr}`;
}

export interface DecodedVideoInfo {
	width: number;
	height: number;
	duration: number; // seconds
	streamDuration?: number; // seconds
	frameRate: number;
	codec: string;
	hasAudio: boolean;
	audioCodec?: string;
}

type EarlyDecodeEndCheck = {
	cancelled: boolean;
	lastDecodedFrameSec: number | null;
	requiredEndSec: number;
	streamDurationSec?: number;
};

const EARLY_DECODE_END_THRESHOLD_SEC = 1;
const METADATA_TAIL_TOLERANCE_SEC = 2;
const STREAM_DURATION_MATCH_TOLERANCE_SEC = 0.25;
const DURATION_DIVERGENCE_THRESHOLD_SEC = 1.5;
// Fallback upper bound for the packet scan when no reliable duration hint is
// available. Explicit end is required (some containers are truncated without
// one), but the hint-derived bound would cap the scan prematurely when
// container/stream duration are missing or corrupt.
const SCAN_UNBOUNDED_FALLBACK_SEC = 24 * 60 * 60;

/**
 * Validate container duration against actual packet timestamps.
 *
 * Chrome/Electron's MediaRecorder writes WebM containers with unreliable
 * Duration fields (often Infinity, 0, or inflated) — especially on Linux.
 * This function picks the most trustworthy duration value.
 *
 * @param containerDuration  Duration from the container-level metadata
 * @param scannedDuration    Duration derived from actual packet timestamps (ground truth)
 */
export function validateDuration(containerDuration: number, scannedDuration: number): number {
	if (scannedDuration <= 0) {
		// Zero scanned duration means corrupted/empty file — fall back to container
		// (downstream shouldFailDecodeEndedEarly will catch truly empty files)
		return Number.isFinite(containerDuration) ? Math.max(containerDuration, 0) : 0;
	}
	if (!Number.isFinite(containerDuration) || containerDuration <= 0) {
		return scannedDuration;
	}
	if (Math.abs(containerDuration - scannedDuration) > DURATION_DIVERGENCE_THRESHOLD_SEC) {
		return scannedDuration;
	}
	return containerDuration;
}

export function shouldFailDecodeEndedEarly({
	cancelled,
	lastDecodedFrameSec,
	requiredEndSec,
	streamDurationSec,
}: EarlyDecodeEndCheck): boolean {
	if (cancelled || requiredEndSec <= 0) {
		return false;
	}

	if (lastDecodedFrameSec === null) {
		return true;
	}

	const decodeGapSec = requiredEndSec - lastDecodedFrameSec;
	if (decodeGapSec <= EARLY_DECODE_END_THRESHOLD_SEC) {
		return false;
	}

	if (typeof streamDurationSec !== "number" || !Number.isFinite(streamDurationSec)) {
		return true;
	}

	const metadataTailSec = requiredEndSec - streamDurationSec;
	const decodedNearStreamEnd =
		Math.abs(lastDecodedFrameSec - streamDurationSec) <= STREAM_DURATION_MATCH_TOLERANCE_SEC;

	const maxTailSec = Math.max(METADATA_TAIL_TOLERANCE_SEC, requiredEndSec * 0.01);
	if (decodedNearStreamEnd && metadataTailSec > 0 && metadataTailSec <= maxTailSec) {
		return false;
	}

	return true;
}

/** Caller must close the VideoFrame after use. */
type OnFrameCallback = (
	frame: VideoFrame,
	exportTimestampUs: number,
	sourceTimestampMs: number,
) => Promise<void>;

/**
 * Decodes video frames via web-demuxer + VideoDecoder in a single forward pass.
 * Way faster than seeking an HTMLVideoElement per frame.
 *
 * Frames in trimmed regions are decoded (needed for P/B-frame state) but discarded.
 * Kept frames are resampled to the target frame rate in a streaming pass.
 */
export class StreamingVideoDecoder {
	private demuxer: WebDemuxer | null = null;
	private decoder: VideoDecoder | null = null;
	private cancelled = false;
	private metadata: DecodedVideoInfo | null = null;

	private async loadSourceFile(videoUrl: string): Promise<{ file: File; blob: Blob }> {
		const isRemoteUrl = /^(https?:|blob:|data:)/i.test(videoUrl);

		if (!isRemoteUrl && window.electronAPI?.readBinaryFile) {
			const result = await this.withTimeout(
				window.electronAPI.readBinaryFile(videoUrl),
				SOURCE_LOAD_TIMEOUT_MS,
				"Timed out while loading the source video.",
			);
			if (!result.success || !result.data) {
				throw new Error(result.message || result.error || "Failed to read source video");
			}

			const filename = (result.path || videoUrl).split(/[\\/]/).pop() || "video";
			const blob = new Blob([result.data]);
			return {
				blob,
				file: new File([blob], filename, { type: blob.type || "application/octet-stream" }),
			};
		}

		const response = await this.withTimeout(
			fetch(videoUrl),
			SOURCE_LOAD_TIMEOUT_MS,
			"Timed out while loading the source video.",
		);
		if (!response.ok) {
			throw new Error(`Failed to fetch source video: ${response.status} ${response.statusText}`);
		}
		const blob = await this.withTimeout(
			response.blob(),
			SOURCE_LOAD_TIMEOUT_MS,
			"Timed out while reading the source video.",
		);
		const filename = videoUrl.split("/").pop() || "video";
		return {
			blob,
			file: new File([blob], filename, { type: blob.type }),
		};
	}

	async loadMetadata(videoUrl: string): Promise<DecodedVideoInfo> {
		const { file } = await this.loadSourceFile(videoUrl);

		// Relative URL so it resolves correctly in both dev (http) and packaged (file://) builds
		const wasmUrl = new URL("./wasm/web-demuxer.wasm", window.location.href).href;
		this.demuxer = new WebDemuxer({ wasmFilePath: wasmUrl });
		await this.withTimeout(
			this.demuxer.load(file),
			SOURCE_LOAD_TIMEOUT_MS,
			"Timed out while parsing the source video.",
		);

		const mediaInfo = await this.withTimeout(
			this.demuxer.getMediaInfo(),
			SOURCE_LOAD_TIMEOUT_MS,
			"Timed out while reading video metadata.",
		);
		const videoStream = mediaInfo.streams.find((s) => s.codec_type_string === "video");

		let frameRate = 60;
		if (videoStream?.avg_frame_rate) {
			const parts = videoStream.avg_frame_rate.split("/");
			if (parts.length === 2) {
				const num = parseInt(parts[0], 10);
				const den = parseInt(parts[1], 10);
				if (den > 0 && num > 0) frameRate = num / den;
			}
		}

		const audioStream = mediaInfo.streams.find((s) => s.codec_type_string === "audio");

		// Scan video packets to find the true content boundary.
		// MediaRecorder (especially on Linux) writes unreliable container durations.
		// Packet timestamps are ground truth — no decode needed, just timestamp reads.
		// Pass explicit range because some containers are truncated without one.
		// Sanitize because mediaInfo.duration can be NaN/Infinity (Chromium Linux bug),
		// which would propagate into demuxer.read() as an invalid endpoint.
		const containerDurationSec = Number.isFinite(mediaInfo.duration) ? mediaInfo.duration : 0;
		const streamDurationSec =
			typeof videoStream?.duration === "number" && Number.isFinite(videoStream.duration)
				? videoStream.duration
				: 0;
		const hintedDurationSec = Math.max(containerDurationSec, streamDurationSec, 0);
		const scanEndSec =
			hintedDurationSec > 0 ? hintedDurationSec + 0.5 : SCAN_UNBOUNDED_FALLBACK_SEC;
		let maxPacketEndUs = 0;
		const scanReader = this.demuxer.read("video", 0, scanEndSec).getReader();
		try {
			while (true) {
				const { done, value } = await scanReader.read();
				if (done || !value) break;
				const endUs = value.timestamp + (value.duration ?? 0);
				if (endUs > maxPacketEndUs) maxPacketEndUs = endUs;
			}
		} finally {
			try {
				await scanReader.cancel();
			} catch {
				/* already closed */
			}
		}
		const scannedDuration = maxPacketEndUs / 1_000_000;
		const validatedDuration = validateDuration(mediaInfo.duration, scannedDuration);

		this.metadata = {
			width: videoStream?.width || 1920,
			height: videoStream?.height || 1080,
			duration: validatedDuration,
			streamDuration:
				typeof videoStream?.duration === "number" && Number.isFinite(videoStream.duration)
					? videoStream.duration
					: undefined,
			frameRate,
			codec: videoStream?.codec_string || "unknown",
			hasAudio: !!audioStream,
			audioCodec: audioStream?.codec_string,
		};

		return this.metadata;
	}
	/**
	 * Decodes all video frames from the loaded source and invokes a callback for each.
	 * Handles trimming and speed adjustments, and resamples to the target frame rate.
	 * On Windows, early decode termination is tolerated to work around driver quirks.
	 * @param targetFrameRate - Desired output frame rate.
	 * @param trimRegions - Array of time regions to keep (others discarded).
	 * @param speedRegions - Array of speed adjustments for specific time ranges.
	 * @param onFrame - Async callback receiving each decoded VideoFrame.
	 */
	async decodeAll(
		targetFrameRate: number,
		trimRegions: TrimRegion[] | undefined,
		speedRegions: SpeedRegion[] | undefined,
		onFrame: OnFrameCallback,
		onWarning?: (message: string) => void,
	): Promise<void> {
		if (!this.demuxer || !this.metadata) {
			throw new Error("Must call loadMetadata() before decodeAll()");
		}

		const decoderConfig = await this.demuxer.getDecoderConfig("video");

		console.log("[StreamingVideoDecoder] decoderConfig.codec:", decoderConfig.codec);
		console.log("[StreamingVideoDecoder] decoderConfig.description:", decoderConfig.description);

		// web-demuxer may return bare four-character code strings ("av01", "vp08",
		// "vp09", "avc1") that WebCodecs rejects. Normalize them to the short or
		// full parametrized forms that VideoDecoder accepts.
		if (/^av01$/i.test(decoderConfig.codec)) {
			decoderConfig.codec = buildAV1CodecString(
				decoderConfig.description as BufferSource | undefined,
			);
		}

		if (/^vp08$/i.test(decoderConfig.codec)) {
			decoderConfig.codec = "vp8";
		}
		if (/^vp09$/i.test(decoderConfig.codec)) {
			decoderConfig.codec = "vp9";
		}

		if (/^avc1$/i.test(decoderConfig.codec)) {
			decoderConfig.codec = "avc1.640033";
		}
		if (/^h264$/i.test(decoderConfig.codec)) {
			decoderConfig.codec = "avc1.640033";
		}

		const codec = decoderConfig.codec.toLowerCase();
		const shouldPreferSoftwareDecode =
			codec.includes("av01") ||
			codec.includes("av1") ||
			codec.includes("vp09") ||
			codec.includes("vp9");
		const segments = this.splitBySpeed(
			this.computeSegments(this.metadata.duration, trimRegions),
			speedRegions,
		);
		const requiredEndSec = segments[segments.length - 1]?.endSec ?? 0;

		const segmentOutputFrameCounts = segments.map((segment) =>
			Math.ceil(
				((segment.endSec - segment.startSec - EPSILON_SEC) / segment.speed) * targetFrameRate,
			),
		);
		const frameDurationUs = 1_000_000 / targetFrameRate;

		// Async frame queue — decoder pushes, consumer pulls
		const pendingFrames: VideoFrame[] = [];
		let frameResolve: ((frame: VideoFrame | null) => void) | null = null;
		let decodeError: Error | null = null;
		let decodeDone = false;

		this.decoder = new VideoDecoder({
			output: (frame: VideoFrame) => {
				if (frameResolve) {
					const resolve = frameResolve;
					frameResolve = null;
					resolve(frame);
				} else {
					pendingFrames.push(frame);
				}
			},
			error: (e: DOMException) => {
				console.warn(
					`[StreamingVideoDecoder] decoder error for codec "${decoderConfig.codec}":`,
					e.message,
				);
				decodeError = new Error(`VideoDecoder error: ${e.message}`);
				if (frameResolve) {
					const resolve = frameResolve;
					frameResolve = null;
					resolve(null);
				}
			},
		});
		const preferredDecoderConfig = shouldPreferSoftwareDecode
			? {
					...decoderConfig,
					hardwareAcceleration: "prefer-software" as const,
				}
			: decoderConfig;

		try {
			const support = await VideoDecoder.isConfigSupported(preferredDecoderConfig);
			console.log(
				`[StreamingVideoDecoder] isConfigSupported for "${preferredDecoderConfig.codec}":`,
				support.supported,
			);
			if (!support.supported) {
				throw new Error(`Unsupported codec: ${preferredDecoderConfig.codec}`);
			}
			this.decoder.configure(preferredDecoderConfig);
		} catch (error) {
			if (shouldPreferSoftwareDecode) {
				this.decoder.configure(decoderConfig);
			} else if (/^avc1/i.test(codec)) {
				const fallback = { ...decoderConfig, codec: "avc1.640033" };
				console.warn(
					`[StreamingVideoDecoder] codec "${codec}" unsupported, ` +
						`falling back to "${fallback.codec}"`,
				);
				this.decoder.configure(fallback);
			} else {
				throw error;
			}
		}

		const getNextFrame = (): Promise<VideoFrame | null> => {
			if (decodeError) throw decodeError;
			if (pendingFrames.length > 0) return Promise.resolve(pendingFrames.shift()!);
			if (decodeDone) return Promise.resolve(null);
			return new Promise((resolve) => {
				frameResolve = resolve;
			});
		};

		// One forward stream through the whole file.
		// Pass explicit range because some containers are truncated when no end is provided.
		const readEndSec = this.metadata.duration + 0.5;
		const reader = this.demuxer.read("video", 0, readEndSec).getReader();

		// Feed chunks to decoder in background with backpressure
		const feedPromise = (async () => {
			try {
				while (!this.cancelled) {
					const { done, value: chunk } = await reader.read();
					if (done || !chunk) break;

					// Backpressure on both decode queue and decoded frame backlog.
					while (
						(this.decoder!.decodeQueueSize > 10 || pendingFrames.length > 24) &&
						!this.cancelled
					) {
						await new Promise((resolve) => setTimeout(resolve, 1));
					}
					if (this.cancelled) break;

					this.decoder!.decode(chunk);
				}

				if (!this.cancelled && this.decoder!.state === "configured") {
					await this.decoder!.flush();
				}
			} catch (e) {
				decodeError = e instanceof Error ? e : new Error(String(e));
			} finally {
				decodeDone = true;
				if (frameResolve) {
					const resolve = frameResolve;
					frameResolve = null;
					resolve(null);
				}
			}
		})();

		// Route decoded frames into segments by timestamp, then deliver with VFR→CFR resampling
		let segmentIdx = 0;
		let segmentFrameIndex = 0;
		let exportFrameIndex = 0;
		let lastDecodedFrameSec: number | null = null;
		let heldFrame: VideoFrame | null = null;
		let heldFrameSec = 0;

		const emitHeldFrameForTarget = async (segment: {
			startSec: number;
			endSec: number;
			speed: number;
		}) => {
			if (!heldFrame) return false;
			const segmentFrameCount = segmentOutputFrameCounts[segmentIdx];
			if (segmentFrameIndex >= segmentFrameCount) return false;

			const sourceTimeSec =
				segment.startSec + (segmentFrameIndex / targetFrameRate) * segment.speed;
			if (sourceTimeSec >= segment.endSec - EPSILON_SEC) return false;

			const clone = new VideoFrame(heldFrame, { timestamp: heldFrame.timestamp });
			await onFrame(clone, exportFrameIndex * frameDurationUs, sourceTimeSec * 1000);
			segmentFrameIndex++;
			exportFrameIndex++;
			return true;
		};

		while (!this.cancelled && segmentIdx < segments.length) {
			const frame = await getNextFrame();
			if (!frame) break;

			const frameTimeSec = frame.timestamp / 1_000_000;
			lastDecodedFrameSec = frameTimeSec;

			// Finalize completed segments before handling this frame.
			while (
				segmentIdx < segments.length &&
				frameTimeSec >= segments[segmentIdx].endSec - EPSILON_SEC
			) {
				const segment = segments[segmentIdx];
				while (!this.cancelled && (await emitHeldFrameForTarget(segment))) {
					// Keep emitting remaining output frames for this segment from the last known frame.
				}

				segmentIdx++;
				segmentFrameIndex = 0;
				if (
					heldFrame &&
					segmentIdx < segments.length &&
					heldFrameSec < segments[segmentIdx].startSec - EPSILON_SEC
				) {
					heldFrame.close();
					heldFrame = null;
				}
			}

			if (segmentIdx >= segments.length) {
				frame.close();
				continue;
			}

			const currentSegment = segments[segmentIdx];

			// Before current segment (trimmed region or pre-roll).
			if (frameTimeSec < currentSegment.startSec - EPSILON_SEC) {
				frame.close();
				continue;
			}

			if (!heldFrame) {
				heldFrame = frame;
				heldFrameSec = frameTimeSec;
				continue;
			}

			// Any target timestamp before this midpoint is closer to heldFrame than current frame.
			const handoffBoundarySec = (heldFrameSec + frameTimeSec) / 2;
			while (!this.cancelled) {
				const segmentFrameCount = segmentOutputFrameCounts[segmentIdx];
				if (segmentFrameIndex >= segmentFrameCount) {
					break;
				}

				const sourceTimeSec =
					currentSegment.startSec + (segmentFrameIndex / targetFrameRate) * currentSegment.speed;
				if (sourceTimeSec >= currentSegment.endSec - EPSILON_SEC) {
					break;
				}
				if (sourceTimeSec > handoffBoundarySec) {
					break;
				}

				const clone = new VideoFrame(heldFrame, { timestamp: heldFrame.timestamp });
				await onFrame(clone, exportFrameIndex * frameDurationUs, sourceTimeSec * 1000);
				segmentFrameIndex++;
				exportFrameIndex++;
			}

			heldFrame.close();
			heldFrame = frame;
			heldFrameSec = frameTimeSec;
		}

		// Flush remaining output frames for the last decoded frame.
		if (heldFrame && segmentIdx < segments.length) {
			while (!this.cancelled && segmentIdx < segments.length) {
				const segment = segments[segmentIdx];
				if (heldFrameSec < segment.startSec - EPSILON_SEC) {
					break;
				}

				while (!this.cancelled && (await emitHeldFrameForTarget(segment))) {
					// Keep emitting output frames for the active segment.
				}

				segmentIdx++;
				segmentFrameIndex = 0;
				if (
					segmentIdx < segments.length &&
					heldFrameSec < segments[segmentIdx].startSec - EPSILON_SEC
				) {
					break;
				}
			}
			heldFrame.close();
			heldFrame = null;
		}

		// Drain leftover decoded frames
		while (!decodeDone) {
			const frame = await getNextFrame();
			if (!frame) break;
			frame.close();
		}

		try {
			reader.cancel();
		} catch {
			/* already closed */
		}
		await feedPromise;
		for (const f of pendingFrames) f.close();
		pendingFrames.length = 0;

		if (this.decoder?.state === "configured") {
			this.decoder.close();
		}
		this.decoder = null;

		if (
			shouldFailDecodeEndedEarly({
				cancelled: this.cancelled,
				lastDecodedFrameSec,
				requiredEndSec,
				streamDurationSec: this.metadata.streamDuration,
			})
		) {
			const decodedAtLabel =
				lastDecodedFrameSec === null ? "no decoded frame" : `${lastDecodedFrameSec.toFixed(3)}s`;
			const message = `Decode ended early at ${decodedAtLabel} (needed ${requiredEndSec.toFixed(3)}s) – export may be slightly shorter than expected.`;
			console.warn(`[StreamingVideoDecoder] ${message}`);
			onWarning?.(message);
		}
	}

	private computeSegments(
		totalDuration: number,
		trimRegions?: TrimRegion[],
	): Array<{ startSec: number; endSec: number }> {
		if (!trimRegions || trimRegions.length === 0) {
			return [{ startSec: 0, endSec: totalDuration }];
		}

		const sorted = [...trimRegions].sort((a, b) => a.startMs - b.startMs);
		const segments: Array<{ startSec: number; endSec: number }> = [];
		let cursor = 0;

		for (const trim of sorted) {
			const trimStart = trim.startMs / 1000;
			const trimEnd = trim.endMs / 1000;
			if (cursor < trimStart) {
				segments.push({ startSec: cursor, endSec: trimStart });
			}
			cursor = trimEnd;
		}

		if (cursor < totalDuration) {
			segments.push({ startSec: cursor, endSec: totalDuration });
		}

		return segments;
	}

	getExportMetrics(
		targetFrameRate: number,
		trimRegions?: TrimRegion[],
		speedRegions?: SpeedRegion[],
	): { effectiveDuration: number; totalFrames: number } {
		if (!this.metadata) throw new Error("Must call loadMetadata() first");
		const trimSegments = this.computeSegments(this.metadata.duration, trimRegions);
		const segments = this.splitBySpeed(trimSegments, speedRegions);
		return {
			effectiveDuration: segments.reduce(
				(sum, seg) => sum + (seg.endSec - seg.startSec) / seg.speed,
				0,
			),
			totalFrames: segments.reduce((sum, seg) => {
				const segDur = seg.endSec - seg.startSec - EPSILON_SEC;
				return sum + Math.max(0, Math.ceil((segDur / seg.speed) * targetFrameRate));
			}, 0),
		};
	}

	private splitBySpeed(
		segments: Array<{ startSec: number; endSec: number }>,
		speedRegions?: SpeedRegion[],
	): Array<{ startSec: number; endSec: number; speed: number }> {
		if (!speedRegions || speedRegions.length === 0)
			return segments.map((s) => ({ ...s, speed: 1 }));

		const result: Array<{ startSec: number; endSec: number; speed: number }> = [];
		for (const segment of segments) {
			const overlapping = speedRegions
				.filter((sr) => sr.startMs / 1000 < segment.endSec && sr.endMs / 1000 > segment.startSec)
				.sort((a, b) => a.startMs - b.startMs);

			if (overlapping.length === 0) {
				result.push({ ...segment, speed: 1 });
				continue;
			}

			let cursor = segment.startSec;
			for (const sr of overlapping) {
				const srStart = Math.max(sr.startMs / 1000, segment.startSec);
				const srEnd = Math.min(sr.endMs / 1000, segment.endSec);
				if (cursor < srStart) result.push({ startSec: cursor, endSec: srStart, speed: 1 });
				result.push({ startSec: srStart, endSec: srEnd, speed: sr.speed });
				cursor = srEnd;
			}
			if (cursor < segment.endSec)
				result.push({ startSec: cursor, endSec: segment.endSec, speed: 1 });
		}
		return result.filter((s) => s.endSec - s.startSec > 0.0001);
	}

	getDemuxer(): WebDemuxer | null {
		return this.demuxer;
	}

	cancel(): void {
		this.cancelled = true;
	}

	destroy(): void {
		this.cancelled = true;

		if (this.decoder) {
			try {
				if (this.decoder.state === "configured") this.decoder.close();
			} catch {
				/* ignore */
			}
			this.decoder = null;
		}

		if (this.demuxer) {
			try {
				this.demuxer.destroy();
			} catch {
				/* ignore */
			}
			this.demuxer = null;
		}
	}

	private withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const timer = window.setTimeout(() => reject(new Error(message)), timeoutMs);
			promise.then(
				(value) => {
					window.clearTimeout(timer);
					resolve(value);
				},
				(error) => {
					window.clearTimeout(timer);
					reject(error);
				},
			);
		});
	}
}
