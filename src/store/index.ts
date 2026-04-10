import { create } from 'zustand';
import { createRepoSlice, RepoSlice } from './slices/repoSlice';
import { createLogSlice, LogSlice } from './slices/logSlice';
import { createStashSlice, StashSlice } from './slices/stashSlice';
import { createUISlice, UISlice } from './slices/uiSlice';
import { createCherryPickSlice, CherryPickSlice } from './slices/cherryPickSlice';

// Re-export types for backward compatibility across the app
export * from './slices/repoSlice';
export * from './slices/logSlice';
export * from './slices/stashSlice';
export * from './slices/uiSlice';
export * from './slices/cherryPickSlice';

export type AppStore = RepoSlice & LogSlice & StashSlice & UISlice & CherryPickSlice;

export const useAppStore = create<AppStore>()((...a) => ({
  ...createRepoSlice(...a),
  ...createLogSlice(...a),
  ...createStashSlice(...a),
  ...createUISlice(...a),
  ...createCherryPickSlice(...a),
}));

// Convenience helper for components
export const addToast = (message: string, type: UISlice['toasts'][0]['type'] = 'info', duration = 5000) => {
    useAppStore.getState().addToast(message, type, duration);
};

export const removeToast = (id: string) => {
    useAppStore.getState().removeToast(id);
};

export const triggerRefresh = () => {
    useAppStore.getState().triggerRefresh();
};
