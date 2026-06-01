export const DEFAULT_LOCALE = "en" as const;
export const SUPPORTED_LOCALES = [
	"en",
	"ar",
	"es",
	"fr",
	"it",
	"ja-JP",
	"ko-KR",
	"ru",
	"tr",
	"vi",
	"pt-BR",
	"zh-CN",
	"zh-TW",
] as const;
export const I18N_NAMESPACES = [
	"common",
	"dialogs",
	"editor",
	"launch",
	"settings",
	"shortcuts",
	"timeline",
] as const;

export type Locale = string;
export type I18nNamespace = (typeof I18N_NAMESPACES)[number];

export const LOCALE_STORAGE_KEY = "openscreen-locale";
