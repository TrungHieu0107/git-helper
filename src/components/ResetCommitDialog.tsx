import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store';
import { resetToCommit, ResetMode } from '../lib/repo';
import { RotateCcw, AlertTriangle, Info, X, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

export function ResetCommitDialog() {
  const target = useAppStore(s => s.resetToCommitTarget);
  const setTarget = useAppStore(s => s.setResetToCommitTarget);
  const commitLog = useAppStore(s => s.commitLog);
  const repoInfo = useAppStore(s => s.repoInfo);
  const repoStatus = useAppStore(s => s.repoStatus);
  
  const [mode, setMode] = useState<ResetMode>('Mixed');
  const [isResetting, setIsResetting] = useState(false);

  // Close on Escape & Click outside
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isResetting) setTarget(null);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [setTarget, isResetting]);

  const rewindCount = useMemo(() => {
    if (!target || !repoInfo) return 0;
    const headIndex = commitLog.findIndex(c => c.oid === repoInfo.head_oid);
    const targetIndex = commitLog.findIndex(c => c.oid === target.oid);
    if (headIndex === -1 || targetIndex === -1) return 0;
    return Math.abs(targetIndex - headIndex);
  }, [target, repoInfo, commitLog]);

  const isDirty = (repoStatus?.staged_count || 0) > 0 || (repoStatus?.unstaged_count || 0) > 0;
  const showHardWarning = mode === 'Hard' && isDirty;

  const handleConfirm = async () => {
    setIsResetting(true);
    await resetToCommit(target!.oid, mode);
    setIsResetting(false);
  };

  const modes: { id: ResetMode; label: string; desc: string; color: string; badge: string }[] = [
    { 
        id: 'Soft', 
        label: 'Soft', 
        desc: 'HEAD moves. All changes are kept and staged for re-commit.',
        color: 'text-dracula-green',
        badge: 'bg-dracula-green/10 text-dracula-green'
    },
    { 
        id: 'Mixed', 
        label: 'Mixed', 
        desc: 'HEAD moves. Changes are kept in working tree but unstaged.',
        color: 'text-dracula-orange',
        badge: 'bg-dracula-orange/10 text-dracula-orange'
    },
    { 
        id: 'Hard', 
        label: 'Hard Reset', 
        desc: 'HEAD moves. All changes are PERMANENTLY discarded.',
        color: 'text-destructive',
        badge: 'bg-destructive/10 text-destructive'
    },
  ];

  return (
    <AnimatePresence>
      {target && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isResetting && setTarget(null)}
            className="absolute inset-0 bg-background/40 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="relative bg-background/80 backdrop-blur-2xl border border-border/50 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-border/30 flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-dracula-purple/10">
                  <RotateCcw size={20} className="text-dracula-purple" />
                </div>
                <div>
                  <h2 className="text-[17px] font-bold text-foreground tracking-tight">Reset to Commit</h2>
                  <p className="text-[12px] text-muted-foreground/60">
                    Target: <span className="text-primary font-mono font-bold">{target.oid.substring(0, 7)}</span>
                  </p>
                </div>
              </div>
              {!isResetting && (
                <Button variant="ghost" size="icon" onClick={() => setTarget(null)} className="h-8 w-8 text-muted-foreground/40 hover:text-foreground">
                  <X size={16} />
                </Button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-8 space-y-8">
                {/* Target Details */}
                <div className="bg-secondary/20 border border-border/40 rounded-2xl p-5 space-y-4 shadow-inner">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-black">Target Message</span>
                    <p className="text-[14px] text-foreground/80 font-medium line-clamp-2 italic leading-snug">
                      "{target.message}"
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-muted-foreground/60 font-bold">
                    <Info size={14} className="text-primary" />
                    <span>This will rewind <span className="text-primary">{rewindCount} commit{rewindCount !== 1 ? 's' : ''}</span></span>
                  </div>
                </div>

                {/* Mode Selection */}
                <div className="space-y-4">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-1">Select Reset Mode</label>
                  <div className="grid grid-cols-1 gap-2.5">
                    {modes.map(m => (
                      <button
                        key={m.id}
                        onClick={() => setMode(m.id)}
                        className={cn(
                          "flex flex-col text-left p-4 rounded-xl border transition-all duration-300 group relative overflow-hidden",
                          mode === m.id 
                            ? "bg-primary/5 border-primary ring-4 ring-primary/5 shadow-lg shadow-primary/5" 
                            : "bg-secondary/30 border-border/40 hover:border-border hover:bg-secondary/50"
                        )}
                      >
                        <div className="flex items-center justify-between gap-4 relative z-10">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                              mode === m.id ? "border-primary bg-primary" : "border-border/60 bg-transparent group-hover:border-border"
                            )}>
                              {mode === m.id && <Check size={12} className="text-primary-foreground" strokeWidth={4} />}
                            </div>
                            <span className={cn("text-[15px] font-bold", mode === m.id ? "text-foreground" : "text-foreground/70")}>{m.label}</span>
                          </div>
                          <Badge className={cn("text-[10px] font-black tracking-widest", m.badge)}>{m.id === 'Mixed' ? 'DEFAULT' : m.id.toUpperCase()}</Badge>
                        </div>
                        <p className={cn("text-[12px] leading-relaxed mt-2.5 px-8 font-medium transition-colors", mode === m.id ? "text-muted-foreground/80" : "text-muted-foreground/40")}>{m.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Warnings */}
                <AnimatePresence>
                  {showHardWarning && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="px-5 py-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-4 shadow-lg shadow-destructive/5"
                    >
                      <div className="p-2 rounded-lg bg-destructive/20">
                        <AlertTriangle size={18} className="text-destructive" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-[14px] font-bold text-destructive">Destructive Action</p>
                        <p className="text-[12px] text-destructive/70 leading-relaxed font-medium">
                          You have uncommitted changes. Hard reset will <span className="font-black underline decoration-destructive/30">permanently discard</span> all work. This cannot be undone.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-5 border-t border-border/30 bg-secondary/10 flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setTarget(null)}
                disabled={isResetting}
                className="px-5 font-bold text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirm}
                disabled={isResetting}
                isLoading={isResetting}
                className={cn(
                  "px-8 font-bold shadow-lg min-w-[160px]",
                  mode === 'Hard' 
                    ? "bg-destructive hover:bg-destructive shadow-destructive/20" 
                    : "shadow-primary/20"
                )}
              >
                {mode === 'Hard' ? 'Discard & Reset' : `Reset to ${mode}`}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
