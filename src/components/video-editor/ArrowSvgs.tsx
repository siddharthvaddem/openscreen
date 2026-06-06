import type { ArrowDirection } from "./types";

interface ArrowSvgProps {
	color: string;
	strokeWidth: number;
	className?: string;
}

/**
 * Inline SVG arrows for 8 directions. Pure paths (not icon fonts) so export can replicate them.
 */

export function ArrowUp({ color, strokeWidth, className }: ArrowSvgProps) {
	return (
		<svg viewBox="0 0 100 100" className={className} style={{ width: "100%", height: "100%" }}>
			<defs>
				<filter id="arrow-shadow">
					<feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.3" />
				</filter>
			</defs>
			<path
				d="M 50 20 L 50 80 M 50 20 L 35 35 M 50 20 L 65 35"
				stroke={color}
				strokeWidth={strokeWidth}
				strokeLinecap="round"
				strokeLinejoin="round"
				fill="none"
				filter="url(#arrow-shadow)"
			/>
		</svg>
	);
}

export function ArrowDown({ color, strokeWidth, className }: ArrowSvgProps) {
	return (
		<svg viewBox="0 0 100 100" className={className} style={{ width: "100%", height: "100%" }}>
			<defs>
				<filter id="arrow-shadow">
					<feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.3" />
				</filter>
			</defs>
			<path
				d="M 50 20 L 50 80 M 50 80 L 35 65 M 50 80 L 65 65"
				stroke={color}
				strokeWidth={strokeWidth}
				strokeLinecap="round"
				strokeLinejoin="round"
				fill="none"
				filter="url(#arrow-shadow)"
			/>
		</svg>
	);
}

export function ArrowLeft({ color, strokeWidth, className }: ArrowSvgProps) {
	return (
		<svg viewBox="0 0 100 100" className={className} style={{ width: "100%", height: "100%" }}>
			<defs>
				<filter id="arrow-shadow">
					<feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.3" />
				</filter>
			</defs>
			<path
				d="M 80 50 L 20 50 M 20 50 L 35 35 M 20 50 L 35 65"
				stroke={color}
				strokeWidth={strokeWidth}
				strokeLinecap="round"
				strokeLinejoin="round"
				fill="none"
				filter="url(#arrow-shadow)"
			/>
		</svg>
	);
}

export function ArrowRight({ color, strokeWidth, className }: ArrowSvgProps) {
	return (
		<svg viewBox="0 0 100 100" className={className} style={{ width: "100%", height: "100%" }}>
			<defs>
				<filter id="arrow-shadow">
					<feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.3" />
				</filter>
			</defs>
			<path
				d="M 20 50 L 80 50 M 80 50 L 65 35 M 80 50 L 65 65"
				stroke={color}
				strokeWidth={strokeWidth}
				strokeLinecap="round"
				strokeLinejoin="round"
				fill="none"
				filter="url(#arrow-shadow)"
			/>
		</svg>
	);
}

export function ArrowUpRight({ color, strokeWidth, className }: ArrowSvgProps) {
	return (
		<svg viewBox="0 0 100 100" className={className} style={{ width: "100%", height: "100%" }}>
			<defs>
				<filter id="arrow-shadow">
					<feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.3" />
				</filter>
			</defs>
			<path
				d="M 25 75 L 75 25 M 75 25 L 60 30 M 75 25 L 70 40"
				stroke={color}
				strokeWidth={strokeWidth}
				strokeLinecap="round"
				strokeLinejoin="round"
				fill="none"
				filter="url(#arrow-shadow)"
			/>
		</svg>
	);
}

export function ArrowUpLeft({ color, strokeWidth, className }: ArrowSvgProps) {
	return (
		<svg viewBox="0 0 100 100" className={className} style={{ width: "100%", height: "100%" }}>
			<defs>
				<filter id="arrow-shadow">
					<feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.3" />
				</filter>
			</defs>
			<path
				d="M 75 75 L 25 25 M 25 25 L 40 30 M 25 25 L 30 40"
				stroke={color}
				strokeWidth={strokeWidth}
				strokeLinecap="round"
				strokeLinejoin="round"
				fill="none"
				filter="url(#arrow-shadow)"
			/>
		</svg>
	);
}

export function ArrowDownRight({ color, strokeWidth, className }: ArrowSvgProps) {
	return (
		<svg viewBox="0 0 100 100" className={className} style={{ width: "100%", height: "100%" }}>
			<defs>
				<filter id="arrow-shadow">
					<feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.3" />
				</filter>
			</defs>
			<path
				d="M 25 25 L 75 75 M 75 75 L 70 60 M 75 75 L 60 70"
				stroke={color}
				strokeWidth={strokeWidth}
				strokeLinecap="round"
				strokeLinejoin="round"
				fill="none"
				filter="url(#arrow-shadow)"
			/>
		</svg>
	);
}

export function ArrowDownLeft({ color, strokeWidth, className }: ArrowSvgProps) {
	return (
		<svg viewBox="0 0 100 100" className={className} style={{ width: "100%", height: "100%" }}>
			<defs>
				<filter id="arrow-shadow">
					<feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.3" />
				</filter>
			</defs>
			<path
				d="M 75 25 L 25 75 M 25 75 L 30 60 M 25 75 L 40 70"
				stroke={color}
				strokeWidth={strokeWidth}
				strokeLinecap="round"
				strokeLinejoin="round"
				fill="none"
				filter="url(#arrow-shadow)"
			/>
		</svg>
	);
}

export function getArrowComponent(direction: ArrowDirection) {
	switch (direction) {
		case "up":
			return ArrowUp;
		case "down":
			return ArrowDown;
		case "left":
			return ArrowLeft;
		case "right":
			return ArrowRight;
		case "up-right":
			return ArrowUpRight;
		case "up-left":
			return ArrowUpLeft;
		case "down-right":
			return ArrowDownRight;
		case "down-left":
			return ArrowDownLeft;
	}
}
