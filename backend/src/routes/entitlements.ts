import { Router } from "express";
import { getEntitlements } from "../services/subscription-service.js";

export const entitlementsRouter = Router();

entitlementsRouter.get("/entitlements", async (_req, res) => {
	const result = await getEntitlements();
	res.json({ ok: true, ...result });
});
