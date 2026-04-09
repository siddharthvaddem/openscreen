import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { config } from "../config.js";
import { getPgPool } from "../db/pg.js";
import { sendVerificationSms } from "./sms-service.js";

interface RequestMeta {
	requestIp?: string;
}

interface DesktopSessionResponse {
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
		status: "inactive" | "trial" | "active";
	};
	entitlements: string[];
}

interface PhoneVerificationRequest {
	phoneNumber: string;
	purpose: "signup" | "login";
	deviceId?: string;
}

interface PhoneVerificationConfirmRequest {
	phoneNumber: string;
	code: string;
	purpose: "signup" | "login";
	deviceId?: string;
}

interface EmailSignupRequest {
	username: string;
	email: string;
	familyName: string;
	givenName: string;
	phoneNumber: string;
	password: string;
	verificationToken: string;
	deviceId?: string;
	agreements: {
		terms: boolean;
		privacy: boolean;
		marketing: boolean;
	};
}

interface EmailLoginRequest {
	identifier: string;
	password: string;
	deviceId?: string;
}

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

function normalizeEmail(email: string) {
	return email.trim().toLowerCase();
}

function normalizeUsername(username: string) {
	return username.trim().toLowerCase();
}

function normalizePhone(phoneNumber: string) {
	return phoneNumber.replace(/\D/g, "");
}

function hashPassword(password: string, salt: string) {
	return scryptSync(password, salt, 64).toString("hex");
}

function hashVerificationCode(code: string) {
	return createHash("sha256").update(code).digest("hex");
}

function createToken(length = 24) {
	return randomBytes(length).toString("hex");
}

function createUserSession(user: {
	id: string;
	email: string;
	displayName: string;
	plan: "free" | "pro";
	subscriptionStatus: "inactive" | "trial" | "active";
}): DesktopSessionResponse {
	const isPro = user.plan === "pro";
	return {
		accessToken: `desktop-access-${createToken(18)}`,
		refreshToken: `desktop-refresh-${createToken(18)}`,
		expiresIn: SESSION_TTL_SECONDS,
		user: {
			id: user.id,
			email: user.email,
			displayName: user.displayName,
		},
		subscription: {
			plan: user.plan,
			status: user.subscriptionStatus,
		},
		entitlements: isPro
			? ["basic_recording", "basic_editing", "pro_export", "mcp_editing"]
			: ["basic_recording", "basic_editing"],
	};
}

function maskPhone(phoneNumber: string) {
	return phoneNumber.replace(/(\d{3})\d+(\d{2})$/, "$1****$2");
}

function validateSignupFields(input: EmailSignupRequest) {
	const username = normalizeUsername(input.username);
	const email = normalizeEmail(input.email);
	const familyName = input.familyName.trim();
	const givenName = input.givenName.trim();
	const phoneNumber = normalizePhone(input.phoneNumber);
	const password = input.password.trim();
	const deviceId = input.deviceId?.trim();
	if (!/^[a-z0-9_]{4,20}$/.test(username))
		throw new Error("아이디는 영문 소문자 숫자 밑줄로 4자 이상 20자 이하만 가능합니다.");
	if (!email || !email.includes("@")) throw new Error("올바른 이메일을 입력해주세요.");
	if (!familyName || !givenName) throw new Error("성과 이름을 모두 입력해주세요.");
	if (phoneNumber.length < 10 || phoneNumber.length > 11)
		throw new Error("휴대폰 번호를 정확히 입력해주세요.");
	if (password.length < 8) throw new Error("비밀번호는 8자 이상 입력해주세요.");
	if (!input.agreements.terms || !input.agreements.privacy)
		throw new Error("이용약관과 개인정보 수집 및 이용 동의가 필요합니다.");
	if (!input.verificationToken || input.verificationToken.trim().length < 16)
		throw new Error("휴대폰 인증을 먼저 완료해주세요.");
	if (deviceId && deviceId.length < 8) throw new Error("디바이스 식별자가 올바르지 않습니다.");
	return { username, email, familyName, givenName, phoneNumber, password, deviceId };
}

