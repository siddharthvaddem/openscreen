#!/usr/bin/env node
/**
 * Advanced i18n validator
 * - Validates key parity
 * - Detects invalid JSON
 * - Pretty CI output
 * - Optional --fix mode
 */

import fs from "node:fs";
import path from "node:path";

const LOCALES_DIR = path.resolve("src/i18n/locales");
const BASE_LOCALE = "en";
const FIX_MODE = process.argv.includes("--fix");

const color = {
	red: (t) => `\x1b[31m${t}\x1b[0m`,
	yellow: (t) => `\x1b[33m${t}\x1b[0m`,
	green: (t) => `\x1b[32m${t}\x1b[0m`,
	cyan: (t) => `\x1b[36m${t}\x1b[0m`,
	bold: (t) => `\x1b[1m${t}\x1b[0m`,
};

function readJSON(file) {
	try {
		return JSON.parse(fs.readFileSync(file, "utf-8"));
	} catch (err) {
		console.error(color.red(`INVALID JSON → ${file}`));
		throw err;
	}
}

function getKeys(obj, prefix = "") {
	const keys = [];
	for (const [key, value] of Object.entries(obj)) {
		const fullKey = prefix ? `${prefix}.${key}` : key;
		if (value && typeof value === "object" && !Array.isArray(value))
			keys.push(...getKeys(value, fullKey));
		else keys.push(fullKey);
	}
	return keys.sort();
}

function setDeep(obj, keyPath, value = "") {
	const parts = keyPath.split(".");
	let cur = obj;
	while (parts.length > 1) {
		const p = parts.shift();
		cur[p] ??= {};
		cur = cur[p];
	}
	cur[parts[0]] ??= value;
}

let errors = 0;
let fixed = 0;

const baseDir = path.join(LOCALES_DIR, BASE_LOCALE);
const namespaces = fs.readdirSync(baseDir).filter(f => f.endsWith(".json"));

const locales = fs.readdirSync(LOCALES_DIR, { withFileTypes: true })
	.filter(d => d.isDirectory())
	.map(d => d.name)
	.filter(l => l !== BASE_LOCALE);

console.log(color.cyan(`Checking ${locales.length} locales across ${namespaces.length} namespaces\n`));

for (const file of namespaces) {
	const basePath = path.join(baseDir, file);
	const baseData = readJSON(basePath);
	const baseKeys = getKeys(baseData);

	for (const locale of locales) {
		const localePath = path.join(LOCALES_DIR, locale, file);

		if (!fs.existsSync(localePath)) {
			console.error(color.red(`MISSING FILE → ${locale}/${file}`));
			errors++;
			continue;
		}

		const localeData = readJSON(localePath);
		const localeKeys = getKeys(localeData);

		const missing = baseKeys.filter(k => !localeKeys.includes(k));
		const extra = localeKeys.filter(k => !baseKeys.includes(k));

		if (missing.length || extra.length) {
			console.log(color.bold(`\n${locale}/${file}`));

			if (missing.length) {
				console.log(color.red("  Missing keys:"));
				missing.forEach(k => console.log("   -", k));
				errors += missing.length;

				if (FIX_MODE) {
					missing.forEach(k => setDeep(localeData, k));
					fs.writeFileSync(localePath, JSON.stringify(localeData, null, 2));
					fixed += missing.length;
				}
			}

			if (extra.length) {
				console.log(color.yellow("  Extra keys:"));
				extra.forEach(k => console.log("   +", k));
				errors += extra.length;
			}
		}
	}
}

console.log("\n----------------------------------");

if (errors === 0) {
	console.log(color.green("✓ i18n PASSED"));
	process.exit(0);
}

if (FIX_MODE) {
	console.log(color.green(`✓ Fixed ${fixed} missing keys`));
	process.exit(0);
}

console.log(color.red(`✗ i18n FAILED — ${errors} issues found`));
process.exit(1);
