import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { runPreflight } from "./mcp-preflight.mjs";

const urlArg = process.argv[2];
const token = process.argv[3];
const preflight = await runPreflight(urlArg, token);
const url = new URL(urlArg);

const transport = new StreamableHTTPClientTransport(url, {
	requestInit: {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	},
});

const client = new Client(
	{ name: "autoscreen-mutation-test", version: "0.1.0" },
	{ capabilities: {} },
);
await client.connect(transport);

const setBg = await client.callTool({
	name: "set_background",
	arguments: { wallpaper: "none" },
});

const addZoom = await client.callTool({
	name: "add_zoom_region",
	arguments: { startMs: 1000, endMs: 2500, depth: 3, focus: { cx: 0.3, cy: 0.4 } },
});

const state = await client.callTool({ name: "get_project_state", arguments: {} });

console.log(JSON.stringify({ preflight, setBg, addZoom, state }, null, 2));
await transport.close();
