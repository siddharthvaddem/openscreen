#!/usr/bin/env node
/**
 * Validates that all locale translation files have identical key structures.
 * Compares all locale folders (except en) against the en baseline for every namespace.
 *
 * Usage: node scripts/i18n-check.mjs
 */

import fs from "node:fs";
import path from "node:path";

const LOCALES_DIR = path.resolve("src/i18n/locales");
const BASE_LOCALE = "en";
const COMPARE_LOCALES = ["zh-CN", "zh-TW", "es", "tr", "ko-KR"];

function getKeys(obj, prefix = "") {
	const keys = [];
	for (const [key, value] of Object.entries(obj)) {
		const fullKey = prefix ? `${prefix}.${key}` : key;
		if (value && typeof value === "object" && !Array.isArray(value)) {
			keys.push(...getKeys(value, fullKey));
		} else {
			keys.push(fullKey);
		}
	}
	return keys.sort();
}

let hasErrors = false;

const baseDir = path.join(LOCALES_DIR, BASE_LOCALE);
const namespaces = fs
	.readdirSync(baseDir)
	.filter((f) => f.endsWith(".json"))
	.map((f) => f.replace(".json", ""));

const compareLocales = fs
	.readdirSync(LOCALES_DIR, { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.map((entry) => entry.name)
	.filter((locale) => locale !== BASE_LOCALE)
	.sort((a, b) => a.localeCompare(b));

for (const namespace of namespaces) {
	const basePath = path.join(baseDir, `${namespace}.json`);
	const baseData = JSON.parse(fs.readFileSync(basePath, "utf-8"));
	const baseKeys = getKeys(baseData);

	for (const locale of compareLocales) {
		const localePath = path.join(LOCALES_DIR, locale, `${namespace}.json`);

		if (!fs.existsSync(localePath)) {
			console.error(`MISSING: ${locale}/${namespace}.json does not exist`);
			hasErrors = true;
			continue;
		}

		const localeData = JSON.parse(fs.readFileSync(localePath, "utf-8"));
		const localeKeys = getKeys(localeData);

		const missing = baseKeys.filter((k) => !localeKeys.includes(k));
		const extra = localeKeys.filter((k) => !baseKeys.includes(k));

		if (missing.length > 0) {
			console.error(`MISSING in ${locale}/${namespace}.json:`);
			for (const key of missing) {
				console.error(`  - ${key}`);
			}
			hasErrors = true;
		}

		if (extra.length > 0) {
			console.error(`EXTRA in ${locale}/${namespace}.json:`);
			for (const key of extra) {
				console.error(`  + ${key}`);
			}
			hasErrors = true;
		}
	}
}

if (hasErrors) {
	console.error("\ni18n check FAILED — translation files are out of sync.");
	process.exit(1);
} else {
	console.log(
		`i18n check PASSED — all ${compareLocales.length} locales match ${BASE_LOCALE} across ${namespaces.length} namespaces.`,
	);
}
