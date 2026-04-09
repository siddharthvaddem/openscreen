import { Pool } from "pg";
import { config } from "../config.js";

let pool: Pool | null = null;

export function isPostgresEnabled() {
	return Boolean(config.databaseUrl);
}

export function getPgPool() {
	if (!config.databaseUrl) {
		throw new Error("DATABASE_URL 이 비어 있습니다.");
	}
	if (!pool) {
		pool = new Pool({
			connectionString: config.databaseUrl,
			max: 5,
			ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined,
		});
	}
	return pool;
}

export async function getPostgresStatus() {
	if (!config.databaseUrl) {
		return {
			configured: false,
			driver: "file",
			connected: false,
			message: "DATABASE_URL 이 아직 설정되지 않았습니다.",
		};
	}

	try {
		const result = await getPgPool().query("select now() as now");
		return {
			configured: true,
			driver: "postgres",
			connected: true,
			serverTime: result.rows[0]?.now,
			message: "Postgres 연결이 정상입니다.",
		};
	} catch (error) {
		return {
			configured: true,
			driver: "postgres",
			connected: false,
			message: error instanceof Error ? error.message : "Postgres 연결 확인에 실패했습니다.",
		};
	}
}
