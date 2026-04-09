import { type Request, Router } from "express";
import { z } from "zod";
import {
	confirmPhoneVerification,
	exchangeDesktopCode,
	loginWithEmail,
	logoutDesktopSession,
	refreshDesktopSession,
	requestPhoneVerification,
	signupWithEmail,
} from "../services/auth-service.js";

export const authRouter = Router();

const exchangeSchema = z.object({
	code: z.string().min(1),
	deviceName: z.string().optional(),
	platform: z.string().optional(),
});

const refreshSchema = z.object({
	refreshToken: z.string().min(1),
});

const phoneVerificationRequestSchema = z.object({
	phoneNumber: z.string().min(10),
	purpose: z.enum(["signup", "login"]),
	deviceId: z.string().optional(),
});

const phoneVerificationConfirmSchema = phoneVerificationRequestSchema.extend({
	code: z.string().min(4).max(6),
});

const emailSignupSchema = z.object({
	username: z.string().min(4),
	email: z.string().email(),
	familyName: z.string().min(1),
	givenName: z.string().min(1),
	phoneNumber: z.string().min(10),
	password: z.string().min(8),
	verificationToken: z.string().min(8),
	deviceId: z.string().optional(),
	agreements: z.object({
		terms: z.literal(true),
		privacy: z.literal(true),
		marketing: z.boolean(),
	}),
});

const emailLoginSchema = z.object({
	identifier: z.string().min(1),
	password: z.string().min(1),
	deviceId: z.string().optional(),
});

function getRequestIp(req: Request) {
	const forwarded = req.headers["x-forwarded-for"];
	if (typeof forwarded === "string") {
		return forwarded.split(",")[0]?.trim();
	}
	if (Array.isArray(forwarded)) {
		return forwarded[0]?.trim();
	}
	return req.ip;
}

authRouter.post("/desktop/exchange", async (req, res) => {
	const parsed = exchangeSchema.safeParse(req.body);
	if (!parsed.success) {
		res.status(400).json({ ok: false, error: parsed.error.flatten() });
		return;
	}

	const session = await exchangeDesktopCode(parsed.data);
	res.json({ ok: true, session });
});

authRouter.post("/refresh", async (req, res) => {
	const parsed = refreshSchema.safeParse(req.body);
	if (!parsed.success) {
		res.status(400).json({ ok: false, error: parsed.error.flatten() });
		return;
	}

	const result = await refreshDesktopSession(parsed.data.refreshToken);
	res.json({ ok: true, ...result });
});

authRouter.post("/logout", async (req, res) => {
	const parsed = refreshSchema.safeParse(req.body);
	if (!parsed.success) {
		res.status(400).json({ ok: false, error: parsed.error.flatten() });
		return;
	}

	const result = await logoutDesktopSession(parsed.data.refreshToken);
	res.json({ ok: true, ...result });
});

authRouter.post("/phone/request", async (req, res) => {
	const parsed = phoneVerificationRequestSchema.safeParse(req.body);
	if (!parsed.success) {
		res.status(400).json({ ok: false, error: parsed.error.flatten() });
		return;
	}

	try {
		const result = await requestPhoneVerification(parsed.data, { requestIp: getRequestIp(req) });
		res.json({ ok: true, ...result });
	} catch (error) {
		res.status(400).json({
			ok: false,
			error: error instanceof Error ? error.message : "문자 인증 요청에 실패했습니다.",
		});
	}
});

authRouter.post("/phone/verify", async (req, res) => {
	const parsed = phoneVerificationConfirmSchema.safeParse(req.body);
	if (!parsed.success) {
		res.status(400).json({ ok: false, error: parsed.error.flatten() });
		return;
	}

	try {
		const result = await confirmPhoneVerification(parsed.data);
		res.json({ ok: true, ...result });
	} catch (error) {
		res.status(400).json({
			ok: false,
			error: error instanceof Error ? error.message : "휴대폰 인증에 실패했습니다.",
		});
	}
});

authRouter.post("/signup", async (req, res) => {
	const parsed = emailSignupSchema.safeParse(req.body);
	if (!parsed.success) {
		res.status(400).json({ ok: false, error: parsed.error.flatten() });
		return;
	}

	try {
		const result = await signupWithEmail(parsed.data, { requestIp: getRequestIp(req) });
		res.json({ ok: true, ...result });
	} catch (error) {
		res.status(400).json({
			ok: false,
			error: error instanceof Error ? error.message : "회원가입에 실패했습니다.",
		});
	}
});

authRouter.post("/login", async (req, res) => {
	const parsed = emailLoginSchema.safeParse(req.body);
	if (!parsed.success) {
		res.status(400).json({ ok: false, error: parsed.error.flatten() });
		return;
	}

	try {
		const result = await loginWithEmail(parsed.data);
		res.json({ ok: true, ...result });
	} catch (error) {
		res.status(400).json({
			ok: false,
			error: error instanceof Error ? error.message : "로그인에 실패했습니다.",
		});
	}
});
