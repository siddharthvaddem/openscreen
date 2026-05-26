// @vitest-environment node
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- mocks (hoisted by vitest before any imports) ---

vi.mock("electron-log/main", () => {
	const fileTransport = {
		level: undefined as unknown,
		maxSize: undefined as unknown,
		format: undefined as unknown,
		archiveLogFn: undefined as unknown,
		getFile: vi.fn().mockReturnValue({ path: "/logs/main.log" }),
	};
	return {
		default: {
			initialize: vi.fn(),
			transports: { file: fileTransport },
			info: vi.fn(),
			warn: vi.fn(),
		},
	};
});

vi.mock("node:fs/promises", () => ({
	default: {
		readdir: vi.fn(),
		stat: vi.fn(),
		unlink: vi.fn(),
		readFile: vi.fn(),
	},
}));

vi.mock("node:fs", () => ({
	default: { renameSync: vi.fn() },
}));

// --- imports (resolved against the mocks above) ---

import fsSync from "node:fs";
import fs from "node:fs/promises";
import log from "electron-log/main";
import { cleanupOldLogs, getRecentLogLines, initializeLogger } from "./logger";

// Convenience aliases so tests stay readable
const mockGetFile = vi.mocked(log.transports.file.getFile);
const mockReaddir = vi.mocked(fs.readdir);
const mockStat = vi.mocked(fs.stat);
const mockUnlink = vi.mocked(fs.unlink);
const mockReadFile = vi.mocked(fs.readFile);
const mockRenameSync = vi.mocked(fsSync.renameSync);

const LOG_PATH = "/logs/main.log";
const LOG_DIR = "/logs";

afterEach(() => {
	vi.clearAllMocks();
	mockGetFile.mockReturnValue({ path: LOG_PATH });
});

// ---------------------------------------------------------------------------
describe("initializeLogger", () => {
	it("calls log.initialize()", () => {
		initializeLogger();
		expect(log.initialize).toHaveBeenCalledOnce();
	});

	it("sets the file transport level, maxSize, and format", () => {
		initializeLogger();
		expect(log.transports.file.level).toBe("debug");
		expect(log.transports.file.maxSize).toBe(5 * 1024 * 1024);
		expect(log.transports.file.format).toBe("[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}");
	});

	it("assigns archiveLogFn to the file transport", () => {
		initializeLogger();
		expect(typeof log.transports.file.archiveLogFn).toBe("function");
	});

	it("returns the log instance", () => {
		const result = initializeLogger();
		expect(result).toBe(log);
	});
});

// ---------------------------------------------------------------------------
describe("archiveLogFn (assigned by initializeLogger)", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2025-01-15T10:30:00.000Z"));
		initializeLogger();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("renames the log file with a timestamp suffix", () => {
		const archiveLogFn = log.transports.file.archiveLogFn as (f: { path: string }) => void;
		archiveLogFn({ path: LOG_PATH });

		expect(mockRenameSync).toHaveBeenCalledWith(
			LOG_PATH,
			path.join(LOG_DIR, "main.2025-01-15T10-30-00-000Z.log"),
		);
	});

	it("derives the archive path from the file's own directory", () => {
		const archiveLogFn = log.transports.file.archiveLogFn as (f: { path: string }) => void;
		archiveLogFn({ path: "/other-dir/app.log" });

		expect(mockRenameSync).toHaveBeenCalledWith(
			"/other-dir/app.log",
			path.join("/other-dir", "app.2025-01-15T10-30-00-000Z.log"),
		);
	});
});

