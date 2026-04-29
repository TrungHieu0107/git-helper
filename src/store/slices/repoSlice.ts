import { StateCreator } from 'zustand';
import { AppStore } from '../index';

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
  branch_name: string;
}

export interface RecentRepo {
  path: string;
  name: string;
  last_opened: number;
}

export interface BranchInfo {
  name: string;
  branch_type: string;
  is_head: boolean;
  upstream: string | null;
  ahead: number;
  behind: number;
  last_commit_oid: string;
  last_commit_message: string;
  last_commit_timestamp: number;
}

export interface FileStatus {
  path: string;
  status: string;
  old_path: string | null;
}

export interface RepoSlice {
  activeRepoPath: string | null;
  activeBranch: string | null;
  repoInfo: RepoInfo | null;
  repoStatus: RepoStatus | null;
  stagedFiles: FileStatus[];
  unstagedFiles: FileStatus[];
  isLoadingRepo: boolean;
  repoError: string | null;
  branches: BranchInfo[];
  
  setRepoInfo: (info: RepoInfo | null) => void;
  setRepoStatus: (status: RepoStatus | null) => void;
  setRepoFiles: (staged: FileStatus[], unstaged: FileStatus[]) => void;
  setRepoPath: (path: string | null) => void;
  setBranches: (branches: BranchInfo[]) => void;
  setActiveBranch: (branch: string | null) => void;
}

export const createRepoSlice: StateCreator<AppStore, [], [], RepoSlice> = (set) => ({
  activeRepoPath: null,
  activeBranch: null,
  repoInfo: null,
  repoStatus: null,
  stagedFiles: [],
  unstagedFiles: [],
  isLoadingRepo: false,
  repoError: null,
  branches: [],

  setRepoInfo: (info) => set(() => ({ repoInfo: info })),
  setRepoStatus: (status) => set(() => ({ repoStatus: status })),
  setRepoFiles: (staged, unstaged) => set(() => ({ stagedFiles: staged, unstagedFiles: unstaged })),
  setRepoPath: (path) => set(() => ({ activeRepoPath: path })),
  setBranches: (branches) => set(() => ({ branches })),
  setActiveBranch: (branch) => set(() => ({ activeBranch: branch })),
});
