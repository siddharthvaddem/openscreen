import { Command } from "commander";
import { parseFloatArg, parseIntArg } from "../cli-parsers";
import { addSpeedRegion, listSpeedRegions, removeSpeedRegion } from "../core/region-manager";
import { outputError, outputList, outputSuccess } from "../output";

export const speedCommand = new Command("speed").description("Manage speed regions");

speedCommand
	.command("add")
	.description("Add a speed region")
	.requiredOption("--project <path>", "Path to .openscreen project file")
	.requiredOption("--start <ms>", "Start time in milliseconds", parseIntArg("--start"))
	.requiredOption("--end <ms>", "End time in milliseconds", parseIntArg("--end"))
	.requiredOption(
		"--speed <value>",
		"Playback speed (0.25, 0.5, 0.75, 1.25, 1.5, 1.75, 2)",
		parseFloatArg("--speed"),
	)
	.action((opts) => {
		try {
			const region = addSpeedRegion(opts.project, {
				startMs: opts.start,
				endMs: opts.end,
				speed: opts.speed,
			});
			outputSuccess(
				region,
				`Speed region added: ${region.id} (${region.startMs}ms - ${region.endMs}ms, ${region.speed}x)`,
			);
		} catch (e) {
			outputError(e instanceof Error ? e.message : String(e));
		}
	});

speedCommand
	.command("list")
	.description("List speed regions")
	.requiredOption("--project <path>", "Path to .openscreen project file")
	.action((opts) => {
		try {
			const regions = listSpeedRegions(opts.project);
			outputList(regions, {
				headers: ["ID", "Start (ms)", "End (ms)", "Speed"],
				rows: regions.map((r) => [r.id, String(r.startMs), String(r.endMs), `${r.speed}x`]),
			});
		} catch (e) {
			outputError(e instanceof Error ? e.message : String(e));
		}
	});

speedCommand
	.command("remove")
	.description("Remove a speed region by ID")
	.requiredOption("--project <path>", "Path to .openscreen project file")
	.requiredOption("--id <id>", "Speed region ID to remove")
	.action((opts) => {
		try {
			const removed = removeSpeedRegion(opts.project, opts.id);
			if (removed) {
				outputSuccess({ removed: true, id: opts.id }, `Speed region removed: ${opts.id}`);
			} else {
				outputError(`Speed region not found: ${opts.id}`);
			}
		} catch (e) {
			outputError(e instanceof Error ? e.message : String(e));
		}
	});
