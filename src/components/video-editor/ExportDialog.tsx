import { useEffect, useState } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ExportProgress } from '@/lib/exporter';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  progress: ExportProgress | null;
  isExporting: boolean;
  error: string | null;
  onCancel?: () => void;
  exportFormat?: 'mp4' | 'gif';
}

export function ExportDialog({
  isOpen,
  onClose,
  progress,
  isExporting,
  error,
  onCancel,
  exportFormat = 'mp4',
}: ExportDialogProps) {
  const [showSuccess, setShowSuccess] = useState(false);

  // Reset showSuccess when a new export starts or dialog reopens
  useEffect(() => {
    if (isExporting) {
      setShowSuccess(false);
    }
  }, [isExporting]);

  // Reset showSuccess when dialog opens fresh
  useEffect(() => {
    if (isOpen && !isExporting && !progress) {
      setShowSuccess(false);
    }
  }, [isOpen, isExporting, progress]);

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

  const formatLabel = exportFormat === 'gif' ? 'GIF' : 'Video';
  
  // Determine if we're in the compiling phase (frames done but still exporting)
  const isCompiling = isExporting && progress && progress.percentage >= 100 && exportFormat === 'gif';
  const isFinalizing = progress?.phase === 'finalizing';
  const renderProgress = progress?.renderProgress;
  
  // Get status message based on phase
  const getStatusMessage = () => {
    if (error) return 'Please try again';
    if (isCompiling || isFinalizing) {
      if (renderProgress !== undefined && renderProgress > 0) {
        return `Compiling GIF... ${renderProgress}%`;
      }
      return 'Compiling GIF... This may take a while';
    }
    return 'This may take a moment...';
  };

  // Get title based on phase
  const getTitle = () => {
    if (error) return 'Export Failed';
    if (isCompiling || isFinalizing) return 'Compiling GIF';
    return `Exporting ${formatLabel}`;
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 animate-in fade-in duration-200"
        onClick={isExporting ? undefined : onClose}
      />
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[60] bg-[#09090b] rounded-2xl shadow-2xl border border-white/10 p-8 w-[90vw] max-w-md animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {showSuccess ? (
              <>
                <div className="w-12 h-12 rounded-full bg-[#34B27B]/20 flex items-center justify-center ring-1 ring-[#34B27B]/50">
                  <Download className="w-6 h-6 text-[#34B27B]" />
                </div>
                <div>
                  <span className="text-xl font-bold text-slate-200 block">Export Complete</span>
                  <span className="text-sm text-slate-400">Your {formatLabel.toLowerCase()} is ready</span>
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
                    {getTitle()}
                  </span>
                  <span className="text-sm text-slate-400">
                    {getStatusMessage()}
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
                <span>{isCompiling || isFinalizing ? 'Compiling' : 'Rendering Frames'}</span>
                <span className="font-mono text-slate-200">
                  {isCompiling || isFinalizing ? (
                    renderProgress !== undefined && renderProgress > 0 ? (
                      `${renderProgress}%`
                    ) : (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Processing...
                      </span>
                    )
                  ) : (
                    `${progress.percentage.toFixed(0)}%`
                  )}
                </span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                {isCompiling || isFinalizing ? (
                  // Show render progress if available, otherwise animated indeterminate bar
                  renderProgress !== undefined && renderProgress > 0 ? (
                    <div
                      className="h-full bg-[#34B27B] shadow-[0_0_10px_rgba(52,178,123,0.3)] transition-all duration-300 ease-out"
                      style={{ width: `${renderProgress}%` }}
                    />
                  ) : (
                    <div className="h-full w-full relative overflow-hidden">
                      <div 
                        className="absolute h-full w-1/3 bg-[#34B27B] shadow-[0_0_10px_rgba(52,178,123,0.3)]"
                        style={{
                          animation: 'indeterminate 1.5s ease-in-out infinite',
                        }}
                      />
                      <style>{`
                        @keyframes indeterminate {
                          0% { transform: translateX(-100%); }
                          100% { transform: translateX(400%); }
                        }
                      `}</style>
                    </div>
                  )
                ) : (
                  <div
                    className="h-full bg-[#34B27B] shadow-[0_0_10px_rgba(52,178,123,0.3)] transition-all duration-300 ease-out"
                    style={{ width: `${Math.min(progress.percentage, 100)}%` }}
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                  {isCompiling || isFinalizing ? 'Status' : 'Format'}
                </div>
                <div className="text-slate-200 font-medium text-sm">
                  {isCompiling || isFinalizing ? 'Compiling...' : formatLabel}
                </div>
              </div>
              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Frames</div>
                <div className="text-slate-200 font-medium text-sm">
                  {progress.currentFrame} / {progress.totalFrames}
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
            <p className="text-lg text-slate-200 font-medium">
              {formatLabel} saved successfully!
            </p>
          </div>
        )}
      </div>
    </>
  );
}
