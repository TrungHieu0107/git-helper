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

interface AppStore {
  repos: RepoMeta[];          // list of opened repos
  activeRepoPath: string | null;
  activeBranch: string | null;
  activeCommitOid: string | null;
  
  selectedFilePath: string | null;
  diffContent: string | null;
  stagedFiles: FileStatus[];
  unstagedFiles: FileStatus[];
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
}));
