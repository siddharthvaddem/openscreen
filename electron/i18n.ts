// Lightweight i18n for the Electron main process.
// Imports the same JSON translation files used by the renderer.

import commonAr from "../src/i18n/locales/ar/common.json";
import dialogsAr from "../src/i18n/locales/ar/dialogs.json";
import commonEn from "../src/i18n/locales/en/common.json";
import dialogsEn from "../src/i18n/locales/en/dialogs.json";
import commonEs from "../src/i18n/locales/es/common.json";
import dialogsEs from "../src/i18n/locales/es/dialogs.json";
import commonFr from "../src/i18n/locales/fr/common.json";
import dialogsFr from "../src/i18n/locales/fr/dialogs.json";
import commonJa from "../src/i18n/locales/ja-JP/common.json";
import dialogsJa from "../src/i18n/locales/ja-JP/dialogs.json";
import commonKo from "../src/i18n/locales/ko-KR/common.json";
import dialogsKo from "../src/i18n/locales/ko-KR/dialogs.json";
import commonTr from "../src/i18n/locales/tr/common.json";
import dialogsTr from "../src/i18n/locales/tr/dialogs.json";
import commonZh from "../src/i18n/locales/zh-CN/common.json";
import dialogsZh from "../src/i18n/locales/zh-CN/dialogs.json";
import commonZhTw from "../src/i18n/locales/zh-TW/common.json";
import dialogsZhTw from "../src/i18n/locales/zh-TW/dialogs.json";

type Locale = "en" | "zh-CN" | "zh-TW" | "es" | "fr" | "ja-JP" | "ko-KR" | "tr" | "ar";
type Namespace = "common" | "dialogs";
type MessageMap = Record<string, unknown>;

const messages: Record<Locale, Record<Namespace, MessageMap>> = {
	en: { common: commonEn, dialogs: dialogsEn },
	"zh-CN": { common: commonZh, dialogs: dialogsZh },
	"zh-TW": { common: commonZhTw, dialogs: dialogsZhTw },
	es: { common: commonEs, dialogs: dialogsEs },
	fr: { common: commonFr, dialogs: dialogsFr },
	"ja-JP": { common: commonJa, dialogs: dialogsJa },
	"ko-KR": { common: commonKo, dialogs: dialogsKo },
	tr: { common: commonTr, dialogs: dialogsTr },
	ar: { common: commonAr, dialogs: dialogsAr },
};

let currentLocale: Locale = "en";

export function setMainLocale(locale: string) {
	if (
		locale === "en" ||
		locale === "zh-CN" ||
		locale === "zh-TW" ||
		locale === "es" ||
		locale === "fr" ||
		locale === "ja-JP" ||
		locale === "ko-KR" ||
		locale === "tr" ||
		locale === "ar"
	) {
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
