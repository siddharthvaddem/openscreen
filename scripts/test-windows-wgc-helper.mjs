import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const HELPER_PATH =
	process.env.OPENSCREEN_WGC_CAPTURE_EXE ??
	path.join(ROOT, "electron", "native", "bin", "win32-x64", "wgc-capture.exe");

const DURATION_MS = Number(process.env.OPENSCREEN_WGC_TEST_DURATION_MS ?? 5000);
const WITH_SYSTEM_AUDIO =
	process.env.OPENSCREEN_WGC_TEST_SYSTEM_AUDIO === "true" ||
	process.argv.includes("--system-audio");
const WITH_MICROPHONE =
	process.env.OPENSCREEN_WGC_TEST_MICROPHONE === "true" ||
	process.argv.includes("--microphone") ||
	process.argv.includes("--mic");
const WITH_WINDOW =
	process.env.OPENSCREEN_WGC_TEST_WINDOW === "true" || process.argv.includes("--window");
const WITH_WEBCAM =
	process.env.OPENSCREEN_WGC_TEST_WEBCAM === "true" || process.argv.includes("--webcam");
const CAPTURE_CURSOR =
	process.env.OPENSCREEN_WGC_TEST_CAPTURE_CURSOR === "true" ||
	process.argv.includes("--capture-cursor");

function runHelper(config) {
	return new Promise((resolve, reject) => {
		const child = spawn(HELPER_PATH, [JSON.stringify(config)], {
			stdio: ["pipe", "pipe", "pipe"],
			windowsHide: true,
		});

		let stdout = "";
		let stderr = "";
		let stopTimer = null;
		const scheduleStop = () => {
			if (stopTimer) {
				return;
			}
			stopTimer = setTimeout(() => {
				child.stdin.write("stop\n");
			}, DURATION_MS);
		};
		const fallbackTimer = setTimeout(scheduleStop, 15_000);

		child.stdout.on("data", (chunk) => {
			stdout += chunk.toString();
			if (stdout.includes('"recording-started"') || stdout.includes("Recording started")) {
				scheduleStop();
			}
		});
		child.stderr.on("data", (chunk) => {
			stderr += chunk.toString();
		});
		child.once("error", reject);
		child.once("exit", (code) => {
			clearTimeout(fallbackTimer);
			if (stopTimer) {
				clearTimeout(stopTimer);
			}
			resolve({ code, stdout, stderr });
		});
	});
}

function startFixtureWindow() {
	return new Promise((resolve, reject) => {
		const child = spawn("mspaint.exe", [], {
			stdio: ["ignore", "ignore", "ignore"],
			windowsHide: false,
		});

		const poll = setInterval(() => {
			const lookup = spawnSync(
				"powershell",
				[
					"-NoProfile",
					"-Command",
					`(Get-Process -Id ${child.pid} -ErrorAction SilentlyContinue).MainWindowHandle`,
				],
				{ encoding: "utf8", windowsHide: true },
			);
			const handle = lookup.stdout
				.trim()
				.split(/\r?\n/)
				.find((line) => /^\d+$/.test(line.trim()));
			if (handle && handle !== "0") {
				clearInterval(poll);
				clearTimeout(timer);
				resolve({ child, sourceId: `window:${handle.trim()}:0` });
			}
		}, 250);

		const timer = setTimeout(() => {
			clearInterval(poll);
			child.kill();
			reject(new Error("Timed out waiting for fixture window handle"));
		}, 10_000);
		child.once("error", (error) => {
			clearInterval(poll);
			clearTimeout(timer);
			reject(error);
		});
	});
}

function normalizeDeviceName(value) {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}

function scoreDeviceName(candidateName, candidateId, requestedName) {
	const candidate = normalizeDeviceName(candidateName ?? "");
	const id = normalizeDeviceName(candidateId ?? "");
	const requested = normalizeDeviceName(requestedName ?? "");
	if (!requested) return 0;
	if (candidate === requested) return 1000;
	if (candidate.includes(requested) || requested.includes(candidate)) return 900;
	if (id.includes(requested) || requested.includes(id)) return 800;
	return requested
		.split(/\s+/)
		.filter((word) => word.length > 1 && !["camera", "webcam", "video", "input"].includes(word))
		.reduce((score, word) => {
			if (candidate.includes(word)) return score + 100;
			if (id.includes(word)) return score + 50;
			return score;
		}, 0);
}

