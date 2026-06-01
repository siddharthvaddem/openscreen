import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { type AspectRatio } from "@/utils/aspectRatioUtils";
import { DEFAULT_SOURCE_DIMENSIONS } from "./editorDefaults";

interface CropRegion {
	x: number; // 0-1 normalized
	y: number; // 0-1 normalized
	width: number; // 0-1 normalized
	height: number; // 0-1 normalized
}

interface CropControlProps {
	videoElement: HTMLVideoElement | null;
	cropRegion: CropRegion;
	onCropChange: (region: CropRegion) => void;
	aspectRatio: AspectRatio;
}

type DragHandle = "top" | "right" | "bottom" | "left" | "move" | null;

export function CropControl({ videoElement, cropRegion, onCropChange }: CropControlProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const [isDragging, setIsDragging] = useState<DragHandle>(null);
	const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
	const [initialCrop, setInitialCrop] = useState<CropRegion>(cropRegion);

	useEffect(() => {
		if (!videoElement || !canvasRef.current) return;

		const canvas = canvasRef.current;
		const ctx = canvas.getContext("2d", { alpha: false });
		if (!ctx) return;

		canvas.width = videoElement.videoWidth || DEFAULT_SOURCE_DIMENSIONS.width;
		canvas.height = videoElement.videoHeight || DEFAULT_SOURCE_DIMENSIONS.height;

		const draw = () => {
			if (videoElement.readyState >= 2) {
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
			}
			requestAnimationFrame(draw);
		};

		const rafId = requestAnimationFrame(draw);
		return () => cancelAnimationFrame(rafId);
	}, [videoElement]);

	const getContainerRect = () => {
		return (
			containerRef.current?.getBoundingClientRect() || { width: 0, height: 0, left: 0, top: 0 }
		);
	};

	const handlePointerDown = (e: React.PointerEvent, handle: DragHandle) => {
		e.stopPropagation();
		e.preventDefault();
		setIsDragging(handle);
		const rect = getContainerRect();
		setDragStart({
			x: (e.clientX - rect.left) / rect.width,
			y: (e.clientY - rect.top) / rect.height,
		});
		setInitialCrop(cropRegion);

		e.currentTarget.setPointerCapture(e.pointerId);
	};

	const handlePointerMove = (e: React.PointerEvent) => {
		if (!isDragging) return;

		const rect = getContainerRect();
		const currentX = (e.clientX - rect.left) / rect.width;
		const currentY = (e.clientY - rect.top) / rect.height;
		const deltaX = currentX - dragStart.x;
		const deltaY = currentY - dragStart.y;

		let newCrop = { ...initialCrop };

		switch (isDragging) {
			case "top": {
				const newY = Math.max(0, initialCrop.y + deltaY);
				const bottom = initialCrop.y + initialCrop.height;
				newCrop.y = Math.min(newY, bottom - 0.1);
				newCrop.height = bottom - newCrop.y;
				break;
			}
			case "bottom":
				newCrop.height = Math.max(0.1, Math.min(initialCrop.height + deltaY, 1 - initialCrop.y));
				break;
			case "left": {
				const newX = Math.max(0, initialCrop.x + deltaX);
				const right = initialCrop.x + initialCrop.width;
				newCrop.x = Math.min(newX, right - 0.1);
				newCrop.width = right - newCrop.x;
				break;
			}
			case "right":
				newCrop.width = Math.max(0.1, Math.min(initialCrop.width + deltaX, 1 - initialCrop.x));
				break;
			case "move": {
				newCrop.x = Math.max(0, Math.min(initialCrop.x + deltaX, 1 - initialCrop.width));
				newCrop.y = Math.max(0, Math.min(initialCrop.y + deltaY, 1 - initialCrop.height));
				break;
			}
		}

		onCropChange(newCrop);
	};

	const handlePointerUp = (e: React.PointerEvent) => {
		if (isDragging) {
			try {
				e.currentTarget.releasePointerCapture(e.pointerId);
			} catch {
				// Pointer may already be released; ignore.
			}
		}
		setIsDragging(null);
	};

	const cropPixelX = cropRegion.x * 100;
	const cropPixelY = cropRegion.y * 100;
	const cropPixelWidth = cropRegion.width * 100;
	const cropPixelHeight = cropRegion.height * 100;
	const videoAspectRatio = videoElement
		? videoElement.videoWidth / videoElement.videoHeight
		: 16 / 9;
	const isVideoPortrait = videoAspectRatio < 1;
	const maxContainerWidth = isVideoPortrait ? "40vw" : "75vw";
	const maxContainerHeight = "75vh";

	return (
		<div className="w-full p-8">
			<div
				ref={containerRef}
				className="relative w-full bg-black rounded-lg overflow-visible cursor-default select-none shadow-2xl"
				style={{
					aspectRatio: videoAspectRatio,
					maxWidth: maxContainerWidth,
					maxHeight: maxContainerHeight,
					margin: "0 auto",
				}}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
				onPointerLeave={handlePointerUp}
			>
				<canvas
					ref={canvasRef}
					className="w-full h-full rounded-lg"
					style={{ imageRendering: "auto" }}
				/>

				<div className="absolute inset-0 pointer-events-none" style={{ transition: "none" }}>
					<svg
						width="100%"
						height="100%"
						className="absolute inset-0"
						style={{ transition: "none" }}
					>
						<defs>
							<mask id="cropMask">
								<rect width="100%" height="100%" fill="white" />
								<rect
									x={`${cropPixelX}%`}
									y={`${cropPixelY}%`}
									width={`${cropPixelWidth}%`}
									height={`${cropPixelHeight}%`}
									fill="black"
									style={{ transition: "none" }}
								/>
							</mask>
						</defs>
						<rect
							width="100%"
							height="100%"
							fill="black"
							fillOpacity="0.6"
							mask="url(#cropMask)"
							style={{ transition: "none" }}
						/>
					</svg>
				</div>

				<div
					className="absolute z-10 pointer-events-auto cursor-move"
					style={{
						left: `${cropPixelX}%`,
						top: `${cropPixelY}%`,
						width: `${cropPixelWidth}%`,
						height: `${cropPixelHeight}%`,
						transition: "none",
					}}
					onPointerDown={(e) => handlePointerDown(e, "move")}
				/>

				<div
					className={cn("absolute h-[3px] cursor-ns-resize z-20 pointer-events-auto bg-[#34B27B]")}
					style={{
						left: `${cropPixelX}%`,
						top: `${cropPixelY}%`,
						width: `${cropPixelWidth}%`,
						transform: "translateY(-50%)",
						willChange: "transform",
						transition: "none",
					}}
					onPointerDown={(e) => handlePointerDown(e, "top")}
				/>

				<div
					className={cn("absolute h-[3px] cursor-ns-resize z-20 pointer-events-auto bg-[#34B27B]")}
					style={{
						left: `${cropPixelX}%`,
						top: `${cropPixelY + cropPixelHeight}%`,
						width: `${cropPixelWidth}%`,
						transform: "translateY(-50%)",
						willChange: "transform",
						transition: "none",
					}}
					onPointerDown={(e) => handlePointerDown(e, "bottom")}
				/>

				<div
					className={cn("absolute w-[3px] cursor-ew-resize z-20 pointer-events-auto bg-[#34B27B]")}
					style={{
						left: `${cropPixelX}%`,
						top: `${cropPixelY}%`,
						height: `${cropPixelHeight}%`,
						transform: "translateX(-50%)",
						willChange: "transform",
						transition: "none",
					}}
					onPointerDown={(e) => handlePointerDown(e, "left")}
				/>

				<div
					className={cn("absolute w-[3px] cursor-ew-resize z-20 pointer-events-auto bg-[#34B27B]")}
					style={{
						left: `${cropPixelX + cropPixelWidth}%`,
						top: `${cropPixelY}%`,
						height: `${cropPixelHeight}%`,
						transform: "translateX(-50%)",
						willChange: "transform",
						transition: "none",
					}}
					onPointerDown={(e) => handlePointerDown(e, "right")}
				/>
			</div>
		</div>
	);
}
