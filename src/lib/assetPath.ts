export class UnsafeAssetPathError extends Error {
	constructor(segment: string) {
		super(`Unsafe asset path segment: ${segment}`);
		this.name = "UnsafeAssetPathError";
	}
}

export class AssetBaseUnavailableError extends Error {
	constructor() {
		super("electronAPI.assetBaseUrl is not available; preload did not load correctly");
		this.name = "AssetBaseUnavailableError";
	}
}

function encodeRelativeAssetPath(relativePath: string): string {
	return relativePath
		.replace(/^\/+/, "")
		.split("/")
		.filter(Boolean)
		.map((part) => {
			const decoded = decodeURIComponent(part);
			if (decoded === "." || decoded === "..") {
				throw new UnsafeAssetPathError(decoded);
			}
			return encodeURIComponent(decoded);
		})
		.join("/");
}

function ensureTrailingSlash(value: string): string {
	return value.endsWith("/") ? value : `${value}/`;
}

export function getAssetPath(relativePath: string): string {
	const encoded = encodeRelativeAssetPath(relativePath);

	if (typeof window === "undefined") {
		return `/${encoded}`;
	}

	if (window.location?.protocol?.startsWith("http")) {
		return `/${encoded}`;
	}

	const base = window.electronAPI?.assetBaseUrl;
	if (!base) {
		throw new AssetBaseUnavailableError();
	}
	return new URL(encoded, ensureTrailingSlash(base)).toString();
}

export default getAssetPath;
