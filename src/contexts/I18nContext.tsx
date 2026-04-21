import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { DEFAULT_LOCALE, type I18nNamespace, LOCALE_STORAGE_KEY, type Locale } from "@/i18n/config";
import { getAvailableLocales, translate } from "@/i18n/loader";

type TranslateVars = Record<string, string | number>;

interface I18nContextValue {
	locale: Locale;
	setLocale: (locale: Locale) => void;
	t: (qualifiedKey: string, vars?: TranslateVars) => string;
	systemLocaleSuggestion: Locale | null;
	acceptSystemLocaleSuggestion: () => void;
	dismissSystemLocaleSuggestion: () => void;
	resolveSystemLocaleSuggestion: () => void;
}

const SYSTEM_LANGUAGE_PROMPT_SEEN_KEY = "openscreen-system-language-prompt-seen";

const I18nContext = createContext<I18nContextValue | null>(null);

export function useI18n(): I18nContextValue {
	const ctx = useContext(I18nContext);
	if (!ctx) throw new Error("useI18n must be used within <I18nProvider>");
	return ctx;
}

export function useScopedT(namespace: I18nNamespace) {
	const { locale } = useI18n();
	return useCallback(
		(key: string, vars?: TranslateVars): string => translate(locale, namespace, key, vars),
		[locale, namespace],
	);
}

function isSupportedLocale(value: string): value is Locale {
	return getAvailableLocales().includes(value);
}

function getSupportedSystemLocale(): Locale | null {
	if (typeof navigator === "undefined") return null;
	const availableLocales = getAvailableLocales();

	const candidates =
		Array.isArray(navigator.languages) && navigator.languages.length > 0
			? navigator.languages
			: [navigator.language];

	for (const candidate of candidates) {
		if (!candidate) continue;
		if (isSupportedLocale(candidate)) return candidate;

		const exactMatch = availableLocales.find(
			(locale) => locale.toLowerCase() === candidate.toLowerCase(),
		);
		if (exactMatch) return exactMatch;

		const baseLanguage = candidate.split("-")[0]?.toLowerCase();
		if (!baseLanguage) continue;

		if (baseLanguage === "zh" && availableLocales.includes("zh-CN")) return "zh-CN";

		const baseMatch = availableLocales.find((locale) => locale.toLowerCase() === baseLanguage);
		if (baseMatch) return baseMatch;
	}

	return null;
}

function getInitialLocale(): Locale {
	try {
		const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
		if (stored && isSupportedLocale(stored)) return stored;
	} catch {
		// localStorage may be unavailable
	}
	return DEFAULT_LOCALE;
}

export function I18nProvider({ children }: { children: ReactNode }) {
	const [locale, setLocaleState] = useState<Locale>(getInitialLocale);
	const [systemLocaleSuggestion, setSystemLocaleSuggestion] = useState<Locale | null>(null);
	const hasRunSystemLocaleCheckRef = useRef(false);

	const markPromptAsHandled = useCallback(() => {
		try {
			localStorage.setItem(SYSTEM_LANGUAGE_PROMPT_SEEN_KEY, "1");
		} catch {
			// localStorage may be unavailable
		}
	}, []);

	const setLocale = useCallback((newLocale: Locale) => {
		setLocaleState(newLocale);
		try {
			localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
		} catch {
			// localStorage may be unavailable
		}
		document.documentElement.lang = newLocale;
		// Notify Electron main process
		window.electronAPI?.setLocale?.(newLocale);
	}, []);

	useEffect(() => {
		document.documentElement.lang = locale;
	}, [locale]);

	useEffect(() => {
		if (hasRunSystemLocaleCheckRef.current) return;
		hasRunSystemLocaleCheckRef.current = true;

		let hasStoredLocale = false;
		let hasHandledSystemPrompt = false;
		try {
			const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
			hasStoredLocale = Boolean(stored && isSupportedLocale(stored));
			hasHandledSystemPrompt = localStorage.getItem(SYSTEM_LANGUAGE_PROMPT_SEEN_KEY) === "1";
		} catch {
			// localStorage may be unavailable
		}

		if (hasStoredLocale || hasHandledSystemPrompt) return;

		const detectedSystemLocale = getSupportedSystemLocale();
		if (!detectedSystemLocale || detectedSystemLocale === DEFAULT_LOCALE) {
			markPromptAsHandled();
			return;
		}

		setSystemLocaleSuggestion(detectedSystemLocale);
	}, [markPromptAsHandled]);

	const acceptSystemLocaleSuggestion = useCallback(() => {
		if (!systemLocaleSuggestion) return;
		setLocale(systemLocaleSuggestion);
		setSystemLocaleSuggestion(null);
		markPromptAsHandled();
	}, [markPromptAsHandled, setLocale, systemLocaleSuggestion]);

	const dismissSystemLocaleSuggestion = useCallback(() => {
		setSystemLocaleSuggestion(null);
		markPromptAsHandled();
	}, [markPromptAsHandled]);

	const resolveSystemLocaleSuggestion = useCallback(() => {
		setSystemLocaleSuggestion(null);
		markPromptAsHandled();
	}, [markPromptAsHandled]);

	const t = useCallback(
		(qualifiedKey: string, vars?: TranslateVars): string => {
			const dotIndex = qualifiedKey.indexOf(".");
			if (dotIndex === -1) return qualifiedKey;
			const namespace = qualifiedKey.slice(0, dotIndex) as I18nNamespace;
			const key = qualifiedKey.slice(dotIndex + 1);
			return translate(locale, namespace, key, vars);
		},
		[locale],
	);

	const value = useMemo<I18nContextValue>(
		() => ({
			locale,
			setLocale,
			t,
			systemLocaleSuggestion,
			acceptSystemLocaleSuggestion,
			dismissSystemLocaleSuggestion,
			resolveSystemLocaleSuggestion,
		}),
		[
			locale,
			setLocale,
			t,
			systemLocaleSuggestion,
			acceptSystemLocaleSuggestion,
			dismissSystemLocaleSuggestion,
			resolveSystemLocaleSuggestion,
		],
	);

	return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
