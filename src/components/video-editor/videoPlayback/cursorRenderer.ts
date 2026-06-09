import { Assets, BlurFilter, Container, Graphics, Sprite, Texture } from "pixi.js";
import { MotionBlurFilter } from "pixi-filters/motion-blur";
import type { CursorTelemetryPoint } from "../types";
import {
	createSpringState,
	getCursorSpringConfig,
	resetSpringState,
	stepSpringValue,
} from "./motionSmoothing";
import { UPLOADED_CURSOR_SAMPLE_SIZE, uploadedCursorAssets } from "./uploadedCursorAssets";

type CursorAssetKey = NonNullable<CursorTelemetryPoint["cursorType"]>;

/** System cursor asset from native helper (macOS only). */
type SystemCursorAsset = {
	dataUrl: string;
	width: number;
	height: number;
	hotspotX: number;
	hotspotY: number;
};

type LoadedCursorAsset = {
	texture: Texture;
	image: HTMLImageElement;
	aspectRatio: number;
	anchorX: number;
	anchorY: number;
};

export interface CursorViewportRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

/**
 * Configuration for cursor rendering.
 */
export interface CursorRenderConfig {
	/** Base cursor height in pixels (at reference width of 1920px) */
	dotRadius: number;
	/** Cursor fill color (hex number for PixiJS) */
	dotColor: number;
	/** Cursor opacity (0-1) */
	dotAlpha: number;
	/** Unused, kept for interface compatibility */
	trailLength: number;
	/** Smoothing factor for cursor interpolation (0-1, lower = smoother/slower) */
	smoothingFactor: number;
	/** Directional cursor motion blur amount. */
	motionBlur: number;
	/** Click bounce multiplier. */
	clickBounce: number;
}

export const DEFAULT_CURSOR_CONFIG: CursorRenderConfig = {
	dotRadius: 28,
	dotColor: 0xffffff,
	dotAlpha: 0.95,
	trailLength: 0,
	smoothingFactor: 0.18,
	motionBlur: 0,
	clickBounce: 1,
};

const REFERENCE_WIDTH = 1920;
const MIN_CURSOR_VIEWPORT_SCALE = 0.55;
const CLICK_ANIMATION_MS = 140;
const CLICK_RING_FADE_MS = 240;
const CURSOR_MOTION_BLUR_BASE_MULTIPLIER = 0.08;
const CURSOR_TIME_DISCONTINUITY_MS = 100;
const CURSOR_SVG_DROP_SHADOW_FILTER = "drop-shadow(0px 2px 3px rgba(0, 0, 0, 0.35))";
const CURSOR_SHADOW_COLOR = 0x000000;
const CURSOR_SHADOW_ALPHA = 0.35;
const CURSOR_SHADOW_OFFSET_X = 0;
const CURSOR_SHADOW_OFFSET_Y = 2;
const CURSOR_SHADOW_BLUR = 3;
const CURSOR_SHADOW_PADDING = 12;

let cursorAssetsPromise: Promise<void> | null = null;
let loadedCursorAssets: Partial<Record<CursorAssetKey, LoadedCursorAsset>> = {};
const SUPPORTED_CURSOR_KEYS: CursorAssetKey[] = [
	"arrow",
	"text",
	"pointer",
	"crosshair",
	"open-hand",
	"closed-hand",
	"resize-ew",
	"resize-ns",
	"not-allowed",
];

function loadImage(dataUrl: string) {
	return new Promise<HTMLImageElement>((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () =>
			reject(new Error(`Failed to load cursor image: ${dataUrl.slice(0, 128)}`));
		image.src = dataUrl;
	});
}

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

function getNormalizedAnchor(
	systemAsset: SystemCursorAsset | undefined,
	fallbackAnchor: { x: number; y: number },
) {
	if (!systemAsset || systemAsset.width <= 0 || systemAsset.height <= 0) {
		return fallbackAnchor;
	}

	return {
		x: clamp(systemAsset.hotspotX / systemAsset.width, 0, 1),
		y: clamp(systemAsset.hotspotY / systemAsset.height, 0, 1),
	};
}

