export interface CliOpts {
	headless: boolean;
	ipcPath: string;
	outDir: string | undefined;
	retentionHours: number;
}

const DEFAULT_IPC_PATH = "/tmp/openscreen.sock";
const DEFAULT_RETENTION_HOURS = 24;

export function parseArgs(argv: string[]): CliOpts {
	const out: CliOpts = {
		headless: false,
		ipcPath: DEFAULT_IPC_PATH,
		outDir: undefined,
		retentionHours: DEFAULT_RETENTION_HOURS,
	};

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--headless") {
			out.headless = true;
		} else if (arg === "--ipc-path" && i + 1 < argv.length) {
			out.ipcPath = argv[++i];
		} else if (arg === "--out-dir" && i + 1 < argv.length) {
			out.outDir = argv[++i];
		} else if (arg === "--retention-hours" && i + 1 < argv.length) {
			const n = Number.parseInt(argv[++i], 10);
			if (!Number.isNaN(n)) out.retentionHours = n;
		}
		// unknown flags silently ignored — let Electron handle its own switches
	}

	return out;
}
