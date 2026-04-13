import { cn } from "@/lib/utils";

interface SubrowProps {
	children: React.ReactNode;
}

export default function Subrow({ children }: SubrowProps) {
	return (
		<div
			className={cn(
				"flex items-center min-h-[32px] gap-1 px-2 py-0.5 editor-panel-soft rounded-md editor-text",
			)}
		>
			{children}
		</div>
	);
}
