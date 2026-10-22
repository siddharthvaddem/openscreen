import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RecordingAnnotationOverlay } from "./RecordingAnnotationOverlay";
import type { RecordingAnnotationTool } from "./recordingAnnotations";

type ElectronAPI = Window["electronAPI"];

describe("RecordingAnnotationOverlay", () => {
	let emitToolChange: (tool: RecordingAnnotationTool | null) => void;
	let setRecordingAnnotationTool: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		Element.prototype.setPointerCapture = vi.fn();
		Element.prototype.releasePointerCapture = vi.fn();
		setRecordingAnnotationTool = vi.fn(async () => ({ success: true }));
		window.electronAPI = {
			setRecordingAnnotationTool,
			onRecordingAnnotationToolChange: vi.fn((callback) => {
				emitToolChange = callback;
				return () => undefined;
			}),
			onRecordingAnnotationClear: vi.fn(() => () => undefined),
			onRecordingAnnotationUndo: vi.fn(() => () => undefined),
		} as unknown as ElectronAPI;
	});

	afterEach(() => {
		vi.restoreAllMocks();
		window.electronAPI = undefined as unknown as ElectronAPI;
	});

	it("disarms the active tool after committing a left-button annotation", () => {
		const { container } = render(<RecordingAnnotationOverlay />);
		const overlay = container.firstElementChild as HTMLElement;

		act(() => emitToolChange("arrow"));
		fireEvent.pointerDown(overlay, {
			button: 0,
			buttons: 1,
			clientX: 20,
			clientY: 30,
			pointerId: 1,
		});
		fireEvent.pointerMove(overlay, {
			button: 0,
			buttons: 1,
			clientX: 120,
			clientY: 130,
			pointerId: 1,
		});
		fireEvent.pointerUp(overlay, {
			button: 0,
			buttons: 0,
			clientX: 120,
			clientY: 130,
			pointerId: 1,
		});

		expect(setRecordingAnnotationTool).toHaveBeenCalledWith(null);
	});

	it("removes an existing annotation when the right button is dragged across it", () => {
		const { container } = render(<RecordingAnnotationOverlay />);
		const overlay = container.firstElementChild as HTMLElement;

		act(() => emitToolChange("pen"));
		fireEvent.pointerDown(overlay, {
			button: 0,
			buttons: 1,
			clientX: 10,
			clientY: 20,
			pointerId: 1,
		});
		fireEvent.pointerMove(overlay, {
			button: 0,
			buttons: 1,
			clientX: 120,
			clientY: 20,
			pointerId: 1,
		});
		fireEvent.pointerUp(overlay, {
			button: 0,
			buttons: 0,
			clientX: 120,
			clientY: 20,
			pointerId: 1,
		});

		expect(container.querySelectorAll("polyline")).toHaveLength(1);

		act(() => emitToolChange("pen"));
		fireEvent.pointerDown(overlay, {
			button: 2,
			buttons: 2,
			clientX: 60,
			clientY: 22,
			pointerId: 2,
		});
		fireEvent.pointerMove(overlay, {
			button: 2,
			buttons: 2,
			clientX: 80,
			clientY: 22,
			pointerId: 2,
		});
		fireEvent.pointerUp(overlay, { button: 2, buttons: 0, clientX: 80, clientY: 22, pointerId: 2 });

		expect(container.querySelectorAll("polyline")).toHaveLength(0);
	});
});
