#!/usr/bin/env node
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const BOOLEAN_FLAGS = new Set(["gif-loop", "json", "overwrite", "show-blur", "system-audio"]);

const ASPECT_RATIOS = new Set(["16:9", "9:16", "1:1", "4:3", "4:5", "16:10", "10:16", "native"]);
const ZOOM_DEPTHS = new Set([1, 2, 3, 4, 5, 6]);
const ROTATION_PRESETS = new Set(["iso", "left", "right"]);

function usage() {
	console.log(`OpenScreen CLI

Usage:
  openscreen record --duration <seconds> [options]
  openscreen project create --video <path> --output <path> [options]
  openscreen project info --project <path> [--json]
  openscreen project edit --project <path> [options]
  openscreen zoom add --project <path> --start <ms> --end <ms> [options]
  openscreen zoom list --project <path> [--json]
  openscreen zoom remove --project <path> --id <id>
  openscreen trim add --project <path> --start <ms> --end <ms>
  openscreen trim list --project <path> [--json]
  openscreen trim remove --project <path> --id <id>
  openscreen speed add --project <path> --start <ms> --end <ms> --speed <n>
  openscreen speed list --project <path> [--json]
  openscreen speed remove --project <path> --id <id>
  openscreen render --project <path> --output <path> [options]

Record options:
  --source <id-or-name>       Source id, exact name, or name substring.
  --source-type <type>        screen, window, or any. Default: any.
  --system-audio              Try to include system audio.

Project/edit options:
  --aspect-ratio <ratio>      16:9, 9:16, 1:1, 4:3, 4:5, 16:10, 10:16, native.
  --wallpaper <value>         Wallpaper path, color, gradient, data URL, or file URL.
  --padding <n>               Padding 0-100.
  --border-radius <n>         Border radius.
  --shadow-intensity <n>      Shadow intensity.
  --show-blur / --no-show-blur
  --motion-blur <n>           Motion blur amount 0-1.
  --export-quality <q>        medium, good, source.
  --export-format <format>    mp4 or gif.

Render options:
  --format <format>           mp4 or gif. Defaults from output extension/project.
  --quality <q>               medium, good, source.
  --width <px>                MP4 output width. Requires --height.
  --height <px>               MP4 output height. Requires --width.
  --gif-frame-rate <fps>      15, 20, 25, 30.
  --gif-size-preset <preset>  medium, large, original.
  --gif-loop / --no-gif-loop
  --overwrite                 Replace existing output.
  --json                      Emit machine-readable JSON.

Before recording/rendering:
  npm install
  npm run build-vite
`);
}

function parseFlags(argv) {
	const options = { _: [] };

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (!arg.startsWith("--")) {
			options._.push(arg);
			continue;
		}

		let name = arg.slice(2);
		if (name.startsWith("no-")) {
			name = name.slice(3);
			options[name] = false;
			continue;
		}

		if (BOOLEAN_FLAGS.has(name)) {
			options[name] = true;
			continue;
		}

		const next = argv[i + 1];
		if (!next || next.startsWith("--")) {
			throw new Error(`Missing value for --${name}`);
		}
		options[name] = next;
		i++;
	}

	return options;
}

function requireOption(options, name) {
	const value = options[name];
	if (typeof value !== "string" || !value.trim()) {
		throw new Error(`Missing --${name}`);
	}
	return value;
}

function parseNumber(value, name) {
	const number = Number(value);
	if (!Number.isFinite(number)) {
		throw new Error(`--${name} must be a number.`);
	}
	return number;
}

function parseMs(value, name) {
	if (typeof value !== "string") {
		throw new Error(`Missing --${name}`);
	}
	const normalized = value.trim().toLowerCase();
	const number = normalized.endsWith("s")
		? Number(normalized.slice(0, -1)) * 1000
		: Number(normalized);
	if (!Number.isFinite(number) || number < 0) {
		throw new Error(`--${name} must be a non-negative millisecond value or seconds value like 2s.`);
	}
	return Math.round(number);
}

function parseRange(options) {
	const start = parseMs(options.start ?? options["start-ms"], "start");
	const end = parseMs(options.end ?? options["end-ms"], "end");
	if (end <= start) {
		throw new Error("--end must be greater than --start.");
	}
	return { startMs: start, endMs: end };
}

