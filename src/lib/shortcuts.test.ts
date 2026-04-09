import { describe, expect, it } from "vitest";
import { getBindingKeyFromKeyboardEvent, matchesShortcut } from "./shortcuts";

describe("getBindingKeyFromKeyboardEvent", () => {
	it("uses physical key codes for alphabet shortcuts so IME input still maps to latin keys", () => {
		expect(getBindingKeyFromKeyboardEvent({ key: "ㅁ", code: "KeyA" } as KeyboardEvent)).toBe("a");
		expect(getBindingKeyFromKeyboardEvent({ key: "ㄴ", code: "KeyT" } as KeyboardEvent)).toBe("t");
	});

	it("keeps special keys based on event.key", () => {
		expect(getBindingKeyFromKeyboardEvent({ key: "Tab", code: "Tab" } as KeyboardEvent)).toBe(
			"tab",
		);
		expect(
			getBindingKeyFromKeyboardEvent({ key: "Backspace", code: "Backspace" } as KeyboardEvent),
		).toBe("backspace");
	});
});

describe("matchesShortcut", () => {
	it("matches letter shortcuts by physical key even when keyboard input is Korean", () => {
		const event = {
			key: "ㅁ",
			code: "KeyA",
			metaKey: false,
			ctrlKey: false,
			shiftKey: false,
			altKey: false,
		} as KeyboardEvent;

		expect(matchesShortcut(event, { key: "a" }, true)).toBe(true);
	});

	it("still respects modifiers when matching physical keys", () => {
		const event = {
			key: "ㅇ",
			code: "KeyD",
			metaKey: true,
			ctrlKey: false,
			shiftKey: false,
			altKey: false,
		} as KeyboardEvent;

		expect(matchesShortcut(event, { key: "d", ctrl: true }, true)).toBe(true);
		expect(matchesShortcut(event, { key: "d" }, true)).toBe(false);
	});
});
