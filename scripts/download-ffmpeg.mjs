#!/usr/bin/env node

/**
 * Downloads the correct FFmpeg static build for the current platform.
 * Run with: node scripts/download-ffmpeg.mjs
 *
 * Places the binary in vendor/ffmpeg/<platform>/
 * This is called at build time, NOT bundled in the repo.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";

const VENDOR_DIR = path.join(process.cwd(), "vendor", "ffmpeg");

// FFmpeg static build URLs
const SOURCES = {
	win32: {
		// gyan.dev essentials build — ~80MB, includes all common codecs + HW encoders
		url: "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip",
		binaryPath: "ffmpeg-*-essentials_build/bin/ffmpeg.exe",
		outputDir: "win32",
		outputName: "ffmpeg.exe",
	},
	darwin: {
		url: "https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip",
		binaryPath: "ffmpeg",
		outputDir: "darwin",
		outputName: "ffmpeg",
	},
	linux: {
		url: "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz",
		binaryPath: "ffmpeg-*-amd64-static/ffmpeg",
		outputDir: "linux",
		outputName: "ffmpeg",
	},
};

const platform = os.platform();

async function main() {
	const source = SOURCES[platform];
	if (!source) {
		console.error(`Unsupported platform: ${platform}`);
		console.error("Supported platforms: win32, darwin, linux");
		process.exit(1);
	}

	const outputDir = VENDOR_DIR;
	const outputPath = path.join(outputDir, source.outputName);

	// Check if already downloaded
	if (fs.existsSync(outputPath)) {
		console.log(`FFmpeg already exists at ${outputPath}`);
		console.log("Delete it and re-run to re-download.");
		return;
	}

	console.log(`Downloading FFmpeg for ${platform}...`);
	console.log(`URL: ${source.url}`);

	// Create output directory
	fs.mkdirSync(outputDir, { recursive: true });

	const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ffmpeg-download-"));
	const ext = source.url.endsWith(".zip")
		? ".zip"
		: source.url.endsWith(".tar.xz")
			? ".tar.xz"
			: ".tar.gz";
	const tmpFile = path.join(tmpDir, `ffmpeg${ext}`);

	try {
		// Download
		await downloadFile(source.url, tmpFile);
		console.log(`Downloaded to ${tmpFile}`);

		// Extract
		console.log("Extracting...");
		if (ext === ".zip") {
			if (platform === "win32") {
				// Use PowerShell's Expand-Archive on Windows
				execSync(
					`powershell -NoProfile -Command "Expand-Archive -Force -Path '${tmpFile}' -DestinationPath '${tmpDir}'"`,
					{ stdio: "inherit" },
				);
			} else {
				execSync(`unzip -o "${tmpFile}" -d "${tmpDir}"`, { stdio: "inherit" });
			}
		} else if (ext === ".tar.xz") {
			execSync(`tar xf "${tmpFile}" -C "${tmpDir}"`, { stdio: "inherit" });
		} else {
			execSync(`tar xzf "${tmpFile}" -C "${tmpDir}"`, { stdio: "inherit" });
		}

		// Find the binary using glob pattern
		const binaryPath = findFile(tmpDir, source.binaryPath);
		if (!binaryPath) {
			throw new Error(
				`Could not find FFmpeg binary matching pattern: ${source.binaryPath}\nExtracted files: ${listFiles(tmpDir).join("\n")}`,
			);
		}

		// Copy to vendor directory
		fs.copyFileSync(binaryPath, outputPath);

		// Make executable on Unix
		if (platform !== "win32") {
			fs.chmodSync(outputPath, 0o755);
		}

		console.log(`FFmpeg installed to ${outputPath}`);

		// Verify
		const version = execSync(`"${outputPath}" -version`, { encoding: "utf-8" }).split("\n")[0];
		console.log(`Version: ${version}`);
	} finally {
		// Cleanup
		fs.rmSync(tmpDir, { recursive: true, force: true });
	}
}

function downloadFile(url, dest) {
	return new Promise((resolve, reject) => {
		const follow = (url, redirects = 0) => {
			if (redirects > 5) {
				reject(new Error("Too many redirects"));
				return;
			}

			const protocol = url.startsWith("https") ? https : http;
			protocol
				.get(url, { headers: { "User-Agent": "openscreen-build" } }, (res) => {
					if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
						follow(res.headers.location, redirects + 1);
						return;
					}

					if (res.statusCode !== 200) {
						reject(new Error(`HTTP ${res.statusCode}: ${url}`));
						return;
					}

					const file = fs.createWriteStream(dest);
					let downloaded = 0;
					const totalLength = parseInt(res.headers["content-length"] || "0", 10);

					res.on("data", (chunk) => {
						downloaded += chunk.length;
						if (totalLength > 0) {
							const pct = ((downloaded / totalLength) * 100).toFixed(1);
							process.stdout.write(
								`\rDownloading: ${pct}% (${(downloaded / 1024 / 1024).toFixed(1)} MB)`,
							);
						}
					});

					pipeline(res, file)
						.then(() => {
							console.log("\nDownload complete.");
							resolve();
						})
						.catch(reject);
				})
				.on("error", reject);
		};

		follow(url);
	});
}

function findFile(dir, pattern) {
	// Simple glob matching for patterns like "ffmpeg-*-essentials_build/bin/ffmpeg.exe"
	const parts = pattern.split("/");
	return findFileRecursive(dir, parts, 0);
}

function findFileRecursive(dir, parts, depth) {
	if (depth >= parts.length) return null;

	const pattern = parts[depth];
	const isLastPart = depth === parts.length - 1;

	try {
		const entries = fs.readdirSync(dir, { withFileTypes: true });
		for (const entry of entries) {
			if (matchGlob(entry.name, pattern)) {
				const fullPath = path.join(dir, entry.name);
				if (isLastPart) {
					if (entry.isFile()) return fullPath;
				} else {
					if (entry.isDirectory()) {
						const result = findFileRecursive(fullPath, parts, depth + 1);
						if (result) return result;
					}
				}
			}
		}
	} catch {
		// Directory doesn't exist or can't be read
	}

	return null;
}

function matchGlob(name, pattern) {
	if (pattern === "*") return true;
	if (!pattern.includes("*")) return name === pattern;
	const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
	return regex.test(name);
}

function listFiles(dir, prefix = "") {
	const results = [];
	try {
		const entries = fs.readdirSync(dir, { withFileTypes: true });
		for (const entry of entries) {
			const name = prefix ? `${prefix}/${entry.name}` : entry.name;
			results.push(name);
			if (entry.isDirectory()) {
				results.push(...listFiles(path.join(dir, entry.name), name));
			}
		}
	} catch {
		// ignore
	}
	return results;
}

main().catch((error) => {
	console.error("Failed to download FFmpeg:", error);
	process.exit(1);
});
