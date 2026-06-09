import { Toaster as Sonner } from "sonner";
import { cn } from "@/lib/utils";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ className, ...props }: ToasterProps) => {
	return (
		<Sonner
			theme="dark"
			className={cn(
				"dark toaster group pointer-events-none [&_[data-sonner-toast]]:pointer-events-auto",
				className,
			)}
			duration={3000}
			toastOptions={{
				classNames: {
					toast:
						"group toast border border-white/10 bg-[#09090b] text-slate-200 shadow-lg backdrop-blur-xl",
					description: "group-[.toast]:text-slate-400",
					actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
					cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
				},
			}}
			{...props}
		/>
	);
};

export { Toaster };
