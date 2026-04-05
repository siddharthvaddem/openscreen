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

// Shortcuts are stored in the user data directory, same as the Electron app
function getShortcutsPath(): string {
	const platform = os.platform();
	const appName = "openscreen";

	let userDataDir: string;
	if (platform === "darwin") {
		userDataDir = path.join(os.homedir(), "Library", "Application Support", appName);
	} else if (platform === "win32") {
		userDataDir = path.join(
			process.env["APPDATA"] || path.join(os.homedir(), "AppData", "Roaming"),
			appName,
		);
	} else {
		userDataDir = path.join(
			process.env["XDG_CONFIG_HOME"] || path.join(os.homedir(), ".config"),
			appName,
		);
	}

	return path.join(userDataDir, "shortcuts.json");
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

			const config = loadShortcuts();
			config[opts.action as keyof ShortcutsConfig] = {
				key: opts.key,
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
