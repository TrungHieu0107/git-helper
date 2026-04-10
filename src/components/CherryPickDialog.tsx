import { useEffect, useState } from 'react';
import { CommitNode, useAppStore } from '../store';
import { invokeCherryPick } from '../lib/repo';
import { GitCommit, AlertTriangle } from 'lucide-react';

interface CherryPickDialogProps {
  commits: CommitNode[];
  onClose: () => void;
}

export function CherryPickDialog({ commits, onClose }: CherryPickDialogProps) {
  const activeBranch = useAppStore(s => s.activeBranch);
  const [isApplying, setIsApplying] = useState(false);

  // Focus lock & escape handling
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isApplying) onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, isApplying]);

  const hasMerge = commits.some(c => c.parents.length > 1);

  const handleConfirm = async () => {
    setIsApplying(true);
    await invokeCherryPick(commits.map(c => c.oid));
    setIsApplying(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div 
        className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="px-5 py-4 border-b border-[#21262d] flex items-center gap-3 bg-[#0d1117]/50">
          <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
            <GitCommit size={18} />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-[#e6edf3]">Cherry-Pick Commits</h2>
            <p className="text-xs text-[#8b949e]">Apply changes onto <span className="text-blue-400 font-mono font-medium">{activeBranch || 'HEAD'}</span></p>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-4">
           {hasMerge && (
             <div className="px-3 py-2 bg-yellow-900/20 border border-yellow-700/50 rounded-lg flex items-start gap-2">
                <AlertTriangle size={14} className="text-yellow-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-yellow-200/90 leading-tight">
                  One or more selected commits are merge commits. We will use the first parent as mainline.
                </p>
             </div>
           )}

           <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto custom-scrollbar border border-[#30363d] rounded bg-[#0d1117] p-2">
              {commits.map(c => (
                <div key={c.oid} className="flex items-center gap-3 py-1">
                   <span className="font-mono text-xs text-[#79c0ff] bg-[#1e293b] px-1.5 py-0.5 rounded shrink-0">{c.short_oid}</span>
                   <span className="text-sm text-[#c9d1d9] truncate">{c.message}</span>
                </div>
              ))}
           </div>
           
           <p className="text-xs text-[#8b949e]">
              This will apply the changes from {commits.length === 1 ? 'this commit' : 'these commits'} onto your current working tree and automatically commit them if there are no conflicts.
           </p>
        </div>

        <div className="px-5 py-3 border-t border-[#21262d] bg-[#0d1117]/50 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isApplying}
            className="px-4 py-1.5 rounded-md text-sm font-medium text-[#c9d1d9] hover:bg-[#21262d] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isApplying}
            className="px-4 py-1.5 rounded-md text-sm font-medium bg-[#238636] text-white hover:bg-[#2ea043] transition-colors border border-[#2ea043]/40 flex items-center gap-2 disabled:opacity-50"
          >
            {isApplying ? (
               <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Applying...</>
            ) : (
               'Cherry-pick'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
