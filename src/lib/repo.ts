import { invoke } from '@tauri-apps/api/core';
import { useAppStore, RepoInfo, RepoStatus, BranchInfo, CommitNode, FileStatus, CommitDetail, CheckoutError, RepoState, StashApplyResult } from '../store';
import { toast } from './toast';

// ── Branch Validation Types ──────────────────────────────────────────────────

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

// ── Safe Checkout ────────────────────────────────────────────────────────────

export interface SafeCheckoutResult {
  action: 'AlreadyOnBranch' | 'Clean' | 'DirtyNoConflict' | 'DirtyWithConflict' | 'DirtyState' | 'NotFound';
  files?: string[];
  state?: string;
  branch?: string;
}

export interface AppStateData {
  tabs: { path: string, name: string }[];
  active_tab: string | null;
  stash_mode: 'all' | 'unstaged';
  include_untracked: boolean;
}

export interface StashUnstagedOptions {
  message?: string;
  includeUntracked: boolean;
  keepIndex: boolean;
}

/**
 * Performs a pre-checkout validation against the backend.
 * Returns a structured result telling the caller what to do next.
 */
export async function safeCheckout(branchName: string): Promise<SafeCheckoutResult> {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) throw new Error('No repo open');
  return await invoke<SafeCheckoutResult>('safe_checkout', { repoPath: path, branchName });
}

/**
 * Automates the standard safe checkout UI flow. Calls safe_checkout and 
 * appropriately redirects to direct checkout, alert dialogs, or toast messages.
 */
export async function safeSwitchBranch(branchName: string) {
  try {
    const result = await safeCheckout(branchName);
    switch (result.action) {
      case 'Clean':
      case 'DirtyNoConflict':
        await checkoutBranch(branchName);
        break;
      case 'DirtyWithConflict':
        useAppStore.setState({ 
          confirmCheckoutTo: branchName,
          checkoutError: { type: 'Conflict', data: { files: result.files || [] } }
        });
        break;
      case 'DirtyState':
        useAppStore.setState({ 
          confirmCheckoutTo: branchName,
          checkoutError: { type: 'DirtyState', data: { state: result.state || 'unknown' } }
        });
        break;
      case 'AlreadyOnBranch':
        toast.info(`Already on branch "${branchName}"`);
        break;
      case 'NotFound':
        toast.error(`Branch "${branchName}" not found.`);
        break;
    }
  } catch (err) {
    toast.error(`Pre-checkout check failed: ${err}`);
  }
}


export async function loadRepo(path: string) {
  useAppStore.setState({ isLoadingRepo: true, repoError: null });
  
  try {
    const info = await invoke<RepoInfo>('open_repo', { path });
    const status = await invoke<RepoStatus>('get_repo_status', { path });
    
    // We fetch these even if they are stubs for now
    const branches = await invoke<BranchInfo[]>('list_branches', { repoPath: path });
    const log = await invoke<CommitNode[]>('get_log', { repoPath: path, limit: 200, offset: 0 });
    const backendStashes = await invoke<any[]>('list_stashes', { repoPath: path });
    const stashes = backendStashes.map(s => ({
      ...s,
      stackIndex: s.index
    }));
    const fileStatuses = await invoke<FileStatus[]>('get_status', { repoPath: path });

    const stagedFiles = fileStatuses.filter(f => f.status === 'staged');
    const unstagedFiles = fileStatuses.filter(f => f.status === 'unstaged' || f.status === 'untracked' || f.status === 'conflicted');

    const state = useAppStore.getState();
    const existingRepo = state.repos.find(r => r.path === path);
    const updatedRepos = existingRepo 
      ? state.repos 
      : [...state.repos, { path: info.path, name: info.name }];

    useAppStore.setState({
      activeRepoPath: info.path,
      activeTabId: info.path,
      activeBranch: info.head_branch,
      repoInfo: info,
      repoStatus: status,
      branches,
      commitLog: log,
      stashes,
      stagedFiles,
      unstagedFiles,
      repos: updatedRepos,
      hasMoreCommits: log.length === 200,
    });

    saveCurrentState();
    refreshCherryPickState();
  } catch (e) {
    useAppStore.setState({ 
      repoError: typeof e === 'string' ? e : 'Failed to open repository',
      activeRepoPath: null,
      repoInfo: null
    });
  } finally {
    useAppStore.setState({ isLoadingRepo: false });
  }
}

