import { unlink } from "node:fs/promises";
import { createServer, type Server, type Socket } from "node:net";

export type IpcHandler = (params: unknown) => Promise<unknown>;

export interface IpcRequest {
	id: string;
	method: string;
	params?: unknown;
}

export interface IpcResponse {
	id: string;
	result?: unknown;
	error?: { code: number; message: string };
}

export class IpcSocketServer {
	private server: Server | undefined;
	private handlers = new Map<string, IpcHandler>();

	constructor(private readonly sockPath: string) {}

	register(method: string, handler: IpcHandler): void {
		this.handlers.set(method, handler);
	}

	async listen(): Promise<void> {
		await unlink(this.sockPath).catch(() => {
			/* not present, fine */
		});
		return new Promise((resolve, reject) => {
			this.server = createServer((sock) => this.onConnection(sock));
			this.server.once("error", reject);
			this.server.listen(this.sockPath, () => resolve());
		});
	}

	async close(): Promise<void> {
		if (!this.server) return;
		return new Promise((resolve) => {
			this.server?.close(() => {
				unlink(this.sockPath)
					.catch(() => undefined)
					.then(() => resolve());
			});
		});
	}

	private onConnection(sock: Socket): void {
		let buf = "";
		sock.on("data", async (chunk) => {
			buf += chunk.toString("utf8");
			let nl = buf.indexOf("\n");
			while (nl >= 0) {
				const line = buf.slice(0, nl);
				buf = buf.slice(nl + 1);
				await this.handleLine(line, sock);
				nl = buf.indexOf("\n");
			}
		});
	}

	private async handleLine(line: string, sock: Socket): Promise<void> {
		let req: IpcRequest;
		try {
			req = JSON.parse(line);
		} catch {
			sock.write(
				`${JSON.stringify({ id: "0", error: { code: -32700, message: "Parse error" } })}\n`,
			);
			return;
		}

		const handler = this.handlers.get(req.method);
		if (!handler) {
			sock.write(
				`${JSON.stringify({
					id: req.id,
					error: { code: -32601, message: `Method not found: ${req.method}` },
				})}\n`,
			);
			return;
		}

		try {
			const result = await handler(req.params ?? {});
			const resp: IpcResponse = { id: req.id, result };
			sock.write(`${JSON.stringify(resp)}\n`);
		} catch (err) {
			const resp: IpcResponse = {
				id: req.id,
				error: { code: -32000, message: (err as Error).message },
			};
			sock.write(`${JSON.stringify(resp)}\n`);
		}
	}
}
