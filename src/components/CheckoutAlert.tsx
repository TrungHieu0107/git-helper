import { useAppStore } from "../store";
import { checkoutBranch } from "../lib/repo";
import { Layers, GitMerge, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "../lib/toast";
import { cn } from "../lib/utils";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";

export function CheckoutAlert() {
  const branchName = useAppStore(state => state.confirmCheckoutTo);
  const checkoutError = useAppStore(state => state.checkoutError);
  const [loading, setLoading] = useState(false);

  const handleCancel = () => {
    useAppStore.setState({ confirmCheckoutTo: null, checkoutError: null });
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await checkoutBranch(branchName!);
    } finally {
      setLoading(false);
    }
  };

  const handleForce = async () => {
    setLoading(true);
    try {
      await checkoutBranch(branchName!, { force: true, merge: false, create: false });
    } finally {
      setLoading(false);
    }
  };

  const handleMerge = async () => {
    setLoading(true);
    try {
      await checkoutBranch(branchName!, { force: false, merge: true, create: false });
    } finally {
      setLoading(false);
    }
  };

  const handleStashAndSwitch = async () => {
    const path = useAppStore.getState().activeRepoPath;
    if (!path) return;
    setLoading(true);
    try {
        await invoke('create_stash', { repoPath: path, message: `Auto-stash before switch to ${branchName}` });
        await checkoutBranch(branchName!);
    } catch (e) {
        toast.error(`Stash failed: ${e}`);
    } finally {
        setLoading(false);
    }
  };

  const isConflict = checkoutError?.type === 'Conflict';
  const isDirtyState = checkoutError?.type === 'DirtyState';
  const isError = isConflict || isDirtyState;

  return (
    <AnimatePresence>
      {branchName && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className={cn(
            "fixed top-0 left-0 right-0 z-[100] border-b shadow-2xl overflow-hidden",
            isError 
              ? "bg-dracula-red/10 border-dracula-red/30 backdrop-blur-2xl" 
              : "bg-dracula-cyan/10 border-dracula-cyan/30 backdrop-blur-2xl"
          )}
        >
          {/* Main Content Area */}
          <div className="max-w-6xl mx-auto w-full flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 gap-6">
              {/* Context Info */}
              <div className="flex items-center gap-5 flex-1 min-w-0">
                <div className={cn(
                  "p-2.5 rounded-xl shadow-lg transition-transform duration-500 hover:rotate-12",
                  isError ? "bg-dracula-red/20 text-dracula-red shadow-dracula-red/10" : "bg-dracula-cyan/20 text-dracula-cyan shadow-dracula-cyan/10"
                )}>
                  {isError ? <AlertTriangle size={20} /> : <GitMerge size={20} />}
                </div>
                
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[13px] font-bold tracking-widest text-muted-foreground/60 uppercase">
                      {isDirtyState ? "Operation Blocked" : "Switch Branch"}
                    </span>
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "px-3 py-1 text-[13px] font-mono font-bold shadow-sm",
                        isError ? "bg-dracula-red/20 text-dracula-red" : "bg-dracula-cyan/20 text-dracula-cyan"
                      )}
                    >
                      {branchName}
                    </Badge>
                  </div>
                  
                  {isDirtyState ? (
                    <p className="text-[13px] text-dracula-red/80 font-medium">
                      Repository is in <b>{checkoutError.data.state}</b> state. Please resolve current activity first.
                    </p>
                  ) : isConflict ? (
                    <p className="text-[13px] text-dracula-red/80 font-medium">
                      Local changes to the files below would be overwritten by checkout.
                    </p>
                  ) : (
                    <p className="text-[13px] text-dracula-cyan/80 font-medium">
                      Switching your workspace to the selected branch.
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 shrink-0">
                {!isDirtyState && !isConflict && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleConfirm}
                    disabled={loading}
                    isLoading={loading}
                    className="bg-dracula-cyan/80 hover:bg-dracula-cyan text-white font-bold px-5 shadow-lg shadow-dracula-cyan/20"
                  >
                    Confirm Switch
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  className="font-bold text-muted-foreground hover:text-foreground"
                >
                  {isDirtyState ? "Dismiss" : "Cancel"}
                </Button>
              </div>
            </div>

            {/* Conflict Detail Section */}
            <AnimatePresence>
              {isConflict && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-dracula-red/20 bg-dracula-red/5 px-6 py-6 space-y-6"
                >
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-dracula-red/40 uppercase tracking-[0.2em] px-1">Conflicting Files</label>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-3 bg-background/40 border border-dracula-red/10 rounded-2xl shadow-inner">
                      {checkoutError.data.files.map((f: string, i: number) => (
                        <div key={i} className="flex items-center gap-3 px-3 py-2 bg-secondary/20 rounded-xl border border-border/10 group hover:border-dracula-red/20 transition-all">
                          <div className="w-1.5 h-1.5 rounded-full bg-dracula-red/40 group-hover:bg-dracula-red transition-colors" />
                          <span className="text-[12px] font-mono text-muted-foreground truncate">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleStashAndSwitch}
                      disabled={loading}
                      isLoading={loading}
                      className="bg-dracula-cyan/80 hover:bg-dracula-cyan font-bold px-6 shadow-lg shadow-dracula-cyan/20 min-w-[160px]"
                    >
                      <Layers size={14} className="mr-2" />
                      Stash & Switch
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleMerge}
                      disabled={loading}
                      className="font-bold border-dracula-red/30 text-dracula-red/80 hover:bg-dracula-red hover:text-white px-6 transition-all"
                      title="Merge local changes with the target branch"
                    >
                      <GitMerge size={14} className="mr-2" />
                      Merge Switch (-m)
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleForce}
                      disabled={loading}
                      className="font-bold text-dracula-red/40 hover:text-dracula-red hover:bg-dracula-red/10 px-4"
                      title="Discard all conflicting local changes"
                    >
                      Discard & Force
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Progress Indicator */}
          {loading && (
            <motion.div 
              layoutId="progress"
              className={cn("absolute bottom-0 left-0 h-[3px] bg-white/30", isError ? "bg-dracula-red/50" : "bg-dracula-cyan/50")}
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 2, ease: "linear" }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
