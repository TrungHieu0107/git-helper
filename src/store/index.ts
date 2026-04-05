import { create } from 'zustand';

export interface RepoMeta {
  path: string;
  name: string;
}

export interface FileStatus {
    path: string;
    status: string;
    old_path: string | null;
}

export interface RepoInfo {
    path: string;
    name: string;
    head_branch: string;
    head_oid: string;
    is_bare: boolean;
    remotes: string[];
    state: string;
}

export interface RepoStatus {
    staged_count: number;
    unstaged_count: number;
    untracked_count: number;
    conflict_count: number;
    ahead: number;
    behind: number;
}

export interface RecentRepo {
    path: string;
    name: string;
    last_opened: number;
}

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
}

export type BranchInfo = any;
export interface StashEntry {
    index: number;
    message: string;
    oid: string;
    parent_oid: string;
    timestamp: number;
}

export interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
    duration?: number;
}

interface AppStore {
  repos: RepoMeta[];          // list of opened repos
  activeRepoPath: string | null;
  activeBranch: string | null;
  activeCommitOid: string | null;
  
  selectedFilePath: string | null;
  diffContent: string | null;
  stagedFiles: FileStatus[];
  unstagedFiles: FileStatus[];

  // New Open Repo additions
  repoInfo: RepoInfo | null;
  repoStatus: RepoStatus | null;
  isLoadingRepo: boolean;
  repoError: string | null;
  
  branches: BranchInfo[];
  commitLog: CommitNode[];
  stashes: StashEntry[];
  hasMoreCommits: boolean;
  isLoadingMore: boolean;
  confirmCheckoutTo: string | null;
  toasts: Toast[];
  commitSearchInput: string;
}

export const useAppStore = create<AppStore>(() => ({
  repos: [],
  activeRepoPath: null,
  activeBranch: null,
  activeCommitOid: null,

  selectedFilePath: null,
  diffContent: null,
  stagedFiles: [],
  unstagedFiles: [],

  repoInfo: null,
  repoStatus: null,
  isLoadingRepo: false,
  repoError: null,
  
  branches: [],
  commitLog: [],
  stashes: [],
  hasMoreCommits: true,
  isLoadingMore: false,
  confirmCheckoutTo: null,
  toasts: [],
  commitSearchInput: '',
}));

export const addToast = (message: string, type: Toast['type'] = 'info', duration = 5000) => {
    const id = Math.random().toString(36).substring(2, 9);
    useAppStore.setState(state => ({
        toasts: [...state.toasts, { id, message, type, duration }]
    }));
    if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
    }
};

export const removeToast = (id: string) => {
    useAppStore.setState(state => ({
        toasts: state.toasts.filter(t => t.id !== id)
    }));
};
