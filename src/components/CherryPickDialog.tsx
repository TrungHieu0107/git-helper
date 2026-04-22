import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CommitNode, useAppStore } from '../store';
import { invokeCherryPick } from '../lib/repo';
import { GitCommit, AlertTriangle, X, Check } from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface CherryPickDialogProps {
  commits: CommitNode[];
  onClose: () => void;
}

export function CherryPickDialog({ commits, onClose }: CherryPickDialogProps) {
  const activeBranch = useAppStore(s => s.activeBranch);
  const [isApplying, setIsApplying] = useState(false);

  // Focus lock & escape handling
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isApplying) onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, isApplying]);

  const hasMerge = commits.some(c => c.parents.length > 1);

  const handleConfirm = async () => {
    setIsApplying(true);
    await invokeCherryPick(commits.map(c => c.oid));
    setIsApplying(false);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={!isApplying ? onClose : undefined}
          className="absolute inset-0 bg-background/40 backdrop-blur-md"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="relative bg-background/80 backdrop-blur-2xl border border-border/50 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-border/30 flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <GitCommit size={20} className="text-primary" />
              </div>
              <div>
                <h2 className="text-[17px] font-bold text-foreground tracking-tight">Cherry-Pick Commits</h2>
                <p className="text-[12px] text-muted-foreground/60">
                  Target branch: <span className="text-primary font-mono font-bold">{activeBranch || 'HEAD'}</span>
                </p>
              </div>
            </div>
            {!isApplying && (
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-muted-foreground/40 hover:text-foreground">
                <X size={16} />
              </Button>
            )}
          </div>

          <div className="p-8 flex flex-col gap-6">
            {hasMerge && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3"
              >
                <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[12px] text-amber-500/80 leading-relaxed font-medium">
                  One or more selected commits are merge commits. Git will use the first parent as mainline.
                </p>
              </motion.div>
            )}

            <div className="space-y-3">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-1">Selected Commits</label>
              <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto custom-scrollbar border border-border/30 rounded-xl bg-secondary/20 p-2">
                {commits.map(c => (
                  <motion.div 
                    key={c.oid} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 py-2 px-3 hover:bg-secondary/40 rounded-lg transition-colors group"
                  >
                    <Badge variant="secondary" className="font-mono text-[10px] bg-primary/10 text-primary border-primary/20">{c.short_oid}</Badge>
                    <span className="text-[13px] text-foreground/80 truncate font-medium group-hover:text-foreground">{c.message}</span>
                  </motion.div>
                ))}
              </div>
            </div>
            
            <p className="text-[13px] text-muted-foreground/70 leading-relaxed px-1">
              This will apply the changes from {commits.length === 1 ? 'this commit' : 'these commits'} onto your current branch. New commits will be created automatically if there are no conflicts.
            </p>
          </div>

          {/* Footer */}
          <div className="px-6 py-5 border-t border-border/30 bg-secondary/10 flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isApplying}
              className="px-5 font-bold text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={isApplying}
              className="px-8 font-bold shadow-lg shadow-primary/20 min-w-[140px]"
              isLoading={isApplying}
              leftIcon={!isApplying && <Check size={16}/>}
            >
              Cherry-pick
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
