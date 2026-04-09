import { invoke } from '@tauri-apps/api/core';
import { useAppStore, RepoInfo, RepoStatus, BranchInfo, CommitNode, StashEntry, FileStatus, CommitDetail, CheckoutError, RepoMeta } from '../store';
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
    const stashes = await invoke<StashEntry[]>('list_stashes', { repoPath: path });
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

export async function createStash() {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;
  
  try {
    await invoke('create_stash', { repoPath: path });
    await loadRepo(path);
    toast.success("Stashed changes");
  } catch (e) {
    toast.error(`Stash failed: ${e}`);
  }
}

export async function popStash(index: number = 0) {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;
  
  try {
    await invoke('pop_stash', { repoPath: path, index });
    await loadRepo(path);
    toast.success("Applied stash");
  } catch (e) {
    toast.error(`Pop stash failed: ${e}`);
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
  const { repos, activeTabId } = useAppStore.getState();
  const state: AppStateData = {
    tabs: repos.map(r => ({ path: r.path, name: r.name })),
    active_tab: activeTabId === 'home' ? null : activeTabId
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
    } catch (e) {
        console.error('Failed to restore app state:', e);
    }
}
