#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skillsDir = path.resolve(__dirname, "..", "skills");
const rulesDir = path.join(skillsDir, "rules");

const RULE_MAPPING: Record<string, string> = {
	project: "project-setup.md",
	create: "project-setup.md",
	setup: "project-setup.md",
	zoom: "zoom-regions.md",
	focus: "zoom-regions.md",
	depth: "zoom-regions.md",
	trim: "trim-speed.md",
	cut: "trim-speed.md",
	speed: "trim-speed.md",
	playback: "trim-speed.md",
	annotate: "annotations.md",
	annotation: "annotations.md",
	text: "annotations.md",
	arrow: "annotations.md",
	figure: "annotations.md",
	render: "export-render.md",
	export: "export-render.md",
	mp4: "export-render.md",
	gif: "export-render.md",
	error: "troubleshooting.md",
	troubleshoot: "troubleshooting.md",
	debug: "troubleshooting.md",
	fix: "troubleshooting.md",
};

// Cache skill file contents at startup (static files, never change at runtime)
const fileCache = new Map<string, string>();

function readCached(filePath: string): string | null {
	const cached = fileCache.get(filePath);
	if (cached !== undefined) return cached;
	try {
		const content = fs.readFileSync(filePath, "utf-8");
		fileCache.set(filePath, content);
		return content;
	} catch {
		return null;
	}
}

function loadSkillContent(query: string): string {
	const q = query.toLowerCase();

	const matchedFiles = new Set<string>();
	for (const [keyword, file] of Object.entries(RULE_MAPPING)) {
		if (q.includes(keyword)) {
			matchedFiles.add(file);
		}
	}

	if (matchedFiles.size === 0) {
		return (
			readCached(path.join(skillsDir, "SKILL.md")) ??
			"OpenScreen CLI help. Use `openscreen --help` to see all commands."
		);
	}

	const sections: string[] = [];
	for (const file of matchedFiles) {
		const content = readCached(path.join(rulesDir, file));
		if (content) sections.push(content);
	}

	return sections.join("\n\n---\n\n");
}

const server = new McpServer({
	name: "openscreen-mcp",
	version: "1.0.0",
});

server.tool(
	"openscreen_help",
	"Search OpenScreen CLI documentation. Returns guidance on using the CLI for project creation, zoom/trim/speed/annotation management, rendering, and frame capture.",
	{
		query: z
			.string()
			.describe(
				"What you want to do (e.g., 'add a zoom region', 'render to mp4', 'create a project')",
			),
	},
	async ({ query }) => {
		const content = loadSkillContent(query);
		return {
			content: [{ type: "text" as const, text: content }],
		};
	},
);

async function main() {
	const transport = new StdioServerTransport();
	await server.connect(transport);
}

main().catch(console.error);
