import { randomBytes } from "node:crypto";

export interface LocalMcpAuthState {
	token: string;
}

export function createLocalMcpAuthState(): LocalMcpAuthState {
	return {
		token: randomBytes(24).toString("hex"),
	};
}

export function rotateLocalMcpToken(authState: LocalMcpAuthState) {
	authState.token = randomBytes(24).toString("hex");
	return authState.token;
}

export function isValidBearerToken(
	authState: LocalMcpAuthState,
	authorizationHeader?: string | null,
) {
	if (!authorizationHeader) {
		return false;
	}
	const [scheme, token] = authorizationHeader.split(" ");
	return scheme === "Bearer" && token === authState.token;
}