/**
 * Loads an SVG at `sampleSize × sampleSize`, crops the trim region, and returns
 * a PNG data-URL. Needed because an SVG's natural size (e.g. 32×32) doesn't match
 * the 1024-sample coordinate space the trim measurements use.
 */
async function rasterizeAndCropSvg(
	url: string,
	sampleSize: number,
	trimX: number,
	trimY: number,
	trimWidth: number,
	trimHeight: number,
): Promise<{ dataUrl: string; width: number; height: number }> {
	const img = await loadImage(url);

	const srcCanvas = document.createElement("canvas");
	srcCanvas.width = sampleSize;
	srcCanvas.height = sampleSize;
	const srcCtx = srcCanvas.getContext("2d")!;
	srcCtx.drawImage(img, 0, 0, sampleSize, sampleSize);

	const dstCanvas = document.createElement("canvas");
	dstCanvas.width = trimWidth;
	dstCanvas.height = trimHeight;
	const dstCtx = dstCanvas.getContext("2d")!;
	dstCtx.drawImage(srcCanvas, trimX, trimY, trimWidth, trimHeight, 0, 0, trimWidth, trimHeight);

	return {
		dataUrl: dstCanvas.toDataURL("image/png"),
		width: dstCanvas.width,
		height: dstCanvas.height,
	};
}

function getCursorAsset(key: CursorAssetKey): LoadedCursorAsset {
	const asset = loadedCursorAssets[key];
	if (!asset) {
		throw new Error(`Missing cursor asset for ${key}`);
	}

	return asset;
}

function getAvailableCursorKeys(): CursorAssetKey[] {
	const loadedKeys = Object.keys(loadedCursorAssets) as CursorAssetKey[];
	return loadedKeys.length > 0 ? loadedKeys : ["arrow"];
}

export async function preloadCursorAssets() {
	if (!cursorAssetsPromise) {
		cursorAssetsPromise = (async () => {
			let systemCursors: Record<string, SystemCursorAsset> = {};

			try {
				const api = window.electronAPI as Record<string, unknown>;
				if (typeof api.getSystemCursorAssets === "function") {
					const result = await (
						api.getSystemCursorAssets as () => Promise<{
							success: boolean;
							cursors?: Record<string, SystemCursorAsset>;
						}>
					)();
					if (result.success && result.cursors) {
						systemCursors = result.cursors;
					}
				}
			} catch (error) {
				console.warn("[CursorRenderer] Failed to fetch system cursor assets:", error);
			}

			const entries = await Promise.all(
				SUPPORTED_CURSOR_KEYS.map(async (key) => {
					const systemAsset = systemCursors[key];
					const uploadedAsset = uploadedCursorAssets[key];
					const assetUrl = uploadedAsset?.url ?? systemAsset?.dataUrl;

					if (!assetUrl) {
						console.warn(`[CursorRenderer] No cursor image for: ${key}`);
						return null;
					}

					try {
						let finalUrl: string;
						let width: number;
						let height: number;
						let normalizedAnchor: { x: number; y: number };

						if (uploadedAsset) {
							const { trim, fallbackAnchor } = uploadedAsset;
							const rasterized = await rasterizeAndCropSvg(
								assetUrl,
								UPLOADED_CURSOR_SAMPLE_SIZE,
								trim.x,
								trim.y,
								trim.width,
								trim.height,
							);
							finalUrl = rasterized.dataUrl;
							width = rasterized.width;
							height = rasterized.height;
							normalizedAnchor = {
								x: clamp((fallbackAnchor.x * trim.width) / width, 0, 1),
								y: clamp((fallbackAnchor.y * trim.height) / height, 0, 1),
							};
						} else {
							finalUrl = assetUrl;
							const img = await loadImage(finalUrl);
							width = img.naturalWidth;
							height = img.naturalHeight;
							normalizedAnchor = getNormalizedAnchor(systemAsset, { x: 0, y: 0 });
						}

						await Assets.load(finalUrl);
						const image = await loadImage(finalUrl);
						const texture = Texture.from(finalUrl);

						return [
							key,
							{
								texture,
								image,
								aspectRatio: height > 0 ? width / height : 1,
								anchorX: normalizedAnchor.x,
								anchorY: normalizedAnchor.y,
							} satisfies LoadedCursorAsset,
						] as const;
					} catch (error) {
						console.warn(`[CursorRenderer] Failed to load cursor image for: ${key}`, error);
						return null;
					}
				}),
			);

			loadedCursorAssets = Object.fromEntries(
				entries.filter(Boolean).map((entry) => entry!),
			) as Partial<Record<CursorAssetKey, LoadedCursorAsset>>;

			if (!loadedCursorAssets.arrow) {
				throw new Error("Failed to initialize the fallback arrow cursor asset");
			}
		})();
	}

	return cursorAssetsPromise;
}

