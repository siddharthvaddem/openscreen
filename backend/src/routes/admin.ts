import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { getAdminStorageStatus, listSignupAuditLogs } from "../services/admin-service.js";

export const adminRouter = Router();

function isAuthorized(token: string | undefined) {
	if (!config.adminApiToken) {
		return true;
	}
	return token === config.adminApiToken;
}

adminRouter.use((req, res, next) => {
	const token = req.header("x-admin-token") || req.query.token?.toString();
	if (!isAuthorized(token)) {
		res.status(401).json({ ok: false, error: "관리자 토큰이 필요합니다." });
		return;
	}
	next();
});

adminRouter.get("/storage/status", async (_req, res) => {
	const status = await getAdminStorageStatus();
	res.json({ ok: true, ...status });
});

adminRouter.get("/signup-audit", async (req, res) => {
	const schema = z.object({
		limit: z.coerce.number().min(1).max(100).optional(),
		search: z.string().optional(),
		outcome: z.string().optional(),
	});
	const parsed = schema.safeParse(req.query);
	if (!parsed.success) {
		res.status(400).json({ ok: false, error: parsed.error.flatten() });
		return;
	}
	const result = await listSignupAuditLogs(parsed.data);
	res.json({ ok: true, ...result });
});
