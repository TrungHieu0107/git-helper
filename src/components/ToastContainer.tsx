import { useAppStore, removeToast, Toast as ToastType } from "../store";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { useEffect, useState } from "react";

export function ToastContainer() {
  const toasts = useAppStore(state => state.toasts);

  return (
    <div className="fixed bottom-6 left-6 z-[200] flex flex-col gap-3 pointer-events-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: ToastType }) {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Entrance animation
    const timer = setTimeout(() => setVisible(true), 10);
    
    // Progress bar animation
    if (toast.duration && toast.duration > 0) {
        const interval = 10;
        const step = (interval / toast.duration) * 100;
        const progressTimer = setInterval(() => {
            setProgress(prev => Math.max(0, prev - step));
        }, interval);
        return () => {
            clearTimeout(timer);
            clearInterval(progressTimer);
        };
    }

    return () => clearTimeout(timer);
  }, [toast.duration]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => removeToast(toast.id), 300);
  };

  const icons = {
    success: <CheckCircle2 size={18} className="text-emerald-400" />,
    error: <XCircle size={18} className="text-rose-400" />,
    info: <Info size={18} className="text-blue-400" />,
  };

  const colors = {
    success: "border-emerald-500/20",
    error: "border-rose-500/20",
    info: "border-blue-500/20",
  };

  const progressColors = {
    success: "bg-emerald-500/50",
    error: "bg-rose-500/50",
    info: "bg-blue-500/50",
  };

  return (
    <div 
      className={`pointer-events-auto min-w-[320px] max-w-[400px] bg-[#1c2128]/95 backdrop-blur-md border ${colors[toast.type]} rounded-lg shadow-2xl overflow-hidden transition-all duration-300 ease-out transform
        ${visible ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0"}
      `}
    >
      <div className="px-4 py-3 flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          {icons[toast.type]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-[#e6edf3] leading-relaxed font-medium">
            {toast.message}
          </p>
        </div>
        <button 
          onClick={handleClose}
          className="text-[#8b949e] hover:text-white transition-colors p-1 -mr-1"
        >
          <X size={14} />
        </button>
      </div>

      {toast.duration && (
        <div className="h-[2px] bg-[#30363d] w-full">
          <div 
            className={`h-full ${progressColors[toast.type]} transition-all linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