export async function loadMoreCommits() {
  const state = useAppStore.getState();
  if (!state.activeRepoPath || state.isLoadingMore || !state.hasMoreCommits) return;
  useAppStore.setState({ isLoadingMore: true });
  
  try {
    const currentLen = state.commitLog.length;
    const log = await invoke<CommitNode[]>('get_log', { 
      repoPath: state.activeRepoPath, 
      limit: 200, 
      offset: currentLen 
    });
    
    useAppStore.setState({ 
      commitLog: [...state.commitLog, ...log],
      hasMoreCommits: log.length === 200
    });
  } catch (e) {
    console.error('Failed to load more commits:', e);
  } finally {
    useAppStore.setState({ isLoadingMore: false });
  }
}

export async function checkoutBranch(branchName: string, options = { force: false, merge: false, create: false }) {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;
  
  try {
    useAppStore.setState({ checkoutError: null });
    await invoke('checkout_branch', { repoPath: path, branchName, options });
    // Refresh the repo state
    await loadRepo(path);
    toast.success(`Switched to branch "${branchName}"`);
    useAppStore.setState({ confirmCheckoutTo: null });
  } catch (e: any) {
    console.error("Checkout failed structure:", e);
    
    // e should be of type CheckoutError if it came from our Result<.., CheckoutError>
    const checkoutError = e as CheckoutError;
    useAppStore.setState({ checkoutError });

    if (checkoutError.type === 'Generic') {
      toast.error(`Checkout failed: ${checkoutError.data.message}`);
    } else if (checkoutError.type === 'NotFound') {
      toast.error(`Branch "${branchName}" not found.`);
    } else if (checkoutError.type === 'DirtyState') {
      toast.error(`Repository is in a ${checkoutError.data.state} state. Resolve it first.`);
    } else if (checkoutError.type === 'DetachedHead') {
      toast.info(`Switched to detached HEAD at ${checkoutError.data.oid.substring(0, 7)}`);
      await loadRepo(path);
      useAppStore.setState({ confirmCheckoutTo: null });
    }
  }
}

export async function fetchAllRepo() {
  const { activeRepoPath } = useAppStore.getState();
  if (!activeRepoPath) return;

  try {
    await invoke('fetch_all_remotes', { repoPath: activeRepoPath });
    toast.success('Fetched all remotes successfully');
    await loadRepo(activeRepoPath);
  } catch (e) {
    toast.error(`Fetch failed: ${e}`);
  }
}

export async function pullRepo() {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;
  
  try {
    toast.info("Pulling changes...");
    await invoke('pull_remote', { repoPath: path, remote: 'origin' });
    await loadRepo(path);
    toast.success("Pulled successfully");
  } catch (e) {
    toast.error(`Pull failed: ${e}`);
  }
}

export async function pushRepo() {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;
  
  try {
    toast.info("Pushing changes...");
    await invoke('push_remote', { repoPath: path, remote: 'origin' });
    await loadRepo(path);
    toast.success("Pushed successfully");
  } catch (e) {
    toast.error(`Push failed: ${e}`);
  }
}

export async function createStash(message?: string) {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;
  
  try {
    await invoke('create_stash', { repoPath: path, message: message || null });
    await loadRepo(path);
    toast.success("Stashed changes");
  } catch (e) {
    toast.error(`Stash failed: ${e}`);
  }
}

