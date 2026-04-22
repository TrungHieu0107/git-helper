import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store';
import { mergeBranch } from '../lib/repo';
import { GitMerge, AlertTriangle, ArrowRight, Info, X } from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

export function MergeDialog() {
  const mergeTarget = useAppStore(s => s.mergeTarget);
  const setMergeTarget = useAppStore(s => s.setMergeTarget);
  const activeBranch = useAppStore(s => s.activeBranch);
  const branches = useAppStore(s => s.branches);
  const repoStatus = useAppStore(s => s.repoStatus);

  const [isMerging, setIsMerging] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isMerging) setMergeTarget(null);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [setMergeTarget, isMerging]);

  const targetBranchInfo = useMemo(() => {
    if (!mergeTarget) return null;
    return branches.find(b => b.name === mergeTarget);
  }, [mergeTarget, branches]);

  const isDirty = (repoStatus?.staged_count || 0) > 0 || (repoStatus?.unstaged_count || 0) > 0;
  const targetShortOid = targetBranchInfo?.last_commit_oid?.substring(0, 7) || '???';

  const handleConfirm = async () => {
    setIsMerging(true);
    await mergeBranch(mergeTarget!);
    setIsMerging(false);
  };

  return (
    <AnimatePresence>
      {mergeTarget && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isMerging && setMergeTarget(null)}
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
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <GitMerge size={20} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-[17px] font-bold text-foreground tracking-tight">Merge Branch</h2>
                  <p className="text-[12px] text-muted-foreground/60">
                    Target: <span className="text-primary font-mono font-bold">{activeBranch || 'HEAD'}</span>
                  </p>
                </div>
              </div>
              {!isMerging && (
                <Button variant="ghost" size="icon" onClick={() => setMergeTarget(null)} className="h-8 w-8 text-muted-foreground/40 hover:text-foreground">
                  <X size={16} />
                </Button>
              )}
            </div>

            <div className="p-8 flex flex-col gap-8">
              {/* Visual merge flow */}
              <div className="bg-secondary/20 border border-border/30 rounded-2xl p-6 relative overflow-hidden group shadow-inner">
                <div className="flex items-center justify-between gap-4 relative z-10">
                  {/* Source branch */}
                  <div className="flex flex-col items-center gap-2 flex-1">
                    <Badge variant="secondary" className="bg-dracula-purple/10 text-dracula-purple border-dracula-purple/20 px-4 py-1.5 text-[13px] font-bold shadow-lg shadow-dracula-purple/5">
                      {mergeTarget}
                    </Badge>
                    <span className="text-[10px] font-mono text-muted-foreground/60 font-bold uppercase tracking-widest">{targetShortOid}</span>
                  </div>

                  {/* Arrow */}
                  <div className="flex flex-col items-center group-hover:scale-110 transition-transform duration-500">
                    <div className="p-2 rounded-full bg-primary/10 border border-primary/20">
                      <ArrowRight size={20} className="text-primary" />
                    </div>
                  </div>

                  {/* Target branch */}
                  <div className="flex flex-col items-center gap-2 flex-1">
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-4 py-1.5 text-[13px] font-bold shadow-lg shadow-primary/5">
                      {activeBranch || 'HEAD'}
                    </Badge>
                    <span className="text-[10px] font-mono text-muted-foreground/60 font-bold uppercase tracking-widest">Current</span>
                  </div>
                </div>
                
                {/* Background Decoration */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
              </div>

              {/* Info & Latest Commit */}
              <div className="space-y-6">
                <div className="flex items-start gap-4 px-1">
                  <div className="p-1.5 rounded-lg bg-muted/10">
                    <Info size={16} className="text-muted-foreground" />
                  </div>
                  <p className="text-[13px] text-muted-foreground/80 leading-relaxed font-medium">
                    This will merge all commits from <span className="text-dracula-purple font-bold">{mergeTarget}</span> into your current branch.
                    Conflicted files will be routed to the conflict editor.
                  </p>
                </div>

                {targetBranchInfo && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-secondary/30 border border-border/40 rounded-xl p-4 flex flex-col gap-2"
                  >
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-black">Latest Commit</span>
                    <p className="text-[14px] text-foreground/80 font-medium line-clamp-2 leading-snug italic">
                      "{targetBranchInfo.last_commit_message || 'No message'}"
                    </p>
                  </motion.div>
                )}

                {/* Dirty tree warning */}
                {isDirty && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="px-5 py-4 bg-dracula-orange/10 border border-dracula-orange/20 rounded-xl flex items-start gap-4 shadow-lg shadow-dracula-orange/5"
                  >
                    <div className="p-2 rounded-lg bg-dracula-orange/20">
                      <AlertTriangle size={18} className="text-dracula-orange" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-[14px] font-bold text-dracula-orange">Uncommitted Changes</p>
                      <p className="text-[12px] text-dracula-orange/70 leading-relaxed font-medium">
                        You have uncommitted changes. Please commit or stash them before merging to ensure a clean merge.
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-5 border-t border-border/30 bg-secondary/10 flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setMergeTarget(null)}
                disabled={isMerging}
                className="px-5 font-bold text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirm}
                disabled={isMerging || isDirty}
                isLoading={isMerging}
                leftIcon={!isMerging && <GitMerge size={16} />}
                className="px-8 font-bold shadow-lg shadow-primary/20 min-w-[140px]"
              >
                Merge
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
