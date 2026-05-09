import { Save, Trash2 } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useScopedT } from "@/contexts/I18nContext";

interface UnsavedChangesDialogProps {
	isOpen: boolean;
	onSaveAndClose: () => void;
	onDiscardAndClose: () => void;
	onCancel: () => void;
}

export function UnsavedChangesDialog({
	isOpen,
	onSaveAndClose,
	onDiscardAndClose,
	onCancel,
}: UnsavedChangesDialogProps) {
	const td = useScopedT("dialogs");
	const tc = useScopedT("common");

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
			<DialogContent className="bg-[#09090b] border-white/10 rounded-2xl max-w-sm p-6 gap-0">
				<DialogHeader className="mb-5">
					<div className="flex items-center gap-3">
						<img
							src="./openscreen.png"
							alt=""
							aria-hidden="true"
							className="w-9 h-9 rounded-xl flex-shrink-0"
						/>
						<DialogTitle className="text-base font-semibold text-slate-200 leading-tight">
							{td("unsavedChanges.title")}
						</DialogTitle>
					</div>
				</DialogHeader>

				<p className="text-sm text-slate-300 mb-1">{td("unsavedChanges.message")}</p>
				<DialogDescription className="text-sm text-slate-500 mb-6">
					{td("unsavedChanges.detail")}
				</DialogDescription>

				<div className="flex flex-col gap-2">
					<button
						type="button"
						onClick={onSaveAndClose}
						className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-[#34B27B] hover:bg-[#2d9e6c] active:bg-[#27885c] text-white font-medium text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#34B27B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
					>
						<Save className="w-4 h-4" />
						{td("unsavedChanges.saveAndClose")}
					</button>
					<button
						type="button"
						onClick={onDiscardAndClose}
						className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-white/5 hover:bg-red-500/15 border border-white/10 hover:border-red-500/30 text-slate-300 hover:text-red-400 font-medium text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
					>
						<Trash2 className="w-4 h-4" />
						{td("unsavedChanges.discardAndClose")}
					</button>
					<button
						type="button"
						onClick={onCancel}
						className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-300 font-medium text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
					>
						{tc("actions.cancel")}
					</button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
