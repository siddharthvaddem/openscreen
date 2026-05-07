import { HsvaColor, hexToHsva } from "@uiw/color-convert";
import Block from "@uiw/react-color-block";
import Colorful from "@uiw/react-color-colorful";
import { useEffect, useState } from "react";
import { Button } from "./button";
import { Input } from "./input";

type BaseProps = {
	selectedColor: string;
	colorPalette: string[];
	onUpdateColor: (color: string) => void;
};

type ColorPickerProps =
	| (BaseProps & {
			clearBackgroundOption?: false;
			translations: Record<"colorWheel" | "colorPalette", string>;
	  })
	| (BaseProps & {
			clearBackgroundOption: true;
			translations: Record<"colorWheel" | "colorPalette" | "clearBackground", string>;
	  });

export default function ColorPicker(props: ColorPickerProps) {
	const { selectedColor, colorPalette, translations, onUpdateColor } = props;
	const [colorMode, setColorMode] = useState<"wheel" | "palette">("wheel");
	const [hexInput, setHexInput] = useState(selectedColor);
	const [transparentColorHSVA, setTransparentColorHSVA] = useState<HsvaColor>({
		h: 0,
		s: 0,
		v: 0,
		a: 0,
	});

	useEffect(() => {
		setHexInput(selectedColor);
	}, [selectedColor]);

	const getTextColor = (color: string) => {
		if (color === "transparent") return "#ffffff";
		const r = parseInt(color.slice(1, 3), 16);
		const g = parseInt(color.slice(3, 5), 16);
		const b = parseInt(color.slice(5, 7), 16);
		const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
		if (luminance > 186) return "#000000";
		return "#ffffff";
	};

	// Normalize the hex input.
	// Adds a # at the beginning of the input if it's not there.
	const normalizeHexDraft = (raw: string) => {
		const trimmed = raw.trim();
		if (trimmed === "") return "";
		if (/^[0-9A-Fa-f]/.test(trimmed[0])) return `#${trimmed}`;
		return trimmed;
	};

	const handleColorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const normalized = normalizeHexDraft(e.target.value);
		setHexInput(normalized);
		// Check if the normalized hex is a valid hex color.
		// It should follow the format #RRGGBB or #RGB.
		const isValidHexColor =
			/^#[0-9A-Fa-f]{3}$/.test(normalized) || /^#[0-9A-Fa-f]{6}$/.test(normalized);
		if (isValidHexColor) {
			onUpdateColor(normalized);
		}
	};

	const toTransparent = (color: string) => {
		if (color === "transparent") return;
		const hsva = hexToHsva(color);
		hsva.a = 0;
		return hsva;
	};
	return (
		<div className="p-1 flex flex-col gap-4 items-center">
			<div className="flex items-center gap-2 w-full">
				<Button
					variant="outline"
					size="sm"
					className="w-full h-9 justify-start gap-2 bg-white/5 border-white/10 hover:bg-white/10 px-2"
					onClick={() => setColorMode("wheel")}
					style={{
						backgroundColor: colorMode === "wheel" ? "#34B27B" : "transparent",
					}}
				>
					<span className="text-xs text-slate-300 truncate flex-1 text-left">
						{translations.colorWheel}
					</span>
				</Button>
				<Button
					variant="outline"
					size="sm"
					className="w-full h-9 justify-start gap-2 bg-white/5 border-white/10 hover:bg-white/10 px-2"
					onClick={() => setColorMode("palette")}
					style={{
						backgroundColor: colorMode === "palette" ? "#34B27B" : "transparent",
					}}
				>
					<span className="text-xs text-slate-300 truncate flex-1 text-left">
						{translations.colorPalette}
					</span>
				</Button>
			</div>
			{colorMode === "wheel" && (
				<>
					<div
						className={`w-full h-20 flex items-center justify-center border border-white/10 rounded-lg`}
						style={{ backgroundColor: selectedColor }}
					>
						<span style={{ color: getTextColor(selectedColor) }}>{selectedColor}</span>
					</div>
					<Colorful
						color={selectedColor !== "transparent" ? selectedColor : transparentColorHSVA}
						onChange={(color) => {
							onUpdateColor(color.hex);
						}}
						style={{
							borderRadius: "8px",
						}}
						disableAlpha={true}
					/>
					<Input
						type="text"
						value={hexInput}
						className="w-full h-9 rounded-md border border-white/10 bg-white/5 px-2 text-xs text-slate-200 outline-none focus:border-[#34B27B]/50 focus:ring-1 focus:ring-[#34B27B]/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
						onChange={handleColorInputChange}
					/>
				</>
			)}
			{colorMode === "palette" && (
				<Block
					color={selectedColor !== "transparent" ? selectedColor : transparentColorHSVA}
					colors={colorPalette}
					onChange={(color) => {
						onUpdateColor(color.hex);
					}}
					style={{
						width: "100%",
						borderRadius: "8px",
					}}
				/>
			)}
			{props.clearBackgroundOption === true && (
				<Button
					variant="ghost"
					size="sm"
					className="w-full mt-2 text-xs h-7 hover:bg-white/5 text-slate-400"
					onClick={() => {
						const hsva = toTransparent(selectedColor);
						if (hsva) setTransparentColorHSVA(hsva);
						onUpdateColor("transparent");
					}}
				>
					{props.translations.clearBackground}
				</Button>
			)}
		</div>
	);
}
