import { StateCreator } from 'zustand';
import { AppStore } from '../index';

export interface RepoMeta {
  path: string;
  name: string;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

export interface SelectedDiff {
  path: string;
  staged: boolean;
  commitOid?: string;
}

export type CheckoutError = 
  | { type: 'Conflict', data: { files: string[] } }
  | { type: 'DirtyState', data: { state: string } }
  | { type: 'NotFound', data: { branch: string } }
  | { type: 'DetachedHead', data: { oid: string } }
  | { type: 'Generic', data: { message: string } };

export interface UISlice {
  repos: RepoMeta[];
  activeTabId: string;
  selectedDiff: SelectedDiff | null;
  fileEncoding: string;
  toasts: Toast[];
  confirmCheckoutTo: string | null;
  confirmDiscardAll: boolean;
  checkoutError: CheckoutError | null;
  refreshTimestamp: number;
  forceCheckoutTarget: string | null;
  forceCheckoutPhase: 'idle' | 'confirm_reset' | 'confirm_stash' | 'processing' | 'stash_conflict';

  setActiveTabId: (id: string) => void;
  setRepos: (repos: RepoMeta[]) => void;
  setSelectedDiff: (diff: SelectedDiff | null) => void;
  setFileEncoding: (encoding: string) => void;
  setConfirmCheckoutTo: (branch: string | null) => void;
  setConfirmDiscardAll: (show: boolean) => void;
  setCheckoutError: (error: CheckoutError | null) => void;
  triggerRefresh: () => void;
  addToast: (message: string, type: Toast['type'], duration?: number) => void;
  removeToast: (id: string) => void;
  setForceCheckout: (target: string | null, phase: UISlice['forceCheckoutPhase']) => void;
}

export const createUISlice: StateCreator<AppStore, [], [], UISlice> = (set) => ({
  repos: [],
  activeTabId: 'home',
  selectedDiff: null,
  fileEncoding: 'utf-8',
  toasts: [],
  confirmCheckoutTo: null,
  confirmDiscardAll: false,
  checkoutError: null,
  refreshTimestamp: 0,
  forceCheckoutTarget: null,
  forceCheckoutPhase: 'idle',

  setActiveTabId: (id) => set(() => ({ activeTabId: id })),
  setRepos: (repos) => set(() => ({ repos })),
  setSelectedDiff: (diff) => set(() => ({ selectedDiff: diff })),
  setFileEncoding: (encoding) => set(() => ({ fileEncoding: encoding })),
  setConfirmCheckoutTo: (branch) => set(() => ({ confirmCheckoutTo: branch })),
  setConfirmDiscardAll: (show) => set(() => ({ confirmDiscardAll: show })),
  setCheckoutError: (error) => set(() => ({ checkoutError: error })),
  triggerRefresh: () => set(() => ({ refreshTimestamp: Date.now() })),
  setForceCheckout: (target, phase) => set(() => ({ forceCheckoutTarget: target, forceCheckoutPhase: phase })),
  
  addToast: (message, type = 'info', duration = 5000) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }]
    }));
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id)
        }));
      }, duration);
    }
  },

  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id)
  })),
});
