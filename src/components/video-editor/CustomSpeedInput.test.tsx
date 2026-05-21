import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { CustomSpeedInput } from "./CustomSpeedInput";

function TestHarness({
	initialValue,
	onError = vi.fn(),
}: {
	initialValue: number;
	onError?: () => void;
}) {
	const [value, setValue] = useState(initialValue);

	return <CustomSpeedInput value={value} onChange={setValue} onError={onError} />;
}

describe("CustomSpeedInput", () => {
	it("shows non-preset decimal values without rounding", () => {
		render(<CustomSpeedInput value={1.1} onChange={vi.fn()} onError={vi.fn()} />);

		expect((screen.getByRole("spinbutton") as HTMLInputElement).value).toBe("1.1");
	});

	it("accepts decimal speeds and preserves them after blur", () => {
		render(<TestHarness initialValue={1.5} />);

		const input = screen.getByRole("spinbutton") as HTMLInputElement;
		fireEvent.focus(input);
		fireEvent.change(input, { target: { value: "1.1" } });
		expect(input.value).toBe("1.1");

		fireEvent.blur(input);
		expect(input.value).toBe("1.1");
	});

	it("accepts sub-1 decimal speeds", () => {
		render(<TestHarness initialValue={1.5} />);

		const input = screen.getByRole("spinbutton") as HTMLInputElement;
		fireEvent.focus(input);
		fireEvent.change(input, { target: { value: ".9" } });
		expect(input.value).toBe(".9");

		fireEvent.blur(input);
		expect(input.value).toBe("0.9");
	});

	it("rejects values above the maximum", () => {
		const onError = vi.fn();
		render(<CustomSpeedInput value={1.1} onChange={vi.fn()} onError={onError} />);

		const input = screen.getByRole("spinbutton") as HTMLInputElement;
		fireEvent.focus(input);
		fireEvent.change(input, { target: { value: "16.01" } });

		expect(onError).toHaveBeenCalledTimes(1);
		expect(input.value).toBe("1.1");
	});
});
