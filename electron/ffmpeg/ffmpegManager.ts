import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

let cachedFFmpegPath: string | null = null;
let cachedEncoders: string[] | null = null;

/**
 * Resolves the FFmpeg binary path.
 * - In packaged builds: looks in extraResources/ffmpeg/
 * - In development: looks for system FFmpeg on PATH, or a local vendor copy
 */
export function getFFmpegPath(): string | null {
	if (cachedFFmpegPath !== null) {
		return cachedFFmpegPath;
	}

	const isWin = process.platform === "win32";
	const binaryName = isWin ? "ffmpeg.exe" : "ffmpeg";

	// 1. Packaged build — extraResources
	if (app.isPackaged) {
		const resourcePath = path.join(process.resourcesPath, "ffmpeg", binaryName);
		if (fs.existsSync(resourcePath)) {
			cachedFFmpegPath = resourcePath;
			return cachedFFmpegPath;
		}
	}

	// 2. Development — local vendor directory
	const vendorPath = path.join(app.getAppPath(), "vendor", "ffmpeg", binaryName);
	if (fs.existsSync(vendorPath)) {
		cachedFFmpegPath = vendorPath;
		return cachedFFmpegPath;
	}

	// 3. System PATH fallback
	const systemPath = findOnPath(binaryName);
	if (systemPath) {
		cachedFFmpegPath = systemPath;
		return cachedFFmpegPath;
	}

	cachedFFmpegPath = null;
	return null;
}

/**
 * Checks if FFmpeg is available.
 */
export function isFFmpegAvailable(): boolean {
	return getFFmpegPath() !== null;
}

/**
 * Probes available hardware encoders by running `ffmpeg -encoders`.
 * Caches the result after the first call.
 */
export async function probeHardwareEncoders(): Promise<string[]> {
	if (cachedEncoders !== null) {
		return cachedEncoders;
	}

	const ffmpegPath = getFFmpegPath();
	if (!ffmpegPath) {
		cachedEncoders = [];
		return cachedEncoders;
	}

	try {
		const output = await execFileAsync(ffmpegPath, ["-hide_banner", "-encoders"]);
		const encoders: string[] = [];

		// Check for hardware H.264 encoders
		const hwEncoders = [
			"h264_nvenc", // NVIDIA
			"h264_qsv", // Intel Quick Sync
			"h264_amf", // AMD
		];

		for (const encoder of hwEncoders) {
			if (output.includes(encoder)) {
				// Verify the encoder actually works by trying to initialize it
				const works = await testEncoder(ffmpegPath, encoder);
				if (works) {
					encoders.push(encoder);
				}
			}
		}

		// Software fallback is always available if FFmpeg exists
		if (output.includes("libx264")) {
			encoders.push("libx264");
		}

		cachedEncoders = encoders;
		console.log("[FFmpegManager] Available encoders:", encoders);
		return cachedEncoders;
	} catch (error) {
		console.warn("[FFmpegManager] Failed to probe encoders:", error);
		cachedEncoders = [];
		return cachedEncoders;
	}
}

/**
 * Selects the best available encoder.
 * Priority: NVENC > QSV > AMF > libx264
 */
export async function selectBestEncoder(): Promise<string | null> {
	const encoders = await probeHardwareEncoders();
	const priority = ["h264_nvenc", "h264_qsv", "h264_amf", "libx264"];
	for (const encoder of priority) {
		if (encoders.includes(encoder)) {
			return encoder;
		}
	}
	return null;
}

/**
 * Gets the full FFmpeg capabilities object for the renderer.
 */
export async function getFFmpegCapabilities(): Promise<{
	available: boolean;
	encoders: string[];
	bestEncoder: string | null;
	path: string | null;
}> {
	const ffmpegPath = getFFmpegPath();
	if (!ffmpegPath) {
		return { available: false, encoders: [], bestEncoder: null, path: null };
	}

	const encoders = await probeHardwareEncoders();
	const bestEncoder = await selectBestEncoder();

	return {
		available: true,
		encoders,
		bestEncoder,
		path: ffmpegPath,
	};
}

/**
 * Builds FFmpeg arguments for encoding raw RGBA frames piped to stdin.
 */
export function buildFFmpegArgs(config: {
	width: number;
	height: number;
	frameRate: number;
	encoder: string;
	bitrate: number;
	outputPath: string;
	audioSourcePath?: string;
	hasAudio?: boolean;
}): string[] {
	const args: string[] = [
		"-hide_banner",
		"-loglevel",
		"warning",
		"-y", // overwrite output

		// Input 0: Raw H.264 video stream from stdin (encoded by Chrome's hardware encoder)
		"-f",
		"h264",
		"-r",
		String(config.frameRate),
		"-i",
		"pipe:0",
	];

	// Input 1: audio from source file (if available)
	if (config.audioSourcePath && config.hasAudio) {
		args.push("-i", config.audioSourcePath);
	}

	// Video encoding settings - we just copy the stream since it's already hardware-encoded H.264!
	args.push("-map", "0:v", "-c:v", "copy");

	// Audio settings
	if (config.audioSourcePath && config.hasAudio) {
		args.push("-map", "1:a", "-c:a", "aac", "-b:a", "192k", "-ac", "2");
	}

	// MP4 settings
	args.push(
		"-movflags",
		"+faststart",
		"-shortest", // end when shortest stream ends
		config.outputPath,
	);

	return args;
}

// ---- Helpers ----

function findOnPath(binaryName: string): string | null {
	const pathEnv = process.env.PATH || "";
	const separator = process.platform === "win32" ? ";" : ":";
	const dirs = pathEnv.split(separator);

	for (const dir of dirs) {
		const fullPath = path.join(dir, binaryName);
		if (fs.existsSync(fullPath)) {
			return fullPath;
		}
	}

	return null;
}

function execFileAsync(cmd: string, args: string[]): Promise<string> {
	return new Promise((resolve, reject) => {
		execFile(cmd, args, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
			if (error) {
				reject(error);
				return;
			}
			resolve(stdout + stderr);
		});
	});
}

async function testEncoder(ffmpegPath: string, encoder: string): Promise<boolean> {
	try {
		// Try encoding 1 black frame with the encoder to see if it actually initializes
		// Using 256x256 because some hardware encoders (NVENC/QSV) fail on very small dimensions like 64x64
		await execFileAsync(ffmpegPath, [
			"-hide_banner",
			"-loglevel",
			"error",
			"-f",
			"lavfi",
			"-i",
			"color=c=black:s=256x256:d=0.1",
			"-c:v",
			encoder,
			"-frames:v",
			"1",
			"-f",
			"null",
			"-",
		]);
		return true;
	} catch {
		console.warn(`[FFmpegManager] Encoder ${encoder} failed validation test`);
		return false;
	}
}
