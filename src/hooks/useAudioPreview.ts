import type { Span } from "dnd-timeline";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { toFileUrl } from "@/components/video-editor/projectPersistence";
import type {
	AnnotationRegion,
	AudioHooksConfig,
	AudioHookType,
	HookRegion,
	SpeedRegion,
	TrimRegion,
	ZoomRegion,
} from "@/components/video-editor/types";
import { getAssetPath } from "@/lib/assetPath";
import type { EditorState } from "./useEditorHistory";

const DEFAULT_HOOK_SOUND_ASSETS: Record<AudioHookType, string> = {
	zoom: "/audio/hooks/zoom.wav",
	trim: "/audio/hooks/trim.wav",
	speed: "/audio/hooks/speed.mp3",
	annotation: "/audio/hooks/annotation.mp3",
	blur: "/audio/hooks/blur.wav",
};

const HOOK_TRIGGER_LEAD_MS = 140;

type StateUpdate = Partial<EditorState> | ((prev: EditorState) => Partial<EditorState>);

export function resolveAudioSourceUrl(value: string | null | undefined): string | undefined {
	if (!value) return undefined;
	if (/^(file|https?):\/\//i.test(value) || value.startsWith("/")) return value;
	return toFileUrl(value);
}

interface UseAudioPreviewOptions {
	pushState: (update: StateUpdate) => void;
	currentTimeRef: React.RefObject<number>;
	durationRef: React.RefObject<number>;
	nextMusicTrimIdRef: React.MutableRefObject<number>;
	nextHookRegionIdRef: React.MutableRefObject<number>;
	audioHooks: AudioHooksConfig;
	audioHooksVolume: number;
	hookRegions: HookRegion[];
	zoomRegions: ZoomRegion[];
	trimRegions: TrimRegion[];
	speedRegions: SpeedRegion[];
	annotationOnlyRegions: AnnotationRegion[];
	blurRegions: AnnotationRegion[];
	currentTime: number;
	isPlaying: boolean;
	selectedMusicRegionId: string | null;
	onSelectMusicRegion: (id: string | null) => void;
	onSelectHookRegion: (id: string | null) => void;
}

export function useAudioPreview({
	pushState,
	currentTimeRef,
	durationRef,
	nextMusicTrimIdRef,
	nextHookRegionIdRef,
	audioHooks,
	audioHooksVolume,
	hookRegions,
	zoomRegions,
	trimRegions,
	speedRegions,
	annotationOnlyRegions,
	blurRegions,
	currentTime,
	isPlaying,
	selectedMusicRegionId,
	onSelectMusicRegion,
	onSelectHookRegion,
}: UseAudioPreviewOptions) {
	const previewHookAudioNodesRef = useRef<HTMLAudioElement[]>([]);
	const hookRegionStopTimersRef = useRef<number[]>([]);
	const previousPlaybackTimeRef = useRef<number | null>(null);
	const previousHookRegionPlaybackTimeRef = useRef<number | null>(null);

	const [hookSoundLayers, setHookSoundLayers] = useState<Record<AudioHookType, string[]>>({
		zoom: [DEFAULT_HOOK_SOUND_ASSETS.zoom],
		trim: [DEFAULT_HOOK_SOUND_ASSETS.trim],
		speed: [DEFAULT_HOOK_SOUND_ASSETS.speed],
		annotation: [DEFAULT_HOOK_SOUND_ASSETS.annotation],
		blur: [DEFAULT_HOOK_SOUND_ASSETS.blur],
	});

	// Resolve bundled hook sound assets to their packaged file:// paths on mount.
	useEffect(() => {
		let mounted = true;

		const loadHookAssets = async () => {
			try {
				const entries = await Promise.all(
					(Object.keys(DEFAULT_HOOK_SOUND_ASSETS) as AudioHookType[]).map(async (hook) => {
						const resolved = await getAssetPath(DEFAULT_HOOK_SOUND_ASSETS[hook]);
						return [hook, resolved] as const;
					}),
				);

				if (!mounted) return;

				setHookSoundLayers(
					entries.reduce<Record<AudioHookType, string[]>>(
						(acc, [hook, url]) => {
							acc[hook] = [url];
							return acc;
						},
						{
							zoom: [DEFAULT_HOOK_SOUND_ASSETS.zoom],
							trim: [DEFAULT_HOOK_SOUND_ASSETS.trim],
							speed: [DEFAULT_HOOK_SOUND_ASSETS.speed],
							annotation: [DEFAULT_HOOK_SOUND_ASSETS.annotation],
							blur: [DEFAULT_HOOK_SOUND_ASSETS.blur],
						},
					),
				);
			} catch {
				// Keep default /audio/... paths in dev if asset resolution fails.
			}
		};

		void loadHookAssets();
		return () => {
			mounted = false;
		};
	}, []);

	// ── URL resolution ──────────────────────────────────────────────────────────

	const resolveLibraryTrackUrl = useCallback(async (trackUrl: string): Promise<string> => {
		if (/^(file|https?):\/\//i.test(trackUrl)) return trackUrl;
		if (trackUrl.startsWith("/")) {
			const relativePath = trackUrl.replace(/^\/+/, "");
			return getAssetPath(relativePath);
		}
		return trackUrl;
	}, []);

	const resolveAudioDurationMs = useCallback(async (audioUrl: string): Promise<number> => {
		return new Promise((resolve) => {
			const audio = new Audio(audioUrl);
			audio.preload = "metadata";

			const cleanup = () => {
				audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
				audio.removeEventListener("error", handleError);
				audio.src = "";
			};

			const handleLoadedMetadata = () => {
				const durationMs = Number.isFinite(audio.duration)
					? Math.round(audio.duration * 1000)
					: 1200;
				cleanup();
				resolve(Math.max(250, Math.min(durationMs, 12000)));
			};

			const handleError = () => {
				cleanup();
				resolve(1200);
			};

			audio.addEventListener("loadedmetadata", handleLoadedMetadata, { once: true });
			audio.addEventListener("error", handleError, { once: true });
		});
	}, []);

	// ── Background music ────────────────────────────────────────────────────────

	const handlePickBackgroundMusic = useCallback(async () => {
		const result = await window.electronAPI.openAudioFilePicker();
		if (result.canceled) return;
		if (!result.success || !result.path) {
			toast.error(result.message || "Failed to load audio file");
			return;
		}
		const fullDurationMs = Math.max(1000, Math.round((durationRef.current ?? 0) * 1000));
		pushState((prev) => ({
			backgroundMusicPath: result.path,
			backgroundMusicRegions:
				prev.backgroundMusicRegions.length > 0
					? prev.backgroundMusicRegions
					: [{ id: `music-${nextMusicTrimIdRef.current++}`, startMs: 0, endMs: fullDurationMs }],
		}));
	}, [pushState, durationRef, nextMusicTrimIdRef]);

	const handleMusicTrackSelect = useCallback(
		async (trackUrl: string) => {
			try {
				const resolvedAssetPath = await resolveLibraryTrackUrl(trackUrl);
				const fullDurationMs = Math.max(1000, Math.round((durationRef.current ?? 0) * 1000));
				pushState((prev) => ({
					backgroundMusicPath: resolvedAssetPath,
					backgroundMusicRegions:
						prev.backgroundMusicRegions.length > 0
							? prev.backgroundMusicRegions
							: [
									{
										id: `music-${nextMusicTrimIdRef.current++}`,
										startMs: 0,
										endMs: fullDurationMs,
									},
								],
				}));
			} catch {
				toast.error("Failed to load bundled track");
			}
		},
		[pushState, resolveLibraryTrackUrl, durationRef, nextMusicTrimIdRef],
	);

	const handleRemoveBackgroundMusic = useCallback(() => {
		pushState({ backgroundMusicPath: null, backgroundMusicRegions: [] });
		onSelectMusicRegion(null);
	}, [pushState, onSelectMusicRegion]);

	const handleMusicRegionAdded = useCallback(
		(span: Span) => {
			const id = `music-${nextMusicTrimIdRef.current++}`;
			const newRegion: TrimRegion = {
				id,
				startMs: Math.round(span.start),
				endMs: Math.round(span.end),
			};
			pushState((prev) => ({
				backgroundMusicRegions: [...prev.backgroundMusicRegions, newRegion],
			}));
			onSelectMusicRegion(id);
		},
		[pushState, nextMusicTrimIdRef, onSelectMusicRegion],
	);

	const handleMusicRegionSpanChange = useCallback(
		(id: string, span: Span) => {
			pushState((prev) => ({
				backgroundMusicRegions: prev.backgroundMusicRegions.map((region) =>
					region.id === id
						? { ...region, startMs: Math.round(span.start), endMs: Math.round(span.end) }
						: region,
				),
			}));
		},
		[pushState],
	);

	const handleMusicRegionDelete = useCallback(
		(id: string) => {
			pushState((prev) => ({
				backgroundMusicRegions: prev.backgroundMusicRegions.filter((region) => region.id !== id),
			}));
			if (selectedMusicRegionId === id) {
				onSelectMusicRegion(null);
			}
		},
		[pushState, selectedMusicRegionId, onSelectMusicRegion],
	);

	// ── Hook sounds ─────────────────────────────────────────────────────────────

	const handleHookTrackAdd = useCallback(
		async (hook: AudioHookType, trackUrl: string) => {
			try {
				const resolvedAssetPath = await resolveLibraryTrackUrl(trackUrl);
				setHookSoundLayers((prev) => {
					const existing = prev[hook] ?? [];
					if (existing.includes(resolvedAssetPath)) return prev;
					return { ...prev, [hook]: [...existing, resolvedAssetPath] };
				});
			} catch {
				toast.error("Failed to add hook sound");
			}
		},
		[resolveLibraryTrackUrl],
	);

	const handleHookTrackRemove = useCallback((hook: AudioHookType, trackUrl: string) => {
		setHookSoundLayers((prev) => ({
			...prev,
			[hook]: (prev[hook] ?? []).filter((url) => url !== trackUrl),
		}));
	}, []);

	const handleHookTimelineAdd = useCallback(
		async (hook: AudioHookType, trackUrl: string, trackLabel: string) => {
			try {
				const resolvedAssetPath = await resolveLibraryTrackUrl(trackUrl);
				const durationMs = await resolveAudioDurationMs(resolvedAssetPath);
				const playheadMs = Math.max(0, Math.round((currentTimeRef.current ?? 0) * 1000));
				const timelineDurationMs = Math.max(
					playheadMs + 1,
					Math.round((durationRef.current ?? 0) * 1000),
				);
				const endMs = Math.max(
					playheadMs + 1,
					Math.min(timelineDurationMs, playheadMs + durationMs),
				);

				const newRegion: HookRegion = {
					id: `hook-${nextHookRegionIdRef.current++}`,
					startMs: playheadMs,
					endMs,
					soundUrl: resolvedAssetPath,
					label: trackLabel,
					hookType: hook,
				};

				pushState((prev) => ({ hookRegions: [...prev.hookRegions, newRegion] }));
				onSelectHookRegion(newRegion.id);
			} catch {
				toast.error("Failed to add hook clip to timeline");
			}
		},
		[
			pushState,
			resolveLibraryTrackUrl,
			resolveAudioDurationMs,
			currentTimeRef,
			durationRef,
			nextHookRegionIdRef,
			onSelectHookRegion,
		],
	);

	// ── Preview playback ─────────────────────────────────────────────────────────

	const stopAllPreviewHookAudio = useCallback(() => {
		previewHookAudioNodesRef.current.forEach((audio) => {
			audio.pause();
			audio.currentTime = 0;
		});
		previewHookAudioNodesRef.current = [];
		hookRegionStopTimersRef.current.forEach((timerId) => {
			window.clearTimeout(timerId);
		});
		hookRegionStopTimersRef.current = [];
	}, []);

	const playHookPreviewSound = useCallback(
		(type: AudioHookType) => {
			const sources = hookSoundLayers[type]?.length
				? hookSoundLayers[type]
				: [DEFAULT_HOOK_SOUND_ASSETS[type]];
			if (!sources.length) return;

			sources.forEach((src) => {
				const audio = new Audio(src);
				audio.volume = Math.min(1, Math.max(0, audioHooksVolume));
				audio.preload = "auto";
				previewHookAudioNodesRef.current.push(audio);

				void audio.play().catch(() => undefined);
				audio.addEventListener(
					"ended",
					() => {
						previewHookAudioNodesRef.current = previewHookAudioNodesRef.current.filter(
							(node) => node !== audio,
						);
					},
					{ once: true },
				);
			});
		},
		[audioHooksVolume, hookSoundLayers],
	);

	const playHookRegionPreviewSound = useCallback(
		(region: HookRegion) => {
			const audio = new Audio(region.soundUrl);
			audio.volume = Math.min(1, Math.max(0, audioHooksVolume));
			audio.preload = "auto";
			previewHookAudioNodesRef.current.push(audio);

			const clipDurationMs = Math.max(30, region.endMs - region.startMs);
			const stopTimerId = window.setTimeout(() => {
				audio.pause();
				audio.currentTime = 0;
				previewHookAudioNodesRef.current = previewHookAudioNodesRef.current.filter(
					(node) => node !== audio,
				);
				hookRegionStopTimersRef.current = hookRegionStopTimersRef.current.filter(
					(id) => id !== stopTimerId,
				);
			}, clipDurationMs + 30);
			hookRegionStopTimersRef.current.push(stopTimerId);

			void audio.play().catch(() => {
				window.clearTimeout(stopTimerId);
				hookRegionStopTimersRef.current = hookRegionStopTimersRef.current.filter(
					(id) => id !== stopTimerId,
				);
				previewHookAudioNodesRef.current = previewHookAudioNodesRef.current.filter(
					(node) => node !== audio,
				);
			});

			audio.addEventListener(
				"ended",
				() => {
					window.clearTimeout(stopTimerId);
					hookRegionStopTimersRef.current = hookRegionStopTimersRef.current.filter(
						(id) => id !== stopTimerId,
					);
					previewHookAudioNodesRef.current = previewHookAudioNodesRef.current.filter(
						(node) => node !== audio,
					);
				},
				{ once: true },
			);
		},
		[audioHooksVolume],
	);

	// Trigger hook sounds when playback crosses region boundaries.
	useEffect(() => {
		const hookEntries = Object.entries(audioHooks).filter(([, enabled]) => enabled);
		if (!isPlaying || hookEntries.length === 0) {
			previousPlaybackTimeRef.current = null;
			return;
		}

		const currentMs = Math.round(currentTime * 1000);
		const previousMs = previousPlaybackTimeRef.current;
		previousPlaybackTimeRef.current = currentMs;

		if (previousMs === null) return;

		const delta = currentMs - previousMs;
		if (delta <= 0 || delta > 900) return;

		const crossed = (timeMs: number) => timeMs > previousMs && timeMs <= currentMs;
		const withLead = (timeMs: number) => Math.max(0, timeMs - HOOK_TRIGGER_LEAD_MS);

		if (audioHooks.zoom && zoomRegions.some((r) => crossed(withLead(r.startMs))))
			playHookPreviewSound("zoom");
		if (audioHooks.trim && trimRegions.some((r) => crossed(withLead(r.startMs))))
			playHookPreviewSound("trim");
		if (audioHooks.speed && speedRegions.some((r) => crossed(withLead(r.startMs))))
			playHookPreviewSound("speed");
		if (audioHooks.annotation && annotationOnlyRegions.some((r) => crossed(withLead(r.startMs))))
			playHookPreviewSound("annotation");
		if (audioHooks.blur && blurRegions.some((r) => crossed(withLead(r.startMs))))
			playHookPreviewSound("blur");
	}, [
		currentTime,
		isPlaying,
		audioHooks,
		zoomRegions,
		trimRegions,
		speedRegions,
		annotationOnlyRegions,
		blurRegions,
		playHookPreviewSound,
	]);

	// Trigger custom hook region sounds.
	useEffect(() => {
		if (!isPlaying || hookRegions.length === 0) {
			previousHookRegionPlaybackTimeRef.current = null;
			return;
		}

		const currentMs = Math.round(currentTime * 1000);
		const previousMs = previousHookRegionPlaybackTimeRef.current;
		previousHookRegionPlaybackTimeRef.current = currentMs;

		if (previousMs === null) return;

		const delta = currentMs - previousMs;
		if (delta <= 0 || delta > 900) return;

		const crossed = (timeMs: number) => timeMs > previousMs && timeMs <= currentMs;
		hookRegions.forEach((region) => {
			if (crossed(region.startMs)) playHookRegionPreviewSound(region);
		});
	}, [currentTime, isPlaying, hookRegions, playHookRegionPreviewSound]);

	// Stop all preview sounds on pause or unmount.
	useEffect(() => {
		if (!isPlaying) stopAllPreviewHookAudio();
	}, [isPlaying, stopAllPreviewHookAudio]);

	useEffect(() => {
		return () => {
			stopAllPreviewHookAudio();
		};
	}, [stopAllPreviewHookAudio]);

	return {
		hookSoundLayers,
		setHookSoundLayers,
		handlePickBackgroundMusic,
		handleMusicTrackSelect,
		handleRemoveBackgroundMusic,
		handleMusicRegionAdded,
		handleMusicRegionSpanChange,
		handleMusicRegionDelete,
		handleHookTrackAdd,
		handleHookTrackRemove,
		handleHookTimelineAdd,
	};
}
