// Validating argument parsers for commander `.option(..., parser)`.
// Throws with a clear message instead of silently coercing to NaN/false/etc.
// Commander catches thrown errors here and emits them via the usual error path.

import { InvalidArgumentError } from "commander";

// Strict integer literal: optional sign, one-or-more digits, no decimals,
// no trailing junk. Catches `"+5"`, `"-0"`, `"05"` correctly, rejects `"5.0"`,
// `"10%"`, `"1x"`, `" 5 "` (commander already trims the surrounding value).
const INT_PATTERN = /^[+-]?\d+$/;
// Strict float literal: optional sign, digits with optional fractional part,
// optional exponent. `Number.parseFloat` alone silently accepts `"10%"` /
// `"0.5foo"` because it parses the leading numeric prefix and discards the
// rest — this regex blocks that.
const FLOAT_PATTERN = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

export function parseIntArg(flagName: string) {
	return (value: string): number => {
		const trimmed = value.trim();
		if (!INT_PATTERN.test(trimmed)) {
			throw new InvalidArgumentError(`${flagName} expects an integer, got "${value}".`);
		}
		const parsed = Number.parseInt(trimmed, 10);
		if (!Number.isFinite(parsed)) {
			throw new InvalidArgumentError(`${flagName} expects a finite integer, got "${value}".`);
		}
		return parsed;
	};
}

export function parseFloatArg(flagName: string, min?: number, max?: number) {
	return (value: string): number => {
		const trimmed = value.trim();
		if (!FLOAT_PATTERN.test(trimmed)) {
			throw new InvalidArgumentError(`${flagName} expects a number, got "${value}".`);
		}
		const parsed = Number.parseFloat(trimmed);
		if (!Number.isFinite(parsed)) {
			throw new InvalidArgumentError(`${flagName} expects a finite number, got "${value}".`);
		}
		if (typeof min === "number" && parsed < min) {
			throw new InvalidArgumentError(`${flagName} must be >= ${min}, got ${parsed}.`);
		}
		if (typeof max === "number" && parsed > max) {
			throw new InvalidArgumentError(`${flagName} must be <= ${max}, got ${parsed}.`);
		}
		return parsed;
	};
}

export function parseIntInRange(flagName: string, min: number, max: number) {
	const intParser = parseIntArg(flagName);
	return (value: string): number => {
		const parsed = intParser(value);
		if (parsed < min || parsed > max) {
			throw new InvalidArgumentError(
				`${flagName} must be between ${min} and ${max}, got ${parsed}.`,
			);
		}
		return parsed;
	};
}

// Strict boolean: rejects unknown literals instead of quietly coercing them
// to false. Accepts only the canonical true/false set.
const BOOL_TRUE = new Set(["true", "1", "yes", "y"]);
const BOOL_FALSE = new Set(["false", "0", "no", "n"]);

export function parseBoolStrict(flagName: string) {
	return (value: string): boolean => {
		const normalized = value.trim().toLowerCase();
		if (BOOL_TRUE.has(normalized)) return true;
		if (BOOL_FALSE.has(normalized)) return false;
		throw new InvalidArgumentError(
			`${flagName} expects a boolean (true|false|1|0|yes|y|no|n), got "${value}".`,
		);
	};
}
