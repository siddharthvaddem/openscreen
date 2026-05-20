import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import log from "electron-log/main";

const MAX_LOG_FILES = 5;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export function initializeLogger(): typeof log {
	log.initialize();

	log.transports.file.level = "debug";
	log.transports.file.maxSize = MAX_FILE_SIZE_BYTES;
	log.transports.file.format = "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}";

	// Archive with a timestamp so multiple rotated files can coexist
	log.transports.file.archiveLogFn = (file) => {
		const ts = new Date().toISOString().replace(/[:.]/g, "-");
		const ext = path.extname(file.path);
		const base = path.basename(file.path, ext);
		const dir = path.dirname(file.path);
		fsSync.renameSync(file.path, path.join(dir, `${base}.${ts}${ext}`));
	};

	return log;
}

export async function cleanupOldLogs(): Promise<void> {
	try {
		const currentPath = log.transports.file.getFile().path;
		const logDir = path.dirname(currentPath);
		const ext = path.extname(currentPath);
		const base = path.basename(currentPath, ext);

		const entries = await fs.readdir(logDir);
		// Match archived files: base.TIMESTAMP.ext (e.g. main.2025-01-01T00-00-00-000Z.log)
		const archived = entries.filter(
			(f) => f !== path.basename(currentPath) && f.startsWith(`${base}.`) && f.endsWith(ext),
		);

		const withStats = await Promise.all(
			archived.map(async (f) => {
				const p = path.join(logDir, f);
				const stat = await fs.stat(p);
				return { path: p, mtime: stat.mtime };
			}),
		);

		// Newest first — keep (MAX_LOG_FILES - 1) archived plus 1 current
		withStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
		const toDelete = withStats.slice(MAX_LOG_FILES - 1);
		await Promise.all(toDelete.map((f) => fs.unlink(f.path)));

		if (toDelete.length > 0) {
			log.info(
				`Removed ${toDelete.length} old log file(s) to stay within the ${MAX_LOG_FILES}-file limit`,
			);
		}
	} catch (error) {
		log.warn("Log cleanup failed:", error);
	}
}

export async function getRecentLogLines(maxLines = 500): Promise<string[]> {
	try {
		const logPath = log.transports.file.getFile().path;
		const content = await fs.readFile(logPath, "utf-8");
		const lines = content.split("\n").filter(Boolean);
		return lines.slice(-maxLines);
	} catch {
		return [];
	}
}

export default log;
