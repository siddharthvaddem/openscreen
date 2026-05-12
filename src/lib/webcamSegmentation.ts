import { FilesetResolver, ImageSegmenter, type MPMask } from "@mediapipe/tasks-vision";
import type { WebcamBackgroundMode } from "./webcamSegmentation.types";

let segmenterPromise: Promise<ImageSegmenter> | null = null;

async function getSegmenter(): Promise<ImageSegmenter> {
	if (!segmenterPromise) {
		const base = import.meta.env.BASE_URL ?? "/";
		segmenterPromise = (async () => {
			const fileset = await FilesetResolver.forVisionTasks(`${base}wasm/mediapipe`);
			return ImageSegmenter.createFromOptions(fileset, {
				baseOptions: {
					modelAssetPath: `${base}models/selfie_segmenter_landscape.tflite`,
					delegate: "GPU",
				},
				runningMode: "VIDEO",
				outputCategoryMask: false,
				outputConfidenceMasks: true,
			});
		})().catch((err) => {
			segmenterPromise = null;
			throw err;
		});
	}
	return segmenterPromise;
}

type VideoWithFrameCallback = HTMLVideoElement & {
	requestVideoFrameCallback?: (cb: (now: number) => void) => number;
	cancelVideoFrameCallback?: (handle: number) => void;
};

export class WebcamSegmentationRenderer {
	private readonly video: VideoWithFrameCallback;
	private readonly canvas: HTMLCanvasElement;
	private readonly ctx: CanvasRenderingContext2D;
	private readonly maskCanvas: HTMLCanvasElement;
	private readonly maskCtx: CanvasRenderingContext2D;
	private readonly fgCanvas: HTMLCanvasElement;
	private readonly fgCtx: CanvasRenderingContext2D;
	private mode: WebcamBackgroundMode;
	private rafHandle: number | null = null;
	private vfcHandle: number | null = null;
	private disposed = false;
	private segmenter: ImageSegmenter | null = null;
	private lastTs = -1;

	constructor(video: HTMLVideoElement, canvas: HTMLCanvasElement, mode: WebcamBackgroundMode) {
		this.video = video as VideoWithFrameCallback;
		this.canvas = canvas;
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("WebcamSegmentationRenderer: no 2d context");
		this.ctx = ctx;
		this.maskCanvas = document.createElement("canvas");
		this.maskCtx = this.maskCanvas.getContext("2d") as CanvasRenderingContext2D;
		this.fgCanvas = document.createElement("canvas");
		this.fgCtx = this.fgCanvas.getContext("2d") as CanvasRenderingContext2D;
		this.mode = mode;
	}

	async start(): Promise<void> {
		try {
			this.segmenter = await getSegmenter();
		} catch (err) {
			console.error("[webcam-seg] failed to load segmenter", err);
			return;
		}
		if (this.disposed) return;
		this.schedule();
	}

	setMode(mode: WebcamBackgroundMode): void {
		this.mode = mode;
	}

	dispose(): void {
		this.disposed = true;
		if (this.rafHandle != null) {
			cancelAnimationFrame(this.rafHandle);
			this.rafHandle = null;
		}
		if (this.vfcHandle != null && this.video.cancelVideoFrameCallback) {
			this.video.cancelVideoFrameCallback(this.vfcHandle);
			this.vfcHandle = null;
		}
	}

	private schedule(): void {
		if (this.disposed) return;
		if (typeof this.video.requestVideoFrameCallback === "function") {
			this.vfcHandle = this.video.requestVideoFrameCallback(() => {
				this.renderFrame();
				this.schedule();
			});
		} else {
			this.rafHandle = requestAnimationFrame(() => {
				this.renderFrame();
				this.schedule();
			});
		}
	}

	private renderFrame(): void {
		if (this.disposed || !this.segmenter) return;
		const v = this.video;
		if (v.readyState < 2 || v.videoWidth === 0 || v.videoHeight === 0) return;

		const w = v.videoWidth;
		const h = v.videoHeight;
		if (this.canvas.width !== w) this.canvas.width = w;
		if (this.canvas.height !== h) this.canvas.height = h;

		const ts = performance.now();
		if (ts <= this.lastTs) return;
		this.lastTs = ts;

		this.segmenter.segmentForVideo(v, ts, (result) => {
			const mask = result.confidenceMasks?.[0];
			if (mask) {
				try {
					this.composite(mask);
				} catch (err) {
					console.error("[webcam-seg] composite failed", err);
				}
			}
			result.close();
		});
	}

	private composite(mask: MPMask): void {
		const ctx = this.ctx;
		const v = this.video;
		const w = this.canvas.width;
		const h = this.canvas.height;

		const data = mask.getAsFloat32Array();
		const mw = mask.width;
		const mh = mask.height;
		if (this.maskCanvas.width !== mw) this.maskCanvas.width = mw;
		if (this.maskCanvas.height !== mh) this.maskCanvas.height = mh;
		const img = this.maskCtx.createImageData(mw, mh);
		const pixels = img.data;
		for (let i = 0; i < data.length; i++) {
			const a = data[i] * 255;
			const j = i * 4;
			pixels[j] = 255;
			pixels[j + 1] = 255;
			pixels[j + 2] = 255;
			pixels[j + 3] = a;
		}
		this.maskCtx.putImageData(img, 0, 0);

		ctx.save();
		ctx.globalCompositeOperation = "source-over";
		ctx.clearRect(0, 0, w, h);

		if (this.mode === "blur") {
			ctx.filter = "blur(16px)";
			ctx.drawImage(v, 0, 0, w, h);
			ctx.filter = "none";
		}

		const fg = this.fgCanvas;
		const fgCtx = this.fgCtx;
		if (fg.width !== w) fg.width = w;
		if (fg.height !== h) fg.height = h;
		fgCtx.save();
		fgCtx.globalCompositeOperation = "source-over";
		fgCtx.clearRect(0, 0, w, h);
		fgCtx.filter = "blur(1px)";
		fgCtx.drawImage(this.maskCanvas, 0, 0, w, h);
		fgCtx.filter = "none";
		fgCtx.globalCompositeOperation = "source-in";
		fgCtx.drawImage(v, 0, 0, w, h);
		fgCtx.restore();

		ctx.drawImage(fg, 0, 0);
		ctx.restore();
	}
}
