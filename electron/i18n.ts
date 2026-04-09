// Lightweight i18n for the Electron main process.
// Imports the same JSON translation files used by the renderer.

import commonEn from "../src/i18n/locales/en/common.json";
import dialogsEn from "../src/i18n/locales/en/dialogs.json";
import commonEs from "../src/i18n/locales/es/common.json";
import dialogsEs from "../src/i18n/locales/es/dialogs.json";
import commonKo from "../src/i18n/locales/ko/common.json";
import dialogsKo from "../src/i18n/locales/ko/dialogs.json";
import commonZh from "../src/i18n/locales/zh-CN/common.json";
import dialogsZh from "../src/i18n/locales/zh-CN/dialogs.json";

type Locale = "en" | "ko" | "zh-CN" | "es";
type Namespace = "common" | "dialogs";
type MessageMap = Record<string, unknown>;

const messages: Record<Locale, Record<Namespace, MessageMap>> = {
	en: { common: commonEn, dialogs: dialogsEn },
	ko: { common: commonKo, dialogs: dialogsKo },
	"zh-CN": { common: commonZh, dialogs: dialogsZh },
	es: { common: commonEs, dialogs: dialogsEs },
};

let currentLocale: Locale = "en";

export function setMainLocale(locale: string) {
	if (locale === "en" || locale === "ko" || locale === "zh-CN" || locale === "es") {
		currentLocale = locale;
	}
}

export function getMainLocale(): Locale {
	return currentLocale;
}

function getMessageValue(obj: unknown, dotPath: string): string | undefined {
	const keys = dotPath.split(".");
	let current: unknown = obj;
	for (const key of keys) {
		if (current == null || typeof current !== "object") return undefined;
		current = (current as Record<string, unknown>)[key];
	}
	return typeof current === "string" ? current : undefined;
}

function interpolate(str: string, vars?: Record<string, string | number>): string {
	if (!vars) return str;
	return str.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(vars[key] ?? `{{${key}}}`));
}

export function mainT(
	namespace: Namespace,
	key: string,
	vars?: Record<string, string | number>,
): string {
	const value =
		getMessageValue(messages[currentLocale]?.[namespace], key) ??
		getMessageValue(messages.en?.[namespace], key);

	if (value == null) return `${namespace}.${key}`;
	return interpolate(value, vars);
}
