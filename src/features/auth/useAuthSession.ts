import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type {
	AuthAccessPolicy,
	AuthSessionSnapshot,
	AuthState,
	DesktopAuthSession,
	UseAuthSessionResult,
} from "./authTypes";

const GUEST_STORAGE_KEY = "autoscreen_auth_guest_v1";
const TRIAL_START_PREFIX = "autoscreen_trial_started_at_v1:";
const FALLBACK_WEBSITE_ORIGIN = "https://autoscreen.app";
const FREE_TRIAL_DAYS = 7;
const FREE_TRIAL_MS = FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000;

type AuthRoute = "google" | "signup" | "login" | "pricing";
type BrowserAuthProvider = "google" | "email" | "login";

function getWebsiteOrigin() {
	const envOrigin = import.meta.env.VITE_APP_WEBSITE_URL;
	if (typeof envOrigin === "string" && envOrigin.trim().length > 0) {
		return envOrigin.replace(/\/$/, "");
	}

	return FALLBACK_WEBSITE_ORIGIN;
}

function getAuthRouteUrl(route: AuthRoute) {
	const origin = getWebsiteOrigin();
	const url = new URL(
		route === "google"
			? "/auth/google"
			: route === "signup"
				? "/signup"
				: route === "login"
					? "/login"
					: "/pricing",
		origin,
	);

	if (route !== "pricing") {
		url.searchParams.set("source", "desktop");
		url.searchParams.set("app", "autoscreen");
		url.searchParams.set("desktop_redirect_uri", "autoscreen://auth/callback");
	}

	return url.toString();
}

function persistGuestSession(session: AuthSessionSnapshot | null) {
	if (session) {
		localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(session));
		return;
	}
	localStorage.removeItem(GUEST_STORAGE_KEY);
}

