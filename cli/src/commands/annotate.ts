import { Command } from "commander";
import {
	addAnnotationRegion,
	listAnnotationRegions,
	removeAnnotationRegion,
} from "../core/region-manager";
import { outputError, outputList, outputSuccess } from "../output";

export const annotateCommand = new Command("annotate").description("Manage annotations");

annotateCommand
	.command("add")
	.description("Add a text, image, or figure annotation")
	.requiredOption("--project <path>", "Path to .openscreen project file")
	.requiredOption("--type <type>", "Annotation type (text, image, figure)")
	.requiredOption("--content <text>", "Annotation content (text, image data URL, or label)")
	.requiredOption("--start <ms>", "Start time in milliseconds", parseInt)
	.requiredOption("--end <ms>", "End time in milliseconds", parseInt)
	.option("--position-x <0-100>", "X position (0-100)", parseFloat)
	.option("--position-y <0-100>", "Y position (0-100)", parseFloat)
	.option("--width <n>", "Width (percent of viewport)", parseFloat)
	.option("--height <n>", "Height (percent of viewport)", parseFloat)
	.option("--font-size <px>", "Font size in pixels", parseInt)
	.option("--color <hex>", "Text color (hex)")
	.option("--bg-color <hex>", "Background color (hex)")
	.option("--font-family <name>", "Font family")
	.option("--font-weight <w>", "Font weight (normal, bold)")
	.option("--text-align <a>", "Text alignment (left, center, right)")
	.option(
		"--arrow-direction <dir>",
		"Arrow direction (up, down, left, right, up-right, up-left, down-right, down-left)",
	)
	.option("--arrow-color <hex>", "Arrow color (hex)")
	.action((opts) => {
		try {
			const region = addAnnotationRegion(opts.project, {
				type: opts.type,
				content: opts.content,
				startMs: opts.start,
				endMs: opts.end,
				positionX: opts.positionX,
				positionY: opts.positionY,
				width: opts.width,
				height: opts.height,
				fontSize: opts.fontSize,
				color: opts.color,
				bgColor: opts.bgColor,
				fontFamily: opts.fontFamily,
				fontWeight: opts.fontWeight,
				textAlign: opts.textAlign,
				arrowDirection: opts.arrowDirection,
				arrowColor: opts.arrowColor,
			});
			outputSuccess(
				region,
				`Annotation added: ${region.id} (${region.type}, ${region.startMs}ms - ${region.endMs}ms)`,
			);
		} catch (e) {
			outputError(e instanceof Error ? e.message : String(e));
		}
	});

annotateCommand
	.command("list")
	.description("List annotations")
	.requiredOption("--project <path>", "Path to .openscreen project file")
	.action((opts) => {
		try {
			const regions = listAnnotationRegions(opts.project);
			outputList(regions, {
				headers: ["ID", "Type", "Start (ms)", "End (ms)", "Position", "Content"],
				rows: regions.map((r) => [
					r.id,
					r.type,
					String(r.startMs),
					String(r.endMs),
					`(${r.position.x}, ${r.position.y})`,
					(r.textContent || r.content || "").slice(0, 30),
				]),
			});
		} catch (e) {
			outputError(e instanceof Error ? e.message : String(e));
		}
	});

annotateCommand
	.command("remove")
	.description("Remove an annotation by ID")
	.requiredOption("--project <path>", "Path to .openscreen project file")
	.requiredOption("--id <id>", "Annotation ID to remove")
	.action((opts) => {
		try {
			const removed = removeAnnotationRegion(opts.project, opts.id);
			if (removed) {
				outputSuccess({ removed: true, id: opts.id }, `Annotation removed: ${opts.id}`);
			} else {
				outputError(`Annotation not found: ${opts.id}`);
			}
		} catch (e) {
			outputError(e instanceof Error ? e.message : String(e));
		}
	});
