import { toast } from "sonner";
import {
	getDismissedUpdateVersion,
	getUpdateChecksDisabled,
	saveDismissedUpdateVersion,
	setUpdateChecksDisabled,
} from "./updatePreferences";

const RELEASES_API = "https://api.github.com/repos/siddharthvaddem/openscreen/releases/latest";

export interface LatestRelease {
	version: string;
	htmlUrl: string;
}

export async function fetchLatestRelease(): Promise<LatestRelease | null> {
	try {
		const response = await fetch(RELEASES_API, {
			headers: { Accept: "application/vnd.github+json" },
		});
		if (!response.ok) return null;
		const data = (await response.json()) as {
			tag_name?: unknown;
			html_url?: unknown;
		};
		if (typeof data.tag_name !== "string" || typeof data.html_url !== "string") return null;
		const version = data.tag_name.replace(/^v/, "");
		if (version.includes("-")) return null;
		return { version, htmlUrl: data.html_url };
	} catch (error) {
		console.error("checkForUpdate failed:", error);
		return null;
	}
}

export function isNewer(latest: string, current: string): boolean {
	if (latest.includes("-") || current.includes("-")) return false;
	const latestParts = latest.split(".").map((n) => Number.parseInt(n, 10));
	const currentParts = current.split(".").map((n) => Number.parseInt(n, 10));
	if (latestParts.some(Number.isNaN) || currentParts.some(Number.isNaN)) return false;
	const length = Math.max(latestParts.length, currentParts.length);
	for (let i = 0; i < length; i++) {
		const a = latestParts[i] ?? 0;
		const b = currentParts[i] ?? 0;
		if (a > b) return true;
		if (a < b) return false;
	}
	return false;
}

function showUpdateAvailableToast(release: LatestRelease, currentVersion: string): void {
	toast(`OpenScreen ${release.version} is available`, {
		duration: Number.POSITIVE_INFINITY,
		description: `You're on ${currentVersion}`,
		closeButton: true,
		onDismiss: () => saveDismissedUpdateVersion(release.version),
		action: {
			label: "Download",
			onClick: () => window.electronAPI.openExternalUrl(release.htmlUrl),
		},
		cancel: {
			label: "Don't remind again",
			onClick: () => setUpdateChecksDisabled(true),
		},
	});
}

export async function maybeShowUpdateToast(currentVersion: string): Promise<void> {
	if (getUpdateChecksDisabled()) return;
	const release = await fetchLatestRelease();
	if (!release) return;
	if (!isNewer(release.version, currentVersion)) return;
	if (getDismissedUpdateVersion() === release.version) return;
	showUpdateAvailableToast(release, currentVersion);
}

export async function forceCheckForUpdate(currentVersion: string): Promise<void> {
	const release = await fetchLatestRelease();
	if (!release) {
		toast.error("Couldn't check for updates", {
			description: "Check your connection and try again.",
		});
		return;
	}
	if (!isNewer(release.version, currentVersion)) {
		toast.success("OpenScreen is up to date", {
			description: `You're on ${currentVersion}`,
		});
		return;
	}
	showUpdateAvailableToast(release, currentVersion);
}
