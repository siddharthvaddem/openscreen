import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { runPreflight } from "./mcp-preflight.mjs";

const urlArg = process.argv[2];
const token = process.argv[3];
const preflight = await runPreflight(urlArg, token);
const url = new URL(urlArg);
const transport = new StreamableHTTPClientTransport(url, {
	requestInit: { headers: { Authorization: `Bearer ${token}` } },
});
const client = new Client({ name: "autoscreen-demo-once", version: "0.1.0" }, { capabilities: {} });
await client.connect(transport);
const tools = await client.listTools();
const before = await client.callTool({ name: "get_project_state", arguments: {} });
const setBg = await client.callTool({ name: "set_background", arguments: { wallpaper: "none" } });
const addTrim = await client.callTool({
	name: "add_trim_region",
	arguments: { startMs: 1000, endMs: 2200 },
});
const addSpeed = await client.callTool({
	name: "add_speed_region",
	arguments: { startMs: 2500, endMs: 4200, speed: 2 },
});
const addZoom = await client.callTool({
	name: "add_zoom_region",
	arguments: { startMs: 5000, endMs: 6500, depth: 3, focus: { cx: 0.4, cy: 0.35 } },
});
const after = await client.callTool({ name: "get_project_state", arguments: {} });
console.log(
	JSON.stringify(
		{
			preflight,
			toolNames: tools.tools.map((t) => t.name),
			before,
			setBg,
			addTrim,
			addSpeed,
			addZoom,
			after,
		},
		null,
		2,
	),
);
await transport.close();