function resolveDirectShowWebcamClsid(requestedName) {
	if (!requestedName) return "";
	const query = spawnSync(
		"reg.exe",
		["query", "HKCR\\CLSID\\{860BB310-5D01-11D0-BD3B-00A0C911CE86}\\Instance", "/s"],
		{ encoding: "utf8", windowsHide: true },
	);
	if (query.status !== 0) return "";
	const entries = [];
	let current = {};
	for (const rawLine of query.stdout.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line) continue;
		if (/^HKEY_/i.test(line)) {
			if (current.friendlyName || current.clsid) entries.push(current);
			current = {};
			continue;
		}
		const match = line.match(/^(\S+)\s+REG_SZ\s+(.+)$/);
		if (!match) continue;
		if (match[1] === "FriendlyName") current.friendlyName = match[2].trim();
		if (match[1] === "CLSID") current.clsid = match[2].trim();
	}
	if (current.friendlyName || current.clsid) entries.push(current);

	let best = null;
	for (const entry of entries) {
		if (!entry.clsid) continue;
		const score = scoreDeviceName(entry.friendlyName, entry.clsid, requestedName);
		if (!best || score > best.score) {
			best = { ...entry, score };
		}
	}
	return best && best.score > 0 ? best.clsid : "";
}

function probeStreams(outputPath) {
	const ffprobe = spawnSync(
		"ffprobe",
		["-v", "error", "-show_streams", "-of", "json", outputPath],
		{ encoding: "utf8", windowsHide: true },
	);
	if (ffprobe.status !== 0) {
		throw new Error(`ffprobe failed: ${ffprobe.stderr || ffprobe.stdout}`);
	}
	return JSON.parse(ffprobe.stdout).streams ?? [];
}

function measureFirstFrameLuma(outputPath) {
	const ffmpeg = spawnSync(
		"ffmpeg",
		[
			"-v",
			"error",
			"-i",
			outputPath,
			"-frames:v",
			"1",
			"-f",
			"rawvideo",
			"-pix_fmt",
			"gray",
			"pipe:1",
		],
		{ windowsHide: true, maxBuffer: 64 * 1024 * 1024 },
	);
	if (ffmpeg.status !== 0) {
		throw new Error(`ffmpeg frame extraction failed: ${ffmpeg.stderr?.toString() ?? ""}`);
	}
	const data = ffmpeg.stdout;
	if (!data || data.length === 0) {
		throw new Error(`ffmpeg did not return frame data for ${outputPath}`);
	}
	let sum = 0;
	let max = 0;
	for (const value of data) {
		sum += value;
		if (value > max) {
			max = value;
		}
	}
	return { average: sum / data.length, max };
}

if (process.platform !== "win32") {
	console.log("Skipping WGC helper smoke test: Windows-only.");
	process.exit(0);
}

if (!fs.existsSync(HELPER_PATH)) {
	throw new Error(`WGC helper not found at ${HELPER_PATH}. Run npm run build:native:win first.`);
}

const outputPath = path.join(
	os.tmpdir(),
	`openscreen-wgc-helper-${WITH_WEBCAM ? "webcam" : WITH_WINDOW ? "window" : WITH_SYSTEM_AUDIO || WITH_MICROPHONE ? "audio" : "video"}-${process.pid}-${Date.now()}-${randomUUID()}.mp4`,
);
const webcamOutputPath = WITH_WEBCAM ? outputPath.replace(/\.mp4$/i, "-webcam.mp4") : null;

const fixtureWindow = WITH_WINDOW ? await startFixtureWindow() : null;

const config = {
	schemaVersion: 2,
	recordingId: Date.now(),
	outputPath,
	sourceType: fixtureWindow ? "window" : "display",
	sourceId: fixtureWindow ? fixtureWindow.sourceId : "screen:0:0",
	displayId: 0,
	fps: 30,
	videoWidth: 1280,
	videoHeight: 720,
	displayX: 0,
	displayY: 0,
	displayW: 1920,
	displayH: 1080,
	hasDisplayBounds: true,
	captureSystemAudio: WITH_SYSTEM_AUDIO,
	captureMic: WITH_MICROPHONE,
	captureCursor: CAPTURE_CURSOR,
	microphoneDeviceId: process.env.OPENSCREEN_WGC_TEST_MICROPHONE_DEVICE_ID ?? "default",
	microphoneDeviceName: process.env.OPENSCREEN_WGC_TEST_MICROPHONE_DEVICE_NAME ?? "",
	microphoneGain: 1.4,
	webcamEnabled: WITH_WEBCAM,
	webcamDeviceId: process.env.OPENSCREEN_WGC_TEST_WEBCAM_DEVICE_ID ?? "",
	webcamDeviceName: process.env.OPENSCREEN_WGC_TEST_WEBCAM_DEVICE_NAME ?? "",
	webcamDirectShowClsid: resolveDirectShowWebcamClsid(
		process.env.OPENSCREEN_WGC_TEST_WEBCAM_DEVICE_NAME ?? "",
	),
	webcamWidth: 640,
	webcamHeight: 360,
	webcamFps: 30,
	outputs: {
		screenPath: outputPath,
		...(webcamOutputPath ? { webcamPath: webcamOutputPath } : {}),
	},
};