export async function stashUnstaged(options: StashUnstagedOptions) {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;

  try {
    // 1. Precondition Check
    const state = await invoke<RepoState>('check_stash_preconditions', { repoPath: path });
    if (state !== 'Clean') {
      toast.error(`Cannot stash: repository is in ${state} state`);
      return;
    }

    // 2. Perform Stash Advanced
    await invoke('stash_save_advanced', {
      repoPath: path,
      message: options.message || null,
      includeUntracked: options.includeUntracked,
      keepIndex: options.keepIndex,
    });

    await loadRepo(path); // Refresh UI
    toast.success(options.keepIndex ? "Stashed unstaged changes" : "Stashed all changes");
    return true;
  } catch (e) {
    toast.error(`Stash failed: ${e}`);
    return false;
  }
}

export async function applyStash(stackIndex: number) {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;

  try {
    // 1. Precondition Check
    const state = await invoke<RepoState>('check_stash_preconditions', { repoPath: path });
    if (state !== 'Clean') {
      const errorMsg = state === 'HasConflicts' 
        ? "Working tree already has conflicts. Resolve them first."
        : `Repository is in a ${state} state. Resolve it first.`;
      toast.error(errorMsg);
      return;
    }

    // 2. Perform Apply
    const result = await invoke<StashApplyResult>('apply_stash', { repoPath: path, index: stackIndex });
    
    await loadRepo(path); // Refresh UI to show applied changes

    if (result.type === 'Conflict') {
      // Handle Conflicts
      useAppStore.setState({ stashConflict: { files: result.data.files, index: stackIndex, isPop: false } });
      toast.info("Stash applied with conflicts. Please resolve them manually.");
    } else {
      toast.success("Applied stash successfully");
    }
  } catch (e) {
    toast.error(`Apply stash failed: ${e}`);
  }
}

export async function popStash(stackIndex: number) {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;

  try {
    // 1. Precondition Check
    const state = await invoke<RepoState>('check_stash_preconditions', { repoPath: path });
    if (state !== 'Clean') {
      const errorMsg = state === 'HasConflicts' 
        ? "Working tree already has conflicts. Resolve them first."
        : `Repository is in a ${state} state. Resolve it first.`;
      toast.error(errorMsg);
      return;
    }

    // 2. Perform Pop (Atomic apply + conditional drop on backend)
    const result = await invoke<StashApplyResult>('pop_stash', { repoPath: path, index: stackIndex });
    
    await loadRepo(path); // Refresh UI

    if (result.type === 'Conflict') {
      useAppStore.setState({ stashConflict: { files: result.data.files, index: stackIndex, isPop: true } });
      toast.info("Conflicts detected. Stash was applied but NOT dropped.");
    } else {
      toast.success("Popped stash successfully");
    }
  } catch (e) {
    toast.error(`Pop stash failed: ${e}`);
  }
}

export async function dropStash(stackIndex: number) {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;

  try {
    await invoke('drop_stash', { repoPath: path, index: stackIndex });
    await loadRepo(path);
    toast.success("Dropped stash entry");
  } catch (e) {
    toast.error(`Drop stash failed: ${e}`);
  }
}

export async function createBranch(name: string, startPoint?: string): Promise<CreateBranchResult | null> {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return null;
  
  try {
    const result = await invoke<CreateBranchResult>('create_branch', { repoPath: path, name, startPoint });
    await loadRepo(path);
    toast.success(`Created branch "${name}"`);
    return result;
  } catch (e) {
    toast.error(`Failed to create branch: ${e}`);
    return null;
  }
}

export async function validateBranchName(name: string): Promise<BranchValidation> {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return { valid: false, error: 'No repo open', suggestion: null };
  return await invoke<BranchValidation>('validate_branch_name', { repoPath: path, name });
}

export async function checkWorkingTree(): Promise<WorkingTreeCheck | null> {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return null;
  return await invoke<WorkingTreeCheck>('check_working_tree', { repoPath: path });
}

export async function pushBranchToRemote(branchName: string, remote = 'origin', setUpstream = true): Promise<boolean> {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return false;
  try {
    await invoke('push_branch_to_remote', { repoPath: path, branchName, remote, setUpstream });
    toast.success(`Pushed "${branchName}" to ${remote}`);
    return true;
  } catch (e) {
    toast.error(`Push failed: ${e}`);
    return false;
  }
}

