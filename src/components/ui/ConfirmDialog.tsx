import { useEffect, useRef, useState, useCallback } from 'react';
import { AlertTriangle, Info, Trash2, LucideIcon, Check } from 'lucide-react';
import { Button } from './Button';

export type ConfirmDialogVariant = 'danger' | 'warning' | 'info';

export interface ConfirmDialogOptions {
  title: string;
  message: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  detail?: React.ReactNode;
}

interface ConfirmDialogState extends ConfirmDialogOptions {
  resolve: (confirmed: boolean) => void;
}

type Listener = (state: ConfirmDialogState | null) => void;
let _listener: Listener | null = null;

function emit(state: ConfirmDialogState | null) {
  _listener?.(state);
}

/** 
 * Imperative API for confirmations.
 * Usage: const ok = await confirm({ title: '...', message: '...' });
 */
export function confirm(options: ConfirmDialogOptions): Promise<boolean> {
  return new Promise((resolve) => {
    emit({ ...options, resolve });
  });
}

const VARIANT_CONFIG: Record<ConfirmDialogVariant, {
  icon: LucideIcon;
  iconClass: string;
  bgClass: string;
  confirmVariant: 'danger' | 'primary' | 'secondary';
}> = {
  danger: {
    icon: Trash2,
    iconClass: 'text-red-400',
    bgClass: 'bg-red-500/10',
    confirmVariant: 'danger',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-yellow-400',
    bgClass: 'bg-yellow-500/10',
    confirmVariant: 'primary',
  },
  info: {
    icon: Info,
    iconClass: 'text-blue-400',
    bgClass: 'bg-blue-500/10',
    confirmVariant: 'primary',
  },
};

export function ConfirmDialog() {
  const [state, setState] = useState<ConfirmDialogState | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    _listener = (newState) => {
      if (newState) {
        setState(newState);
        setTimeout(() => setIsVisible(true), 10);
      } else {
        setIsVisible(false);
        setTimeout(() => setState(null), 200);
      }
    };
    return () => { _listener = null; };
  }, []);

  const handleConfirm = useCallback(() => {
    if (!state) return;
    state.resolve(true);
    _listener?.(null);
  }, [state]);

  const handleCancel = useCallback(() => {
    if (!state) return;
    state.resolve(false);
    _listener?.(null);
  }, [state]);

  useEffect(() => {
    if (!state) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCancel();
      if (e.key === 'Enter') handleConfirm();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [state, handleCancel, handleConfirm]);

  if (!state) return null;

  const variant = state.variant ?? 'info';
  const cfg = VARIANT_CONFIG[variant];
  const Icon = cfg.icon;

  return (
    <div
      className={`fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center p-4 backdrop-blur-sm transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onMouseDown={handleCancel}
    >
      <div
        className={`bg-[#1c2128] border border-[#30363d] rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden transition-all duration-200 transform ${isVisible ? 'scale-100' : 'scale-95'}`}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-5 py-4 border-b border-[#21262d] flex items-center gap-3 bg-gradient-to-r ${variant === 'danger' ? 'from-red-500/10' : variant === 'warning' ? 'from-yellow-500/10' : 'from-blue-500/10'} to-transparent`}>
          <div className={`p-2 rounded-lg ${cfg.bgClass}`}>
            <Icon size={18} className={cfg.iconClass} />
          </div>
          <h2 className="text-[15px] font-bold text-[#e6edf3]">{state.title}</h2>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="text-[13px] text-[#adbac7] leading-relaxed">
            {typeof state.message === 'string' ? (
              <p>{state.message}</p>
            ) : (
              state.message
            )}
          </div>
          
          {state.detail && (
            <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3 font-mono">
              {state.detail}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#21262d] bg-[#161b22]/50 flex justify-end gap-3">
          <button
            onClick={handleCancel}
            className="px-4 py-1.5 rounded-lg text-[12px] font-bold text-[#adbac7] hover:bg-[#30363d] transition-all active:scale-95"
          >
            {state.cancelLabel ?? 'Cancel'}
          </button>
          <Button
            variant={cfg.confirmVariant}
            size="sm"
            onClick={handleConfirm}
            className="px-6 py-1.5 font-bold shadow-lg active:scale-95"
            leftIcon={variant === 'danger' ? <Trash2 size={14}/> : <Check size={14}/>}
          >
            {state.confirmLabel ?? 'Confirm'}
          </Button>
        </div>
      </div>
    </div>
  );
}
