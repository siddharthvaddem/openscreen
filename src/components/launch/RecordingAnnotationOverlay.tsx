import { useEffect, useRef, useState } from "react";
import {
	createRecordingAnnotationElement,
	isRecordingAnnotationTool,
	type RecordingAnnotationElement,
	type RecordingAnnotationPoint,
	type RecordingAnnotationTool,
	removeRecordingAnnotationsAtPoint,
} from "./recordingAnnotations";

type TextDraft = {
	x: number;
	y: number;
	value: string;
};

function pointsToSvg(points: RecordingAnnotationPoint[]) {
	return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function getDragPoints(element: RecordingAnnotationElement) {
	const first = element.points[0] ?? { x: 0, y: 0 };
	const last = element.points[element.points.length - 1] ?? first;
	return { first, last };
}

function getRectGeometry(element: RecordingAnnotationElement) {
	const { first, last } = getDragPoints(element);
	return {
		x: Math.min(first.x, last.x),
		y: Math.min(first.y, last.y),
		width: Math.abs(last.x - first.x),
		height: Math.abs(last.y - first.y),
	};
}

function renderElement(element: RecordingAnnotationElement, isDraft = false) {
	const commonStrokeProps = {
		stroke: element.stroke,
		strokeWidth: element.strokeWidth,
		strokeLinecap: "round" as const,
		strokeLinejoin: "round" as const,
		vectorEffect: "non-scaling-stroke" as const,
		filter: element.tool === "highlight" ? undefined : "url(#annotation-shadow)",
		opacity: isDraft ? 0.82 : 1,
	};

	if (element.tool === "pen" || element.tool === "highlight") {
		return (
			<polyline
				key={element.id}
				points={pointsToSvg(element.points)}
				fill="none"
				{...commonStrokeProps}
			/>
		);
	}

	if (element.tool === "arrow") {
		const { first, last } = getDragPoints(element);
		return (
			<line
				key={element.id}
				x1={first.x}
				y1={first.y}
				x2={last.x}
				y2={last.y}
				fill="none"
				markerEnd="url(#recording-annotation-arrowhead)"
				{...commonStrokeProps}
			/>
		);
	}

	if (element.tool === "rectangle") {
		const rect = getRectGeometry(element);
		return (
			<rect
				key={element.id}
				x={rect.x}
				y={rect.y}
				width={rect.width}
				height={rect.height}
				rx={10}
				fill={element.fill}
				{...commonStrokeProps}
			/>
		);
	}

	if (element.tool === "ellipse") {
		const rect = getRectGeometry(element);
		return (
			<ellipse
				key={element.id}
				cx={rect.x + rect.width / 2}
				cy={rect.y + rect.height / 2}
				rx={rect.width / 2}
				ry={rect.height / 2}
				fill={element.fill}
				{...commonStrokeProps}
			/>
		);
	}

	const point = element.points[0] ?? { x: 0, y: 0 };
	return (
		<text
			key={element.id}
			x={point.x}
			y={point.y}
			fill={element.fill}
			fontSize={element.fontSize}
			fontWeight={800}
			paintOrder="stroke"
			stroke="rgba(0, 0, 0, 0.62)"
			strokeWidth={5}
			style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
		>
			{element.text}
		</text>
	);
}

export function RecordingAnnotationOverlay() {
	const [tool, setTool] = useState<RecordingAnnotationTool | null>(null);
	const [elements, setElements] = useState<RecordingAnnotationElement[]>([]);
	const [draftElement, setDraftElement] = useState<RecordingAnnotationElement | null>(null);
	const [textDraft, setTextDraft] = useState<TextDraft | null>(null);
	const inputRef = useRef<HTMLInputElement | null>(null);
	const isDrawingRef = useRef(false);
	const isErasingRef = useRef(false);
	const currentToolRef = useRef<RecordingAnnotationTool | null>(null);

	useEffect(() => {
		currentToolRef.current = tool;
	}, [tool]);

	useEffect(() => {
		if (!textDraft) {
			return;
		}
		inputRef.current?.focus();
		inputRef.current?.select();
	}, [textDraft]);

	useEffect(() => {
		const cleanupTool = window.electronAPI?.onRecordingAnnotationToolChange?.((nextTool) => {
			setTool(isRecordingAnnotationTool(nextTool) ? nextTool : null);
			setDraftElement(null);
			setTextDraft(null);
			isDrawingRef.current = false;
			isErasingRef.current = false;
		});
		const cleanupClear = window.electronAPI?.onRecordingAnnotationClear?.(() => {
			setElements([]);
			setDraftElement(null);
			setTextDraft(null);
			isDrawingRef.current = false;
			isErasingRef.current = false;
		});
		const cleanupUndo = window.electronAPI?.onRecordingAnnotationUndo?.(() => {
			setElements((current) => current.slice(0, -1));
		});

		return () => {
			cleanupTool?.();
			cleanupClear?.();
			cleanupUndo?.();
		};
	}, []);

	const makePoint = (event: React.PointerEvent<HTMLDivElement>): RecordingAnnotationPoint => ({
		x: event.clientX,
		y: event.clientY,
	});

	const disarmActiveTool = () => {
		currentToolRef.current = null;
		setTool(null);
		window.electronAPI?.setRecordingAnnotationTool?.(null).catch((error) => {
			console.warn("Failed to disarm recording annotation tool:", error);
		});
	};

	const eraseAtPoint = (point: RecordingAnnotationPoint) => {
		setElements((items) => removeRecordingAnnotationsAtPoint(items, point));
	};

	const commitTextDraft = (options: { disarm?: boolean } = {}) => {
		const shouldDisarm = options.disarm ?? true;
		if (!textDraft || !textDraft.value.trim()) {
			setTextDraft(null);
			if (shouldDisarm) {
				disarmActiveTool();
			}
			return;
		}

		const committedText = textDraft;
		setElements((items) => [
			...items,
			createRecordingAnnotationElement({
				id: `recording-annotation-${Date.now()}-${items.length}`,
				tool: "text",
				points: [{ x: committedText.x, y: committedText.y }],
				text: committedText.value.trim(),
			}),
		]);
		setTextDraft(null);
		if (shouldDisarm) {
			disarmActiveTool();
		}
	};

	const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
		const activeTool = currentToolRef.current;
		if (!activeTool) {
			return;
		}

		event.preventDefault();
		event.currentTarget.setPointerCapture(event.pointerId);
		const point = makePoint(event);

		if (event.button === 2 || (event.buttons & 2) === 2) {
			commitTextDraft({ disarm: false });
			isDrawingRef.current = false;
			isErasingRef.current = true;
			setDraftElement(null);
			eraseAtPoint(point);
			return;
		}

		if (event.button !== 0) {
			return;
		}

		if (activeTool === "text") {
			commitTextDraft({ disarm: false });
			setTextDraft({ x: point.x, y: point.y, value: "" });
			return;
		}

		isDrawingRef.current = true;
		isErasingRef.current = false;
		setDraftElement(
			createRecordingAnnotationElement({
				id: `recording-annotation-draft-${Date.now()}`,
				tool: activeTool,
				points: [point],
			}),
		);
	};

	const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
		if (isErasingRef.current) {
			event.preventDefault();
			eraseAtPoint(makePoint(event));
			return;
		}

		const activeTool = currentToolRef.current;
		if (!activeTool || !isDrawingRef.current) {
			return;
		}

		const point = makePoint(event);
		setDraftElement((current) => {
			if (!current) {
				return current;
			}

			const points =
				activeTool === "pen" || activeTool === "highlight"
					? [...current.points, point]
					: [current.points[0] ?? point, point];

			return createRecordingAnnotationElement({
				id: current.id,
				tool: activeTool,
				points,
			});
		});
	};

	const commitDraftElement = () => {
		if (isErasingRef.current) {
			isErasingRef.current = false;
			return;
		}

		if (!isDrawingRef.current) {
			return;
		}

		isDrawingRef.current = false;
		setDraftElement((current) => {
			if (!current || current.points.length === 0) {
				return null;
			}

			setElements((items) => [
				...items,
				{
					...current,
					id: `recording-annotation-${Date.now()}-${items.length}`,
				},
			]);
			return null;
		});
		disarmActiveTool();
	};

	return (
		<div
			className={`fixed inset-0 select-none ${tool ? "cursor-crosshair" : "cursor-default"}`}
			style={{
				background: "transparent",
				pointerEvents: "auto",
				touchAction: "none",
			}}
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={commitDraftElement}
			onPointerCancel={commitDraftElement}
			onContextMenu={(event) => event.preventDefault()}
		>
			<svg className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
				<defs>
					<filter id="annotation-shadow" x="-20%" y="-20%" width="140%" height="140%">
						<feDropShadow dx="0" dy="2" stdDeviation="2.5" floodOpacity="0.36" />
					</filter>
					<marker
						id="recording-annotation-arrowhead"
						viewBox="0 0 12 12"
						refX="10"
						refY="6"
						markerWidth="4.4"
						markerHeight="4.4"
						orient="auto-start-reverse"
					>
						<path d="M 0 0 L 12 6 L 0 12 z" fill="#ff3b30" />
					</marker>
				</defs>
				{elements.map((element) => renderElement(element))}
				{draftElement ? renderElement(draftElement, true) : null}
			</svg>
			{textDraft ? (
				<input
					ref={inputRef}
					value={textDraft.value}
					onChange={(event) =>
						setTextDraft((current) =>
							current ? { ...current, value: event.target.value } : current,
						)
					}
					onPointerDown={(event) => event.stopPropagation()}
					onBlur={() => commitTextDraft()}
					onKeyDown={(event) => {
						if (event.key === "Enter") {
							event.preventDefault();
							commitTextDraft();
						}
						if (event.key === "Escape") {
							event.preventDefault();
							setTextDraft(null);
							disarmActiveTool();
						}
					}}
					className="absolute min-w-[180px] rounded-lg border border-white/25 bg-black/65 px-3 py-1.5 text-[30px] font-extrabold text-white outline-none shadow-[0_10px_28px_rgba(0,0,0,0.38)] backdrop-blur"
					style={{
						left: textDraft.x,
						top: textDraft.y - 34,
						textShadow: "0 2px 8px rgba(0,0,0,0.65)",
					}}
				/>
			) : null}
		</div>
	);
}