export async function listRemoteBranches(): Promise<RemoteBranchInfo[]> {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return [];
  return await invoke<RemoteBranchInfo[]>('list_remote_branches', { repoPath: path });
}

export async function fetchAndListRemote(): Promise<RemoteBranchInfo[]> {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return [];
  try {
    toast.info('Fetching remote branches...');
    await invoke('fetch_remote', { repoPath: path, remote: 'origin' });
    const branches = await listRemoteBranches();
    return branches;
  } catch (e) {
    toast.error(`Fetch failed: ${e}`);
    return [];
  }
}

export async function autoStash(branchName: string): Promise<boolean> {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return false;
  try {
    await invoke('create_stash', { repoPath: path, message: `auto-stash before create branch ${branchName}` });
    return true;
  } catch (e) {
    toast.error(`Auto-stash failed: ${e}`);
    return false;
  }
}

export async function commitRepo(message: string, amend: boolean = false) {
  const path = useAppStore.getState().activeRepoPath;
  if (!path || !message.trim()) return;
  
  try {
    toast.info(amend ? "Amending commit..." : "Creating commit...");
    await invoke('create_commit', { repoPath: path, message, amend });
    await loadRepo(path);
    toast.success(amend ? "Amended successfully" : "Committed successfully");
    return true;
  } catch (e) {
    toast.error(`Commit failed: ${e}`);
    return false;
  }
}

export async function stageFile(filePath: string) {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;
  try {
    await invoke('stage_file', { repoPath: path, path: filePath });
    // Refresh only status for speed
    const status = await invoke<FileStatus[]>('get_status', { repoPath: path });
    const repoStatus = await invoke<RepoStatus>('get_repo_status', { path });
    useAppStore.setState({ 
      unstagedFiles: status.filter(f => f.status === 'unstaged' || f.status === 'untracked'),
      stagedFiles: status.filter(f => f.status === 'staged'),
      repoStatus 
    });
  } catch (e) {
    toast.error(`Stage failed: ${e}`);
  }
}

export async function unstageFile(filePath: string) {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;
  try {
    await invoke('unstage_file', { repoPath: path, path: filePath });
    const status = await invoke<FileStatus[]>('get_status', { repoPath: path });
    const repoStatus = await invoke<RepoStatus>('get_repo_status', { path });
    useAppStore.setState({ 
      unstagedFiles: status.filter(f => f.status === 'unstaged' || f.status === 'untracked'),
      stagedFiles: status.filter(f => f.status === 'staged'),
      repoStatus 
    });
  } catch (e) {
    toast.error(`Unstage failed: ${e}`);
  }
}

export async function stageAll() {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;
  try {
    await invoke('stage_all', { repoPath: path });
    await loadRepo(path);
  } catch (e) {
    toast.error(`Stage all failed: ${e}`);
  }
}

export async function unstageAll() {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;
  try {
    await invoke('unstage_all', { repoPath: path });
    await loadRepo(path);
  } catch (e) {
    toast.error(`Unstage all failed: ${e}`);
  }
}

export async function discardAll() {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;
  try {
    await invoke('discard_all', { repoPath: path });
    await loadRepo(path);
  } catch (e) {
    toast.error(`Discard all failed: ${e}`);
  }
}

export async function undoLastCommit() {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;
  try {
    await invoke('undo_last_commit', { repoPath: path });
    await loadRepo(path);
    toast.success("Last commit undone (soft reset)");
  } catch (e) {
    toast.error(`Undo failed: ${e}`);
  }
}

