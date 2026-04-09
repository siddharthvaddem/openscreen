import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"));
const version = packageJson.version;
const releaseDir = path.join(projectRoot, "release", version);

function listTopLevelFiles(dir) {
	const results = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (!entry.isFile()) continue;
		const fullPath = path.join(dir, entry.name);
		const stat = fs.statSync(fullPath);
		results.push({
			name: entry.name,
			bytes: stat.size,
		});
	}
	return results;
}

if (!fs.existsSync(releaseDir)) {
	console.error(`release directory not found: ${releaseDir}`);
	process.exit(1);
}

const files = listTopLevelFiles(releaseDir)
	.sort((a, b) => a.name.localeCompare(b.name))
	.map((file) => ({
		...file,
		sizeMB: Number((file.bytes / 1024 / 1024).toFixed(2)),
	}));

console.log(JSON.stringify({ version, releaseDir, files }, null, 2));
