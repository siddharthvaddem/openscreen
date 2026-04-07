import { loadRnnoise, RnnoiseWorkletNode } from "@sapphi-red/web-noise-suppressor";
import rnnoiseWasmPath from "@sapphi-red/web-noise-suppressor/rnnoise.wasm?url";
import rnnoiseSimdWasmPath from "@sapphi-red/web-noise-suppressor/rnnoise_simd.wasm?url";
import rnnoiseWorkletPath from "@sapphi-red/web-noise-suppressor/rnnoiseWorklet.js?url";

let rnnoiseWasmBinary: ArrayBuffer | null = null;
let workletRegistered = false;

export type NoiseReductionLevel = "light" | "moderate" | "aggressive";

const LEVEL_PRESETS: Record<
	NoiseReductionLevel,
	{
		highPassFreq: number;
		lowPassFreq: number;
		compressorThreshold: number;
		compressorRatio: number;
		compressorKnee: number;
		/** Post-RNNoise expander threshold in dB — signals below this are further suppressed */
		gateThreshold: number;
		gateReduction: number;
	}
> = {
	light: {
		highPassFreq: 120,
		lowPassFreq: 10000,
		compressorThreshold: -20,
		compressorRatio: 4,
		compressorKnee: 20,
		gateThreshold: -50,
		gateReduction: 0.15,
	},
	moderate: {
		highPassFreq: 250,
		lowPassFreq: 7000,
		compressorThreshold: -26,
		compressorRatio: 8,
		compressorKnee: 12,
		gateThreshold: -40,
		gateReduction: 0.05,
	},
	aggressive: {
		highPassFreq: 400,
		lowPassFreq: 5000,
		compressorThreshold: -32,
		compressorRatio: 14,
		compressorKnee: 6,
		gateThreshold: -30,
		gateReduction: 0.01,
	},
};

/**
 * Pre-loads the RNNoise WASM binary so it's ready when recording starts.
 * Safe to call multiple times — caches the result.
 */
export async function preloadRnnoiseWasm(): Promise<ArrayBuffer> {
	if (rnnoiseWasmBinary) return rnnoiseWasmBinary;

	rnnoiseWasmBinary = await loadRnnoise({
		url: rnnoiseWasmPath,
		simdUrl: rnnoiseSimdWasmPath,
	});

	return rnnoiseWasmBinary;
}

async function registerRnnoiseWorklet(audioContext: AudioContext): Promise<void> {
	if (workletRegistered) return;

	await audioContext.audioWorklet.addModule(rnnoiseWorkletPath);
	workletRegistered = true;
}

export type AudioEnhancementNodes = {
	/** Connect microphone source to this node */
	input: AudioNode;
	/** Connect this node to destination/gain */
	output: AudioNode;
	/** Call to clean up RNNoise worklet */
	destroy: () => void;
};

/**
 * Creates a noise-gate effect using Web Audio API nodes.
 * Monitors the signal level and reduces gain when below the threshold.
 *
 * This runs on a periodic timer analyzing frequency data from the
 * AnalyserNode and adjusting a GainNode accordingly.
 */
function createNoiseGate(
	ctx: AudioContext,
	threshold: number,
	reduction: number,
): { input: GainNode; output: GainNode; destroy: () => void } {
	const inputGain = ctx.createGain();
	const analyser = ctx.createAnalyser();
	analyser.fftSize = 256;
	analyser.smoothingTimeConstant = 0.85;
	const outputGain = ctx.createGain();

	inputGain.connect(analyser);
	inputGain.connect(outputGain);

	const dataArray = new Float32Array(analyser.frequencyBinCount);
	const thresholdLinear = Math.pow(10, threshold / 20);

	let rafId: number | null = null;

	const monitor = () => {
		analyser.getFloatTimeDomainData(dataArray);

		let peak = 0;
		for (let i = 0; i < dataArray.length; i++) {
			const abs = Math.abs(dataArray[i]);
			if (abs > peak) peak = abs;
		}

		const target = peak > thresholdLinear ? 1.0 : reduction;
		// Smooth transition to avoid clicks
		outputGain.gain.setTargetAtTime(target, ctx.currentTime, 0.02);

		rafId = requestAnimationFrame(monitor);
	};

	monitor();

	return {
		input: inputGain,
		output: outputGain,
		destroy: () => {
			if (rafId !== null) cancelAnimationFrame(rafId);
		},
	};
}

