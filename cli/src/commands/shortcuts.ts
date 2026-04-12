import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Command } from "commander";
import {
	DEFAULT_SHORTCUTS,
	formatBinding,
	mergeWithDefaults,
	SHORTCUT_ACTIONS,
	SHORTCUT_LABELS,
	type ShortcutsConfig,
} from "../../../src/shared/shortcuts";
import { outputError, outputSuccess, outputTable } from "../output";

// Electron uses productName ("Openscreen") for packaged builds, "Electron" for dev.
// Try both paths, preferring the packaged name.
const APP_NAMES = ["Openscreen", "Electron"];

function getUserDataDir(appName: string): string {
	const platform = os.platform();
	if (platform === "darwin") {
		return path.join(os.homedir(), "Library", "Application Support", appName);
	}
	if (platform === "win32") {
		return path.join(
			process.env["APPDATA"] || path.join(os.homedir(), "AppData", "Roaming"),
			appName,
		);
	}
	return path.join(process.env["XDG_CONFIG_HOME"] || path.join(os.homedir(), ".config"), appName);
}

function getShortcutsPath(): string {
	for (const appName of APP_NAMES) {
		const candidate = path.join(getUserDataDir(appName), "shortcuts.json");
		if (fs.existsSync(candidate)) return candidate;
	}
	// Default to packaged name for writes
	return path.join(getUserDataDir(APP_NAMES[0]), "shortcuts.json");
}

function loadShortcuts(): ShortcutsConfig {
	const filePath = getShortcutsPath();
	try {
		if (fs.existsSync(filePath)) {
			const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
			return mergeWithDefaults(raw);
		}
	} catch {
		// Fall through to defaults
	}
	return { ...DEFAULT_SHORTCUTS };
}

function saveShortcuts(config: ShortcutsConfig): void {
	const filePath = getShortcutsPath();
	const dir = path.dirname(filePath);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
	fs.writeFileSync(filePath, JSON.stringify(config, null, 2), "utf-8");
}

const isMac = os.platform() === "darwin";

export const shortcutsCommand = new Command("shortcuts").description("Manage keyboard shortcuts");

shortcutsCommand
	.command("get")
	.description("Show current keyboard shortcuts")
	.action(() => {
		try {
			const config = loadShortcuts();
			outputTable(
				["Action", "Label", "Binding"],
				SHORTCUT_ACTIONS.map((action) => [
					action,
					SHORTCUT_LABELS[action],
					formatBinding(config[action], isMac),
				]),
			);
		} catch (e) {
			outputError(e instanceof Error ? e.message : String(e));
		}
	});

shortcutsCommand
	.command("set")
	.description("Set a keyboard shortcut")
	.requiredOption("--action <action>", `Action (${SHORTCUT_ACTIONS.join(", ")})`)
	.requiredOption("--key <key>", "Key (e.g., z, t, space)")
	.option("--ctrl", "Require Ctrl/Cmd modifier")
	.option("--shift", "Require Shift modifier")
	.option("--alt", "Require Alt/Option modifier")
	.action((opts) => {
		try {
			if (!SHORTCUT_ACTIONS.includes(opts.action)) {
				outputError(`Invalid action: ${opts.action}. Valid: ${SHORTCUT_ACTIONS.join(", ")}`);
				return;
			}

			// DEFAULT_SHORTCUTS stores the spacebar as " " (see shortcuts.ts:playPause).
			// Accept "space" as a convenience alias so the binding actually matches
			// at runtime instead of silently persisting as the literal word.
			const rawKey = typeof opts.key === "string" ? opts.key : "";
			const normalizedKey = rawKey.toLowerCase() === "space" ? " " : rawKey;

			const config = loadShortcuts();
			config[opts.action as keyof ShortcutsConfig] = {
				key: normalizedKey,
				...(opts.ctrl ? { ctrl: true } : {}),
				...(opts.shift ? { shift: true } : {}),
				...(opts.alt ? { alt: true } : {}),
			};
			saveShortcuts(config);
			outputSuccess(
				{ action: opts.action, binding: config[opts.action as keyof ShortcutsConfig] },
				`Shortcut set: ${opts.action} = ${formatBinding(config[opts.action as keyof ShortcutsConfig], isMac)}`,
			);
		} catch (e) {
			outputError(e instanceof Error ? e.message : String(e));
		}
	});
