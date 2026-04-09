export type TestId =
	| `gif-size-button-${string}`
	| "export-button"
	| `gif-format-button`
	| "hud-record-button";

export function getTestId(testId: TestId) {
	return `testId-${testId}`;
}
