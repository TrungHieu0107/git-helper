import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info, Trash2, LucideIcon, Check, X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

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
  gradient: string;
}> = {
  danger: {
    icon: Trash2,
    iconClass: 'text-destructive',
    bgClass: 'bg-destructive/10',
    confirmVariant: 'danger',
    gradient: 'from-destructive/10',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-dracula-orange',
    bgClass: 'bg-dracula-orange/10',
    confirmVariant: 'primary',
    gradient: 'from-dracula-orange/10',
  },
  info: {
    icon: Info,
    iconClass: 'text-primary',
    bgClass: 'bg-primary/10',
    confirmVariant: 'primary',
    gradient: 'from-primary/10',
  },
};

export function ConfirmDialog() {
  const [state, setState] = useState<ConfirmDialogState | null>(null);

  useEffect(() => {
    _listener = (newState) => {
      setState(newState);
    };
    return () => { _listener = null; };
  }, []);

  const handleConfirm = useCallback(() => {
    if (!state) return;
    state.resolve(true);
    setState(null);
  }, [state]);

  const handleCancel = useCallback(() => {
    if (!state) return;
    state.resolve(false);
    setState(null);
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

  return (
    <AnimatePresence>
      {state && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCancel}
            className="absolute inset-0 bg-background/40 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="relative bg-background backdrop-blur-2xl border border-border/50 rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden"
          >
            {/* Header */}
            {(() => {
              const variant = state.variant ?? 'info';
              const cfg = VARIANT_CONFIG[variant];
              const Icon = cfg.icon;
              return (
                <div className={cn(
                  "px-6 py-5 border-b border-border/30 flex items-center justify-between bg-gradient-to-r to-transparent",
                  cfg.gradient
                )}>
                  <div className="flex items-center gap-4">
                    <div className={cn("p-2.5 rounded-xl", cfg.bgClass)}>
                      <Icon size={20} className={cfg.iconClass} />
                    </div>
                    <h2 className="text-[17px] font-bold text-foreground tracking-tight">{state.title}</h2>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleCancel} className="h-8 w-8 text-muted-foreground/40 hover:text-foreground">
                    <X size={16} />
                  </Button>
                </div>
              );
            })()}

            {/* Body */}
            <div className="px-8 py-6 flex flex-col gap-5">
              <div className="text-[14px] text-muted-foreground leading-relaxed font-medium">
                {typeof state.message === 'string' ? (
                  <p>{state.message}</p>
                ) : (
                  state.message
                )}
              </div>
              
              {state.detail && (
                <div className="bg-secondary/30 border border-border/30 rounded-xl p-4 font-mono text-xs">
                  {state.detail}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-5 border-t border-border/30 bg-secondary/10 flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={handleCancel}
                className="px-5 font-bold text-muted-foreground hover:text-foreground"
              >
                {state.cancelLabel ?? 'Cancel'}
              </Button>
              {(() => {
                const variant = state.variant ?? 'info';
                const cfg = VARIANT_CONFIG[variant];
                return (
                  <Button
                    variant={cfg.confirmVariant}
                    onClick={handleConfirm}
                    className="px-8 font-bold shadow-lg shadow-primary/20"
                    leftIcon={variant === 'danger' ? <Trash2 size={16}/> : <Check size={16}/>}
                  >
                    {state.confirmLabel ?? 'Confirm'}
                  </Button>
                );
              })()}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
