import { useAppStore } from "../store";
import { checkoutBranch } from "../lib/repo";
import { AlertCircle, Check, X } from "lucide-react";
import { useEffect, useState } from "react";

export function CheckoutAlert() {
  const branchName = useAppStore(state => state.confirmCheckoutTo);
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
      useAppStore.setState({ confirmCheckoutTo: null });
    }, 300);
  };

  const handleConfirm = () => {
    checkoutBranch(branchName!);
  };

  return (
    <div 
      className={`fixed top-0 left-0 w-full z-[100] transition-transform duration-300 ease-out transform h-[48px] border-b border-blue-500/30 ${
        visible ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {/* Background with blur for premium feel */}
      <div className="absolute inset-0 bg-[#1c2128]/95 backdrop-blur-md" />
      
      <div className="relative h-full w-full flex items-center px-4 justify-between select-none">
        <div className="flex items-center gap-4">
          <div className="bg-blue-500/20 p-1.5 rounded-full flex items-center justify-center shrink-0">
            <AlertCircle size={18} className="text-blue-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-300">Confirm Switch Branch:</span>
            <span className="text-sm font-mono font-bold text-blue-400 px-2 py-0.5 bg-blue-500/10 rounded border border-blue-500/20">
              {branchName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleConfirm}
            className="h-7 px-3 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold rounded transition-all active:scale-95 flex items-center gap-1 shadow-lg shadow-blue-900/20"
          >
            <Check size={12} />
            YES
          </button>
          <button
            onClick={handleCancel}
            className="h-7 px-3 bg-slate-700 hover:bg-slate-600 text-slate-300 text-[11px] font-bold rounded transition-all active:scale-95 flex items-center gap-1"
          >
            <X size={12} />
            NO
          </button>
        </div>
      </div>

      {/* Decorative accent line */}
      <div className="absolute bottom-0 left-0 h-[2px] bg-blue-500/50 w-full" />
    </div>
  );
}
