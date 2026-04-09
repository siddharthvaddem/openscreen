import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPgPool, getPostgresStatus, isPostgresEnabled } from "../db/pg.js";

interface SignupAuditLogRecord {
	id: string;
	username?: string;
	email?: string;
	phoneNumber?: string;
	deviceId?: string;
	signupIp?: string;
	outcome: string;
	reason?: string;
	createdAt: string;
}

interface AuthStoreSnapshot {
	signupAuditLogs?: SignupAuditLogRecord[];
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_PATH = path.join(__dirname, "../../data/auth-store.json");

async function readFileAuditLogs(): Promise<SignupAuditLogRecord[]> {
	try {
		const raw = await fs.readFile(STORE_PATH, "utf8");
		const parsed = JSON.parse(raw) as AuthStoreSnapshot;
		return Array.isArray(parsed.signupAuditLogs) ? parsed.signupAuditLogs : [];
	} catch {
		return [];
	}
}

export async function listSignupAuditLogs(options?: {
	limit?: number;
	search?: string;
	outcome?: string;
}) {
	const limit = Math.min(Math.max(options?.limit || 20, 1), 100);
	const search = options?.search?.trim().toLowerCase();
	const outcome = options?.outcome?.trim().toLowerCase();

	if (isPostgresEnabled()) {
		try {
			const where: string[] = [];
			const values: unknown[] = [];
			if (search) {
				values.push(`%${search}%`);
				where.push(`(
					coalesce(username, '') ilike $${values.length}
					or coalesce(email, '') ilike $${values.length}
					or coalesce(phone_number, '') ilike $${values.length}
					or coalesce(device_id, '') ilike $${values.length}
					or coalesce(reason, '') ilike $${values.length}
				)`);
			}
			if (outcome) {
				values.push(outcome);
				where.push(`lower(outcome) = $${values.length}`);
			}
			values.push(limit);
			const sql = `
				select id, username, email, phone_number as "phoneNumber", device_id as "deviceId", signup_ip as "signupIp", outcome, reason, created_at as "createdAt"
				from signup_audit_logs
				${where.length ? `where ${where.join(" and ")}` : ""}
				order by created_at desc
				limit $${values.length}
			`;
			const result = await getPgPool().query<SignupAuditLogRecord>(sql, values);
			return {
				source: "postgres",
				logs: result.rows,
			};
		} catch {
			const logs = await readFileAuditLogs();
			return {
				source: "file-fallback",
				logs: logs
					.filter((item) => {
						if (outcome && item.outcome.toLowerCase() !== outcome) return false;
						if (!search) return true;
						return [item.username, item.email, item.phoneNumber, item.deviceId, item.reason]
							.filter(Boolean)
							.some((value) => String(value).toLowerCase().includes(search));
					})
					.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
					.slice(0, limit),
			};
		}
	}

	const logs = await readFileAuditLogs();
	return {
		source: "file",
		logs: logs
			.filter((item) => {
				if (outcome && item.outcome.toLowerCase() !== outcome) return false;
				if (!search) return true;
				return [item.username, item.email, item.phoneNumber, item.deviceId, item.reason]
					.filter(Boolean)
					.some((value) => String(value).toLowerCase().includes(search));
			})
			.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
			.slice(0, limit),
	};
}

export async function getAdminStorageStatus() {
	const postgres = await getPostgresStatus();
	return {
		storageDriver: postgres.configured ? "postgres-ready" : "file",
		postgres,
	};
}
