import { beforeEach, describe, expect, it } from "vitest";
import {
	DEFAULT_PREFS,
	getProjectFolder,
	loadUserPreferences,
	parentDirectoryOf,
	saveUserPreferences,
} from "./userPreferences";

describe("parentDirectoryOf", () => {
	it("returns the directory for a POSIX path", () => {
		expect(parentDirectoryOf("/Users/me/Movies/clip.mp4")).toBe("/Users/me/Movies");
	});

	it("returns the directory for a Windows path", () => {
		expect(parentDirectoryOf("C:\\Users\\me\\Movies\\clip.mp4")).toBe("C:\\Users\\me\\Movies");
	});

	it("preserves the POSIX root when the file is at /", () => {
		expect(parentDirectoryOf("/video.mp4")).toBe("/");
	});

	it("preserves the Windows drive root with its trailing separator", () => {
		expect(parentDirectoryOf("C:\\video.mp4")).toBe("C:\\");
		expect(parentDirectoryOf("D:/video.mp4")).toBe("D:/");
	});

	it("returns null when no separator is present", () => {
		expect(parentDirectoryOf("video.mp4")).toBeNull();
		expect(parentDirectoryOf("")).toBeNull();
	});
});

describe("projectFolder preference", () => {
	// jsdom's localStorage isn't exposed as a global in this vitest setup, so
	// stub it with an in-memory shim before each test. Mirrors what the real
	// browser localStorage exposes, scoped to the keys we touch.
	beforeEach(() => {
		const store = new Map<string, string>();
		const stub = {
			getItem: (key: string) => store.get(key) ?? null,
			setItem: (key: string, value: string) => {
				store.set(key, String(value));
			},
			removeItem: (key: string) => {
				store.delete(key);
			},
			clear: () => store.clear(),
			key: (i: number) => Array.from(store.keys())[i] ?? null,
			get length() {
				return store.size;
			},
		};
		Object.defineProperty(globalThis, "localStorage", {
			value: stub,
			configurable: true,
		});
	});

	it("defaults to null when nothing is persisted", () => {
		expect(loadUserPreferences().projectFolder).toBeNull();
		expect(getProjectFolder()).toBeUndefined();
	});

	it("round-trips a saved project folder", () => {
		saveUserPreferences({ projectFolder: "/Users/me/Projects/demos" });
		expect(loadUserPreferences().projectFolder).toBe("/Users/me/Projects/demos");
		expect(getProjectFolder()).toBe("/Users/me/Projects/demos");
	});

	it("ignores non-string persisted values and falls back to the default", () => {
		localStorage.setItem("openscreen_user_preferences", JSON.stringify({ projectFolder: 42 }));
		expect(loadUserPreferences().projectFolder).toBe(DEFAULT_PREFS.projectFolder);
	});

	it("ignores empty-string persisted values and falls back to the default", () => {
		localStorage.setItem("openscreen_user_preferences", JSON.stringify({ projectFolder: "" }));
		expect(loadUserPreferences().projectFolder).toBe(DEFAULT_PREFS.projectFolder);
	});

	it("is independent of exportFolder", () => {
		saveUserPreferences({ exportFolder: "/Users/me/Downloads" });
		saveUserPreferences({ projectFolder: "/Users/me/Projects/demos" });
		const prefs = loadUserPreferences();
		expect(prefs.exportFolder).toBe("/Users/me/Downloads");
		expect(prefs.projectFolder).toBe("/Users/me/Projects/demos");
	});
});

describe("user preferences", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("persists the tray layout preference", () => {
		saveUserPreferences({ trayLayout: "vertical" });

		expect(loadUserPreferences().trayLayout).toBe("vertical");
	});

	it("falls back to the default tray layout for invalid stored values", () => {
		localStorage.setItem("openscreen_user_preferences", JSON.stringify({ trayLayout: "diagonal" }));

		expect(loadUserPreferences().trayLayout).toBe("horizontal");
	});
});