function restoreGuestSession(): AuthSessionSnapshot | null {
	try {
		const raw = localStorage.getItem(GUEST_STORAGE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as AuthSessionSnapshot;
		return parsed?.kind === "guest" ? parsed : null;
	} catch {
		return null;
	}
}

function toSignedInSnapshot(session: DesktopAuthSession): AuthSessionSnapshot {
	return {
		kind: "signed_in",
		user: session.user,
		plan: session.subscription.plan,
		entitlements: session.entitlements,
		createdAt: session.lastUpdatedAt,
	};
}

function getTrialStart(userId: string, fallbackIso: string) {
	const key = `${TRIAL_START_PREFIX}${userId}`;
	const stored = localStorage.getItem(key);
	if (stored) {
		return stored;
	}
	localStorage.setItem(key, fallbackIso);
	return fallbackIso;
}

function buildAccessPolicy(state: AuthState): AuthAccessPolicy {
	if (state.status === "guest") {
		return {
			mode: "guest",
			canUseEditor: true,
			canExport: false,
			message: "둘러보기 모드에서는 내보내기가 잠겨 있습니다.",
		};
	}

	if (state.status !== "signed_in") {
		return { mode: "signed_out", canUseEditor: false, canExport: false };
	}

	if (state.desktopSession.subscription.plan === "pro") {
		return { mode: "pro", canUseEditor: true, canExport: true };
	}

	const trialStartedAt = getTrialStart(
		state.desktopSession.user.id,
		state.desktopSession.lastUpdatedAt,
	);
	const trialEndsAtMs = new Date(trialStartedAt).getTime() + FREE_TRIAL_MS;
	const remainingMs = trialEndsAtMs - Date.now();
	const trialEndsAt = new Date(trialEndsAtMs).toISOString();

	if (remainingMs <= 0) {
		return {
			mode: "blocked",
			canUseEditor: false,
			canExport: false,
			trialEndsAt,
			remainingDays: 0,
			message: "7일 무료 기간이 끝났습니다. 계속 사용하려면 Pro 플랜이 필요합니다.",
		};
	}

	return {
		mode: "trial",
		canUseEditor: true,
		canExport: true,
		trialEndsAt,
		remainingDays: Math.max(1, Math.ceil(remainingMs / (24 * 60 * 60 * 1000))),
		message: `무료 체험 ${Math.max(1, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)))}일 남음`,
	};
}

export function useAuthSession(): UseAuthSessionResult {
	const [state, setState] = useState<AuthState>({ status: "booting" });
	const [dialogMode, setDialogMode] = useState<"login" | "signup" | null>(null);
	const [recoveryIntent, setRecoveryIntent] = useState<"find-id" | "reset-password" | null>(null);
	const [isDialogSubmitting, setIsDialogSubmitting] = useState(false);
	const [dialogErrorMessage, setDialogErrorMessage] = useState<string | null>(null);

	useEffect(() => {
		let disposed = false;

		const boot = async () => {
			try {
				const desktopSession =
					(await window.electronAPI.getAuthSession()) as DesktopAuthSession | null;
				if (disposed) return;

				if (desktopSession?.user?.email) {
					persistGuestSession(null);
					setState({
						status: "signed_in",
						session: toSignedInSnapshot(desktopSession),
						desktopSession,
					});
					return;
				}

				const guestSession = restoreGuestSession();
				if (guestSession) {
					setState({ status: "guest", session: guestSession });
					return;
				}

				persistGuestSession(null);
				setState({ status: "signed_out" });
			} catch {
				if (!disposed) {
					setState({ status: "signed_out" });
				}
			}
		};

		void boot();

		const unsubscribe = window.electronAPI.onAuthSessionChanged((desktopSession) => {
			if (disposed) return;
			if (desktopSession?.user?.email) {
				persistGuestSession(null);
				setDialogMode(null);
				setDialogErrorMessage(null);
				setIsDialogSubmitting(false);
				setState({
					status: "signed_in",
					session: toSignedInSnapshot(desktopSession as DesktopAuthSession),
					desktopSession: desktopSession as DesktopAuthSession,
				});
				toast.success("로그인되었습니다.");
				return;
			}

			persistGuestSession(null);
			setState({ status: "signed_out" });
		});

		return () => {
			disposed = true;
			unsubscribe();
		};
	}, []);

	const openExternalFlow = useCallback(async (provider: BrowserAuthProvider, route: AuthRoute) => {
		setDialogMode(null);
		setDialogErrorMessage(null);
		setState({ status: "pending_browser_auth", provider });
		const result = await window.electronAPI.openExternalUrl(getAuthRouteUrl(route));
		if (!result.success) {
			toast.error("브라우저를 열지 못했습니다.");
			setState({ status: "signed_out" });
			return;
		}
		toast.message("브라우저에서 인증을 계속해주세요.");
	}, []);

	const continueAsGuest = useCallback(() => {
		const guestSession: AuthSessionSnapshot = {
			kind: "guest",
			plan: "free",
			entitlements: ["basic_recording", "basic_editing"],
			createdAt: new Date().toISOString(),
		};
		persistGuestSession(guestSession);
		setDialogMode(null);
		setDialogErrorMessage(null);
		setState({ status: "guest", session: guestSession });
		toast.success("둘러보기 모드로 진입했습니다.");
	}, []);

	const closeAuthDialog = useCallback(() => {
		setDialogMode(null);
		setRecoveryIntent(null);
		setDialogErrorMessage(null);
		setIsDialogSubmitting(false);
	}, []);

	const submitDesktopLogin = useCallback(
		async (payload: { identifier: string; password: string }) => {
			setIsDialogSubmitting(true);
			setDialogErrorMessage(null);
			const result = await window.electronAPI.loginLocalAuthAccount(payload);
			setIsDialogSubmitting(false);
			if (!result.success) {
				setDialogErrorMessage(result.error ?? "로그인에 실패했습니다.");
				return;
			}
			toast.success("데스크톱 앱에서 로그인되었습니다.");
		},
		[],
	);

	const submitDesktopSignup = useCallback(
		async (payload: {
			username: string;
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
		}) => {
			setIsDialogSubmitting(true);
			setDialogErrorMessage(null);
			const result = await window.electronAPI.createLocalAuthAccount(payload);
			setIsDialogSubmitting(false);
			if (!result.success) {
				setDialogErrorMessage(result.error ?? "회원가입에 실패했습니다.");
				return;
			}
			toast.success("데스크톱 앱에서 계정을 만들고 바로 시작했습니다.");
		},
		[],
	);

	const signOut = useCallback(async () => {
		persistGuestSession(null);
		await window.electronAPI.logoutAuthSession();
		setState({ status: "signed_out" });
		toast.success("로그아웃되었습니다.");
	}, []);

	const clearExpiredState = useCallback(async () => {
		persistGuestSession(null);
		await window.electronAPI.clearAuthSession();
		setState({ status: "signed_out" });
	}, []);

	const actions = useMemo(
		() => ({
			continueAsGuest,
			openGoogleSignIn: async () => openExternalFlow("google", "google"),
			openEmailSignup: async () => {
				setRecoveryIntent(null);
				setDialogErrorMessage(null);
				setDialogMode("signup");
			},
			openLogin: async () => {
				setRecoveryIntent(null);
				setDialogErrorMessage(null);
				setDialogMode("login");
			},
			openFindId: async () => {
				setDialogErrorMessage(null);
				setRecoveryIntent("find-id");
				setDialogMode("login");
			},
			openResetPassword: async () => {
				setDialogErrorMessage(null);
				setRecoveryIntent("reset-password");
				setDialogMode("login");
			},
			closeAuthDialog,
			submitDesktopLogin,
			submitDesktopSignup,
			openPricing: async () => {
				const result = await window.electronAPI.openExternalUrl(getAuthRouteUrl("pricing"));
				if (!result.success) {
					toast.error("요금제 페이지를 열지 못했습니다.");
				}
			},
			signOut,
			clearExpiredState,
		}),
		[
			clearExpiredState,
			closeAuthDialog,
			continueAsGuest,
			openExternalFlow,
			signOut,
			submitDesktopLogin,
			submitDesktopSignup,
		],
	);

	const access = useMemo(() => buildAccessPolicy(state), [state]);
	const ui = useMemo(
		() => ({
			mode: dialogMode,
			recoveryIntent,
			isSubmitting: isDialogSubmitting,
			errorMessage: dialogErrorMessage,
		}),
		[dialogErrorMessage, dialogMode, isDialogSubmitting, recoveryIntent],
	);

	return { state, actions, access, ui };
}
