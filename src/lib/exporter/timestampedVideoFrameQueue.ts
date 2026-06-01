type TimestampedVideoFrame = {
	frame: VideoFrame;
	sourceTimestampMs: number;
};

type PendingConsumer = {
	resolve: () => void;
	reject: (error: Error) => void;
};

const TIMESTAMP_EPSILON_MS = 0.5;

export class TimestampedVideoFrameQueue {
	private frames: TimestampedVideoFrame[] = [];
	private consumers: PendingConsumer[] = [];
	private error: Error | null = null;
	private closed = false;
	private heldFrame: TimestampedVideoFrame | null = null;

	get length() {
		return this.frames.length;
	}

	enqueue(frame: VideoFrame, sourceTimestampMs: number) {
		if (this.closed) {
			frame.close();
			return;
		}

		this.frames.push({ frame, sourceTimestampMs });
		const consumers = this.consumers.splice(0);
		for (const consumer of consumers) {
			consumer.resolve();
		}
	}

	fail(error: Error) {
		this.error = error;
		this.closed = true;
		const consumers = this.consumers.splice(0);
		for (const consumer of consumers) {
			consumer.reject(error);
		}
		this.closeOwnedFrames();
	}

	close() {
		this.closed = true;
		const consumers = this.consumers.splice(0);
		for (const consumer of consumers) {
			consumer.resolve();
		}
	}

	async frameAt(sourceTimestampMs: number): Promise<VideoFrame | null> {
		for (;;) {
			if (this.error) {
				throw this.error;
			}

			const next = this.frames[0] ?? null;
			if (next && next.sourceTimestampMs <= sourceTimestampMs + TIMESTAMP_EPSILON_MS) {
				this.replaceHeldFrame(this.frames.shift() ?? null);
				continue;
			}

			if (
				this.heldFrame &&
				(next ||
					this.closed ||
					this.heldFrame.sourceTimestampMs >= sourceTimestampMs - TIMESTAMP_EPSILON_MS)
			) {
				return new VideoFrame(this.heldFrame.frame, {
					timestamp: this.heldFrame.frame.timestamp,
				});
			}

			if (next || this.closed) {
				return null;
			}

			await new Promise<void>((resolve, reject) => {
				this.consumers.push({ resolve, reject });
			});
		}
	}

	destroy() {
		this.close();
		this.closeOwnedFrames();
	}

	private replaceHeldFrame(frame: TimestampedVideoFrame | null) {
		if (this.heldFrame) {
			this.heldFrame.frame.close();
		}
		this.heldFrame = frame;
	}

	private closeOwnedFrames() {
		if (this.heldFrame) {
			this.heldFrame.frame.close();
			this.heldFrame = null;
		}
		for (const item of this.frames) {
			item.frame.close();
		}
		this.frames = [];
	}
}
