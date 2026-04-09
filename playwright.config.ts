import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./tests/e2e",
	timeout: 120_000,
	retries: 0,
	reporter: "list",
});
