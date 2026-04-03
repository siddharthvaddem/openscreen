import { useRef } from "react";
import { Rnd } from "react-rnd";
import { cn } from "@/lib/utils";
import { getArrowComponent } from "./ArrowSvgs";
import type { AnnotationRegion } from "./types";

interface AnnotationOverlayProps {
	annotation: AnnotationRegion;
	isSelected: boolean;
	containerWidth: number;
	containerHeight: number;
	onPositionChange: (id: string, position: { x: number; y: number }) => void;
	onSizeChange: (id: string, size: { width: number; height: number }) => void;
	onClick: (id: string) => void;
	zIndex: number;
	isSelectedBoost: boolean; // Boost z-index when selected for easy editing
	currentTimeMs?: number;
}

export function AnnotationOverlay({
	annotation,
	isSelected,
	containerWidth,
	containerHeight,
	onPositionChange,
	onSizeChange,
	onClick,
	zIndex,
	isSelectedBoost,
	currentTimeMs = 0,
}: AnnotationOverlayProps) {
	const x = (annotation.position.x / 100) * containerWidth;
	const y = (annotation.position.y / 100) * containerHeight;
	const width = (annotation.size.width / 100) * containerWidth;
	const height = (annotation.size.height / 100) * containerHeight;

	const isDraggingRef = useRef(false);

	const renderArrow = () => {
		const direction = annotation.figureData?.arrowDirection || "right";
		const color = annotation.figureData?.color || "#34B27B";
		const strokeWidth = annotation.figureData?.strokeWidth || 4;

		const ArrowComponent = getArrowComponent(direction);
		return <ArrowComponent color={color} strokeWidth={strokeWidth} />;
	};

	const renderCaption = () => {
		const data = annotation.captionData;
		if (!data) return null;

		const timeIntoAnnotation = currentTimeMs - annotation.startMs;
		const totalDuration = annotation.endMs - annotation.startMs;
		const fadeOutStart = Math.max(0, totalDuration - 500);
		const globalOpacity =
			timeIntoAnnotation >= fadeOutStart
				? Math.max(0, 1 - (timeIntoAnnotation - fadeOutStart) / 500)
				: 1;

		const renderWords = (text: string, startWordIndex: number, color: string) => {
			const words = text.split(" ").filter((w) => w.length > 0);
			return words.map((word, i) => {
				const wordIndex = startWordIndex + i;
				const wordStartMs = wordIndex * data.wordDelay;
				const progress = Math.min(
					1,
					Math.max(0, (timeIntoAnnotation - wordStartMs) / data.animationDuration),
				);
				return (
					<span
						key={`${word}-${i}`}
						style={{
							display: "inline-block",
							opacity: progress,
							transform: `translateY(${(1 - progress) * 14}px)`,
							color,
							marginRight: "0.25em",
							transition: "none",
							textShadow:
								color === "#FFFFFF" || color === "#ffffff"
									? "2px 2px 4px rgba(0,0,0,0.9), -1px -1px 0 rgba(0,0,0,0.5)"
									: `0 0 30px ${color}88, 2px 2px 4px rgba(0,0,0,0.9)`,
						}}
					>
						{word}
					</span>
				);
			});
		};

		const gradientMap: Record<string, string> = {
			bottom: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)",
			top: "linear-gradient(to bottom, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)",
			left: "linear-gradient(to right, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)",
			right: "linear-gradient(to left, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)",
			none: "none",
		};

		const alignMap: Record<string, string> = {
			bottom: "center",
			top: "center",
			left: "flex-start",
			right: "flex-end",
			none: "center",
		};

		const justifyMap: Record<string, string> = {
			bottom: "flex-end",
			top: "flex-start",
			left: "center",
			right: "center",
			none: "center",
		};

		const primaryWords = data.primaryText.split(" ").filter((w) => w.length > 0);
		const fadeInOpacity = Math.min(1, Math.max(0, timeIntoAnnotation / 400));
		const backgroundOpacity = fadeInOpacity * globalOpacity;

		return (
			<div className="w-full h-full relative">
				{/* Gradient layer — fades in independently over 400 ms, extends 4 px below to cover edge */}
				<div
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						right: 0,
						bottom: -4,
						background: gradientMap[data.gradientDirection],
						opacity: backgroundOpacity,
						pointerEvents: "none",
					}}
				/>

				{/* Content */}
				<div
					className="absolute inset-0 flex flex-col"
					style={{
						justifyContent: justifyMap[data.gradientDirection],
						alignItems: alignMap[data.gradientDirection],
						padding: "20px 24px",
						gap: "4px",
						opacity: globalOpacity,
					}}
				>
					{data.imageUrl && (
						<img
							src={data.imageUrl}
							alt=""
							draggable={false}
							style={{
								maxHeight: "35%",
								maxWidth: "60%",
								objectFit: "contain",
								marginBottom: "6px",
								alignSelf:
									data.gradientDirection === "left"
										? "flex-start"
										: data.gradientDirection === "right"
											? "flex-end"
											: "center",
							}}
						/>
					)}
					{data.primaryText && (
						<div
							style={{
								fontFamily: data.fontFamily,
								fontSize: `${data.primaryFontSize}px`,
								fontWeight: "bold",
								lineHeight: 1.1,
								letterSpacing: "0.02em",
								textTransform: "uppercase",
							}}
						>
							{renderWords(data.primaryText, 0, data.primaryColor)}
						</div>
					)}
					{data.secondaryText && (
						<div
							style={{
								fontFamily: data.fontFamily,
								fontSize: `${data.secondaryFontSize}px`,
								fontWeight: "bold",
								lineHeight: 1.1,
								letterSpacing: "0.02em",
								textTransform: "uppercase",
							}}
						>
							{renderWords(data.secondaryText, primaryWords.length, data.secondaryColor)}
						</div>
					)}
				</div>
			</div>
		);
	};

	const renderMarker = () => {
		const data = annotation.markerData;
		if (!data) return null;

		const timeIntoAnnotation = currentTimeMs - annotation.startMs;
		const totalDuration = annotation.endMs - annotation.startMs;
		const fadeOutStart = Math.max(0, totalDuration - 500);
		const globalOpacity =
			timeIntoAnnotation >= fadeOutStart
				? Math.max(0, 1 - (timeIntoAnnotation - fadeOutStart) / 500)
				: 1;

		const sweepProgress = Math.min(1, Math.max(0, timeIntoAnnotation / data.animationDuration));

		const clipRight = data.direction === "left" ? `${(1 - sweepProgress) * 100}%` : "0%";
		const clipLeft = data.direction === "right" ? `${(1 - sweepProgress) * 100}%` : "0%";

		return (
			<div
				className="w-full h-full rounded-sm"
				style={{
					backgroundColor: data.color,
					opacity: data.opacity * globalOpacity,
					clipPath: `inset(0 ${clipRight} 0 ${clipLeft})`,
				}}
			/>
		);
	};

	const renderContent = () => {
		switch (annotation.type) {
			case "marker":
				return renderMarker();

			case "caption":
				return renderCaption();

			case "text":
				return (
					<div
						className="w-full h-full flex items-center p-2 overflow-hidden"
						style={{
							justifyContent:
								annotation.style.textAlign === "left"
									? "flex-start"
									: annotation.style.textAlign === "right"
										? "flex-end"
										: "center",
							alignItems: "center",
						}}
					>
						<span
							style={{
								color: annotation.style.color,
								backgroundColor: annotation.style.backgroundColor,
								fontSize: `${annotation.style.fontSize}px`,
								fontFamily: annotation.style.fontFamily,
								fontWeight: annotation.style.fontWeight,
								fontStyle: annotation.style.fontStyle,
								textDecoration: annotation.style.textDecoration,
								textAlign: annotation.style.textAlign,
								wordBreak: "break-word",
								whiteSpace: "pre-wrap",
								boxDecorationBreak: "clone",
								WebkitBoxDecorationBreak: "clone",
								padding: "0.1em 0.2em",
								borderRadius: "4px",
								lineHeight: "1.4",
							}}
						>
							{annotation.content}
						</span>
					</div>
				);

			case "image":
				if (annotation.content && annotation.content.startsWith("data:image")) {
					return (
						<img
							src={annotation.content}
							alt="Annotation"
							className="w-full h-full object-contain"
							draggable={false}
						/>
					);
				}
				return (
					<div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
						No image
					</div>
				);

			case "figure":
				if (!annotation.figureData) {
					return (
						<div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
							No arrow data
						</div>
					);
				}

				return (
					<div className="w-full h-full flex items-center justify-center p-2">{renderArrow()}</div>
				);

			default:
				return null;
		}
	};

	return (
		<Rnd
			position={{ x, y }}
			size={{ width, height }}
			onDragStart={() => {
				isDraggingRef.current = true;
			}}
			onDragStop={(_e, d) => {
				const xPercent = (d.x / containerWidth) * 100;
				const yPercent = (d.y / containerHeight) * 100;
				onPositionChange(annotation.id, { x: xPercent, y: yPercent });

				// Reset dragging flag after a short delay to prevent click event
				setTimeout(() => {
					isDraggingRef.current = false;
				}, 100);
			}}
			onResizeStop={(_e, _direction, ref, _delta, position) => {
				const xPercent = (position.x / containerWidth) * 100;
				const yPercent = (position.y / containerHeight) * 100;
				const widthPercent = (ref.offsetWidth / containerWidth) * 100;
				const heightPercent = (ref.offsetHeight / containerHeight) * 100;
				onPositionChange(annotation.id, { x: xPercent, y: yPercent });
				onSizeChange(annotation.id, { width: widthPercent, height: heightPercent });
			}}
			onClick={() => {
				if (isDraggingRef.current) return;
				onClick(annotation.id);
			}}
			bounds="parent"
			className={cn(
				"cursor-move transition-all",
				isSelected && "ring-2 ring-[#34B27B] ring-offset-2 ring-offset-transparent",
			)}
			style={{
				zIndex: isSelectedBoost ? zIndex + 1000 : zIndex, // Boost selected annotation to ensure it's on top
				pointerEvents: isSelected ? "auto" : "none",
				border: isSelected ? "2px solid rgba(52, 178, 123, 0.8)" : "none",
				backgroundColor: isSelected ? "rgba(52, 178, 123, 0.1)" : "transparent",
				boxShadow: isSelected ? "0 0 0 1px rgba(52, 178, 123, 0.35)" : "none",
			}}
			enableResizing={isSelected}
			disableDragging={!isSelected}
			resizeHandleStyles={{
				topLeft: {
					width: "12px",
					height: "12px",
					backgroundColor: isSelected ? "white" : "transparent",
					border: isSelected ? "2px solid #34B27B" : "none",
					borderRadius: "50%",
					left: "-6px",
					top: "-6px",
					cursor: "nwse-resize",
				},
				topRight: {
					width: "12px",
					height: "12px",
					backgroundColor: isSelected ? "white" : "transparent",
					border: isSelected ? "2px solid #34B27B" : "none",
					borderRadius: "50%",
					right: "-6px",
					top: "-6px",
					cursor: "nesw-resize",
				},
				bottomLeft: {
					width: "12px",
					height: "12px",
					backgroundColor: isSelected ? "white" : "transparent",
					border: isSelected ? "2px solid #34B27B" : "none",
					borderRadius: "50%",
					left: "-6px",
					bottom: "-6px",
					cursor: "nesw-resize",
				},
				bottomRight: {
					width: "12px",
					height: "12px",
					backgroundColor: isSelected ? "white" : "transparent",
					border: isSelected ? "2px solid #34B27B" : "none",
					borderRadius: "50%",
					right: "-6px",
					bottom: "-6px",
					cursor: "nwse-resize",
				},
			}}
		>
			<div
				className={cn(
					"w-full h-full rounded-lg",
					annotation.type === "text" && "bg-transparent",
					annotation.type === "image" && "bg-transparent",
					annotation.type === "figure" && "bg-transparent",
					isSelected && "shadow-lg",
				)}
			>
				{renderContent()}
			</div>
		</Rnd>
	);
}
