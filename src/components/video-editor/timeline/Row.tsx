import type { RowDefinition } from "dnd-timeline";
import { useRow } from "dnd-timeline";

interface RowProps extends RowDefinition {
	children: React.ReactNode;
	label?: string;
	hint?: string;
	isEmpty?: boolean;
	labelColor?: string;
}

export default function Row({ id, children, label, hint, isEmpty, labelColor = "#666" }: RowProps) {
	const { setNodeRef, rowWrapperStyle, rowStyle } = useRow({ id });

	return (
		<div
			className="border-b border-[#18181b] bg-[#18181b] relative"
			style={{ ...rowWrapperStyle, minHeight: 48, marginBottom: 4 }}
		>
			{label && (
				<div
					className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] font-semibold uppercase tracking-widest z-20 pointer-events-none select-none"
					style={{ color: labelColor, writingMode: "horizontal-tb" }}
				>
					{label}
				</div>
			)}
			{isEmpty && hint && (
				<div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10">
					<span className="text-[13px] text-white/75 font-semibold tracking-[0.01em] drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]">
						{hint}
					</span>
				</div>
			)}
			<div ref={setNodeRef} style={rowStyle}>
				{children}
			</div>
		</div>
	);
}