/**
 * Interpolates cursor position from telemetry samples at a given time.
 * Uses linear interpolation between the two nearest samples.
 */
export function interpolateCursorPosition(
	samples: CursorTelemetryPoint[],
	timeMs: number,
): { cx: number; cy: number } | null {
	if (!samples || samples.length === 0) return null;

	if (timeMs <= samples[0].timeMs) {
		return { cx: samples[0].cx, cy: samples[0].cy };
	}

	if (timeMs >= samples[samples.length - 1].timeMs) {
		return { cx: samples[samples.length - 1].cx, cy: samples[samples.length - 1].cy };
	}

	let lo = 0;
	let hi = samples.length - 1;
	while (lo < hi - 1) {
		const mid = (lo + hi) >> 1;
		if (samples[mid].timeMs <= timeMs) {
			lo = mid;
		} else {
			hi = mid;
		}
	}

	const a = samples[lo];
	const b = samples[hi];
	const span = b.timeMs - a.timeMs;
	if (span <= 0) return { cx: a.cx, cy: a.cy };

	const t = (timeMs - a.timeMs) / span;
	return {
		cx: a.cx + (b.cx - a.cx) * t,
		cy: a.cy + (b.cy - a.cy) * t,
	};
}

function findLatestSample(samples: CursorTelemetryPoint[], timeMs: number) {
	if (samples.length === 0) return null;

	let lo = 0;
	let hi = samples.length - 1;
	while (lo < hi) {
		const mid = Math.ceil((lo + hi) / 2);
		if (samples[mid].timeMs <= timeMs) {
			lo = mid;
		} else {
			hi = mid - 1;
		}
	}

	return samples[lo]?.timeMs <= timeMs ? samples[lo] : null;
}

function findLatestInteractionSample(samples: CursorTelemetryPoint[], timeMs: number) {
	for (let index = samples.length - 1; index >= 0; index -= 1) {
		const sample = samples[index];
		if (sample.timeMs > timeMs) {
			continue;
		}

		if (
			sample.interactionType === "click" ||
			sample.interactionType === "double-click" ||
			sample.interactionType === "right-click" ||
			sample.interactionType === "middle-click"
		) {
			return sample;
		}
	}

	return null;
}

