import { useCallback, useEffect, useRef } from "react";
import {
	type AudioEnhancementNodes,
	createAudioEnhancementChain,
	type NoiseReductionLevel,
} from "@/lib/audioEnhancement";

export type { NoiseReductionLevel } from "@/lib/audioEnhancement";

/**
 * Hook that applies real-time audio enhancement (noise reduction) to a
 * <video> or <audio> element during editor playback.
 *
 * The AudioContext and MediaElementSourceNode are created once and kept
 * alive for the lifetime of the media element. Only the enhancement
 * chain is swapped when the level changes or NR is toggled.
 */
export function useAudioEnhancement(
	mediaElement: HTMLVideoElement | HTMLAudioElement | null,
	enabled: boolean,
	level: NoiseReductionLevel,
) {
	const audioContextRef = useRef<AudioContext | null>(null);
	const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
	const enhancementRef = useRef<AudioEnhancementNodes | null>(null);
	const currentElementRef = useRef<HTMLMediaElement | null>(null);

	// Tear down enhancement chain only (keep context + source alive)
	const disconnectChain = useCallback(() => {
		if (sourceNodeRef.current) {
			sourceNodeRef.current.disconnect();
		}
		if (enhancementRef.current) {
			enhancementRef.current.destroy();
			enhancementRef.current = null;
		}
	}, []);

	// Full teardown when element changes or unmount
	const destroyAll = useCallback(() => {
		disconnectChain();
		sourceNodeRef.current = null;
		if (audioContextRef.current) {
			audioContextRef.current.close().catch(() => {});
			audioContextRef.current = null;
		}
		currentElementRef.current = null;
	}, [disconnectChain]);

	// Ensure AudioContext + source exist for the given element
	const ensureContext = useCallback(
		(element: HTMLMediaElement): { ctx: AudioContext; source: MediaElementAudioSourceNode } => {
			// If element changed, destroy old context
			if (currentElementRef.current !== element) {
				destroyAll();
			}

			let ctx = audioContextRef.current;
			if (!ctx || ctx.state === "closed") {
				ctx = new AudioContext({ sampleRate: 48000 });
				audioContextRef.current = ctx;
			}

			let source = sourceNodeRef.current;
			if (!source) {
				source = ctx.createMediaElementSource(element);
				sourceNodeRef.current = source;
				currentElementRef.current = element;
			}

			return { ctx, source };
		},
		[destroyAll],
	);

	// Main effect: reacts to enabled / level / element changes
	useEffect(() => {
		if (!mediaElement) {
			destroyAll();
			return;
		}

		const { ctx, source } = ensureContext(mediaElement);

		// Always disconnect old chain first
		disconnectChain();

		if (!enabled) {
			// Bypass: source → speakers directly
			source.connect(ctx.destination);
			return () => {
				source.disconnect();
			};
		}

		// Enhancement enabled — build chain async
		let cancelled = false;

		const setup = async () => {
			if (ctx.state === "suspended") {
				await ctx.resume();
			}
			if (cancelled) return;

			try {
				const enhancement = await createAudioEnhancementChain(ctx, level);
				if (cancelled) {
					enhancement.destroy();
					return;
				}
				enhancementRef.current = enhancement;

				// source → enhancement → speakers
				source.connect(enhancement.input);
				enhancement.output.connect(ctx.destination);
			} catch {
				// Fallback: direct
				if (!cancelled) {
					source.connect(ctx.destination);
				}
			}
		};

		setup();

		return () => {
			cancelled = true;
			disconnectChain();
			// Re-connect direct so audio doesn't go silent during transition
			try {
				source.connect(ctx.destination);
			} catch {
				// Context may be closed
			}
		};
	}, [mediaElement, enabled, level, ensureContext, disconnectChain, destroyAll]);

	// Cleanup on unmount
	useEffect(() => destroyAll, [destroyAll]);
}
