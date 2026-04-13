/**
 * Web Worker for compositing export frames using OffscreenCanvas + Canvas 2D.
 *
 * Receives VideoFrames (transferred), composites them with background/zoom/shadow/annotations,
 * and returns an ImageBitmap (transferred back) — no Pixi.js, no GPU readback.
 */

// ---------- Types (self-contained, no shared imports in worker) ----------

interface WorkerZoomRegion {
	id: string;
	startMs: number;
	endMs: number;
	depth: number;
	focus: { cx: number; cy: number };
	focusMode?: "manual" | "auto";
	zoomInDurationMs?: number;
	zoomOutDurationMs?: number;
}

interface WorkerCropRegion {
	x: number;
	y: number;
	width: number;
	height: number;
}

interface WorkerAnnotationRegion {
	id: string;
	startMs: number;
	endMs: number;
	type: "text" | "image" | "figure" | "blur";
	content: string;
	textContent?: string;
	imageContent?: string;
	position: { x: number; y: number };
	size: { width: number; height: number };
	style: {
		color: string;
		backgroundColor: string;
		fontSize: number;
		fontFamily: string;
		fontWeight: "normal" | "bold";
		fontStyle: "normal" | "italic";
		textDecoration: "none" | "underline";
		textAlign: "left" | "center" | "right";
	};
	zIndex: number;
	figureData?: {
		arrowDirection: string;
		color: string;
		strokeWidth: number;
	};
	blurData?: {
		shape: "rectangle" | "oval" | "freehand";
		intensity: number;
		freehandPoints?: Array<{ x: number; y: number }>;
	};
}

interface InitMessage {
	type: "init";
	config: {
		width: number;
		height: number;
		wallpaper: string;
		zoomRegions: WorkerZoomRegion[];
		showShadow: boolean;
		shadowIntensity: number;
		showBlur: boolean;
		motionBlurAmount: number;
		borderRadius: number;
		padding: number;
		cropRegion: WorkerCropRegion;
		videoWidth: number;
		videoHeight: number;
		webcamSize?: { width: number; height: number } | null;
		webcamLayoutPreset?: "picture-in-picture" | "vertical-stack" | "dual-frame";
		webcamMaskShape?: "rectangle" | "circle" | "square" | "rounded";
		webcamSizePreset?: number;
		webcamPosition?: { cx: number; cy: number } | null;
		annotationRegions?: WorkerAnnotationRegion[];
		previewWidth?: number;
		previewHeight?: number;
	};
	wallpaperBitmap?: ImageBitmap; // transferred from main if pre-loaded
}

interface RenderMessage {
	type: "render";
	frame: VideoFrame; // transferred
	timestamp: number; // microseconds
	webcamFrame?: VideoFrame | null; // transferred
	// Pre-computed animation state (main thread handles zoom math)
	zoomTransform: {
		scale: number;
		x: number;
		y: number;
		focusX: number;
		focusY: number;
		progress: number;
	};
	layoutInfo: {
		stageWidth: number;
		stageHeight: number;
		videoWidth: number; // cropped video width
		videoHeight: number; // cropped video height
		baseScale: number;
		baseOffsetX: number;
		baseOffsetY: number;
		maskX: number;
		maskY: number;
		maskWidth: number;
		maskHeight: number;
		scaledBorderRadius: number;
		webcamRect?: {
			x: number;
			y: number;
			width: number;
			height: number;
			borderRadius: number;
			maskShape: "rectangle" | "circle" | "square" | "rounded";
		} | null;
		screenCover: boolean;
	};
}

interface DisposeMessage {
	type: "dispose";
}

type WorkerIncoming = InitMessage | RenderMessage | DisposeMessage;

interface FrameReadyMessage {
	type: "frame-ready";
	bitmap: ImageBitmap;
	timestamp: number;
}

interface ErrorMessage {
	type: "error";
	error: string;
}

interface ReadyMessage {
	type: "ready";
}

type WorkerOutgoing = FrameReadyMessage | ErrorMessage | ReadyMessage;

// ---------- State ----------

let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;
let wallpaperImage: ImageBitmap | HTMLImageElement | null = null;
let motionBlurHistory: ImageBitmap[] = [];
const MAX_MOTION_HISTORY = 6;

// ---------- Init ----------

