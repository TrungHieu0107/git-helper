import { useAppStore } from "../store";
import { restoreFileFromCommit } from "../lib/repo";
import { History, X, Check, AlertTriangle, FileText, Info } from "lucide-react";
import { useEffect, useState, useMemo } from "react";

export function RestoreFileAlert() {
  const confirmRestoreFile = useAppStore(state => state.confirmRestoreFile);
  const setConfirmRestoreFile = useAppStore(state => state.setConfirmRestoreFile);
  const stagedFiles = useAppStore(state => state.stagedFiles);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (confirmRestoreFile) {
      const timer = setTimeout(() => setVisible(true), 10);
      return () => {
        clearTimeout(timer);
        setVisible(false);
      };
    } else {
      setVisible(false);
    }
  }, [confirmRestoreFile]);

  const isStaged = useMemo(() => {
    if (!confirmRestoreFile) return false;
    return stagedFiles.some(f => f.path === confirmRestoreFile.path);
  }, [confirmRestoreFile, stagedFiles]);

  if (!confirmRestoreFile && !visible) return null;

  const handleCancel = () => {
    if (loading) return;
    setVisible(false);
    setTimeout(() => {
      setConfirmRestoreFile(null);
    }, 300);
  };

  const handleConfirm = async () => {
    if (!confirmRestoreFile || loading) return;
    setLoading(true);
    try {
      const success = await restoreFileFromCommit(confirmRestoreFile.commitOid, confirmRestoreFile.path);
      if (success) {
        handleCancel();
      }
    } finally {
      setLoading(false);
    }
  };

  if (!confirmRestoreFile) return null;

  const { path, shortOid, commitMessage, currentPath } = confirmRestoreFile;
  const isRenamed = currentPath && currentPath !== path;

  return (
    <div className={`fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`} onClick={handleCancel}>
      <div 
        className={`w-[480px] bg-[#1c2128] border border-blue-500/30 rounded-xl shadow-2xl overflow-hidden transition-all duration-300 transform ${visible ? 'scale-100' : 'scale-95'}`}
        onClick={e => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#30363d] flex items-center justify-between bg-gradient-to-r from-blue-500/10 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-500/20 p-2 rounded-lg">
              <History size={18} className="text-blue-400" />
            </div>
            <h3 className="text-[15px] font-bold text-[#e6edf3]">Restore File from Version?</h3>
          </div>
          <button onClick={handleCancel} className="text-[#484f58] hover:text-[#8b949e] transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <FileText size={18} className="text-[#8b949e] mt-0.5 shrink-0" />
              <div className="flex flex-col min-w-0">
                 <span className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider mb-1">Target File</span>
                 <span className="text-[13px] text-[#e6edf3] font-mono break-all bg-[#0d1117] p-2 rounded border border-[#30363d]">{path}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <History size={18} className="text-[#8b949e] mt-0.5 shrink-0" />
              <div className="flex flex-col min-w-0">
                 <span className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider mb-1">From Commit</span>
                 <div className="flex items-center gap-2">
                    <span className="text-[13px] text-blue-400 font-mono font-bold">{shortOid}</span>
                    <span className="text-[13px] text-[#8b949e] truncate italic">"{commitMessage}"</span>
                 </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <p className="text-[13px] text-[#adbac7] leading-relaxed">
              This will overwrite the current working tree version of this file with the content from the selected commit.
            </p>

            {isStaged && (
              <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg animate-pulse">
                <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
                <p className="text-[12px] text-red-100 font-medium">
                  ⚠ This file has staged changes that will also be overwritten.
                </p>
              </div>
            )}

            {isRenamed && (
              <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <Info size={16} className="text-amber-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-[#adbac7]">
                  Note: This will restore to the original path <span className="text-amber-200 font-mono">{path}</span>, 
                  not the current <span className="text-amber-200 font-mono">{currentPath}</span>.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-[#161b22]/50 border-t border-[#30363d] flex items-center justify-end gap-3">
          <button
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-1.5 rounded-lg text-[12px] font-bold text-[#adbac7] hover:bg-[#30363d] transition-all active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[12px] font-bold rounded-lg transition-all active:scale-95 shadow-lg shadow-blue-900/20"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check size={14} />
            )}
            Restore File
          </button>
        </div>
      </div>
    </div>
  );
}
