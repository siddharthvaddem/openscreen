import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { CaptionGenerationResult } from "../../src/lib/captions";
import { parseWhisperJsonOutput } from "../../src/lib/captions";

type RunProcessResult = {
	code: number | null;
	stdout: string;
	stderr: string;
};

type RunProcess = (
	command: string,
	args: string[],
	options?: { signal?: AbortSignal },
) => Promise<RunProcessResult>;

export type GenerateCaptionsWithWhisperRequest = {
	jobId: string;
	videoPath: string;
	platform: NodeJS.Platform | string;
	arch: string;
	resourcesPath: string;
	tempDir?: string;
	env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
	language?: string;
	signal?: AbortSignal;
};

export type WhisperCaptionDeps = {
	exists?: (filePath: string) => Promise<boolean>;
	mkdir?: typeof fs.mkdir;
	readFile?: typeof fs.readFile;
	rm?: typeof fs.rm;
	runProcess?: RunProcess;
};

async function exists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

function runProcess(command: string, args: string[], options: { signal?: AbortSignal } = {}) {
	return new Promise<RunProcessResult>((resolve, reject) => {
		const child = spawn(command, args, {
			stdio: ["ignore", "pipe", "pipe"],
			signal: options.signal,
		});
		let stdout = "";
		let stderr = "";
		child.stdout.on("data", (chunk) => {
			stdout += chunk.toString();
		});
		child.stderr.on("data", (chunk) => {
			stderr += chunk.toString();
		});
		child.on("error", (error) => {
			if (options.signal?.aborted) {
				resolve({ code: null, stdout, stderr: String(error) });
				return;
			}
			reject(error);
		});
		child.on("close", (code) => resolve({ code, stdout, stderr }));
	});
}

function candidateResourcePaths(
	request: GenerateCaptionsWithWhisperRequest,
	fileName: string | string[],
	envName: string,
) {
	const envPath = (request.env ?? process.env)[envName]?.trim();
	const platformArch = `${request.platform}-${request.arch}`;
	const fileNames = Array.isArray(fileName) ? fileName : [fileName];
	return [
		envPath || null,
		...fileNames.flatMap((name) => [
			path.join(request.resourcesPath, "electron", "native", "captions", platformArch, name),
			path.join(request.resourcesPath, "captions", platformArch, name),
		]),
	].filter((value): value is string => Boolean(value));
}

async function firstExistingPath(
	paths: string[],
	deps: Required<Pick<WhisperCaptionDeps, "exists">>,
) {
	for (const candidate of paths) {
		if (await deps.exists(candidate)) {
			return candidate;
		}
	}
	return null;
}

async function resolveCaptionTools(
	request: GenerateCaptionsWithWhisperRequest,
	deps: Required<Pick<WhisperCaptionDeps, "exists">>,
) {
	const whisperBinaryName = request.platform === "win32" ? "whisper-cli.exe" : "whisper-cli";
	const ffmpegBinaryName = request.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
	const whisperPath = await firstExistingPath(
		candidateResourcePaths(request, whisperBinaryName, "OPENSCREEN_WHISPER_CPP_BIN"),
		deps,
	);
	const modelPath = await firstExistingPath(
		candidateResourcePaths(
			request,
			["ggml-small.bin", "ggml-base.bin"],
			"OPENSCREEN_WHISPER_MODEL_PATH",
		),
		deps,
	);
	const ffmpegPath = await firstExistingPath(
		candidateResourcePaths(request, ffmpegBinaryName, "OPENSCREEN_FFMPEG_PATH"),
		deps,
	);

	return { whisperPath, modelPath, ffmpegPath };
}

function isNoAudioError(stderr: string) {
	return (
		stderr.includes("matches no streams") ||
		stderr.includes("Stream map") ||
		stderr.toLowerCase().includes("audio:0")
	);
}

function isMacGpuInitializationError(request: GenerateCaptionsWithWhisperRequest, output: string) {
	if (request.platform !== "darwin") {
		return false;
	}

	const normalizedOutput = output.toLowerCase();
	return (
		normalizedOutput.includes("ggml_metal") ||
		normalizedOutput.includes("metal") ||
		normalizedOutput.includes("no gpu found")
	);
}

