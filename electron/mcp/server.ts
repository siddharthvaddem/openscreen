import { randomUUID } from "node:crypto";
import type { Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import express, { type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import type {
	AddSpeedRegionInput,
	AddTrimRegionInput,
	AutoEditOptions,
	EditorCommandName,
	ExportVideoCommandInput,
	ProjectStateSnapshot,
} from "../../src/editor/commands/types";
import type { LocalMcpAuthState } from "./auth";
import { createLocalMcpAuthState, isValidBearerToken, rotateLocalMcpToken } from "./auth";

interface ElectronCommandBridge {
	requestEditorCommand<TName extends EditorCommandName>(
		command: TName,
		payload: unknown,
		timeoutMs?: number,
	): Promise<unknown>;
	getLatestEditorState(): ProjectStateSnapshot | null;
}

export interface AutoScreenMcpRuntime {
	enabled: boolean;
	url: string;
	token: string;
	resetToken: () => Promise<string>;
	close: () => Promise<void>;
}

function asJsonText(value: unknown) {
	return JSON.stringify(value, null, 2);
}

function textResult(value: unknown) {
	return {
		content: [
			{
				type: "text" as const,
				text: asJsonText(value),
			},
		],
	};
}

export async function startAutoScreenMcpServer(
	bridge: ElectronCommandBridge,
): Promise<AutoScreenMcpRuntime> {
	const authState: LocalMcpAuthState = createLocalMcpAuthState();
	const runtimes = new Map<
		string,
		{
			server: McpServer;
			transport: StreamableHTTPServerTransport;
		}
	>();

	const autoEditSchema = z.object({
		style: z.enum(["calm", "balanced", "emphasis"]),
		focusStrategy: z.enum(["cursor", "activity"]),
		pauseMode: z.enum(["off", "light", "balanced", "aggressive"]),
		backgroundMode: z.enum(["keep", "remove"]),
	});

	const trimSchema = z.object({
		startMs: z.number().nonnegative(),
		endMs: z.number().nonnegative(),
	});

	const speedSchema = trimSchema.extend({
		speed: z.number().positive().optional(),
	});

	const zoomSchema = trimSchema.extend({
		depth: z.number().int().min(1).max(6).optional(),
		focus: z
			.object({
				cx: z.number(),
				cy: z.number(),
			})
			.optional(),
		focusMode: z.enum(["manual", "auto"]).optional(),
	});

	const exportSchema = z.object({
		settings: z.object({
			format: z.enum(["mp4", "gif"]),
			quality: z.enum(["medium", "good", "source"]).optional(),
			gifConfig: z.any().optional(),
		}),
	});

	function createServerRuntime() {
		const mcpServer = new McpServer({
			name: "auto-screen-local",
			version: "0.1.0",
		});

		async function runCommand<TName extends EditorCommandName>(command: TName, payload: unknown) {
			const result = await bridge.requestEditorCommand(
				command,
				payload,
				command === "export_video" ? 120_000 : 20_000,
			);
			return textResult(result);
		}

		async function getProjectStateResult() {
			try {
				const result = await bridge.requestEditorCommand("get_project_state", undefined, 20_000);
				return textResult(result);
			} catch (error) {
				const latestState = bridge.getLatestEditorState();
				if (latestState) {
					return textResult({
						state: latestState,
						source: "cached",
						warning: "Editor window is not available. Returning the latest published snapshot.",
					});
				}
				return textResult({
					state: null,
					source: "unavailable",
					error: error instanceof Error ? error.message : String(error),
					warning:
						"Editor window is not available yet. Open the editor once to publish project state.",
				});
			}
		}

		mcpServer.registerTool(
			"get_project_state",
			{
				description: "Return the current Auto Screen project state snapshot.",
			},
			async () => getProjectStateResult(),
		);

		mcpServer.registerTool(
			"remove_background",
			{
				description: "Apply the backgroundless preset to the current project.",
			},
			async () => runCommand("remove_background", undefined),
		);

		mcpServer.registerTool(
			"set_background",
			{
				description:
					"Set the current project background wallpaper. Use 'none' for transparent/backgroundless.",
				inputSchema: {
					wallpaper: z.string(),
				},
			},
			async (input) => runCommand("set_background", input),
		);

		mcpServer.registerTool(
			"apply_auto_edit",
			{
				description: "Run the built-in auto edit routine over the current project.",
				inputSchema: autoEditSchema,
			},
			async (input: AutoEditOptions) => runCommand("apply_auto_edit", input),
		);

		mcpServer.registerTool(
			"add_trim_region",
			{
				description: "Add a trim/exclusion region to the current project timeline.",
				inputSchema: trimSchema,
			},
			async (input: AddTrimRegionInput) => runCommand("add_trim_region", input),
		);

		mcpServer.registerTool(
			"add_speed_region",
			{
				description: "Add a speed region to the current project timeline.",
				inputSchema: speedSchema,
			},
			async (input: AddSpeedRegionInput) => runCommand("add_speed_region", input),
		);

		mcpServer.registerTool(
			"add_zoom_region",
			{
				description: "Add a zoom region to the current project timeline.",
				inputSchema: zoomSchema,
			},
			async (input) => runCommand("add_zoom_region", input),
		);

		mcpServer.registerTool(
			"undo",
			{
				description: "Undo the last project edit.",
			},
			async () => runCommand("undo", undefined),
		);

		mcpServer.registerTool(
			"redo",
			{
				description: "Redo the last undone project edit.",
			},
			async () => runCommand("redo", undefined),
		);

		mcpServer.registerTool(
			"export_video",
			{
				description: "Export the current project using the current renderer-side export pipeline.",
				inputSchema: exportSchema,
			},
			async (input: ExportVideoCommandInput) => runCommand("export_video", input),
		);

		return mcpServer;
	}

	function getSessionIdFromRequest(req: Request) {
		const sessionHeader = req.header("mcp-session-id");
		return sessionHeader && sessionHeader.length > 0 ? sessionHeader : null;
	}

	async function cleanupRuntime(sessionId: string, options?: { closeTransport?: boolean }) {
		const runtime = runtimes.get(sessionId);
		if (!runtime) {
			return;
		}
		runtimes.delete(sessionId);
		await runtime.server.close();
		if (options?.closeTransport !== false) {
			await runtime.transport.close();
		}
	}

	async function createSessionRuntime(req: Request, res: Response) {
		const transport = new StreamableHTTPServerTransport({
			sessionIdGenerator: () => randomUUID(),
			onsessioninitialized: (sessionId) => {
				console.log(`[Auto Screen MCP] session initialized: ${sessionId}`);
				runtimes.set(sessionId, { server, transport });
			},
		});
		const server = createServerRuntime();
		transport.onclose = () => {
			const sessionId = transport.sessionId;
			if (sessionId) {
				console.log(`[Auto Screen MCP] session closed: ${sessionId}`);
				void cleanupRuntime(sessionId, { closeTransport: false });
			}
		};
		await server.connect(transport);
		try {
			await transport.handleRequest(req, res, req.body);
		} catch (error) {
			const sessionId = transport.sessionId;
			if (sessionId) {
				await cleanupRuntime(sessionId);
			}
			throw error;
		}
	}

	const app = express();
	app.use(express.json({ limit: "10mb" }));

	app.use("/mcp", (req: Request, res: Response, next: NextFunction) => {
		if (!isValidBearerToken(authState, req.header("authorization"))) {
			res.status(401).json({ error: "Unauthorized" });
			return;
		}
		next();
	});

	app.get("/mcp/session", (req: Request, res: Response) => {
		if (!isValidBearerToken(authState, req.header("authorization"))) {
			res.status(401).json({ error: "Unauthorized" });
			return;
		}
		res.json({
			ok: true,
			state: bridge.getLatestEditorState(),
		});
	});

	app.get("/mcp", async (req: Request, res: Response) => {
		const sessionId = getSessionIdFromRequest(req);
		if (!sessionId) {
			res.status(400).send("Missing MCP session ID");
			return;
		}
		const runtime = runtimes.get(sessionId);
		if (!runtime) {
			res.status(404).send("Unknown MCP session ID");
			return;
		}
		try {
			await runtime.transport.handleRequest(req, res);
		} catch (error) {
			console.error("[Auto Screen MCP] transport error", error);
			if (!res.headersSent) {
				res.status(500).send(error instanceof Error ? error.message : String(error));
			}
		}
	});

	app.post("/mcp", async (req: Request, res: Response) => {
		const sessionId = getSessionIdFromRequest(req);
		try {
			if (sessionId) {
				const runtime = runtimes.get(sessionId);
				if (!runtime) {
					console.warn(`[Auto Screen MCP] unknown session on POST: ${sessionId}`);
					res.status(404).json({ error: "Unknown MCP session ID" });
					return;
				}
				console.log(`[Auto Screen MCP] reusing session: ${sessionId}`);
				await runtime.transport.handleRequest(req, res, req.body);
				return;
			}

			if (!isInitializeRequest(req.body)) {
				res.status(400).json({ error: "Initialization request required before using MCP session" });
				return;
			}

			await createSessionRuntime(req, res);
		} catch (error) {
			console.error("[Auto Screen MCP] transport error", error);
			if (!res.headersSent) {
				res.status(500).send(error instanceof Error ? error.message : String(error));
			}
		}
	});

	app.delete("/mcp", async (req: Request, res: Response) => {
		const sessionId = getSessionIdFromRequest(req);
		if (!sessionId) {
			res.status(400).send("Missing MCP session ID");
			return;
		}
		const runtime = runtimes.get(sessionId);
		if (!runtime) {
			console.warn(`[Auto Screen MCP] unknown session on DELETE: ${sessionId}`);
			res.status(404).send("Unknown MCP session ID");
			return;
		}
		try {
			console.log(`[Auto Screen MCP] deleting session: ${sessionId}`);
			await runtime.transport.handleRequest(req, res, req.body);
		} catch (error) {
			console.error("[Auto Screen MCP] transport error", error);
			if (!res.headersSent) {
				res.status(500).send(error instanceof Error ? error.message : String(error));
			}
		}
	});

	const httpServer = await new Promise<HttpServer>((resolve) => {
		const server = app.listen(0, "127.0.0.1", () => resolve(server));
	});

	const address = httpServer.address() as AddressInfo;
	const url = `http://127.0.0.1:${address.port}/mcp`;

	const runtime: AutoScreenMcpRuntime = {
		enabled: true,
		url,
		token: authState.token,
		resetToken: async () => {
			const nextToken = rotateLocalMcpToken(authState);
			runtime.token = nextToken;
			for (const sessionId of [...runtimes.keys()]) {
				await cleanupRuntime(sessionId);
			}
			return nextToken;
		},
		close: async () => {
			for (const sessionId of [...runtimes.keys()]) {
				await cleanupRuntime(sessionId);
			}
			await new Promise<void>((resolve, reject) => {
				httpServer.close((error: Error | undefined) => {
					if (error) {
						reject(error);
						return;
					}
					resolve();
				});
			});
		},
	};
	return runtime;
}