/**
 * Creates an audio enhancement chain with configurable aggressiveness:
 *
 * Light:      highpass(60Hz) → lowpass(14kHz) → RNNoise → soft gate → compressor
 * Moderate:   highpass(100Hz) → lowpass(11kHz) → RNNoise → medium gate → compressor
 * Aggressive: highpass(150Hz) → lowpass(9kHz) → RNNoise → hard gate → compressor
 */
export async function createAudioEnhancementChain(
	audioContext: AudioContext,
	level: NoiseReductionLevel = "moderate",
): Promise<AudioEnhancementNodes> {
	const preset = LEVEL_PRESETS[level];
	const isAggressive = level === "aggressive";
	const filterQ = isAggressive ? 1.4 : level === "moderate" ? 1.0 : 0.7;

	// High-pass filter: removes low-frequency rumble (2-stage for steeper rolloff)
	const highPass1 = audioContext.createBiquadFilter();
	highPass1.type = "highpass";
	highPass1.frequency.value = preset.highPassFreq;
	highPass1.Q.value = filterQ;

	const highPass2 = audioContext.createBiquadFilter();
	highPass2.type = "highpass";
	highPass2.frequency.value = preset.highPassFreq * 0.7;
	highPass2.Q.value = filterQ;

	// Low-pass filter: removes high-frequency hiss (2-stage for steeper rolloff)
	const lowPass1 = audioContext.createBiquadFilter();
	lowPass1.type = "lowpass";
	lowPass1.frequency.value = preset.lowPassFreq;
	lowPass1.Q.value = filterQ;

	const lowPass2 = audioContext.createBiquadFilter();
	lowPass2.type = "lowpass";
	lowPass2.frequency.value = preset.lowPassFreq * 1.2;
	lowPass2.Q.value = filterQ;

	// Dynamics compressor: normalizes volume and prevents clipping
	const compressor = audioContext.createDynamicsCompressor();
	compressor.threshold.value = preset.compressorThreshold;
	compressor.knee.value = preset.compressorKnee;
	compressor.ratio.value = preset.compressorRatio;
	compressor.attack.value = 0.003;
	compressor.release.value = 0.15;

	// Noise gate: suppresses residual noise below threshold
	const gate = createNoiseGate(audioContext, preset.gateThreshold, preset.gateReduction);

	// Try to load RNNoise (graceful degradation if it fails)
	// Build filter chain: hp1 → hp2 → lp1 → lp2
	highPass1.connect(highPass2);
	highPass2.connect(lowPass1);
	lowPass1.connect(lowPass2);

	let rnnoiseNode: RnnoiseWorkletNode | null = null;
	try {
		const wasmBinary = await preloadRnnoiseWasm();
		await registerRnnoiseWorklet(audioContext);

		rnnoiseNode = new RnnoiseWorkletNode(audioContext, {
			maxChannels: 1,
			wasmBinary,
		});

		// Chain: filters → rnnoise → gate → compressor
		lowPass2.connect(rnnoiseNode);
		rnnoiseNode.connect(gate.input);
		gate.output.connect(compressor);
	} catch {
		// Fallback: filters → gate → compressor (no RNNoise)
		lowPass2.connect(gate.input);
		gate.output.connect(compressor);
	}

	return {
		input: highPass1,
		output: compressor,
		destroy: () => {
			gate.destroy();
			rnnoiseNode?.destroy();
		},
	};
}
