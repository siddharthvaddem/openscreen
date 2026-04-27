/**
 * Hex-color utilities for the annotation Fill section.
 *
 * Fill is stored on `FigureData.fill` as a single canonical string in
 * `#RRGGBBAA` form (8-digit, alpha required when fill is set). The opacity
 * slider in the inspector is a *view* of the alpha byte; toggling fill off
 * sets `figureData.fill = undefined`. There is no separate alpha field.
 *
 * All functions throw on malformed input — this module is internal code, not
 * a user-input parser. Callers must not rely on silent fallbacks.
 */

/**
 * Structured representation of a parsed hex color.
 *
 * `rgb` is always `#RRGGBB` (lowercase, with leading `#`).
 * `alpha` is an integer in the closed range `[0, 255]`. When the input was a
 * 6-digit hex (no alpha component), `alpha` defaults to `255` (fully opaque).
 */
export interface ParsedHexColor {
	readonly rgb: string;
	readonly alpha: number;
}

const HEX_COLOR_REGEX = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i;

/**
 * Parse a `#RRGGBB` or `#RRGGBBAA` hex color (case-insensitive) into its RGB
 * and alpha components. Throws on malformed input.
 */
export function parseHexColor(hex: string): ParsedHexColor {
	const match = HEX_COLOR_REGEX.exec(hex);
	if (match === null) {
		throw new Error(`Invalid hex color: ${hex}`);
	}
	const rgbHex = match[1].toLowerCase();
	const alphaHex = match[2];
	const alpha = alphaHex === undefined ? 255 : Number.parseInt(alphaHex, 16);
	return { rgb: `#${rgbHex}`, alpha };
}

/**
 * Format an RGB hex (`#RRGGBB`) plus an integer alpha byte (0-255) into a
 * canonical `#RRGGBBAA` string. Lowercase, alpha is zero-padded to 2 digits.
 *
 * Throws if `rgb` is not `#RRGGBB` or `alpha` is not an integer in [0, 255].
 */
export function formatHexColor(rgb: string, alpha: number): string {
	const match = HEX_COLOR_REGEX.exec(rgb);
	if (match === null || match[2] !== undefined) {
		throw new Error(`Invalid RGB hex (expected #RRGGBB): ${rgb}`);
	}
	if (!Number.isInteger(alpha) || alpha < 0 || alpha > 255) {
		throw new Error(`Invalid alpha byte (expected integer 0-255): ${alpha}`);
	}
	const rgbLower = match[1].toLowerCase();
	const alphaHex = alpha.toString(16).padStart(2, "0");
	return `#${rgbLower}${alphaHex}`;
}

/**
 * Convenience: take any `#RRGGBB` or `#RRGGBBAA` color, replace its alpha
 * byte with the supplied one, and return the canonical `#RRGGBBAA` form.
 *
 * Throws if `color` is malformed or `alpha` is out of range.
 */
export function withAlpha(color: string, alpha: number): string {
	const parsed = parseHexColor(color);
	return formatHexColor(parsed.rgb, alpha);
}

/**
 * Extract the alpha byte (0-255) from a `#RRGGBB` or `#RRGGBBAA` hex string.
 * Throws on malformed input. A 6-digit hex resolves to `255`.
 */
export function getAlpha(fill: string): number {
	return parseHexColor(fill).alpha;
}

/**
 * Convert an alpha byte (0-255) to an integer percent (0-100). The result is
 * rounded to the nearest int. Throws on non-finite or out-of-range input.
 */
export function alphaToPercent(alpha: number): number {
	if (!Number.isFinite(alpha) || alpha < 0 || alpha > 255) {
		throw new Error(`alphaToPercent: invalid alpha (expected finite 0-255): ${alpha}`);
	}
	return Math.round((alpha / 255) * 100);
}

/**
 * Convert an integer percent (0-100) to an alpha byte (0-255). The result is
 * rounded to the nearest int. Throws on non-finite or out-of-range input.
 */
export function percentToAlpha(percent: number): number {
	if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
		throw new Error(`percentToAlpha: invalid percent (expected finite 0-100): ${percent}`);
	}
	return Math.round((percent / 100) * 255);
}

/**
 * Cheap structural check for a `#RRGGBB` or `#RRGGBBAA` hex color string.
 * Use this to gate untrusted input before passing to `parseHexColor` /
 * `withAlpha` (which throw on malformed input).
 */
export function isValidHexColor(value: unknown): value is string {
	return typeof value === "string" && HEX_COLOR_REGEX.test(value);
}
