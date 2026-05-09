import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./tests/e2e",
	timeout: 120_000, // GIF encoding is CPU-bound; give it room
	retries: 0,
	workers: 1,
	reporter: "list",
});
