import { useState } from 'react';
import { GitMerge } from 'lucide-react';
import { useAppStore } from '../store';
import { abortMerge, continueMerge, abortCherryPick, continueCherryPick, abortRebase, continueRebase } from '../lib/repo';

export function MergeBanner() {
  const cherryPickState = useAppStore(state => state.cherryPickState);
  const conflictFiles = useAppStore(state => state.cherryPickConflictFiles);
  const conflictSource = useAppStore(state => state.conflictSource);
  const setCherryPickState = useAppStore(state => state.setCherryPickState);
  const activeRepoPath = useAppStore(state => state.activeRepoPath);

  const [isWorking, setIsWorking] = useState(false);

  // Only show if we are in a conflict/busy state (Merge/CherryPick/Rebase)
  if (!['conflict', 'continuing', 'aborting'].includes(cherryPickState) || !conflictSource) return null;

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
  const title = conflictSource === 'merge' ? 'MERGE IN PROGRESS' 
              : conflictSource === 'cherry_pick' ? 'CHERRY-PICK IN PROGRESS' 
              : 'REBASE IN PROGRESS';

  return (
    <div className="bg-gradient-to-r from-[#0d1a2d] via-[#0f2440] to-[#0d1a2d] border-b border-[#388bfd]/40 px-4 py-2.5 flex items-center justify-between shrink-0 shadow-[0_4px_12px_rgba(56,139,253,0.05)] relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#388bfd]/50 to-transparent"></div>

      <div className="flex items-center gap-3.5 overflow-hidden relative z-10">
        <div className="p-1.5 bg-[#388bfd]/10 text-[#388bfd] border border-[#388bfd]/20 rounded-full shrink-0 shadow-[0_0_10px_rgba(56,139,253,0.15)] relative">
          <GitMerge size={18} className="animate-pulse" />
        </div>
        <div className="flex flex-col min-w-0 pt-0.5">
          <div className="flex items-center gap-2 text-[13px] text-[#e6edf3] font-bold tracking-wide truncate uppercase">
            {title}
          </div>
          <span className="text-[11.5px] text-[#8b949e]">
            {conflictCount > 0
              ? <><strong className="text-[#388bfd] font-semibold">{conflictCount}</strong> conflict{conflictCount === 1 ? '' : 's'} remaining. Resolve them all to continue.</>
              : <span className="text-[#3fb950] font-semibold bg-[#238636]/10 px-1 rounded">All conflicts resolved! Ready to proceed.</span>}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 ml-4 relative z-10">
        <button
          className="px-3.5 py-1.5 text-[11px] uppercase tracking-wide font-bold border border-[#30363d] rounded text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d] hover:border-[#8b949e] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleAbort}
          disabled={isWorking}
        >
          {isWorking && conflictSource === 'rebase' ? 'Aborting...' : 'Abort'}
        </button>
        <button
          className="group relative overflow-hidden px-4 py-1.5 text-[11px] uppercase tracking-wider font-extrabold border border-[#388bfd]/40 bg-gradient-to-b from-[#388bfd] to-[#1f6feb] text-white hover:from-[#58a6ff] hover:to-[#1f6feb] rounded shadow-[0_2px_8px_rgba(56,139,253,0.4)] hover:shadow-[0_4px_12px_rgba(56,139,253,0.6)] transition-all duration-300 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed disabled:shadow-none hover:-translate-y-0.5 active:translate-y-0"
          onClick={handleContinue}
          disabled={isWorking || conflictCount > 0}
        >
          <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300"></div>
          <span className="relative z-10 drop-shadow-md">
            {isWorking && conflictSource === 'rebase' ? 'Continuing...' : 'Continue'}
          </span>
        </button>
      </div>
    </div>
  );
}
