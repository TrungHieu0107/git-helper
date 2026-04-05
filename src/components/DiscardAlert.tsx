import { useAppStore } from "../store";
import { discardAll } from "../lib/repo";
import { AlertTriangle, Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "../lib/toast";

export function DiscardAlert() {
  const confirmDiscardAll = useAppStore(state => state.confirmDiscardAll);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (confirmDiscardAll) {
      const timer = setTimeout(() => setVisible(true), 10);
      return () => {
          clearTimeout(timer);
          setVisible(false);
      };
    } else {
      setVisible(false);
    }
  }, [confirmDiscardAll]);

  if (!confirmDiscardAll && !visible) return null;

  const handleCancel = () => {
    setVisible(false);
    setTimeout(() => {
      useAppStore.setState({ confirmDiscardAll: false });
    }, 300);
  };

  const handleConfirm = async () => {
    handleCancel();
    await discardAll();
    toast.success("All changes have been discarded.");
  };

  return (
    <div 
      className={`fixed top-0 left-0 w-full z-[100] transition-transform duration-300 ease-out transform h-[48px] border-b border-[#f85149]/30 ${
        visible ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {/* Background with blur for premium feel */}
      <div className="absolute inset-0 bg-[#1c2128]/95 backdrop-blur-md" />
      
      <div className="relative h-full w-full flex items-center px-4 justify-between select-none">
        <div className="flex items-center gap-4">
          <div className="bg-[#da3633]/20 p-1.5 rounded-full flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-[#f85149]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#e6edf3]">Nuke the working directory?</span>
            <span className="text-sm font-medium text-[#8b949e]">
              This will discard all uncommitted changes (tracked & untracked) permanently.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 relative z-10">
          <button
            onClick={handleConfirm}
            className="h-7 px-3 bg-[#da3633] hover:bg-[#b62324] text-white text-[11px] font-bold rounded transition-all active:scale-95 flex items-center gap-1 shadow-lg shadow-red-900/20"
          >
            <Check size={12} />
            DISCARD
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

      {/* Decorative accent line */}
      <div className="absolute bottom-0 left-0 h-[2px] bg-[#f85149]/50 w-full" />
    </div>
  );
}
