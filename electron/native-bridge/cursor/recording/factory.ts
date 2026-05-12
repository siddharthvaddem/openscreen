import type { Rectangle } from "electron";
import type { CursorRecordingSession } from "./session";
import { TelemetryRecordingSession } from "./telemetryRecordingSession";
import { WindowsNativeRecordingSession } from "./windowsNativeRecordingSession";
import type { CursorOverlayAsset } from "./windowsNativeRecordingSession.types";

interface CreateCursorRecordingSessionOptions {
	getDisplayBounds: () => Rectangle | null;
	maxSamples: number;
	platform: NodeJS.Platform;
	sampleIntervalMs: number;
	sourceId?: string | null;
	startTimeMs?: number;
	onCursorTypeChange?: (
		cursorType: import("../../../../src/native/contracts").NativeCursorType | null,
		asset: CursorOverlayAsset | null,
		osCursorHidden: boolean,
	) => void;
}

export function createCursorRecordingSession(
	options: CreateCursorRecordingSessionOptions,
): CursorRecordingSession {
	if (options.platform === "win32") {
		return new WindowsNativeRecordingSession({
			getDisplayBounds: options.getDisplayBounds,
			maxSamples: options.maxSamples,
			sampleIntervalMs: options.sampleIntervalMs,
			sourceId: options.sourceId,
			startTimeMs: options.startTimeMs,
			onCursorTypeChange: options.onCursorTypeChange,
		});
	}

	// macOS / Linux: capture cursor positions via Electron's `screen` API on an
	// interval. No cursor sprites/assets and no clicks — just position telemetry,
	// which is what auto-zoom and other features consume.
	return new TelemetryRecordingSession({
		getDisplayBounds: options.getDisplayBounds,
		maxSamples: options.maxSamples,
		sampleIntervalMs: options.sampleIntervalMs,
		startTimeMs: options.startTimeMs,
	});
}
