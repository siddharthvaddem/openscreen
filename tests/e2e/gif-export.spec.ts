import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { _electron as electron, expect, test } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");
const MAIN_JS = path.join(ROOT, "dist-electron/main.js");
const TEST_VIDEO = path.join(__dirname, "../fixtures/sample.webm");

test("exports a GIF from a loaded video", async () => {
	const outputPath = path.join(os.tmpdir(), `test-gif-export-${Date.now()}.gif`);
	let testVideoInRecordings = "";

	const app = await electron.launch({
		args: [
			MAIN_JS,
			// Required in CI sandbox environments (GitHub Actions, Docker, etc.)
			"--no-sandbox",
			// Force software WebGL in headless CI to avoid GPU framebuffer errors.
			"--enable-unsafe-swiftshader",
		],
		env: {
			...process.env,
			// Set HEADLESS=false to show windows while debugging.
			HEADLESS: process.env["HEADLESS"] ?? "true",
		},
	});

	// Print all main-process stdout/stderr so failures are diagnosable.
	app.process().stdout?.on("data", (d) => process.stdout.write(`[electron] ${d}`));
	app.process().stderr?.on("data", (d) => process.stderr.write(`[electron] ${d}`));

	try {
		// ── 1. Wait for the HUD overlay window. The window is created after
		//       registerIpcHandlers() completes, so all IPC handlers are live
		//       by the time firstWindow() resolves.
		const hudWindow = await app.firstWindow({ timeout: 60_000 });
		await hudWindow.waitForLoadState("domcontentloaded");

		// ── 2. Intercept the native save dialog in the main process.
		//       Must happen after firstWindow() so registerIpcHandlers() has
		//       already registered its version — otherwise our early handle()
		//       call causes registerIpcHandlers() to throw and abort, leaving
		//       other handlers (like set-current-video-path) never registered.
		// Store the exported buffer as a base64 global in the main process.
		// We can't use require() or import() inside app.evaluate() because the
		// main process is ESM and Playwright runs the callback via eval(), which
		// has no dynamic-import hook.  We retrieve and write the file below after
		// the export finishes.
		await app.evaluate(({ ipcMain }) => {
			ipcMain.removeHandler("save-exported-video");
			ipcMain.handle(
				"save-exported-video",
				(_event: Electron.IpcMainInvokeEvent, buffer: ArrayBuffer) => {
					(globalThis as Record<string, unknown>)["__testExportData"] =
						Buffer.from(buffer).toString("base64");
					return { success: true, path: "pending" };
				},
			);
		});

		// Copy the test fixture into the app's recordings directory so it passes
		// the path security check in set-current-video-path.
		const userDataDir = await app.evaluate(({ app: electronApp }) => {
			return electronApp.getPath("userData");
		});
		const recordingsDir = path.join(userDataDir, "recordings");
		testVideoInRecordings = path.join(recordingsDir, "test-sample.webm");
		fs.mkdirSync(recordingsDir, { recursive: true });
		fs.copyFileSync(TEST_VIDEO, testVideoInRecordings);

		try {
			await hudWindow.evaluate((videoPath: string) => {
				window.electronAPI.setCurrentVideoPath(videoPath);
				window.electronAPI.switchToEditor();
			}, testVideoInRecordings);
		} catch {
			// Expected: switchToEditor() closes the HUD window, terminating
			// the Playwright page context before evaluate() can resolve.
		}

		// ── 3. Switch to the editor window. This closes the HUD and opens
		//       a new BrowserWindow with ?windowType=editor.
		const editorWindow = await app.waitForEvent("window", {
			predicate: (w) => w.url().includes("windowType=editor"),
			timeout: 15_000,
		});

		// WebCodecs (VideoEncoder) may not be registered in the renderer on first
		// load of a second BrowserWindow. A single reload ensures the feature is
		// fully initialized before we start encoding.
		await editorWindow.reload();
		await editorWindow.waitForLoadState("domcontentloaded");
		await expect(editorWindow.getByText("Loading video...")).not.toBeVisible({
			timeout: 15_000,
		});

		// ── 5. Select GIF as the export format.
		await editorWindow.getByTestId("testId-gif-format-button").click();
		await editorWindow.getByTestId("testId-export-button").click();

		// ── 6. Wait for the success toast.
		await expect(editorWindow.getByText("GIF exported successfully")).toBeVisible({
			timeout: 90_000,
		});

		// ── 7. Write the captured buffer from the main-process global to disk.
		const base64 = await app.evaluate(
			() => (globalThis as Record<string, unknown>)["__testExportData"] as string,
		);
		fs.writeFileSync(outputPath, Buffer.from(base64, "base64"));

		// ── 8. Verify the file on disk is a valid GIF.
		expect(fs.existsSync(outputPath), `GIF not found at ${outputPath}`).toBe(true);

		const header = Buffer.alloc(6);
		const fd = fs.openSync(outputPath, "r");
		fs.readSync(fd, header, 0, 6, 0);
		fs.closeSync(fd);

		// GIF magic bytes are either "GIF87a" or "GIF89a"
		expect(header.toString("ascii")).toMatch(/^GIF8[79]a/);

		const stats = fs.statSync(outputPath);
		expect(stats.size).toBeGreaterThan(1024); // at least 1 KB
	} finally {
		await app.close();
		if (fs.existsSync(outputPath)) {
			fs.unlinkSync(outputPath);
		}
		if (testVideoInRecordings && fs.existsSync(testVideoInRecordings)) {
			fs.unlinkSync(testVideoInRecordings);
		}
	}
});
