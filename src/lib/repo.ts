import { invoke } from '@tauri-apps/api/core';
import { useAppStore, RepoInfo, RepoStatus, BranchInfo, CommitNode, StashEntry, FileStatus, CommitDetail, CheckoutError } from '../store';
import { toast } from './toast';

// ── Safe Checkout ────────────────────────────────────────────────────────────

export interface SafeCheckoutResult {
  action: 'AlreadyOnBranch' | 'Clean' | 'DirtyNoConflict' | 'DirtyWithConflict' | 'DirtyState' | 'NotFound';
  files?: string[];
  state?: string;
  branch?: string;
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

    useAppStore.setState({
      activeRepoPath: info.path,
      activeBranch: info.head_branch,
      repoInfo: info,
      repoStatus: status,
      branches,
      commitLog: log,
      stashes,
      stagedFiles,
      unstagedFiles,
      hasMoreCommits: log.length === 200,
    });
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

export async function createBranch(name: string, startPoint?: string) {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;
  
  try {
    await invoke('create_branch', { repo_path: path, name, start_point: startPoint });
    await loadRepo(path);
    toast.success(`Created branch "${name}"`);
  } catch (e) {
    toast.error(`Failed to create branch: ${e}`);
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
