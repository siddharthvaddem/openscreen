import { Router } from "express";
import { z } from "zod";
import {
	createCheckoutSession,
	getCurrentSubscription,
	handleTossWebhook,
} from "../services/subscription-service.js";

export const billingRouter = Router();

const checkoutSchema = z.object({
	planCode: z.literal("pro_monthly_15900_krw"),
});

billingRouter.post("/checkout/session", async (req, res) => {
	const parsed = checkoutSchema.safeParse(req.body);
	if (!parsed.success) {
		res.status(400).json({ ok: false, error: parsed.error.flatten() });
		return;
	}

	const session = await createCheckoutSession(parsed.data.planCode);
	res.json({ ok: true, ...session });
});

billingRouter.post("/webhooks/toss", async (req, res) => {
	const result = await handleTossWebhook(req.body);
	res.json({ ok: true, ...result });
});

billingRouter.get("/subscription", async (_req, res) => {
	const subscription = await getCurrentSubscription();
	res.json({ ok: true, ...subscription });
});
