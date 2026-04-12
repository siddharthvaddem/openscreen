import { Command } from "commander";
import { isValidGifFrameRate } from "../../../src/shared/export-types";
import { runExport } from "../core/electron-bridge";
import { outputError } from "../output";

export const renderCommand = new Command("render")
	.description("Render project as MP4 video")
	.requiredOption("--project <path>", "Path to .openscreen project file")
	.requiredOption("--output <path>", "Output MP4 file path")
	.option("--quality <q>", "Export quality (medium, good, source)", "good")
	.option("--overwrite", "Overwrite existing output file")
	.action(async (opts) => {
		try {
			await runExport({
				projectPath: opts.project,
				outputPath: opts.output,
				format: "mp4",
				quality: opts.quality,
				overwrite: opts.overwrite,
			});
		} catch (e) {
			outputError(e instanceof Error ? e.message : String(e));
		}
	});

const VALID_GIF_PRESETS = ["medium", "large", "original"] as const;

export const gifCommand = new Command("gif")
	.description("Render project as animated GIF")
	.requiredOption("--project <path>", "Path to .openscreen project file")
	.requiredOption("--output <path>", "Output GIF file path")
	.option("--frame-rate <fps>", "GIF frame rate (15, 20, 25, 30)", "15")
	.option("--size-preset <s>", "GIF size (medium, large, original)", "medium")
	.option("--loop", "Force GIF to loop (overrides project setting)")
	.option("--no-loop", "Force GIF not to loop (overrides project setting)")
	.option("--overwrite", "Overwrite existing output file")
	.action(async (opts) => {
		try {
			const frameRate = Number.parseInt(opts.frameRate, 10);
			if (!isValidGifFrameRate(frameRate)) {
				outputError(`Invalid frame rate: ${opts.frameRate}. Valid values: 15, 20, 25, 30`);
				return;
			}
			if (!VALID_GIF_PRESETS.includes(opts.sizePreset)) {
				outputError(
					`Invalid size preset: ${opts.sizePreset}. Valid values: ${VALID_GIF_PRESETS.join(", ")}`,
				);
				return;
			}
			await runExport({
				projectPath: opts.project,
				outputPath: opts.output,
				format: "gif",
				gifFrameRate: frameRate,
				gifSizePreset: opts.sizePreset,
				gifLoop: opts.loop,
				overwrite: opts.overwrite,
			});
		} catch (e) {
			outputError(e instanceof Error ? e.message : String(e));
		}
	});

export const stillCommand = new Command("still")
	.description("Capture a single frame as PNG or JPEG (requires built Electron app)")
	.requiredOption("--project <path>", "Path to .openscreen project file")
	.requiredOption("--output <path>", "Output image file path")
	.option("--frame <ms>", "Timestamp in milliseconds", "0")
	.option("--format <f>", "Image format (png, jpeg)", "png")
	.option("--jpeg-quality <q>", "JPEG quality (1-100)", "90")
	.option("--scale <n>", "Device scale factor", "1")
	.option("--overwrite", "Overwrite existing output file")
	.action((_opts) => {
		outputError("The still command is not yet implemented. Use render for full video export.");
	});

export const framesCommand = new Command("frames")
	.description("Export a sequence of frames as images (requires built Electron app)")
	.requiredOption("--project <path>", "Path to .openscreen project file")
	.requiredOption("--output-dir <dir>", "Output directory for frames")
	.option("--start <ms>", "Start timestamp in milliseconds", "0")
	.option("--end <ms>", "End timestamp (default: video end)")
	.option("--every-nth <n>", "Export every Nth frame", "1")
	.option("--format <f>", "Image format (png, jpeg)", "png")
	.option("--overwrite", "Overwrite existing output files")
	.action((_opts) => {
		outputError("The frames command is not yet implemented. Use render for full video export.");
	});
