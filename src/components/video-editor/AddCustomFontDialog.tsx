import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useScopedT } from "@/contexts/I18nContext";
import {
	addCustomFont,
	type CustomFont,
	generateFontId,
	isValidGoogleFontsUrl,
	parseFontFamilyFromImport,
} from "@/lib/customFonts";

interface AddCustomFontDialogProps {
	onFontAdded?: (font: CustomFont) => void;
}

export function AddCustomFontDialog({ onFontAdded }: AddCustomFontDialogProps) {
	const t = useScopedT("settings");
	const tc = useScopedT("common");
	const [open, setOpen] = useState(false);
	const [importUrl, setImportUrl] = useState("");
	const [fontName, setFontName] = useState("");
	const [loading, setLoading] = useState(false);

	const handleImportUrlChange = (url: string) => {
		setImportUrl(url);

		if (isValidGoogleFontsUrl(url)) {
			const extracted = parseFontFamilyFromImport(url);
			if (extracted && !fontName) {
				setFontName(extracted);
			}
		}
	};

	const handleAdd = async () => {
		if (!importUrl.trim()) {
			toast.error(t("customFont.errorEmptyUrl"));
			return;
		}

		if (!isValidGoogleFontsUrl(importUrl)) {
			toast.error(t("customFont.errorInvalidUrl"));
			return;
		}

		if (!fontName.trim()) {
			toast.error(t("customFont.errorEmptyName"));
			return;
		}

		setLoading(true);

		try {
			const fontFamily = parseFontFamilyFromImport(importUrl);
			if (!fontFamily) {
				toast.error(t("customFont.errorExtractFailed"));
				setLoading(false);
				return;
			}

			const newFont: CustomFont = {
				id: generateFontId(fontName),
				name: fontName.trim(),
				fontFamily: fontFamily,
				importUrl: importUrl.trim(),
			};

			// Loads and verifies the font; throws on failure
			await addCustomFont(newFont);

			if (onFontAdded) {
				onFontAdded(newFont);
			}

			toast.success(t("customFont.successMessage", { fontName }));

			setImportUrl("");
			setFontName("");
			setOpen(false);
		} catch (error) {
			console.error("Failed to add custom font:", error);
			const errorMessage = error instanceof Error ? error.message : "Failed to load font";
			toast.error(t("customFont.failedToAdd"), {
				description: errorMessage.includes("timeout")
					? t("customFont.errorTimeout")
					: t("customFont.errorLoadFailed"),
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className="w-full bg-white/5 border-white/10 text-slate-200 hover:bg-white/10 h-9 text-xs"
				>
					<Plus className="w-3 h-3 mr-1" />
					{t("customFont.dialogTitle")}
				</Button>
			</DialogTrigger>
			<DialogContent className="bg-[#1a1a1c] border-white/10 text-slate-200">
				<DialogHeader>
					<DialogTitle>{t("customFont.dialogTitle")}</DialogTitle>
					<DialogDescription className="text-slate-400">
						Add a custom font from Google Fonts to use in your annotations.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 mt-4">
					<div className="space-y-2">
						<Label htmlFor="import-url" className="text-slate-200">
							{t("customFont.urlLabel")}
						</Label>
						<Input
							id="import-url"
							placeholder={t("customFont.urlPlaceholder")}
							value={importUrl}
							onChange={(e) => handleImportUrlChange(e.target.value)}
							className="bg-white/5 border-white/10 text-slate-200"
						/>
						<p className="text-xs text-slate-400">{t("customFont.urlHelp")}</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="font-name" className="text-slate-200">
							{t("customFont.nameLabel")}
						</Label>
						<Input
							id="font-name"
							placeholder={t("customFont.namePlaceholder")}
							value={fontName}
							onChange={(e) => setFontName(e.target.value)}
							className="bg-white/5 border-white/10 text-slate-200"
						/>
						<p className="text-xs text-slate-400">{t("customFont.nameHelp")}</p>
					</div>

					<div className="flex justify-end gap-2 mt-6">
						<Button
							variant="outline"
							onClick={() => setOpen(false)}
							className="bg-white/5 border-white/10 text-slate-200 hover:bg-white/10"
						>
							{tc("actions.cancel")}
						</Button>
						<Button
							onClick={handleAdd}
							disabled={loading}
							className="bg-blue-600 hover:bg-blue-700 text-white"
						>
							{loading ? t("customFont.addingButton") : t("customFont.addButton")}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
