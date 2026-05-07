import { spawnSync } from "node:child_process";
import process from "node:process";

// uiohook-napi click capture is macOS-only at runtime (gated in
// electron/ipc/handlers.ts). Skip the rebuild on other platforms so CI runners
// without X11 dev headers don't fail npm install. The library's prebuilt
// .node binaries are still bundled and loadable; we just don't need a fresh
// build against Electron's ABI on platforms where we don't load it.
if (process.platform !== "darwin") {
	console.log(
		`[rebuild:native] Skipping uiohook-napi rebuild on ${process.platform} (macOS-only).`,
	);
	process.exit(0);
}

const result = spawnSync(
	process.execPath,
	["./node_modules/@electron/rebuild/lib/cli.js", "--force", "--only", "uiohook-napi"],
	{ stdio: "inherit" },
);
process.exit(result.status ?? 0);
