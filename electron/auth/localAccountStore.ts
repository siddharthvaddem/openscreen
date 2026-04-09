import { randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { app } from "electron";
import type { DesktopAuthSession } from "./sessionStore";

interface LocalDesktopAccountRecord {
	id: string;
	username: string;
	email: string;
	familyName: string;
	givenName: string;
	displayName: string;
	phoneNumber: string;
	phoneVerifiedAt: string;
	acceptedTermsAt: string;
	acceptedPrivacyAt: string;
	acceptedMarketingAt?: string;
	signupDeviceId: string;
	passwordHash: string;
	passwordSalt: string;
	createdAt: string;
	lastLoginAt: string;
	freePlanGrantedAt: string;
}

interface LocalDesktopAccountsFile {
	accounts: LocalDesktopAccountRecord[];
}

interface PhoneVerificationRecord {
	phoneNumber: string;
	purpose: "signup" | "recovery";
	code: string;
	expiresAt: string;
	attemptCount: number;
	verifiedAt?: string;
	verificationToken?: string;
	lastRequestedAt: string;
}

interface PhoneVerificationsFile {
	verifications: PhoneVerificationRecord[];
}

interface RegisterLocalDesktopAccountInput {
	username: string;
	email?: string;
	familyName: string;
	givenName: string;
	phoneNumber: string;
	password: string;
	verificationToken: string;
	deviceId: string;
	agreements: {
		terms: boolean;
		privacy: boolean;
		marketing: boolean;
	};
}

interface LoginLocalDesktopAccountInput {
	identifier: string;
	password: string;
}

function getAccountsPath() {
	return path.join(app.getPath("userData"), "auth", "local-accounts.json");
}

function getPhoneVerificationPath() {
	return path.join(app.getPath("userData"), "auth", "phone-verifications.json");
}

function normalizeEmail(email: string) {
	return email.trim().toLowerCase();
}

function buildInternalEmail(username: string) {
	return `${normalizeUsername(username)}@users.autoscreen.local`;
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

function createToken() {
	return randomBytes(24).toString("hex");
}

async function readAccounts(): Promise<LocalDesktopAccountRecord[]> {
	try {
		const raw = await fs.readFile(getAccountsPath(), "utf8");
		const parsed = JSON.parse(raw) as LocalDesktopAccountsFile;
		return Array.isArray(parsed.accounts) ? parsed.accounts : [];
	} catch {
		return [];
	}
}

async function writeAccounts(accounts: LocalDesktopAccountRecord[]) {
	const filePath = getAccountsPath();
	await fs.mkdir(path.dirname(filePath), { recursive: true });
	await fs.writeFile(filePath, JSON.stringify({ accounts }, null, 2), "utf8");
}

async function readPhoneVerifications(): Promise<PhoneVerificationRecord[]> {
	try {
		const raw = await fs.readFile(getPhoneVerificationPath(), "utf8");
		const parsed = JSON.parse(raw) as PhoneVerificationsFile;
		return Array.isArray(parsed.verifications) ? parsed.verifications : [];
	} catch {
		return [];
	}
}

async function writePhoneVerifications(verifications: PhoneVerificationRecord[]) {
	const filePath = getPhoneVerificationPath();
	await fs.mkdir(path.dirname(filePath), { recursive: true });
	await fs.writeFile(filePath, JSON.stringify({ verifications }, null, 2), "utf8");
}

function createDesktopSession(account: LocalDesktopAccountRecord): DesktopAuthSession {
	const now = new Date().toISOString();
	return {
		accessToken: createToken(),
		refreshToken: createToken(),
		expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
		user: {
			id: account.id,
			email: account.email,
			displayName: account.displayName,
		},
		subscription: {
			plan: "free",
			status: "trial",
		},
		entitlements: ["basic_recording", "basic_editing"],
		lastUpdatedAt: now,
	};
}

function validateSignupFields(input: RegisterLocalDesktopAccountInput) {
	const username = normalizeUsername(input.username);
	const email = input.email?.trim()
		? normalizeEmail(input.email)
		: buildInternalEmail(input.username);
	const familyName = input.familyName.trim();
	const givenName = input.givenName.trim();
	const phoneNumber = normalizePhone(input.phoneNumber);
	const password = input.password.trim();

	if (!/^[a-z0-9_]{4,20}$/.test(username)) {
		return { error: "아이디는 영문 소문자 숫자 밑줄로 4자 이상 20자 이하만 가능합니다." };
	}

	if (!email || !email.includes("@")) {
		return { error: "올바른 이메일을 입력해주세요." };
	}

	if (familyName.length < 1) {
		return { error: "성을 입력해주세요." };
	}

	if (givenName.length < 1) {
		return { error: "이름을 입력해주세요." };
	}

	if (phoneNumber.length < 10 || phoneNumber.length > 11) {
		return { error: "휴대폰 번호를 정확히 입력해주세요." };
	}

	if (password.length < 8) {
		return { error: "비밀번호는 8자 이상 입력해주세요." };
	}

	if (!input.agreements.terms || !input.agreements.privacy) {
		return { error: "이용약관과 개인정보 수집 동의가 필요합니다." };
	}

	if (!input.deviceId || input.deviceId.trim().length < 8) {
		return { error: "디바이스 식별자를 확인하지 못했습니다." };
	}

	return {
		username,
		email,
		familyName,
		givenName,
		phoneNumber,
		password,
	};
}

export async function requestLocalPhoneVerification(
	phoneInput: string,
	purpose: "signup" | "recovery" = "signup",
): Promise<{ success: boolean; message?: string; previewCode?: string; error?: string }> {
	const phoneNumber = normalizePhone(phoneInput);
	if (phoneNumber.length < 10 || phoneNumber.length > 11) {
		return { success: false, error: "휴대폰 번호를 정확히 입력해주세요." };
	}

	const accounts = await readAccounts();
	if (purpose === "signup" && accounts.some((account) => account.phoneNumber === phoneNumber)) {
		return { success: false, error: "이미 사용 중인 휴대폰 번호입니다." };
	}
	if (purpose === "recovery" && !accounts.some((account) => account.phoneNumber === phoneNumber)) {
		return { success: false, error: "가입된 휴대폰 번호를 찾지 못했습니다." };
	}

	const verifications = await readPhoneVerifications();
	const now = Date.now();
	const existing = verifications.find(
		(item) => item.phoneNumber === phoneNumber && item.purpose === purpose,
	);
	if (existing && now - new Date(existing.lastRequestedAt).getTime() < 30_000) {
		return { success: false, error: "잠시 후 다시 요청해주세요." };
	}

	const code = String(randomInt(100000, 999999));
	const record: PhoneVerificationRecord = {
		phoneNumber,
		purpose,
		code,
		expiresAt: new Date(now + 1000 * 60 * 3).toISOString(),
		attemptCount: 0,
		lastRequestedAt: new Date(now).toISOString(),
	};

	const next = verifications.filter(
		(item) => !(item.phoneNumber === phoneNumber && item.purpose === purpose),
	);
	next.push(record);
	await writePhoneVerifications(next);

	return {
		success: true,
		message: app.isPackaged
			? "문자 인증 코드를 발송했습니다."
			: "개발 모드에서는 화면에서 인증 코드를 확인할 수 있습니다.",
		previewCode: app.isPackaged ? undefined : code,
	};
}

export async function verifyLocalPhoneCode(
	phoneInput: string,
	codeInput: string,
	purpose: "signup" | "recovery" = "signup",
): Promise<{ success: boolean; verificationToken?: string; message?: string; error?: string }> {
	const phoneNumber = normalizePhone(phoneInput);
	const code = codeInput.trim();
	const verifications = await readPhoneVerifications();
	const record = verifications.find(
		(item) => item.phoneNumber === phoneNumber && item.purpose === purpose,
	);

	if (!record) {
		return { success: false, error: "먼저 문자 인증 요청을 해주세요." };
	}

	if (new Date(record.expiresAt).getTime() < Date.now()) {
		return { success: false, error: "인증 코드가 만료되었습니다. 다시 요청해주세요." };
	}

	if (record.attemptCount >= 5) {
		return { success: false, error: "인증 시도가 너무 많습니다. 다시 요청해주세요." };
	}

	if (record.code !== code) {
		const updated = verifications.map((item) =>
			item.phoneNumber === phoneNumber && item.purpose === purpose
				? { ...item, attemptCount: item.attemptCount + 1 }
				: item,
		);
		await writePhoneVerifications(updated);
		return { success: false, error: "인증 코드가 올바르지 않습니다." };
	}

	const verificationToken = createToken();
	const updated = verifications.map((item) =>
		item.phoneNumber === phoneNumber && item.purpose === purpose
			? {
					...item,
					attemptCount: item.attemptCount + 1,
					verifiedAt: new Date().toISOString(),
					verificationToken,
				}
			: item,
	);
	await writePhoneVerifications(updated);
	return { success: true, verificationToken, message: "휴대폰 인증이 완료되었습니다." };
}

export async function findLocalUsername(input: {
	familyName: string;
	givenName: string;
	phoneNumber: string;
	verificationToken: string;
}): Promise<{ success: boolean; username?: string; error?: string }> {
	const familyName = input.familyName.trim();
	const givenName = input.givenName.trim();
	const phoneNumber = normalizePhone(input.phoneNumber);
	if (!familyName || !givenName) {
		return { success: false, error: "이름을 입력해주세요." };
	}
	const verifications = await readPhoneVerifications();
	const verification = verifications.find(
		(item) => item.phoneNumber === phoneNumber && item.purpose === "recovery",
	);
	if (
		!verification?.verificationToken ||
		verification.verificationToken !== input.verificationToken
	) {
		return { success: false, error: "휴대폰 본인 확인이 필요합니다." };
	}
	if (!verification.verifiedAt || new Date(verification.expiresAt).getTime() < Date.now()) {
		return { success: false, error: "본인 확인이 만료되었습니다. 다시 진행해주세요." };
	}
	const accounts = await readAccounts();
	const account = accounts.find(
		(candidate) =>
			candidate.phoneNumber === phoneNumber &&
			candidate.familyName === familyName &&
			candidate.givenName === givenName,
	);
	if (!account) {
		return { success: false, error: "일치하는 계정을 찾지 못했습니다." };
	}
	return { success: true, username: account.username };
}

export async function resetLocalDesktopPassword(input: {
	username: string;
	phoneNumber: string;
	verificationToken: string;
	newPassword: string;
}): Promise<{ success: boolean; error?: string }> {
	const username = normalizeUsername(input.username);
	const phoneNumber = normalizePhone(input.phoneNumber);
	const newPassword = input.newPassword.trim();
	if (!username) {
		return { success: false, error: "아이디를 입력해주세요." };
	}
	if (newPassword.length < 8) {
		return { success: false, error: "비밀번호는 8자 이상 입력해주세요." };
	}
	const verifications = await readPhoneVerifications();
	const verification = verifications.find(
		(item) => item.phoneNumber === phoneNumber && item.purpose === "recovery",
	);
	if (
		!verification?.verificationToken ||
		verification.verificationToken !== input.verificationToken
	) {
		return { success: false, error: "휴대폰 본인 확인이 필요합니다." };
	}
	if (!verification.verifiedAt || new Date(verification.expiresAt).getTime() < Date.now()) {
		return { success: false, error: "본인 확인이 만료되었습니다. 다시 진행해주세요." };
	}
	const accounts = await readAccounts();
	const account = accounts.find(
		(candidate) => candidate.username === username && candidate.phoneNumber === phoneNumber,
	);
	if (!account) {
		return { success: false, error: "일치하는 계정을 찾지 못했습니다." };
	}
	const salt = randomBytes(16).toString("hex");
	const updatedAccount: LocalDesktopAccountRecord = {
		...account,
		passwordSalt: salt,
		passwordHash: hashPassword(newPassword, salt),
		lastLoginAt: new Date().toISOString(),
	};
	await writeAccounts(
		accounts.map((candidate) => (candidate.id === account.id ? updatedAccount : candidate)),
	);
	await writePhoneVerifications(
		verifications.filter(
			(item) => !(item.phoneNumber === phoneNumber && item.purpose === "recovery"),
		),
	);
	return { success: true };
}

export async function registerLocalDesktopAccount(
	input: RegisterLocalDesktopAccountInput,
): Promise<{ session?: DesktopAuthSession; error?: string }> {
	const parsed = validateSignupFields(input);
	if ("error" in parsed) {
		return { error: parsed.error };
	}

	const accounts = await readAccounts();
	if (accounts.some((account) => account.username === parsed.username)) {
		return { error: "이미 사용 중인 아이디입니다." };
	}
	if (accounts.some((account) => account.email === parsed.email)) {
		return { error: "이미 가입된 이메일입니다." };
	}
	if (accounts.some((account) => account.phoneNumber === parsed.phoneNumber)) {
		return { error: "이미 사용 중인 휴대폰 번호입니다." };
	}
	if (accounts.some((account) => account.signupDeviceId === input.deviceId.trim())) {
		return { error: "이 디바이스에서는 이미 무료 플랜이 생성되었습니다." };
	}

	const verifications = await readPhoneVerifications();
	const verification = verifications.find((item) => item.phoneNumber === parsed.phoneNumber);
	if (
		!verification?.verificationToken ||
		verification.verificationToken !== input.verificationToken
	) {
		return { error: "휴대폰 인증이 완료되지 않았습니다." };
	}
	if (!verification.verifiedAt || new Date(verification.expiresAt).getTime() < Date.now()) {
		return { error: "휴대폰 인증이 만료되었습니다. 다시 진행해주세요." };
	}

	const now = new Date().toISOString();
	const salt = randomBytes(16).toString("hex");
	const displayName = `${parsed.familyName}${parsed.givenName}`;
	const account: LocalDesktopAccountRecord = {
		id: `local:${parsed.username}`,
		username: parsed.username,
		email: parsed.email,
		familyName: parsed.familyName,
		givenName: parsed.givenName,
		displayName,
		phoneNumber: parsed.phoneNumber,
		phoneVerifiedAt: verification.verifiedAt,
		acceptedTermsAt: now,
		acceptedPrivacyAt: now,
		acceptedMarketingAt: input.agreements.marketing ? now : undefined,
		signupDeviceId: input.deviceId.trim(),
		passwordSalt: salt,
		passwordHash: hashPassword(parsed.password, salt),
		createdAt: now,
		lastLoginAt: now,
		freePlanGrantedAt: now,
	};

	accounts.push(account);
	await writeAccounts(accounts);
	await writePhoneVerifications(
		verifications.filter((item) => item.phoneNumber !== parsed.phoneNumber),
	);
	return { session: createDesktopSession(account) };
}

export async function loginLocalDesktopAccount(
	input: LoginLocalDesktopAccountInput,
): Promise<{ session?: DesktopAuthSession; error?: string }> {
	const identifier = input.identifier.trim().toLowerCase();
	const password = input.password.trim();

	if (!identifier || !password) {
		return { error: "아이디와 비밀번호를 입력해주세요." };
	}

	const accounts = await readAccounts();
	const account = accounts.find(
		(candidate) => candidate.username === identifier || candidate.email === identifier,
	);
	if (!account) {
		return { error: "가입된 계정을 찾지 못했습니다." };
	}

	const expectedHash = Buffer.from(account.passwordHash, "hex");
	const incomingHash = Buffer.from(hashPassword(password, account.passwordSalt), "hex");
	if (expectedHash.length !== incomingHash.length || !timingSafeEqual(expectedHash, incomingHash)) {
		return { error: "비밀번호가 올바르지 않습니다." };
	}

	const updatedAccount: LocalDesktopAccountRecord = {
		...account,
		lastLoginAt: new Date().toISOString(),
	};
	await writeAccounts(
		accounts.map((candidate) => (candidate.id === account.id ? updatedAccount : candidate)),
	);
	return { session: createDesktopSession(updatedAccount) };
}
