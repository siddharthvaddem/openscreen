import fs from "node:fs/promises";
import { fixParsedWebmDuration } from "@fix-webm-duration/fix";
import { WebmFile } from "@fix-webm-duration/parser";

export type DurationPatchResult =
	| { patched: true }
	| { patched: false; reason: "no-section" | "already-valid" | "io-error" | "internal" };

/**
 * Patch the WebM Duration header on a finalized recording file.
 *
 * MediaRecorder writes WebM with no Duration EBML element, and the streaming-to-disk
 * path never holds the blob so the old `fixWebmDuration(blob, durationMs)` can't run.
 * Patching on disk after `WriteStream.end()` gives the editor a real duration instead of `N/A`.
 *
 * Atomic: writes to `<filePath>.duration-patch.tmp` and renames in place, so a mid-rewrite
 * crash leaves the original intact. Best-effort: any read/parse/write failure logs and returns
 * a non-`patched` result rather than throwing; the file still plays without the patch (decoders
 * walk frames sequentially), only the seek bar and timeline break.
 *
 * Reads the whole file into a main-process Buffer, off the renderer so it dodges V8's heap cap.
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
			// false means missing Segment, missing Info, or an already-valid Duration.
			// The first two mean a malformed (likely truncated) file; the third is a no-op.
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
			// Clean up the temp file; the original is untouched since the rename never ran.
			await fs.unlink(tmpPath).catch(() => undefined);
			return { patched: false, reason: "io-error" };
		}
	} catch (error) {
		console.error(`[webm-duration] failed to patch ${filePath}:`, error);
		return { patched: false, reason: "io-error" };
	}
}

/**
 * Distinguish "no Segment/Info section" (malformed/truncated file) from "Info present
 * but Duration already valid" (patch unnecessary).
 *
 * The IDs are the length-descriptor-stripped form @fix-webm-duration/parser uses as lookup
 * keys (Segment `0x8538067`, Info `0x549a966`), per the parser's `src/lib/sections.js`, not
 * the canonical 4-byte EBML IDs (`0x18538067` / `0x1549A966`) that `getSectionById` never matches.
 */
function inferUnpatchedReason(webm: WebmFile): "no-section" | "already-valid" {
	const segment = webm.getSectionById?.(0x8538067);
	if (!segment) return "no-section";
	const info = (
		segment as unknown as { getSectionById?: (id: number) => unknown }
	).getSectionById?.(0x549a966);
	return info ? "already-valid" : "no-section";
}
