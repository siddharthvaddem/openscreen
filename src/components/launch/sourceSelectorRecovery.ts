export type ScreenAccessStatus = "not-determined" | "granted" | "denied" | "restricted" | "unknown";

export type SourceSelectorRecoveryState =
	| "none"
	| "screen-permission-blocked"
	| "screen-permission-stale"
	| "screen-permission-missing"
	| "no-sources";

interface RecoveryParams {
	isMac: boolean;
	sourceCount: number;
	screenAccessStatus: ScreenAccessStatus;
}

export function getSourceSelectorRecoveryState({
	isMac,
	sourceCount,
	screenAccessStatus,
}: RecoveryParams): SourceSelectorRecoveryState {
	if (sourceCount > 0) {
		return "none";
	}

	if (!isMac) {
		return "no-sources";
	}

	if (screenAccessStatus === "denied" || screenAccessStatus === "restricted") {
		return "screen-permission-blocked";
	}

	if (screenAccessStatus === "granted") {
		return "screen-permission-stale";
	}

	if (screenAccessStatus === "not-determined" || screenAccessStatus === "unknown") {
		return "screen-permission-missing";
	}

	return "no-sources";
}
