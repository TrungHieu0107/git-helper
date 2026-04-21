import { StateCreator } from 'zustand';
import { AppStore } from '../index';

export interface StashEntry {
  stackIndex: number;
  message: string;
  oid: string;
  parent_oid: string;
  timestamp: number;
}

export type StashApplyResult = 
  | { type: 'Success' }
  | { type: 'Conflict', data: { files: string[] } };

export type RepoState = 'Clean' | 'Merging' | 'Rebasing' | 'CherryPicking' | 'HasConflicts';

export interface StashSlice {
  stashes: StashEntry[];
  showCreateStash: boolean;
  stashConflict: { files: string[], index: number, isPop: boolean } | null;
  lastStashMode: 'all' | 'unstaged';
  lastIncludeUntracked: boolean;

  setStashes: (stashes: StashEntry[]) => void;
  setShowCreateStash: (show: boolean) => void;
  setStashConflict: (conflict: { files: string[], index: number, isPop: boolean } | null) => void;
  setLastStashSettings: (mode: 'all' | 'unstaged', includeUntracked: boolean) => void;
}

export const createStashSlice: StateCreator<AppStore, [], [], StashSlice> = (set) => ({
  stashes: [],
  showCreateStash: false,
  stashConflict: null,
  lastStashMode: 'all',
  lastIncludeUntracked: false,

  setStashes: (stashes) => set(() => ({ stashes })),
  setShowCreateStash: (show) => set(() => ({ showCreateStash: show })),
  setStashConflict: (conflict) => set(() => ({ stashConflict: conflict })),
  setLastStashSettings: (mode, includeUntracked) => set(() => ({ 
    lastStashMode: mode, 
    lastIncludeUntracked: includeUntracked 
  })),
});
