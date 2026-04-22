import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Archive, X, Check, AlertTriangle, FileText, Plus, Info } from 'lucide-react';
import { useAppStore, FileStatus } from '../store';
import { stashUnstaged, saveCurrentState } from '../lib/repo';
import { toast } from '../lib/toast';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';

interface CreateStashDialogProps {
  onClose: () => void;
}

type StashMode = 'all' | 'unstaged';

export function CreateStashDialog({ onClose }: CreateStashDialogProps) {
  const { stagedFiles, unstagedFiles, lastStashMode, lastIncludeUntracked } = useAppStore();
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<StashMode>(lastStashMode);
  const [includeUntracked, setIncludeUntracked] = useState(lastIncludeUntracked);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 150);
  }, []);

  const unstagedModified = unstagedFiles.filter(f => f.status !== 'untracked');
  const untrackedFiles = unstagedFiles.filter(f => f.status === 'untracked');

  const filesToStash = mode === 'all' 
    ? [...stagedFiles, ...unstagedModified, ...(includeUntracked ? untrackedFiles : [])]
    : [...unstagedModified, ...(includeUntracked ? untrackedFiles : [])];

  const filesRemaining = mode === 'unstaged' ? stagedFiles : [];

  const canSubmit = filesToStash.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const success = await stashUnstaged({ 
        message, 
        includeUntracked, 
        keepIndex: mode === 'unstaged' 
      });

      if (success) onClose();
    } catch (e) {
      toast.error(`Operation failed: ${e}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-background/40 backdrop-blur-md"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="relative bg-background/80 backdrop-blur-2xl border border-border/50 rounded-2xl shadow-2xl w-full max-w-[520px] flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-border/30 flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-amber-500/10">
                <Archive size={20} className="text-amber-500" />
              </div>
              <div>
                <h2 className="text-[17px] font-bold text-foreground tracking-tight">Stash Changes</h2>
                <p className="text-[12px] text-muted-foreground/60">Save current work to a temporary area</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-muted-foreground/40 hover:text-foreground">
              <X size={16} />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="px-8 py-6 space-y-6">
              {/* Message Input */}
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-1">Message (Optional)</label>
                <div className="relative group">
                  <input
                    ref={inputRef}
                    type="text"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="e.g. work in progress on authentication"
                    className={cn(
                      "w-full bg-secondary/40 border border-border/50 rounded-xl px-4 py-3.5 text-[14px] text-foreground transition-all duration-300",
                      "focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none"
                    )}
                    onKeyDown={e => e.key === 'Enter' && canSubmit && handleSubmit()}
                  />
                </div>
              </div>

              {/* Stash Mode Selector */}
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-1">Stash Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => {
                      setMode('all');
                      useAppStore.setState({ lastStashMode: 'all' });
                      saveCurrentState();
                    }}
                    className={cn(
                      "flex flex-col items-start p-4 rounded-xl border transition-all text-left group",
                      mode === 'all' 
                        ? "bg-primary/5 border-primary ring-4 ring-primary/5 shadow-lg shadow-primary/5" 
                        : "bg-secondary/30 border-border/50 text-muted-foreground hover:border-border hover:bg-secondary/50"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        mode === 'all' ? "bg-primary/20 text-primary" : "bg-muted/10 text-muted-foreground group-hover:text-foreground"
                      )}>
                        <Plus size={16} />
                      </div>
                      <span className={cn("text-[14px] font-bold", mode === 'all' ? "text-primary" : "text-foreground/80 group-hover:text-foreground")}>Stash All</span>
                    </div>
                    <p className="text-[11px] opacity-60 leading-relaxed font-medium">Everything including staged changes will be stashed</p>
                  </button>

                  <button 
                    onClick={() => {
                      setMode('unstaged');
                      useAppStore.setState({ lastStashMode: 'unstaged' });
                      saveCurrentState();
                    }}
                    className={cn(
                      "flex flex-col items-start p-4 rounded-xl border transition-all text-left group",
                      mode === 'unstaged' 
                        ? "bg-primary/5 border-primary ring-4 ring-primary/5 shadow-lg shadow-primary/5" 
                        : "bg-secondary/30 border-border/50 text-muted-foreground hover:border-border hover:bg-secondary/50"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        mode === 'unstaged' ? "bg-primary/20 text-primary" : "bg-muted/10 text-muted-foreground group-hover:text-foreground"
                      )}>
                        <FileText size={16} />
                      </div>
                      <span className={cn("text-[14px] font-bold", mode === 'unstaged' ? "text-primary" : "text-foreground/80 group-hover:text-foreground")}>Unstaged Only</span>
                    </div>
                    <p className="text-[11px] opacity-60 leading-relaxed font-medium">Only modified files NOT in the index will be stashed</p>
                  </button>
                </div>
              </div>

              {/* Options */}
              <div className="px-1">
                <label className="flex items-center gap-3 cursor-pointer group select-none">
                  <div 
                    className={cn(
                      "w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200",
                      includeUntracked ? "bg-primary border-primary shadow-lg shadow-primary/20" : "border-border/60 bg-secondary/20 group-hover:border-border group-hover:bg-secondary/40"
                    )}
                    onClick={() => {
                      const nextValue = !includeUntracked;
                      setIncludeUntracked(nextValue);
                      useAppStore.setState({ lastIncludeUntracked: nextValue });
                      saveCurrentState();
                    }}
                  >
                    {includeUntracked && <Check size={14} className="text-primary-foreground" strokeWidth={3} />}
                  </div>
                  <span className="text-[13px] font-medium text-muted-foreground group-hover:text-foreground transition-colors"
                    onClick={() => {
                      const nextValue = !includeUntracked;
                      setIncludeUntracked(nextValue);
                      useAppStore.setState({ lastIncludeUntracked: nextValue });
                      saveCurrentState();
                    }}>
                    Include untracked files
                  </span>
                </label>
              </div>

              {/* Preview Section */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-border/40 bg-secondary/20 overflow-hidden shadow-inner">
                  <div className="px-4 py-2.5 bg-secondary/40 border-b border-border/30 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Files to be stashed ({filesToStash.length})</span>
                  </div>
                  <div className="max-h-[140px] overflow-y-auto custom-scrollbar p-1.5 space-y-1">
                    {filesToStash.length === 0 ? (
                      <div className="py-8 text-center flex flex-col items-center gap-2 opacity-30">
                        <Archive size={24} />
                        <span className="text-[11px] font-medium">Nothing to stash</span>
                      </div>
                    ) : (
                      filesToStash.map(f => <FileRow key={f.path} file={f} />)
                    )}
                  </div>
                </div>

                {mode === 'unstaged' && filesRemaining.length > 0 && (
                  <div className="rounded-2xl border border-border/30 bg-secondary/10 overflow-hidden opacity-50">
                    <div className="px-4 py-2.5 bg-secondary/20 border-b border-border/20 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Remaining in index ({filesRemaining.length})</span>
                      <Info size={12} className="text-muted-foreground/40" />
                    </div>
                    <div className="max-h-[100px] overflow-y-auto custom-scrollbar p-1.5 space-y-1">
                      {filesRemaining.map(f => <FileRow key={f.path} file={f} dimmed />) }
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-5 border-t border-border/30 bg-secondary/10 flex items-center justify-between">
            <div className="flex-1">
              {!canSubmit && (
                <div className="flex items-center gap-2 text-amber-500/80 px-1">
                  <AlertTriangle size={14} />
                  <span className="text-[11px] font-bold">No changes found</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost"
                onClick={onClose}
                className="px-5 font-bold text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button 
                variant="primary"
                onClick={handleSubmit}
                disabled={!canSubmit || isSubmitting}
                isLoading={isSubmitting}
                className="px-8 font-bold shadow-lg shadow-primary/20 min-w-[140px]"
              >
                {mode === 'all' ? 'Stash All' : 'Stash Unstaged'}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function FileRow({ file, dimmed = false }: { file: FileStatus, dimmed?: boolean }) {
  const statusColor = file.status === 'staged' ? 'bg-emerald-500/20 text-emerald-500' : file.status === 'untracked' ? 'bg-slate-500/20 text-slate-400' : 'bg-amber-500/20 text-amber-500';
  const statusChar = file.status[0].toUpperCase();

  return (
    <motion.div 
      initial={{ opacity: 0, x: -5 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-background/40 group transition-all duration-200",
        dimmed && "grayscale opacity-60"
      )}
    >
      <div className={cn(
        "w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black shrink-0",
        statusColor
      )}>
        {statusChar}
      </div>
      <span className="text-[13px] text-foreground/70 truncate flex-1 font-mono font-medium group-hover:text-foreground">{file.path}</span>
    </motion.div>
  );
}
