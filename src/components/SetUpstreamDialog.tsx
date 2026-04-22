import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../store";
import { pushBranchToRemote } from "../lib/repo";
import { Globe, ArrowRight, Loader2, X, AlertCircle, ChevronDown } from "lucide-react";
import { toast } from "../lib/toast";
import { cn } from "../lib/utils";
import { Button } from "./ui/Button";
import { Separator } from "./ui/Separator";

interface SetUpstreamDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function SetUpstreamDialog({ onClose, onSuccess }: SetUpstreamDialogProps) {
  const { activeRepoPath, activeBranch, setShowSetUpstreamDialog } = useAppStore();
  const [remotes, setRemotes] = useState<string[]>([]);
  const [selectedRemote, setSelectedRemote] = useState('origin');
  const [branchName, setBranchName] = useState(activeBranch || '');
  const [loading, setLoading] = useState(false);
  const [fetchingRemotes, setFetchingRemotes] = useState(true);

  useEffect(() => {
    if (activeRepoPath) {
      invoke<string[]>('list_remotes', { repoPath: activeRepoPath })
        .then(res => {
          setRemotes(res);
          if (res.length > 0 && !res.includes('origin')) {
            setSelectedRemote(res[0]);
          }
        })
        .finally(() => setFetchingRemotes(false));
    }
  }, [activeRepoPath]);

  const handleConfirm = async () => {
    if (!branchName.trim()) return;
    setLoading(true);
    try {
      const success = await pushBranchToRemote(branchName.trim(), selectedRemote, true);
      if (success) {
        toast.success(`Published branch ${branchName} to ${selectedRemote}`);
        setShowSetUpstreamDialog(false);
        onSuccess();
      }
    } finally {
      setLoading(false);
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
          className="relative bg-background/80 backdrop-blur-2xl border border-border/50 rounded-2xl shadow-2xl w-full max-w-[420px] flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-border/30 flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-dracula-cyan/10">
                <Globe size={20} className="text-dracula-cyan" />
              </div>
              <div>
                <h2 className="text-[17px] font-bold text-foreground tracking-tight">Publish Branch</h2>
                <p className="text-[12px] text-muted-foreground/60">Set upstream for {activeBranch}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-muted-foreground/40 hover:text-foreground">
              <X size={16} />
            </Button>
          </div>

          <div className="p-8 space-y-8">
            {/* Context Warning */}
            <div className="flex items-start gap-4 p-4 bg-dracula-cyan/10 border border-dracula-cyan/20 rounded-xl shadow-lg shadow-dracula-cyan/5 transition-all duration-500 hover:bg-dracula-cyan/15">
              <div className="p-1.5 rounded-lg bg-dracula-cyan/20">
                <AlertCircle size={18} className="text-dracula-cyan" />
              </div>
              <p className="text-[13px] text-dracula-cyan/90 leading-relaxed font-medium">
                This branch has no upstream tracking. Publish it to a remote to enable pushing and pulling.
              </p>
            </div>

            <div className="space-y-6">
              {/* Local Info */}
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-1">Local Branch</label>
                <div className="px-4 py-3 bg-secondary/20 border border-border/40 rounded-xl text-[14px] text-muted-foreground font-mono font-medium shadow-inner">
                  {activeBranch || 'Unknown'}
                </div>
              </div>

              <div className="flex items-center justify-center py-2 relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full bg-border/20" />
                </div>
                <div className="relative z-10 p-2 rounded-full bg-background border border-border/30 shadow-sm">
                  <ArrowRight size={16} className="text-muted-foreground/40" />
                </div>
              </div>

              {/* Remote Selection */}
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-1">Target Remote</label>
                {fetchingRemotes ? (
                  <div className="h-12 flex items-center justify-center bg-secondary/30 border border-border/40 rounded-xl shadow-inner">
                    <Loader2 size={18} className="animate-spin text-muted-foreground/40" />
                  </div>
                ) : (
                  <div className="relative group">
                    <select
                      value={selectedRemote}
                      onChange={e => setSelectedRemote(e.target.value)}
                      className={cn(
                        "w-full bg-secondary/40 border border-border/50 rounded-xl px-4 py-3.5 text-[14px] text-foreground transition-all duration-300",
                        "focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none appearance-none cursor-pointer pr-10 font-medium"
                      )}
                    >
                      {remotes.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                      {remotes.length === 0 && <option value="origin">origin</option>}
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 pointer-events-none group-hover:text-foreground transition-colors" />
                  </div>
                )}
              </div>
              
              {/* Remote Name */}
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-1">Remote Branch Name</label>
                <div className="relative group">
                  <input
                    type="text"
                    value={branchName}
                    onChange={e => setBranchName(e.target.value)}
                    className={cn(
                      "w-full bg-secondary/40 border border-border/50 rounded-xl px-4 py-3.5 text-[14px] text-foreground transition-all duration-300 font-mono",
                      "focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none placeholder:text-muted-foreground/30"
                    )}
                    placeholder="branch-name"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-5 border-t border-border/30 bg-secondary/10 flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
              className="px-5 font-bold text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={loading || fetchingRemotes || !branchName.trim()}
              isLoading={loading}
              className="px-8 font-bold shadow-lg shadow-primary/20 min-w-[160px]"
            >
              Publish & Push
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
