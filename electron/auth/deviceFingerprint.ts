import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { app } from "electron";

interface DeviceFingerprintRecord {
	deviceId: string;
	createdAt: string;
}

function getDeviceFingerprintPath() {
	return path.join(app.getPath("userData"), "auth", "device-fingerprint.json");
}

function buildStableSeed() {
	return [os.hostname(), os.platform(), os.arch(), os.userInfo().username].join(":");
}

export async function getOrCreateDeviceFingerprint() {
	try {
		const raw = await fs.readFile(getDeviceFingerprintPath(), "utf8");
		const parsed = JSON.parse(raw) as DeviceFingerprintRecord;
		if (parsed?.deviceId) {
			return parsed;
		}
	} catch {
		// ignore
	}

	const seededId = createHash("sha256")
		.update(`${buildStableSeed()}:${randomUUID()}`)
		.digest("hex")
		.slice(0, 32);
	const record: DeviceFingerprintRecord = {
		deviceId: `asdev_${seededId}`,
		createdAt: new Date().toISOString(),
	};
	const filePath = getDeviceFingerprintPath();
	await fs.mkdir(path.dirname(filePath), { recursive: true });
	await fs.writeFile(filePath, JSON.stringify(record, null, 2), "utf8");
	return record;
}
