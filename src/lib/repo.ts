import { invoke } from '@tauri-apps/api/core';
import { useAppStore, RepoInfo, RepoStatus, BranchInfo, CommitNode, StashEntry, FileStatus } from '../store';
import { toast } from './toast';

export async function loadRepo(path: string) {
  useAppStore.setState({ isLoadingRepo: true, repoError: null });
  
  try {
    const info = await invoke<RepoInfo>('open_repo', { path });
    const status = await invoke<RepoStatus>('get_repo_status', { path });
    
    // We fetch these even if they are stubs for now
    const branches = await invoke<BranchInfo[]>('list_branches', { repoPath: path });
    const log = await invoke<CommitNode[]>('get_log', { repoPath: path, limit: 200, offset: 0 });
    const stashes = await invoke<StashEntry[]>('list_stashes', { repoPath: path });

    useAppStore.setState({
      activeRepoPath: info.path,
      activeBranch: info.head_branch,
      repoInfo: info,
      repoStatus: status,
      branches,
      commitLog: log,
      stashes,
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

export async function checkoutBranch(branchName: string) {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;
  
  try {
    await invoke('checkout_branch', { repoPath: path, branchName });
    // Refresh the repo state
    await loadRepo(path);
    toast.success(`Switched to branch "${branchName}"`);
  } catch (e) {
    console.error("Checkout failed:", e);
    toast.error(`Checkout failed: ${e}`);
  } finally {
    useAppStore.setState({ confirmCheckoutTo: null });
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

export async function getFileDiff(filePath: string, staged: boolean) {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;
  try {
    const diff = await invoke<string>('get_diff', { repoPath: path, path: filePath, staged });
    useAppStore.setState({ selectedFilePath: filePath, diffContent: diff });
  } catch (e) {
    toast.error(`Failed to get diff: ${e}`);
  }
}
