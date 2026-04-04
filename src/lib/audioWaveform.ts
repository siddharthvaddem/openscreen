import { fromFileUrl } from "@/components/video-editor/projectPersistence";

export interface AudioWaveformResult {
	peaks: Float32Array;
}

/**
 * Generates waveform peaks using the Web Audio API's decodeAudioData.
 * Much simpler than WebDemuxer - works reliably in Electron's renderer.
 */
export async function generateWaveformPeaks(
	videoUrl: string,
	numPeaks = 2000,
): Promise<AudioWaveformResult> {
	// 1. Read the file bytes
	let arrayBuffer: ArrayBuffer;

	const isFileUrl = /^file:/i.test(videoUrl);
	if (isFileUrl || !/^(https?:|blob:|data:)/i.test(videoUrl)) {
		const rawPath = isFileUrl ? fromFileUrl(videoUrl) : videoUrl;
		if (!window.electronAPI?.readBinaryFile) {
			throw new Error("electronAPI.readBinaryFile not available");
		}
		const result = await window.electronAPI.readBinaryFile(rawPath);
		if (!result.success || !result.data) {
			throw new Error(result.error || result.message || "Failed to read video file");
		}
		arrayBuffer = result.data;
	} else {
		const response = await fetch(videoUrl);
		if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
		arrayBuffer = await response.arrayBuffer();
	}

	// 2. Decode audio from the raw bytes using Web Audio API
	const audioCtx = new AudioContext();
	let audioBuffer: AudioBuffer;
	try {
		audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
	} finally {
		// Close the context immediately — we only needed it for decoding
		audioCtx.close().catch(() => {});
	}

	// 3. Compute peaks — use channel 0 (or mix down if stereo)
	const rawData = audioBuffer.getChannelData(0);
	const samplesPerPeak = Math.floor(rawData.length / numPeaks);
	const peaks = new Float32Array(numPeaks);

	let globalMax = 0;
	for (let i = 0; i < numPeaks; i++) {
		const start = i * samplesPerPeak;
		let max = 0;
		for (let j = 0; j < samplesPerPeak; j++) {
			const abs = Math.abs(rawData[start + j] || 0);
			if (abs > max) max = abs;
		}
		peaks[i] = max;
		if (max > globalMax) globalMax = max;
	}

	// 4. Normalize to 0–1
	if (globalMax > 0) {
		for (let i = 0; i < numPeaks; i++) {
			peaks[i] /= globalMax;
		}
	}

	return { peaks };
}
