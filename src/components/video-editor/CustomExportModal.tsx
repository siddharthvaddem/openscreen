import { Settings2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useScopedT } from "@/contexts/I18nContext";
import type { CustomResolution } from "@/lib/exporter";

interface CustomExportModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	customResolution: CustomResolution | null;
	onCustomResolutionChange: (resolution: CustomResolution | null) => void;
	onExportQualityChange: (quality: "custom") => void;
}

export function CustomExportModal({
	open,
	onOpenChange,
	customResolution,
	onCustomResolutionChange,
	onExportQualityChange,
}: CustomExportModalProps) {
	const t = useScopedT("settings");
	const [tempCustomWidth, setTempCustomWidth] = useState(customResolution?.width || 1920);
	const [tempCustomHeight, setTempCustomHeight] = useState(customResolution?.height || 1080);

	const handleApply = () => {
		const width = Math.floor((tempCustomWidth || 1920) / 2) * 2;
		const height = Math.floor((tempCustomHeight || 1080) / 2) * 2;
		if (width >= 100 && height >= 100) {
			onCustomResolutionChange({ width, height });
			onExportQualityChange("custom");
			onOpenChange(false);
		}
	};

	const handleReset = () => {
		setTempCustomWidth(1920);
		setTempCustomHeight(1080);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[400px] bg-[#09090b] border-white/10 text-white">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Settings2 className="w-5 h-5" />
						{t("exportQuality.custom")}
					</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<label className="text-xs text-slate-400">Width (px)</label>
						<input
							type="number"
							min={100}
							max={7680}
							step={2}
							value={tempCustomWidth || ""}
							onChange={(e) => setTempCustomWidth(parseInt(e.target.value) || 0)}
							className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#34B27B]/50"
							placeholder="1920"
						/>
					</div>
					<div className="space-y-2">
						<label className="text-xs text-slate-400">Height (px)</label>
						<input
							type="number"
							min={100}
							max={4320}
							step={2}
							value={tempCustomHeight || ""}
							onChange={(e) => setTempCustomHeight(parseInt(e.target.value) || 0)}
							className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#34B27B]/50"
							placeholder="1080"
						/>
					</div>
					<div className="text-[10px] text-slate-500">
						Values must be even numbers (divisible by 2)
					</div>
				</div>
				<DialogFooter>
					<Button
						variant="outline"
						onClick={handleReset}
						className="bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
					>
						Reset
					</Button>
					<Button onClick={handleApply} className="bg-[#34B27B] hover:bg-[#34B27B]/90">
						Apply
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
