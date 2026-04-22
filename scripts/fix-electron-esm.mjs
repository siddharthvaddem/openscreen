#!/usr/bin/env node
/**
 * Post-build fix: Places a { "type": "commonjs" } package.json inside
 * dist-electron/ so Node.js treats .js files there as CJS — even though
 * the root package.json has "type": "module".
 *
 * vite-plugin-electron/simple already emits CJS output for the main process
 * when it detects "type": "module", but the file extension stays .js and
 * Node resolves the nearest package.json to decide the module type.
 * This script bridges that gap.
 */
import fs from "node:fs";
import path from "node:path";

const distElectron = path.resolve("dist-electron");
const target = path.join(distElectron, "package.json");

if (!fs.existsSync(distElectron)) {
	console.error("[fix-electron-esm] dist-electron/ not found after vite build.");
	process.exit(1);
}

fs.writeFileSync(target, JSON.stringify({ type: "commonjs" }, null, 2) + "\n");
console.log("[fix-electron-esm] Wrote dist-electron/package.json (type: commonjs)");
