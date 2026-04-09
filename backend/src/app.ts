import express from "express";
import { config } from "./config.js";
import { adminRouter } from "./routes/admin.js";
import { authRouter } from "./routes/auth.js";
import { billingRouter } from "./routes/billing.js";
import { entitlementsRouter } from "./routes/entitlements.js";
import { healthRouter } from "./routes/health.js";

export function createApp() {
	const app = express();

	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));

	app.use(healthRouter);
	app.get("/api/config/public", (_req, res) => {
		res.json({
			ok: true,
			appName: config.appName,
			appOrigin: config.appOrigin,
			googleAuthEnabled: config.googleAuthEnabled,
			kakaoAuthEnabled: config.kakaoAuthEnabled,
			naverAuthEnabled: config.naverAuthEnabled,
			tossBillingEnabled: config.tossBillingEnabled,
			proMonthlyPriceKrw: 15900,
		});
	});

	app.use("/api/auth", authRouter);
	app.use("/api/admin", adminRouter);
	app.use("/api/billing", billingRouter);
	app.use("/api", entitlementsRouter);

	return app;
}