function findLatestStableCursorType(samples: CursorTelemetryPoint[], timeMs: number) {
	// Binary search to position at timeMs, then scan backwards
	let lo = 0;
	let hi = samples.length - 1;
	while (lo < hi) {
		const mid = Math.ceil((lo + hi) / 2);
		if (samples[mid].timeMs <= timeMs) {
			lo = mid;
		} else {
			hi = mid - 1;
		}
	}

	// Scan back for a sample with cursorType. Skip click events (not mouseup) to
	// avoid a transient re-type during clicks.
	for (let index = lo; index >= 0; index -= 1) {
		const sample = samples[index];
		if (sample.timeMs > timeMs) {
			continue;
		}

		if (!sample.cursorType) {
			continue;
		}

		if (
			sample.interactionType === "click" ||
			sample.interactionType === "double-click" ||
			sample.interactionType === "right-click" ||
			sample.interactionType === "middle-click"
		) {
			continue;
		}

		return sample.cursorType;
	}

	return findLatestSample(samples, timeMs)?.cursorType ?? "arrow";
}

function getCursorViewportScale(viewport: CursorViewportRect) {
	return Math.max(MIN_CURSOR_VIEWPORT_SCALE, viewport.width / REFERENCE_WIDTH);
}

function getCursorVisualState(samples: CursorTelemetryPoint[], timeMs: number) {
	const latestClick = findLatestInteractionSample(samples, timeMs);
	const interactionType = latestClick?.interactionType;
	const ageMs = latestClick ? Math.max(0, timeMs - latestClick.timeMs) : Number.POSITIVE_INFINITY;
	const isClickEvent =
		interactionType === "click" ||
		interactionType === "double-click" ||
		interactionType === "right-click" ||
		interactionType === "middle-click";
	const clickBounceProgress =
		latestClick && isClickEvent && ageMs <= CLICK_ANIMATION_MS ? 1 - ageMs / CLICK_ANIMATION_MS : 0;

	return {
		cursorType: findLatestStableCursorType(samples, timeMs),
		clickBounceProgress,
		clickProgress:
			latestClick && isClickEvent && ageMs <= CLICK_RING_FADE_MS
				? 1 - ageMs / CLICK_RING_FADE_MS
				: 0,
	};
}

/**
 * Manages a smoothed cursor state that chases the interpolated target.
 */
export class SmoothedCursorState {
	public x = 0.5;
	public y = 0.5;
	public trail: Array<{ x: number; y: number }> = [];
	private smoothingFactor: number;
	private trailLength: number;
	private initialized = false;
	private lastTimeMs: number | null = null;
	private xSpring = createSpringState(0.5);
	private ySpring = createSpringState(0.5);

	constructor(config: Pick<CursorRenderConfig, "smoothingFactor" | "trailLength">) {
		this.smoothingFactor = config.smoothingFactor;
		this.trailLength = config.trailLength;
	}

	update(targetX: number, targetY: number, timeMs: number): void {
		if (!this.initialized) {
			this.x = targetX;
			this.y = targetY;
			this.initialized = true;
			this.lastTimeMs = timeMs;
			this.xSpring.value = targetX;
			this.ySpring.value = targetY;
			this.xSpring.velocity = 0;
			this.ySpring.velocity = 0;
			this.xSpring.initialized = true;
			this.ySpring.initialized = true;
			this.trail = [];
			return;
		}

		if (this.smoothingFactor <= 0 || (this.lastTimeMs !== null && timeMs < this.lastTimeMs)) {
			this.snapTo(targetX, targetY, timeMs);
			return;
		}

		this.trail.unshift({ x: this.x, y: this.y });
		if (this.trail.length > this.trailLength) {
			this.trail.length = this.trailLength;
		}

		const deltaMs = this.lastTimeMs === null ? 1000 / 60 : Math.max(1, timeMs - this.lastTimeMs);
		this.lastTimeMs = timeMs;

		const springConfig = getCursorSpringConfig(this.smoothingFactor);
		this.x = stepSpringValue(this.xSpring, targetX, deltaMs, springConfig);
		this.y = stepSpringValue(this.ySpring, targetY, deltaMs, springConfig);
	}

	setSmoothingFactor(smoothingFactor: number): void {
		this.smoothingFactor = smoothingFactor;
	}

