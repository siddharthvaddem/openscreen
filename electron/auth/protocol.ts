import type { BrowserWindow } from "electron";
import { app } from "electron";
import { exchangeDesktopCode, getDesktopAuthStartUrl, getDesktopPricingUrl } from "./client";
import {
	clearDesktopAuthSession,
	type DesktopAuthSession,
	isDesktopAuthSessionExpired,
	readDesktopAuthSession,
	writeDesktopAuthSession,
} from "./sessionStore";

export interface AuthCallbackResult {
	session: DesktopAuthSession | null;
	error?: string;
}

function parseDesktopCallback(urlString: string) {
	const incoming = new URL(urlString);
	const host = incoming.hostname;
	const pathname = incoming.pathname;
	const isAuthCallback = host === "auth" && pathname === "/callback";
	if (!isAuthCallback) {
		return null;
	}

	return {
		code: incoming.searchParams.get("code"),
		error: incoming.searchParams.get("error") || incoming.searchParams.get("message"),
		plan: incoming.searchParams.get("plan"),
		email: incoming.searchParams.get("email"),
		displayName: incoming.searchParams.get("displayName"),
		accessToken: incoming.searchParams.get("accessToken"),
		refreshToken: incoming.searchParams.get("refreshToken"),
		expiresIn: incoming.searchParams.get("expiresIn"),
		entitlements: incoming.searchParams.get("entitlements"),
	};
}

function broadcastDesktopAuthSession(
	targetWindow: BrowserWindow | null,
	session: DesktopAuthSession | null,
) {
	if (!targetWindow || targetWindow.isDestroyed()) return;
	targetWindow.webContents.send("auth-session-changed", session);
}

function coerceEntitlements(input: string | null) {
	if (!input) return [] as string[];
	return input
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

function createSessionFromDirectCallback(
	parsed: NonNullable<ReturnType<typeof parseDesktopCallback>>,
): DesktopAuthSession | null {
	if (!parsed.accessToken || !parsed.refreshToken || !parsed.email) {
		return null;
	}

	const expiresIn = Number(parsed.expiresIn || "3600");
	return {
		accessToken: parsed.accessToken,
		refreshToken: parsed.refreshToken,
		expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
		user: {
			id: parsed.email,
			email: parsed.email,
			displayName: parsed.displayName || parsed.email.split("@")[0] || "Auto Screen User",
		},
		subscription: {
			plan: parsed.plan === "pro" ? "pro" : "free",
			status: parsed.plan === "pro" ? "active" : "inactive",
		},
		entitlements: coerceEntitlements(parsed.entitlements),
		lastUpdatedAt: new Date().toISOString(),
	};
}

export function setupDesktopProtocol() {
	app.setAsDefaultProtocolClient("autoscreen");
}

export function getDesktopStartUrl(route: "google" | "signup" | "login") {
	return getDesktopAuthStartUrl(route);
}

export function getDesktopPricingStartUrl() {
	return getDesktopPricingUrl();
}

export async function handleDesktopProtocolUrl(
	urlString: string,
	targetWindow: BrowserWindow | null,
): Promise<AuthCallbackResult> {
	const parsed = parseDesktopCallback(urlString);
	if (!parsed) {
		return { session: null, error: "Unsupported auth callback." };
	}

	if (parsed.error) {
		broadcastDesktopAuthSession(targetWindow, null);
		return { session: null, error: parsed.error };
	}

	let session = createSessionFromDirectCallback(parsed);
	if (!session && parsed.code) {
		session = await exchangeDesktopCode(parsed.code);
	}

	if (!session) {
		broadcastDesktopAuthSession(targetWindow, null);
		return { session: null, error: "Desktop auth callback payload is incomplete." };
	}

	await writeDesktopAuthSession(session);
	broadcastDesktopAuthSession(targetWindow, session);
	if (targetWindow && !targetWindow.isDestroyed()) {
		if (targetWindow.isMinimized()) targetWindow.restore();
		targetWindow.show();
		targetWindow.focus();
	}
	return { session };
}

export async function restoreDesktopAuthSession() {
	const stored = await readDesktopAuthSession();
	if (!stored) return null;
	if (isDesktopAuthSessionExpired(stored)) {
		return stored;
	}
	return stored;
}

export async function clearStoredDesktopAuthSession(targetWindow: BrowserWindow | null) {
	await clearDesktopAuthSession();
	broadcastDesktopAuthSession(targetWindow, null);
}
