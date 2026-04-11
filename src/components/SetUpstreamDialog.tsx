import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../store";
import { pushBranchToRemote } from "../lib/repo";
import { Globe, ArrowRight, Loader2, X, AlertCircle } from "lucide-react";
import { toast } from "../lib/toast";

interface SetUpstreamDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function SetUpstreamDialog({ onClose, onSuccess }: SetUpstreamDialogProps) {
  const { activeRepoPath, activeBranch, setShowSetUpstreamDialog } = useAppStore();
  const [remotes, setRemotes] = useState<string[]>([]);
  const [selectedRemote, setSelectedRemote] = useState('origin');
  const [branchName, setBranchName] = useState(activeBranch || '');
  const [loading, setLoading] = useState(false);
  const [fetchingRemotes, setFetchingRemotes] = useState(true);

  useEffect(() => {
    if (activeRepoPath) {
      invoke<string[]>('list_remotes', { repoPath: activeRepoPath })
        .then(res => {
          setRemotes(res);
          if (res.length > 0 && !res.includes('origin')) {
            setSelectedRemote(res[0]);
          }
        })
        .finally(() => setFetchingRemotes(false));
    }
  }, [activeRepoPath]);

  const handleConfirm = async () => {
    if (!branchName.trim()) return;
    setLoading(true);
    try {
      const success = await pushBranchToRemote(branchName.trim(), selectedRemote, true);
      if (success) {
        toast.success(`Published branch ${branchName} to ${selectedRemote}`);
        setShowSetUpstreamDialog(false);
        onSuccess();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-[400px] bg-[#1c2128] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#30363d] flex items-center justify-between bg-[#161b22]/50">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-sky-400" />
            <h3 className="text-[14px] font-semibold text-[#e6edf3]">Publish Branch</h3>
          </div>
          <button onClick={onClose} className="text-[#484f58] hover:text-[#8b949e] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <AlertCircle size={16} className="text-blue-400 mt-0.5 shrink-0" />
            <p className="text-[12px] text-[#adbac7] leading-relaxed">
              This branch has no upstream tracking. Publish it to a remote to enable pushing and pulling.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-[#768390] uppercase tracking-wider mb-1.5 block">
                Local Branch
              </label>
              <div className="px-3 py-2 bg-[#0d1117] border border-[#21262d] rounded-lg text-[13px] text-[#8b949e] font-mono">
                {activeBranch || 'Unknown'}
              </div>
            </div>

            <div className="flex items-center justify-center py-1">
              <ArrowRight size={16} className="text-[#30363d]" />
            </div>

            <div>
              <label className="text-[11px] font-medium text-[#768390] uppercase tracking-wider mb-1.5 block">
                Target Remote
              </label>
              {fetchingRemotes ? (
                <div className="h-10 flex items-center justify-center bg-[#0d1117] border border-[#21262d] rounded-lg">
                  <Loader2 size={16} className="animate-spin text-[#484f58]" />
                </div>
              ) : (
                <select
                  value={selectedRemote}
                  onChange={e => setSelectedRemote(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#21262d] rounded-lg px-3 py-2 text-[13px] text-[#e6edf3] outline-none focus:border-sky-500/50 transition-all appearance-none cursor-pointer"
                >
                  {remotes.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                  {remotes.length === 0 && <option value="origin">origin</option>}
                </select>
              )}
            </div>
            
            <div>
              <label className="text-[11px] font-medium text-[#768390] uppercase tracking-wider mb-1.5 block">
                Remote Branch Name
              </label>
              <input
                type="text"
                value={branchName}
                onChange={e => setBranchName(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#21262d] rounded-lg px-3 py-2 text-[13px] text-[#e6edf3] font-mono outline-none focus:border-sky-500/50 transition-all"
                placeholder="branch-name"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-[#161b22]/50 border-t border-[#30363d] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-[12px] font-medium text-[#adbac7] hover:bg-[#30363d] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || fetchingRemotes || !branchName.trim()}
            className="flex items-center gap-2 px-5 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[12px] font-bold rounded-lg transition-all shadow-lg shadow-sky-900/20"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Publish & Push
          </button>
        </div>
      </div>
    </div>
  );
}
