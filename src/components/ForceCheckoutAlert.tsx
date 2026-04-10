import { useAppStore } from "../store";
import { forceCheckout, confirmForceCheckoutWithStash } from "../lib/repo";
import { AlertTriangle, Info, RefreshCw, X, Check, Save } from "lucide-react";
import { useEffect, useState } from "react";

export function ForceCheckoutAlert() {
  const target = useAppStore(state => state.forceCheckoutTarget);
  const phase = useAppStore(state => state.forceCheckoutPhase);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (target && phase !== 'idle') {
      const timer = setTimeout(() => setVisible(true), 10);
      return () => {
        clearTimeout(timer);
        setVisible(false);
      };
    } else {
      setVisible(false);
    }
  }, [target, phase]);

  if (!target || phase === 'idle' || (!visible && phase !== 'processing')) return null;

  const handleCancel = () => {
    setVisible(false);
    setTimeout(() => {
      useAppStore.setState({ forceCheckoutTarget: null, forceCheckoutPhase: 'idle' });
    }, 300);
  };

  const handleForceCheckout = () => {
    forceCheckout(target);
  };

  const handleStashAndCheckout = () => {
    confirmForceCheckoutWithStash(target);
  };

  return (
    <div 
      className={`fixed top-0 left-0 w-full z-[100] transition-all duration-300 ease-out transform border-b ${
        visible ? "translate-x-0" : "translate-x-full"
      } ${
        phase === 'confirm_reset' ? "bg-red-950/95 border-red-500/30" : 
        phase === 'confirm_stash' ? "bg-amber-950/95 border-amber-500/30" :
        "bg-[#1c2128]/95 border-blue-500/30"
      } h-auto min-h-[56px] py-2`}
    >
      <div className="absolute inset-0 backdrop-blur-md" />
      
      <div className="relative h-full w-full flex flex-col px-4 justify-center select-none gap-2 max-w-5xl mx-auto">
        <div className="flex items-center justify-between w-full gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className={`
              ${phase === 'confirm_reset' ? "bg-red-500/20 text-red-400" : 
                phase === 'confirm_stash' ? "bg-amber-500/20 text-amber-400" :
                "bg-blue-500/20 text-blue-400"} 
              p-2 rounded-full flex items-center justify-center shrink-0
            `}>
              {phase === 'confirm_reset' && <AlertTriangle size={20} />}
              {phase === 'confirm_stash' && <Info size={20} />}
              {phase === 'processing' && <RefreshCw size={20} className="animate-spin" />}
              {phase === 'stash_conflict' && <AlertTriangle size={20} />}
            </div>

            <div className="flex flex-col min-w-0">
              <span className={`text-[13px] font-bold uppercase tracking-wider ${
                phase === 'confirm_reset' ? "text-red-400" : 
                phase === 'confirm_stash' ? "text-amber-400" : 
                "text-blue-400"
              }`}>
                {phase === 'confirm_reset' && "Force Reset to Origin?"}
                {phase === 'confirm_stash' && "Local Changes Detected"}
                {phase === 'processing' && "Resetting Branch..."}
                {phase === 'stash_conflict' && "Reset Complete with Conflicts"}
              </span>
              <span className="text-[12px] text-slate-300 truncate">
                {phase === 'confirm_reset' && (
                  <>Local commits on <span className="font-mono font-bold text-white px-1.5 py-0.5 bg-white/5 rounded border border-white/10 mx-1">{target}</span> will be permanently lost.</>
                )}
                {phase === 'confirm_stash' && (
                  <>Your changes will be stashed automatically and restored after checkout.</>
                )}
                {phase === 'processing' && (
                  <>Hard-resetting {target} to origin/{target}...</>
                )}
                {phase === 'stash_conflict' && (
                  <>Branch was reset, but stashed changes could not be fully restored due to conflicts.</>
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {phase === 'confirm_reset' && (
              <button
                onClick={handleForceCheckout}
                className="h-8 px-4 bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold rounded transition-all active:scale-95 flex items-center gap-1.5 shadow-lg shadow-red-900/20"
              >
                <Check size={14} />
                YES, FORCE CHECKOUT
              </button>
            )}

            {phase === 'confirm_stash' && (
              <button
                onClick={handleStashAndCheckout}
                className="h-8 px-4 bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold rounded transition-all active:scale-95 flex items-center gap-1.5 shadow-lg shadow-amber-900/20"
              >
                <Save size={14} />
                STASH & SWITCH
              </button>
            )}

            {phase !== 'processing' && (
              <button
                onClick={handleCancel}
                className="h-8 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-bold rounded transition-all active:scale-95 flex items-center gap-1.5"
              >
                <X size={14} />
                {phase === 'stash_conflict' ? "DISMISS" : "CANCEL"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={`absolute bottom-0 left-0 h-[2px] w-full ${
        phase === 'confirm_reset' ? "bg-red-500/50" : 
        phase === 'confirm_stash' ? "bg-amber-500/50" : 
        "bg-blue-500/50"
      }`} />
    </div>
  );
}
