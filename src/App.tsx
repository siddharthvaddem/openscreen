import { useEffect, useState } from "react";
import { LaunchWindow } from "./components/launch/LaunchWindow";
import { SourceSelector } from "./components/launch/SourceSelector";
import { Toaster } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { ShortcutsConfigDialog } from "./components/video-editor/ShortcutsConfigDialog";
import VideoEditor from "./components/video-editor/VideoEditor";
import { ShortcutsProvider } from "./contexts/ShortcutsContext";
import { AuthGate } from "./features/auth/AuthGate";
import { DesktopAuthDialog } from "./features/auth/DesktopAuthDialog";
import { TrialExpiredGate } from "./features/auth/TrialExpiredGate";
import { useAuthSession } from "./features/auth/useAuthSession";
import { loadAllCustomFonts } from "./lib/customFonts";

export default function App() {
	const [windowType, setWindowType] = useState("");
	const authSession = useAuthSession();

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const type = params.get("windowType") || "";
		setWindowType(type);
		if (type === "hud-overlay" || type === "source-selector") {
			document.body.style.background = "transparent";
			document.documentElement.style.background = "transparent";
			document.getElementById("root")?.style.setProperty("background", "transparent");
		}

		loadAllCustomFonts().catch((error) => {
			console.error("Failed to load custom fonts:", error);
		});
	}, []);

	const content = (() => {
		switch (windowType) {
			case "hud-overlay":
				return <LaunchWindow />;
			case "source-selector":
				return <SourceSelector />;
			case "editor": {
				if (authSession.state.status === "booting") {
					return (
						<div className="flex h-screen items-center justify-center bg-[#09090b] text-white">
							<div className="flex flex-col items-center gap-3">
								<div className="h-10 w-10 rounded-full border-2 border-white/15 border-t-[#34B27B] animate-spin" />
								<div className="text-sm text-white/65">Auto Screen 시작 중입니다.</div>
							</div>
						</div>
					);
				}
				if (
					authSession.state.status === "signed_out" ||
					authSession.state.status === "pending_browser_auth" ||
					authSession.state.status === "session_expired"
				) {
					return <AuthGate state={authSession.state} actions={authSession.actions} />;
				}

				if (!authSession.access.canUseEditor) {
					return (
						<TrialExpiredGate
							onUpgrade={authSession.actions.openPricing}
							onSignOut={authSession.actions.signOut}
						/>
					);
				}

				return (
					<ShortcutsProvider>
						<VideoEditor
							accessPolicy={authSession.access}
							onUpgrade={authSession.actions.openPricing}
							onOpenLogin={authSession.actions.openLogin}
							onOpenSignup={authSession.actions.openEmailSignup}
						/>
						<ShortcutsConfigDialog />
					</ShortcutsProvider>
				);
			}
			default:
				return (
					<div className="w-full h-full bg-background text-foreground">
						<h1>Auto Screen</h1>
					</div>
				);
		}
	})();

	return (
		<TooltipProvider>
			{content}
			<DesktopAuthDialog ui={authSession.ui} actions={authSession.actions} />
			<Toaster theme="dark" className="pointer-events-auto" />
		</TooltipProvider>
	);
}
