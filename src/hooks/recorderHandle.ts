const RECORDER_TIMESLICE_MS = 1000;

export type RecorderHandle = {
	recorder: MediaRecorder;
	/**
	 * Resolves once the recording drains. Empty blob when streamed (bytes already on
	 * disk), full WebM when in-memory. Rejects on a mid-stream write failure so a
	 * truncated recording surfaces as an error instead of a silent partial save.
	 */
	recordedBlobPromise: Promise<Blob>;
	/**
	 * Whether bytes went to disk via streaming. Computed at finalize, not construction,
	 * so a stream that fails to open reports as not-streamed and uses its memory fallback.
	 */
	isStreaming: () => boolean;
	/**
	 * Close the disk stream (if any) and delete its partial file. Called when a recording
	 * is discarded or fails before save, so cancelled runs don't leak. No-op in-memory.
	 */
	discard: () => Promise<void>;
};

/**
 * Wrap a MediaRecorder, optionally streaming its chunks to disk.
 *
 * With `fileName`, chunks stream to disk through the main process so a long recording
 * never buffers the whole video in the renderer (#616). Chunks held in memory until the
 * stream confirms open; if the open fails, that buffer is the complete fallback. Webcam
 * sidecars omit `fileName` and buffer in memory, since finalize reads the blob directly.
 */
export function createRecorderHandle(
	stream: MediaStream,
	options: MediaRecorderOptions,
	fileName?: string,
): RecorderHandle {
	const recorder = new MediaRecorder(stream, options);
	const mimeType = options.mimeType || "video/webm";
	const api = window.electronAPI;

	// Chunks held in memory before the stream opens, or for the whole recording when not
	// streaming. On open they flush to disk and drop; on open failure they're the fallback.
	const memoryChunks: Blob[] = [];
	let mode: "pending" | "streaming" | "buffering" = fileName ? "pending" : "buffering";
	let streamOpened = false;
	let appendError: Error | null = null;

	// Serialize writes so chunks land in arrival order and stop can await every in-flight
	// write before the stream closes (a late chunk after close truncates the recording).
	let writeChain: Promise<void> = Promise.resolve();
	const enqueueWrite = (chunk: Blob) => {
		writeChain = writeChain.then(async () => {
			if (appendError || !fileName || !api?.appendRecordingChunk) {
				return;
			}
			// Capture both a `{ success: false }` result and an outright rejection into
			// appendError, so writeChain never rejects and isStreaming() stays consistent.
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

	// Require both stream IPC methods before streaming. With only openRecordingStream
	// (renderer/main version skew) the open succeeds but appends no-op, saving an empty
	// file, so fall through to in-memory buffering instead.
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
			// IPC call rejected. Treat like a failed open: keep buffering in memory.
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
				// pending (stream not open yet) or buffering (not streaming).
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
		// Wait for the open to settle (flush or fallback applied) then for every queued
		// write to land, so we don't resolve while chunks are still in flight to the
		// about-to-close stream.
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
