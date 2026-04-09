import {
	detectSilentIntervals,
	detectSmartSpeedRegions,
} from "@/components/video-editor/smartSpeedUtils";
import {
	detectZoomDwellCandidates,
	normalizeCursorTelemetry,
} from "@/components/video-editor/timeline/zoomSuggestionUtils";
import {
	type CursorTelemetryPoint,
	clampFocusToDepth,
	type SmartSpeedIntensity,
	type SpeedRegion,
	type TrimRegion,
	type ZoomDepth,
	type ZoomRegion,
} from "@/components/video-editor/types";
import type { InteractionClickSample, InteractionKeySample } from "@/lib/recordingSession";
import type { AutoEditCommandResult, AutoEditOptions } from "./types";

interface BuildAutoEditCommandParams {
	videoUrl: string;
	durationMs: number;
	cursorTelemetry: CursorTelemetryPoint[];
	silentIntervals: Array<{ startMs: number; endMs: number }>;
	interactionClicks: InteractionClickSample[];
	interactionKeys: InteractionKeySample[];
	trimRegions: TrimRegion[];
	issueZoomId: () => string;
	issueSpeedId: () => string;
	options: AutoEditOptions;
}

const STYLE_PROFILE: Record<
	AutoEditOptions["style"],
	{ depth: ZoomDepth; durationMs: number; spacingMs: number; maxZooms: number }
> = {
	calm: { depth: 2, durationMs: 900, spacingMs: 2200, maxZooms: 4 },
	balanced: { depth: 3, durationMs: 1100, spacingMs: 1700, maxZooms: 6 },
	emphasis: { depth: 4, durationMs: 1300, spacingMs: 1300, maxZooms: 8 },
};

export async function buildAutoEditCommand(
	params: BuildAutoEditCommandParams,
): Promise<AutoEditCommandResult> {
	const {
		videoUrl,
		durationMs,
		cursorTelemetry,
		silentIntervals,
		interactionClicks,
		interactionKeys,
		trimRegions,
		issueZoomId,
		issueSpeedId,
		options,
	} = params;

	const profile = STYLE_PROFILE[options.style];
	const normalizedCursor = normalizeCursorTelemetry(cursorTelemetry, durationMs);
	const dwellCandidates =
		normalizedCursor.length >= 2 ? detectZoomDwellCandidates(normalizedCursor) : [];

	const focusFromActivity = (timeMs: number) => {
		if (interactionClicks.length === 0) return null;

		const nearest = interactionClicks.reduce<InteractionClickSample | null>((best, click) => {
			if (!best) return click;
			return Math.abs(click.timeMs - timeMs) < Math.abs(best.timeMs - timeMs) ? click : best;
		}, null);

		if (!nearest || Math.abs(nearest.timeMs - timeMs) > 1500) {
			return null;
		}

		return { cx: nearest.cx, cy: nearest.cy };
	};

	const generatedZoomRegions: ZoomRegion[] = [];
	let lastAcceptedCenter = -Infinity;

	for (const candidate of dwellCandidates.sort((a, b) => a.centerTimeMs - b.centerTimeMs)) {
		if (generatedZoomRegions.length >= profile.maxZooms) break;
		if (candidate.centerTimeMs - lastAcceptedCenter < profile.spacingMs) continue;

		const startMs = Math.max(
			0,
			Math.min(
				Math.round(candidate.centerTimeMs - profile.durationMs / 2),
				durationMs - profile.durationMs,
			),
		);
		const endMs = Math.min(durationMs, startMs + profile.durationMs);

		if (trimRegions.some((region) => endMs > region.startMs && startMs < region.endMs)) {
			continue;
		}

		const focus =
			options.focusStrategy === "activity"
				? (focusFromActivity(candidate.centerTimeMs) ?? candidate.focus)
				: candidate.focus;

		generatedZoomRegions.push({
			id: issueZoomId(),
			startMs,
			endMs,
			depth: profile.depth,
			focus: clampFocusToDepth(focus, profile.depth),
			focusMode: options.focusStrategy === "cursor" ? "auto" : "manual",
		});
		lastAcceptedCenter = candidate.centerTimeMs;
	}

	let generatedSpeedRegions: SpeedRegion[] = [];
	if (options.pauseMode !== "off") {
		const intervals =
			silentIntervals.length > 0
				? silentIntervals
				: await detectSilentIntervals({
						videoUrl,
						intensity: options.pauseMode as SmartSpeedIntensity,
						totalMs: durationMs,
					});

		generatedSpeedRegions = detectSmartSpeedRegions({
			cursorTelemetry: normalizedCursor,
			silentIntervals: intervals,
			keySamples: interactionKeys,
			zoomRegions: generatedZoomRegions,
			trimRegions,
			speedRegions: [],
			totalMs: durationMs,
			enabled: true,
			intensity: options.pauseMode as SmartSpeedIntensity,
		}).map((region) => ({
			...region,
			id: issueSpeedId(),
		}));
	}

	const summary: string[] = [];
	if (generatedZoomRegions.length > 0) summary.push(`줌 ${generatedZoomRegions.length}개`);
	if (generatedSpeedRegions.length > 0) summary.push(`속도 ${generatedSpeedRegions.length}개`);
	if (options.backgroundMode === "remove") summary.push("배경 제거");

	return {
		zoomRegions: generatedZoomRegions,
		speedRegions: generatedSpeedRegions,
		appliedBackgroundRemoval: options.backgroundMode === "remove",
		summary,
	};
}
