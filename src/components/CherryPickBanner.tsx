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
    <div className="bg-[#1e1b14] border-b border-[#d29922]/30 px-4 py-2 flex items-center justify-between shrink-0 shadow-md">
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="p-1.5 bg-[#d29922]/20 text-[#d29922] rounded-full shrink-0">
          <AlertCircle size={16} />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 text-sm text-[#e6edf3] font-medium truncate">
            Cherry-pick in progress
            {conflictedOid && <span className="bg-[#d29922]/20 text-[#d29922] px-1.5 rounded text-xs font-mono border border-[#d29922]/30">{conflictedOid.substring(0, 7)}</span>}
          </div>
          <span className="text-xs text-[#8b949e]">
            Resolve {conflictedFiles.length} conflict{conflictedFiles.length === 1 ? '' : 's'} in the working tree, stage the files, and click Continue.
            {remaingOids.length > 0 && ` (${remaingOids.length} more to apply)`}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-4">
        <button
          className="px-3 py-1 text-xs font-medium border border-[#30363d] rounded text-[#c9d1d9] hover:bg-[#21262d] transition-colors disabled:opacity-50"
          onClick={abortCherryPick}
          disabled={isWorking}
        >
          {cherryPickState === 'aborting' ? 'Aborting...' : 'Abort Cherry-pick'}
        </button>
        <button
          className="px-3 py-1 text-xs font-medium border border-[#d29922]/40 bg-[#d29922]/10 text-[#d29922] hover:bg-[#d29922]/20 rounded transition-colors shadow-sm disabled:opacity-50"
          onClick={continueCherryPick}
          disabled={isWorking}
        >
          {cherryPickState === 'continuing' ? 'Continuing...' : 'Continue Cherry-pick'}
        </button>
      </div>
    </div>
  );
}
