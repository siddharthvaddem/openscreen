import { useCallback, useState } from "react";
import { clampPlaybackSpeed, MAX_PLAYBACK_SPEED, MIN_PLAYBACK_SPEED, SPEED_OPTIONS } from "./types";

interface CustomSpeedInputProps {
	value: number;
	onChange: (val: number) => void;
	onError: () => void;
}

export function CustomSpeedInput({ value, onChange, onError }: CustomSpeedInputProps) {
	const isPreset = SPEED_OPTIONS.some((option) => option.speed === value);
	const [draft, setDraft] = useState<string | null>(null);
	const display = isPreset ? "" : String(clampPlaybackSpeed(value));

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const nextDraft = e.target.value;
			if (nextDraft === "") {
				setDraft("");
				return;
			}
			if (!/^\d*\.?\d{0,2}$/.test(nextDraft)) {
				return;
			}

			const parsed = Number(nextDraft);
			if (Number.isFinite(parsed) && parsed > MAX_PLAYBACK_SPEED) {
				onError();
				return;
			}

			setDraft(nextDraft);
			if (Number.isFinite(parsed) && parsed >= MIN_PLAYBACK_SPEED) {
				onChange(clampPlaybackSpeed(parsed));
			}
		},
		[onChange, onError],
	);

	return (
		<div className="flex items-center gap-1">
			<input
				type="number"
				inputMode="decimal"
				min={MIN_PLAYBACK_SPEED}
				max={MAX_PLAYBACK_SPEED}
				step={0.01}
				placeholder="--"
				value={draft ?? display}
				onFocus={() => setDraft(display)}
				onChange={handleChange}
				onBlur={() => setDraft(null)}
				onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
				className="w-12 bg-white/5 border border-white/10 rounded-md px-1 py-0.5 text-[11px] font-semibold text-[#d97706] text-center focus:outline-none focus:border-[#d97706]/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
			/>
			<span className="text-[11px] font-semibold text-slate-500">×</span>
		</div>
	);
}