async function appendAuditLog(payload: {
	username?: string;
	email?: string;
	phoneNumber?: string;
	deviceId?: string;
	signupIp?: string;
	outcome: string;
	reason?: string;
}) {
	await getPgPool().query(
		`insert into signup_audit_logs (id, username, email, phone_number, device_id, signup_ip, outcome, reason, created_at)
		 values ($1,$2,$3,$4,$5,$6,$7,$8,now())`,
		[
			randomUUID(),
			payload.username || null,
			payload.email || null,
			payload.phoneNumber || null,
			payload.deviceId || null,
			payload.signupIp || null,
			payload.outcome,
			payload.reason || null,
		],
	);
}

export async function requestPhoneVerificationPg(
	payload: PhoneVerificationRequest,
	meta?: RequestMeta,
) {
	const phoneNumber = normalizePhone(payload.phoneNumber);
	if (phoneNumber.length < 10 || phoneNumber.length > 11)
		throw new Error("휴대폰 번호를 정확히 입력해주세요.");
	const deviceId = payload.deviceId?.trim();
	const pool = getPgPool();

	const phoneTrialCount = await pool.query(
		`select count(*)::int as count from free_trial_grants where phone_number = $1`,
		[phoneNumber],
	);
	if (phoneTrialCount.rows[0]?.count >= config.freeTrialPerPhoneLimit)
		throw new Error("이 휴대폰 번호는 이미 무료 플랜이 사용되었습니다.");
	if (deviceId) {
		const deviceTrialCount = await pool.query(
			`select count(*)::int as count from free_trial_grants where device_id = $1`,
			[deviceId],
		);
		if (deviceTrialCount.rows[0]?.count >= config.freeTrialPerDeviceLimit)
			throw new Error("이 디바이스에서는 이미 무료 플랜이 생성되었습니다.");
	}

	const latest = await pool.query(
		`select id, requested_at as "requestedAt" from phone_verifications where phone_number = $1 and purpose = $2 order by requested_at desc limit 1`,
		[phoneNumber, payload.purpose],
	);
	const latestRequestedAt = latest.rows[0]?.requestedAt
		? new Date(latest.rows[0].requestedAt).getTime()
		: 0;
	if (
		latestRequestedAt &&
		Date.now() - latestRequestedAt < config.phoneVerificationRequestCooldownMs
	)
		throw new Error("잠시 후 다시 요청해주세요.");

	const recentRequestCount = await pool.query(
		`select count(*)::int as count from phone_verifications where phone_number = $1 and created_at >= now() - interval '1 hour'`,
		[phoneNumber],
	);
	if (recentRequestCount.rows[0]?.count >= config.phoneVerificationMaxRequestsPerHour)
		throw new Error("문자 요청이 너무 많습니다. 한 시간 후 다시 시도해주세요.");

	const code = String(Math.floor(Math.random() * 900000) + 100000);
	const expiresAt = new Date(Date.now() + config.phoneVerificationCodeTtlMs).toISOString();
	const smsResult = await sendVerificationSms(phoneNumber, code);
	if (!smsResult.success && !smsResult.previewCode)
		throw new Error(smsResult.error || "문자 인증 코드를 발송하지 못했습니다.");

	await pool.query(`delete from phone_verifications where phone_number = $1 and purpose = $2`, [
		phoneNumber,
		payload.purpose,
	]);
	await pool.query(
		`insert into phone_verifications (id, phone_number, purpose, verification_code_hash, verification_token, attempt_count, request_count, verified_at, expires_at, device_id, request_ip, requested_at, sms_provider, sms_message_id, created_at)
		 values ($1,$2,$3,$4,null,0,1,null,$5,$6,$7,now(),$8,$9,now())`,
		[
			randomUUID(),
			phoneNumber,
			payload.purpose,
			hashVerificationCode(code),
			expiresAt,
			deviceId || null,
			meta?.requestIp || null,
			smsResult.provider,
			smsResult.messageId || null,
		],
	);

	return {
		requested: true,
		provider: smsResult.provider,
		purpose: payload.purpose,
		maskedPhoneNumber: maskPhone(phoneNumber),
		previewCode: smsResult.previewCode,
		retryAfterSec: Math.ceil(config.phoneVerificationRequestCooldownMs / 1000),
		expiresInSec: Math.ceil(config.phoneVerificationCodeTtlMs / 1000),
		expiresAt,
		message: smsResult.previewCode
			? "개발 모드에서는 화면에서 인증 코드를 확인할 수 있습니다."
			: "문자 인증 코드를 발송했습니다.",
	};
}

