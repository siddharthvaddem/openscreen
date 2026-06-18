import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { generateCaptionsWithWhisper } from "./whisper";

const baseRequest = {
	jobId: "job-1",
	videoPath: path.join("/recordings", "recording.webm"),
	platform: "darwin",
	arch: "arm64",
	resourcesPath: "/resources",
	tempDir: "/tmp",
	env: {},
};

describe("generateCaptionsWithWhisper", () => {
	it("reports unavailable when helper assets are missing", async () => {
		const result = await generateCaptionsWithWhisper(baseRequest, {
			exists: vi.fn(async () => false),
			readFile: vi.fn(),
			rm: vi.fn(),
			mkdir: vi.fn(),
			runProcess: vi.fn(),
		});

		expect(result).toEqual({
			jobId: "job-1",
			status: "unavailable",
			segments: [],
			message: "Local caption tools are not available.",
		});
	});

	it("uses process env helper overrides when request env is omitted", async () => {
		const previousWhisperBin = process.env.OPENSCREEN_WHISPER_CPP_BIN;
		const previousModelPath = process.env.OPENSCREEN_WHISPER_MODEL_PATH;
		const previousFfmpegPath = process.env.OPENSCREEN_FFMPEG_PATH;
		process.env.OPENSCREEN_WHISPER_CPP_BIN = "/env/whisper-cli";
		process.env.OPENSCREEN_WHISPER_MODEL_PATH = "/env/ggml-base.bin";
		process.env.OPENSCREEN_FFMPEG_PATH = "/env/ffmpeg";

		const request = {
			jobId: "job-1",
			videoPath: path.join("/recordings", "recording.webm"),
			platform: "darwin",
			arch: "arm64",
			resourcesPath: "/resources",
			tempDir: "/tmp",
		};
		const runProcess = vi
			.fn()
			.mockResolvedValueOnce({ code: 0, stdout: "", stderr: "" })
			.mockResolvedValueOnce({ code: 0, stdout: "", stderr: "" });

		try {
			const result = await generateCaptionsWithWhisper(request, {
				exists: vi.fn(async (filePath) => filePath.startsWith("/env/")),
				readFile: vi.fn(async () =>
					JSON.stringify({
						transcription: [{ offsets: { from: 0, to: 1000 }, text: "hello" }],
					}),
				),
				rm: vi.fn(),
				mkdir: vi.fn(),
				runProcess,
			});

			expect(result.status).toBe("success");
			expect(runProcess.mock.calls[0][0]).toBe("/env/ffmpeg");
			expect(runProcess.mock.calls[1][0]).toBe("/env/whisper-cli");
			expect(runProcess.mock.calls[1][1]).toContain("/env/ggml-base.bin");
		} finally {
			if (previousWhisperBin === undefined) {
				delete process.env.OPENSCREEN_WHISPER_CPP_BIN;
			} else {
				process.env.OPENSCREEN_WHISPER_CPP_BIN = previousWhisperBin;
			}
			if (previousModelPath === undefined) {
				delete process.env.OPENSCREEN_WHISPER_MODEL_PATH;
			} else {
				process.env.OPENSCREEN_WHISPER_MODEL_PATH = previousModelPath;
			}
			if (previousFfmpegPath === undefined) {
				delete process.env.OPENSCREEN_FFMPEG_PATH;
			} else {
				process.env.OPENSCREEN_FFMPEG_PATH = previousFfmpegPath;
			}
		}
	});

	it("prefers the bundled small model over the base fallback", async () => {
		const runProcess = vi
			.fn()
			.mockResolvedValueOnce({ code: 0, stdout: "", stderr: "" })
			.mockResolvedValueOnce({ code: 0, stdout: "", stderr: "" });
		const readFile = vi.fn(async () =>
			JSON.stringify({
				transcription: [{ offsets: { from: 0, to: 1000 }, text: "hello" }],
			}),
		);

		await generateCaptionsWithWhisper(baseRequest, {
			exists: vi.fn(async () => true),
			readFile,
			rm: vi.fn(),
			mkdir: vi.fn(),
			runProcess,
		});

		expect(runProcess.mock.calls[1][1]).toContain(
			path.join("/resources", "electron", "native", "captions", "darwin-arm64", "ggml-small.bin"),
		);
	});

	it("skips videos without an audio stream", async () => {
		const runProcess = vi.fn().mockResolvedValueOnce({
			code: 1,
			stdout: "",
			stderr: "Stream map '0:a:0' matches no streams.",
		});

		const result = await generateCaptionsWithWhisper(baseRequest, {
			exists: vi.fn(async () => true),
			readFile: vi.fn(),
			rm: vi.fn(),
			mkdir: vi.fn(),
			runProcess,
		});

		expect(result.status).toBe("skipped");
		expect(result.message).toBe("No audio track found; captions skipped.");
	});

	it("sanitizes job ids before building cleanup paths", async () => {
		const runProcess = vi
			.fn()
			.mockResolvedValueOnce({ code: 0, stdout: "", stderr: "" })
			.mockResolvedValueOnce({ code: 0, stdout: "", stderr: "" });
		const rm = vi.fn();
		const request = {
			...baseRequest,
			jobId: "foo/../../outside",
		};

		const result = await generateCaptionsWithWhisper(request, {
			exists: vi.fn(async () => true),
			readFile: vi.fn(async () =>
				JSON.stringify({
					transcription: [{ offsets: { from: 0, to: 1000 }, text: "hello" }],
				}),
			),
			rm,
			mkdir: vi.fn(),
			runProcess,
		});

		const cleanupPath = rm.mock.calls[0][0];
		const relativeCleanupPath = path.relative("/tmp", cleanupPath);
		expect(result.jobId).toBe("foo/../../outside");
		expect(cleanupPath).toBe(path.join("/tmp", "openscreen-captions-foo-------outside"));
		expect(relativeCleanupPath.startsWith("..")).toBe(false);
		expect(relativeCleanupPath.split(path.sep)).not.toContain("..");
	});

	it("extracts audio, runs whisper, and parses generated JSON", async () => {
		const runProcess = vi
			.fn()
			.mockResolvedValueOnce({ code: 0, stdout: "", stderr: "" })
			.mockResolvedValueOnce({ code: 0, stdout: "", stderr: "" });
		const readFile = vi.fn(async () =>
			JSON.stringify({
				transcription: [{ offsets: { from: 0, to: 1000 }, text: "hello" }],
			}),
		);

		const result = await generateCaptionsWithWhisper(baseRequest, {
			exists: vi.fn(async () => true),
			readFile,
			rm: vi.fn(),
			mkdir: vi.fn(),
			runProcess,
		});

		expect(result).toEqual({
			jobId: "job-1",
			status: "success",
			segments: [{ id: "caption-1", startMs: 0, endMs: 1000, text: "hello" }],
			message: "Generated 1 captions.",
		});
		expect(runProcess).toHaveBeenCalledTimes(2);
		expect(runProcess.mock.calls[0][1]).toContain("-map");
		expect(runProcess.mock.calls[1][1]).toContain("-oj");
	});

	it("retries whisper on CPU when macOS GPU initialization fails", async () => {
		const runProcess = vi
			.fn()
			.mockResolvedValueOnce({ code: 0, stdout: "", stderr: "" })
			.mockResolvedValueOnce({
				code: -1,
				stdout: "",
				stderr: "ggml_metal_buffer_init: error: failed to allocate buffer",
			})
			.mockResolvedValueOnce({ code: 0, stdout: "", stderr: "" });
		const readFile = vi.fn(async () =>
			JSON.stringify({
				transcription: [{ offsets: { from: 0, to: 1000 }, text: "hello" }],
			}),
		);

		const result = await generateCaptionsWithWhisper(baseRequest, {
			exists: vi.fn(async () => true),
			readFile,
			rm: vi.fn(),
			mkdir: vi.fn(),
			runProcess,
		});

		expect(result.status).toBe("success");
		expect(runProcess).toHaveBeenCalledTimes(3);
		expect(runProcess.mock.calls[1][1]).not.toContain("--no-gpu");
		expect(runProcess.mock.calls[2][1]).toContain("--no-gpu");
	});
});