function parseAspectRatio(value) {
	if (value === undefined) return undefined;
	if (!ASPECT_RATIOS.has(value)) {
		throw new Error(`Unsupported aspect ratio: ${value}`);
	}
	return value;
}

function parseExportQuality(value) {
	if (value === undefined) return undefined;
	if (value !== "medium" && value !== "good" && value !== "source") {
		throw new Error("--quality/--export-quality must be medium, good, or source.");
	}
	return value;
}

function parseExportFormat(value) {
	if (value === undefined) return undefined;
	if (value !== "mp4" && value !== "gif") {
		throw new Error("--format/--export-format must be mp4 or gif.");
	}
	return value;
}

function parseDimensionOption(options, name) {
	if (options[name] === undefined) return undefined;
	const dimension = parseNumber(options[name], name);
	if (!Number.isInteger(dimension) || dimension < 2) {
		throw new Error(`--${name} must be an integer greater than 1.`);
	}
	return Math.floor(dimension / 2) * 2;
}

function findElectronBinary() {
	const localElectron = path.join(projectRoot, "node_modules", ".bin", "electron");
	if (fs.existsSync(localElectron)) return localElectron;
	return "electron";
}

function findMainJs() {
	const mainJs = path.join(projectRoot, "dist-electron", "main.js");
	if (fs.existsSync(mainJs)) return mainJs;
	throw new Error("Cannot find dist-electron/main.js. Run `npm run build-vite` first.");
}

function ensureParentDir(filePath) {
	fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
}

function createDefaultEditor(overrides = {}) {
	return {
		wallpaper: "/wallpapers/wallpaper1.jpg",
		shadowIntensity: 0,
		showBlur: false,
		motionBlurAmount: 0,
		borderRadius: 0,
		padding: 50,
		cropRegion: { x: 0, y: 0, width: 1, height: 1 },
		zoomRegions: [],
		trimRegions: [],
		speedRegions: [],
		annotationRegions: [],
		aspectRatio: "16:9",
		webcamLayoutPreset: "picture-in-picture",
		webcamMaskShape: "rectangle",
		webcamSizePreset: 25,
		webcamPosition: null,
		exportQuality: "good",
		exportFormat: "mp4",
		gifFrameRate: 15,
		gifLoop: true,
		gifSizePreset: "medium",
		cursorHighlight: {
			enabled: false,
			style: "ring",
			sizePx: 24,
			color: "#FFD700",
			opacity: 0.9,
			onlyOnClicks: false,
			clickEmphasisDurationMs: 350,
			offsetXNorm: 0,
			offsetYNorm: 0,
		},
		...overrides,
	};
}

function createDefaultProject(sessionOrMedia, editorOverrides = {}) {
	const media = {
		screenVideoPath: sessionOrMedia.screenVideoPath,
		...(sessionOrMedia.webcamVideoPath ? { webcamVideoPath: sessionOrMedia.webcamVideoPath } : {}),
	};

	return {
		version: 2,
		media,
		editor: createDefaultEditor(editorOverrides),
	};
}

function normalizeProject(project) {
	if (!project || typeof project !== "object") {
		throw new Error("Invalid project data.");
	}
	const media =
		project.media && typeof project.media.screenVideoPath === "string"
			? project.media
			: typeof project.videoPath === "string"
				? { screenVideoPath: project.videoPath }
				: null;
	if (!media) {
		throw new Error("Project does not reference a screen video.");
	}

	return {
		version: typeof project.version === "number" ? project.version : 2,
		media,
		editor: createDefaultEditor(project.editor ?? {}),
	};
}

function loadProject(projectPath) {
	const absolutePath = path.resolve(projectPath);
	const raw = fs.readFileSync(absolutePath, "utf-8");
	return normalizeProject(JSON.parse(raw));
}

function saveProject(projectPath, project) {
	const absolutePath = path.resolve(projectPath);
	ensureParentDir(absolutePath);
	fs.writeFileSync(absolutePath, JSON.stringify(normalizeProject(project), null, 2), "utf-8");
	return absolutePath;
}