export async function confirmPhoneVerificationPg(payload: PhoneVerificationConfirmRequest) {
	const phoneNumber = normalizePhone(payload.phoneNumber);
	const code = payload.code.trim();
	const deviceId = payload.deviceId?.trim();
	const pool = getPgPool();
	const result = await pool.query(
		`select id, verification_code_hash as "codeHash", attempt_count as "attemptCount", verification_token as "verificationToken", expires_at as "expiresAt", device_id as "deviceId"
		 from phone_verifications where phone_number = $1 and purpose = $2 order by requested_at desc limit 1`,
		[phoneNumber, payload.purpose],
	);
	const record = result.rows[0];
	if (!record) throw new Error("먼저 문자 인증 요청을 해주세요.");
	if (deviceId && record.deviceId && record.deviceId !== deviceId)
		throw new Error("같은 디바이스에서 다시 인증을 진행해주세요.");
	if (new Date(record.expiresAt).getTime() < Date.now())
		throw new Error("인증 코드가 만료되었습니다. 다시 요청해주세요.");
	if (record.attemptCount >= config.phoneVerificationMaxAttempts)
		throw new Error("인증 시도가 너무 많습니다. 다시 요청해주세요.");
	const expectedHash = Buffer.from(record.codeHash, "hex");
	const candidateHash = Buffer.from(hashVerificationCode(code), "hex");
	const isMatched =
		expectedHash.length === candidateHash.length && timingSafeEqual(expectedHash, candidateHash);
	if (!isMatched) {
		await pool.query(
			`update phone_verifications set attempt_count = attempt_count + 1 where id = $1`,
			[record.id],
		);
		throw new Error("인증 코드가 올바르지 않습니다.");
	}
	const verificationToken = createToken();
	await pool.query(
		`update phone_verifications set attempt_count = attempt_count + 1, verified_at = now(), verification_token = $2 where id = $1`,
		[record.id, verificationToken],
	);
	return {
		verified: true,
		verificationToken,
		expiresAt: record.expiresAt,
		message: "휴대폰 인증이 완료되었습니다.",
	};
}