export async function refreshActiveRepoStatus() {
  const { activeRepoPath: path, selectedDiff } = useAppStore.getState();
  if (!path) return;
  
  try {
    const status = await invoke<FileStatus[]>('get_status', { repoPath: path });
    const repoStatus = await invoke<RepoStatus>('get_repo_status', { path });
    
    // Deep re-evaluation of selected diff
    if (selectedDiff && !selectedDiff.commitOid) {
       const fileStatus = status.find(f => f.path === selectedDiff.path);
       
       if (fileStatus) {
          const isStagedNow = fileStatus.status === 'staged';
          if (isStagedNow !== selectedDiff.staged) {
             // File moved staged <-> unstaged externally
             useAppStore.setState({ 
               selectedDiff: { ...selectedDiff, staged: isStagedNow } 
             });
          }
          // Always trigger refresh if file still exists in status
          useAppStore.setState({ refreshTimestamp: Date.now() });
       } else {
          // File was committed or reset externally
          useAppStore.setState({ selectedDiff: null });
       }
    }

    useAppStore.setState({ 
      unstagedFiles: status.filter(f => f.status === 'unstaged' || f.status === 'untracked' || f.status === 'conflicted'),
      stagedFiles: status.filter(f => f.status === 'staged'),
      repoStatus 
    });
    
    // Also re-check cherry-pick state in case conflicts were resolved
    refreshCherryPickState();
  } catch (e) {
    console.error('Failed to refresh status on focus:', e);
  }
}

export async function openTerminal() {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;
  try {
    await invoke('open_terminal', { path });
  } catch (e) {
    toast.error(`Failed to open terminal: ${e}`);
  }
}

export function selectFileDiff(filePath: string, staged: boolean, commitOid?: string) {
  useAppStore.setState({ 
    selectedDiff: { path: filePath, staged, commitOid }
  });
}

export async function selectCommitDetail(oid: string) {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;
  useAppStore.setState({ isLoadingCommitDetail: true, selectedCommitDetail: null });
  try {
    const detail = await invoke<CommitDetail>('get_commit_detail', { repoPath: path, oid });
    useAppStore.setState({ selectedCommitDetail: detail, isLoadingCommitDetail: false });
  } catch (e) {
    toast.error(`Failed to load commit: ${e}`);
    useAppStore.setState({ isLoadingCommitDetail: false });
  }
}

export async function switchTab(tabId: string) {
  if (tabId === 'home') {
    useAppStore.setState({ 
      activeTabId: 'home',
      activeRepoPath: null,
      selectedDiff: null,
      repoInfo: null
    });
    saveCurrentState();
    return;
  }

  // If repo is already open, just switch tab and load its data
  await loadRepo(tabId);
}

export function closeRepoTab(path: string) {
  const state = useAppStore.getState();
  const updatedRepos = state.repos.filter(r => r.path !== path);
  
  let newTabId = state.activeTabId;
  if (state.activeTabId === path) {
    newTabId = updatedRepos.length > 0 ? updatedRepos[updatedRepos.length - 1].path : 'home';
  }

  useAppStore.setState({ repos: updatedRepos, activeTabId: newTabId });
  
  if (newTabId === 'home') {
    useAppStore.setState({ activeRepoPath: null, repoInfo: null, selectedDiff: null });
  } else if (newTabId !== state.activeTabId) {
    loadRepo(newTabId);
  }
  
  saveCurrentState();
}

export async function saveCurrentState() {
  const { repos, activeTabId, lastStashMode, lastIncludeUntracked } = useAppStore.getState();
  const state: AppStateData = {
    tabs: repos.map(r => ({ path: r.path, name: r.name })),
    active_tab: activeTabId === 'home' ? null : activeTabId,
    stash_mode: lastStashMode,
    include_untracked: lastIncludeUntracked,
  };
  try {
    await invoke('save_app_state', { state });
  } catch (e) {
    console.error('Failed to save app state:', e);
  }
}

export async function restoreAppState() {
    try {
        const state = await invoke<AppStateData>('get_app_state');
        if (state.tabs.length > 0) {
            useAppStore.setState({ repos: state.tabs });
        }
        
        if (state.active_tab) {
            await loadRepo(state.active_tab);
        } else {
            useAppStore.setState({ activeTabId: 'home' });
        }

        if (state.stash_mode) {
          useAppStore.setState({ lastStashMode: state.stash_mode as any });
        }
        if (state.include_untracked !== undefined) {
          useAppStore.setState({ lastIncludeUntracked: state.include_untracked });
        }
} catch (e) {
        console.error('Failed to restore app state:', e);
    }
}

// ── Cherry-Pick ──────────────────────────────────────────────────────────────

