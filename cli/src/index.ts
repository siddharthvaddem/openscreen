#!/usr/bin/env node

import { Command } from "commander";
import { annotateCommand } from "./commands/annotate";
import { projectCommand } from "./commands/project";
import { framesCommand, gifCommand, renderCommand, stillCommand } from "./commands/render";
import { shortcutsCommand } from "./commands/shortcuts";
import { speedCommand } from "./commands/speed";
import { trimCommand } from "./commands/trim";
import { zoomCommand } from "./commands/zoom";
import { setOutputMode } from "./output";

const program = new Command();

program
	.name("openscreen")
	.description("OpenScreen CLI — screen recording and video editing for AI agents")
	.version("1.3.0")
	.option("--json", "Output machine-readable JSON")
	.option("-q, --quiet", "Suppress progress output")
	.hook("preAction", (thisCommand) => {
		const opts = thisCommand.opts();
		setOutputMode({ json: opts.json, quiet: opts.quiet });
	});

// Project commands
program.addCommand(projectCommand);

// Region commands
program.addCommand(zoomCommand);
program.addCommand(trimCommand);
program.addCommand(speedCommand);
program.addCommand(annotateCommand);

// Utility commands
program.addCommand(shortcutsCommand);

// Rendering commands (Phase 3: Electron headless bridge)
program.addCommand(renderCommand);
program.addCommand(gifCommand);
program.addCommand(stillCommand);
program.addCommand(framesCommand);

program.parse();
