import type React from "react";
import type { SpeedRegion, TrimRegion } from "../types";

// Keep "scrub mode" on for a brief tail after `seeked`: rapid drag-scrubbing fires
// `seeking`/`seeked` dozens of times a second and toggling effects each time would flicker.
const SCRUB_END_DEBOUNCE_MS = 150;

interface VideoEventHandlersParams {
	video: HTMLVideoElement;
	isSeekingRef: React.MutableRefObject<boolean>;
	isPlayingRef: React.MutableRefObject<boolean>;
	allowPlaybackRef: React.MutableRefObject<boolean>;
	currentTimeRef: React.MutableRefObject<number>;
	timeUpdateAnimationRef: React.MutableRefObject<number | null>;
	onPlayStateChange: (playing: boolean) => void;
	onTimeUpdate: (time: number) => void;
	trimRegionsRef: React.MutableRefObject<TrimRegion[]>;
	speedRegionsRef: React.MutableRefObject<SpeedRegion[]>;
	isScrubbingRef?: React.MutableRefObject<boolean>;
	scrubEndTimerRef?: React.MutableRefObject<number | null>;
	onScrubChange?: (scrubbing: boolean) => void;
}

export function createVideoEventHandlers(params: VideoEventHandlersParams) {
	const {
		video,
		isSeekingRef,
		isPlayingRef,
		allowPlaybackRef,
		currentTimeRef,
		timeUpdateAnimationRef,
		onPlayStateChange,
		onTimeUpdate,
		trimRegionsRef,
		speedRegionsRef,
		isScrubbingRef,
		scrubEndTimerRef,
		onScrubChange,
	} = params;

	const clearScrubEndTimer = () => {
		if (scrubEndTimerRef && scrubEndTimerRef.current !== null) {
			window.clearTimeout(scrubEndTimerRef.current);
			scrubEndTimerRef.current = null;
		}
	};

	const emitTime = (timeValue: number) => {
		currentTimeRef.current = timeValue * 1000;
		onTimeUpdate(timeValue);
	};

	const findActiveTrimRegion = (currentTimeMs: number): TrimRegion | null => {
		const trimRegions = trimRegionsRef.current;
		return (
			trimRegions.find(
				(region) => currentTimeMs >= region.startMs && currentTimeMs < region.endMs,
			) || null
		);
	};

	const findActiveSpeedRegion = (currentTimeMs: number): SpeedRegion | null => {
		return (
			speedRegionsRef.current.find(
				(region) => currentTimeMs >= region.startMs && currentTimeMs < region.endMs,
			) || null
		);
	};

	function updateTime() {
		if (!video) return;

		const currentTimeMs = video.currentTime * 1000;
		const activeTrimRegion = findActiveTrimRegion(currentTimeMs);

		// In a trim region during playback: skip to its end
		if (activeTrimRegion && !video.paused && !video.ended) {
			const skipToTime = activeTrimRegion.endMs / 1000;

			// Pause if the skip would run past the end
			if (skipToTime >= video.duration) {
				video.pause();
			} else {
				video.currentTime = skipToTime;
				emitTime(skipToTime);
			}
		} else {
			const activeSpeedRegion = findActiveSpeedRegion(currentTimeMs);
			video.playbackRate = activeSpeedRegion ? activeSpeedRegion.speed : 1;
			emitTime(video.currentTime);
		}

		if (!video.paused && !video.ended) {
			timeUpdateAnimationRef.current = requestAnimationFrame(updateTime);
		}
	}

	const handlePlay = () => {
		if (isSeekingRef.current) {
			video.pause();
			return;
		}

		if (!allowPlaybackRef.current) {
			video.pause();
			return;
		}

		isPlayingRef.current = true;
		onPlayStateChange(true);
		if (timeUpdateAnimationRef.current) {
			cancelAnimationFrame(timeUpdateAnimationRef.current);
		}
		timeUpdateAnimationRef.current = requestAnimationFrame(updateTime);
	};

	const handlePause = () => {
		isPlayingRef.current = false;
		onPlayStateChange(false);
		if (timeUpdateAnimationRef.current) {
			cancelAnimationFrame(timeUpdateAnimationRef.current);
			timeUpdateAnimationRef.current = null;
		}
		emitTime(video.currentTime);
	};

	const handleSeeked = () => {
		isSeekingRef.current = false;

		if (isScrubbingRef && scrubEndTimerRef) {
			clearScrubEndTimer();
			scrubEndTimerRef.current = window.setTimeout(() => {
				isScrubbingRef.current = false;
				scrubEndTimerRef.current = null;
				onScrubChange?.(false);
			}, SCRUB_END_DEBOUNCE_MS);
		}

		const currentTimeMs = video.currentTime * 1000;
		const activeTrimRegion = findActiveTrimRegion(currentTimeMs);

		// Seeked into a trim region while playing: skip to the end
		if (activeTrimRegion && isPlayingRef.current && !video.paused) {
			const skipToTime = activeTrimRegion.endMs / 1000;

			if (skipToTime >= video.duration) {
				video.pause();
			} else {
				video.currentTime = skipToTime;
				emitTime(skipToTime);
			}
		} else {
			if (!isPlayingRef.current && !video.paused) {
				video.pause();
			}
			emitTime(video.currentTime);
		}
	};

	const handleSeeking = () => {
		isSeekingRef.current = true;

		if (isScrubbingRef) {
			clearScrubEndTimer();
			if (!isScrubbingRef.current) {
				isScrubbingRef.current = true;
				onScrubChange?.(true);
			}
		}

		if (!isPlayingRef.current && !video.paused) {
			video.pause();
		}
		emitTime(video.currentTime);
	};

	return {
		handlePlay,
		handlePause,
		handleSeeked,
		handleSeeking,
	};
}
