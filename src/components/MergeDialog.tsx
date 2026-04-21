import { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { mergeBranch } from '../lib/repo';
import { GitMerge, AlertTriangle, ArrowRight, Info } from 'lucide-react';

export function MergeDialog() {
  const mergeTarget = useAppStore(s => s.mergeTarget);
  const setMergeTarget = useAppStore(s => s.setMergeTarget);
  const activeBranch = useAppStore(s => s.activeBranch);
  const branches = useAppStore(s => s.branches);
  const repoStatus = useAppStore(s => s.repoStatus);

  const [isMerging, setIsMerging] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isMerging) setMergeTarget(null);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [setMergeTarget, isMerging]);

  const targetBranchInfo = useMemo(() => {
    if (!mergeTarget) return null;
    return branches.find(b => b.name === mergeTarget);
  }, [mergeTarget, branches]);

  if (!mergeTarget) return null;

  const isDirty = (repoStatus?.staged_count || 0) > 0 || (repoStatus?.unstaged_count || 0) > 0;
  const targetShortOid = targetBranchInfo?.last_commit_oid?.substring(0, 7) || '???';

  const handleConfirm = async () => {
    setIsMerging(true);
    await mergeBranch(mergeTarget);
    setIsMerging(false);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={() => !isMerging && setMergeTarget(null)}
    >
      <div
        className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#21262d] flex items-center gap-3 bg-[#0d1117]/50">
          <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
            <GitMerge size={18} />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-[#e6edf3]">Merge Branch</h2>
            <p className="text-xs text-[#8b949e]">
              Merge changes into <span className="text-blue-400 font-mono font-medium">{activeBranch || 'HEAD'}</span>
            </p>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Visual merge flow */}
          <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4">
            <div className="flex items-center justify-center gap-3">
              {/* Source branch */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="bg-[#21162e] text-[#a855f7] border border-[#a855f7]/30 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shadow-sm">
                  {mergeTarget}
                </div>
                <span className="text-[10px] font-mono text-[#6e7681]">{targetShortOid}</span>
              </div>

              {/* Arrow */}
              <div className="flex flex-col items-center">
                <ArrowRight size={20} className="text-[#3fb950]" />
              </div>

              {/* Target branch */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="bg-[#0b213f] text-[#388bfd] border border-[#388bfd]/30 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shadow-sm ring-1 ring-[#388bfd]/20">
                  {activeBranch || 'HEAD'}
                </div>
                <span className="text-[10px] font-mono text-[#6e7681]">current</span>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 px-1">
            <Info size={14} className="text-[#8b949e] mt-0.5 shrink-0" />
            <p className="text-xs text-[#8b949e] leading-relaxed">
              This will merge all commits from <span className="text-[#a855f7] font-medium">{mergeTarget}</span> into your current branch.
              If conflicts arise, you'll be prompted to resolve them.
            </p>
          </div>

          {/* Commit preview */}
          {targetBranchInfo && (
            <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3">
              <div className="text-[10px] uppercase tracking-wider text-[#484f58] font-bold mb-1">Latest Commit</div>
              <div className="text-sm text-[#c9d1d9] truncate">{targetBranchInfo.last_commit_message || 'No message'}</div>
            </div>
          )}

          {/* Dirty tree warning */}
          {isDirty && (
            <div className="px-3 py-2.5 bg-yellow-900/20 border border-yellow-700/50 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertTriangle size={16} className="text-yellow-500 mt-0.5 shrink-0" />
              <div className="flex flex-col gap-0.5">
                <p className="text-xs font-semibold text-yellow-200">Uncommitted Changes</p>
                <p className="text-[11px] text-yellow-100/80 leading-tight">
                  You have uncommitted changes. Commit or stash them before merging to avoid issues.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#21262d] bg-[#0d1117]/50 flex justify-end gap-2">
          <button
            onClick={() => setMergeTarget(null)}
            disabled={isMerging}
            className="px-4 py-1.5 rounded-md text-sm font-medium text-[#c9d1d9] hover:bg-[#21262d] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isMerging || isDirty}
            className="px-4 py-1.5 rounded-md text-sm font-medium bg-[#238636] text-white hover:bg-[#2ea043] transition-colors border border-[#2ea043]/40 flex items-center gap-2 disabled:opacity-50"
          >
            {isMerging ? (
              <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Merging...</>
            ) : (
              <><GitMerge size={14} /> Merge</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
