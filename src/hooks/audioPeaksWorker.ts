/**
 * Web Worker: computes min/max peak pairs from raw audio channel data.
 *
 * Input message:  { channels: Float32Array[]; duration: number }
 * Output message: Float32Array of length 2*N — [min0, max0, min1, max1, …]
 *
 * Channel buffers are transferred (zero-copy) from the caller.
 * The peaks buffer is transferred back.
 */
self.onmessage = (event: MessageEvent<{ channels: Float32Array[]; duration: number }>) => {
	const { channels, duration } = event.data;
	const nCh = channels.length;
	if (nCh === 0) {
		(self as unknown as Worker).postMessage(new Float32Array(0));
		return;
	}

	const totalSamples = channels[0].length;
	const N = Math.min(24000, Math.ceil(duration * 200));
	const blockSize = totalSamples / N;
	const peaks = new Float32Array(N * 2); // [min0, max0, min1, max1, …]

	for (let i = 0; i < N; i++) {
		const start = Math.floor(i * blockSize);
		const end = Math.floor((i + 1) * blockSize);
		let minVal = 0;
		let maxVal = 0;
		for (let j = start; j < end; j++) {
			let sample = 0;
			for (let c = 0; c < nCh; c++) sample += channels[c][j];
			sample /= nCh;
			if (sample < minVal) minVal = sample;
			if (sample > maxVal) maxVal = sample;
		}
		peaks[i * 2] = minVal;
		peaks[i * 2 + 1] = maxVal;
	}

	(self as unknown as Worker).postMessage(peaks, [peaks.buffer]);
};
