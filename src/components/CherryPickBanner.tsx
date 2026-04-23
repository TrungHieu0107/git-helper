import { useAppStore } from '../store';
import { abortCherryPick, continueCherryPick } from '../lib/repo';
import { GitMerge, X, Loader2, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

export function CherryPickBanner() {
  const cherryPickState = useAppStore(s => s.cherryPickState);
  const conflictedFiles = useAppStore(s => s.cherryPickConflictFiles);
  const conflictedOid = useAppStore(s => s.cherryPickConflictedOid);
  const remaingOids = useAppStore(s => s.cherryPickRemainingOids);

  const isActive = cherryPickState === 'conflict' || cherryPickState === 'continuing' || cherryPickState === 'aborting';
  if (!isActive) return null;

  const isWorking = cherryPickState === 'continuing' || cherryPickState === 'aborting';
  const hasConflicts = conflictedFiles.length > 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className="bg-dracula-orange/10 border-b border-dracula-orange/30 backdrop-blur-2xl px-6 py-3 flex items-center justify-between shrink-0 shadow-lg relative z-50 overflow-hidden"
      >
        {/* Progress Accent */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-dracula-orange/20">
          <motion.div 
            className="h-full bg-dracula-orange/60"
            initial={{ width: "0%" }}
            animate={{ width: isWorking ? "100%" : "0%" }}
            transition={{ duration: isWorking ? 2 : 0.5 }}
          />
        </div>

        <div className="flex items-center gap-5 overflow-hidden">
          <div className="p-2.5 bg-dracula-orange/20 text-dracula-orange rounded-xl shadow-lg shadow-dracula-orange/10">
            <GitMerge size={20} className={cn(isWorking && "animate-spin")} />
          </div>
          
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-3">
              <span className="text-[12px] font-bold tracking-widest text-dracula-orange/60 uppercase">
                Cherry-Pick Active
              </span>
              {conflictedOid && (
                <Badge variant="secondary" className="px-2 py-0 font-mono font-bold bg-dracula-orange/20 text-dracula-orange border-dracula-orange/10">
                  {conflictedOid.substring(0, 7)}
                </Badge>
              )}
              {remaingOids.length > 0 && (
                <Badge variant="outline" className="px-2 py-0 text-[10px] font-bold border-dracula-orange/20 text-dracula-orange/60">
                  +{remaingOids.length} MORE
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {hasConflicts ? (
                <p className="text-[13px] text-foreground/80 font-medium">
                  Resolution required: <span className="text-dracula-orange font-bold">{conflictedFiles.length} files</span> remain in conflict.
                </p>
              ) : (
                <p className="text-[13px] text-dracula-green font-bold flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-dracula-green animate-pulse" />
                  Conflicts resolved! Ready to commit and continue.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={abortCherryPick}
            disabled={isWorking}
            className="font-bold text-muted-foreground hover:text-dracula-red hover:bg-dracula-red/10 transition-all px-4"
          >
            {cherryPickState === 'aborting' ? <Loader2 size={14} className="animate-spin mr-2" /> : <X size={14} className="mr-2" />}
            Abort
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={continueCherryPick}
            disabled={isWorking || hasConflicts}
            isLoading={cherryPickState === 'continuing'}
            className={cn(
              "font-bold px-6 shadow-lg transition-all min-w-[120px]",
              hasConflicts 
                ? "bg-secondary text-muted-foreground border-border/50 shadow-none" 
                : "bg-dracula-orange/80 hover:bg-dracula-orange text-white shadow-dracula-orange/20"
            )}
          >
            {!isWorking && <Play size={14} className="mr-2 fill-current" />}
            Continue
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