// ---------------------------------------------------------------------------
describe("cleanupOldLogs", () => {
	// Six archived files ordered oldest → newest
	const archived = [
		"main.2025-01-01T00-00-00-000Z.log",
		"main.2025-01-02T00-00-00-000Z.log",
		"main.2025-01-03T00-00-00-000Z.log",
		"main.2025-01-04T00-00-00-000Z.log",
		"main.2025-01-05T00-00-00-000Z.log",
		"main.2025-01-06T00-00-00-000Z.log",
	];

	function mtimeFor(filename: string) {
		const index = archived.indexOf(filename);
		return new Date(2025, 0, index + 1); // Jan 1–6 2025
	}

	function setupStat(files: string[]) {
		mockStat.mockImplementation(async (p) => {
			const name = path.basename(p as string);
			return { mtime: mtimeFor(name) } as Awaited<ReturnType<typeof fs.stat>>;
		});
		void files; // suppress unused-var warning; files are returned by readdir
	}

	it("does nothing when there are no archived files", async () => {
		mockReaddir.mockResolvedValue(["main.log"] as never);

		await cleanupOldLogs();

		expect(mockUnlink).not.toHaveBeenCalled();
	});

	it("does nothing when archived files are within the 4-file limit", async () => {
		const files = ["main.log", ...archived.slice(2)]; // 4 archived
		mockReaddir.mockResolvedValue(files as never);
		setupStat(archived.slice(2));

		await cleanupOldLogs();

		expect(mockUnlink).not.toHaveBeenCalled();
	});

	it("deletes the oldest files when more than 4 archives exist", async () => {
		mockReaddir.mockResolvedValue(["main.log", ...archived] as never);
		setupStat(archived);

		await cleanupOldLogs();

		// 6 archived → keep 4 newest (Jan 3–6), delete 2 oldest (Jan 1–2)
		expect(mockUnlink).toHaveBeenCalledTimes(2);
		expect(mockUnlink).toHaveBeenCalledWith(path.join(LOG_DIR, archived[0])); // Jan 1
		expect(mockUnlink).toHaveBeenCalledWith(path.join(LOG_DIR, archived[1])); // Jan 2
	});

	it("ignores non-archived files in the log directory", async () => {
		mockReaddir.mockResolvedValue([
			"main.log",
			"unrelated.txt",
			"debug.log", // different base name — should be ignored
			archived[0],
			archived[1],
			archived[2],
			archived[3],
		] as never);
		setupStat(archived);

		await cleanupOldLogs();

		expect(mockUnlink).not.toHaveBeenCalled(); // 4 matching archived = within limit
	});

	it("logs info when files are deleted", async () => {
		mockReaddir.mockResolvedValue(["main.log", ...archived] as never);
		setupStat(archived);

		await cleanupOldLogs();

		expect(log.info).toHaveBeenCalledWith(expect.stringContaining("Removed 2 old log file(s)"));
	});

	it("calls log.warn and does not throw when readdir fails", async () => {
		mockReaddir.mockRejectedValue(new Error("ENOENT"));

		await expect(cleanupOldLogs()).resolves.toBeUndefined();
		expect(log.warn).toHaveBeenCalledWith("Log cleanup failed:", expect.any(Error));
	});
});

// ---------------------------------------------------------------------------
describe("getRecentLogLines", () => {
	it("returns the last N lines from the log file", async () => {
		const lines = Array.from({ length: 10 }, (_, i) => `line ${i + 1}`);
		mockReadFile.mockResolvedValue(lines.join("\n") as never);

		const result = await getRecentLogLines(3);

		expect(result).toEqual(["line 8", "line 9", "line 10"]);
	});

	it("filters out empty lines", async () => {
		mockReadFile.mockResolvedValue("a\n\nb\n\nc\n" as never);

		const result = await getRecentLogLines(10);

		expect(result).toEqual(["a", "b", "c"]);
	});

	it("returns all lines when the file has fewer than maxLines", async () => {
		mockReadFile.mockResolvedValue("a\nb\nc\n" as never);

		const result = await getRecentLogLines(100);

		expect(result).toEqual(["a", "b", "c"]);
	});

	it("returns an empty array when the file cannot be read", async () => {
		mockReadFile.mockRejectedValue(new Error("ENOENT"));

		const result = await getRecentLogLines();

		expect(result).toEqual([]);
	});

	it("reads from the path returned by getFile()", async () => {
		const customPath = "/custom/path/app.log";
		mockGetFile.mockReturnValue({ path: customPath });
		mockReadFile.mockResolvedValue("entry\n" as never);

		await getRecentLogLines();

		expect(mockReadFile).toHaveBeenCalledWith(customPath, "utf-8");
	});
});