	snapTo(targetX: number, targetY: number, timeMs: number): void {
		this.x = targetX;
		this.y = targetY;
		this.initialized = true;
		this.lastTimeMs = timeMs;
		this.xSpring.value = targetX;
		this.ySpring.value = targetY;
		this.xSpring.velocity = 0;
		this.ySpring.velocity = 0;
		this.xSpring.initialized = true;
		this.ySpring.initialized = true;
		this.trail = [];
	}

	reset(): void {
		this.initialized = false;
		this.lastTimeMs = null;
		this.trail = [];
		resetSpringState(this.xSpring, this.x);
		resetSpringState(this.ySpring, this.y);
	}
}

function drawClickRing(graphics: Graphics, px: number, py: number, h: number, progress: number) {
	void graphics;
	void px;
	void py;
	void h;
	void progress;
}

export class PixiCursorOverlay {
	public readonly container: Container;
	private clickRingGraphics: Graphics;
	private cursorShadowSprites: Partial<Record<CursorAssetKey, Sprite>>;
	private cursorShadowFilters: Partial<Record<CursorAssetKey, BlurFilter>>;
	private cursorSprites: Partial<Record<CursorAssetKey, Sprite>>;
	private cursorMotionBlurFilter: MotionBlurFilter;
	private state: SmoothedCursorState;
	private config: CursorRenderConfig;
	private lastRenderedPoint: { px: number; py: number } | null = null;
	private lastRenderedTimeMs: number | null = null;

	constructor(config: Partial<CursorRenderConfig> = {}) {
		this.config = { ...DEFAULT_CURSOR_CONFIG, ...config };
		this.state = new SmoothedCursorState(this.config);

		this.container = new Container();
		this.container.label = "cursor-overlay";

		this.clickRingGraphics = new Graphics();
		this.cursorShadowSprites = {};
		this.cursorShadowFilters = {};
		this.cursorSprites = {};
		for (const key of getAvailableCursorKeys()) {
			const asset = getCursorAsset(key);
			const shadowSprite = new Sprite(asset.texture);
			shadowSprite.anchor.set(asset.anchorX, asset.anchorY);
			shadowSprite.visible = false;
			shadowSprite.tint = CURSOR_SHADOW_COLOR;
			shadowSprite.alpha = CURSOR_SHADOW_ALPHA;
			const shadowFilter = new BlurFilter();
			shadowFilter.blur = CURSOR_SHADOW_BLUR;
			shadowFilter.quality = 4;
			shadowFilter.padding = CURSOR_SHADOW_PADDING;
			shadowSprite.filters = [shadowFilter];
			this.cursorShadowSprites[key] = shadowSprite;
			this.cursorShadowFilters[key] = shadowFilter;

			const sprite = new Sprite(asset.texture);
			sprite.anchor.set(asset.anchorX, asset.anchorY);
			sprite.visible = false;
			this.cursorSprites[key] = sprite;
		}

		this.cursorMotionBlurFilter = new MotionBlurFilter([0, 0], 5, 0);
		this.container.filters = null;

		this.container.addChild(
			this.clickRingGraphics,
			...Object.values(this.cursorShadowSprites),
			...Object.values(this.cursorSprites),
		);
		this.setMotionBlur(this.config.motionBlur);
	}

	setDotRadius(dotRadius: number) {
		this.config.dotRadius = dotRadius;
	}

	setSmoothingFactor(smoothingFactor: number) {
		this.config.smoothingFactor = smoothingFactor;
		this.state.setSmoothingFactor(smoothingFactor);
	}

	setMotionBlur(motionBlur: number) {
		this.config.motionBlur = Math.max(0, motionBlur);
		this.container.filters = this.config.motionBlur > 0 ? [this.cursorMotionBlurFilter] : null;
		if (this.config.motionBlur <= 0) {
			this.cursorMotionBlurFilter.velocity = { x: 0, y: 0 };
			this.cursorMotionBlurFilter.kernelSize = 5;
			this.cursorMotionBlurFilter.offset = 0;
		}
	}

