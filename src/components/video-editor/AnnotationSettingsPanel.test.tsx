import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/contexts/I18nContext";
import { AnnotationSettingsPanel } from "./AnnotationSettingsPanel";
import type { AnnotationRegion } from "./types";

function wrapper({ children }: { children: ReactNode }) {
	return <I18nProvider>{children}</I18nProvider>;
}

function createImageAnnotation(): AnnotationRegion {
	return {
		id: "annotation-1",
		startMs: 0,
		endMs: 1000,
		type: "image",
		content: "",
		position: { x: 50, y: 50 },
		size: { width: 30, height: 20 },
		style: {
			color: "#ffffff",
			backgroundColor: "transparent",
			fontSize: 32,
			fontFamily: "Inter",
			fontWeight: "bold",
			fontStyle: "normal",
			textDecoration: "none",
			textAlign: "center",
		},
		zIndex: 1,
	};
}

describe("AnnotationSettingsPanel sticker presets", () => {
	it("writes an SVG data URL when a built-in sticker is selected", async () => {
		const user = userEvent.setup();
		const onContentChange = vi.fn();

		render(
			<AnnotationSettingsPanel
				annotation={createImageAnnotation()}
				onContentChange={onContentChange}
				onTypeChange={vi.fn()}
				onStyleChange={vi.fn()}
				onDelete={vi.fn()}
			/>,
			{ wrapper },
		);

		await user.click(screen.getByRole("button", { name: /check sticker/i }));

		expect(onContentChange).toHaveBeenCalledTimes(1);
		const stickerDataUrl = onContentChange.mock.calls[0]?.[0] as string;
		expect(stickerDataUrl).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
		expect(decodeURIComponent(stickerDataUrl)).toContain('data-sticker-id="check"');
	});
});
