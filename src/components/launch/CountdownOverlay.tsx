import { useEffect, useState } from "react";

export function CountdownOverlay() {
	const [value, setValue] = useState<number | null>(null);

	useEffect(() => {
		const unsubscribe = window.electronAPI.onCountdownOverlayValue((nextValue) => {
			setValue(nextValue);
		});

		return () => unsubscribe();
	}, []);

	if (value === null) {
		return null;
	}

	return (
		<div className="w-screen h-screen bg-transparent flex items-center justify-center pointer-events-none select-none">
			<div className="flex items-center justify-center w-40 h-40 rounded-full bg-black/50">
				<div
					className="text-white/90 text-[80px] font-bold leading-none tabular-nums"
					style={{ textShadow: "0 4px 24px rgba(0, 0, 0, 0.65)" }}
				>
					{value}
				</div>
			</div>
		</div>
	);
}