function printResult(result, json) {
	if (json) {
		process.stdout.write(`${JSON.stringify(result)}\n`);
		return;
	}
	if (typeof result === "string") {
		process.stdout.write(`${result}\n`);
		return;
	}
	process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

function deriveNextId(prefix, regions) {
	let max = 0;
	for (const region of regions) {
		const match =
			typeof region.id === "string" ? region.id.match(new RegExp(`^${prefix}-(\\d+)$`)) : null;
		if (match) max = Math.max(max, Number(match[1]));
	}
	return `${prefix}-${max + 1}`;
}

function applyEditorOptions(editor, options) {
	const updates = {};
	const aspectRatio = parseAspectRatio(options["aspect-ratio"]);
	if (aspectRatio) updates.aspectRatio = aspectRatio;
	if (typeof options.wallpaper === "string") updates.wallpaper = options.wallpaper;
	if (options.padding !== undefined) updates.padding = parseNumber(options.padding, "padding");
	if (options["border-radius"] !== undefined) {
		updates.borderRadius = parseNumber(options["border-radius"], "border-radius");
	}
	if (options["shadow-intensity"] !== undefined) {
		updates.shadowIntensity = parseNumber(options["shadow-intensity"], "shadow-intensity");
	}
	if (options["show-blur"] !== undefined) updates.showBlur = Boolean(options["show-blur"]);
	if (options["motion-blur"] !== undefined) {
		updates.motionBlurAmount = parseNumber(options["motion-blur"], "motion-blur");
	}
	const exportQuality = parseExportQuality(options["export-quality"] ?? options.quality);
	if (exportQuality) updates.exportQuality = exportQuality;
	const exportFormat = parseExportFormat(options["export-format"] ?? options.format);
	if (exportFormat) updates.exportFormat = exportFormat;

	return createDefaultEditor({ ...editor, ...updates });
}

function copyCompanionFile(sourceVideoPath, outputVideoPath, suffix) {
	const from = `${sourceVideoPath}${suffix}`;
	if (!fs.existsSync(from)) return;
	fs.copyFileSync(from, `${outputVideoPath}${suffix}`);
}

async function runElectronMode(mode, config, options) {
	const configPath = path.join(os.tmpdir(), `openscreen-cli-${mode}-${randomUUID()}.json`);
	fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");

	let done = null;
	let lastError = null;

	try {
		await new Promise((resolve, reject) => {
			const child = spawn(
				findElectronBinary(),
				[findMainJs(), `--cli-${mode}`, "--config", configPath, "--no-sandbox"],
				{
					cwd: projectRoot,
					env: {
						...process.env,
						HEADLESS: "true",
						ELECTRON_DISABLE_SECURITY_WARNINGS: "true",
					},
					stdio: ["ignore", "pipe", "pipe"],
				},
			);

			child.stdout.on("data", (chunk) => {
				for (const line of chunk.toString().split("\n").filter(Boolean)) {
					try {
						const message = JSON.parse(line);
						if (!message.__cli) continue;

						if (message.type === "status" && !options.json) {
							process.stderr.write(`${message.data?.message ?? ""}\n`);
						}
						if (message.type === "warning" && !options.json) {
							process.stderr.write(`Warning: ${message.data?.message ?? ""}\n`);
						}
						if (message.type === "progress" && !options.json) {
							const current = Number(message.data?.currentFrame ?? 0);
							const total = Number(message.data?.totalFrames ?? 0);
							if (total > 0) {
								process.stderr.write(`\r${Math.round((current / total) * 100)}%`);
							}
						}
						if (message.type === "done") done = message.data;
						if (message.type === "error") {
							lastError = message.data?.message ?? `Unknown ${mode} error`;
						}
					} catch {
						// Ignore non-JSON logs from Electron.
					}
				}
			});

			child.stderr.on("data", (chunk) => {
				const text = chunk.toString().trim();
				if (text.includes("Error") || text.includes("ERROR")) {
					lastError = text;
				}
			});

			child.on("error", reject);
			child.on("close", (code) => {
				if (code === 0 && done) {
					resolve();
				} else {
					reject(new Error(lastError || `OpenScreen ${mode} process exited with code ${code}`));
				}
			});
		});
	} finally {
		try {
			fs.unlinkSync(configPath);
		} catch {
			// Ignore cleanup failures.
		}
	}

	if (!options.json && mode === "render") {
		process.stderr.write("\n");
	}
	return done;
}

async function runRecord(options) {
	const durationSeconds = Number(requireOption(options, "duration"));
	if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
		throw new Error("--duration must be a positive number of seconds.");
	}

	const sourceType = options["source-type"] ?? "any";
	if (!["screen", "window", "any"].includes(sourceType)) {
		throw new Error("--source-type must be screen, window, or any.");
	}

	const done = await runElectronMode(
		"record",
		{
			durationMs: Math.round(durationSeconds * 1000),
			source: options.source,
			sourceType,
			systemAudio: Boolean(options["system-audio"]),
		},
		options,
	);

	if (options.output) {
		const outputPath = path.resolve(options.output);
		ensureParentDir(outputPath);
		fs.copyFileSync(done.path, outputPath);
		copyCompanionFile(done.path, outputPath, ".cursor.json");
		done.path = outputPath;
		done.session = { ...done.session, screenVideoPath: outputPath };
	}

	if (options.project) {
		const projectPath = path.resolve(options.project);
		saveProject(projectPath, createDefaultProject(done.session));
		done.projectPath = projectPath;
	}

	printResult(
		options.json
			? { success: true, ...done }
			: `Recorded: ${done.path}${done.projectPath ? `\nProject: ${done.projectPath}` : ""}`,
		options.json,
	);
}

