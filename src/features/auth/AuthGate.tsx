import { useI18n } from "@/contexts/I18nContext";
import { type Locale, SUPPORTED_LOCALES } from "@/i18n/config";
import { getLocaleShort } from "@/i18n/loader";
import brandmarkUrl from "../../../assets/branding/autoscreen-brandmark.svg";
import styles from "./AuthGate.module.css";
import type { AuthState, UseAuthSessionResult } from "./authTypes";

interface AuthGateProps {
	state: AuthState;
	actions: UseAuthSessionResult["actions"];
}

const COPY: Record<Locale, Record<string, string>> = {
	en: {
		subtitle: "Sign in or create an account to get started.",
		login: "Log in",
		signup: "Create account",
		google: "Continue with Google",
		guest: "Explore",
		retry: "Try again",
		pending: "Continue signing in from your browser.",
		expired: "Your session expired. Please sign in again.",
		localeLabel: "Language",
	},
	ko: {
		subtitle: "로그인 또는 회원가입 후 바로 시작하세요.",
		login: "로그인",
		signup: "회원가입",
		google: "Google로 계속하기",
		guest: "둘러보기",
		retry: "다시 시도",
		pending: "브라우저에서 로그인 진행 중입니다.",
		expired: "세션이 만료되었습니다. 다시 로그인해주세요.",
		localeLabel: "언어 선택",
	},
	"zh-CN": {
		subtitle: "登录或注册后即可开始使用。",
		login: "登录",
		signup: "注册",
		google: "使用 Google 继续",
		guest: "先看看",
		retry: "重试",
		pending: "请在浏览器中继续登录。",
		expired: "会话已过期，请重新登录。",
		localeLabel: "语言",
	},
	es: {
		subtitle: "Inicia sesión o crea una cuenta para empezar.",
		login: "Iniciar sesión",
		signup: "Crear cuenta",
		google: "Continuar con Google",
		guest: "Explorar",
		retry: "Reintentar",
		pending: "Continúa el inicio de sesión en tu navegador.",
		expired: "Tu sesión expiró. Inicia sesión de nuevo.",
		localeLabel: "Idioma",
	},
};

function getStatusMessage(state: AuthState, locale: Locale) {
	const copy = COPY[locale];
	switch (state.status) {
		case "pending_browser_auth":
			return copy.pending;
		case "session_expired":
			return copy.expired;
		default:
			return null;
	}
}

function GoogleIcon() {
	return (
		<svg className={styles.googleIcon} viewBox="0 0 24 24" aria-hidden="true">
			<path
				fill="#4285F4"
				d="M21.805 12.041c0-.818-.073-1.604-.209-2.359H12v4.466h5.487a4.69 4.69 0 0 1-2.034 3.079v2.558h3.29c1.926-1.773 3.062-4.387 3.062-7.744Z"
			/>
			<path
				fill="#34A853"
				d="M12 22c2.754 0 5.063-.913 6.75-2.477l-3.29-2.558c-.913.612-2.082.974-3.46.974-2.657 0-4.908-1.793-5.714-4.205H2.886v2.638A10 10 0 0 0 12 22Z"
			/>
			<path
				fill="#FBBC05"
				d="M6.286 13.734A5.994 5.994 0 0 1 5.966 12c0-.602.108-1.185.32-1.734V7.628h-3.4A10 10 0 0 0 2 12c0 1.611.385 3.136 1.086 4.372l3.2-2.638Z"
			/>
			<path
				fill="#EA4335"
				d="M12 6.061c1.498 0 2.844.515 3.904 1.526l2.927-2.927C17.058 3.011 14.749 2 12 2A10 10 0 0 0 3.086 7.628l3.4 2.638c.804-2.413 3.055-4.205 5.514-4.205Z"
			/>
		</svg>
	);
}

export function AuthGate({ state, actions }: AuthGateProps) {
	const { locale, setLocale } = useI18n();
	const copy = COPY[locale];
	const statusMessage = getStatusMessage(state, locale);

	return (
		<div className={styles.screen}>
			<div className={styles.glowLeft} />
			<div className={styles.glowRight} />

			<div className={styles.localeControlWrap}>
				<select
					aria-label={copy.localeLabel}
					value={locale}
					onChange={(e) => setLocale(e.target.value as Locale)}
					className={styles.localeSelect}
				>
					{SUPPORTED_LOCALES.map((loc) => (
						<option key={loc} value={loc}>
							{getLocaleShort(loc)}
						</option>
					))}
				</select>
			</div>

			<div className={styles.card}>
				<img className={styles.logo} src={brandmarkUrl} alt="Auto Screen" />
				<div className={styles.titleBlock}>
					<h1 className={styles.title}>Auto Screen</h1>
					<p className={styles.subtitle}>{copy.subtitle}</p>
				</div>
				{statusMessage ? <div className={styles.statusBanner}>{statusMessage}</div> : null}
				<div className={styles.buttonGroup}>
					<button
						className={styles.primaryButton}
						type="button"
						onClick={() => void actions.openLogin()}
					>
						{copy.login}
					</button>
					<button
						className={styles.brandButton}
						type="button"
						onClick={() => void actions.openEmailSignup()}
					>
						{copy.signup}
					</button>
					<button
						className={styles.secondaryButton}
						type="button"
						onClick={() => void actions.openGoogleSignIn()}
					>
						<span className={styles.buttonInner}>
							<GoogleIcon />
							<span>{copy.google}</span>
						</span>
					</button>
				</div>
				<div className={styles.recoveryLinks}>
					<button
						className={styles.textButton}
						type="button"
						onClick={() => void actions.openFindId()}
					>
						아이디 찾기
					</button>
					<span className={styles.recoveryDivider}>|</span>
					<button
						className={styles.textButton}
						type="button"
						onClick={() => void actions.openResetPassword()}
					>
						비밀번호 찾기
					</button>
				</div>
				<button className={styles.secondaryButton} type="button" onClick={actions.continueAsGuest}>
					{copy.guest}
				</button>
				<div className={styles.bottomRow}>
					{state.status === "session_expired" ? (
						<button className={styles.textButton} type="button" onClick={actions.clearExpiredState}>
							{copy.retry}
						</button>
					) : null}
				</div>
			</div>
		</div>
	);
}
