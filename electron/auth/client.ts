import os from "node:os";
import type { DesktopAuthSession } from "./sessionStore";

interface DesktopSessionApiResponse {
	ok?: boolean;
	session?: {
		accessToken: string;
		refreshToken: string;
		expiresIn: number;
		user: {
			id: string;
			email: string;
			displayName: string;
		};
		subscription: {
			plan: "free" | "pro";
			status: string;
		};
		entitlements: string[];
	};
	error?: string;
}

interface PhoneVerificationApiResponse {
	ok?: boolean;
	requested?: boolean;
	verified?: boolean;
	verificationToken?: string;
	previewCode?: string;
	retryAfterSec?: number;
	expiresInSec?: number;
	expiresAt?: string;
	message?: string;
	error?: string;
}

function getAuthApiBaseUrl() {
	const envUrl =
		process.env.AUTO_SCREEN_AUTH_API_URL ||
		process.env.AUTO_SCREEN_BACKEND_URL ||
		process.env.VITE_APP_API_URL ||
		"http://127.0.0.1:4242";

	return envUrl.replace(/\/$/, "");
}

async function parseError(response: Response) {
	const payload = (await response.json().catch(() => null)) as { error?: string } | null;
	throw new Error(payload?.error || `AUTH_API_ERROR:${response.status}`);
}

function toDesktopAuthSession(response: DesktopSessionApiResponse["session"]): DesktopAuthSession {
	if (!response) {
		throw new Error("Desktop session payload is missing.");
	}

	return {
		accessToken: response.accessToken,
		refreshToken: response.refreshToken,
		expiresAt: new Date(Date.now() + response.expiresIn * 1000).toISOString(),
		user: response.user,
		subscription: response.subscription,
		entitlements: response.entitlements,
		lastUpdatedAt: new Date().toISOString(),
	};
}

export function getDesktopAuthStartUrl(route: "google" | "signup" | "login") {
	const websiteOrigin = (process.env.VITE_APP_WEBSITE_URL || "https://autoscreen.app").replace(
		/\/$/,
		"",
	);
	const url = new URL(
		route === "google" ? "/auth/google" : route === "signup" ? "/signup" : "/login",
		websiteOrigin,
	);
	url.searchParams.set("source", "desktop");
	url.searchParams.set("app", "autoscreen");
	url.searchParams.set("platform", process.platform);
	url.searchParams.set("desktop_redirect_uri", "autoscreen://auth/callback");
	url.searchParams.set("desktop_callback_scheme", "autoscreen");
	return url.toString();
}

export function getDesktopPricingUrl() {
	const websiteOrigin = (process.env.VITE_APP_WEBSITE_URL || "https://autoscreen.app").replace(
		/\/$/,
		"",
	);
	return new URL("/pricing", websiteOrigin).toString();
}

export async function exchangeDesktopCode(code: string): Promise<DesktopAuthSession> {
	const response = await fetch(`${getAuthApiBaseUrl()}/api/auth/desktop/exchange`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			code,
			deviceName: os.hostname(),
			platform: process.platform,
		}),
	});

	if (!response.ok) {
		await parseError(response);
	}

	const payload = (await response.json()) as DesktopSessionApiResponse;
	return toDesktopAuthSession(payload.session);
}

export async function refreshDesktopSession(refreshToken: string): Promise<DesktopAuthSession> {
	const response = await fetch(`${getAuthApiBaseUrl()}/api/auth/refresh`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ refreshToken }),
	});

	if (!response.ok) {
		await parseError(response);
	}

	const payload = (await response.json()) as DesktopSessionApiResponse;
	return toDesktopAuthSession(payload.session);
}

export async function logoutDesktopSession(refreshToken: string) {
	const response = await fetch(`${getAuthApiBaseUrl()}/api/auth/logout`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ refreshToken }),
	});

	if (!response.ok) {
		await parseError(response);
	}

	return await response.json();
}

export async function requestPhoneVerificationViaApi(payload: {
	phoneNumber: string;
	purpose: "signup" | "login";
	deviceId?: string;
}) {
	const response = await fetch(`${getAuthApiBaseUrl()}/api/auth/phone/request`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		await parseError(response);
	}

	return (await response.json()) as PhoneVerificationApiResponse;
}

export async function verifyPhoneCodeViaApi(payload: {
	phoneNumber: string;
	code: string;
	purpose: "signup" | "login";
	deviceId?: string;
}) {
	const response = await fetch(`${getAuthApiBaseUrl()}/api/auth/phone/verify`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		await parseError(response);
	}

	return (await response.json()) as PhoneVerificationApiResponse;
}

function buildInternalEmail(username: string) {
	const normalized = username.trim().toLowerCase();
	return `${normalized}@users.autoscreen.local`;
}

export async function signupWithEmailViaApi(payload: {
	username: string;
	email?: string;
	familyName: string;
	givenName: string;
	phoneNumber: string;
	password: string;
	verificationToken: string;
	deviceId?: string;
	agreements: { terms: boolean; privacy: boolean; marketing: boolean };
}): Promise<DesktopAuthSession> {
	const response = await fetch(`${getAuthApiBaseUrl()}/api/auth/signup`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			...payload,
			email: payload.email?.trim() || buildInternalEmail(payload.username),
		}),
	});

	if (!response.ok) {
		await parseError(response);
	}

	const result = (await response.json()) as DesktopSessionApiResponse;
	return toDesktopAuthSession(result.session);
}

export async function loginWithEmailViaApi(payload: {
	identifier: string;
	password: string;
	deviceId?: string;
}): Promise<DesktopAuthSession> {
	const response = await fetch(`${getAuthApiBaseUrl()}/api/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		await parseError(response);
	}

	const result = (await response.json()) as DesktopSessionApiResponse;
	return toDesktopAuthSession(result.session);
}