function commandProject(action, options) {
	if (action === "create") {
		const videoPath = path.resolve(requireOption(options, "video"));
		if (!fs.existsSync(videoPath)) throw new Error(`Video file not found: ${videoPath}`);
		const media = { screenVideoPath: videoPath };
		if (options.webcam) {
			const webcamPath = path.resolve(options.webcam);
			if (!fs.existsSync(webcamPath)) throw new Error(`Webcam file not found: ${webcamPath}`);
			media.webcamVideoPath = webcamPath;
		}
		const outputPath = saveProject(
			requireOption(options, "output"),
			createDefaultProject(media, applyEditorOptions({}, options)),
		);
		printResult({ success: true, path: outputPath }, options.json);
		return;
	}

	const projectPath = requireOption(options, "project");
	const project = loadProject(projectPath);

	if (action === "info") {
		printResult(
			{
				version: project.version,
				media: project.media,
				settings: {
					aspectRatio: project.editor.aspectRatio,
					padding: project.editor.padding,
					wallpaper: project.editor.wallpaper,
					exportQuality: project.editor.exportQuality,
					exportFormat: project.editor.exportFormat,
				},
				regions: {
					zooms: project.editor.zoomRegions.length,
					trims: project.editor.trimRegions.length,
					speeds: project.editor.speedRegions.length,
					annotations: project.editor.annotationRegions.length,
				},
			},
			options.json,
		);
		return;
	}

	if (action === "validate") {
		printResult({ success: true, valid: true }, options.json);
		return;
	}

	if (action === "edit") {
		project.editor = applyEditorOptions(project.editor, options);
		const savedPath = saveProject(projectPath, project);
		printResult({ success: true, path: savedPath }, options.json);
		return;
	}

	throw new Error(`Unknown project command: ${action}`);
}

function getRegionList(editor, kind) {
	if (kind === "zoom") return editor.zoomRegions;
	if (kind === "trim") return editor.trimRegions;
	if (kind === "speed") return editor.speedRegions;
	throw new Error(`Unknown region kind: ${kind}`);
}

