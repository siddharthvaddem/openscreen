import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../config.js";
import { isPostgresEnabled } from "../db/pg.js";
import {
	confirmPhoneVerificationPg,
	loginWithEmailPg,
	requestPhoneVerificationPg,
	signupWithEmailPg,
} from "./auth-postgres-service.js";
import { sendVerificationSms } from "./sms-service.js";

export interface DesktopExchangeRequest {
	code: string;
	deviceName?: string;
	platform?: string;
}

export interface DesktopSessionResponse {
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

export interface PhoneVerificationRequest {
	phoneNumber: string;
	purpose: "signup" | "login";
	deviceId?: string;
}

export interface PhoneVerificationConfirmRequest {
	phoneNumber: string;
	code: string;
	purpose: "signup" | "login";
	deviceId?: string;
}

export interface EmailSignupRequest {
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

export interface EmailLoginRequest {
	identifier: string;
	password: string;
	deviceId?: string;
}

interface RequestMeta {
	requestIp?: string;
}

interface ServerUserRecord {
	id: string;
	username: string;
	email: string;
	familyName: string;
	givenName: string;
	displayName: string;
	phoneNumber: string;
	phoneVerifiedAt: string;
	passwordSalt: string;
	passwordHash: string;
	signupDeviceId?: string;
	signupIp?: string;
	plan: "free" | "pro";
	subscriptionStatus: "inactive" | "trial" | "active";
	createdAt: string;
	updatedAt: string;
	lastLoginAt: string;
}

interface PhoneVerificationRecord {
	id: string;
	phoneNumber: string;
	purpose: "signup" | "login";
	codeHash: string;
	verificationToken?: string;
	attemptCount: number;
	requestCount: number;
	deviceId?: string;
	requestIp?: string;
	createdAt: string;
	lastRequestedAt: string;
	expiresAt: string;
	verifiedAt?: string;
	smsProvider?: string;
	smsMessageId?: string;
}

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

interface UserAgreementRecord {
	id: string;
	userId: string;
	termsVersion: string;
	privacyVersion: string;
	marketingOptIn: boolean;
	acceptedTermsAt: string;
	acceptedPrivacyAt: string;
	acceptedMarketingAt?: string;
	createdAt: string;
}

interface FreeTrialGrantRecord {
	id: string;
	userId: string;
	phoneNumber: string;
	deviceId?: string;
	grantedAt: string;
	expiresAt: string;
	source: string;
}

interface AuthStore {
	users: ServerUserRecord[];
	phoneVerifications: PhoneVerificationRecord[];
	signupAuditLogs: SignupAuditLogRecord[];
	userAgreements: UserAgreementRecord[];
	freeTrialGrants: FreeTrialGrantRecord[];
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_PATH = path.join(__dirname, "../../data/auth-store.json");
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

function createStubSession(seed: string): DesktopSessionResponse {
	return {
		accessToken: `stub-access-${seed}`,
		refreshToken: `stub-refresh-${seed}`,
		expiresIn: SESSION_TTL_SECONDS,
		user: {
			id: `user_${seed}`,
			email: "hello@autoscreen.app",
			displayName: "Auto Screen User",
		},
		subscription: {
			plan: seed.includes("pro") ? "pro" : "free",
			status: seed.includes("pro") ? "active" : "inactive",
		},
		entitlements: seed.includes("pro")
			? ["basic_recording", "basic_editing", "pro_export", "mcp_editing"]
			: ["basic_recording", "basic_editing"],
	};
}

function createUserSession(user: ServerUserRecord): DesktopSessionResponse {
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

async function readStore(): Promise<AuthStore> {
	try {
		const raw = await fs.readFile(STORE_PATH, "utf8");
		const parsed = JSON.parse(raw) as Partial<AuthStore>;
		return {
			users: Array.isArray(parsed.users) ? parsed.users : [],
			phoneVerifications: Array.isArray(parsed.phoneVerifications) ? parsed.phoneVerifications : [],
			signupAuditLogs: Array.isArray(parsed.signupAuditLogs) ? parsed.signupAuditLogs : [],
			userAgreements: Array.isArray(parsed.userAgreements) ? parsed.userAgreements : [],
			freeTrialGrants: Array.isArray(parsed.freeTrialGrants) ? parsed.freeTrialGrants : [],
		};
	} catch {
		return {
			users: [],
			phoneVerifications: [],
			signupAuditLogs: [],
			userAgreements: [],
			freeTrialGrants: [],
		};
	}
}

async function writeStore(store: AuthStore) {
	await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
	await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

function validateSignupFields(input: EmailSignupRequest) {
	const username = normalizeUsername(input.username);
	const email = normalizeEmail(input.email);
	const familyName = input.familyName.trim();
	const givenName = input.givenName.trim();
	const phoneNumber = normalizePhone(input.phoneNumber);
	const password = input.password.trim();
	const deviceId = input.deviceId?.trim();

	if (!/^[a-z0-9_]{4,20}$/.test(username)) {
		return { error: "아이디는 영문 소문자 숫자 밑줄로 4자 이상 20자 이하만 가능합니다." };
	}

	if (!email || !email.includes("@")) {
		return { error: "올바른 이메일을 입력해주세요." };
	}

	if (!familyName || !givenName) {
		return { error: "성과 이름을 모두 입력해주세요." };
	}

	if (phoneNumber.length < 10 || phoneNumber.length > 11) {
		return { error: "휴대폰 번호를 정확히 입력해주세요." };
	}

	if (password.length < 8) {
		return { error: "비밀번호는 8자 이상 입력해주세요." };
	}

	if (!input.agreements.terms || !input.agreements.privacy) {
		return { error: "이용약관과 개인정보 수집 및 이용 동의가 필요합니다." };
	}

	if (!input.verificationToken || input.verificationToken.trim().length < 16) {
		return { error: "휴대폰 인증을 먼저 완료해주세요." };
	}

	if (deviceId && deviceId.length < 8) {
		return { error: "디바이스 식별자가 올바르지 않습니다." };
	}

	return { username, email, familyName, givenName, phoneNumber, password, deviceId };
}

function maskPhone(phoneNumber: string) {
	return phoneNumber.replace(/(\d{3})\d+(\d{2})$/, "$1****$2");
}

function getRecentRequestCount(verifications: PhoneVerificationRecord[], phoneNumber: string) {
	const oneHourAgo = Date.now() - 1000 * 60 * 60;
	return verifications.filter(
		(item) => item.phoneNumber === phoneNumber && new Date(item.createdAt).getTime() >= oneHourAgo,
	).length;
}

function cleanupExpiredVerifications(verifications: PhoneVerificationRecord[]) {
	const now = Date.now();
	return verifications.filter((item) => {
		if (item.verifiedAt) return true;
		return new Date(item.expiresAt).getTime() + config.phoneVerificationCodeTtlMs > now;
	});
}

function appendAuditLog(store: AuthStore, payload: Omit<SignupAuditLogRecord, "id" | "createdAt">) {
	store.signupAuditLogs.push({
		id: randomUUID(),
		createdAt: new Date().toISOString(),
		...payload,
	});
}

export async function exchangeDesktopCode(
	payload: DesktopExchangeRequest,
): Promise<DesktopSessionResponse> {
	return createStubSession(payload.code || "exchange");
}

export async function refreshDesktopSession(refreshToken: string) {
	return {
		refreshed: Boolean(refreshToken),
		message: "refresh skeleton ready",
		session: createStubSession(refreshToken || "refresh"),
	};
}

export async function logoutDesktopSession(refreshToken: string) {
	return {
		loggedOut: Boolean(refreshToken),
		message: "logout skeleton ready",
	};
}

export async function requestPhoneVerification(
	payload: PhoneVerificationRequest,
	meta?: RequestMeta,
) {
	if (isPostgresEnabled()) {
		return await requestPhoneVerificationPg(payload, meta);
	}
	const phoneNumber = normalizePhone(payload.phoneNumber);
	if (phoneNumber.length < 10 || phoneNumber.length > 11) {
		throw new Error("휴대폰 번호를 정확히 입력해주세요.");
	}

	const deviceId = payload.deviceId?.trim();
	const store = await readStore();
	store.phoneVerifications = cleanupExpiredVerifications(store.phoneVerifications);

	if (
		store.freeTrialGrants.filter((item) => item.phoneNumber === phoneNumber).length >=
		config.freeTrialPerPhoneLimit
	) {
		throw new Error("이 휴대폰 번호는 이미 무료 플랜이 사용되었습니다.");
	}

	if (
		deviceId &&
		store.freeTrialGrants.filter((item) => item.deviceId === deviceId).length >=
			config.freeTrialPerDeviceLimit
	) {
		throw new Error("이 디바이스에서는 이미 무료 플랜이 생성되었습니다.");
	}

	const latest = [...store.phoneVerifications]
		.filter((item) => item.phoneNumber === phoneNumber && item.purpose === payload.purpose)
		.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

	if (
		latest &&
		Date.now() - new Date(latest.lastRequestedAt).getTime() <
			config.phoneVerificationRequestCooldownMs
	) {
		throw new Error("잠시 후 다시 요청해주세요.");
	}

	if (
		getRecentRequestCount(store.phoneVerifications, phoneNumber) >=
		config.phoneVerificationMaxRequestsPerHour
	) {
		throw new Error("문자 요청이 너무 많습니다. 한 시간 후 다시 시도해주세요.");
	}

	const code = String(Math.floor(Math.random() * 900000) + 100000);
	const now = new Date().toISOString();
	const expiresAt = new Date(Date.now() + config.phoneVerificationCodeTtlMs).toISOString();
	const smsResult = await sendVerificationSms(phoneNumber, code);
	if (!smsResult.success && !smsResult.previewCode) {
		throw new Error(smsResult.error || "문자 인증 코드를 발송하지 못했습니다.");
	}

	store.phoneVerifications = store.phoneVerifications.filter(
		(item) => !(item.phoneNumber === phoneNumber && item.purpose === payload.purpose),
	);
	store.phoneVerifications.push({
		id: randomUUID(),
		phoneNumber,
		purpose: payload.purpose,
		codeHash: hashVerificationCode(code),
		attemptCount: 0,
		requestCount: latest ? latest.requestCount + 1 : 1,
		deviceId,
		requestIp: meta?.requestIp,
		createdAt: now,
		lastRequestedAt: now,
		expiresAt,
		smsProvider: smsResult.provider,
		smsMessageId: smsResult.messageId,
	});
	await writeStore(store);

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

export async function confirmPhoneVerification(payload: PhoneVerificationConfirmRequest) {
	if (isPostgresEnabled()) {
		return await confirmPhoneVerificationPg(payload);
	}
	const phoneNumber = normalizePhone(payload.phoneNumber);
	const code = payload.code.trim();
	const deviceId = payload.deviceId?.trim();
	const store = await readStore();
	store.phoneVerifications = cleanupExpiredVerifications(store.phoneVerifications);

	const record = [...store.phoneVerifications]
		.filter((item) => item.phoneNumber === phoneNumber && item.purpose === payload.purpose)
		.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

	if (!record) {
		throw new Error("먼저 문자 인증 요청을 해주세요.");
	}

	if (deviceId && record.deviceId && record.deviceId !== deviceId) {
		throw new Error("같은 디바이스에서 다시 인증을 진행해주세요.");
	}

	if (new Date(record.expiresAt).getTime() < Date.now()) {
		throw new Error("인증 코드가 만료되었습니다. 다시 요청해주세요.");
	}

	if (record.attemptCount >= config.phoneVerificationMaxAttempts) {
		throw new Error("인증 시도가 너무 많습니다. 다시 요청해주세요.");
	}

	const expectedHash = Buffer.from(record.codeHash, "hex");
	const receivedHash = Buffer.from(hashVerificationCode(code), "hex");
	const isValid =
		expectedHash.length === receivedHash.length && timingSafeEqual(expectedHash, receivedHash);

	if (!isValid) {
		record.attemptCount += 1;
		await writeStore(store);
		throw new Error("인증 코드가 올바르지 않습니다.");
	}

	record.attemptCount += 1;
	record.verifiedAt = new Date().toISOString();
	record.verificationToken = createToken();
	await writeStore(store);

	return {
		verified: true,
		verificationToken: record.verificationToken,
		expiresAt: record.expiresAt,
		message: "휴대폰 인증이 완료되었습니다.",
	};
}

export async function signupWithEmail(payload: EmailSignupRequest, meta?: RequestMeta) {
	if (isPostgresEnabled()) {
		return await signupWithEmailPg(payload, meta);
	}
	const parsed = validateSignupFields(payload);
	if ("error" in parsed) {
		throw new Error(parsed.error);
	}

	const store = await readStore();
	const verification = store.phoneVerifications.find(
		(item) =>
			item.phoneNumber === parsed.phoneNumber &&
			item.purpose === "signup" &&
			item.verificationToken === payload.verificationToken,
	);

	if (!verification?.verifiedAt) {
		appendAuditLog(store, {
			username: parsed.username,
			email: parsed.email,
			phoneNumber: parsed.phoneNumber,
			deviceId: parsed.deviceId,
			signupIp: meta?.requestIp,
			outcome: "rejected",
			reason: "phone_not_verified",
		});
		await writeStore(store);
		throw new Error("휴대폰 인증이 완료되지 않았습니다.");
	}

	if (new Date(verification.expiresAt).getTime() < Date.now()) {
		appendAuditLog(store, {
			username: parsed.username,
			email: parsed.email,
			phoneNumber: parsed.phoneNumber,
			deviceId: parsed.deviceId,
			signupIp: meta?.requestIp,
			outcome: "rejected",
			reason: "phone_verification_expired",
		});
		await writeStore(store);
		throw new Error("휴대폰 인증이 만료되었습니다. 다시 진행해주세요.");
	}

	if (store.users.some((item) => item.username === parsed.username)) {
		throw new Error("이미 사용 중인 아이디입니다.");
	}
	if (store.users.some((item) => item.email === parsed.email)) {
		throw new Error("이미 가입된 이메일입니다.");
	}
	if (store.users.some((item) => item.phoneNumber === parsed.phoneNumber)) {
		throw new Error("이미 사용 중인 휴대폰 번호입니다.");
	}
	if (
		store.freeTrialGrants.filter((item) => item.phoneNumber === parsed.phoneNumber).length >=
		config.freeTrialPerPhoneLimit
	) {
		throw new Error("이 휴대폰 번호는 이미 무료 플랜이 사용되었습니다.");
	}
	if (
		parsed.deviceId &&
		store.freeTrialGrants.filter((item) => item.deviceId === parsed.deviceId).length >=
			config.freeTrialPerDeviceLimit
	) {
		throw new Error("이 디바이스에서는 이미 무료 플랜이 생성되었습니다.");
	}

	const now = new Date().toISOString();
	const salt = randomBytes(16).toString("hex");
	const userId = randomUUID();
	const user: ServerUserRecord = {
		id: userId,
		username: parsed.username,
		email: parsed.email,
		familyName: parsed.familyName,
		givenName: parsed.givenName,
		displayName: `${parsed.familyName}${parsed.givenName}`,
		phoneNumber: parsed.phoneNumber,
		phoneVerifiedAt: verification.verifiedAt,
		passwordSalt: salt,
		passwordHash: hashPassword(parsed.password, salt),
		signupDeviceId: parsed.deviceId,
		signupIp: meta?.requestIp,
		plan: "free",
		subscriptionStatus: "trial",
		createdAt: now,
		updatedAt: now,
		lastLoginAt: now,
	};
	store.users.push(user);
	store.userAgreements.push({
		id: randomUUID(),
		userId,
		termsVersion: config.termsVersion,
		privacyVersion: config.privacyVersion,
		marketingOptIn: payload.agreements.marketing,
		acceptedTermsAt: now,
		acceptedPrivacyAt: now,
		acceptedMarketingAt: payload.agreements.marketing ? now : undefined,
		createdAt: now,
	});
	store.freeTrialGrants.push({
		id: randomUUID(),
		userId,
		phoneNumber: parsed.phoneNumber,
		deviceId: parsed.deviceId,
		grantedAt: now,
		expiresAt: new Date(Date.now() + config.freeTrialDays * 24 * 60 * 60 * 1000).toISOString(),
		source: "signup",
	});
	store.phoneVerifications = store.phoneVerifications.filter((item) => item.id !== verification.id);
	appendAuditLog(store, {
		username: parsed.username,
		email: parsed.email,
		phoneNumber: parsed.phoneNumber,
		deviceId: parsed.deviceId,
		signupIp: meta?.requestIp,
		outcome: "created",
		reason: "signup_success",
	});
	await writeStore(store);

	return {
		created: true,
		message: "email signup ready",
		session: createUserSession(user),
	};
}

export async function loginWithEmail(payload: EmailLoginRequest) {
	if (isPostgresEnabled()) {
		return await loginWithEmailPg(payload);
	}
	const identifier = payload.identifier.trim().toLowerCase();
	const password = payload.password.trim();
	if (!identifier || !password) {
		throw new Error("아이디와 비밀번호를 입력해주세요.");
	}

	const store = await readStore();
	const user = store.users.find(
		(item) => item.username === identifier || item.email === identifier,
	);
	if (!user) {
		throw new Error("가입된 계정을 찾지 못했습니다.");
	}

	const expectedHash = Buffer.from(user.passwordHash, "hex");
	const candidateHash = Buffer.from(hashPassword(password, user.passwordSalt), "hex");
	const isMatched =
		expectedHash.length === candidateHash.length && timingSafeEqual(expectedHash, candidateHash);
	if (!isMatched) {
		throw new Error("비밀번호가 올바르지 않습니다.");
	}

	user.lastLoginAt = new Date().toISOString();
	user.updatedAt = user.lastLoginAt;
	await writeStore(store);
	return {
		loggedIn: true,
		message: "email login ready",
		session: createUserSession(user),
	};
}
