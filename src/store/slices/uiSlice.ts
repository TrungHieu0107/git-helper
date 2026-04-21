import { StateCreator } from 'zustand';
import { AppStore } from '../index';
import { CommitNode } from './logSlice';

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

export interface RestoreFileConfirmation {
  path: string;
  commitOid: string;
  shortOid: string;
  commitMessage: string;
  currentPath?: string;
}

export type CheckoutError = 
  | { type: 'Conflict', data: { files: string[] } }
  | { type: 'DirtyState', data: { state: string } }
  | { type: 'NotFound', data: { branch: string } }
  | { type: 'DetachedHead', data: { oid: string } }
  | { type: 'Generic', data: { message: string } };

export type PullStrategy = 'fast_forward_only' | 'fast_forward_or_merge' | 'rebase';

export type ConflictMode = 'Merge' | 'Rebase' | 'CherryPick' | 'Standalone';


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
  pullStrategy: PullStrategy;
  isLoadingPull: boolean;
  isLoadingPush: boolean;
  showSetUpstreamDialog: boolean;
  lastCommitWasAmend: boolean;

  confirmRestoreFile: RestoreFileConfirmation | null;

  forceCheckoutTarget: string | null;
  forceCheckoutPhase: 'idle' | 'confirm_reset' | 'confirm_stash' | 'processing' | 'stash_conflict';

  showFileHistoryModal: boolean;
  fileHistoryPath: string | null;

  activeConflictFile: string | null;
  activeConflictMode: ConflictMode | null;
  
  isProcessing: boolean;
  processingLabel: string | null;

  resetToCommitTarget: CommitNode | null;
  mergeTarget: string | null;
  setMergeTarget: (branch: string | null) => void;

  setResetToCommitTarget: (target: CommitNode | null) => void;

  setIsProcessing: (isProcessing: boolean, label?: string | null) => void;
  setActiveTabId: (id: string) => void;
  setRepos: (repos: RepoMeta[]) => void;
  setSelectedDiff: (diff: SelectedDiff | null) => void;
  setFileEncoding: (encoding: string) => void;
  setConfirmCheckoutTo: (branch: string | null) => void;
  setConfirmDiscardAll: (show: boolean) => void;
  setCheckoutError: (error: CheckoutError | null) => void;
  triggerRefresh: () => void;
  setPullStrategy: (strategy: PullStrategy) => void;
  setIsLoadingPull: (loading: boolean) => void;
  setIsLoadingPush: (loading: boolean) => void;
  setShowSetUpstreamDialog: (show: boolean) => void;
  setLastCommitWasAmend: (wasAmend: boolean) => void;
  setConfirmRestoreFile: (conf: RestoreFileConfirmation | null) => void;

  addToast: (message: string, type: Toast['type'], duration?: number) => void;
  removeToast: (id: string) => void;
  setForceCheckout: (target: string | null, phase: UISlice['forceCheckoutPhase']) => void;
  setFileHistory: (path: string | null) => void;
  openConflictEditor: (filePath: string, mode: ConflictMode) => void;
  closeConflictEditor: () => void;
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
  pullStrategy: 'fast_forward_only',
  isLoadingPull: false,
  isLoadingPush: false,
  showSetUpstreamDialog: false,
  lastCommitWasAmend: false,

  confirmRestoreFile: null,

  forceCheckoutTarget: null,
  forceCheckoutPhase: 'idle',

  showFileHistoryModal: false,
  fileHistoryPath: null,

  activeConflictFile: null,
  activeConflictMode: null,

  isProcessing: false,
  processingLabel: null,

  resetToCommitTarget: null,
  mergeTarget: null,

  setIsProcessing: (isProcessing, label = null) => set(() => ({ isProcessing, processingLabel: label })),
  
  setResetToCommitTarget: (target) => set(() => ({ resetToCommitTarget: target })),
  
  setMergeTarget: (branch) => set(() => ({ mergeTarget: branch })),

  setActiveTabId: (id) => set(() => ({ activeTabId: id })),
  setRepos: (repos) => set(() => ({ repos })),
  setSelectedDiff: (diff) => set(() => ({ selectedDiff: diff })),
  setFileEncoding: (encoding) => set(() => ({ fileEncoding: encoding })),
  setConfirmCheckoutTo: (branch) => set(() => ({ confirmCheckoutTo: branch })),
  setConfirmDiscardAll: (show) => set(() => ({ confirmDiscardAll: show })),
  setCheckoutError: (error) => set(() => ({ checkoutError: error })),
  triggerRefresh: () => set(() => ({ refreshTimestamp: Date.now() })),
  setPullStrategy: (strategy) => set(() => ({ pullStrategy: strategy })),
  setIsLoadingPull: (loading) => set(() => ({ isLoadingPull: loading })),
  setIsLoadingPush: (loading) => set(() => ({ isLoadingPush: loading })),
  setShowSetUpstreamDialog: (show) => set(() => ({ showSetUpstreamDialog: show })),
  setLastCommitWasAmend: (wasAmend) => set(() => ({ lastCommitWasAmend: wasAmend })),
  setConfirmRestoreFile: (conf) => set(() => ({ confirmRestoreFile: conf })),

  setForceCheckout: (target, phase) => set(() => ({ forceCheckoutTarget: target, forceCheckoutPhase: phase })),
  setFileHistory: (path) => set(() => ({ fileHistoryPath: path, showFileHistoryModal: !!path })),
  openConflictEditor: (filePath, mode) => set(() => ({ activeConflictFile: filePath, activeConflictMode: mode })),
  closeConflictEditor: () => set(() => ({ activeConflictFile: null, activeConflictMode: null, conflictVersions: null })),
  
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