let result;
try {
	result = await runHelper(config);
} finally {
	if (fixtureWindow) {
		fixtureWindow.child.kill();
	}
}
if (result.code !== 0) {
	if (
		WITH_WEBCAM &&
		/No native Windows webcam devices were found|Failed to initialize native webcam/.test(
			result.stderr,
		)
	) {
		console.log("Skipping WGC webcam smoke test: no native Windows webcam device is available.");
		process.exit(0);
	}
	throw new Error(`WGC helper exited with ${result.code}\n${result.stdout}\n${result.stderr}`);
}
if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
	throw new Error(`WGC helper did not produce a video at ${outputPath}`);
}
if (WITH_WEBCAM && (!fs.existsSync(webcamOutputPath) || fs.statSync(webcamOutputPath).size === 0)) {
	throw new Error(`WGC helper did not produce a webcam video at ${webcamOutputPath}`);
}

const streams = probeStreams(outputPath);
const webcamStreams =
	webcamOutputPath && fs.existsSync(webcamOutputPath) ? probeStreams(webcamOutputPath) : [];
const hasVideo = streams.some((stream) => stream.codec_type === "video");
const hasAudio = streams.some((stream) => stream.codec_type === "audio");
const webcamFormatLine = result.stdout
	.split(/\r?\n/)
	.find((line) => line.includes('"event":"webcam-format"'));
const webcamFormat = webcamFormatLine ? JSON.parse(webcamFormatLine) : null;
const audioFormatLine = result.stdout
	.split(/\r?\n/)
	.find((line) => line.includes('"event":"audio-format"'));
const audioFormat = audioFormatLine ? JSON.parse(audioFormatLine) : null;
const cursorCaptureLine = result.stdout
	.split(/\r?\n/)
	.find((line) => line.includes('"event":"cursor-capture"'));
const cursorCapture = cursorCaptureLine ? JSON.parse(cursorCaptureLine) : null;
const nativeWebcamDiagnostics = result.stderr
	.split(/\r?\n/)
	.filter((line) => line.includes("Native webcam candidate"));
const nativeMicrophoneDiagnostics = result.stderr
	.split(/\r?\n/)
	.filter(
		(line) =>
			line.includes("Native microphone candidate") ||
			line.includes("Selected native microphone endpoint"),
	);
if (!hasVideo) {
	throw new Error(`WGC helper output has no video stream: ${outputPath}`);
}
if (WITH_WEBCAM && !webcamStreams.some((stream) => stream.codec_type === "video")) {
	throw new Error(`WGC helper webcam output has no video stream: ${webcamOutputPath}`);
}
if (
	(CAPTURE_CURSOR && !cursorCapture) ||
	(cursorCapture &&
		(cursorCapture.requested !== CAPTURE_CURSOR || cursorCapture.applied !== CAPTURE_CURSOR))
) {
	throw new Error(
		`WGC helper did not apply requested cursor capture mode (${CAPTURE_CURSOR}): ${result.stdout}`,
	);
}
if ((WITH_SYSTEM_AUDIO || WITH_MICROPHONE) && !hasAudio) {
	throw new Error(`WGC helper output has no audio stream: ${outputPath}`);
}
const frameLuma = measureFirstFrameLuma(outputPath);
if (frameLuma.average < 1 && frameLuma.max < 5) {
	throw new Error(
		`WGC helper output first frame is black: ${outputPath}\n${result.stdout}\n${result.stderr}`,
	);
}

console.log(
	JSON.stringify(
		{
			success: true,
			outputPath,
			webcamOutputPath,
			bytes: fs.statSync(outputPath).size,
			webcamBytes:
				webcamOutputPath && fs.existsSync(webcamOutputPath)
					? fs.statSync(webcamOutputPath).size
					: undefined,
			streams: streams.map((stream) => ({
				index: stream.index,
				codecType: stream.codec_type,
				codecName: stream.codec_name,
				duration: stream.duration,
			})),
			webcamStreams: webcamStreams.map((stream) => ({
				index: stream.index,
				codecType: stream.codec_type,
				codecName: stream.codec_name,
				width: stream.width,
				height: stream.height,
				duration: stream.duration,
			})),
			cursorCapture,
			selectedMicrophoneDeviceName: audioFormat?.microphoneDeviceName,
			selectedWebcamDeviceName: webcamFormat?.deviceName,
			nativeMicrophoneDiagnostics,
			nativeWebcamDiagnostics,
			firstFrameLuma: frameLuma,
		},
		null,
		2,
	),
);
