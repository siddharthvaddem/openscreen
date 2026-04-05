import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isJsonMode, outputError, outputProgress, outputText } from "../output";
import { loadProject } from "./project-manager";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ExportOptions {
	projectPath: string;
	outputPath: string;
	format: "mp4" | "gif";
	quality?: "medium" | "good" | "source";
	gifFrameRate?: number;
	gifSizePreset?: string;
	gifLoop?: boolean;
	overwrite?: boolean;
}

interface CliMessage {
	__cli: true;
	type: "progress" | "done" | "error" | "status";
	data: Record<string, unknown>;
}

// Resolve relative to the package root (3 levels up from cli/src/core/)
const PROJECT_ROOT = path.resolve(__dirname, "..", "..", "..");

function findElectronBinary(): string {
	const localElectron = path.join(PROJECT_ROOT, "node_modules", ".bin", "electron");
	if (fs.existsSync(localElectron)) return localElectron;
	return "electron";
}

function findMainJs(): string {
	const mainJs = path.join(PROJECT_ROOT, "dist-electron", "main.js");
	if (fs.existsSync(mainJs)) return mainJs;

	throw new Error(
		"Cannot find Electron main.js. Run 'npm run build-vite' first to build the Electron app.",
	);
}

export async function runExport(options: ExportOptions): Promise<void> {
	const {
		projectPath,
		outputPath,
		format,
		quality,
		gifFrameRate,
		gifSizePreset,
		gifLoop,
		overwrite,
	} = options;

	const absOutput = path.resolve(outputPath);
	if (!overwrite) {
		try {
			fs.accessSync(absOutput);
			outputError(`Output file already exists: ${absOutput}. Use --overwrite to replace.`);
			return;
		} catch {
			// File doesn't exist, proceed
		}
	}

	// Load and validate the project
	const project = loadProject(projectPath);

	// Write a temporary config file for the renderer
	const config = {
		project: {
			media: project.media,
			editor: project.editor,
		},
		output: absOutput,
		format,
		quality,
		gifFrameRate,
		gifSizePreset,
		gifLoop,
	};

	const configPath = path.join(os.tmpdir(), `openscreen-cli-export-${randomUUID()}.json`);
	fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

	try {
		const electronBin = findElectronBinary();
		const mainJs = findMainJs();

		outputText(`Exporting ${format.toUpperCase()} to ${absOutput}...`);

		const args = [
			mainJs,
			"--cli-export",
			"--config",
			configPath,
			"--output",
			absOutput,
			"--no-sandbox",
		];

		await new Promise<void>((resolve, reject) => {
			const child = spawn(electronBin, args, {
				env: {
					...process.env,
					HEADLESS: "true",
					ELECTRON_DISABLE_SECURITY_WARNINGS: "true",
				},
				stdio: ["ignore", "pipe", "pipe"],
			});

			let lastError: string | null = null;

			child.stdout?.on("data", (chunk: Buffer) => {
				const lines = chunk.toString().split("\n").filter(Boolean);
				for (const line of lines) {
					try {
						const msg: CliMessage = JSON.parse(line);
						if (!msg.__cli) continue;

						switch (msg.type) {
							case "progress": {
								const totalFrames = (msg.data.totalFrames as number) ?? 100;
								const currentFrame = (msg.data.currentFrame as number) ?? 0;
								const phase = msg.data.phase as string | undefined;
								outputProgress(currentFrame, totalFrames, phase);
								break;
							}
							case "status":
								outputText((msg.data.message as string) ?? "");
								break;
							case "done":
								outputText(`\nExport complete: ${msg.data.path}`);
								if (isJsonMode()) {
									process.stdout.write(
										JSON.stringify({
											success: true,
											path: msg.data.path,
											format: msg.data.format,
											size: msg.data.size,
										}) + "\n",
									);
								}
								break;
							case "error":
								lastError = (msg.data.message as string) ?? "Unknown export error";
								break;
						}
					} catch {
						// Not a JSON line, skip
					}
				}
			});

			child.stderr?.on("data", (chunk: Buffer) => {
				// Electron often prints non-error noise to stderr, ignore most of it
				const text = chunk.toString();
				if (text.includes("ERROR") || text.includes("Error")) {
					lastError = text.trim();
				}
			});

			child.on("close", (code) => {
				if (code === 0) {
					resolve();
				} else {
					reject(new Error(lastError || `Electron export process exited with code ${code}`));
				}
			});

			child.on("error", (err) => {
				reject(new Error(`Failed to start Electron: ${err.message}`));
			});
		});
	} catch (e) {
		outputError(e instanceof Error ? e.message : String(e));
	} finally {
		// Clean up temp config file
		try {
			fs.unlinkSync(configPath);
		} catch {
			/* ignore */
		}
	}
}
