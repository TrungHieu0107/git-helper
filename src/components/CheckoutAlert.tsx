import { useAppStore } from "../store";
import { checkoutBranch } from "../lib/repo";
import { AlertCircle, Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "../lib/toast";

export function CheckoutAlert() {
  const branchName = useAppStore(state => state.confirmCheckoutTo);
  const checkoutError = useAppStore(state => state.checkoutError);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (branchName) {
      const timer = setTimeout(() => setVisible(true), 10);
      return () => {
          clearTimeout(timer);
          setVisible(false);
      };
    } else {
      setVisible(false);
    }
  }, [branchName]);

  if (!branchName && !visible) return null;

  const handleCancel = () => {
    setVisible(false);
    setTimeout(() => {
      useAppStore.setState({ confirmCheckoutTo: null, checkoutError: null });
    }, 300);
  };

  const handleConfirm = () => {
    checkoutBranch(branchName!);
  };

  const handleForce = () => {
    checkoutBranch(branchName!, { force: true, merge: false, create: false });
  };

  const handleMerge = () => {
    checkoutBranch(branchName!, { force: false, merge: true, create: false });
  };

  const handleStashAndSwitch = async () => {
    const path = useAppStore.getState().activeRepoPath;
    if (!path) return;
    try {
        await invoke('create_stash', { repoPath: path, message: `Auto-stash before switch to ${branchName}` });
        checkoutBranch(branchName!);
    } catch (e) {
        toast.error(`Stash failed: ${e}`);
    }
  };

  const isConflict = checkoutError?.type === 'Conflict';
  const isDirtyState = checkoutError?.type === 'DirtyState';

  return (
    <div 
      className={`fixed top-0 left-0 w-full z-[100] transition-all duration-300 ease-out transform border-b ${
        visible ? "translate-x-0" : "translate-x-full"
      } ${isConflict || isDirtyState ? "h-auto py-3 bg-[#1c2128]/98 border-red-500/30" : "h-[48px] bg-[#1c2128]/95 border-blue-500/30"}`}
    >
      {/* Background with blur for premium feel */}
      <div className="absolute inset-0 backdrop-blur-md" />
      
      <div className="relative h-full w-full flex flex-col px-4 justify-center select-none gap-2">
        <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
            <div className={`${isConflict || isDirtyState ? "bg-red-500/20" : "bg-blue-500/20"} p-1.5 rounded-full flex items-center justify-center shrink-0`}>
                <AlertCircle size={18} className={isConflict || isDirtyState ? "text-red-400" : "text-blue-400"} />
            </div>
            <div className="flex flex-col">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-300">
                        {isDirtyState ? "Cannot Switch Branch:" : "Confirm Switch Branch:"}
                    </span>
                    <span className={`text-sm font-mono font-bold px-2 py-0.5 rounded border ${isConflict || isDirtyState ? "text-red-400 bg-red-500/10 border-red-500/20" : "text-blue-400 bg-blue-500/10 border-blue-500/20"}`}>
                        {branchName}
                    </span>
                </div>
                {isDirtyState && (
                    <span className="text-[11px] text-red-400/80 mt-1">
                        Repository is currently in <b>{checkoutError.data.state}</b> state. Resolve or abort before switching.
                    </span>
                )}
            </div>
            </div>

            <div className="flex items-center gap-2">
            {!isDirtyState && !isConflict && (
                <button
                    onClick={handleConfirm}
                    className="h-7 px-3 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold rounded transition-all active:scale-95 flex items-center gap-1 shadow-lg shadow-blue-900/20"
                >
                    <Check size={12} />
                    YES, SWITCH
                </button>
            )}
            <button
                onClick={handleCancel}
                className="h-7 px-3 bg-slate-700 hover:bg-slate-600 text-slate-300 text-[11px] font-bold rounded transition-all active:scale-95 flex items-center gap-1"
            >
                <X size={12} />
                {isDirtyState ? "CLOSE" : "NO, CANCEL"}
            </button>
            </div>
        </div>

        {isConflict && (
            <div className="flex flex-col gap-3 mt-2 pb-1 border-t border-red-500/20 pt-3">
                <div className="flex flex-col gap-1">
                    <span className="text-[12px] font-semibold text-red-400 uppercase tracking-wider">Local changes would be overwritten:</span>
                    <div className="max-h-24 overflow-y-auto bg-black/20 rounded p-2 flex flex-col gap-1 border border-white/5">
                        {checkoutError.data.files.map((f, i) => (
                            <span key={i} className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
                                <span className="w-1 h-1 rounded-full bg-red-500/50" /> {f}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleStashAndSwitch}
                        className="h-8 px-4 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold rounded transition-all active:scale-95 flex items-center gap-1.5 shadow-lg shadow-blue-900/20"
                    >
                        STASH & SWITCH
                    </button>
                    <button
                        onClick={handleMerge}
                        className="h-8 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-bold rounded transition-all active:scale-95 flex items-center gap-1.5"
                        title="git switch -m (Merge your changes with the target branch)"
                    >
                        MERGE SWITCH (-m)
                    </button>
                    <button
                        onClick={handleForce}
                        className="h-8 px-4 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 text-[11px] font-bold rounded transition-all active:scale-95 flex items-center gap-1.5"
                        title="Force switch (Discard all conflicting local changes)"
                    >
                        FORCE SWITCH
                    </button>
                </div>
            </div>
        )}
      </div>

      {/* Decorative accent line */}
      <div className={`absolute bottom-0 left-0 h-[2px] w-full ${isConflict || isDirtyState ? "bg-red-500/50" : "bg-blue-500/50"}`} />
    </div>
  );
}
