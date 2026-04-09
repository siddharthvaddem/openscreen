import { Eye, EyeOff, Loader2, Smartphone, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { AuthDialogState, UseAuthSessionResult } from "./authTypes";

interface DesktopAuthDialogProps {
	ui: AuthDialogState;
	actions: UseAuthSessionResult["actions"];
}

function normalizePhone(phoneNumber: string) {
	return phoneNumber.replace(/\D/g, "");
}

function formatSeconds(totalSeconds: number) {
	const safe = Math.max(totalSeconds, 0);
	const minutes = Math.floor(safe / 60);
	const seconds = safe % 60;
	return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function DesktopAuthDialog({ ui, actions }: DesktopAuthDialogProps) {
	const [username, setUsername] = useState("");
	const [familyName, setFamilyName] = useState("");
	const [givenName, setGivenName] = useState("");
	const [phoneNumber, setPhoneNumber] = useState("");
	const [verificationCode, setVerificationCode] = useState("");
	const [verificationToken, setVerificationToken] = useState<string | null>(null);
	const [verificationHint, setVerificationHint] = useState<string | null>(null);
	const [verificationExpiresAt, setVerificationExpiresAt] = useState<string | null>(null);
	const [resendAvailableAt, setResendAvailableAt] = useState<string | null>(null);
	const [deviceId, setDeviceId] = useState<string>("");
	const [agreeTerms, setAgreeTerms] = useState(false);
	const [agreePrivacy, setAgreePrivacy] = useState(false);
	const [agreeMarketing, setAgreeMarketing] = useState(false);
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [isSendingCode, setIsSendingCode] = useState(false);
	const [isVerifyingCode, setIsVerifyingCode] = useState(false);
	const [now, setNow] = useState(Date.now());
	const [recoveryMode, setRecoveryMode] = useState<"find-id" | "reset-password" | null>(null);
	const [recoveryFamilyName, setRecoveryFamilyName] = useState("");
	const [recoveryGivenName, setRecoveryGivenName] = useState("");
	const [recoveryPhoneNumber, setRecoveryPhoneNumber] = useState("");
	const [recoveryCode, setRecoveryCode] = useState("");
	const [recoveryVerificationToken, setRecoveryVerificationToken] = useState<string | null>(null);
	const [recoveryHint, setRecoveryHint] = useState<string | null>(null);
	const [recoveryExpiresAt, setRecoveryExpiresAt] = useState<string | null>(null);
	const [recoveryResendAvailableAt, setRecoveryResendAvailableAt] = useState<string | null>(null);
	const [isSendingRecoveryCode, setIsSendingRecoveryCode] = useState(false);
	const [isVerifyingRecoveryCode, setIsVerifyingRecoveryCode] = useState(false);
	const [foundUsername, setFoundUsername] = useState<string | null>(null);
	const [recoveryUsername, setRecoveryUsername] = useState("");
	const [recoveryNewPassword, setRecoveryNewPassword] = useState("");
	const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState("");
	const [showRecoveryPassword, setShowRecoveryPassword] = useState(false);
	const [showRecoveryConfirmPassword, setShowRecoveryConfirmPassword] = useState(false);
	const [isSubmittingRecovery, setIsSubmittingRecovery] = useState(false);

	useEffect(() => {
		if (!ui.mode) return;
		window.electronAPI
			.getDeviceFingerprint()
			.then((result) => setDeviceId(result.deviceId))
			.catch(() => setDeviceId(""));
	}, [ui.mode]);

	useEffect(() => {
		if (!ui.mode) {
			setUsername("");
			setFamilyName("");
			setGivenName("");
			setPhoneNumber("");
			setVerificationCode("");
			setVerificationToken(null);
			setVerificationHint(null);
			setVerificationExpiresAt(null);
			setResendAvailableAt(null);
			setDeviceId("");
			setAgreeTerms(false);
			setAgreePrivacy(false);
			setAgreeMarketing(false);
			setPassword("");
			setShowPassword(false);
			setIsSendingCode(false);
			setIsVerifyingCode(false);
			setRecoveryMode(null);
			setRecoveryFamilyName("");
			setRecoveryGivenName("");
			setRecoveryPhoneNumber("");
			setRecoveryCode("");
			setRecoveryVerificationToken(null);
			setRecoveryHint(null);
			setRecoveryExpiresAt(null);
			setRecoveryResendAvailableAt(null);
			setIsSendingRecoveryCode(false);
			setIsVerifyingRecoveryCode(false);
			setFoundUsername(null);
			setRecoveryUsername("");
			setRecoveryNewPassword("");
			setRecoveryConfirmPassword("");
			setShowRecoveryPassword(false);
			setShowRecoveryConfirmPassword(false);
			setIsSubmittingRecovery(false);
			setNow(Date.now());
		}
	}, [ui.mode]);

	useEffect(() => {
		if (!ui.mode) return;
		if (ui.recoveryIntent) {
			setRecoveryMode(ui.recoveryIntent);
		}
	}, [ui.mode, ui.recoveryIntent]);

	useEffect(() => {
		if (!ui.mode) return;
		const timer = window.setInterval(() => setNow(Date.now()), 1000);
		return () => window.clearInterval(timer);
	}, [ui.mode]);

	const isSignup = ui.mode === "signup";
	const normalizedPhone = useMemo(() => normalizePhone(phoneNumber), [phoneNumber]);
	const normalizedRecoveryPhone = useMemo(
		() => normalizePhone(recoveryPhoneNumber),
		[recoveryPhoneNumber],
	);
	const isPhoneVerified = Boolean(verificationToken);
	const resendSecondsLeft = resendAvailableAt
		? Math.max(Math.ceil((new Date(resendAvailableAt).getTime() - now) / 1000), 0)
		: 0;
	const verificationSecondsLeft = verificationExpiresAt
		? Math.max(Math.ceil((new Date(verificationExpiresAt).getTime() - now) / 1000), 0)
		: 0;
	const recoveryResendSecondsLeft = recoveryResendAvailableAt
		? Math.max(Math.ceil((new Date(recoveryResendAvailableAt).getTime() - now) / 1000), 0)
		: 0;
	const recoveryVerificationSecondsLeft = recoveryExpiresAt
		? Math.max(Math.ceil((new Date(recoveryExpiresAt).getTime() - now) / 1000), 0)
		: 0;

	if (!ui.mode) {
		return null;
	}

	const resetRecoveryState = () => {
		setRecoveryFamilyName("");
		setRecoveryGivenName("");
		setRecoveryPhoneNumber("");
		setRecoveryCode("");
		setRecoveryVerificationToken(null);
		setRecoveryHint(null);
		setRecoveryExpiresAt(null);
		setRecoveryResendAvailableAt(null);
		setIsSendingRecoveryCode(false);
		setIsVerifyingRecoveryCode(false);
		setFoundUsername(null);
		setRecoveryUsername("");
		setRecoveryNewPassword("");
		setRecoveryConfirmPassword("");
		setShowRecoveryPassword(false);
		setShowRecoveryConfirmPassword(false);
		setIsSubmittingRecovery(false);
	};

	const openRecoveryMode = (mode: "find-id" | "reset-password") => {
		resetRecoveryState();
		setRecoveryMode(mode);
	};

	const closeRecoveryMode = () => {
		resetRecoveryState();
		setRecoveryMode(null);
	};

	const handleRequestVerification = async () => {
		setIsSendingCode(true);
		setVerificationHint(null);
		const result = await window.electronAPI.requestLocalPhoneVerification({
			phoneNumber: normalizedPhone,
			deviceId,
			purpose: "signup",
		});
		setIsSendingCode(false);
		if (!result.success) {
			setVerificationHint(result.error ?? "문자 인증 요청에 실패했습니다.");
			return;
		}
		setVerificationToken(null);
		setVerificationCode("");
		setVerificationExpiresAt(
			result.expiresAt ??
				(result.expiresInSec
					? new Date(Date.now() + result.expiresInSec * 1000).toISOString()
					: null),
		);
		setResendAvailableAt(
			result.retryAfterSec
				? new Date(Date.now() + result.retryAfterSec * 1000).toISOString()
				: null,
		);
		setVerificationHint(result.message ?? "인증 코드를 발송했습니다.");
		toast.success(result.message ?? "문자 인증 코드를 발송했습니다.");
	};

	const handleVerifyCode = async () => {
		setIsVerifyingCode(true);
		const result = await window.electronAPI.verifyLocalPhoneCode({
			phoneNumber: normalizedPhone,
			code: verificationCode,
			deviceId,
			purpose: "signup",
		});
		setIsVerifyingCode(false);
		if (!result.success) {
			setVerificationToken(null);
			setVerificationHint(result.error ?? "인증 코드 확인에 실패했습니다.");
			return;
		}
		setVerificationToken(result.verificationToken ?? null);
		setVerificationExpiresAt(result.expiresAt ?? verificationExpiresAt);
		setVerificationHint(result.message ?? "휴대폰 인증이 완료되었습니다.");
		toast.success(result.message ?? "휴대폰 인증이 완료되었습니다.");
	};

	const handleRequestRecoveryCode = async () => {
		setIsSendingRecoveryCode(true);
		setRecoveryHint(null);
		const result = await window.electronAPI.requestLocalPhoneVerification({
			phoneNumber: normalizedRecoveryPhone,
			deviceId,
			purpose: "recovery",
		});
		setIsSendingRecoveryCode(false);
		if (!result.success) {
			setRecoveryHint(result.error ?? "인증 요청에 실패했습니다.");
			return;
		}
		setRecoveryVerificationToken(null);
		setRecoveryCode("");
		setFoundUsername(null);
		setRecoveryExpiresAt(
			result.expiresAt ??
				(result.expiresInSec
					? new Date(Date.now() + result.expiresInSec * 1000).toISOString()
					: null),
		);
		setRecoveryResendAvailableAt(
			result.retryAfterSec
				? new Date(Date.now() + result.retryAfterSec * 1000).toISOString()
				: null,
		);
		setRecoveryHint(result.message ?? "인증 코드를 발송했습니다.");
		toast.success(result.message ?? "인증 코드를 발송했습니다.");
	};

	const handleVerifyRecoveryCode = async () => {
		setIsVerifyingRecoveryCode(true);
		const result = await window.electronAPI.verifyLocalPhoneCode({
			phoneNumber: normalizedRecoveryPhone,
			code: recoveryCode,
			deviceId,
			purpose: "recovery",
		});
		setIsVerifyingRecoveryCode(false);
		if (!result.success) {
			setRecoveryVerificationToken(null);
			setRecoveryHint(result.error ?? "인증 코드 확인에 실패했습니다.");
			return;
		}
		setRecoveryVerificationToken(result.verificationToken ?? null);
		setRecoveryExpiresAt(result.expiresAt ?? recoveryExpiresAt);
		setRecoveryHint(result.message ?? "본인 확인이 완료되었습니다.");
		toast.success(result.message ?? "본인 확인이 완료되었습니다.");
	};

	const handleFindUsername = async () => {
		if (!recoveryVerificationToken) {
			setRecoveryHint("휴대폰 본인 확인을 먼저 완료해주세요.");
			return;
		}
		setIsSubmittingRecovery(true);
		const result = await window.electronAPI.findLocalAuthUsername({
			familyName: recoveryFamilyName,
			givenName: recoveryGivenName,
			phoneNumber: normalizedRecoveryPhone,
			verificationToken: recoveryVerificationToken,
		});
		setIsSubmittingRecovery(false);
		if (!result.success || !result.username) {
			setRecoveryHint(result.error ?? "아이디를 찾지 못했습니다.");
			return;
		}
		setFoundUsername(result.username);
		setRecoveryHint("본인 확인이 완료되었습니다. 가입된 아이디를 확인하세요.");
		toast.success("가입된 아이디를 찾았습니다.");
	};

	const handleResetPassword = async () => {
		if (!recoveryVerificationToken) {
			setRecoveryHint("휴대폰 본인 확인을 먼저 완료해주세요.");
			return;
		}
		if (recoveryNewPassword.trim().length < 8) {
			setRecoveryHint("새 비밀번호는 8자 이상 입력해주세요.");
			return;
		}
		if (recoveryNewPassword !== recoveryConfirmPassword) {
			setRecoveryHint("새 비밀번호가 서로 다릅니다.");
			return;
		}
		setIsSubmittingRecovery(true);
		const result = await window.electronAPI.resetLocalAuthPassword({
			username: recoveryUsername,
			phoneNumber: normalizedRecoveryPhone,
			verificationToken: recoveryVerificationToken,
			newPassword: recoveryNewPassword,
		});
		setIsSubmittingRecovery(false);
		if (!result.success) {
			setRecoveryHint(result.error ?? "비밀번호를 재설정하지 못했습니다.");
			return;
		}
		toast.success("비밀번호를 새로 설정했습니다. 로그인해보세요.");
		closeRecoveryMode();
		setUsername(recoveryUsername);
		setPassword("");
	};

	const handleSubmit = () => {
		void (isSignup
			? actions.submitDesktopSignup({
					username,
					familyName,
					givenName,
					phoneNumber: normalizedPhone,
					password,
					verificationToken: verificationToken ?? "",
					deviceId,
					agreements: {
						terms: agreeTerms,
						privacy: agreePrivacy,
						marketing: agreeMarketing,
					},
				})
			: actions.submitDesktopLogin({ identifier: username, password, deviceId }));
	};

	const authTitle =
		recoveryMode === "find-id"
			? "아이디 찾기"
			: recoveryMode === "reset-password"
				? "비밀번호 재설정"
				: isSignup
					? "회원가입"
					: "로그인";
	const authDescription =
		recoveryMode === "find-id"
			? "가입한 이름과 휴대폰 본인확인으로 아이디를 찾습니다."
			: recoveryMode === "reset-password"
				? "아이디와 휴대폰 본인확인 후 새 비밀번호를 설정합니다."
				: null;

	return (
		<div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-sm">
			<div className="w-full max-w-[560px] rounded-[28px] border border-white/10 bg-[#101114] p-6 text-white shadow-2xl">
				<div className="mb-5 flex items-start justify-between gap-4">
					<div>
						<h2 className="text-2xl font-semibold tracking-[-0.04em] text-white">{authTitle}</h2>
						{authDescription ? (
							<p className="mt-2 text-sm text-white/55">{authDescription}</p>
						) : null}
					</div>
					<button
						type="button"
						onClick={actions.closeAuthDialog}
						className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
					>
						<X size={16} />
					</button>
				</div>

				{recoveryMode === null ? (
					<div className="space-y-4">
						<label className="block">
							<div className="mb-1.5 text-sm font-medium text-white/80">아이디</div>
							<input
								value={username}
								onChange={(event) => setUsername(event.target.value)}
								placeholder={isSignup ? "영문 소문자 숫자 밑줄 4자 이상" : "아이디 입력"}
								className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-base text-white outline-none transition placeholder:text-white/25 focus:border-[#34B27B]/60 focus:bg-white/[0.06]"
							/>
						</label>

						{isSignup ? (
							<>
								<label className="block">
									<div className="mb-1.5 text-sm font-medium text-white/80">비밀번호</div>
									<div className="relative">
										<input
											type={showPassword ? "text" : "password"}
											value={password}
											onChange={(event) => setPassword(event.target.value)}
											placeholder="8자 이상 입력"
											className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 pr-12 text-base text-white outline-none transition placeholder:text-white/25 focus:border-[#34B27B]/60 focus:bg-white/[0.06]"
										/>
										<button
											type="button"
											onClick={() => setShowPassword((prev) => !prev)}
											className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center text-white/45 transition hover:text-white"
										>
											{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
										</button>
									</div>
								</label>

								<div className="grid grid-cols-2 gap-3">
									<label className="block">
										<div className="mb-1.5 text-sm font-medium text-white/80">성</div>
										<input
											value={familyName}
											onChange={(event) => setFamilyName(event.target.value)}
											placeholder="예: 김"
											className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-base text-white outline-none transition placeholder:text-white/25 focus:border-[#34B27B]/60 focus:bg-white/[0.06]"
										/>
									</label>
									<label className="block">
										<div className="mb-1.5 text-sm font-medium text-white/80">이름</div>
										<input
											value={givenName}
											onChange={(event) => setGivenName(event.target.value)}
											placeholder="예: 민수"
											className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-base text-white outline-none transition placeholder:text-white/25 focus:border-[#34B27B]/60 focus:bg-white/[0.06]"
										/>
									</label>
								</div>

								<div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
									<div className="mb-3 flex items-center gap-2 text-sm font-medium text-white/85">
										<Smartphone size={16} />
										<span>휴대폰 본인 확인</span>
									</div>
									<div className="grid grid-cols-[1fr_auto] gap-2">
										<input
											value={phoneNumber}
											onChange={(event) => setPhoneNumber(event.target.value)}
											placeholder="01012345678"
											className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-base text-white outline-none transition placeholder:text-white/25 focus:border-[#34B27B]/60 focus:bg-white/[0.06]"
										/>
										<button
											type="button"
											disabled={isSendingCode || resendSecondsLeft > 0}
											onClick={() => void handleRequestVerification()}
											className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
										>
											{isSendingCode ? (
												<Loader2 size={16} className="animate-spin" />
											) : resendSecondsLeft > 0 ? (
												`재요청 ${formatSeconds(resendSecondsLeft)}`
											) : (
												"인증 요청"
											)}
										</button>
									</div>
									<div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
										<input
											value={verificationCode}
											onChange={(event) => setVerificationCode(event.target.value)}
											placeholder="문자 인증 코드 6자리"
											className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-base text-white outline-none transition placeholder:text-white/25 focus:border-[#34B27B]/60 focus:bg-white/[0.06]"
										/>
										<button
											type="button"
											disabled={
												isVerifyingCode ||
												verificationCode.trim().length < 6 ||
												verificationSecondsLeft === 0
											}
											onClick={() => void handleVerifyCode()}
											className={`inline-flex h-12 items-center justify-center rounded-2xl px-4 text-sm font-semibold transition ${
												isPhoneVerified
													? "border border-[#34B27B]/30 bg-[#34B27B]/20 text-[#97ebbb]"
													: "border border-white/10 bg-white/5 text-white hover:bg-white/10"
											}`}
										>
											{isVerifyingCode ? (
												<Loader2 size={16} className="animate-spin" />
											) : isPhoneVerified ? (
												"인증 완료"
											) : (
												"코드 확인"
											)}
										</button>
									</div>
									{verificationHint ? (
										<div
											className={`mt-2 text-sm ${isPhoneVerified ? "text-[#97ebbb]" : "text-white/55"}`}
										>
											{verificationHint}
										</div>
									) : null}
								</div>
							</>
						) : (
							<label className="block">
								<div className="mb-1.5 text-sm font-medium text-white/80">비밀번호</div>
								<div className="relative">
									<input
										type={showPassword ? "text" : "password"}
										value={password}
										onChange={(event) => setPassword(event.target.value)}
										placeholder="비밀번호 입력"
										className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 pr-12 text-base text-white outline-none transition placeholder:text-white/25 focus:border-[#34B27B]/60 focus:bg-white/[0.06]"
									/>
									<button
										type="button"
										onClick={() => setShowPassword((prev) => !prev)}
										className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center text-white/45 transition hover:text-white"
									>
										{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
									</button>
								</div>
							</label>
						)}

						{ui.errorMessage ? (
							<div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
								{ui.errorMessage}
							</div>
						) : null}

						{isSignup ? (
							<div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
								<label className="flex items-start gap-3 text-sm text-white/75">
									<input
										type="checkbox"
										checked={agreeTerms}
										onChange={(event) => setAgreeTerms(event.target.checked)}
										className="mt-1 h-4 w-4 rounded border-white/20 bg-black/30"
									/>
									<span>이용약관에 동의합니다. 필수.</span>
								</label>
								<label className="flex items-start gap-3 text-sm text-white/75">
									<input
										type="checkbox"
										checked={agreePrivacy}
										onChange={(event) => setAgreePrivacy(event.target.checked)}
										className="mt-1 h-4 w-4 rounded border-white/20 bg-black/30"
									/>
									<span>개인정보 수집 및 이용에 동의합니다. 필수.</span>
								</label>
								<label className="flex items-start gap-3 text-sm text-white/60">
									<input
										type="checkbox"
										checked={agreeMarketing}
										onChange={(event) => setAgreeMarketing(event.target.checked)}
										className="mt-1 h-4 w-4 rounded border-white/20 bg-black/30"
									/>
									<span>업데이트 및 혜택 안내를 받겠습니다. 선택.</span>
								</label>
							</div>
						) : null}

						<button
							type="button"
							disabled={
								ui.isSubmitting || (isSignup && (!isPhoneVerified || !agreeTerms || !agreePrivacy))
							}
							onClick={handleSubmit}
							className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#34B27B] px-4 text-base font-semibold text-white transition hover:bg-[#34B27B]/90 disabled:cursor-not-allowed disabled:opacity-60"
						>
							{ui.isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
							<span>{isSignup ? "회원가입하고 바로 시작" : "로그인하고 계속하기"}</span>
						</button>

						{!isSignup ? (
							<div className="flex items-center justify-center gap-3 text-sm text-white/55">
								<button
									type="button"
									onClick={() => openRecoveryMode("find-id")}
									className="transition hover:text-white"
								>
									아이디 찾기
								</button>
								<span className="text-white/20">|</span>
								<button
									type="button"
									onClick={() => openRecoveryMode("reset-password")}
									className="transition hover:text-white"
								>
									비밀번호 찾기
								</button>
							</div>
						) : null}
					</div>
				) : (
					<div className="space-y-4">
						{recoveryMode === "find-id" ? (
							<>
								<div className="grid grid-cols-2 gap-3">
									<label className="block">
										<div className="mb-1.5 text-sm font-medium text-white/80">성</div>
										<input
											value={recoveryFamilyName}
											onChange={(event) => setRecoveryFamilyName(event.target.value)}
											placeholder="예: 김"
											className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-base text-white outline-none transition placeholder:text-white/25 focus:border-[#34B27B]/60 focus:bg-white/[0.06]"
										/>
									</label>
									<label className="block">
										<div className="mb-1.5 text-sm font-medium text-white/80">이름</div>
										<input
											value={recoveryGivenName}
											onChange={(event) => setRecoveryGivenName(event.target.value)}
											placeholder="예: 민수"
											className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-base text-white outline-none transition placeholder:text-white/25 focus:border-[#34B27B]/60 focus:bg-white/[0.06]"
										/>
									</label>
								</div>
								<div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
									<div className="mb-3 flex items-center gap-2 text-sm font-medium text-white/85">
										<Smartphone size={16} />
										<span>가입한 휴대폰 본인 확인</span>
									</div>
									<div className="grid grid-cols-[1fr_auto] gap-2">
										<input
											value={recoveryPhoneNumber}
											onChange={(event) => setRecoveryPhoneNumber(event.target.value)}
											placeholder="01012345678"
											className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-base text-white outline-none transition placeholder:text-white/25 focus:border-[#34B27B]/60 focus:bg-white/[0.06]"
										/>
										<button
											type="button"
											disabled={isSendingRecoveryCode || recoveryResendSecondsLeft > 0}
											onClick={() => void handleRequestRecoveryCode()}
											className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
										>
											{isSendingRecoveryCode ? (
												<Loader2 size={16} className="animate-spin" />
											) : recoveryResendSecondsLeft > 0 ? (
												`재요청 ${formatSeconds(recoveryResendSecondsLeft)}`
											) : (
												"인증 요청"
											)}
										</button>
									</div>
									<div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
										<input
											value={recoveryCode}
											onChange={(event) => setRecoveryCode(event.target.value)}
											placeholder="문자 인증 코드 6자리"
											className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-base text-white outline-none transition placeholder:text-white/25 focus:border-[#34B27B]/60 focus:bg-white/[0.06]"
										/>
										<button
											type="button"
											disabled={
												isVerifyingRecoveryCode ||
												recoveryCode.trim().length < 6 ||
												recoveryVerificationSecondsLeft === 0
											}
											onClick={() => void handleVerifyRecoveryCode()}
											className={`inline-flex h-12 items-center justify-center rounded-2xl px-4 text-sm font-semibold transition ${recoveryVerificationToken ? "border border-[#34B27B]/30 bg-[#34B27B]/20 text-[#97ebbb]" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}
										>
											{isVerifyingRecoveryCode ? (
												<Loader2 size={16} className="animate-spin" />
											) : recoveryVerificationToken ? (
												"인증 완료"
											) : (
												"코드 확인"
											)}
										</button>
									</div>
								</div>
								{foundUsername ? (
									<div className="rounded-2xl border border-[#34B27B]/25 bg-[#34B27B]/10 px-4 py-4">
										<div className="text-sm text-white/70">가입된 아이디</div>
										<div className="mt-1 text-xl font-semibold text-white">{foundUsername}</div>
									</div>
								) : null}
							</>
						) : (
							<>
								<label className="block">
									<div className="mb-1.5 text-sm font-medium text-white/80">아이디</div>
									<input
										value={recoveryUsername}
										onChange={(event) => setRecoveryUsername(event.target.value)}
										placeholder="가입한 아이디 입력"
										className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-base text-white outline-none transition placeholder:text-white/25 focus:border-[#34B27B]/60 focus:bg-white/[0.06]"
									/>
								</label>
								<div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
									<div className="mb-3 flex items-center gap-2 text-sm font-medium text-white/85">
										<Smartphone size={16} />
										<span>가입한 휴대폰 본인 확인</span>
									</div>
									<div className="grid grid-cols-[1fr_auto] gap-2">
										<input
											value={recoveryPhoneNumber}
											onChange={(event) => setRecoveryPhoneNumber(event.target.value)}
											placeholder="01012345678"
											className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-base text-white outline-none transition placeholder:text-white/25 focus:border-[#34B27B]/60 focus:bg-white/[0.06]"
										/>
										<button
											type="button"
											disabled={isSendingRecoveryCode || recoveryResendSecondsLeft > 0}
											onClick={() => void handleRequestRecoveryCode()}
											className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
										>
											{isSendingRecoveryCode ? (
												<Loader2 size={16} className="animate-spin" />
											) : recoveryResendSecondsLeft > 0 ? (
												`재요청 ${formatSeconds(recoveryResendSecondsLeft)}`
											) : (
												"인증 요청"
											)}
										</button>
									</div>
									<div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
										<input
											value={recoveryCode}
											onChange={(event) => setRecoveryCode(event.target.value)}
											placeholder="문자 인증 코드 6자리"
											className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-base text-white outline-none transition placeholder:text-white/25 focus:border-[#34B27B]/60 focus:bg-white/[0.06]"
										/>
										<button
											type="button"
											disabled={
												isVerifyingRecoveryCode ||
												recoveryCode.trim().length < 6 ||
												recoveryVerificationSecondsLeft === 0
											}
											onClick={() => void handleVerifyRecoveryCode()}
											className={`inline-flex h-12 items-center justify-center rounded-2xl px-4 text-sm font-semibold transition ${recoveryVerificationToken ? "border border-[#34B27B]/30 bg-[#34B27B]/20 text-[#97ebbb]" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}
										>
											{isVerifyingRecoveryCode ? (
												<Loader2 size={16} className="animate-spin" />
											) : recoveryVerificationToken ? (
												"인증 완료"
											) : (
												"코드 확인"
											)}
										</button>
									</div>
								</div>
								<label className="block">
									<div className="mb-1.5 text-sm font-medium text-white/80">새 비밀번호</div>
									<div className="relative">
										<input
											type={showRecoveryPassword ? "text" : "password"}
											value={recoveryNewPassword}
											onChange={(event) => setRecoveryNewPassword(event.target.value)}
											placeholder="8자 이상 입력"
											className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 pr-12 text-base text-white outline-none transition placeholder:text-white/25 focus:border-[#34B27B]/60 focus:bg-white/[0.06]"
										/>
										<button
											type="button"
											onClick={() => setShowRecoveryPassword((prev) => !prev)}
											className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center text-white/45 transition hover:text-white"
										>
											{showRecoveryPassword ? <EyeOff size={16} /> : <Eye size={16} />}
										</button>
									</div>
								</label>
								<label className="block">
									<div className="mb-1.5 text-sm font-medium text-white/80">새 비밀번호 확인</div>
									<div className="relative">
										<input
											type={showRecoveryConfirmPassword ? "text" : "password"}
											value={recoveryConfirmPassword}
											onChange={(event) => setRecoveryConfirmPassword(event.target.value)}
											placeholder="한 번 더 입력"
											className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 pr-12 text-base text-white outline-none transition placeholder:text-white/25 focus:border-[#34B27B]/60 focus:bg-white/[0.06]"
										/>
										<button
											type="button"
											onClick={() => setShowRecoveryConfirmPassword((prev) => !prev)}
											className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center text-white/45 transition hover:text-white"
										>
											{showRecoveryConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
										</button>
									</div>
								</label>
							</>
						)}

						{recoveryHint ? (
							<div
								className={`rounded-2xl border px-4 py-3 text-sm ${recoveryVerificationToken ? "border-[#34B27B]/25 bg-[#34B27B]/10 text-[#c8f5dc]" : "border-white/10 bg-white/[0.03] text-white/70"}`}
							>
								{recoveryHint}
							</div>
						) : null}

						<button
							type="button"
							onClick={() =>
								void (recoveryMode === "find-id" ? handleFindUsername() : handleResetPassword())
							}
							disabled={
								isSubmittingRecovery ||
								(recoveryMode === "find-id"
									? !recoveryVerificationToken
									: !recoveryVerificationToken)
							}
							className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#34B27B] px-4 text-base font-semibold text-white transition hover:bg-[#34B27B]/90 disabled:cursor-not-allowed disabled:opacity-60"
						>
							{isSubmittingRecovery ? <Loader2 size={16} className="animate-spin" /> : null}
							<span>{recoveryMode === "find-id" ? "아이디 확인" : "새 비밀번호 저장"}</span>
						</button>
					</div>
				)}

				<div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
					{recoveryMode ? (
						<button
							type="button"
							onClick={closeRecoveryMode}
							className="text-sm font-medium text-white/65 transition hover:text-white"
						>
							로그인으로 돌아가기
						</button>
					) : (
						<button
							type="button"
							onClick={() => void (isSignup ? actions.openLogin() : actions.openEmailSignup())}
							className="text-sm font-medium text-white/65 transition hover:text-white"
						>
							{isSignup ? "로그인" : "회원가입"}
						</button>
					)}
					{recoveryMode ? (
						<button
							type="button"
							onClick={() => void actions.openGoogleSignIn()}
							className="text-sm font-medium text-[#9fd8ff] transition hover:text-white"
						>
							Google로 계속하기
						</button>
					) : (
						<button
							type="button"
							onClick={() => void actions.openGoogleSignIn()}
							className="text-sm font-medium text-[#9fd8ff] transition hover:text-white"
						>
							Google로 계속하기
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
