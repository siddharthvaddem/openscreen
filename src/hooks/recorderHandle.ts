const RECORDER_TIMESLICE_MS = 1000;

export type RecorderHandle = {
	recorder: MediaRecorder;
	/**
	 * Resolves once the recording has fully drained. For a streamed recording the
	 * blob is empty (the bytes are already on disk); for an in-memory recording it
	 * holds the full WebM. Rejects if a chunk failed to write to disk mid-stream,
	 * so a truncated recording surfaces as an error instead of a silent partial save.
	 */
	recordedBlobPromise: Promise<Blob>;
	/**
	 * Whether the recording's bytes went to disk via the streaming path. Computed
	 * at finalize time rather than construction, so a stream that fails to open is
	 * correctly reported as not-streamed and its in-memory fallback is used.
	 */
	isStreaming: () => boolean;
	/**
	 * Close the disk stream (if one opened) and delete its partial file. Called
	 * when a recording is discarded or fails before a successful save, so cancelled
	 * runs don't leak the stream or orphan a partial file. No-op for in-memory
	 * recorders.
	 */
	discard: () => Promise<void>;
};

/**
 * Wrap a MediaRecorder, optionally streaming its chunks to disk.
 *
 * When `fileName` is given, chunks are written to disk in arrival order through
 * the main process as they arrive, so a long recording never buffers the whole
 * video in the renderer (the #616 fix). Until the disk stream confirms it is
 * open, chunks are held in memory; if the open fails, that buffer becomes a
 * complete in-memory fallback so nothing is lost. Native-capture webcam sidecars
 * omit `fileName` and always buffer in memory, since their finalize path reads
 * the blob directly to attach the webcam track.
 */
export function createRecorderHandle(
	stream: MediaStream,
	options: MediaRecorderOptions,
	fileName?: string,
): RecorderHandle {
	const recorder = new MediaRecorder(stream, options);
	const mimeType = options.mimeType || "video/webm";
	const api = window.electronAPI;

	// Chunks held in memory: everything before the stream opens, plus everything
	// when not streaming at all. On a successful open these flush to disk and are
	// dropped; on open failure they remain as the complete fallback recording.
	const memoryChunks: Blob[] = [];
	let mode: "pending" | "streaming" | "buffering" = fileName ? "pending" : "buffering";
	let streamOpened = false;
	let appendError: Error | null = null;

	// Serialize chunk writes so they land on disk in arrival order, and so stop
	// can await every in-flight write before the main process closes the stream
	// (otherwise a late chunk arrives after close and truncates the recording).
	let writeChain: Promise<void> = Promise.resolve();
	const enqueueWrite = (chunk: Blob) => {
		writeChain = writeChain.then(async () => {
			if (appendError || !fileName || !api?.appendRecordingChunk) {
				return;
			}
			// Capture both outcomes — a `{ success: false }` result and an outright
			// rejection (channel/handler error) — into appendError, so writeChain
			// never rejects and isStreaming() stays consistent after a failure.
			try {
				const buffer = await chunk.arrayBuffer();
				const result = await api.appendRecordingChunk(fileName, buffer);
				if (!result.success) {
					appendError = new Error(result.error ?? "Failed to write recording chunk to disk");
				}
			} catch (error) {
				appendError = error instanceof Error ? error : new Error(String(error));
			}
		});
	};

	// Require BOTH stream IPC methods before attempting to stream. If only
	// openRecordingStream exists (renderer/main version skew), streaming would
	// open but every append would silently no-op, saving an empty file — so in
	// that case fall through to in-memory buffering instead.
	const openPromise: Promise<{ success: boolean; error?: string }> =
		fileName !== undefined &&
		typeof api?.openRecordingStream === "function" &&
		typeof api?.appendRecordingChunk === "function"
			? api.openRecordingStream(fileName)
			: Promise.resolve({ success: false });

	void openPromise.then(
		(result) => {
			if (result.success) {
				streamOpened = true;
				mode = "streaming";
				for (const chunk of memoryChunks) {
					enqueueWrite(chunk);
				}
				memoryChunks.length = 0;
			} else {
				mode = "buffering";
			}
		},
		() => {
			// The IPC call itself rejected (channel or handler error). Treat it the
			// same as a failed open: keep buffering in memory so nothing is lost.
			mode = "buffering";
		},
	);

	const recordedBlobPromise = new Promise<Blob>((resolve, reject) => {
		recorder.ondataavailable = (event: BlobEvent) => {
			if (!event.data || event.data.size === 0) {
				return;
			}
			if (mode === "streaming") {
				enqueueWrite(event.data);
			} else {
				// "pending" (stream not open yet) or "buffering" (not streaming).
				memoryChunks.push(event.data);
			}
		};

		recorder.onerror = () => {
			reject(new Error("Recording failed"));
		};

		recorder.onstop = () => {
			resolve(finalizeBlob());
		};
	});

	async function finalizeBlob(): Promise<Blob> {
		// Wait for the open attempt to settle so its flush (or fallback switch) has
		// been applied, then for every queued write to land, so we never resolve
		// while chunks are still in flight to the about-to-close disk stream.
		await openPromise.catch(() => undefined);
		await writeChain;
		if (appendError) {
			throw appendError;
		}
		if (mode === "streaming") {
			return new Blob([], { type: mimeType });
		}
		return new Blob(memoryChunks, { type: mimeType });
	}

	async function discard(): Promise<void> {
		if (streamOpened && fileName && api?.closeRecordingStream) {
			await api.closeRecordingStream(fileName);
		}
	}

	recorder.start(RECORDER_TIMESLICE_MS);
	return {
		recorder,
		recordedBlobPromise,
		isStreaming: () => mode === "streaming" && !appendError,
		discard,
	};
}
