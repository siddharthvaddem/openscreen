import { useEffect, useRef, useState } from "react";
import type { CaptionGenerationResult, CaptionSegment } from "@/lib/captions";

export type AutoCaptionStatus =
	| "idle"
	| "running"
	| "success"
	| "skipped"
	| "unavailable"
	| "error";

type UseAutoCaptionGenerationOptions = {
	sourcePath: string | null;
	enabled: boolean;
	language?: string;
	onCaptions: (segments: CaptionSegment[]) => void;
	onStatusMessage: (result: CaptionGenerationResult) => void;
};

export function useAutoCaptionGeneration({
	sourcePath,
	enabled,
	language,
	onCaptions,
	onStatusMessage,
}: UseAutoCaptionGenerationOptions) {
	const startedSourcesRef = useRef(new Set<string>());
	const onCaptionsRef = useRef(onCaptions);
	const onStatusMessageRef = useRef(onStatusMessage);
	const [status, setStatus] = useState<AutoCaptionStatus>("idle");

	onCaptionsRef.current = onCaptions;
	onStatusMessageRef.current = onStatusMessage;

	useEffect(() => {
		const startKey = sourcePath ? `${sourcePath}\n${language ?? ""}` : null;
		if (!enabled || !sourcePath || !startKey || startedSourcesRef.current.has(startKey)) {
			return;
		}

		startedSourcesRef.current.add(startKey);
		const jobId = `caption-${Date.now()}`;
		let cancelled = false;
		let settled = false;
		setStatus("running");

		void window.electronAPI
			.startCaptionGeneration(sourcePath, { jobId, ...(language ? { language } : {}) })
			.then((result) => {
				if (cancelled) return;
				settled = true;

				if (result.status === "success" && result.segments.length > 0) {
					onCaptionsRef.current(result.segments);
					setStatus("success");
				} else if (result.status === "skipped") {
					setStatus("skipped");
				} else if (result.status === "unavailable") {
					setStatus("unavailable");
				} else if (result.status === "cancelled") {
					setStatus("idle");
				} else {
					setStatus("error");
				}

				onStatusMessageRef.current(result);
			})
			.catch((error) => {
				if (cancelled) return;
				settled = true;

				setStatus("error");
				onStatusMessageRef.current({
					jobId,
					status: "error",
					segments: [],
					message: "Failed to generate captions",
					error: String(error),
				});
			});

		return () => {
			cancelled = true;
			if (!settled) {
				startedSourcesRef.current.delete(startKey);
			}
			void window.electronAPI.cancelCaptionGeneration(jobId);
		};
	}, [enabled, sourcePath, language]);

	return status;
}
