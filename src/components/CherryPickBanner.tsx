import { useAppStore } from '../store';
import { abortCherryPick, continueCherryPick } from '../lib/repo';
import { AlertCircle } from 'lucide-react';

export function CherryPickBanner() {
  const cherryPickState = useAppStore(s => s.cherryPickState);
  const conflictedFiles = useAppStore(s => s.cherryPickConflictFiles);
  const conflictedOid = useAppStore(s => s.cherryPickConflictedOid);
  const remaingOids = useAppStore(s => s.cherryPickRemainingOids);

  if (cherryPickState !== 'conflict' && cherryPickState !== 'continuing' && cherryPickState !== 'aborting') return null;

  const isWorking = cherryPickState === 'continuing' || cherryPickState === 'aborting';

  return (
    <div className="bg-gradient-to-r from-[#1e1b14] via-[#2a2213] to-[#1e1b14] border-b border-[#d29922]/40 px-4 py-2.5 flex items-center justify-between shrink-0 shadow-[0_4px_12px_rgba(210,153,34,0.05)] relative overflow-hidden">
      {/* Background Animated Glow */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#d29922]/50 to-transparent"></div>

      <div className="flex items-center gap-3.5 overflow-hidden relative z-10">
        <div className="p-1.5 bg-[#d29922]/10 text-[#d29922] border border-[#d29922]/20 rounded-full shrink-0 shadow-[0_0_10px_rgba(210,153,34,0.15)] relative">
          <AlertCircle size={18} className="animate-pulse" />
        </div>
        <div className="flex flex-col min-w-0 pt-0.5">
          <div className="flex items-center gap-2 text-[13px] text-[#e6edf3] font-bold tracking-wide truncate">
            CHERRY-PICK IN PROGRESS
            {conflictedOid && <span className="bg-[#d29922]/20 text-[#d29922] px-1.5 py-0.5 rounded text-[10px] uppercase font-mono border border-[#d29922]/30 ml-1">{conflictedOid.substring(0, 7)}</span>}
          </div>
          <span className="text-[11.5px] text-[#8b949e]">
            {conflictedFiles.length > 0 
              ? <><strong className="text-[#d29922] font-semibold">{conflictedFiles.length}</strong> conflict{conflictedFiles.length === 1 ? '' : 's'} remaining. Resolve them all to continue.</>
              : <span className="text-[#3fb950] font-semibold bg-[#238636]/10 px-1 rounded">All conflicts resolved! Ready to proceed.</span>}
            {remaingOids.length > 0 && <span className="italic ml-1 opacity-80">({remaingOids.length} more to apply)</span>}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 ml-4 relative z-10">
        <button
          className="px-3.5 py-1.5 text-[11px] uppercase tracking-wide font-bold border border-[#30363d] rounded text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d] hover:border-[#8b949e] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={abortCherryPick}
          disabled={isWorking}
        >
          {cherryPickState === 'aborting' ? 'Aborting...' : 'Abort'}
        </button>
        <button
          className="group relative overflow-hidden px-4 py-1.5 text-[11px] uppercase tracking-wider font-extrabold border border-[#d29922]/40 bg-gradient-to-b from-[#d29922] to-[#B07B18] text-white hover:from-[#e3b341] hover:to-[#B07B18] rounded shadow-[0_2px_8px_rgba(210,153,34,0.4)] hover:shadow-[0_4px_12px_rgba(210,153,34,0.6)] transition-all duration-300 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed disabled:shadow-none hover:-translate-y-0.5 active:translate-y-0"
          onClick={continueCherryPick}
          disabled={isWorking || conflictedFiles.length > 0}
        >
          <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300"></div>
          <span className="relative z-10 drop-shadow-md">
            {cherryPickState === 'continuing' ? 'Continuing...' : 'Continue'}
          </span>
        </button>
      </div>
    </div>
  );
}
