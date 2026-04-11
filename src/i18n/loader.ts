import { DEFAULT_LOCALE, I18N_NAMESPACES, type I18nNamespace, type Locale } from "./config";

type MessageMap = Record<string, unknown>;
type LocaleValidationError = {
	locale: string;
	missingNamespaces: I18nNamespace[];
};

const modules = import.meta.glob("./locales/**/*.json", { eager: true }) as Record<
	string,
	{ default: MessageMap }
>;

const messages: Record<string, Record<string, MessageMap>> = {};

for (const [path, mod] of Object.entries(modules)) {
	// path looks like "./locales/en/common.json"
	const parts = path.replace("./locales/", "").replace(".json", "").split("/");
	const locale = parts[0];
	const namespace = parts[1];
	if (!messages[locale]) messages[locale] = {};
	messages[locale][namespace] = mod.default;
}

const REQUIRED_NAMESPACES = new Set<string>(I18N_NAMESPACES);

const localeValidationErrors: LocaleValidationError[] = Object.keys(messages)
	.map((locale) => {
		const localeMessages = messages[locale] ?? {};
		const missingNamespaces = I18N_NAMESPACES.filter((namespace) => !localeMessages[namespace]);
		return {
			locale,
			missingNamespaces,
		};
	})
	.filter((entry) => entry.missingNamespaces.length > 0);

const invalidLocales = new Set(localeValidationErrors.map((entry) => entry.locale));

const availableLocales = Object.keys(messages)
	.filter((locale) => REQUIRED_NAMESPACES.size > 0 && hasRequiredNamespaces(messages[locale]))
	.filter((locale) => !invalidLocales.has(locale))
	.sort((a, b) => {
		if (a === DEFAULT_LOCALE) return -1;
		if (b === DEFAULT_LOCALE) return 1;
		return a.localeCompare(b);
	});

if (localeValidationErrors.length > 0) {
	console.error("[i18n] Incomplete locale folders were excluded:");
	for (const entry of localeValidationErrors) {
		console.error(
			`[i18n] ${entry.locale}: missing ${entry.missingNamespaces.map((ns) => `${ns}.json`).join(", ")}`,
		);
	}
}

function hasRequiredNamespaces(localeMessages: Record<string, MessageMap> | undefined): boolean {
	if (!localeMessages) return false;
	for (const namespace of REQUIRED_NAMESPACES) {
		if (!localeMessages[namespace]) return false;
	}
	return true;
}

function isAvailableLocale(locale: string): locale is Locale {
	return availableLocales.includes(locale);
}

export function getAvailableLocales(): Locale[] {
	if (availableLocales.length === 0) {
		return [DEFAULT_LOCALE];
	}
	return availableLocales;
}

export function getLocaleValidationErrors(): LocaleValidationError[] {
	return localeValidationErrors;
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

export function getMessages(locale: Locale, namespace: I18nNamespace): MessageMap {
	const resolvedLocale = isAvailableLocale(locale) ? locale : DEFAULT_LOCALE;
	return messages[resolvedLocale]?.[namespace] ?? {};
}

export function getLocaleName(locale: Locale): string {
	const resolvedLocale = isAvailableLocale(locale) ? locale : DEFAULT_LOCALE;
	return getMessageValue(messages[resolvedLocale]?.common, "locale.name") ?? locale;
}

export function getLocaleShort(locale: Locale): string {
	const resolvedLocale = isAvailableLocale(locale) ? locale : DEFAULT_LOCALE;
	return getMessageValue(messages[resolvedLocale]?.common, "locale.short") ?? locale;
}

export function translate(
	locale: Locale,
	namespace: I18nNamespace,
	key: string,
	vars?: Record<string, string | number>,
): string {
	const value =
		getMessageValue(
			messages[isAvailableLocale(locale) ? locale : DEFAULT_LOCALE]?.[namespace],
			key,
		) ?? getMessageValue(messages[DEFAULT_LOCALE]?.[namespace], key);

	if (value == null) return `${namespace}.${key}`;
	return interpolate(value, vars);
}
