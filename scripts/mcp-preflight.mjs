async function readResponseText(response) {
	try {
		return await response.text();
	} catch {
		return "";
	}
}

export async function runPreflight(urlString, token) {
	if (!urlString || !token) {
		throw new Error("Usage: node <script> <mcp-url> <token>");
	}

	const url = new URL(urlString);
	const normalizedPath = url.pathname.endsWith("/") ? url.pathname.slice(0, -1) : url.pathname;
	const sessionUrl = new URL(`${normalizedPath}/session`, url.origin);

	const response = await fetch(sessionUrl, {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});

	if (!response.ok) {
		const body = await readResponseText(response);
		throw new Error(`MCP preflight failed (${response.status}): ${body || response.statusText}`);
	}

	const payload = await response.json();
	const state = payload?.state ?? null;

	return {
		url: url.toString(),
		sessionUrl: sessionUrl.toString(),
		hasPublishedState: state !== null,
		payload,
		warnings:
			state === null
				? [
						"Editor state is not published yet. Tool calls that require the editor may fail until the editor window is open.",
					]
				: [],
	};
}
