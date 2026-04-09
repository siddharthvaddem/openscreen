export type SubscriptionPlan = "free" | "pro";

export interface AuthUserSummary {
	id: string;
	email: string;
	displayName: string;
}

export interface AuthSessionSnapshot {
	kind: "guest" | "signed_in";
	user?: AuthUserSummary;
	plan: SubscriptionPlan;
	entitlements: string[];
	createdAt: string;
}

export interface DesktopAuthSession {
	accessToken: string;
	refreshToken: string;
	expiresAt: string;
	user: AuthUserSummary;
	subscription: {
		plan: SubscriptionPlan;
		status: string;
	};
	entitlements: string[];
	lastUpdatedAt: string;
}

export type AuthState =
	| { status: "booting" }
	| { status: "signed_out" }
	| { status: "pending_browser_auth"; provider: "google" | "email" | "login" }
	| { status: "session_expired" }
	| { status: "guest"; session: AuthSessionSnapshot }
	| { status: "signed_in"; session: AuthSessionSnapshot; desktopSession: DesktopAuthSession };

export interface AuthAccessPolicy {
	mode: "signed_out" | "guest" | "trial" | "pro" | "blocked";
	canUseEditor: boolean;
	canExport: boolean;
	trialEndsAt?: string;
	remainingDays?: number;
	message?: string;
}

export interface AuthDialogState {
	mode: "login" | "signup" | null;
	recoveryIntent: "find-id" | "reset-password" | null;
	isSubmitting: boolean;
	errorMessage: string | null;
}

export interface AuthActions {
	continueAsGuest: () => void;
	openGoogleSignIn: () => Promise<void>;
	openEmailSignup: () => Promise<void>;
	openLogin: () => Promise<void>;
	openFindId: () => Promise<void>;
	openResetPassword: () => Promise<void>;
	closeAuthDialog: () => void;
	submitDesktopLogin: (payload: {
		identifier: string;
		password: string;
		deviceId?: string;
	}) => Promise<void>;
	submitDesktopSignup: (payload: {
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
	}) => Promise<void>;
	openPricing: () => Promise<void>;
	signOut: () => Promise<void>;
	clearExpiredState: () => Promise<void>;
}

export interface UseAuthSessionResult {
	state: AuthState;
	actions: AuthActions;
	access: AuthAccessPolicy;
	ui: AuthDialogState;
}
