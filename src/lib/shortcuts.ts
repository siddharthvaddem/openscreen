export {
	bindingsEqual,
	DEFAULT_SHORTCUTS,
	FIXED_SHORTCUTS,
	type FixedShortcut,
	findConflict,
	formatBinding,
	mergeWithDefaults,
	SHORTCUT_ACTIONS,
	SHORTCUT_LABELS,
	type ShortcutAction,
	type ShortcutBinding,
	type ShortcutConflict,
	type ShortcutsConfig,
} from "@/shared/shortcuts";

// Browser-only — uses KeyboardEvent DOM type.
export function matchesShortcut(
	e: KeyboardEvent,
	binding: import("@/shared/shortcuts").ShortcutBinding | undefined,
	isMacPlatform: boolean,
): boolean {
	if (!binding) return false;
	if (e.key.toLowerCase() !== binding.key.toLowerCase()) return false;

	const primaryMod = isMacPlatform ? e.metaKey : e.ctrlKey;
	if (primaryMod !== !!binding.ctrl) return false;
	if (e.shiftKey !== !!binding.shift) return false;
	if (e.altKey !== !!binding.alt) return false;

	return true;
}
