import path from "node:path";
import { fileURLToPath } from "node:url";
import { _electron as electron, expect, test } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");
const MAIN_JS = path.join(ROOT, "dist-electron/main.js");

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

test("records from selected source and enters editor", async () => {
	const app = await electron.launch({
		args: [MAIN_JS, "--no-sandbox", "--enable-unsafe-swiftshader"],
		env: {
			...process.env,
			NODE_ENV: "production",
			HEADLESS: process.env["HEADLESS"] ?? "true",
		},
	});

	app.process().stdout?.on("data", (d) => process.stdout.write(`[electron] ${d}`));
	app.process().stderr?.on("data", (d) => process.stderr.write(`[electron] ${d}`));

	try {
		let hudWindow = await app.firstWindow({ timeout: 60_000 });
		await hudWindow.waitForLoadState("domcontentloaded");

		const sources = await hudWindow.evaluate(async () => {
			return await window.electronAPI.getSources({
				types: ["screen", "window"],
				thumbnailSize: { width: 320, height: 180 },
				fetchWindowIcons: true,
			});
		});
		expect(sources.length).toBeGreaterThan(0);

		const source =
			sources.find((s) => String(s.id).startsWith("screen:")) ??
			sources.find((s) => String(s.id).startsWith("window:")) ??
			sources[0];

		await hudWindow.evaluate(async (selectedSource) => {
			await window.electronAPI.selectSource(selectedSource);
		}, source);

		const selected = await hudWindow.evaluate(async () => {
			return await window.electronAPI.getSelectedSource();
		});
		expect(selected).toBeTruthy();
		expect(String(selected.id)).toBe(String(source.id));

		const recordButton = hudWindow.getByTestId("testId-hud-record-button");
		await expect(recordButton).toBeEnabled({ timeout: 10_000 });
		await recordButton.click({ force: true });
		await delay(2500);

		const recordingStarted = await hudWindow.evaluate(() => {
			const bodyText = document.body.innerText;
			const buttons = Array.from(document.querySelectorAll("button"));
			return /\d+:\d\d/.test(bodyText) || buttons.length > 9;
		});
		expect(recordingStarted).toBe(true);

		await recordButton.click({ force: true });
		await delay(6000);

		let editorWindow = null;
		for (let i = 0; i < 40; i += 1) {
			for (const window of app.windows()) {
				try {
					const url = await window.url();
					if (url.includes("windowType=editor")) {
						editorWindow = window;
						break;
					}
				} catch {
					// ignore closed windows during transition
				}
			}
			if (editorWindow) break;
			await delay(500);
		}

		expect(editorWindow).toBeTruthy();
		hudWindow = editorWindow!;
		await hudWindow.waitForLoadState("domcontentloaded");
		await expect(hudWindow.locator("body")).toContainText(/Load Project|프로젝트 불러오기/);
	} finally {
		await app.close();
	}
});
