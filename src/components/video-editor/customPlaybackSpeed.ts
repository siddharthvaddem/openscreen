import {
	clampPlaybackSpeed,
	MAX_PLAYBACK_SPEED,
	MIN_PLAYBACK_SPEED,
	type PlaybackSpeed,
} from "./types";

export type CustomPlaybackSpeedInputResult =
	| { status: "empty"; draft: string }
	| { status: "too-fast"; draft: string }
	| { status: "too-slow"; draft: string }
	| { status: "valid"; draft: string; speed: PlaybackSpeed };

export function parseCustomPlaybackSpeedInput(rawValue: string): CustomPlaybackSpeedInputResult {
	const decimalDraft = rawValue.replace(/,/g, ".").replace(/[^\d.]/g, "");
	const [whole = "", ...fractionParts] = decimalDraft.split(".");
	const draft = fractionParts.length > 0 ? `${whole}.${fractionParts.join("")}` : whole;

	if (draft === "" || draft === ".") {
		return { status: "empty", draft };
	}

	const speed = Number(draft);
	if (!Number.isFinite(speed)) {
		return { status: "empty", draft };
	}

	if (speed > MAX_PLAYBACK_SPEED) {
		return { status: "too-fast", draft };
	}

	if (speed < MIN_PLAYBACK_SPEED) {
		return { status: "too-slow", draft };
	}

	return { status: "valid", draft, speed: clampPlaybackSpeed(speed) };
}
