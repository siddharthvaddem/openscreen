import { createWriteStream, type WriteStream } from "node:fs";
import { unlink } from "node:fs/promises";
import type { IpcMain } from "electron";

/**
 * Owns write streams for in-progress recordings, keyed by output file name.
 * MediaRecorder chunks are appended as they arrive so a long recording never
 * buffers the whole video in the renderer (#616 fix). File name is the key
 * because it's already exchanged across IPC and is unique per recording.
 */
export class RecordingStreamRegistry {
	private readonly streams = new Map<string, WriteStream>();

	/**
	 * Open a write stream, resolving only on the `open` event so a bad path or
	 * permission error rejects here instead of becoming a silent chunk drop later,
	 * letting the renderer's fallback take over.
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
		// Keep a lifetime listener so a late error logs instead of crashing the main
		// process with an unhandled 'error'. Per-write failures still surface in `append`.
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
	 * Flush and close the stream, keeping the file. Returns true if a stream was
	 * open (streamed to disk) or false if the caller still needs to write its buffer.
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
	 * Close the stream (if any) and delete the partial file, so a discarded or
	 * failed recording doesn't leak descriptors or orphan partial files on disk.
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
