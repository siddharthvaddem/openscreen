export const DEFAULT_LOCALE = "ko" as const;
export const SUPPORTED_LOCALES = ["en", "ko", "zh-CN", "es"] as const;
export const I18N_NAMESPACES = [
	"common",
	"dialogs",
	"editor",
	"launch",
	"settings",
	"shortcuts",
	"timeline",
] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];
export type I18nNamespace = (typeof I18N_NAMESPACES)[number];

export const LOCALE_STORAGE_KEY = "autoscreen-locale";
export const LEGACY_LOCALE_STORAGE_KEY = "openscreen-locale";
