let cachedPlatform: string | null = null;

/**
 * Gets the current platform from Electron
 */
export const getPlatform = async (): Promise<string> => {
	if (cachedPlatform) return cachedPlatform;

	try {
		const platform = await window.electronAPI.getPlatform();
		cachedPlatform = platform;
		return platform;
	} catch (error) {
		console.warn("Failed to get platform from Electron, falling back to navigator:", error);
		// Fallback for development/testing
		let fallbackPlatform = "win32";
		if (typeof navigator !== "undefined") {
			if (/Mac|iPhone|iPad|iPod/.test(navigator.platform)) {
				fallbackPlatform = "darwin";
			} else if (/Linux/.test(navigator.platform)) {
				fallbackPlatform = "linux";
			}
		}

		cachedPlatform = fallbackPlatform;
		return fallbackPlatform;
	}
};

/**
 * Detects if the current platform is macOS
 */
export const isMac = async (): Promise<boolean> => {
	const platform = await getPlatform();
	return platform === "darwin";
};

/**
 * Gets the modifier key symbol based on the platform
 */
export const getModifierKey = async (): Promise<string> => {
	return (await isMac()) ? "⌘" : "Ctrl";
};

/**
 * Gets the shift key symbol based on the platform
 */
export const getShiftKey = async (): Promise<string> => {
	return (await isMac()) ? "⇧" : "Shift";
};

/**
 * Formats a keyboard shortcut for display based on the platform
 * @param keys Array of key combinations (e.g., ['mod', 'D'] or ['shift', 'mod', 'Scroll'])
 */
export const formatShortcut = async (keys: string[]): Promise<string> => {
	const isMacPlatform = await isMac();
	return keys
		.map((key) => {
			if (key.toLowerCase() === "mod") return isMacPlatform ? "⌘" : "Ctrl";
			if (key.toLowerCase() === "shift") return isMacPlatform ? "⇧" : "Shift";
			return key;
		})
		.join(" + ");
};
