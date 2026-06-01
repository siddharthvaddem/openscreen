import { mkdtemp, rm } from "node:fs/promises";
import { createConnection } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { IpcSocketServer } from "../ipc-socket-server.js";

let tmp: string;
let server: IpcSocketServer | undefined;

afterEach(async () => {
	if (server) await server.close();
	if (tmp) await rm(tmp, { recursive: true, force: true });
});

async function newServer() {
	tmp = await mkdtemp(join(tmpdir(), "osm-test-"));
	const sockPath = join(tmp, "test.sock");
	server = new IpcSocketServer(sockPath);
	await server.listen();
	return { server, sockPath };
}

function sendRequest(sockPath: string, payload: object): Promise<string> {
	return new Promise((resolve, reject) => {
		const client = createConnection(sockPath, () => {
			client.write(`${JSON.stringify(payload)}\n`);
		});
		let buf = "";
		client.on("data", (chunk) => {
			buf += chunk.toString();
			const nl = buf.indexOf("\n");
			if (nl >= 0) {
				resolve(buf.slice(0, nl));
				client.end();
			}
		});
		client.on("error", reject);
	});
}

describe("IpcSocketServer", () => {
	it("returns -32601 when method has no handler", async () => {
		const { sockPath } = await newServer();
		const raw = await sendRequest(sockPath, { id: "1", method: "unknown.method", params: {} });
		const resp = JSON.parse(raw);
		expect(resp.id).toBe("1");
		expect(resp.error.code).toBe(-32601);
	});

	it("dispatches to a registered handler and returns its result", async () => {
		const { server, sockPath } = await newServer();
		server.register("echo.test", async (params) => ({ echoed: params }));
		const raw = await sendRequest(sockPath, { id: "2", method: "echo.test", params: { hi: true } });
		const resp = JSON.parse(raw);
		expect(resp.result).toEqual({ echoed: { hi: true } });
	});

	it("returns -32700 when input is not valid JSON", async () => {
		const { sockPath } = await newServer();
		const raw = await new Promise<string>((resolve, reject) => {
			const c = createConnection(sockPath, () => c.write("not-json\n"));
			let b = "";
			c.on("data", (chunk) => {
				b += chunk.toString();
				const nl = b.indexOf("\n");
				if (nl >= 0) {
					resolve(b.slice(0, nl));
					c.end();
				}
			});
			c.on("error", reject);
		});
		const resp = JSON.parse(raw);
		expect(resp.error.code).toBe(-32700);
	});
});
