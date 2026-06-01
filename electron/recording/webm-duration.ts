import fs from "node:fs/promises";
import { fixParsedWebmDuration } from "@fix-webm-duration/fix";
import { WebmFile } from "@fix-webm-duration/parser";

export type DurationPatchResult =
	| { patched: true }
	| { patched: false; reason: "no-section" | "already-valid" | "io-error" | "internal" };

/**
 * Patch the WebM Duration header on a finalized recording file.
 *
 * Browser MediaRecorder writes WebM with no Duration EBML element. With the
 * streaming-to-disk path the renderer never holds the blob, so the historical
 * `fixWebmDuration(blob, durationMs)` call can't run. Patching on disk after
 * `WriteStream.end()` produces an equivalent result: the editor's seek bar and
 * timeline read a real duration instead of `N/A`.
 *
 * Atomic by design: writes the patched bytes to `<filePath>.duration-patch.tmp`
 * and renames in place. If the process crashes mid-rewrite, the original file
 * survives intact, so the user never loses their recording to a partial write.
 *
 * Best-effort by intent: any failure (read, parse, write) logs and returns a
 * non-`patched` result rather than throwing. The file is still playable without
 * the patch (decoders walk frames sequentially); the only cost is that the
 * editor's seek bar and timeline break until it is patched.
 *
 * Memory: reads the whole file into a main-process Buffer, the same footprint
 * as the pre-streaming renderer path, just on the side without V8's heap cap.
 */
export async function patchWebmDurationOnDisk(
	filePath: string,
	durationMs: number,
): Promise<DurationPatchResult> {
	try {
		const fileBytes = await fs.readFile(filePath);
		const webm = new WebmFile(new Uint8Array(fileBytes));

		const patched = fixParsedWebmDuration(webm, durationMs, { logger: false });
		if (!patched) {
			// fixParsedWebmDuration returns false for: missing Segment, missing
			// Info, or a Duration that is already valid. The first two mean a
			// malformed (most likely truncated) file; the third is a no-op.
			const reason = inferUnpatchedReason(webm);
			if (reason === "no-section") {
				console.warn(
					`[webm-duration] no Segment/Info section in ${filePath}; file may be truncated`,
				);
			}
			return { patched: false, reason };
		}

		if (!webm.source) {
			console.error(`[webm-duration] patched but source missing for ${filePath}`);
			return { patched: false, reason: "internal" };
		}

		const tmpPath = `${filePath}.duration-patch.tmp`;
		const patchedBytes = Buffer.from(
			webm.source.buffer,
			webm.source.byteOffset,
			webm.source.byteLength,
		);
		try {
			await fs.writeFile(tmpPath, patchedBytes);
			await fs.rename(tmpPath, filePath);
			return { patched: true };
		} catch (writeError) {
			console.error(`[webm-duration] failed to write patched ${filePath}:`, writeError);
			// Best-effort cleanup of the temp file; if unlink also fails, leave it.
			// The original recording is untouched because the rename never ran.
			await fs.unlink(tmpPath).catch(() => undefined);
			return { patched: false, reason: "io-error" };
		}
	} catch (error) {
		console.error(`[webm-duration] failed to patch ${filePath}:`, error);
		return { patched: false, reason: "io-error" };
	}
}

/**
 * Distinguish "no Segment/Info section" (malformed/truncated file) from "Info
 * present but Duration already valid" (patch unnecessary).
 *
 * The IDs are the length-descriptor-stripped form that @fix-webm-duration/parser
 * uses as its lookup keys (Segment `0x8538067`, Info `0x549a966`), verified
 * against the parser's `src/lib/sections.js` — not the canonical 4-byte EBML
 * IDs (`0x18538067` / `0x1549A966`), which this parser's `getSectionById` would
 * never match.
 */
function inferUnpatchedReason(webm: WebmFile): "no-section" | "already-valid" {
	const segment = webm.getSectionById?.(0x8538067);
	if (!segment) return "no-section";
	const info = (
		segment as unknown as { getSectionById?: (id: number) => unknown }
	).getSectionById?.(0x549a966);
	return info ? "already-valid" : "no-section";
}
