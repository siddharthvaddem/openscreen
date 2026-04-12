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
