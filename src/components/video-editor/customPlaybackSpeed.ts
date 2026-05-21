import { clampPlaybackSpeed, MAX_PLAYBACK_SPEED, MIN_PLAYBACK_SPEED } from "./types";

export function formatCustomPlaybackSpeedDraft(value: number, isPreset: boolean): string {
	return isPreset ? "" : String(clampPlaybackSpeed(value));
}

export function sanitizeCustomPlaybackSpeedDraft(input: string): string {
	const cleaned = input.replace(/[^0-9.]/g, "");
	if (!cleaned) return "";

	const startsWithDot = cleaned.startsWith(".");
	const [integerPartRaw, ...decimalParts] = cleaned.split(".");
	const integerPart = integerPartRaw.replace(/^0+(?=\d)/, "") || "0";
	const decimalPart = decimalParts.join("").slice(0, 2);

	if (startsWithDot || cleaned.includes(".")) {
		return `${integerPart}.${decimalPart}`;
	}

	return integerPart;
}

export function parseCustomPlaybackSpeedDraft(draft: string): number | null {
	if (!draft || draft.endsWith(".")) return null;

	const parsed = Number(draft);
	if (!Number.isFinite(parsed)) return null;
	if (parsed < MIN_PLAYBACK_SPEED || parsed > MAX_PLAYBACK_SPEED) return null;

	return clampPlaybackSpeed(parsed);
}
