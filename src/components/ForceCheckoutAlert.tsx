import { useAppStore } from "../store";
import { forceCheckout, confirmForceCheckoutWithStash } from "../lib/repo";
import { AlertTriangle, RefreshCw, ShieldAlert, Layers, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";

export function ForceCheckoutAlert() {
  const target = useAppStore(state => state.forceCheckoutTarget);
  const phase = useAppStore(state => state.forceCheckoutPhase);

  const handleCancel = () => {
    useAppStore.setState({ forceCheckoutTarget: null, forceCheckoutPhase: 'idle' });
  };

  const handleForceCheckout = () => {
    if (target) forceCheckout(target);
  };

  const handleStashAndCheckout = () => {
    if (target) confirmForceCheckoutWithStash(target);
  };

  if (!target || phase === 'idle') return null;

  const isRemoteTarget = target.startsWith('origin/');
  const localName = isRemoteTarget ? target.replace('origin/', '') : target;
  const remoteRef = isRemoteTarget ? target : `origin/${target}`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className={cn(
          "fixed top-0 left-0 right-0 z-[100] border-b shadow-2xl backdrop-blur-2xl overflow-hidden",
          phase === 'confirm_reset' ? "bg-dracula-red/10 border-dracula-red/30" : 
          phase === 'confirm_stash' ? "bg-dracula-orange/10 border-dracula-orange/30" :
          "bg-dracula-cyan/10 border-dracula-cyan/30"
        )}
      >
        <div className="max-w-6xl mx-auto w-full px-6 py-4">
          <div className="flex items-center justify-between gap-8">
            {/* Context Info */}
            <div className="flex items-center gap-5 flex-1 min-w-0">
              <div className={cn(
                "p-2.5 rounded-xl shadow-lg transition-all duration-500",
                phase === 'confirm_reset' ? "bg-dracula-red/20 text-dracula-red shadow-dracula-red/10 rotate-3" : 
                phase === 'confirm_stash' ? "bg-dracula-orange/20 text-dracula-orange shadow-dracula-orange/10" :
                "bg-dracula-cyan/20 text-dracula-cyan shadow-dracula-cyan/10"
              )}>
                {phase === 'confirm_reset' && <ShieldAlert size={22} />}
                {phase === 'confirm_stash' && <Layers size={22} />}
                {phase === 'processing' && <RefreshCw size={22} className="animate-spin" />}
                {phase === 'stash_conflict' && <AlertTriangle size={22} />}
              </div>

              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "text-[12px] font-black tracking-widest uppercase",
                    phase === 'confirm_reset' ? "text-dracula-red/60" : 
                    phase === 'confirm_stash' ? "text-dracula-orange/60" : 
                    "text-dracula-cyan/60"
                  )}>
                    {phase === 'confirm_reset' && "Critical Action Required"}
                    {phase === 'confirm_stash' && "Local changes detected"}
                    {phase === 'processing' && "Synchronizing State"}
                    {phase === 'stash_conflict' && "Restore completed with issues"}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="px-2 py-0 font-mono font-bold bg-background/50 border-border/20">{localName}</Badge>
                    <ArrowRight size={12} className="text-muted-foreground/40" />
                    <Badge variant="secondary" className="px-2 py-0 font-mono font-bold bg-background/50 border-border/20 text-primary">{remoteRef}</Badge>
                  </div>
                </div>
                
                <div className="text-[13px] leading-relaxed font-medium">
                  {phase === 'confirm_reset' && (
                    <span className="text-dracula-red/80">
                      Resetting to match the remote branch. <span className="font-bold underline decoration-dracula-red/30 underline-offset-4">Your local commits will be permanently lost.</span>
                    </span>
                  )}
                  {phase === 'confirm_stash' && (
                    <span className="text-dracula-orange/80">
                      Changes will be stashed and automatically reapplied after the reset operation.
                    </span>
                  )}
                  {phase === 'processing' && (
                    <span className="text-dracula-cyan/80">
                      Hard-resetting the branch and preparing workspace synchronization...
                    </span>
                  )}
                  {phase === 'stash_conflict' && (
                    <span className="text-dracula-red/80">
                      Reset successful, but stashed changes could not be automatically restored. Manual resolution required.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 shrink-0">
              {phase === 'confirm_reset' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleForceCheckout}
                  className="bg-dracula-red/80 hover:bg-dracula-red text-dracula-bg font-bold px-6 shadow-lg shadow-dracula-red/20"
                >
                  Confirm Force
                </Button>
              )}

              {phase === 'confirm_stash' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleStashAndCheckout}
                  className="bg-dracula-orange/80 hover:bg-dracula-orange text-dracula-bg font-bold px-6 shadow-lg shadow-dracula-orange/20"
                >
                  Stash & Continue
                </Button>
              )}

              {phase !== 'processing' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  className="font-bold text-muted-foreground hover:text-foreground"
                >
                  {phase === 'stash_conflict' ? "Dismiss" : "Cancel"}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Decorative Progress Accent */}
        <motion.div 
          className={cn(
            "absolute bottom-0 left-0 h-[3px] bg-white/20",
            phase === 'confirm_reset' ? "bg-dracula-red/50" : 
            phase === 'confirm_stash' ? "bg-dracula-orange/50" : 
            "bg-dracula-cyan/50"
          )}
          initial={{ width: "0%" }}
          animate={{ width: phase === 'processing' ? "100%" : "0%" }}
          transition={{ duration: phase === 'processing' ? 3 : 0.5 }}
        />
      </motion.div>
    </AnimatePresence>
  );
}
