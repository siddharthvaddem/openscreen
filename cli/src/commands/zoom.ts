import { Command } from "commander";
import { addZoomRegion, listZoomRegions, removeZoomRegion } from "../core/region-manager";
import { outputError, outputSuccess, outputTable } from "../output";

export const zoomCommand = new Command("zoom").description("Manage zoom regions");

zoomCommand
	.command("add")
	.description("Add a zoom region")
	.requiredOption("--project <path>", "Path to .openscreen project file")
	.requiredOption("--start <ms>", "Start time in milliseconds", parseInt)
	.requiredOption("--end <ms>", "End time in milliseconds", parseInt)
	.option("--depth <1-6>", "Zoom depth level (1-6)", parseInt)
	.option("--focus-x <0-1>", "Focus center X (0-1)", parseFloat)
	.option("--focus-y <0-1>", "Focus center Y (0-1)", parseFloat)
	.option("--focus-mode <mode>", "Focus mode (manual, auto)")
	.action((opts) => {
		try {
			const region = addZoomRegion(opts.project, {
				startMs: opts.start,
				endMs: opts.end,
				depth: opts.depth,
				focusX: opts.focusX,
				focusY: opts.focusY,
				focusMode: opts.focusMode,
			});
			outputSuccess(
				region,
				`Zoom region added: ${region.id} (${region.startMs}ms - ${region.endMs}ms, depth ${region.depth})`,
			);
		} catch (e) {
			outputError(e instanceof Error ? e.message : String(e));
		}
	});

zoomCommand
	.command("list")
	.description("List zoom regions")
	.requiredOption("--project <path>", "Path to .openscreen project file")
	.action((opts) => {
		try {
			const regions = listZoomRegions(opts.project);
			outputTable(
				["ID", "Start (ms)", "End (ms)", "Depth", "Focus X", "Focus Y", "Mode"],
				regions.map((r) => [
					r.id,
					String(r.startMs),
					String(r.endMs),
					String(r.depth),
					r.focus.cx.toFixed(2),
					r.focus.cy.toFixed(2),
					r.focusMode ?? "manual",
				]),
			);
		} catch (e) {
			outputError(e instanceof Error ? e.message : String(e));
		}
	});

zoomCommand
	.command("remove")
	.description("Remove a zoom region by ID")
	.requiredOption("--project <path>", "Path to .openscreen project file")
	.requiredOption("--id <id>", "Zoom region ID to remove")
	.action((opts) => {
		try {
			const removed = removeZoomRegion(opts.project, opts.id);
			if (removed) {
				outputSuccess({ removed: true, id: opts.id }, `Zoom region removed: ${opts.id}`);
			} else {
				outputError(`Zoom region not found: ${opts.id}`);
			}
		} catch (e) {
			outputError(e instanceof Error ? e.message : String(e));
		}
	});
