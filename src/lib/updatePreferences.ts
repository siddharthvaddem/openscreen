const DISMISSED_VERSION_KEY = "openscreen_dismissed_update_version";
const CHECKS_DISABLED_KEY = "openscreen_update_checks_disabled";

export function getDismissedUpdateVersion(): string | null {
	try {
		return localStorage.getItem(DISMISSED_VERSION_KEY);
	} catch (error) {
		console.error("Failed to read dismissed update version from localStorage:", error);
		return null;
	}
}

export function saveDismissedUpdateVersion(version: string): void {
	try {
		localStorage.setItem(DISMISSED_VERSION_KEY, version);
	} catch (error) {
		console.error("Failed to save dismissed update version to localStorage:", error);
	}
}

export function getUpdateChecksDisabled(): boolean {
	try {
		return localStorage.getItem(CHECKS_DISABLED_KEY) === "true";
	} catch (error) {
		console.error("Failed to read update checks disabled state from localStorage:", error);
		return false;
	}
}

export function setUpdateChecksDisabled(disabled: boolean): void {
	try {
		localStorage.setItem(CHECKS_DISABLED_KEY, disabled ? "true" : "false");
	} catch (error) {
		console.error("Failed to save update checks disabled state to localStorage:", error);
	}
}
