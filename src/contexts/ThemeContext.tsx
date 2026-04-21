import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

export type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "theme-preference";
const THEME_CLASS = "dark";

interface ThemeContextValue {
	theme: Theme;
	setTheme: (theme: Theme) => void;
	toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
	const ctx = useContext(ThemeContext);
	if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
	return ctx;
}

function getInitialTheme(): Theme {
	try {
		const stored = localStorage.getItem(THEME_STORAGE_KEY);
		if (stored === "light" || stored === "dark") return stored;
	} catch {
		// localStorage may be unavailable
	}
	// Default to dark theme (app is designed for dark theme)
	return "dark";
}

function applyTheme(theme: Theme) {
	const html = document.documentElement;
	if (theme === "dark") {
		html.classList.add(THEME_CLASS);
	} else {
		html.classList.remove(THEME_CLASS);
	}
}

export function ThemeProvider({ children }: { children: ReactNode }) {
	const [theme, setThemeState] = useState<Theme>(getInitialTheme);

	const setTheme = useCallback((newTheme: Theme) => {
		setThemeState(newTheme);
		try {
			localStorage.setItem(THEME_STORAGE_KEY, newTheme);
		} catch {
			// localStorage may be unavailable
		}
		applyTheme(newTheme);
	}, []);

	const toggleTheme = useCallback(() => {
		setTheme(theme === "dark" ? "light" : "dark");
	}, [theme, setTheme]);

	// Apply theme on mount
	useEffect(() => {
		applyTheme(theme);
	}, [theme]);

	const value = useMemo<ThemeContextValue>(
		() => ({ theme, setTheme, toggleTheme }),
		[theme, setTheme, toggleTheme],
	);

	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
