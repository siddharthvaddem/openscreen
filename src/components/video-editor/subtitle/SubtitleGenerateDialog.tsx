import { useCallback, useEffect, useState } from 'react';
import { Loader2, Wand2, ExternalLink, Key, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import type { SubtitleRegion, SubtitlePositionPreset, SubtitleLanguage } from '../types';
import { 
  SUBTITLE_LANGUAGES, 
  DEFAULT_SUBTITLE_STYLE, 
} from '../types';
import { groupWordsIntoSubtitles, type TranscriptionWord } from '@/lib/subtitleProcessor';

const STORAGE_KEY = 'assemblyai-api-key';

interface SubtitleGenerateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  videoPath: string;
  onSubtitlesGenerated: (subtitles: SubtitleRegion[]) => void;
}

type DialogPhase = 'api-key' | 'config' | 'generating' | 'success' | 'error';

interface TranscriptionProgress {
  status: string;
  progress: number;
  message: string;
}

export function SubtitleGenerateDialog({
  isOpen,
  onClose,
  videoPath,
  onSubtitlesGenerated,
}: SubtitleGenerateDialogProps) {
  // API Key state
  const [apiKey, setApiKey] = useState('');
  const [hasStoredKey, setHasStoredKey] = useState(false);
  
  // Config state
  const [language, setLanguage] = useState<SubtitleLanguage>('auto');
  const [maxWordsPerLine, setMaxWordsPerLine] = useState(4);
  const [position, setPosition] = useState<SubtitlePositionPreset>('bottom-center');
  
  // Progress state
  const [phase, setPhase] = useState<DialogPhase>('api-key');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Check for stored API key on mount
  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setApiKey(stored);
        setHasStoredKey(true);
        setPhase('config');
      } else {
        setPhase('api-key');
      }
    }
  }, [isOpen]);
  
  // Listen for transcription progress
  useEffect(() => {
    if (!isOpen || phase !== 'generating') return;
    
    const unsubscribe = window.electronAPI.onTranscriptionProgress((progressData: TranscriptionProgress) => {
      setProgress(progressData.progress);
      setStatusMessage(progressData.message);
      
      if (progressData.status === 'error') {
        setError(progressData.message);
        setPhase('error');
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [isOpen, phase]);
  
  const handleSaveApiKey = useCallback(() => {
    if (!apiKey.trim()) return;
    localStorage.setItem(STORAGE_KEY, apiKey.trim());
    setHasStoredKey(true);
    setPhase('config');
  }, [apiKey]);
  
  const handleClearApiKey = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setApiKey('');
    setHasStoredKey(false);
    setPhase('api-key');
  }, []);
  
  const handleGenerate = useCallback(async () => {
    if (!videoPath || !apiKey) return;
    
    setPhase('generating');
    setProgress(0);
    setStatusMessage('Starting transcription...');
    setError(null);
    
    try {
      const result = await window.electronAPI.transcribeVideo({
        videoPath,
        language: language === 'auto' ? '' : language,
        apiKey,
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Transcription failed');
      }
      
      if (!result.words || result.words.length === 0) {
        throw new Error('No speech detected in the video. The audio may be silent or contain only background noise.');
      }
      
      // Convert words to our format
      const transcriptionWords: TranscriptionWord[] = result.words.map((word: any) => ({
        text: word.text,
        startMs: word.start,
        endMs: word.end,
        confidence: word.confidence || 1,
      }));
      
      // Group words into subtitles
      const subtitles = groupWordsIntoSubtitles(
        transcriptionWords,
        maxWordsPerLine,
        { ...DEFAULT_SUBTITLE_STYLE },
        position,
      );
      
      setPhase('success');
      
      // Wait a brief moment to show success, then close
      setTimeout(() => {
        onSubtitlesGenerated(subtitles);
        onClose();
        // Reset state for next time
        setPhase(hasStoredKey ? 'config' : 'api-key');
        setProgress(0);
        setStatusMessage('');
      }, 1500);
      
    } catch (err) {
      console.error('Transcription error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setPhase('error');
    }
  }, [videoPath, apiKey, language, maxWordsPerLine, position, hasStoredKey, onSubtitlesGenerated, onClose]);
  
  const handleClose = useCallback(() => {
    // Don't allow closing during generation
    if (phase === 'generating') return;
    
    // Reset state
    setPhase(hasStoredKey ? 'config' : 'api-key');
    setProgress(0);
    setStatusMessage('');
    setError(null);
    onClose();
  }, [phase, hasStoredKey, onClose]);
  
  const handleOpenAssemblyAI = useCallback(() => {
    window.electronAPI.openExternalUrl('https://www.assemblyai.com/app/');
  }, []);
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-[#09090b] border-white/10 text-slate-200 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-100">
            <Wand2 className="w-5 h-5 text-[#00BCD4]" />
            Auto Generate Subtitles
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {phase === 'api-key' && 'Enter your AssemblyAI API key to get started'}
            {phase === 'config' && 'Configure subtitle generation settings'}
            {phase === 'generating' && 'Transcribing audio...'}
            {phase === 'success' && 'Subtitles generated successfully!'}
            {phase === 'error' && 'An error occurred'}
          </DialogDescription>
        </DialogHeader>
        
        {/* API Key Phase */}
        {phase === 'api-key' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-slate-400 uppercase tracking-wider font-medium flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" />
                AssemblyAI API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key..."
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50 focus:border-[#00BCD4]/50 transition-all"
              />
            </div>
            
            <button
              onClick={handleOpenAssemblyAI}
              className="flex items-center gap-1.5 text-sm text-[#00BCD4] hover:text-[#00BCD4]/80 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Get your free API key from AssemblyAI
            </button>
            
            <Button
              onClick={handleSaveApiKey}
              disabled={!apiKey.trim()}
              className="w-full bg-[#00BCD4] hover:bg-[#00BCD4]/90 text-white"
            >
              Save & Continue
            </Button>
          </div>
        )}
        
        {/* Config Phase */}
        {phase === 'config' && (
          <div className="space-y-5">
            {/* Language Selection */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                Language
              </label>
              <Select value={language} onValueChange={(v) => setLanguage(v as SubtitleLanguage)}>
                <SelectTrigger className="w-full bg-white/5 border-white/10 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-white/10">
                  {SUBTITLE_LANGUAGES.map((lang) => (
                    <SelectItem
                      key={lang.code}
                      value={lang.code}
                      className="text-slate-300 hover:text-white focus:bg-white/10"
                    >
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Max Words Per Line */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                  Words Per Subtitle
                </label>
                <span className="text-sm font-medium text-[#00BCD4]">{maxWordsPerLine}</span>
              </div>
              <Slider
                value={[maxWordsPerLine]}
                onValueChange={([v]) => setMaxWordsPerLine(v)}
                min={2}
                max={8}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Fewer (2)</span>
                <span>More (8)</span>
              </div>
            </div>
            
            {/* Position Selection */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                Position
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['top-center', 'middle-center', 'bottom-center'] as const).map((pos) => (
                  <button
                    key={pos}
                    onClick={() => setPosition(pos)}
                    className={cn(
                      'px-3 py-2 rounded-lg border text-sm transition-all',
                      position === pos
                        ? 'bg-[#00BCD4]/20 border-[#00BCD4]/50 text-[#00BCD4]'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-300'
                    )}
                  >
                    {pos === 'top-center' && 'Top'}
                    {pos === 'middle-center' && 'Middle'}
                    {pos === 'bottom-center' && 'Bottom'}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Style Preview */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                Preview
              </label>
              <div className="p-4 bg-black/50 rounded-lg flex items-center justify-center">
                <div
                  className="px-3 py-1.5 rounded"
                  style={{
                    backgroundColor: DEFAULT_SUBTITLE_STYLE.backgroundColor,
                    color: DEFAULT_SUBTITLE_STYLE.color,
                    fontFamily: DEFAULT_SUBTITLE_STYLE.fontFamily,
                    fontWeight: DEFAULT_SUBTITLE_STYLE.fontWeight,
                    fontSize: '14px',
                  }}
                >
                  Sample subtitle text
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={handleClearApiKey}
                className="text-slate-400 hover:text-slate-300"
              >
                Change API Key
              </Button>
              <div className="flex-1" />
              <Button
                onClick={handleGenerate}
                className="bg-[#00BCD4] hover:bg-[#00BCD4]/90 text-white gap-2"
              >
                <Wand2 className="w-4 h-4" />
                Generate Subtitles
              </Button>
            </div>
          </div>
        )}
        
        {/* Generating Phase */}
        {phase === 'generating' && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-[#00BCD4]/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#00BCD4] animate-spin" />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>{statusMessage || 'Processing...'}</span>
                <span className="font-mono">{progress}%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#00BCD4] transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            
            <p className="text-center text-xs text-slate-500">
              This may take a few minutes depending on video length...
            </p>
          </div>
        )}
        
        {/* Success Phase */}
        {phase === 'success' && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-[#34B27B]/20 flex items-center justify-center animate-in zoom-in-95">
                <Check className="w-8 h-8 text-[#34B27B]" />
              </div>
            </div>
            <p className="text-center text-slate-200 font-medium">
              Subtitles generated successfully!
            </p>
          </div>
        )}
        
        {/* Error Phase */}
        {phase === 'error' && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
            </div>
            
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={handleClose}
                className="flex-1 text-slate-400 hover:text-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={() => setPhase('config')}
                className="flex-1 bg-[#00BCD4] hover:bg-[#00BCD4]/90 text-white"
              >
                Try Again
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
