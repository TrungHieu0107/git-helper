import { useAppStore } from "../store";
import { dropStash } from "../lib/repo";
import { AlertCircle, AlertTriangle, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

export function StashAlerts() {
  const confirmDrop = useAppStore(state => state.confirmStashDrop);
  const stashConflict = useAppStore(state => state.stashConflict);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (confirmDrop || stashConflict) {
      const timer = setTimeout(() => setVisible(true), 10);
      return () => {
          clearTimeout(timer);
          setVisible(false);
      };
    } else {
      setVisible(false);
    }
  }, [confirmDrop, stashConflict]);

  if (!confirmDrop && !stashConflict && !visible) return null;

  const handleCancel = () => {
    setVisible(false);
    setTimeout(() => {
      useAppStore.setState({ confirmStashDrop: null, stashConflict: null });
    }, 300);
  };

  const handleConfirmDrop = async () => {
    if (!confirmDrop) return;
    const index = confirmDrop.stackIndex;
    handleCancel();
    await dropStash(index);
  };

  if (confirmDrop) {
    return (
      <div 
        className={`fixed top-0 left-0 w-full z-[100] transition-transform duration-300 ease-out transform h-[48px] border-b border-red-500/30 ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="absolute inset-0 bg-[#1c2128]/98 backdrop-blur-md" />
        
        <div className="relative h-full w-full flex items-center px-4 justify-between select-none max-w-5xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="bg-red-500/20 p-1.5 rounded-full flex items-center justify-center shrink-0">
              <Trash2 size={18} className="text-red-400" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-200">Delete stash entry?</span>
              <span className="text-sm text-slate-400 font-mono truncate max-w-sm">
                "{confirmDrop.message}"
              </span>
              <span className="text-xs font-bold text-red-400/80 ml-2 uppercase tracking-tighter">
                Action cannot be undone
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-10">
            <button
              onClick={handleConfirmDrop}
              className="h-7 px-3 bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold rounded transition-all active:scale-95 flex items-center gap-1 shadow-lg shadow-red-900/20"
            >
              <Trash2 size={12} />
              DELETE STASH
            </button>
            <button
              onClick={handleCancel}
              className="h-7 px-3 bg-[#30363d] hover:bg-[#21262d] text-[#c9d1d9] text-[11px] font-bold rounded transition-all active:scale-95 flex items-center gap-1"
            >
              <X size={12} />
              CANCEL
            </button>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 h-[2px] bg-red-500/50 w-full" />
      </div>
    );
  }

  if (stashConflict) {
    return (
      <div 
        className={`fixed top-0 left-0 w-full z-[100] transition-all duration-300 ease-out transform border-b bg-[#1c2128]/99 border-red-500/30 ${
          visible ? "translate-x-0" : "translate-x-full"
        } h-auto py-4`}
      >
        <div className="absolute inset-0 backdrop-blur-md" />
        
        <div className="relative h-full w-full flex flex-col px-4 justify-center select-none gap-4 max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-red-500/20 p-1.5 rounded-full flex items-center justify-center shrink-0">
                <AlertCircle size={20} className="text-red-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-red-400 uppercase tracking-wide">
                  Conflicts Detected during Stash {stashConflict.isPop ? "Pop" : "Apply"}
                </span>
                <span className="text-xs text-slate-400">
                  {stashConflict.isPop 
                    ? "The changes were applied successfully but conflicts occurred. The stash has NOT been dropped." 
                    : "The changes were applied with conflicts. Please resolve them manually."}
                </span>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="h-7 px-3 bg-[#30363d] hover:bg-[#21262d] text-[#c9d1d9] text-[11px] font-bold rounded transition-all active:scale-95 flex items-center gap-1"
            >
              <X size={12} />
              CLOSE
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Conflicted Files ({stashConflict.files.length})</span>
            <div className="max-h-40 overflow-y-auto bg-black/30 rounded-lg p-3 border border-red-500/10 custom-scrollbar">
              {stashConflict.files.map((f, i) => (
                <div key={i} className="text-[11px] font-mono text-slate-300 py-1 flex items-center gap-2 border-b border-white/5 last:border-0">
                  <span className="w-1 h-1 rounded-full bg-red-500" />
                  {f}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 bg-red-500/5 p-2 rounded border border-red-500/10">
            <AlertTriangle size={14} className="text-red-400/70" />
            <span className="text-[11px] text-slate-400">
              Please resolve these conflicts in your working tree before committing.
            </span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 h-[2px] bg-red-500/50 w-full" />
      </div>
    );
  }

  return null;
}
