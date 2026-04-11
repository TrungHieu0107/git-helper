import { StateCreator } from 'zustand';
import { AppStore } from '../index';

export interface EdgeInfo {
  to_lane: number;
  color_idx: number;
}

export interface CommitNode {
  oid: string;
  short_oid: string;
  parents: string[];
  author: string;
  email: string;
  timestamp: number;
  message: string;
  refs: string[];
  lane: number;
  color_idx: number;
  edges: EdgeInfo[];
  node_type: 'commit' | 'stash';
  base_oid?: string;
  stash_index?: number;
}

export interface CommitFileChange {
  path: string;
  old_path: string | null;
  status: string;
}

export interface CommitDetail {
  oid: string;
  short_oid: string;
  message: string;
  author: string;
  email: string;
  timestamp: number;
  parent_oids: string[];
  parent_short_oids: string[];
  files: CommitFileChange[];
}

export interface LogSlice {
  commitLog: CommitNode[];
  hasMoreCommits: boolean;
  isLoadingMore: boolean;
  commitSearchInput: string;
  selectedCommitDetail: CommitDetail | null;
  isLoadingCommitDetail: boolean;
  activeCommitOid: string | null;
  selectedRowIndex: number | null;

  setCommitLog: (log: CommitNode[]) => void;
  appendCommitLog: (log: CommitNode[]) => void;
  setHasMoreCommits: (hasMore: boolean) => void;
  setCommitSearchInput: (input: string) => void;
  setSelectedCommitDetail: (detail: CommitDetail | null) => void;
  setIsLoadingCommitDetail: (isLoading: boolean) => void;
  setActiveCommitOid: (oid: string | null) => void;
  setSelectedRowIndex: (index: number | null) => void;
}

export const createLogSlice: StateCreator<AppStore, [], [], LogSlice> = (set) => ({
  commitLog: [],
  hasMoreCommits: true,
  isLoadingMore: false,
  commitSearchInput: '',
  selectedCommitDetail: null,
  isLoadingCommitDetail: false,
  activeCommitOid: null,
  selectedRowIndex: null,

  setCommitLog: (log) => set(() => ({ commitLog: log })),
  appendCommitLog: (log) => set((state) => ({ commitLog: [...state.commitLog, ...log] })),
  setHasMoreCommits: (hasMore) => set(() => ({ hasMoreCommits: hasMore })),
  setCommitSearchInput: (input) => set(() => ({ commitSearchInput: input })),
  setSelectedCommitDetail: (detail) => set(() => ({ selectedCommitDetail: detail })),
  setIsLoadingCommitDetail: (isLoading) => set(() => ({ isLoadingCommitDetail: isLoading })),
  setActiveCommitOid: (oid) => set(() => ({ activeCommitOid: oid })),
  setSelectedRowIndex: (index) => set(() => ({ selectedRowIndex: index })),
});
