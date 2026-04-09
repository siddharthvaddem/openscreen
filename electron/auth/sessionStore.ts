import fs from "node:fs/promises";
import path from "node:path";
import { app } from "electron";

export type DesktopPlan = "free" | "pro";

export interface DesktopAuthSession {
	accessToken: string;
	refreshToken: string;
	expiresAt: string;
	user: {
		id: string;
		email: string;
		displayName: string;
	};
	subscription: {
		plan: DesktopPlan;
		status: string;
	};
	entitlements: string[];
	lastUpdatedAt: string;
}

function getSessionPath() {
	return path.join(app.getPath("userData"), "auth", "desktop-session.json");
}

export async function readDesktopAuthSession(): Promise<DesktopAuthSession | null> {
	try {
		const raw = await fs.readFile(getSessionPath(), "utf8");
		const parsed = JSON.parse(raw) as DesktopAuthSession;
		if (!parsed?.refreshToken || !parsed?.user?.email) {
			return null;
		}
		return parsed;
	} catch {
		return null;
	}
}

export async function writeDesktopAuthSession(session: DesktopAuthSession) {
	const filePath = getSessionPath();
	await fs.mkdir(path.dirname(filePath), { recursive: true });
	await fs.writeFile(filePath, JSON.stringify(session, null, 2), "utf8");
}

export async function clearDesktopAuthSession() {
	try {
		await fs.rm(getSessionPath(), { force: true });
	} catch {
		// ignore
	}
}

export function isDesktopAuthSessionExpired(session: DesktopAuthSession, skewMs = 30_000) {
	const expiresAt = new Date(session.expiresAt).getTime();
	if (Number.isNaN(expiresAt)) return true;
	return expiresAt <= Date.now() + skewMs;
}
