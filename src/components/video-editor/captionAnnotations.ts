import type { CaptionSegment } from "@/lib/captions";
import { type AnnotationRegion, DEFAULT_ANNOTATION_STYLE } from "./types";

const CAPTION_POSITION = { x: 10, y: 78 };
const CAPTION_SIZE = { width: 80, height: 14 };
const CAPTION_BACKGROUND = "rgba(0, 0, 0, 0.58)";

type CreateCaptionAnnotationsOptions = {
	existingIds: string[];
	startZIndex: number;
};

function nextCaptionId(existingIds: Set<string>, preferredId: string): string {
	if (!existingIds.has(preferredId)) {
		existingIds.add(preferredId);
		return preferredId;
	}

	let index = 1;
	while (existingIds.has(`caption-${index}`)) {
		index += 1;
	}

	const id = `caption-${index}`;
	existingIds.add(id);
	return id;
}

export function createCaptionAnnotations(
	segments: CaptionSegment[],
	options: CreateCaptionAnnotationsOptions,
): AnnotationRegion[] {
	const existingIds = new Set(options.existingIds);

	return segments.map((segment, index) => {
		const id = nextCaptionId(existingIds, segment.id);
		return {
			id,
			startMs: segment.startMs,
			endMs: segment.endMs,
			type: "text",
			content: segment.text,
			textContent: segment.text,
			position: { ...CAPTION_POSITION },
			size: { ...CAPTION_SIZE },
			style: {
				...DEFAULT_ANNOTATION_STYLE,
				color: "#ffffff",
				backgroundColor: CAPTION_BACKGROUND,
				fontWeight: "bold",
				textAlign: "center",
			},
			zIndex: options.startZIndex + index,
		};
	});
}