export async function signupWithEmailPg(payload: EmailSignupRequest, meta?: RequestMeta) {
	const parsed = validateSignupFields(payload);
	const pool = getPgPool();
	const verificationResult = await pool.query(
		`select id, verified_at as "verifiedAt", expires_at as "expiresAt" from phone_verifications where phone_number = $1 and purpose = 'signup' and verification_token = $2 limit 1`,
		[parsed.phoneNumber, payload.verificationToken],
	);
	const verification = verificationResult.rows[0];
	if (!verification?.verifiedAt) {
		await appendAuditLog({
			username: parsed.username,
			email: parsed.email,
			phoneNumber: parsed.phoneNumber,
			deviceId: parsed.deviceId,
			signupIp: meta?.requestIp,
			outcome: "rejected",
			reason: "phone_not_verified",
		});
		throw new Error("휴대폰 인증이 완료되지 않았습니다.");
	}
	if (new Date(verification.expiresAt).getTime() < Date.now()) {
		await appendAuditLog({
			username: parsed.username,
			email: parsed.email,
			phoneNumber: parsed.phoneNumber,
			deviceId: parsed.deviceId,
			signupIp: meta?.requestIp,
			outcome: "rejected",
			reason: "phone_verification_expired",
		});
		throw new Error("휴대폰 인증이 만료되었습니다. 다시 진행해주세요.");
	}
	const dupUser = await pool.query(
		`select username, email, phone_number as "phoneNumber" from users where username = $1 or email = $2 or phone_number = $3 limit 1`,
		[parsed.username, parsed.email, parsed.phoneNumber],
	);
	if (dupUser.rows[0]?.username === parsed.username)
		throw new Error("이미 사용 중인 아이디입니다.");
	if (dupUser.rows[0]?.email === parsed.email) throw new Error("이미 가입된 이메일입니다.");
	if (dupUser.rows[0]?.phoneNumber === parsed.phoneNumber)
		throw new Error("이미 사용 중인 휴대폰 번호입니다.");
	const phoneTrialCount = await pool.query(
		`select count(*)::int as count from free_trial_grants where phone_number = $1`,
		[parsed.phoneNumber],
	);
	if (phoneTrialCount.rows[0]?.count >= config.freeTrialPerPhoneLimit)
		throw new Error("이 휴대폰 번호는 이미 무료 플랜이 사용되었습니다.");
	if (parsed.deviceId) {
		const deviceTrialCount = await pool.query(
			`select count(*)::int as count from free_trial_grants where device_id = $1`,
			[parsed.deviceId],
		);
		if (deviceTrialCount.rows[0]?.count >= config.freeTrialPerDeviceLimit)
			throw new Error("이 디바이스에서는 이미 무료 플랜이 생성되었습니다.");
	}
	const salt = randomBytes(16).toString("hex");
	const userId = randomUUID();
	const now = new Date().toISOString();
	const client = await pool.connect();
	try {
		await client.query("begin");
		await client.query(
			`insert into users (id, username, email, family_name, given_name, display_name, phone_number, phone_verified_at, password_salt, password_hash, signup_device_id, signup_ip, plan, subscription_status, created_at, updated_at, last_login_at)
			 values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'free','trial',$13,$13,$13)`,
			[
				userId,
				parsed.username,
				parsed.email,
				parsed.familyName,
				parsed.givenName,
				`${parsed.familyName}${parsed.givenName}`,
				parsed.phoneNumber,
				verification.verifiedAt,
				salt,
				hashPassword(parsed.password, salt),
				parsed.deviceId || null,
				meta?.requestIp || null,
				now,
			],
		);
		await client.query(
			`insert into user_agreements (id, user_id, terms_version, privacy_version, marketing_opt_in, accepted_terms_at, accepted_privacy_at, accepted_marketing_at, created_at)
			 values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
			[
				randomUUID(),
				userId,
				config.termsVersion,
				config.privacyVersion,
				payload.agreements.marketing,
				now,
				now,
				payload.agreements.marketing ? now : null,
				now,
			],
		);
		await client.query(
			`insert into free_trial_grants (id, user_id, phone_number, device_id, granted_at, expires_at, source)
			 values ($1,$2,$3,$4,$5,$6,'signup')`,
			[
				randomUUID(),
				userId,
				parsed.phoneNumber,
				parsed.deviceId || null,
				now,
				new Date(Date.now() + config.freeTrialDays * 24 * 60 * 60 * 1000).toISOString(),
			],
		);
		await client.query(`delete from phone_verifications where id = $1`, [verification.id]);
		await client.query(
			`insert into signup_audit_logs (id, username, email, phone_number, device_id, signup_ip, outcome, reason, created_at)
			 values ($1,$2,$3,$4,$5,$6,'created','signup_success',$7)`,
			[
				randomUUID(),
				parsed.username,
				parsed.email,
				parsed.phoneNumber,
				parsed.deviceId || null,
				meta?.requestIp || null,
				now,
			],
		);
		await client.query("commit");
	} catch (error) {
		await client.query("rollback");
		throw error;
	} finally {
		client.release();
	}
	return {
		created: true,
		message: "email signup ready",
		session: createUserSession({
			id: userId,
			email: parsed.email,
			displayName: `${parsed.familyName}${parsed.givenName}`,
			plan: "free",
			subscriptionStatus: "trial",
		}),
	};
}

export async function loginWithEmailPg(payload: EmailLoginRequest) {
	const identifier = payload.identifier.trim().toLowerCase();
	const password = payload.password.trim();
	if (!identifier || !password) throw new Error("아이디와 비밀번호를 입력해주세요.");
	const result = await getPgPool().query(
		`select id, email, display_name as "displayName", password_hash as "passwordHash", password_salt as "passwordSalt", plan, subscription_status as "subscriptionStatus" from users where username = $1 or email = $1 limit 1`,
		[identifier],
	);
	const user = result.rows[0];
	if (!user) throw new Error("가입된 계정을 찾지 못했습니다.");
	const expectedHash = Buffer.from(user.passwordHash, "hex");
	const candidateHash = Buffer.from(hashPassword(password, user.passwordSalt), "hex");
	const isMatched =
		expectedHash.length === candidateHash.length && timingSafeEqual(expectedHash, candidateHash);
	if (!isMatched) throw new Error("비밀번호가 올바르지 않습니다.");
	await getPgPool().query(
		`update users set last_login_at = now(), updated_at = now() where id = $1`,
		[user.id],
	);
	return { loggedIn: true, message: "email login ready", session: createUserSession(user) };
}