	setClickBounce(clickBounce: number) {
		this.config.clickBounce = Math.max(0, clickBounce);
	}

	update(
		samples: CursorTelemetryPoint[],
		timeMs: number,
		viewport: CursorViewportRect,
		visible: boolean,
		freeze = false,
	): void {
		if (!visible || samples.length === 0 || viewport.width <= 0 || viewport.height <= 0) {
			this.container.visible = false;
			this.lastRenderedPoint = null;
			this.lastRenderedTimeMs = null;
			this.cursorMotionBlurFilter.velocity = { x: 0, y: 0 };
			return;
		}

		const target = interpolateCursorPosition(samples, timeMs);
		if (!target) {
			this.container.visible = false;
			return;
		}

		const sameFrameTime =
			this.lastRenderedTimeMs !== null && Math.abs(this.lastRenderedTimeMs - timeMs) < 0.0001;
		const hasTimeDiscontinuity =
			this.lastRenderedTimeMs !== null &&
			Math.abs(timeMs - this.lastRenderedTimeMs) > CURSOR_TIME_DISCONTINUITY_MS;

		if (freeze || hasTimeDiscontinuity) {
			if (!sameFrameTime || !this.lastRenderedPoint) {
				this.state.snapTo(target.cx, target.cy, timeMs);
			}
		} else {
			this.state.update(target.cx, target.cy, timeMs);
		}
		this.container.visible = true;

		const px = viewport.x + this.state.x * viewport.width;
		const py = viewport.y + this.state.y * viewport.height;
		const h = this.config.dotRadius * getCursorViewportScale(viewport);
		const { cursorType, clickBounceProgress, clickProgress } = getCursorVisualState(
			samples,
			timeMs,
		);
		const spriteKey = (cursorType in this.cursorSprites ? cursorType : "arrow") as CursorAssetKey;
		const asset = getCursorAsset(spriteKey);
		const shadowSprite = this.cursorShadowSprites[spriteKey] ?? this.cursorShadowSprites.arrow!;
		const sprite = this.cursorSprites[spriteKey] ?? this.cursorSprites.arrow!;
		const bounceScale = Math.max(
			0.72,
			1 - Math.sin(clickBounceProgress * Math.PI) * (0.08 * this.config.clickBounce),
		);
		const scaledH = h;

		this.clickRingGraphics.clear();
		drawClickRing(this.clickRingGraphics, px, py, h, clickProgress);

		for (const [key, currentShadowSprite] of Object.entries(this.cursorShadowSprites) as Array<
			[CursorAssetKey, Sprite]
		>) {
			currentShadowSprite.visible = key === spriteKey;
		}

		for (const [key, currentSprite] of Object.entries(this.cursorSprites) as Array<
			[CursorAssetKey, Sprite]
		>) {
			currentSprite.visible = key === spriteKey;
		}

		if (shadowSprite) {
			shadowSprite.height = scaledH * bounceScale;
			shadowSprite.width = scaledH * bounceScale * asset.aspectRatio;
			shadowSprite.position.set(px + CURSOR_SHADOW_OFFSET_X, py + CURSOR_SHADOW_OFFSET_Y);
		}

		if (sprite) {
			sprite.alpha = this.config.dotAlpha;
			sprite.height = scaledH * bounceScale;
			sprite.width = scaledH * bounceScale * asset.aspectRatio;
			sprite.position.set(px, py);
		}

		this.applyCursorMotionBlur(px, py, timeMs, freeze);
		this.lastRenderedPoint = { px, py };
		this.lastRenderedTimeMs = timeMs;
	}

