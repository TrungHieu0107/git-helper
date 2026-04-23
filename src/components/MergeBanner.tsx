import { useState } from 'react';
import { GitMerge, X, AlertTriangle, Play, Loader2, GitPullRequest, RotateCw } from 'lucide-react';
import { useAppStore } from '../store';
import { abortMerge, continueMerge, abortCherryPick, continueCherryPick, abortRebase, continueRebase } from '../lib/repo';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

export function MergeBanner() {
  const cherryPickState = useAppStore(state => state.cherryPickState);
  const conflictFiles = useAppStore(state => state.cherryPickConflictFiles);
  const conflictSource = useAppStore(state => state.conflictSource);
  const setCherryPickState = useAppStore(state => state.setCherryPickState);
  const activeRepoPath = useAppStore(state => state.activeRepoPath);

  const [isWorking, setIsWorking] = useState(false);

  const isActive = ['conflict', 'continuing', 'aborting'].includes(cherryPickState) && !!conflictSource;
  if (!isActive) return null;

  const handleAbort = async () => {
    if (!activeRepoPath) return;
    setIsWorking(true);
    let success = false;
    
    if (conflictSource === 'merge') {
      await abortMerge();
      success = true;
    } else if (conflictSource === 'cherry_pick') {
      await abortCherryPick();
      success = true;
    } else if (conflictSource === 'rebase') {
      await abortRebase();
      success = true;
    }

    if (success) {
      setCherryPickState('idle');
    }
    setIsWorking(false);
  };

  const handleContinue = async () => {
    if (!activeRepoPath) return;
    setIsWorking(true);
    let success = false;

    if (conflictSource === 'merge') {
      await continueMerge();
      success = true;
    } else if (conflictSource === 'cherry_pick') {
      await continueCherryPick();
      success = true;
    } else if (conflictSource === 'rebase') {
      await continueRebase();
      success = true;
    }

    if (success) {
      setCherryPickState('idle');
    }
    setIsWorking(false);
  };

  const conflictCount = conflictFiles.length;
  const hasConflicts = conflictCount > 0;

  const getSourceConfig = () => {
    switch (conflictSource) {
      case 'merge':
        return { label: 'Merge', icon: GitMerge, color: 'dracula-cyan' };
      case 'rebase':
        return { label: 'Rebase', icon: RotateCw, color: 'dracula-purple' };
      case 'cherry_pick':
        return { label: 'Cherry-Pick', icon: GitPullRequest, color: 'dracula-orange' };
      default:
        return { label: 'Operation', icon: AlertTriangle, color: 'dracula-cyan' };
    }
  };

  const config = getSourceConfig();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-2xl px-6 py-3 flex items-center justify-between shrink-0 shadow-lg",
          config.color === 'dracula-cyan' ? "bg-dracula-cyan/10 border-dracula-cyan/30" : 
          config.color === 'dracula-purple' ? "bg-dracula-purple/10 border-dracula-purple/30" :
          "bg-dracula-orange/10 border-dracula-orange/30"
        )}
      >
        {/* Progress Indication */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-background/20">
          <motion.div 
            className={cn(
              "h-full",
              config.color === 'dracula-cyan' ? "bg-dracula-cyan/60" : 
              config.color === 'dracula-purple' ? "bg-dracula-purple/60" :
              "bg-dracula-orange/60"
            )}
            initial={{ width: "0%" }}
            animate={{ width: isWorking ? "100%" : "0%" }}
            transition={{ duration: isWorking ? 2 : 0.5 }}
          />
        </div>

        <div className="flex items-center gap-5 overflow-hidden">
          <div className={cn(
            "p-2.5 rounded-xl shadow-lg transition-transform duration-500",
            config.color === 'dracula-cyan' ? "bg-dracula-cyan/20 text-dracula-cyan shadow-dracula-cyan/10" : 
            config.color === 'dracula-purple' ? "bg-dracula-purple/20 text-dracula-purple shadow-dracula-purple/10" :
            "bg-dracula-orange/20 text-dracula-orange shadow-dracula-orange/10"
          )}>
            <config.icon size={20} className={cn(isWorking && "animate-spin")} />
          </div>
          
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-3">
              <span className={cn(
                "text-[12px] font-bold tracking-widest uppercase",
                config.color === 'dracula-cyan' ? "text-dracula-cyan/60" : 
                config.color === 'dracula-purple' ? "text-dracula-purple/60" :
                "text-dracula-orange/60"
              )}>
                {config.label} Active
              </span>
              <Badge variant="secondary" className="px-2 py-0 text-[10px] font-bold border-border/20">
                PENDING COMMIT
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              {hasConflicts ? (
                <p className="text-[13px] text-foreground/80 font-medium">
                  Workspace blocked: <span className={cn("font-bold text-foreground", `text-${config.color}`)}>{conflictCount} files</span> require resolution.
                </p>
              ) : (
                <p className="text-[13px] text-dracula-green font-bold flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-dracula-green animate-pulse" />
                  All conflicts resolved. Ready to continue the {config.label.toLowerCase()}.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAbort}
            disabled={isWorking}
            className="font-bold text-muted-foreground hover:text-dracula-red hover:bg-dracula-red/10 transition-all px-4"
          >
            {isWorking ? <Loader2 size={14} className="animate-spin mr-2" /> : <X size={14} className="mr-2" />}
            Abort
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleContinue}
            disabled={isWorking || hasConflicts}
            isLoading={isWorking}
            className={cn(
              "font-bold px-6 shadow-lg transition-all min-w-[120px]",
              hasConflicts 
                ? "bg-secondary text-muted-foreground border-border/50 shadow-none" 
                : config.color === 'dracula-cyan' ? "bg-dracula-cyan/80 hover:bg-dracula-cyan text-dracula-bg shadow-dracula-cyan/20" :
                  config.color === 'dracula-purple' ? "bg-dracula-purple/80 hover:bg-dracula-purple text-dracula-bg shadow-dracula-purple/20" :
                  "bg-dracula-orange/80 hover:bg-dracula-orange text-dracula-bg shadow-dracula-orange/20"
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