function commandRegion(kind, action, options) {
	const projectPath = requireOption(options, "project");
	const project = loadProject(projectPath);
	const regions = getRegionList(project.editor, kind);

	if (action === "list") {
		printResult(regions, options.json);
		return;
	}

	if (action === "remove") {
		const id = requireOption(options, "id");
		const index = regions.findIndex((region) => region.id === id);
		if (index === -1) throw new Error(`Region not found: ${id}`);
		regions.splice(index, 1);
		const savedPath = saveProject(projectPath, project);
		printResult({ success: true, path: savedPath, removed: id }, options.json);
		return;
	}

	if (action !== "add") {
		throw new Error(`Unknown ${kind} command: ${action}`);
	}

	const range = parseRange(options);
	const id = options.id ?? deriveNextId(kind, regions);
	let region;

	if (kind === "zoom") {
		const depth = Number(options.depth ?? 3);
		if (!ZOOM_DEPTHS.has(depth)) throw new Error("--depth must be 1-6.");
		const focusX =
			options["focus-x"] !== undefined ? parseNumber(options["focus-x"], "focus-x") : 0.5;
		const focusY =
			options["focus-y"] !== undefined ? parseNumber(options["focus-y"], "focus-y") : 0.5;
		const rotationPreset = options["rotation-preset"];
		if (rotationPreset !== undefined && !ROTATION_PRESETS.has(rotationPreset)) {
			throw new Error("--rotation-preset must be iso, left, or right.");
		}
		region = {
			id,
			...range,
			depth,
			focus: { cx: focusX, cy: focusY },
			focusMode: options["focus-mode"] === "auto" ? "auto" : "manual",
			...(rotationPreset ? { rotationPreset } : {}),
		};
	} else if (kind === "trim") {
		region = { id, ...range };
	} else {
		const speed = parseNumber(requireOption(options, "speed"), "speed");
		if (speed < 0.1 || speed > 16) throw new Error("--speed must be between 0.1 and 16.");
		region = { id, ...range, speed };
	}

	regions.push(region);
	const savedPath = saveProject(projectPath, project);
	printResult({ success: true, path: savedPath, region }, options.json);
}

async function commandRender(options) {
	const projectPath = requireOption(options, "project");
	const outputPath = path.resolve(requireOption(options, "output"));
	if (fs.existsSync(outputPath) && !options.overwrite) {
		throw new Error(`Output file already exists: ${outputPath}. Use --overwrite to replace.`);
	}

	const project = loadProject(projectPath);
	const extension = path.extname(outputPath).toLowerCase();
	const format =
		parseExportFormat(options.format) ??
		(extension === ".gif" ? "gif" : project.editor.exportFormat);
	const quality = parseExportQuality(options.quality) ?? project.editor.exportQuality;
	const width = parseDimensionOption(options, "width");
	const height = parseDimensionOption(options, "height");
	if ((width === undefined) !== (height === undefined)) {
		throw new Error("--width and --height must be provided together.");
	}
	if (format !== "mp4" && (width !== undefined || height !== undefined)) {
		throw new Error("--width/--height are only supported for MP4 renders.");
	}
	const gifFrameRate =
		options["gif-frame-rate"] !== undefined
			? Number(options["gif-frame-rate"])
			: project.editor.gifFrameRate;
	if (![15, 20, 25, 30].includes(gifFrameRate)) {
		throw new Error("--gif-frame-rate must be 15, 20, 25, or 30.");
	}
	const gifSizePreset = options["gif-size-preset"] ?? project.editor.gifSizePreset;
	if (!["medium", "large", "original"].includes(gifSizePreset)) {
		throw new Error("--gif-size-preset must be medium, large, or original.");
	}

	const done = await runElectronMode(
		"render",
		{
			project,
			output: outputPath,
			format,
			quality,
			width,
			height,
			gifFrameRate,
			gifSizePreset,
			gifLoop: options["gif-loop"] ?? project.editor.gifLoop,
		},
		options,
	);

	printResult(options.json ? { success: true, ...done } : `Rendered: ${done.path}`, options.json);
}

async function main() {
	const argv = process.argv.slice(2);
	if (argv.length === 0 || argv.includes("--help") || argv[0] === "help") {
		usage();
		return;
	}

	const [command, maybeAction, ...rest] = argv;
	if (command === "record") {
		await runRecord(parseFlags([maybeAction, ...rest].filter(Boolean)));
		return;
	}
	if (command === "render") {
		await commandRender(parseFlags([maybeAction, ...rest].filter(Boolean)));
		return;
	}
	if (command === "project") {
		commandProject(maybeAction, parseFlags(rest));
		return;
	}
	if (command === "zoom" || command === "trim" || command === "speed") {
		commandRegion(command, maybeAction, parseFlags(rest));
		return;
	}

	throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
	process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
	process.exit(1);
});
