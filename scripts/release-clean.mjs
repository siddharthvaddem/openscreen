import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"));
const version = packageJson.version;
const releaseDir = path.join(projectRoot, "release", version);

if (!fs.existsSync(releaseDir)) {
	console.error(`release directory not found: ${releaseDir}`);
	process.exit(1);
}

const keepPatterns = [
	/^Auto Screen-.*-mac-(arm64|x64)\.dmg$/,
	/^Auto Screen-.*-mac-(arm64|x64)\.dmg\.blockmap$/,
	/^Auto Screen-.*-win-x64\.exe$/,
	/^Auto Screen-.*-linux-x64\.AppImage$/,
	/^Auto Screen-.*-linux-x64\.deb$/,
	/^latest(-mac|-linux|-win)?\.yml$/,
];

const removed = [];

for (const entry of fs.readdirSync(releaseDir, { withFileTypes: true })) {
	const fullPath = path.join(releaseDir, entry.name);
	const shouldKeep = entry.isFile() && keepPatterns.some((pattern) => pattern.test(entry.name));

	if (shouldKeep) {
		continue;
	}

	fs.rmSync(fullPath, { recursive: true, force: true });
	removed.push(entry.name);
}

console.log(JSON.stringify({ version, releaseDir, removed }, null, 2));
