import { invoke } from '@tauri-apps/api/core';
import { useAppStore, RepoInfo, RepoStatus, BranchInfo, CommitNode, StashEntry } from '../store';

export async function loadRepo(path: string) {
  useAppStore.setState({ isLoadingRepo: true, repoError: null });
  
  try {
    const info = await invoke<RepoInfo>('open_repo', { path });
    const status = await invoke<RepoStatus>('get_repo_status', { path });
    
    // We fetch these even if they are stubs for now
    const branches = await invoke<BranchInfo[]>('list_branches', { repoPath: path });
    const log = await invoke<CommitNode[]>('get_log', { repoPath: path, limit: 200 });
    const stashes = await invoke<StashEntry[]>('list_stashes', { repoPath: path });

    useAppStore.setState({
      activeRepoPath: info.path,
      activeBranch: info.head_branch,
      repoInfo: info,
      repoStatus: status,
      branches,
      commitLog: log,
      stashes,
      hasMoreCommits: log.length === 200, // if we got exactly limit, assume there's more
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
    const newLimit = currentLen + 200;
    const log = await invoke<CommitNode[]>('get_log', { repoPath: state.activeRepoPath, limit: newLimit });
    
    useAppStore.setState({ 
      commitLog: log,
      hasMoreCommits: log.length > currentLen // if length increased, there might be more
    });
  } catch (e) {
    console.error('Failed to load more commits:', e);
  } finally {
    useAppStore.setState({ isLoadingMore: false });
  }
}