export async function refreshCherryPickState() {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;
  try {
    const cpState = await invoke<any>('get_cherry_pick_state', { repoPath: path });
    const store = useAppStore.getState();
    if (cpState.is_in_progress) {
      store.setCherryPickConflict(cpState.conflicted_oid, cpState.conflicted_files, store.cherryPickRemainingOids);
    } else if (store.cherryPickState === 'conflict') {
      store.resetCherryPick();
    }
  } catch(e) {}
}

export async function loadConflictFile(repoPath: string, path: string) {
  const store = useAppStore.getState();
  store.setIsLoadingConflict(true);
  try {
    const versions = await invoke<any>('get_conflict_diff', { 
        repoPath, 
        path, 
        encoding: useAppStore.getState().fileEncoding 
    });
    useAppStore.setState({
       conflictVersions: versions,
       selectedConflictFile: path,
       isLoadingConflict: false
    });
  } catch (e) {
    toast.error(`Failed to load conflict diff: ${e}`);
    store.setIsLoadingConflict(false);
  }
}

export async function resolveConflictFile(repoPath: string, path: string, resolvedContent: string) {
  try {
    await invoke('resolve_conflict_file', { repoPath, path, resolvedContent });
    
    // Remove from store's conflict files list natively for fast UI update
    const state = useAppStore.getState();
    const newFiles = state.cherryPickConflictFiles.filter(f => f !== path);
    useAppStore.setState({ 
      cherryPickConflictFiles: newFiles,
      selectedConflictFile: null,
      conflictVersions: null
    });
    
    // Also trigger full refresh
    await refreshActiveRepoStatus();
    toast.success('File marked as resolved');
  } catch (e) {
    toast.error(`Failed to resolve conflict: ${e}`);
  }
}

export async function abortCherryPick() {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;
  try {
    useAppStore.getState().setCherryPickState('aborting');
    await invoke('cherry_pick_abort', { repoPath: path });
    useAppStore.getState().resetCherryPick();
    await loadRepo(path);
    toast.success('Cherry-pick aborted');
  } catch (e) {
    toast.error(`Abort failed: ${e}`);
    useAppStore.getState().setCherryPickState('conflict');
  }
}

export async function continueCherryPick() {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;
  try {
    useAppStore.getState().setCherryPickState('continuing');
    await invoke('cherry_pick_continue', { repoPath: path });
    toast.success('Cherry-pick continued successfully');
    
    // Check remaining queue
    const remaining = useAppStore.getState().cherryPickRemainingOids;
    if (remaining.length > 0) {
      await invokeCherryPick(remaining);
    } else {
      useAppStore.getState().resetCherryPick();
      await loadRepo(path);
    }
  } catch (e) {
    toast.error(`Continue failed: ${e}`);
    useAppStore.getState().setCherryPickState('conflict');
  }
}

export async function invokeCherryPick(oids: string[]) {
  const path = useAppStore.getState().activeRepoPath;
  if (!path || oids.length === 0) return;
  useAppStore.getState().setCherryPickState('applying');
  
  try {
    const res = await invoke<any>('cherry_pick_commit', { repoPath: path, oids, mainline: 1 });
    if (res.type === 'Conflict') {
      useAppStore.getState().setCherryPickConflict(res.conflicted_oid, res.conflicted_files, res.remaining_oids);
      toast.info('Cherry-pick conflict. Resolve it to continue.');
    } else if (res.type === 'Empty') {
       toast.info(`Commit ${res.skip_oid.substring(0, 7)} is empty and was skipped.`);
       if (res.remaining_oids.length > 0) {
           await invokeCherryPick(res.remaining_oids);
       } else {
           useAppStore.getState().resetCherryPick();
           await loadRepo(path);
       }
    } else {
      toast.success('Cherry-pick applied successfully');
      useAppStore.getState().resetCherryPick();
      await loadRepo(path);
    }
  } catch (e) {
    toast.error(`Cherry-pick failed: ${e}`);
    useAppStore.getState().resetCherryPick();
  }
}
