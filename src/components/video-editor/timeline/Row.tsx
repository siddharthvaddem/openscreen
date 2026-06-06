import type { RowDefinition } from "dnd-timeline";
import { useRow } from "dnd-timeline";

interface RowProps extends RowDefinition {
	children: React.ReactNode;
	hint?: string;
	isEmpty?: boolean;
	background?: React.ReactNode;
}

/**
 * A horizontal timeline lane. Wraps dnd-timeline's `useRow` and adds an optional
 * `background` layer, an empty-state hint label, and a minimum height.
 */
export default function Row({ id, children, hint, isEmpty, background }: RowProps) {
	const { setNodeRef, rowWrapperStyle, rowStyle } = useRow({ id });

	return (
		<div
			className="border-b border-white/[0.055] bg-[#101116] relative overflow-hidden"
			style={{ ...rowWrapperStyle, minHeight: 36 }}
		>
			{background}
			{isEmpty && hint && (
				<div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10">
					<span className="text-[11px] text-white/[0.12] font-medium">{hint}</span>
				</div>
			)}
			<div ref={setNodeRef} style={rowStyle}>
				{children}
			</div>
		</div>
	);
}
