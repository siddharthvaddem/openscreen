import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { _electron as electron, expect, test } from "@playwright/test";
import {
	closeElectronApp,
	copyFixtureToRecordings,
	interceptExportSave,
	readCapturedExportBuffer,
} from "./helpers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");
const MAIN_JS = path.join(ROOT, "dist-electron/main.js");
const TEST_VIDEO = path.join(__dirname, "../fixtures/sample.webm");

test("exports an MP4 from a loaded video", async () => {
	const outputPath = path.join(os.tmpdir(), `test-mp4-export-${Date.now()}.mp4`);
	let testVideoInRecordings = "";

	const app = await electron.launch({
		args: [MAIN_JS, "--no-sandbox", "--enable-unsafe-swiftshader"],
		env: {
			...process.env,
			HEADLESS: process.env["HEADLESS"] ?? "true",
		},
	});

	app.process().stdout?.on("data", (d) => process.stdout.write(`[electron] ${d}`));
	app.process().stderr?.on("data", (d) => process.stderr.write(`[electron] ${d}`));

	try {
		const hudWindow = await app.firstWindow({ timeout: 60_000 });
		await hudWindow.waitForLoadState("domcontentloaded");
		await interceptExportSave(app);

		testVideoInRecordings = await copyFixtureToRecordings(app, TEST_VIDEO, "test-sample-mp4.webm");

		try {
			await hudWindow.evaluate(async (videoPath: string) => {
				await window.electronAPI.setCurrentVideoPath(videoPath);
				await window.electronAPI.switchToEditor();
			}, testVideoInRecordings);
		} catch {
			// Expected: switchToEditor closes the HUD window.
		}

		const editorWindow = await app.waitForEvent("window", {
			predicate: (w) => w.url().includes("windowType=editor"),
			timeout: 15_000,
		});

		await editorWindow.reload();
		await editorWindow.waitForLoadState("domcontentloaded");
		await expect(editorWindow.getByText("Loading video...")).not.toBeVisible({
			timeout: 15_000,
		});

		await editorWindow.getByTestId("testId-mp4-format-button").click();
		await editorWindow.getByTestId("testId-export-button").click();

		await expect(editorWindow.getByText("Video exported successfully")).toBeVisible({
			timeout: 90_000,
		});

		fs.writeFileSync(outputPath, await readCapturedExportBuffer(app));
		expect(fs.existsSync(outputPath), `MP4 not found at ${outputPath}`).toBe(true);

		const header = Buffer.alloc(12);
		const fd = fs.openSync(outputPath, "r");
		fs.readSync(fd, header, 0, 12, 0);
		fs.closeSync(fd);

		expect(header.subarray(4, 8).toString("ascii")).toBe("ftyp");
		expect(fs.statSync(outputPath).size).toBeGreaterThan(1024);
	} finally {
		await closeElectronApp(app);
		if (fs.existsSync(outputPath)) {
			fs.unlinkSync(outputPath);
		}
		if (testVideoInRecordings && fs.existsSync(testVideoInRecordings)) {
			fs.unlinkSync(testVideoInRecordings);
		}
	}
});
