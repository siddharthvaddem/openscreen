export type RecordingAnnotationTool =
	| "pen"
	| "arrow"
	| "rectangle"
	| "ellipse"
	| "highlight"
	| "text";

export type RecordingAnnotationPoint = {
	x: number;
	y: number;
};

export type RecordingAnnotationElement = {
	id: string;
	tool: RecordingAnnotationTool;
	points: RecordingAnnotationPoint[];
	stroke: string;
	strokeWidth: number;
	fill: string;
	text?: string;
	fontSize?: number;
};

const ERASER_HIT_PADDING = 10;

type CreateRecordingAnnotationElementInput = {
	id: string;
	tool: RecordingAnnotationTool;
	points: RecordingAnnotationPoint[];
	text?: string;
};

export const RECORDING_ANNOTATION_TOOLS: readonly RecordingAnnotationTool[] = [
	"pen",
	"arrow",
	"rectangle",
	"ellipse",
	"highlight",
	"text",
] as const;

export function isRecordingAnnotationTool(value: unknown): value is RecordingAnnotationTool {
	return (
		typeof value === "string" &&
		RECORDING_ANNOTATION_TOOLS.includes(value as RecordingAnnotationTool)
	);
}

export function createRecordingAnnotationElement({
	id,
	tool,
	points,
	text,
}: CreateRecordingAnnotationElementInput): RecordingAnnotationElement {
	const normalizedPoints = points.map((point) => ({
		x: Number.isFinite(point.x) ? point.x : 0,
		y: Number.isFinite(point.y) ? point.y : 0,
	}));

	switch (tool) {
		case "arrow":
			return {
				id,
				tool,
				points: normalizedPoints,
				stroke: "#ff3b30",
				strokeWidth: 7,
				fill: "transparent",
			};
		case "rectangle":
		case "ellipse":
			return {
				id,
				tool,
				points: normalizedPoints,
				stroke: "#ff3b30",
				strokeWidth: 5,
				fill: "transparent",
			};
		case "highlight":
			return {
				id,
				tool,
				points: normalizedPoints,
				stroke: "rgba(255, 214, 10, 0.48)",
				strokeWidth: 28,
				fill: "transparent",
			};
		case "text":
			return {
				id,
				tool,
				points: normalizedPoints,
				stroke: "#ffffff",
				strokeWidth: 0,
				fill: "#ffffff",
				text: text ?? "",
				fontSize: 32,
			};
		case "pen":
			return {
				id,
				tool,
				points: normalizedPoints,
				stroke: "#ff3b30",
				strokeWidth: 5,
				fill: "transparent",
			};
	}
}

function squaredDistance(a: RecordingAnnotationPoint, b: RecordingAnnotationPoint) {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	return dx * dx + dy * dy;
}

function distanceToSegment(
	point: RecordingAnnotationPoint,
	start: RecordingAnnotationPoint,
	end: RecordingAnnotationPoint,
) {
	const segmentLengthSquared = squaredDistance(start, end);
	if (segmentLengthSquared === 0) {
		return Math.sqrt(squaredDistance(point, start));
	}

	const t = Math.max(
		0,
		Math.min(
			1,
			((point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y)) /
				segmentLengthSquared,
		),
	);
	const projection = {
		x: start.x + t * (end.x - start.x),
		y: start.y + t * (end.y - start.y),
	};

	return Math.sqrt(squaredDistance(point, projection));
}

function getPointBounds(points: RecordingAnnotationPoint[]) {
	const [firstPoint] = points;
	if (!firstPoint) {
		return null;
	}

	return points.reduce(
		(bounds, point) => ({
			minX: Math.min(bounds.minX, point.x),
			minY: Math.min(bounds.minY, point.y),
			maxX: Math.max(bounds.maxX, point.x),
			maxY: Math.max(bounds.maxY, point.y),
		}),
		{
			minX: firstPoint.x,
			minY: firstPoint.y,
			maxX: firstPoint.x,
			maxY: firstPoint.y,
		},
	);
}

function isPointInsideBounds(
	point: RecordingAnnotationPoint,
	bounds: { minX: number; minY: number; maxX: number; maxY: number },
	padding: number,
) {
	return (
		point.x >= bounds.minX - padding &&
		point.x <= bounds.maxX + padding &&
		point.y >= bounds.minY - padding &&
		point.y <= bounds.maxY + padding
	);
}

function isPointNearPolyline(element: RecordingAnnotationElement, point: RecordingAnnotationPoint) {
	const threshold = element.strokeWidth / 2 + ERASER_HIT_PADDING;
	if (element.points.length === 1) {
		return Math.sqrt(squaredDistance(point, element.points[0])) <= threshold;
	}

	for (let index = 1; index < element.points.length; index += 1) {
		if (distanceToSegment(point, element.points[index - 1], element.points[index]) <= threshold) {
			return true;
		}
	}

	return false;
}

export function isRecordingAnnotationElementHit(
	element: RecordingAnnotationElement,
	point: RecordingAnnotationPoint,
) {
	if (element.tool === "pen" || element.tool === "highlight" || element.tool === "arrow") {
		return isPointNearPolyline(element, point);
	}

	if (element.tool === "rectangle" || element.tool === "ellipse") {
		const bounds = getPointBounds(element.points);
		return bounds
			? isPointInsideBounds(point, bounds, element.strokeWidth + ERASER_HIT_PADDING)
			: false;
	}

	const origin = element.points[0];
	if (!origin) {
		return false;
	}

	const fontSize = element.fontSize ?? 32;
	const textLength = Math.max(1, element.text?.length ?? 1);
	return isPointInsideBounds(
		point,
		{
			minX: origin.x,
			minY: origin.y - fontSize,
			maxX: origin.x + textLength * fontSize * 0.62,
			maxY: origin.y + fontSize * 0.3,
		},
		ERASER_HIT_PADDING,
	);
}

export function removeRecordingAnnotationsAtPoint(
	elements: RecordingAnnotationElement[],
	point: RecordingAnnotationPoint,
) {
	return elements.filter((element) => !isRecordingAnnotationElementHit(element, point));
}