export async function generateCaptionsWithWhisper(
	request: GenerateCaptionsWithWhisperRequest,
	deps: WhisperCaptionDeps = {},
): Promise<CaptionGenerationResult> {
	const resolvedDeps = {
		exists: deps.exists ?? exists,
		mkdir: deps.mkdir ?? fs.mkdir,
		readFile: deps.readFile ?? fs.readFile,
		rm: deps.rm ?? fs.rm,
		runProcess: deps.runProcess ?? runProcess,
	};

	const tools = await resolveCaptionTools(request, resolvedDeps);
	if (!tools.whisperPath || !tools.modelPath || !tools.ffmpegPath) {
		return {
			jobId: request.jobId,
			status: "unavailable",
			segments: [],
			message: "Local caption tools are not available.",
		};
	}

	const tempRoot = request.tempDir ?? os.tmpdir();
	const safeJobId = request.jobId.replace(/[^a-zA-Z0-9_-]/g, "-") || "job";
	const jobDir = path.join(tempRoot, `openscreen-captions-${safeJobId}`);
	const wavPath = path.join(jobDir, "audio.wav");
	const outputBase = path.join(jobDir, "transcript");
	const outputJsonPath = `${outputBase}.json`;

	try {
		await resolvedDeps.mkdir(jobDir, { recursive: true });
		const extract = await resolvedDeps.runProcess(
			tools.ffmpegPath,
			[
				"-y",
				"-i",
				request.videoPath,
				"-map",
				"0:a:0",
				"-vn",
				"-ac",
				"1",
				"-ar",
				"16000",
				"-f",
				"wav",
				wavPath,
			],
			{ signal: request.signal },
		);

		if (request.signal?.aborted) {
			return { jobId: request.jobId, status: "cancelled", segments: [] };
		}

		if (extract.code !== 0) {
			if (isNoAudioError(extract.stderr)) {
				return {
					jobId: request.jobId,
					status: "skipped",
					segments: [],
					message: "No audio track found; captions skipped.",
				};
			}
			return {
				jobId: request.jobId,
				status: "error",
				segments: [],
				message: "Failed to extract audio for captions.",
				error: extract.stderr || extract.stdout,
			};
		}

		const whisperArgs = [
			"-m",
			tools.modelPath,
			"-f",
			wavPath,
			"-oj",
			"-of",
			outputBase,
			"--no-prints",
		];
		if (request.language) {
			whisperArgs.push("-l", request.language);
		}

		let whisper = await resolvedDeps.runProcess(tools.whisperPath, whisperArgs, {
			signal: request.signal,
		});

		if (request.signal?.aborted) {
			return { jobId: request.jobId, status: "cancelled", segments: [] };
		}

		if (
			whisper.code !== 0 &&
			isMacGpuInitializationError(request, `${whisper.stderr}\n${whisper.stdout}`)
		) {
			whisper = await resolvedDeps.runProcess(tools.whisperPath, [...whisperArgs, "--no-gpu"], {
				signal: request.signal,
			});

			if (request.signal?.aborted) {
				return { jobId: request.jobId, status: "cancelled", segments: [] };
			}
		}

		if (whisper.code !== 0) {
			return {
				jobId: request.jobId,
				status: "error",
				segments: [],
				message: "Local caption transcription failed.",
				error: whisper.stderr || whisper.stdout,
			};
		}

		const jsonOutput = await resolvedDeps.readFile(outputJsonPath, "utf-8");
		const segments = parseWhisperJsonOutput(String(jsonOutput));
		return {
			jobId: request.jobId,
			status: "success",
			segments,
			message: `Generated ${segments.length} captions.`,
		};
	} finally {
		try {
			await resolvedDeps.rm(jobDir, { recursive: true, force: true });
		} catch {
			// Best-effort cleanup should not mask the caption result.
		}
	}
}
