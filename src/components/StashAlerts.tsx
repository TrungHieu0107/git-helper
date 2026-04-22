import { useAppStore } from "../store";
import { AlertTriangle, Layers } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";

export function StashAlerts() {
  const stashConflict = useAppStore(state => state.stashConflict);

  const handleCancel = () => {
    useAppStore.setState({ stashConflict: null });
  };

  return (
    <AnimatePresence>
      {stashConflict && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[100] border-b border-dracula-red/30 bg-dracula-red/10 backdrop-blur-2xl shadow-2xl overflow-hidden"
        >
          {/* Main Content Area */}
          <div className="max-w-5xl mx-auto w-full px-6 py-5 flex flex-col gap-6">
            <div className="flex items-center justify-between gap-8">
              {/* Context Info */}
              <div className="flex items-center gap-5 flex-1 min-w-0">
                <div className="p-3 rounded-2xl bg-dracula-red/20 text-dracula-red shadow-lg shadow-dracula-red/10 rotate-3 transition-transform duration-500 hover:rotate-0">
                  <Layers size={22} />
                </div>
                
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] font-black tracking-widest text-dracula-red/60 uppercase">
                      Stash Conflict Detected
                    </span>
                    <Badge variant="secondary" className="px-3 py-0.5 bg-dracula-red/20 text-dracula-red font-bold border-dracula-red/10 shadow-sm">
                      {stashConflict.isPop ? "POP" : "APPLY"}
                    </Badge>
                  </div>
                  
                  <p className="text-[14px] text-dracula-red/80 font-medium leading-relaxed max-w-2xl">
                    {stashConflict.isPop 
                      ? "The changes were applied successfully but conflicts occurred. The stash remains preserved in your list." 
                      : "The changes were applied with conflicts. Manual resolution is required to finalize the state."}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  className="font-bold text-dracula-red/40 hover:text-dracula-red hover:bg-dracula-red/10 px-4"
                >
                  Dismiss Alert
                </Button>
              </div>
            </div>

            {/* Conflicted Files List */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-1">
                <label className="text-[10px] font-black text-dracula-red/40 uppercase tracking-[0.2em]">Conflicted Entities</label>
                <div className="h-px flex-1 bg-dracula-red/10" />
                <span className="text-[10px] font-bold text-dracula-red/60 font-mono tracking-tighter bg-dracula-red/10 px-2 py-0.5 rounded-full border border-dracula-red/10">
                  {stashConflict.files.length} ITEMS
                </span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto custom-scrollbar p-3 bg-background/40 border border-dracula-red/10 rounded-2xl shadow-inner">
                {stashConflict.files.map((f, i) => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.02 }}
                    key={i} 
                    className="flex items-center gap-3 px-4 py-2.5 bg-secondary/20 rounded-xl border border-border/10 group hover:border-dracula-red/30 transition-all duration-300"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-dracula-red/40 group-hover:bg-dracula-red transition-colors shadow-sm" />
                    <span className="text-[12px] font-mono text-muted-foreground truncate group-hover:text-foreground transition-colors">{f}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Resolution Hint */}
            <div className="flex items-center gap-3 bg-dracula-red/5 px-4 py-3 rounded-2xl border border-dracula-red/10 shadow-sm">
              <AlertTriangle size={16} className="text-dracula-red/60" />
              <span className="text-[12px] text-dracula-red/60 font-bold tracking-tight">
                Please resolve these conflicts in your working tree before attempting further operations.
              </span>
            </div>
          </div>

          {/* Decorative Bottom Accent */}
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-dracula-red/40" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
