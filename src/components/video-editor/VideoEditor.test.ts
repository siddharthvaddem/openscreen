import { describe, expect, it } from "vitest";
import { hasUnsavedProjectChanges } from "./VideoEditor";

describe("hasUnsavedProjectChanges", () => {
	it("treats a new unsaved project with edits as dirty", () => {
		expect(hasUnsavedProjectChanges('{"editor":{"trimRegions":[1]}}', null)).toBe(true);
	});

	it("treats a saved project with unchanged snapshot as clean", () => {
		const snapshot = '{"editor":{"trimRegions":[1]}}';
		expect(hasUnsavedProjectChanges(snapshot, snapshot)).toBe(false);
	});

	it("treats a saved project with changed snapshot as dirty", () => {
		expect(
			hasUnsavedProjectChanges(
				'{"editor":{"trimRegions":[1,2]}}',
				'{"editor":{"trimRegions":[1]}}',
			),
		).toBe(true);
	});

	it("treats missing current snapshot as clean", () => {
		expect(hasUnsavedProjectChanges(null, null)).toBe(false);
	});
});
