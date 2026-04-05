import path from "node:path";
import { Command } from "commander";
import { createProject, editProject, inspectProject, loadProject } from "../core/project-manager";
import { outputError, outputSuccess } from "../output";

export const projectCommand = new Command("project").description("Manage OpenScreen projects");

projectCommand
	.command("create")
	.description("Create a new .openscreen project")
	.requiredOption("--video <path>", "Screen recording video path")
	.option("--webcam <path>", "Webcam video path")
	.requiredOption("--output <path>", "Output .openscreen file path")
	.option("--wallpaper <name>", "Wallpaper (wallpaper1-18 or hex color)")
	.option("--padding <n>", "Padding (0-100)", parseFloat)
	.option("--border-radius <n>", "Border radius", parseFloat)
	.option(
		"--aspect-ratio <ratio>",
		"Aspect ratio (16:9, 9:16, 1:1, 4:3, 4:5, 16:10, 10:16, native)",
	)
	.option("--shadow-intensity <n>", "Shadow intensity", parseFloat)
	.option("--export-quality <q>", "Export quality (medium, good, source)")
	.option("--export-format <f>", "Export format (mp4, gif)")
	.action((opts) => {
		try {
			const project = createProject(
				{
					videoPath: opts.video,
					webcamPath: opts.webcam,
					wallpaper: opts.wallpaper,
					padding: opts.padding,
					borderRadius: opts.borderRadius,
					aspectRatio: opts.aspectRatio,
					shadowIntensity: opts.shadowIntensity,
					exportQuality: opts.exportQuality,
					exportFormat: opts.exportFormat,
				},
				opts.output,
			);
			outputSuccess(
				{ created: path.resolve(opts.output), version: project.version },
				`Project created: ${path.resolve(opts.output)}`,
			);
		} catch (e) {
			outputError(e instanceof Error ? e.message : String(e));
		}
	});

projectCommand
	.command("info")
	.description("Inspect project metadata, regions, and settings")
	.requiredOption("--project <path>", "Path to .openscreen project file")
	.action((opts) => {
		try {
			const info = inspectProject(opts.project);
			outputSuccess(info, formatProjectInfo(info));
		} catch (e) {
			outputError(e instanceof Error ? e.message : String(e));
		}
	});

projectCommand
	.command("validate")
	.description("Validate project file integrity")
	.requiredOption("--project <path>", "Path to .openscreen project file")
	.action((opts) => {
		try {
			loadProject(opts.project);
			outputSuccess(
				{ valid: true, path: path.resolve(opts.project) },
				`Valid project: ${path.resolve(opts.project)}`,
			);
		} catch (e) {
			outputError(e instanceof Error ? e.message : String(e));
		}
	});

projectCommand
	.command("edit")
	.description("Modify project settings")
	.requiredOption("--project <path>", "Path to .openscreen project file")
	.option("--wallpaper <name>", "Wallpaper")
	.option("--padding <n>", "Padding (0-100)", parseFloat)
	.option("--border-radius <n>", "Border radius", parseFloat)
	.option("--shadow-intensity <n>", "Shadow intensity", parseFloat)
	.option("--show-blur <bool>", "Show blur", parseBool)
	.option("--motion-blur <n>", "Motion blur amount (0-1)", parseFloat)
	.option("--aspect-ratio <ratio>", "Aspect ratio")
	.option("--export-quality <q>", "Export quality (medium, good, source)")
	.option("--export-format <f>", "Export format (mp4, gif)")
	.option("--gif-frame-rate <fps>", "GIF frame rate (15, 20, 25, 30)", parseInt)
	.option("--gif-loop <bool>", "GIF loop", parseBool)
	.option("--gif-size-preset <s>", "GIF size (medium, large, original)")
	.action((opts) => {
		try {
			const updated = editProject(opts.project, {
				wallpaper: opts.wallpaper,
				padding: opts.padding,
				borderRadius: opts.borderRadius,
				shadowIntensity: opts.shadowIntensity,
				showBlur: opts.showBlur,
				motionBlurAmount: opts.motionBlur,
				aspectRatio: opts.aspectRatio,
				exportQuality: opts.exportQuality,
				exportFormat: opts.exportFormat,
				gifFrameRate: opts.gifFrameRate,
				gifLoop: opts.gifLoop,
				gifSizePreset: opts.gifSizePreset,
			});
			outputSuccess({ updated: true, settings: updated.editor }, "Project settings updated.");
		} catch (e) {
			outputError(e instanceof Error ? e.message : String(e));
		}
	});

function parseBool(value: string): boolean {
	return value === "true" || value === "1" || value === "yes";
}

function formatProjectInfo(info: ReturnType<typeof inspectProject>): string {
	const lines: string[] = [
		`Version: ${info.version}`,
		"",
		"Media:",
		`  Screen: ${info.media?.screenVideoPath ?? "(none)"}`,
	];
	if (info.media?.webcamVideoPath) {
		lines.push(`  Webcam: ${info.media.webcamVideoPath}`);
	}
	lines.push(
		"",
		"Regions:",
		`  Zooms: ${info.regions.zooms}`,
		`  Trims: ${info.regions.trims}`,
		`  Speed changes: ${info.regions.speeds}`,
		`  Annotations: ${info.regions.annotations}`,
		"",
		"Settings:",
	);
	for (const [key, value] of Object.entries(info.settings)) {
		const display = typeof value === "object" ? JSON.stringify(value) : String(value);
		lines.push(`  ${key}: ${display}`);
	}
	return lines.join("\n");
}
