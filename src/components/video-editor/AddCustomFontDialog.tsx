import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  addCustomFont,
  generateFontId,
  parseFontFamilyFromImport,
  isValidGoogleFontsUrl,
  type CustomFont,
} from '@/lib/customFonts';

interface AddCustomFontDialogProps {
  onFontAdded?: (font: CustomFont) => void;
}

export function AddCustomFontDialog({ onFontAdded }: AddCustomFontDialogProps) {
  const [open, setOpen] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [fontName, setFontName] = useState('');
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
      toast.error('Please enter a Google Fonts import URL');
      return;
    }

    if (!isValidGoogleFontsUrl(importUrl)) {
      toast.error('Please enter a valid Google Fonts URL');
      return;
    }

    if (!fontName.trim()) {
      toast.error('Please enter a font name');
      return;
    }

    setLoading(true);

    try {
      // Extract font family from URL
      const fontFamily = parseFontFamilyFromImport(importUrl);
      if (!fontFamily) {
        toast.error('Could not extract font family from URL');
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

      toast.success(`Font "${fontName}" added successfully`);

      // Reset and close
      setImportUrl('');
      setFontName('');
      setOpen(false);
    } catch (error) {
      console.error('Failed to add custom font:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load font';
      toast.error('Failed to add font', {
        description: errorMessage.includes('timeout')
          ? 'Font took too long to load. Please check the URL and try again.'
          : 'The font could not be loaded. Please verify the Google Fonts URL is correct.',
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
          Add Google Font
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#1a1a1c] border-white/10 text-slate-200">
        <DialogHeader>
          <DialogTitle>Add Google Font</DialogTitle>
          <DialogDescription className="text-slate-400">
            Add a custom font from Google Fonts to use in your annotations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="import-url" className="text-slate-200">
              Google Fonts Import URL
            </Label>
            <Input
              id="import-url"
              placeholder="https://fonts.googleapis.com/css2?family=Roboto&display=swap"
              value={importUrl}
              onChange={(e) => handleImportUrlChange(e.target.value)}
              className="bg-white/5 border-white/10 text-slate-200"
            />
            <p className="text-xs text-slate-400">
              Get this from Google Fonts: Select a font → Click "Get font" → Copy the @import URL
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="font-name" className="text-slate-200">
              Display Name
            </Label>
            <Input
              id="font-name"
              placeholder="My Custom Font"
              value={fontName}
              onChange={(e) => setFontName(e.target.value)}
              className="bg-white/5 border-white/10 text-slate-200"
            />
            <p className="text-xs text-slate-400">
              This is how the font will appear in the font selector
            </p>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="bg-white/5 border-white/10 text-slate-200 hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? 'Adding...' : 'Add Font'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
