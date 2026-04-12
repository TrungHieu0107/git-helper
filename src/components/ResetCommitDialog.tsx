import { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { resetToCommit, ResetMode } from '../lib/repo';
import { RotateCcw, AlertTriangle, Info } from 'lucide-react';

export function ResetCommitDialog() {
  const target = useAppStore(s => s.resetToCommitTarget);
  const setTarget = useAppStore(s => s.setResetToCommitTarget);
  const commitLog = useAppStore(s => s.commitLog);
  const repoInfo = useAppStore(s => s.repoInfo);
  const repoStatus = useAppStore(s => s.repoStatus);
  
  const [mode, setMode] = useState<ResetMode>('Mixed');
  const [isResetting, setIsResetting] = useState(false);

  // Close on Escape & Click outside
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isResetting) setTarget(null);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [setTarget, isResetting]);

  const rewindCount = useMemo(() => {
    if (!target || !repoInfo) return 0;
    const headIndex = commitLog.findIndex(c => c.oid === repoInfo.head_oid);
    const targetIndex = commitLog.findIndex(c => c.oid === target.oid);
    if (headIndex === -1 || targetIndex === -1) return 0;
    return Math.abs(targetIndex - headIndex);
  }, [target, repoInfo, commitLog]);

  if (!target) return null;

  const isDirty = (repoStatus?.staged_count || 0) > 0 || (repoStatus?.unstaged_count || 0) > 0;
  const showHardWarning = mode === 'Hard' && isDirty;

  const handleConfirm = async () => {
    setIsResetting(true);
    await resetToCommit(target.oid, mode);
    setIsResetting(false);
  };

  const modes: { id: ResetMode; label: string; desc: string; color: string }[] = [
    { 
        id: 'Soft', 
        label: 'Soft', 
        desc: 'HEAD moves. Changes kept staged and ready to re-commit.',
        color: 'text-green-400' 
    },
    { 
        id: 'Mixed', 
        label: 'Mixed (Default)', 
        desc: 'HEAD moves. Changes kept in working tree, but unstaged.',
        color: 'text-yellow-400' 
    },
    { 
        id: 'Hard', 
        label: 'Hard', 
        desc: 'HEAD moves. All changes permanently discarded.',
        color: 'text-red-400' 
    },
  ];

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={() => !isResetting && setTarget(null)}
    >
      <div 
        className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#21262d] flex items-center gap-3 bg-[#0d1117]/50">
          <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
            <RotateCcw size={18} />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-[#e6edf3]">Reset to Commit</h2>
            <p className="text-xs text-[#8b949e]">Moving HEAD to commit <span className="text-[#79c0ff] font-mono">{target.oid.substring(0, 7)}</span></p>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-5">
           {/* Target Details */}
           <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3 flex flex-col gap-1">
              <div className="text-[10px] uppercase tracking-wider text-[#484f58] font-bold">Target Message</div>
              <div className="text-sm text-[#c9d1d9] truncate">{target.message}</div>
              <div className="mt-2 text-[11px] text-[#8b949e] flex items-center gap-1.5">
                 <Info size={12} />
                 This will rewind <span className="text-white font-medium">{rewindCount} commit{rewindCount !== 1 ? 's' : ''}</span>.
              </div>
           </div>

           {/* Mode Selection */}
           <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-[#c9d1d9] ml-1">Select Reset Mode</label>
              <div className="flex flex-col gap-2">
                 {modes.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setMode(m.id)}
                      className={`flex flex-col text-left p-3 rounded-lg border transition-all ${
                        mode === m.id 
                          ? 'bg-[#1f2937]/50 border-blue-500/50 ring-1 ring-blue-500/30' 
                          : 'bg-[#0d1117] border-[#30363d] hover:border-[#444c56]'
                      }`}
                    >
                       <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm font-semibold ${m.color}`}>{m.label}</span>
                          {mode === m.id && (
                             <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                          )}
                       </div>
                       <p className="text-[11px] text-[#8b949e] leading-tight mt-0.5">{m.desc}</p>
                    </button>
                 ))}
              </div>
           </div>

           {/* Warnings */}
           {showHardWarning && (
             <div className="px-3 py-2.5 bg-red-900/20 border border-red-700/50 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                <div className="flex flex-col gap-0.5">
                   <p className="text-xs font-semibold text-red-200">Destructive Action</p>
                   <p className="text-[11px] text-red-100/80 leading-tight">
                      You have uncommitted changes. Hard reset will <span className="font-bold border-b border-red-500/50">permanently discard</span> all work in your working tree and index. This cannot be undone.
                   </p>
                </div>
             </div>
           )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#21262d] bg-[#0d1117]/50 flex justify-end gap-2">
          <button
            onClick={() => setTarget(null)}
            disabled={isResetting}
            className="px-4 py-1.5 rounded-md text-sm font-medium text-[#c9d1d9] hover:bg-[#21262d] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isResetting}
            className={`px-4 py-1.5 rounded-md text-sm font-medium text-white transition-all flex items-center gap-2 disabled:opacity-50 border ${
              mode === 'Hard' 
                ? 'bg-red-600 hover:bg-red-700 border-red-500/50' 
                : 'bg-blue-600 hover:bg-blue-700 border-blue-500/50'
            }`}
          >
            {isResetting ? (
               <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Resetting...</>
            ) : (
               mode === 'Hard' ? 'Discard & Reset' : `Reset to ${mode}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
