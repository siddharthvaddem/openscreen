import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import electron from "vite-plugin-electron/simple";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		react(),
		electron({
			main: {
				entry: "electron/main.ts",
				vite: {
					build: {},
				},
			},
			preload: {
				input: path.join(__dirname, "electron/preload.ts"),
			},
			renderer: process.env.NODE_ENV === "test" ? undefined : {},
		}),
	],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
		},
	},
	build: {
		target: "esnext",
		minify: "terser",
		terserOptions: {
			compress: {
				drop_console: true,
				drop_debugger: true,
				pure_funcs: ["console.log", "console.debug"],
			},
		},
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (id.includes("pixi.js") || id.includes("pixi-filters") || id.includes("@pixi/"))
						return "pixi";
					if (id.includes("react-dom") || id.includes("/react/")) return "react-vendor";
					if (
						id.includes("mediabunny") ||
						id.includes("mp4box") ||
						id.includes("fix-webm-duration")
					)
						return "video-processing";
				},
			},
		},
		chunkSizeWarningLimit: 1000,
	},
});
