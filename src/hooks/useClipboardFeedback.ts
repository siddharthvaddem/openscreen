import { useCallback } from "react";
import { toast } from "sonner";
import { useScopedT } from "@/contexts/I18nContext";

export type ClipboardAction = "copy" | "paste";

export function useClipboardFeedback() {
	const t = useScopedT("timeline");

	const notifyClipboardAction = useCallback(
		(action: ClipboardAction) => {
			toast.success(action === "copy" ? t("feedback.copied") : t("feedback.pasted"));
		},
		[t],
	);

	const notifyCopied = useCallback(() => {
		notifyClipboardAction("copy");
	}, [notifyClipboardAction]);

	const notifyPasted = useCallback(() => {
		notifyClipboardAction("paste");
	}, [notifyClipboardAction]);

	return {
		notifyClipboardAction,
		notifyCopied,
		notifyPasted,
	};
}
