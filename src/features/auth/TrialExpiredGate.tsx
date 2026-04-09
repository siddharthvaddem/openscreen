import brandmarkUrl from "../../../assets/branding/autoscreen-brandmark.svg";
import styles from "./AuthGate.module.css";

interface TrialExpiredGateProps {
	onUpgrade: () => Promise<void>;
	onSignOut: () => Promise<void>;
}

export function TrialExpiredGate({ onUpgrade, onSignOut }: TrialExpiredGateProps) {
	return (
		<div className={styles.screen}>
			<div className={styles.glowLeft} />
			<div className={styles.glowRight} />
			<div className={styles.card}>
				<img className={styles.logo} src={brandmarkUrl} alt="Auto Screen" />
				<div className={styles.titleBlock}>
					<h1 className={styles.title}>무료 체험이 종료되었습니다</h1>
					<p className={styles.subtitle}>
						7일 무료 기간이 끝났습니다. 계속 사용하려면 Pro 플랜으로 업그레이드해주세요.
					</p>
				</div>
				<div className={styles.buttonGroup}>
					<button className={styles.brandButton} type="button" onClick={() => void onUpgrade()}>
						Pro 플랜 보러가기
					</button>
					<button className={styles.secondaryButton} type="button" onClick={() => void onSignOut()}>
						다른 계정으로 로그인
					</button>
				</div>
			</div>
		</div>
	);
}
