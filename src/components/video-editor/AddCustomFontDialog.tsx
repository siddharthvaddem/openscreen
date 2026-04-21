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

		// Auto-extract font name if valid Google Fonts URL
		if (isValidGoogleFontsUrl(url)) {
			const extracted = parseFontFamilyFromImport(url);
			if (extracted && !fontName) {
				setFontName(extracted);
			}
		}
	};

	const handleAdd = async () => {
		// Validate inputs
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
			// Extract font family from URL
			const fontFamily = parseFontFamilyFromImport(importUrl);
			if (!fontFamily) {
				toast.error(t("customFont.errorExtractFailed"));
				setLoading(false);
				return;
			}

			// Create custom font object
			const newFont: CustomFont = {
				id: generateFontId(fontName),
				name: fontName.trim(),
				fontFamily: fontFamily,
				importUrl: importUrl.trim(),
			};

			// Add font (this will load and verify it) - throws if it fails
			await addCustomFont(newFont);

			// Notify parent
			if (onFontAdded) {
				onFontAdded(newFont);
			}

			toast.success(t("customFont.successMessage", { fontName }));

			// Reset and close
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
					className="w-full editor-panel-soft editor-text hover:bg-accent h-9 text-xs"
				>
					<Plus className="w-3 h-3 mr-1" />
					{t("customFont.dialogTitle")}
				</Button>
			</DialogTrigger>
			<DialogContent className="editor-panel text-foreground">
				<DialogHeader>
					<DialogTitle>{t("customFont.dialogTitle")}</DialogTitle>
					<DialogDescription className="editor-text-muted">
						Add a custom font from Google Fonts to use in your annotations.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 mt-4">
					<div className="space-y-2">
						<Label htmlFor="import-url" className="editor-text">
							{t("customFont.urlLabel")}
						</Label>
						<Input
							id="import-url"
							placeholder={t("customFont.urlPlaceholder")}
							value={importUrl}
							onChange={(e) => handleImportUrlChange(e.target.value)}
							className="bg-background border-input text-foreground"
						/>
						<p className="text-xs editor-text-muted">{t("customFont.urlHelp")}</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="font-name" className="editor-text">
							{t("customFont.nameLabel")}
						</Label>
						<Input
							id="font-name"
							placeholder={t("customFont.namePlaceholder")}
							value={fontName}
							onChange={(e) => setFontName(e.target.value)}
							className="bg-background border-input text-foreground"
						/>
						<p className="text-xs editor-text-muted">{t("customFont.nameHelp")}</p>
					</div>

					<div className="flex justify-end gap-2 mt-6">
						<Button
							variant="outline"
							onClick={() => setOpen(false)}
							className="editor-panel-soft editor-text hover:bg-accent"
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
