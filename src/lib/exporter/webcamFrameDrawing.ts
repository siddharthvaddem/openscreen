interface WebcamFrameCrop {
	x: number;
	y: number;
	width: number;
	height: number;
}

export type WebcamCanvasContext = Pick<
	CanvasRenderingContext2D,
	"drawImage" | "restore" | "save" | "scale" | "translate"
>;

export function drawWebcamFrameImage(
	ctx: WebcamCanvasContext,
	image: CanvasImageSource,
	crop: WebcamFrameCrop,
	dest: WebcamFrameCrop,
	mirrored = false,
) {
	if (mirrored) {
		ctx.save();
		try {
			ctx.translate(dest.x + dest.width, dest.y);
			ctx.scale(-1, 1);
			ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, dest.width, dest.height);
		} finally {
			ctx.restore();
		}
		return;
	}

	ctx.drawImage(
		image,
		crop.x,
		crop.y,
		crop.width,
		crop.height,
		dest.x,
		dest.y,
		dest.width,
		dest.height,
	);
}