function handleInit(msg: InitMessage) {
	canvas = new OffscreenCanvas(msg.config.width, msg.config.height);
	ctx = canvas.getContext("2d");
	if (!ctx) {
		self.postMessage({ type: "error", error: "Failed to get 2D context in worker" });
		return;
	}

	// Set wallpaper
	if (msg.wallpaperBitmap) {
		wallpaperImage = msg.wallpaperBitmap;
	} else {
		loadWallpaper(msg.config.wallpaper).catch((err) => {
			console.error("[FrameRendererWorker] Wallpaper load failed:", err);
		});
	}

	self.postMessage({ type: "ready" });
}

async function loadWallpaper(wallpaper: string): Promise<void> {
	if (!canvas) return;

	try {
		if (wallpaper.startsWith("data:")) {
			// Data URL — decode as ImageBitmap
			const response = await fetch(wallpaper);
			const blob = await response.blob();
			wallpaperImage = await createImageBitmap(blob);
			return;
		}

		if (wallpaper.startsWith("http://") || wallpaper.startsWith("https://")) {
			const response = await fetch(wallpaper, { mode: "cors" });
			const blob = await response.blob();
			wallpaperImage = await createImageBitmap(blob);
			return;
		}

		if (wallpaper.startsWith("file://") || wallpaper.startsWith("/")) {
			// Try fetch (may work in Electron renderer context)
			try {
				const response = await fetch(wallpaper);
				if (response.ok) {
					const blob = await response.blob();
					wallpaperImage = await createImageBitmap(blob);
					return;
				}
			} catch {
				// fall through to solid color
			}
		}

		if (wallpaper.startsWith("#")) {
			// Solid color — handled at render time
			return;
		}

		if (wallpaper.startsWith("linear-gradient") || wallpaper.startsWith("radial-gradient")) {
			// Gradient — parsed and drawn at render time
			return;
		}

		// Try as a solid color
		if (wallpaper.match(/^#[0-9a-fA-F]{3,8}$/)) {
			return;
		}

		// Unknown — treat as solid color or fallback
		console.warn(
			"[FrameRendererWorker] Unknown wallpaper format, using black fallback:",
			wallpaper,
		);
	} catch (err) {
		console.error("[FrameRendererWorker] Error loading wallpaper:", err);
	}
}

// ---------- Background rendering ----------

function drawBackground() {
	if (!ctx || !canvas) return;
	const w = canvas.width;
	const h = canvas.height;

	// Wallpaper image
	if (wallpaperImage) {
		drawImageCover(ctx, wallpaperImage, 0, 0, w, h);
		return;
	}

	// Will be drawn as fallback in render
}

function drawImageCover(
	context: OffscreenCanvasRenderingContext2D,
	source: CanvasImageSource,
	x: number,
	y: number,
	w: number,
	h: number,
) {
	// Get natural dimensions
	let natW: number, natH: number;
	if ("width" in source && "height" in source) {
		natW = (source as ImageBitmap).width;
		natH = (source as ImageBitmap).height;
	} else {
		// HTMLImageElement or similar
		natW = (source as { naturalWidth?: number }).naturalWidth ?? w;
		natH = (source as { naturalHeight?: number }).naturalHeight ?? h;
	}

	const imgAspect = natW / natH;
	const canvasAspect = w / h;

	let drawWidth: number, drawHeight: number, drawX: number, drawY: number;

	if (imgAspect > canvasAspect) {
		drawHeight = h;
		drawWidth = drawHeight * imgAspect;
		drawX = x + (w - drawWidth) / 2;
		drawY = y;
	} else {
		drawWidth = w;
		drawHeight = drawWidth / imgAspect;
		drawX = x;
		drawY = y + (h - drawHeight) / 2;
	}

	context.drawImage(source, drawX, drawY, drawWidth, drawHeight);
}

function parseCssGradientStopColor(input: string): string | null {
	// Extract color and percentage from a stop like "rgba(0,0,0,0.5) 30%"
	const match = input.match(/(#[0-9a-fA-F]{3,8}|(?:rgba?|hsla?)\([^)]*\)|[a-zA-Z-]+)\s*(\d+)?%?/);
	if (match) {
		return match[1];
	}
	return null;
}

function drawGradientBackground(
	context: OffscreenCanvasRenderingContext2D,
	wallpaper: string,
	width: number,
	height: number,
) {
	// Simplified gradient parser for worker context
	const gradientMatch = wallpaper.match(/^(linear|radial)-gradient\((.+)\)$/i);
	if (!gradientMatch) {
		context.fillStyle = wallpaper.startsWith("#") ? wallpaper : "#000000";
		context.fillRect(0, 0, width, height);
		return;
	}

	const type = gradientMatch[1].toLowerCase();
	const args = gradientMatch[2];

	// Split stops, handling rgba/parenthetical commas
	const stopParts = splitGradientArgs(args);

	if (stopParts.length < 2) {
		context.fillStyle = "#000000";
		context.fillRect(0, 0, width, height);
		return;
	}

	// Separate descriptor from stops
	let descriptor: string | null = null;
	let stops = stopParts;

	if (type === "linear") {
		if (/^\s*to\s+/i.test(stops[0]) || /-?\d*\.?\d+deg/i.test(stops[0])) {
			descriptor = stops[0].trim();
			stops = stops.slice(1);
		}
	}

	const parsedStops: Array<{ color: string; offset: number | null }> = [];
	for (const part of stops) {
		const colorMatch = part.trim().match(/(#[0-9a-fA-F]{3,8}|(?:rgba?|hsla?)\([^)]*\)|[a-zA-Z-]+)/);
		if (colorMatch) {
			const offsetMatch = part.match(/(\d+)%/);
			parsedStops.push({
				color: colorMatch[1],
				offset: offsetMatch ? Number.parseInt(offsetMatch[1], 10) / 100 : null,
			});
		}
	}

	if (parsedStops.length < 2) {
		context.fillStyle = "#000000";
		context.fillRect(0, 0, width, height);
		return;
	}

	// Normalize offsets
	const offsets = parsedStops.map((s) => s.offset);
	const definedCount = offsets.filter((o) => o !== null).length;

	if (definedCount === 0) {
		parsedStops.forEach((s, i) => {
			s.offset = i / (parsedStops.length - 1);
		});
	} else {
		// Simple linear interpolation for undefined offsets
		let lastDefined = -1;
		for (let i = 0; i < offsets.length; i++) {
			if (offsets[i] !== null) {
				if (lastDefined === -1) {
					// Fill from start
					for (let j = 0; j < i; j++) {
						parsedStops[j].offset = (offsets[i]! * j) / i;
					}
				} else {
					const start = offsets[lastDefined]!;
					const end = offsets[i]!;
					const gap = i - lastDefined;
					for (let j = lastDefined + 1; j < i; j++) {
						parsedStops[j].offset = start + ((end - start) * (j - lastDefined)) / gap;
					}
				}
				lastDefined = i;
			}
		}
		// Fill remaining at end
		if (lastDefined >= 0 && lastDefined < offsets.length - 1) {
			const start = offsets[lastDefined]!;
			const remaining = offsets.length - 1 - lastDefined;
			for (let i = lastDefined + 1; i < offsets.length; i++) {
				parsedStops[i].offset = start + ((1 - start) * (i - lastDefined)) / remaining;
			}
		}
	}

	let gradient: CanvasGradient;

	if (type === "linear") {
		const angle = resolveGradientAngle(descriptor);
		const radians = (angle * Math.PI) / 180;
		const vx = Math.sin(radians);
		const vy = -Math.cos(radians);
		const halfSpan = (Math.abs(vx) * width + Math.abs(vy) * height) / 2;
		const cx = width / 2;
		const cy = height / 2;
		gradient = context.createLinearGradient(
			cx - vx * halfSpan,
			cy - vy * halfSpan,
			cx + vx * halfSpan,
			cy + vy * halfSpan,
		);
	} else {
		// Radial
		const cx = width / 2;
		const cy = height / 2;
		const radius = Math.sqrt(cx * cx + cy * cy);
		gradient = context.createRadialGradient(cx, cy, 0, cx, cy, radius);
	}

	for (const stop of parsedStops) {
		gradient.addColorStop(stop.offset ?? 0, stop.color);
	}

	context.fillStyle = gradient;
	context.fillRect(0, 0, width, height);
}

function splitGradientArgs(input: string): string[] {
	const parts: string[] = [];
	let current = "";
	let depth = 0;

	for (const char of input) {
		if (char === "(") {
			depth++;
			current += char;
		} else if (char === ")") {
			depth = Math.max(0, depth - 1);
			current += char;
		} else if (char === "," && depth === 0) {
			const trimmed = current.trim();
			if (trimmed) parts.push(trimmed);
			current = "";
		} else {
			current += char;
		}
	}

	const trimmed = current.trim();
	if (trimmed) parts.push(trimmed);
	return parts;
}

function resolveGradientAngle(descriptor: string | null): number {
	if (!descriptor) return 180;
	const angleMatch = descriptor.match(/(-?\d*\.?\d+)deg/i);
	if (angleMatch) return Number.parseFloat(angleMatch[1]);
	const normalized = descriptor.trim().toLowerCase().replace(/\s+/g, " ");
	const dirMap: Record<string, number> = {
		"to top": 0,
		"to top right": 45,
		"to right": 90,
		"to bottom right": 135,
		"to bottom": 180,
		"to bottom left": 225,
		"to left": 270,
		"to top left": 315,
	};
	return dirMap[normalized] ?? 180;
}

function renderWallpaper(
	wallpaper: string,
	context: OffscreenCanvasRenderingContext2D,
	w: number,
	h: number,
) {
	if (wallpaperImage) {
		drawImageCover(context, wallpaperImage, 0, 0, w, h);
	} else if (wallpaper.startsWith("data:") || wallpaper.startsWith("http")) {
		// Not yet loaded — fallback
		context.fillStyle = "#000000";
		context.fillRect(0, 0, w, h);
	} else if (wallpaper.startsWith("#")) {
		context.fillStyle = wallpaper;
		context.fillRect(0, 0, w, h);
	} else if (wallpaper.startsWith("linear-gradient") || wallpaper.startsWith("radial-gradient")) {
		drawGradientBackground(context, wallpaper, w, h);
	} else {
		context.fillStyle = wallpaper || "#000000";
		context.fillRect(0, 0, w, h);
	}
}

// ---------- Annotation rendering (ported from annotationRenderer.ts) ----------

const ARROW_PATHS: Record<string, string[]> = {
	up: ["M 50 20 L 50 80", "M 50 20 L 35 35", "M 50 20 L 65 35"],
	down: ["M 50 20 L 50 80", "M 50 80 L 35 65", "M 50 80 L 65 65"],
	left: ["M 80 50 L 20 50", "M 20 50 L 35 35", "M 20 50 L 35 65"],
	right: ["M 20 50 L 80 50", "M 80 50 L 65 35", "M 80 50 L 65 65"],
	"up-right": ["M 25 75 L 75 25", "M 75 25 L 60 30", "M 75 25 L 70 40"],
	"up-left": ["M 75 75 L 25 25", "M 25 25 L 40 30", "M 25 25 L 30 40"],
	"down-right": ["M 25 25 L 75 75", "M 75 75 L 70 60", "M 75 75 L 60 70"],
	"down-left": ["M 75 25 L 25 75", "M 25 75 L 30 60", "M 25 75 L 40 70"],
};

function renderArrow(
	context: OffscreenCanvasRenderingContext2D,
	direction: string,
	color: string,
	strokeWidth: number,
	x: number,
	y: number,
	width: number,
	height: number,
	scaleFactor: number,
) {
	const paths = ARROW_PATHS[direction];
	if (!paths) return;

	context.save();
	context.translate(x, y);

	const padding = 8 * scaleFactor;
	const availableWidth = Math.max(0, width - padding * 2);
	const availableHeight = Math.max(0, height - padding * 2);
	const scale = Math.min(availableWidth / 100, availableHeight / 100);
	const offsetX = padding + (availableWidth - 100 * scale) / 2;
	const offsetY = padding + (availableHeight - 100 * scale) / 2;

	context.translate(offsetX, offsetY);
	context.shadowColor = "rgba(0, 0, 0, 0.3)";
	context.shadowBlur = 8 * scale;
	context.shadowOffsetX = 0;
	context.shadowOffsetY = 4 * scale;
	context.strokeStyle = color;
	context.lineWidth = strokeWidth * scale;
	context.lineCap = "round";
	context.lineJoin = "round";

	for (const pathString of paths) {
		const parts = pathString.trim().split(/\s+/);
		let i = 0;
		while (i < parts.length) {
			const cmd = parts[i];
			if (cmd === "M" || cmd === "L") {
				const px = Number.parseFloat(parts[i + 1]) * scale;
				const py = Number.parseFloat(parts[i + 2]) * scale;
				if (cmd === "M") context.moveTo(px, py);
				else context.lineTo(px, py);
				i += 3;
			} else {
				i++;
			}
		}
	}
	context.stroke();
	context.restore();
}

function renderText(
	context: OffscreenCanvasRenderingContext2D,
	annotation: WorkerAnnotationRegion,
	x: number,
	y: number,
	width: number,
	height: number,
	scaleFactor: number,
) {
	const style = annotation.style;

	context.save();
	context.beginPath();
	context.rect(x, y, width, height);
	context.clip();

	const fontWeight = style.fontWeight === "bold" ? "bold" : "normal";
	const fontStyle = style.fontStyle === "italic" ? "italic" : "normal";
	const scaledFontSize = style.fontSize * scaleFactor;
	context.font = `${fontStyle} ${fontWeight} ${scaledFontSize}px ${style.fontFamily}`;
	context.textBaseline = "middle";

	const containerPadding = 8 * scaleFactor;
	let textX = x;
	const textY = y + height / 2;

	if (style.textAlign === "center") {
		textX = x + width / 2;
		context.textAlign = "center";
	} else if (style.textAlign === "right") {
		textX = x + width - containerPadding;
		context.textAlign = "right";
	} else {
		textX = x + containerPadding;
		context.textAlign = "left";
	}

	const availableWidth = width - containerPadding * 2;
	const rawLines = annotation.content.split("\n");
	const lines: string[] = [];
	for (const rawLine of rawLines) {
		if (!rawLine) {
			lines.push("");
			continue;
		}
		const words = rawLine.split(/(\s+)/);
		let current = "";
		for (const word of words) {
			const test = current + word;
			if (current && context.measureText(test).width > availableWidth) {
				lines.push(current);
				current = word.trimStart();
			} else {
				current = test;
			}
		}
		if (current) lines.push(current);
	}

	const lineHeight = scaledFontSize * 1.4;
	const startY = textY - ((lines.length - 1) * lineHeight) / 2;

	lines.forEach((line, index) => {
		const currentY = startY + index * lineHeight;

		if (style.backgroundColor && style.backgroundColor !== "transparent") {
			const metrics = context.measureText(line);
			const verticalPadding = scaledFontSize * 0.1;
			const horizontalPadding = scaledFontSize * 0.2;
			const borderRadius = 4 * scaleFactor;
			const contentHeight = scaledFontSize * 1.4;
			const bgHeight = contentHeight + verticalPadding * 2;
			const bgY = currentY - bgHeight / 2;

			let bgX = textX - horizontalPadding;
			const bgWidth = metrics.width + horizontalPadding * 2;

			if (style.textAlign === "center") {
				bgX = textX - bgWidth / 2;
			} else if (style.textAlign === "right") {
				bgX = textX - bgWidth;
			}

			context.fillStyle = style.backgroundColor;
			context.beginPath();
			context.roundRect(bgX, bgY, bgWidth, bgHeight, borderRadius);
			context.fill();
		}

		context.fillStyle = style.color;
		context.fillText(line, textX, currentY);

		if (style.textDecoration === "underline") {
			const metrics = context.measureText(line);
			let underlineX = textX;
			const underlineY = currentY + scaledFontSize * 0.15;

			if (style.textAlign === "center") underlineX = textX - metrics.width / 2;
			else if (style.textAlign === "right") underlineX = textX - metrics.width;

			context.strokeStyle = style.color;
			context.lineWidth = Math.max(1, scaledFontSize / 16);
			context.beginPath();
			context.moveTo(underlineX, underlineY);
			context.lineTo(underlineX + metrics.width, underlineY);
			context.stroke();
		}
	});

	context.restore();
}

async function renderImageAnnotation(
	context: OffscreenCanvasRenderingContext2D,
	annotation: WorkerAnnotationRegion,
	x: number,
	y: number,
	width: number,
	height: number,
): Promise<void> {
	const src = annotation.imageContent || annotation.content;
	if (!src || !src.startsWith("data:image")) return;

	try {
		const response = await fetch(src);
		const blob = await response.blob();
		const bitmap = await createImageBitmap(blob);

		const imgAspect = bitmap.width / bitmap.height;
		const boxAspect = width / height;

		let drawWidth = width;
		let drawHeight = height;
		let drawX = x;
		let drawY = y;

		if (imgAspect > boxAspect) {
			drawHeight = width / imgAspect;
			drawY = y + (height - drawHeight) / 2;
		} else {
			drawWidth = height * imgAspect;
			drawX = x + (width - drawWidth) / 2;
		}

		context.drawImage(bitmap, drawX, drawY, drawWidth, drawHeight);
		bitmap.close();
	} catch (err) {
		console.error("[FrameRendererWorker] Failed to load image annotation:", err);
	}
}

function renderBlurAnnotation(
	context: OffscreenCanvasRenderingContext2D,
	annotation: WorkerAnnotationRegion,
	x: number,
	y: number,
	width: number,
	height: number,
	scaleFactor: number,
) {
	const configuredIntensity = annotation.blurData?.intensity ?? 12;
	const blurRadius = Math.max(1, Math.round(clamp(configuredIntensity, 2, 40) * scaleFactor));
	const samplePadding = Math.max(2, Math.ceil(blurRadius * 2));
	const sx = Math.max(0, Math.floor(x) - samplePadding);
	const sy = Math.max(0, Math.floor(y) - samplePadding);
	const ex = Math.min(context.canvas.width, Math.ceil(x + width) + samplePadding);
	const ey = Math.min(context.canvas.height, Math.ceil(y + height) + samplePadding);
	const sw = Math.max(0, ex - sx);
	const sh = Math.max(0, ey - sy);
	if (sw <= 0 || sh <= 0) return;

	const scratch = new OffscreenCanvas(sw, sh);
	const scratchCtx = scratch.getContext("2d")!;
	scratchCtx.drawImage(context.canvas, sx, sy, sw, sh, 0, 0, sw, sh);

	context.save();
	// Draw clip path
	const shape = annotation.blurData?.shape || "rectangle";
	context.beginPath();
	if (shape === "oval") {
		context.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
	} else if (shape === "freehand") {
		const points = annotation.blurData?.freehandPoints;
		if (points && points.length >= 3) {
			context.moveTo(x + (points[0].x / 100) * width, y + (points[0].y / 100) * height);
			for (let i = 1; i < points.length; i++) {
				context.lineTo(x + (points[i].x / 100) * width, y + (points[i].y / 100) * height);
			}
			context.closePath();
		} else {
			context.rect(x, y, width, height);
		}
	} else {
		context.rect(x, y, width, height);
	}
	context.clip();
	context.filter = `blur(${blurRadius}px)`;
	context.drawImage(scratch, sx, sy);
	context.filter = "none";
	context.restore();
}

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

async function renderAnnotations(
	context: OffscreenCanvasRenderingContext2D,
	annotations: WorkerAnnotationRegion[] | undefined,
	canvasWidth: number,
	canvasHeight: number,
	timeMs: number,
	scaleFactor: number,
) {
	if (!annotations || annotations.length === 0) return;

	const active = annotations.filter((a) => timeMs >= a.startMs && timeMs <= a.endMs);
	const sorted = [...active].sort((a, b) => a.zIndex - b.zIndex);

	for (const annotation of sorted) {
		const x = (annotation.position.x / 100) * canvasWidth;
		const y = (annotation.position.y / 100) * canvasHeight;
		const w = (annotation.size.width / 100) * canvasWidth;
		const h = (annotation.size.height / 100) * canvasHeight;

		switch (annotation.type) {
			case "text":
				renderText(context, annotation, x, y, w, h, scaleFactor);
				break;
			case "image":
				await renderImageAnnotation(context, annotation, x, y, w, h);
				break;
			case "figure":
				if (annotation.figureData) {
					renderArrow(
						context,
						annotation.figureData.arrowDirection,
						annotation.figureData.color,
						annotation.figureData.strokeWidth,
						x,
						y,
						w,
						h,
						scaleFactor,
					);
				}
				break;
			case "blur":
				renderBlurAnnotation(context, annotation, x, y, w, h, scaleFactor);
				break;
		}
	}
}

// ---------- Webcam mask ----------

function drawWebcamMask(
	context: OffscreenCanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	shape: string,
	borderRadius: number,
) {
	context.beginPath();
	switch (shape) {
		case "circle": {
			const cx = x + w / 2;
			const cy = y + h / 2;
			const r = Math.min(w, h) / 2;
			context.arc(cx, cy, r, 0, Math.PI * 2);
			break;
		}
		default:
			context.roundRect(x, y, w, h, borderRadius);
			break;
	}
	context.closePath();
}

// ---------- Render ----------

async function handleRender(msg: RenderMessage) {
	if (!canvas || !ctx) {
		self.postMessage({ type: "error", error: "Worker not initialized" } as ErrorMessage);
		msg.frame.close();
		msg.webcamFrame?.close();
		return;
	}

	try {
		const { frame, webcamFrame, timestamp, zoomTransform, layoutInfo } = msg;
		const w = canvas.width;
		const h = canvas.height;
		const config = initConfig!; // set by init

		// ---- 1. Clear + Background ----
		ctx.clearRect(0, 0, w, h);

		if (config.showBlur) {
			ctx.save();
			ctx.filter = "blur(6px)";
			renderWallpaper(config.wallpaper, ctx, w, h);
			ctx.restore();
		} else {
			renderWallpaper(config.wallpaper, ctx, w, h);
		}

		// ---- 2. Motion blur (history frames) ----
		if (config.motionBlurAmount > 0 && motionBlurHistory.length > 0) {
			ctx.save();
			const historyLen = motionBlurHistory.length;
			for (let i = 0; i < historyLen; i++) {
				const bitmap = motionBlurHistory[i];
				if (!bitmap) continue;
				const opacity = ((i + 1) / (historyLen + 1)) * config.motionBlurAmount * 0.3;
				ctx.globalAlpha = opacity;
				ctx.drawImage(bitmap, 0, 0);
			}
			ctx.globalAlpha = 1;
			ctx.restore();
		}

		// ---- 3. Video frame with zoom transform + crop + border radius + shadow ----
		const { scale, x: tx, y: ty } = zoomTransform;
		const {
			stageWidth,
			stageHeight,
			baseScale,
			baseOffsetX,
			baseOffsetY,
			maskX,
			maskY,
			maskWidth,
			maskHeight,
			scaledBorderRadius,
		} = layoutInfo;

		// Compute the video sprite dimensions and position (same logic as updateLayout in original)
		const { videoWidth: fullVideoW, videoHeight: fullVideoH, cropRegion } = config;
		const croppedVideoW = fullVideoW * cropRegion.width;
		const croppedVideoH = fullVideoH * cropRegion.height;

		// Video sprite size in stage pixels
		const spriteW = fullVideoW * baseScale;
		const spriteH = fullVideoH * baseScale;

		// Cropped display size
		const croppedDisplayW = croppedVideoW * baseScale;
		const croppedDisplayH = croppedVideoH * baseScale;
		const coverOffsetX = (maskWidth - croppedDisplayW) / 2;
		const coverOffsetY = (maskHeight - croppedDisplayH) / 2;

		const cropPixelX = cropRegion.x * fullVideoW * baseScale;
		const cropPixelY = cropRegion.y * fullVideoH * baseScale;
		const spriteX = -cropPixelX + coverOffsetX;
		const spriteY = -cropPixelY + coverOffsetY;

		// Zoom transform math
		const stageCenterX = stageWidth / 2;
		const stageCenterY = stageHeight / 2;
		const effectiveScale = scale;
		const effectiveX = tx;
		const effectiveY = ty;

		// Draw shadow first on a separate offscreen canvas (shadow extends outside the mask)
		if (config.showShadow && config.shadowIntensity > 0) {
			const intensity = config.shadowIntensity;
			const shadowOffset = 12 * intensity;
			const shadowBlur = 48 * intensity;
			const shadowAlpha = 0.7 * intensity;

			// Create a slightly larger offscreen canvas to prevent shadow clipping
			const shadowPad = Math.ceil(shadowBlur + shadowOffset);
			const shadowCanvas = new OffscreenCanvas(w + shadowPad * 2, h + shadowPad * 2);
			const shadowCtx = shadowCanvas.getContext("2d")!;

			shadowCtx.save();
			shadowCtx.shadowColor = `rgba(0, 0, 0, ${shadowAlpha})`;
			shadowCtx.shadowBlur = shadowBlur;
			shadowCtx.shadowOffsetX = 0;
			shadowCtx.shadowOffsetY = shadowOffset;

			// Apply same clip + transform
			shadowCtx.beginPath();
			shadowCtx.roundRect(
				maskX + shadowPad,
				maskY + shadowPad,
				maskWidth,
				maskHeight,
				scaledBorderRadius,
			);
			shadowCtx.clip();
			shadowCtx.translate(stageCenterX + shadowPad, stageCenterY + shadowPad);
			shadowCtx.translate(effectiveX, effectiveY);
			shadowCtx.scale(effectiveScale, effectiveScale);
			shadowCtx.translate(-stageCenterX - shadowPad, -stageCenterY - shadowPad);
			shadowCtx.drawImage(frame, baseOffsetX + spriteX, baseOffsetY + spriteY, spriteW, spriteH);
			shadowCtx.restore();

			// Composite shadow onto main canvas
			ctx.drawImage(shadowCanvas, -shadowPad, -shadowPad);
		}

		// Draw video inside the mask clip (on top of shadow)
		ctx.save();
		ctx.beginPath();
		ctx.roundRect(maskX, maskY, maskWidth, maskHeight, scaledBorderRadius);
		ctx.clip();
		ctx.translate(stageCenterX, stageCenterY);
		ctx.translate(effectiveX, effectiveY);
		ctx.scale(effectiveScale, effectiveScale);
		ctx.translate(-stageCenterX, -stageCenterY);
		ctx.drawImage(frame, baseOffsetX + spriteX, baseOffsetY + spriteY, spriteW, spriteH);
		ctx.restore();

		// ---- 4. Motion blur: store current frame ----
		if (config.motionBlurAmount > 0) {
			// Store a copy of the current frame for motion blur accumulation
			const frameCopy = await createImageBitmap(canvas);
			motionBlurHistory.push(frameCopy);
			if (motionBlurHistory.length > MAX_MOTION_HISTORY) {
				const old = motionBlurHistory.shift();
				old?.close();
			}
		}

		// ---- 5. Webcam overlay ----
		if (webcamFrame && layoutInfo.webcamRect) {
			const rect = layoutInfo.webcamRect;
			const shape = rect.maskShape || config.webcamMaskShape || "rectangle";

			const sourceWidth = webcamFrame.displayWidth || webcamFrame.codedWidth || rect.width;
			const sourceHeight = webcamFrame.displayHeight || webcamFrame.codedHeight || rect.height;
			const sourceAspect = sourceWidth / sourceHeight;
			const targetAspect = rect.width / rect.height;

			let sourceCropW = sourceWidth;
			let sourceCropH = sourceHeight;
			if (sourceAspect > targetAspect) {
				sourceCropW = Math.round(sourceHeight * targetAspect);
			} else {
				sourceCropH = Math.round(sourceWidth / targetAspect);
			}
			const sourceCropX = Math.max(0, Math.round((sourceWidth - sourceCropW) / 2));
			const sourceCropY = Math.max(0, Math.round((sourceHeight - sourceCropH) / 2));

			ctx.save();
			drawWebcamMask(ctx, rect.x, rect.y, rect.width, rect.height, shape, rect.borderRadius);

			// Shadow for webcam (picture-in-picture preset)
			if (config.webcamLayoutPreset === "picture-in-picture") {
				ctx.shadowColor = "rgba(0,0,0,0.35)";
				ctx.shadowBlur = 24;
				ctx.shadowOffsetX = 0;
				ctx.shadowOffsetY = 10;
			}
			ctx.fillStyle = "#000000";
			ctx.fill();
			ctx.shadowColor = "transparent";
			ctx.shadowBlur = 0;
			ctx.shadowOffsetX = 0;
			ctx.shadowOffsetY = 0;

			ctx.clip();
			ctx.drawImage(
				webcamFrame,
				sourceCropX,
				sourceCropY,
				sourceCropW,
				sourceCropH,
				rect.x,
				rect.y,
				rect.width,
				rect.height,
			);
			ctx.restore();
		}

		// ---- 6. Annotations ----
		const previewWidth = config.previewWidth || 1920;
		const previewHeight = config.previewHeight || 1080;
		const scaleX = w / previewWidth;
		const scaleY = h / previewHeight;
		const scaleFactor = (scaleX + scaleY) / 2;

		await renderAnnotations(
			ctx,
			config.annotationRegions,
			w,
			h,
			timestamp / 1000, // convert microseconds to ms
			scaleFactor,
		);

		// ---- 7. Transfer result back ----
		const bitmap = canvas.transferToImageBitmap();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(self as any).postMessage({ type: "frame-ready", bitmap, timestamp }, [bitmap]);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		self.postMessage({ type: "error", error: message } as ErrorMessage);
	} finally {
		msg.frame.close();
		msg.webcamFrame?.close();
	}
}

// ---------- Dispose ----------

function handleDispose() {
	for (const bitmap of motionBlurHistory) {
		bitmap.close();
	}
	motionBlurHistory = [];
	if (wallpaperImage instanceof ImageBitmap) {
		wallpaperImage.close();
	}
	wallpaperImage = null;
	if (canvas) {
		// Can't destroy OffscreenCanvas, but clear references
		canvas = null;
		ctx = null;
	}
}

// ---------- Message handler ----------

let initConfig: InitMessage["config"] | null = null;

self.addEventListener("message", (e: MessageEvent<WorkerIncoming>) => {
	const msg = e.data;

	switch (msg.type) {
		case "init":
			initConfig = msg.config;
			handleInit(msg);
			break;
		case "render":
			if (!initConfig) {
				self.postMessage({ type: "error", error: "Not initialized" } as ErrorMessage);
				msg.frame.close();
				msg.webcamFrame?.close();
				return;
			}
			handleRender(msg);
			break;
		case "dispose":
			handleDispose();
			break;
	}
});
