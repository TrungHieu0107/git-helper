import { RepoInfo, RepoStatus, BranchInfo, FileStatus, CheckoutError, ConflictMode } from '../../store';

export type { RepoInfo, RepoStatus, BranchInfo, FileStatus, CheckoutError, ConflictMode };
export type PullStrategy = 'fast_forward_only' | 'fast_forward_or_merge' | 'rebase';

export interface BranchValidation {
  valid: boolean;
  error: string | null;
  suggestion: string | null;
}

export interface WorkingTreeCheck {
  has_staged: boolean;
  has_unstaged: boolean;
  has_untracked: boolean;
  is_detached: boolean;
  head_branch: string | null;
  head_oid: string;
}

export interface CreateBranchResult {
  name: string;
  oid: string;
  short_oid: string;
}

export interface RemoteBranchInfo {
  name: string;
  remote: string;
  oid: string;
}

export interface SafeCheckoutResult {
  action: 'AlreadyOnBranch' | 'Clean' | 'DirtyNoConflict' | 'DirtyWithConflict' | 'DirtyState' | 'NotFound';
  files?: string[];
  state?: string;
  branch?: string;
}

export type ForceCheckoutResult =
  | { type: 'Clean' }
  | { type: 'NeedsStash' }
  | { type: 'StashAndDone', data: { stash_restored: boolean } }
  | { type: 'StashConflict', data: { files: string[] } }
  | { type: 'NoRemoteRef' }
  | { type: 'NotOnBranch' }
  | { type: 'Generic', data: { message: string } };

export interface AppStateData {
  tabs: { path: string, name: string }[];
  active_tab: string | null;
  stash_mode: 'all' | 'unstaged';
  include_untracked: boolean;
  pull_strategy: 'fast_forward_only' | 'fast_forward_or_merge' | 'rebase';
  font_size: number;
  background_color?: string;
  border_color?: string;
  panel_background_color?: string;
  layout_density?: 'compact' | 'normal';
}

export type PullResult = 
  | { type: 'UpToDate' }
  | { type: 'FastForwarded', data: { commits_added: number } }
  | { type: 'Merged', data: { merge_commit_oid: string } }
  | { type: 'Rebased', data: { commits_rebased: number } };

export type PushResult = 
  | { type: 'Success', data: { commits_pushed: number } }
  | { type: 'UpToDate' };

export interface HeadCommitInfo {
  oid: string;
  message: string;
  author_name: string;
  author_email: string;
  author_timestamp: number;
  is_pushed: boolean;
}

export interface CommitResult {
  oid: string;
  amended: boolean;
}

export interface FileCommit {
  oid: string;
  short_oid: string;
  message: string;
  author_name: string;
  author_email: string;
  timestamp: number;
}

export type ResetMode = 'Soft' | 'Mixed' | 'Hard';

export interface ConflictContext {
  source: ConflictMode;
  files: { path: string, status: string }[];
}

export interface ResetResult {
  commits_rewound: number;
}

export interface StashUnstagedOptions {
  message?: string;
  includeUntracked: boolean;
  keepIndex: boolean;
}

export interface FileLogResponse {
  commits: FileCommit[];
  has_more: boolean;
}

export type MergeResult =
  | { type: 'AlreadyUpToDate' }
  | { type: 'FastForward'; new_oid: string }
  | { type: 'MergeCommit'; merge_oid: string }
  | { type: 'Conflict'; conflicted_files: string[] };

export type StashApplyResult = 
  | { type: 'Success' }
  | { type: 'Conflict', data: { files: string[] } };
