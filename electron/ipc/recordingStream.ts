import { createWriteStream, type WriteStream } from "node:fs";
import { unlink } from "node:fs/promises";
import type { IpcMain } from "electron";

/**
 * Owns the lifecycle of on-disk write streams for in-progress recordings, keyed
 * by the recording's output file name. Browser MediaRecorder chunks are appended
 * here as they arrive so a long recording never buffers the whole video in the
 * renderer (the #616 fix).
 *
 * The file name is the key because it is the one value the renderer and main
 * process already exchange and it is globally unique per recording, so there is
 * no derived/offset key to keep in sync across the IPC boundary.
 */
export class RecordingStreamRegistry {
	private readonly streams = new Map<string, WriteStream>();

	/**
	 * Open a write stream and resolve only once the OS confirms it is writable.
	 * Resolving on the `open` event (rather than on `createWriteStream` returning)
	 * means a bad path or permission error rejects here instead of surfacing as a
	 * silent chunk drop later, so the renderer's fallback can take over.
	 */
	async open(fileName: string, filePath: string): Promise<void> {
		await this.endStream(fileName);

		const ws = createWriteStream(filePath, { flags: "w" });
		await new Promise<void>((resolve, reject) => {
			const onError = (error: Error) => reject(error);
			ws.once("error", onError);
			ws.once("open", () => {
				ws.removeListener("error", onError);
				resolve();
			});
		});
		// Keep a listener for the stream's lifetime so a late error logs rather
		// than crashing the main process with an unhandled 'error' event. Per-write
		// failures still surface through the `append` callback below.
		ws.on("error", (error) => {
			console.error(`[recording-stream] ${fileName}:`, error);
		});

		this.streams.set(fileName, ws);
	}

	has(fileName: string): boolean {
		return this.streams.has(fileName);
	}

	/** Append a chunk; rejects if no stream is open or the write fails. */
	async append(fileName: string, chunk: Buffer): Promise<void> {
		const ws = this.streams.get(fileName);
		if (!ws) {
			throw new Error(`No active recording stream for ${fileName}`);
		}
		await new Promise<void>((resolve, reject) => {
			ws.write(chunk, (error) => (error ? reject(error) : resolve()));
		});
	}

	/**
	 * Flush and close the stream, keeping the file. Returns whether a stream was
	 * open — i.e. whether the recording was streamed to disk (true) or needs its
	 * in-memory buffer written by the caller (false).
	 */
	async finalize(fileName: string): Promise<boolean> {
		const ws = this.streams.get(fileName);
		if (!ws) {
			return false;
		}
		this.streams.delete(fileName);
		await new Promise<void>((resolve, reject) => {
			ws.end((error?: Error | null) => (error ? reject(error) : resolve()));
		});
		return true;
	}

	/**
	 * Close the stream (if any) and delete the partial file. Used when a streamed
	 * recording is discarded or fails before a successful save, so cancelled runs
	 * don't leak file descriptors or orphan partial recordings on disk.
	 */
	async discard(fileName: string, filePath: string): Promise<void> {
		await this.endStream(fileName);
		await unlink(filePath).catch(() => undefined);
	}

	private async endStream(fileName: string): Promise<void> {
		const ws = this.streams.get(fileName);
		if (!ws) {
			return;
		}
		this.streams.delete(fileName);
		await new Promise<void>((resolve) => ws.end(() => resolve()));
	}
}

/**
 * Register the streaming IPC handlers. Thin wrappers that translate the
 * registry's throw-on-failure contract into the `{ success, error }` shape the
 * renderer expects.
 */
export function registerRecordingStreamHandlers(
	ipcMain: IpcMain,
	registry: RecordingStreamRegistry,
	resolveRecordingOutputPath: (fileName: string) => string,
): void {
	ipcMain.handle(
		"open-recording-stream",
		async (_, fileName: string): Promise<{ success: boolean; error?: string }> => {
			try {
				await registry.open(fileName, resolveRecordingOutputPath(fileName));
				return { success: true };
			} catch (error) {
				return { success: false, error: String(error) };
			}
		},
	);

	ipcMain.handle(
		"append-recording-chunk",
		async (
			_,
			fileName: string,
			chunk: ArrayBuffer,
		): Promise<{ success: boolean; error?: string }> => {
			try {
				await registry.append(fileName, Buffer.from(chunk));
				return { success: true };
			} catch (error) {
				return { success: false, error: String(error) };
			}
		},
	);

	ipcMain.handle(
		"close-recording-stream",
		async (_, fileName: string): Promise<{ success: boolean; error?: string }> => {
			try {
				await registry.discard(fileName, resolveRecordingOutputPath(fileName));
				return { success: true };
			} catch (error) {
				return { success: false, error: String(error) };
			}
		},
	);
}
