import { useEffect, useState } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ExportFormat, ExportProgress } from '@/lib/exporter';

interface ExportDialogProps {
  isOpen: boolean;
  format: ExportFormat;
  onClose: () => void;
  progress: ExportProgress | null;
  isExporting: boolean;
  error: string | null;
  onCancel?: () => void;
}

export function ExportDialog({
  isOpen,
  format,
  onClose,
  progress,
  isExporting,
  error,
  onCancel,
}: ExportDialogProps) {
  const [showSuccess, setShowSuccess] = useState(false);
  const formatLabel = format === 'gif' ? 'GIF' : 'Video';
  const formatReadyLabel = format === 'gif' ? 'GIF' : 'video';

  useEffect(() => {
    if (!isExporting && progress && progress.percentage >= 100 && !error) {
      setShowSuccess(true);
      const timer = setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isExporting, progress, error, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 animate-in fade-in duration-200"
        onClick={isExporting ? undefined : onClose}
      />
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[60] bg-[#09090b] rounded-2xl shadow-2xl border border-white/10 p-8 w-[90vw] max-w-md animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {showSuccess ? (
              <>
                <div className="w-12 h-12 rounded-full bg-[#34B27B]/20 flex items-center justify-center ring-1 ring-[#34B27B]/50">
                  <Download className="w-6 h-6 text-[#34B27B]" />
                </div>
                <div>
                  <span className="text-xl font-bold text-slate-200 block">Export Complete</span>
                  <span className="text-sm text-slate-400">Your {formatReadyLabel} is ready</span>
                </div>
              </>
            ) : (
              <>
                {isExporting ? (
                  <div className="w-12 h-12 rounded-full bg-[#34B27B]/10 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-[#34B27B] animate-spin" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                    <Download className="w-6 h-6 text-slate-200" />
                  </div>
                )}
                <div>
                  <span className="text-xl font-bold text-slate-200 block">
                    {error ? 'Export Failed' : isExporting ? `Exporting ${formatLabel}` : `Export ${formatLabel}`}
                  </span>
                  <span className="text-sm text-slate-400">
                    {error ? 'Please try again' : isExporting ? 'This may take a moment...' : 'Ready to start'}
                  </span>
                </div>
              </>
            )}
          </div>
          {!isExporting && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:bg-white/10 text-slate-400 hover:text-white rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>

        {error && (
          <div className="mb-6 animate-in slide-in-from-top-2">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
              <div className="p-1 bg-red-500/20 rounded-full">
                <X className="w-3 h-3 text-red-400" />
              </div>
              <p className="text-sm text-red-400 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {isExporting && progress && (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium text-slate-400 uppercase tracking-wider">
                <span>Progress</span>
                <span className="font-mono text-slate-200">{progress.percentage.toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full bg-[#34B27B] shadow-[0_0_10px_rgba(52,178,123,0.3)] transition-all duration-300 ease-out"
                  style={{ width: `${Math.min(progress.percentage, 100)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Status</div>
                <div className="text-slate-200 font-medium text-sm flex items-center gap-2 h-[28px]">
                  <span className="w-2 h-2 rounded-full bg-[#34B27B] animate-pulse" />
                  Processing
                </div>
              </div>
            </div>

            {onCancel && (
              <div className="pt-2">
                <Button
                  onClick={onCancel}
                  variant="destructive"
                  className="w-full py-6 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30 transition-all rounded-xl"
                >
                  Cancel Export
                </Button>
              </div>
            )}
          </div>
        )}

        {showSuccess && (
          <div className="text-center py-4 animate-in zoom-in-95">
            <p className="text-lg text-slate-200 font-medium">{formatLabel} saved successfully!</p>
          </div>
        )}
      </div>
    </>
  );
}
