#!/usr/bin/env node
// Thin shim so `npm link` (or a future `npm i -g`) exposes the CLI entrypoint
// as a real `openscreen` binary on PATH. The shim just forwards argv to tsx.
// Keeping it in bin/ under cli/ means the package structure maps cleanly:
//   cli/bin/openscreen.mjs  → PATH shim
//   cli/src/index.ts         → CLI entrypoint
//   cli/src/cli-parsers.ts   → argument parsers
//   cli/src/commands/*       → command modules
//
// `npm i -g openscreen` is not wired yet because tsx currently lives in
// devDependencies. Contributors running locally (npm install in the repo
// root, then npm link from the repo root) get the real binary.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// cli/bin/openscreen.mjs → package root is two levels up.
const pkgRoot = path.resolve(__dirname, "..", "..");
const tsxBin = path.join(pkgRoot, "node_modules", ".bin", "tsx");
const cliEntry = path.join(pkgRoot, "cli", "src", "index.ts");

if (!fs.existsSync(tsxBin)) {
	process.stderr.write(
		`openscreen: tsx binary not found at ${tsxBin}\n` +
			"Run 'npm install' inside the openscreen repository root, then retry.\n",
	);
	process.exit(1);
}
if (!fs.existsSync(cliEntry)) {
	process.stderr.write(
		`openscreen: CLI entrypoint not found at ${cliEntry}\n` +
			"This usually means the shim was moved outside the openscreen package.\n",
	);
	process.exit(1);
}

const result = spawnSync(tsxBin, [cliEntry, ...process.argv.slice(2)], {
	stdio: "inherit",
});
process.exit(result.status ?? 1);
