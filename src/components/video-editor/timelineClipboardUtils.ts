import type { AnnotationPosition, AnnotationRegion, AnnotationSize } from "./types";

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

export function cloneAnnotationRegion(region: AnnotationRegion): AnnotationRegion {
	return {
		...region,
		position: { ...region.position },
		size: { ...region.size },
		style: { ...region.style },
		figureData: region.figureData ? { ...region.figureData } : undefined,
		blurData: region.blurData
			? {
					...region.blurData,
					freehandPoints: region.blurData.freehandPoints?.map((point) => ({ ...point })),
				}
			: undefined,
	};
}

export function spansOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
	return startA < endB && endA > startB;
}

export function getPastedAnnotationPosition(
	position: AnnotationPosition,
	size: AnnotationSize,
): AnnotationPosition {
	const maxX = Math.max(0, 100 - size.width);
	const maxY = Math.max(0, 100 - size.height);

	return {
		x: clamp(position.x, 0, maxX),
		y: clamp(position.y, 0, maxY),
	};
}
