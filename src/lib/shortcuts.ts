export const SHORTCUT_ACTIONS = [
	"addZoom",
	"addTrim",
	"addSpeed",
	"addAnnotation",
	"addKeyframe",
	"deleteSelected",
	"playPause",
] as const;

export type ShortcutAction = (typeof SHORTCUT_ACTIONS)[number];

export interface ShortcutBinding {
	key: string;
	/** Maps to Cmd on macOS, Ctrl on Windows/Linux */
	ctrl?: boolean;
	shift?: boolean;
	alt?: boolean;
}

export type ShortcutsConfig = Record<ShortcutAction, ShortcutBinding>;

export interface FixedShortcut {
	i18nKey: string;
	label: string;
	display: string;
	bindings: ShortcutBinding[];
}

export const FIXED_SHORTCUTS: FixedShortcut[] = [
	{ i18nKey: "undo", label: "Undo", display: "Ctrl + Z", bindings: [{ key: "z", ctrl: true }] },
	{
		i18nKey: "redo",
		label: "Redo",
		display: "Ctrl + Shift + Z / Ctrl + Y",
		bindings: [
			{ key: "z", ctrl: true, shift: true },
			{ key: "y", ctrl: true },
		],
	},
	{
		i18nKey: "cycleAnnotationsForward",
		label: "Cycle Annotations Forward",
		display: "Tab",
		bindings: [{ key: "tab" }],
	},
	{
		i18nKey: "cycleAnnotationsBackward",
		label: "Cycle Annotations Backward",
		display: "Shift + Tab",
		bindings: [{ key: "tab", shift: true }],
	},
	{
		i18nKey: "deleteSelectedAlt",
		label: "Delete Selected (alt)",
		display: "Del / ⌫",
		bindings: [{ key: "delete" }, { key: "backspace" }],
	},
	{
		i18nKey: "panTimeline",
		label: "Pan Timeline",
		display: "Shift + Ctrl + Scroll",
		bindings: [],
	},
	{ i18nKey: "zoomTimeline", label: "Zoom Timeline", display: "Ctrl + Scroll", bindings: [] },
	{ i18nKey: "frameBack", label: "Frame Back", display: "←", bindings: [{ key: "arrowleft" }] },
	{
		i18nKey: "frameForward",
		label: "Frame Forward",
		display: "→",
		bindings: [{ key: "arrowright" }],
	},
];

export type ShortcutConflict =
	| { type: "configurable"; action: ShortcutAction }
	| { type: "fixed"; label: string };

export function bindingsEqual(a: ShortcutBinding, b: ShortcutBinding): boolean {
	return (
		a.key.toLowerCase() === b.key.toLowerCase() &&
		!!a.ctrl === !!b.ctrl &&
		!!a.shift === !!b.shift &&
		!!a.alt === !!b.alt
	);
}

export function findConflict(
	binding: ShortcutBinding,
	forAction: ShortcutAction,
	config: ShortcutsConfig,
): ShortcutConflict | null {
	for (const fixed of FIXED_SHORTCUTS) {
		if (fixed.bindings.some((b) => bindingsEqual(b, binding))) {
			return { type: "fixed", label: fixed.label };
		}
	}
	for (const action of SHORTCUT_ACTIONS) {
		if (action !== forAction && bindingsEqual(config[action], binding)) {
			return { type: "configurable", action };
		}
	}
	return null;
}

export const DEFAULT_SHORTCUTS: ShortcutsConfig = {
	addZoom: { key: "z" },
	addTrim: { key: "t" },
	addSpeed: { key: "s" },
	addAnnotation: { key: "a" },
	addKeyframe: { key: "f" },
	deleteSelected: { key: "d", ctrl: true },
	playPause: { key: " " },
};

export const SHORTCUT_LABELS: Record<ShortcutAction, string> = {
	addZoom: "Add Zoom",
	addTrim: "Add Trim",
	addSpeed: "Add Speed",
	addAnnotation: "Add Annotation",
	addKeyframe: "Add Keyframe",
	deleteSelected: "Delete Selected",
	playPause: "Play / Pause",
};

export function matchesShortcut(
	e: KeyboardEvent,
	binding: ShortcutBinding,
	isMacPlatform: boolean,
): boolean {
	if (e.key.toLowerCase() !== binding.key.toLowerCase()) return false;

	const primaryMod = isMacPlatform ? e.metaKey : e.ctrlKey;
	if (primaryMod !== !!binding.ctrl) return false;
	if (e.shiftKey !== !!binding.shift) return false;
	if (e.altKey !== !!binding.alt) return false;

	return true;
}

const KEY_LABELS: Record<string, string> = {
	" ": "Space",
	delete: "Del",
	backspace: "⌫",
	escape: "Esc",
	arrowup: "↑",
	arrowdown: "↓",
	arrowleft: "←",
	arrowright: "→",
};

export function formatBinding(binding: ShortcutBinding, isMac: boolean): string {
	const parts: string[] = [];
	if (binding.ctrl) parts.push(isMac ? "⌘" : "Ctrl");
	if (binding.shift) parts.push(isMac ? "⇧" : "Shift");
	if (binding.alt) parts.push(isMac ? "⌥" : "Alt");
	parts.push(KEY_LABELS[binding.key] ?? binding.key.toUpperCase());
	return parts.join(" + ");
}

export function mergeWithDefaults(partial: Partial<ShortcutsConfig>): ShortcutsConfig {
	const merged = { ...DEFAULT_SHORTCUTS };
	for (const action of SHORTCUT_ACTIONS) {
		if (partial[action]) {
			merged[action] = partial[action] as ShortcutBinding;
		}
	}
	return merged;
}
