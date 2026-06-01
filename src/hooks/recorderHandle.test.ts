import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRecorderHandle } from "./recorderHandle";

type ElectronAPI = Window["electronAPI"];

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
const decode = (buffer: ArrayBuffer) => new TextDecoder().decode(new Uint8Array(buffer));

/** Minimal MediaRecorder stand-in the tests can drive directly. */
class FakeMediaRecorder {
	ondataavailable: ((event: BlobEvent) => void) | null = null;
	onstop: (() => void) | null = null;
	onerror: (() => void) | null = null;
	state: "inactive" | "recording" = "inactive";

	start(): void {
		this.state = "recording";
	}

	stop(): void {
		this.state = "inactive";
		this.onstop?.();
	}

	emit(data: Blob): void {
		this.ondataavailable?.({ data } as BlobEvent);
	}
}

function stubElectronAPI(api: Partial<ElectronAPI>): void {
	window.electronAPI = api as unknown as ElectronAPI;
}

function driver(handle: { recorder: MediaRecorder }): FakeMediaRecorder {
	return handle.recorder as unknown as FakeMediaRecorder;
}

describe("createRecorderHandle", () => {
	beforeEach(() => {
		vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		window.electronAPI = undefined as unknown as ElectronAPI;
	});

	it("streams chunks to disk in arrival order and resolves an empty blob", async () => {
		const appended: string[] = [];
		const openRecordingStream = vi.fn(async () => ({ success: true }));
		const appendRecordingChunk = vi.fn(async (_fileName: string, buffer: ArrayBuffer) => {
			appended.push(decode(buffer));
			return { success: true };
		});
		stubElectronAPI({ openRecordingStream, appendRecordingChunk });

		const handle = createRecorderHandle({} as MediaStream, { mimeType: "video/webm" }, "rec.webm");
		const fake = driver(handle);

		fake.emit(new Blob(["a"])); // arrives before open resolves -> buffered
		await tick(); // open resolves -> buffered chunk flushes, mode becomes streaming
		fake.emit(new Blob(["b"]));
		fake.emit(new Blob(["c"]));
		fake.stop();

		const blob = await handle.recordedBlobPromise;
		expect(openRecordingStream).toHaveBeenCalledWith("rec.webm");
		expect(appended).toEqual(["a", "b", "c"]);
		expect(blob.size).toBe(0);
		expect(handle.isStreaming()).toBe(true);
	});

	it("falls back to a complete in-memory blob when the stream fails to open", async () => {
		const openRecordingStream = vi.fn(async () => ({ success: false, error: "nope" }));
		const appendRecordingChunk = vi.fn(async () => ({ success: true }));
		stubElectronAPI({ openRecordingStream, appendRecordingChunk });

		const handle = createRecorderHandle({} as MediaStream, { mimeType: "video/webm" }, "rec.webm");
		const fake = driver(handle);

		fake.emit(new Blob(["a"]));
		await tick(); // open resolves false -> buffering, keep everything in memory
		fake.emit(new Blob(["bc"]));
		fake.stop();

		const blob = await handle.recordedBlobPromise;
		expect(appendRecordingChunk).not.toHaveBeenCalled();
		expect(handle.isStreaming()).toBe(false);
		expect(blob.size).toBe(3);
		expect(decode(await blob.arrayBuffer())).toBe("abc");
	});

	it("falls back to in-memory buffering when the open IPC call rejects", async () => {
		const openRecordingStream = vi.fn(async () => {
			throw new Error("ipc channel closed");
		});
		stubElectronAPI({
			openRecordingStream,
			appendRecordingChunk: vi.fn(async () => ({ success: true })),
		});

		const handle = createRecorderHandle({} as MediaStream, { mimeType: "video/webm" }, "rec.webm");
		const fake = driver(handle);

		fake.emit(new Blob(["a"]));
		await tick(); // open rejects -> treated as a failed open, keep buffering
		fake.emit(new Blob(["b"]));
		fake.stop();

		const blob = await handle.recordedBlobPromise;
		expect(handle.isStreaming()).toBe(false);
		expect(blob.size).toBe(2);
		expect(decode(await blob.arrayBuffer())).toBe("ab");
	});

	it("waits for in-flight chunk writes before stop resolves (no truncation)", async () => {
		let releaseAppend: () => void = () => undefined;
		const appendGate = new Promise<void>((resolve) => {
			releaseAppend = resolve;
		});
		const appendRecordingChunk = vi.fn(async () => {
			await appendGate;
			return { success: true };
		});
		stubElectronAPI({
			openRecordingStream: vi.fn(async () => ({ success: true })),
			appendRecordingChunk,
		});

		const handle = createRecorderHandle({} as MediaStream, { mimeType: "video/webm" }, "rec.webm");
		const fake = driver(handle);

		await tick(); // open resolves
		fake.emit(new Blob(["a"])); // write blocks on the gate
		fake.stop();

		let resolved = false;
		void handle.recordedBlobPromise.then(() => {
			resolved = true;
		});
		await tick();
		expect(resolved).toBe(false); // must not resolve while the write is in flight

		releaseAppend();
		await handle.recordedBlobPromise;
		expect(resolved).toBe(true);
		expect(appendRecordingChunk).toHaveBeenCalledTimes(1);
	});

	it("rejects when a chunk fails to write mid-stream", async () => {
		stubElectronAPI({
			openRecordingStream: vi.fn(async () => ({ success: true })),
			appendRecordingChunk: vi.fn(async () => ({ success: false, error: "disk full" })),
			closeRecordingStream: vi.fn(async () => ({ success: true })),
		});

		const handle = createRecorderHandle({} as MediaStream, { mimeType: "video/webm" }, "rec.webm");
		const fake = driver(handle);

		await tick();
		fake.emit(new Blob(["a"]));
		fake.stop();

		await expect(handle.recordedBlobPromise).rejects.toThrow(/disk full/);
		expect(handle.isStreaming()).toBe(false);
	});

	it("treats a rejected append the same as a failed write", async () => {
		stubElectronAPI({
			openRecordingStream: vi.fn(async () => ({ success: true })),
			appendRecordingChunk: vi.fn(async () => {
				throw new Error("kernel said no");
			}),
			closeRecordingStream: vi.fn(async () => ({ success: true })),
		});

		const handle = createRecorderHandle({} as MediaStream, { mimeType: "video/webm" }, "rec.webm");
		const fake = driver(handle);

		await tick();
		fake.emit(new Blob(["a"]));
		fake.stop();

		await expect(handle.recordedBlobPromise).rejects.toThrow(/kernel said no/);
		expect(handle.isStreaming()).toBe(false);
	});

	it("buffers in memory and never opens a stream when no file name is given", async () => {
		const openRecordingStream = vi.fn(async () => ({ success: true }));
		stubElectronAPI({
			openRecordingStream,
			appendRecordingChunk: vi.fn(async () => ({ success: true })),
		});

		const handle = createRecorderHandle({} as MediaStream, { mimeType: "video/webm" });
		const fake = driver(handle);

		fake.emit(new Blob(["xy"]));
		await tick();
		fake.stop();

		const blob = await handle.recordedBlobPromise;
		expect(openRecordingStream).not.toHaveBeenCalled();
		expect(handle.isStreaming()).toBe(false);
		expect(blob.size).toBe(2);
	});

	it("buffers in memory when appendRecordingChunk is unavailable (version skew)", async () => {
		const openRecordingStream = vi.fn(async () => ({ success: true }));
		// appendRecordingChunk intentionally omitted to simulate renderer/main skew.
		stubElectronAPI({ openRecordingStream });

		const handle = createRecorderHandle({} as MediaStream, { mimeType: "video/webm" }, "rec.webm");
		const fake = driver(handle);

		fake.emit(new Blob(["a"]));
		await tick();
		fake.emit(new Blob(["b"]));
		fake.stop();

		const blob = await handle.recordedBlobPromise;
		// Never even attempts to open the stream when it can't append to it.
		expect(openRecordingStream).not.toHaveBeenCalled();
		expect(handle.isStreaming()).toBe(false);
		expect(blob.size).toBe(2);
	});

	it("discard closes the disk stream for a streamed recording", async () => {
		const closeRecordingStream = vi.fn(async () => ({ success: true }));
		stubElectronAPI({
			openRecordingStream: vi.fn(async () => ({ success: true })),
			appendRecordingChunk: vi.fn(async () => ({ success: true })),
			closeRecordingStream,
		});

		const handle = createRecorderHandle({} as MediaStream, { mimeType: "video/webm" }, "rec.webm");
		const fake = driver(handle);
		await tick();
		fake.emit(new Blob(["a"]));
		fake.stop();
		await handle.recordedBlobPromise;

		await handle.discard();
		expect(closeRecordingStream).toHaveBeenCalledWith("rec.webm");
	});

	it("discard is a no-op when the stream never opened", async () => {
		const closeRecordingStream = vi.fn(async () => ({ success: true }));
		stubElectronAPI({
			openRecordingStream: vi.fn(async () => ({ success: false })),
			appendRecordingChunk: vi.fn(async () => ({ success: true })),
			closeRecordingStream,
		});

		const handle = createRecorderHandle({} as MediaStream, { mimeType: "video/webm" }, "rec.webm");
		const fake = driver(handle);
		await tick();
		fake.stop();
		await handle.recordedBlobPromise;

		await handle.discard();
		expect(closeRecordingStream).not.toHaveBeenCalled();
	});
});