	private applyCursorMotionBlur(px: number, py: number, timeMs: number, freeze: boolean) {
		if (
			freeze ||
			this.config.motionBlur <= 0 ||
			!this.lastRenderedPoint ||
			this.lastRenderedTimeMs === null
		) {
			this.cursorMotionBlurFilter.velocity = { x: 0, y: 0 };
			this.cursorMotionBlurFilter.kernelSize = 5;
			this.cursorMotionBlurFilter.offset = 0;
			return;
		}

		const deltaMs = Math.max(1, timeMs - this.lastRenderedTimeMs);
		const dx = px - this.lastRenderedPoint.px;
		const dy = py - this.lastRenderedPoint.py;
		const velocityScale =
			(1000 / deltaMs) * this.config.motionBlur * CURSOR_MOTION_BLUR_BASE_MULTIPLIER;
		const velocity = {
			x: dx * velocityScale,
			y: dy * velocityScale,
		};
		const magnitude = Math.hypot(velocity.x, velocity.y);

		this.cursorMotionBlurFilter.velocity = magnitude > 0.05 ? velocity : { x: 0, y: 0 };
		this.cursorMotionBlurFilter.kernelSize = magnitude > 3 ? 9 : magnitude > 1 ? 7 : 5;
		this.cursorMotionBlurFilter.offset = magnitude > 0.5 ? -0.25 : 0;
	}

	reset(): void {
		this.state.reset();
		this.clickRingGraphics.clear();
		for (const shadowSprite of Object.values(this.cursorShadowSprites)) {
			shadowSprite.visible = false;
			shadowSprite.scale.set(1);
		}
		for (const sprite of Object.values(this.cursorSprites)) {
			sprite.visible = false;
			sprite.scale.set(1);
		}
		this.container.visible = false;
		this.lastRenderedPoint = null;
		this.lastRenderedTimeMs = null;
		this.cursorMotionBlurFilter.velocity = { x: 0, y: 0 };
		this.cursorMotionBlurFilter.kernelSize = 5;
		this.cursorMotionBlurFilter.offset = 0;
	}

	destroy(): void {
		this.clickRingGraphics.destroy();
		for (const shadowFilter of Object.values(this.cursorShadowFilters)) {
			shadowFilter.destroy();
		}
		this.cursorMotionBlurFilter.destroy();
		this.container.destroy({ children: true });
		cursorAssetsPromise = null;
		loadedCursorAssets = {};
	}
}

export function drawCursorOnCanvas(
	ctx: CanvasRenderingContext2D,
	samples: CursorTelemetryPoint[],
	timeMs: number,
	viewport: CursorViewportRect,
	smoothedState: SmoothedCursorState,
	config: CursorRenderConfig = DEFAULT_CURSOR_CONFIG,
): void {
	if (samples.length === 0 || viewport.width <= 0 || viewport.height <= 0) return;

	const target = interpolateCursorPosition(samples, timeMs);
	if (!target) return;

	smoothedState.update(target.cx, target.cy, timeMs);

	const px = viewport.x + smoothedState.x * viewport.width;
	const py = viewport.y + smoothedState.y * viewport.height;
	const h = config.dotRadius * getCursorViewportScale(viewport);
	const { cursorType, clickBounceProgress } = getCursorVisualState(samples, timeMs);
	const spriteKey = (
		cursorType && loadedCursorAssets[cursorType] ? cursorType : "arrow"
	) as CursorAssetKey;
	const asset = getCursorAsset(spriteKey);
	const bounceScale = Math.max(
		0.72,
		1 - Math.sin(clickBounceProgress * Math.PI) * (0.08 * config.clickBounce),
	);

	ctx.save();
	ctx.filter = CURSOR_SVG_DROP_SHADOW_FILTER;

	const drawHeight = h * bounceScale;
	const drawWidth = drawHeight * asset.aspectRatio;
	const hotspotX = asset.anchorX * drawWidth;
	const hotspotY = asset.anchorY * drawHeight;
	ctx.globalAlpha = config.dotAlpha;
	ctx.drawImage(asset.image, px - hotspotX, py - hotspotY, drawWidth, drawHeight);

	ctx.restore();
}
