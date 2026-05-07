import { useEffect, useState } from "react";
import { CountdownOverlay } from "./components/launch/CountdownOverlay.tsx";
import { LaunchWindow } from "./components/launch/LaunchWindow";
import { SourceSelector } from "./components/launch/SourceSelector";
import { Toaster } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { ShortcutsConfigDialog } from "./components/video-editor/ShortcutsConfigDialog";
import VideoEditor from "./components/video-editor/VideoEditor";
import { ShortcutsProvider } from "./contexts/ShortcutsContext";
import { forceCheckForUpdate, maybeShowUpdateToast } from "./lib/checkForUpdate";
import { loadAllCustomFonts } from "./lib/customFonts";

const UPDATE_CHECK_DELAY_MS = 3000;

export default function App() {
	const [windowType, setWindowType] = useState(
		() => new URLSearchParams(window.location.search).get("windowType") || "",
	);

	useEffect(() => {
		const type = new URLSearchParams(window.location.search).get("windowType") || "";
		if (type !== windowType) {
			setWindowType(type);
		}

		if (type === "hud-overlay" || type === "source-selector" || type === "countdown-overlay") {
			document.body.style.background = "transparent";
			document.documentElement.style.background = "transparent";
			document.getElementById("root")?.style.setProperty("background", "transparent");
		}

		// HUD is a fixed-size BrowserWindow; pin the document shell and hide overflow
		// so the renderer can't introduce scrollbars (see issue #305).
		if (type === "hud-overlay") {
			document.documentElement.style.height = "100%";
			document.documentElement.style.overflow = "hidden";
			document.body.style.height = "100%";
			document.body.style.margin = "0";
			document.body.style.overflow = "hidden";
			const root = document.getElementById("root");
			root?.style.setProperty("height", "100%");
			root?.style.setProperty("min-height", "0");
			root?.style.setProperty("overflow", "hidden");
		}
	}, [windowType]);

	useEffect(() => {
		// Load custom fonts on app initialization
		loadAllCustomFonts().catch((error) => {
			console.error("Failed to load custom fonts:", error);
		});
	}, []);

	useEffect(() => {
		if (windowType !== "") return;
		const id = setTimeout(async () => {
			try {
				const version = await window.electronAPI.getAppVersion();
				await maybeShowUpdateToast(version);
			} catch (error) {
				console.error("Error during on-start update check in App useEffect:", error);
			}
		}, UPDATE_CHECK_DELAY_MS);
		return () => clearTimeout(id);
	}, [windowType]);

	useEffect(() => {
		if (
			windowType === "hud-overlay" ||
			windowType === "source-selector" ||
			windowType === "countdown-overlay"
		) {
			return;
		}
		const unsubscribe = window.electronAPI.onMenuCheckForUpdates(async () => {
			try {
				const version = await window.electronAPI.getAppVersion();
				forceCheckForUpdate(version);
			} catch (error) {
				console.error("Error handling onMenuCheckForUpdates in App:", error);
			}
		});
		return unsubscribe;
	}, [windowType]);

	const content = (() => {
		switch (windowType) {
			case "hud-overlay":
				return <LaunchWindow />;
			case "source-selector":
				return <SourceSelector />;
			case "countdown-overlay":
				return <CountdownOverlay />;
			case "editor":
				return (
					<ShortcutsProvider>
						<VideoEditor />
						<ShortcutsConfigDialog />
					</ShortcutsProvider>
				);
			default:
				return (
					<div className="w-full h-full bg-background text-foreground">
						<h1>Openscreen</h1>
					</div>
				);
		}
	})();

	return (
		<TooltipProvider>
			{content}
			<Toaster theme="dark" className="pointer-events-auto" />
		</TooltipProvider>
	);
}
