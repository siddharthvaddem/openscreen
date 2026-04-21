import { useEffect, useState } from "react";

const RING_RADIUS = 68;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const COUNTDOWN_STYLES = `
@keyframes os-countdown-pop {
	0%   { transform: scale(1.5);  opacity: 0; }
	25%  { transform: scale(0.92); opacity: 1; }
	75%  { transform: scale(1.0);  opacity: 1; }
	100% { transform: scale(0.88); opacity: 0; }
}
@keyframes os-countdown-ring {
	from { stroke-dashoffset: 0; }
	to   { stroke-dashoffset: ${RING_CIRCUMFERENCE}; }
}
`;

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
		<>
			{/* Inject keyframe animations — scoped with 'os-countdown-' prefix */}
			<style>{COUNTDOWN_STYLES}</style>
			<div className="w-screen h-screen bg-transparent flex items-center justify-center pointer-events-none select-none">
				<div className="relative flex items-center justify-center w-40 h-40">
					{/* Static background circle */}
					<div className="absolute inset-0 rounded-full bg-black/50" />

					{/* Depleting ring — re-mounted on each tick via key to restart animation */}
					<svg
						key={`ring-${value}`}
						className="absolute inset-0 w-full h-full"
						viewBox="0 0 160 160"
						style={{ transform: "rotate(-90deg)" }}
					>
						{/* Track ring */}
						<circle
							cx="80"
							cy="80"
							r={RING_RADIUS}
							fill="none"
							stroke="rgba(255,255,255,0.15)"
							strokeWidth="4"
						/>
						{/* Animated fill ring */}
						<circle
							cx="80"
							cy="80"
							r={RING_RADIUS}
							fill="none"
							stroke="rgba(255,255,255,0.85)"
							strokeWidth="4"
							strokeLinecap="round"
							strokeDasharray={RING_CIRCUMFERENCE}
							strokeDashoffset="0"
							style={{
								animation: "os-countdown-ring 1s linear forwards",
							}}
						/>
					</svg>

					{/* Animated number — re-mounted on each tick via key to restart animation */}
					<div
						key={`num-${value}`}
						className="relative text-white/90 text-[80px] font-bold leading-none tabular-nums"
						style={{
							textShadow: "0 4px 24px rgba(0, 0, 0, 0.65)",
							animation: "os-countdown-pop 1s ease-out forwards",
						}}
					>
						{value}
					</div>
				</div>
			</div>
		</>
	);
}
