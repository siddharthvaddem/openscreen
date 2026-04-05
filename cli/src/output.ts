// Dual output: --json for agents, human-readable for humans.
// Following CLI-Anything's proven pattern.

let jsonMode = false;
let quietMode = false;

export function setOutputMode(opts: { json?: boolean; quiet?: boolean }) {
	if (opts.json) jsonMode = true;
	if (opts.quiet) quietMode = true;
}

export function isJsonMode(): boolean {
	return jsonMode;
}

export function outputJson(data: unknown): void {
	process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

export function outputText(message: string): void {
	if (!quietMode) {
		process.stdout.write(`${message}\n`);
	}
}

export function outputError(message: string): void {
	if (jsonMode) {
		process.stderr.write(`${JSON.stringify({ error: message })}\n`);
	} else {
		process.stderr.write(`Error: ${message}\n`);
	}
	process.exitCode = 1;
}

export function outputSuccess(data: unknown, humanMessage: string): void {
	if (jsonMode) {
		outputJson(data);
	} else {
		outputText(humanMessage);
	}
}

export function outputTable(headers: string[], rows: string[][]): void {
	if (jsonMode) {
		const objects = rows.map((row) => Object.fromEntries(headers.map((h, i) => [h, row[i]])));
		outputJson(objects);
		return;
	}

	if (rows.length === 0) {
		outputText("(none)");
		return;
	}

	const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? "").length)));

	const header = headers.map((h, i) => h.padEnd(widths[i])).join("  ");
	const separator = widths.map((w) => "─".repeat(w)).join("──");

	outputText(header);
	outputText(separator);
	for (const row of rows) {
		outputText(row.map((cell, i) => (cell || "").padEnd(widths[i])).join("  "));
	}
}

export function outputProgress(current: number, total: number, phase?: string): void {
	const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

	if (jsonMode) {
		process.stdout.write(`${JSON.stringify({ progress: percentage, current, total, phase })}\n`);
		return;
	}

	if (quietMode) return;

	const barWidth = 30;
	const filled = Math.min(barWidth, Math.round((percentage / 100) * barWidth));
	const bar = "█".repeat(filled) + "░".repeat(barWidth - filled);
	const label = phase ? ` ${phase}` : "";
	process.stderr.write(`\r  ${bar} ${percentage}%${label}`);

	if (current >= total) {
		process.stderr.write("\n");
	}
}
