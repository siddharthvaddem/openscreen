import fs from "node:fs";
import path from "node:path";
import type { ElectronApplication } from "@playwright/test";

export async function waitForProcessExit(
	child: ReturnType<ElectronApplication["process"]>,
	timeoutMs: number,
) {
	if (child.exitCode !== null || child.killed) return;

	await Promise.race([
		new Promise<void>((resolve) => child.once("exit", () => resolve())),
		new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
	]);
}

export async function closeElectronApp(app: ElectronApplication) {
	const child = app.process();
	await app
		.evaluate(({ app: electronApp }) => {
			electronApp.exit(0);
		})
		.catch(() => {
			// App may already be closing.
		});
	await waitForProcessExit(child, 2_000);
	if (child.exitCode === null && !child.killed) {
		child.kill("SIGKILL");
		await waitForProcessExit(child, 2_000);
	}
}

export async function interceptExportSave(app: ElectronApplication) {
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
}

export async function copyFixtureToRecordings(
	app: ElectronApplication,
	fixturePath: string,
	fileName: string,
) {
	const userDataDir = await app.evaluate(({ app: electronApp }) => {
		return electronApp.getPath("userData");
	});
	const recordingsDir = path.join(userDataDir, "recordings");
	const targetPath = path.join(recordingsDir, fileName);
	fs.mkdirSync(recordingsDir, { recursive: true });
	fs.copyFileSync(fixturePath, targetPath);
	return targetPath;
}

export async function readCapturedExportBuffer(app: ElectronApplication) {
	const base64 = await app.evaluate(
		() => (globalThis as Record<string, unknown>)["__testExportData"] as string,
	);
	if (typeof base64 !== "string" || base64.length === 0) {
		throw new Error("__testExportData was not set or is invalid");
	}
	return Buffer.from(base64, "base64");
}
