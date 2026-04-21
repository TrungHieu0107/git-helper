import { StateCreator } from 'zustand';
import { AppStore } from '../index';
import { CommitNode } from './logSlice';

export type CherryPickState = 'idle' | 'confirming' | 'applying' | 'conflict' | 'continuing' | 'aborting';

export interface CherryPickInProgress {
    is_in_progress: boolean;
    conflicted_oid: string | null;
    conflicted_files: string[];
}

export interface ConflictVersions {
    path: string;
    ours: string | null;
    base: string | null;
    theirs: string | null;
    raw: string | null;
    encoding: string;
}

export interface CherryPickSlice {
  cherryPickState: CherryPickState;
  conflictSource: 'merge' | 'cherry_pick' | 'rebase' | null;
  cherryPickCommits: CommitNode[];
  cherryPickConflictFiles: string[];
  cherryPickConflictedOid: string | null;
  cherryPickRemainingOids: string[];
  
  selectedConflictFile: string | null;
  conflictVersions: ConflictVersions | null;
  isLoadingConflict: boolean;
  
  setCherryPickState: (state: CherryPickState, files?: string[], source?: 'merge' | 'cherry_pick' | 'rebase' | null) => void;
  setCherryPickCommits: (commits: CommitNode[]) => void;
  setCherryPickConflict: (oid: string | null, files: string[], remaining: string[], source?: 'merge' | 'cherry_pick' | 'rebase' | null) => void;
  
  setSelectedConflictFile: (path: string | null) => void;
  setConflictVersions: (v: ConflictVersions | null) => void;
  setIsLoadingConflict: (v: boolean) => void;
  
  resetCherryPick: () => void;
}

export const createCherryPickSlice: StateCreator<AppStore, [], [], CherryPickSlice> = (set) => ({
  cherryPickState: 'idle',
  conflictSource: null,
  cherryPickCommits: [],
  cherryPickConflictFiles: [],
  cherryPickConflictedOid: null,
  cherryPickRemainingOids: [],
  
  selectedConflictFile: null,
  conflictVersions: null,
  isLoadingConflict: false,
  
  setCherryPickState: (state, files = [], source = null) => set((s) => ({ 
    cherryPickState: state,
    cherryPickConflictFiles: files,
    selectedConflictFile: files.length > 0 ? files[0] : s.selectedConflictFile,
    conflictSource: state === 'idle' ? null : (source || s.conflictSource)
  })),
  setCherryPickCommits: (commits) => set(() => ({ cherryPickCommits: commits })),
  setCherryPickConflict: (oid, files, remaining, source = 'cherry_pick') => set(() => ({ 
      cherryPickState: 'conflict',
      conflictSource: source,
      cherryPickConflictedOid: oid,
      cherryPickConflictFiles: files,
      cherryPickRemainingOids: remaining,
      selectedConflictFile: files.length > 0 ? files[0] : null,
  })),
  
  setSelectedConflictFile: (path) => set(() => ({ selectedConflictFile: path })),
  setConflictVersions: (v) => set(() => ({ conflictVersions: v })),
  setIsLoadingConflict: (v) => set(() => ({ isLoadingConflict: v })),
  resetCherryPick: () => set(() => ({ 
      cherryPickState: 'idle', 
      conflictSource: null,
      cherryPickCommits: [], 
      cherryPickConflictFiles: [],
      cherryPickConflictedOid: null,
      cherryPickRemainingOids: [],
      selectedConflictFile: null,
      conflictVersions: null,
      isLoadingConflict: false
  })),
});
