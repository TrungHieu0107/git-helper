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

export type CheckoutError = 
  | { type: 'Conflict', data: { files: string[] } }
  | { type: 'DirtyState', data: { state: string } }
  | { type: 'NotFound', data: { branch: string } }
  | { type: 'DetachedHead', data: { oid: string } }
  | { type: 'Generic', data: { message: string } };

export type StashApplyResult = 
  | { type: 'Success' }
  | { type: 'Conflict', data: { files: string[] } };

export type RepoState = 'Clean' | 'Merging' | 'Rebasing' | 'CherryPicking' | 'HasConflicts';

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
    node_type: 'commit' | 'stash';
    base_oid?: string;
}

export type BranchInfo = any;
export interface StashEntry {
    stackIndex: number;
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

export interface SelectedDiff {
    path: string;
    staged: boolean;
    commitOid?: string;
}

interface AppStore {
  repos: RepoMeta[];          // list of opened repos
  activeTabId: string;        // 'home' or repo path
  activeRepoPath: string | null;
  activeBranch: string | null;
  activeCommitOid: string | null;
  showCreateStash: boolean;
  
  selectedDiff: SelectedDiff | null;
  fileEncoding: string;
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
  confirmDiscardAll: boolean;
  confirmStashDrop: StashEntry | null;
  stashConflict: { files: string[], index: number, isPop: boolean } | null;
  checkoutError: CheckoutError | null;
  toasts: Toast[];
  commitSearchInput: string;
  selectedCommitDetail: CommitDetail | null;
  isLoadingCommitDetail: boolean;
  selectedRowIndex: number | null;

  // Persistence
  lastStashMode: 'all' | 'unstaged';
  lastIncludeUntracked: boolean;
}

export const useAppStore = create<AppStore>(() => ({
  repos: [],
  activeTabId: 'home',
  activeRepoPath: null,
  activeBranch: null,
  activeCommitOid: null,
  showCreateStash: false,

  selectedDiff: null,
  fileEncoding: 'utf-8',
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
  confirmDiscardAll: false,
  confirmStashDrop: null,
  stashConflict: null,
  checkoutError: null,
  toasts: [],
  commitSearchInput: '',
  selectedCommitDetail: null,
  isLoadingCommitDetail: false,
  selectedRowIndex: null,

  lastStashMode: 'all',
  lastIncludeUntracked: false,
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
