import { Command } from "commander";
import { parseIntArg } from "../cli-parsers";
import { addTrimRegion, listTrimRegions, removeTrimRegion } from "../core/region-manager";
import { outputError, outputList, outputSuccess } from "../output";

export const trimCommand = new Command("trim").description("Manage trim regions");

trimCommand
	.command("add")
	.description("Add a trim region (section to cut out)")
	.requiredOption("--project <path>", "Path to .openscreen project file")
	.requiredOption("--start <ms>", "Start time in milliseconds", parseIntArg("--start"))
	.requiredOption("--end <ms>", "End time in milliseconds", parseIntArg("--end"))
	.action((opts) => {
		try {
			const region = addTrimRegion(opts.project, {
				startMs: opts.start,
				endMs: opts.end,
			});
			outputSuccess(
				region,
				`Trim region added: ${region.id} (${region.startMs}ms - ${region.endMs}ms)`,
			);
		} catch (e) {
			outputError(e instanceof Error ? e.message : String(e));
		}
	});

trimCommand
	.command("list")
	.description("List trim regions")
	.requiredOption("--project <path>", "Path to .openscreen project file")
	.action((opts) => {
		try {
			const regions = listTrimRegions(opts.project);
			outputList(regions, {
				headers: ["ID", "Start (ms)", "End (ms)"],
				rows: regions.map((r) => [r.id, String(r.startMs), String(r.endMs)]),
			});
		} catch (e) {
			outputError(e instanceof Error ? e.message : String(e));
		}
	});

trimCommand
	.command("remove")
	.description("Remove a trim region by ID")
	.requiredOption("--project <path>", "Path to .openscreen project file")
	.requiredOption("--id <id>", "Trim region ID to remove")
	.action((opts) => {
		try {
			const removed = removeTrimRegion(opts.project, opts.id);
			if (removed) {
				outputSuccess({ removed: true, id: opts.id }, `Trim region removed: ${opts.id}`);
			} else {
				outputError(`Trim region not found: ${opts.id}`);
			}
		} catch (e) {
			outputError(e instanceof Error ? e.message : String(e));
		}
	});
