import { StateCreator } from 'zustand';
import { AppStore } from '../index';
import { CommitNode } from './logSlice';

export type CherryPickState = 'idle' | 'confirming' | 'applying' | 'conflict' | 'continuing' | 'aborting';

export interface CherryPickInProgress {
    is_in_progress: boolean;
    conflicted_oid: string | null;
    conflicted_files: string[];
}

export interface CherryPickSlice {
  cherryPickState: CherryPickState;
  cherryPickCommits: CommitNode[];
  cherryPickConflictFiles: string[];
  cherryPickConflictedOid: string | null;
  cherryPickRemainingOids: string[];
  
  setCherryPickState: (state: CherryPickState) => void;
  setCherryPickCommits: (commits: CommitNode[]) => void;
  setCherryPickConflict: (oid: string | null, files: string[], remaining: string[]) => void;
  resetCherryPick: () => void;
}

export const createCherryPickSlice: StateCreator<AppStore, [], [], CherryPickSlice> = (set) => ({
  cherryPickState: 'idle',
  cherryPickCommits: [],
  cherryPickConflictFiles: [],
  cherryPickConflictedOid: null,
  cherryPickRemainingOids: [],
  
  setCherryPickState: (state) => set(() => ({ cherryPickState: state })),
  setCherryPickCommits: (commits) => set(() => ({ cherryPickCommits: commits })),
  setCherryPickConflict: (oid, files, remaining) => set(() => ({ 
      cherryPickState: 'conflict',
      cherryPickConflictedOid: oid,
      cherryPickConflictFiles: files,
      cherryPickRemainingOids: remaining
  })),
  resetCherryPick: () => set(() => ({ 
      cherryPickState: 'idle', 
      cherryPickCommits: [], 
      cherryPickConflictFiles: [],
      cherryPickConflictedOid: null,
      cherryPickRemainingOids: []
  })),
});
