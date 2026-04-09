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
	{ name: "autoscreen-test-client", version: "0.1.0" },
	{ capabilities: {} },
);

await client.connect(transport);
const tools = await client.listTools();
const state = await client.callTool({ name: "get_project_state", arguments: {} });
console.log(
	JSON.stringify(
		{
			preflight,
			toolNames: tools.tools.map((t) => t.name),
			state,
		},
		null,
		2,
	),
);
await transport.close();
