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

// Preferred for list commands that have a raw object array: emits the raw
// objects verbatim in --json mode (stable shape, matches `add` return types)
// and renders a human table with the provided headers/rows in text mode.
export function outputList<T>(
	data: readonly T[],
	textTable: { headers: string[]; rows: string[][] },
): void {
	if (jsonMode) {
		outputJson(data);
		return;
	}
	outputTable(textTable.headers, textTable.rows);
}

export function outputTable(headers: string[], rows: string[][]): void {
	// Guard against rows shorter than headers: the JSON branch previously
	// produced objects with undefined values for missing columns, and the
	// text branch could emit ragged rows. Pad with empty strings.
	const normalizedRows = rows.map((row) => headers.map((_, i) => row[i] ?? ""));

	if (jsonMode) {
		const objects = normalizedRows.map((row) =>
			Object.fromEntries(headers.map((h, i) => [h, row[i]])),
		);
		outputJson(objects);
		return;
	}

	if (normalizedRows.length === 0) {
		outputText("(none)");
		return;
	}

	const widths = headers.map((h, i) =>
		Math.max(h.length, ...normalizedRows.map((r) => r[i].length)),
	);

	const header = headers.map((h, i) => h.padEnd(widths[i])).join("  ");
	const separator = widths.map((w) => "─".repeat(w)).join("──");

	outputText(header);
	outputText(separator);
	for (const row of normalizedRows) {
		outputText(row.map((cell, i) => cell.padEnd(widths[i])).join("  "));
	}
}

// Progress is streamed as newline-delimited JSON to **stderr** in --json mode.
// Keeping stdout clean of ticks means the final done/error envelope remains
// the only thing on stdout — agents can `cmd --json | jq .` and get a single
// parseable result, while still tailing progress via 2>.
export function outputProgress(current: number, total: number, phase?: string): void {
	const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

	if (jsonMode) {
		if (!quietMode) {
			process.stderr.write(`${JSON.stringify({ progress: percentage, current, total, phase })}\n`);
		}
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
