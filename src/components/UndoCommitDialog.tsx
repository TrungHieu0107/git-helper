import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Trash2, Check, X, AlertTriangle, Info } from 'lucide-react';
import { useAppStore } from '../store';
import { undoLastCommit } from '../lib/repo';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';

export function UndoCommitDialog() {
  const show = useAppStore((state) => state.showUndoCommitDialog);
  const setShow = useAppStore((state) => state.setShowUndoCommitDialog);
  const commitLog = useAppStore((state) => state.commitLog);
  const [mode, setMode] = useState<'Soft' | 'Hard'>('Soft');

  // The last commit is the first one in the log that isn't a stash
  const lastCommit = commitLog.find(node => node.node_type === 'commit');

  if (!show) return null;

  const handleClose = () => setShow(false);

  const handleConfirm = async () => {
    setShow(false);
    await undoLastCommit(mode);
  };

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-background/40 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="relative bg-background backdrop-blur-2xl border border-border/50 rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-border/30 flex items-center justify-between bg-gradient-to-r from-primary/10 to-transparent">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <RotateCcw size={20} className="text-primary" />
                </div>
                <h2 className="text-[17px] font-bold text-foreground tracking-tight">Undo Last Commit</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8 text-muted-foreground/40 hover:text-foreground">
                <X size={16} />
              </Button>
            </div>

            {/* Body */}
            <div className="px-8 py-6 flex flex-col gap-6">
              {lastCommit && (
                <div className="bg-secondary/30 border border-border/30 rounded-xl p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Commit to Undo</span>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-md">
                      {lastCommit.short_oid}
                    </span>
                  </div>
                  <p className="text-[13px] font-semibold text-foreground line-clamp-1">{lastCommit.message}</p>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="font-bold">{lastCommit.author}</span>
                    <span>•</span>
                    <span>{new Date(lastCommit.timestamp * 1000).toLocaleString()}</span>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <span className="text-[12px] font-bold text-foreground tracking-tight">Choose Reset Mode</span>
                
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => setMode('Soft')}
                    className={cn(
                      "flex items-start gap-4 p-4 rounded-xl border transition-all text-left group",
                      mode === 'Soft' 
                        ? "bg-primary/5 border-primary/40 shadow-sm" 
                        : "bg-transparent border-border/40 hover:border-border hover:bg-secondary/20"
                    )}
                  >
                    <div className={cn(
                      "mt-0.5 p-1.5 rounded-lg shrink-0",
                      mode === 'Soft' ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground/60 group-hover:text-muted-foreground"
                    )}>
                      <RotateCcw size={16} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className={cn("text-[14px] font-bold", mode === 'Soft' ? "text-primary" : "text-foreground")}>Soft Reset</span>
                      <p className="text-[12px] text-muted-foreground leading-snug">Keep your changes staged. Best for fixing commit messages or adding more files.</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setMode('Hard')}
                    className={cn(
                      "flex items-start gap-4 p-4 rounded-xl border transition-all text-left group",
                      mode === 'Hard' 
                        ? "bg-destructive/5 border-destructive/40 shadow-sm" 
                        : "bg-transparent border-border/40 hover:border-border hover:bg-secondary/20"
                    )}
                  >
                    <div className={cn(
                      "mt-0.5 p-1.5 rounded-lg shrink-0",
                      mode === 'Hard' ? "bg-destructive/20 text-destructive" : "bg-secondary text-muted-foreground/60 group-hover:text-muted-foreground"
                    )}>
                      <Trash2 size={16} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className={cn("text-[14px] font-bold", mode === 'Hard' ? "text-destructive" : "text-foreground")}>Hard Reset</span>
                      <p className="text-[12px] text-muted-foreground leading-snug">Discard all changes in this commit. <span className="text-destructive font-bold">This action cannot be undone and will lose any uncommitted work.</span></p>
                    </div>
                  </button>
                </div>
              </div>

              {mode === 'Hard' && (
                <div className="flex items-center gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
                  <AlertTriangle size={16} className="text-destructive shrink-0" />
                  <p className="text-[11px] font-bold text-destructive leading-tight uppercase tracking-tight">Warning: Data Loss Possible</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-5 border-t border-border/30 bg-secondary/10 flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={handleClose}
                className="px-5 font-bold text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                variant={mode === 'Hard' ? 'danger' : 'primary'}
                onClick={handleConfirm}
                className={cn("px-8 font-bold shadow-lg", mode === 'Hard' ? "shadow-destructive/20" : "shadow-primary/20")}
                leftIcon={mode === 'Hard' ? <Trash2 size={16}/> : <Check size={16}/>}
              >
                Undo Commit
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
