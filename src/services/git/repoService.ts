import { useAppStore } from '../../store';
import { safeInvoke } from './utils';
import { AppStateData } from './types';
import { toast } from '../../lib/toast';

export async function loadRepo(path: string) {
  const store = useAppStore.getState();
  
  try {
    store.setRepoPath(path);
    const info = await safeInvoke<any>('open_repo', { path });
    if (!info) return;

    store.setRepoInfo(info);
    
    const [status, repoStatus, branches] = await Promise.all([
      safeInvoke<any[]>('get_status', { repoPath: path }),
      safeInvoke<any>('get_repo_status', { path }),
      safeInvoke<any[]>('list_branches', { repoPath: path })
    ]);

    if (status) store.setRepoFiles(
      status.filter(f => f.status === 'staged'),
      status.filter(f => f.status === 'unstaged' || f.status === 'untracked')
    );
    if (repoStatus) store.setRepoStatus(repoStatus);
    if (branches) store.setBranches(branches);

    // Update recent repos
    const recent = await safeInvoke<any[]>('get_recent_repos');
    if (recent) useAppStore.getState().setRepos(recent.map(r => ({ path: r.path, name: r.name })));

  } catch (e) {
    console.error("Failed to load repo:", e);
  }
}

export async function restoreAppState() {
  const state = await safeInvoke<AppStateData>('get_app_state');
  if (state) {
    useAppStore.setState({ 
      repos: state.tabs,
      pullStrategy: state.pull_strategy,
      lastStashMode: state.stash_mode,
      lastIncludeUntracked: state.include_untracked,
      fontSize: state.font_size || 13
    });
    
    if (state.active_tab) {
      await loadRepo(state.active_tab);
      autoFetch(state.active_tab);
    } else {
      useAppStore.setState({ activeTabId: 'home' });
    }
  }
}

export async function refreshActiveRepoStatus() {
  const { activeRepoPath: path } = useAppStore.getState();
  if (!path) return;
  
  const [status, repoStatus] = await Promise.all([
    safeInvoke<any[]>('get_status', { repoPath: path }),
    safeInvoke<any>('get_repo_status', { path })
  ]);

  if (status) useAppStore.setState({ 
    unstagedFiles: status.filter(f => f.status === 'unstaged' || f.status === 'untracked'),
    stagedFiles: status.filter(f => f.status === 'staged')
  });
  if (repoStatus) useAppStore.setState({ repoStatus });
}

export async function saveCurrentState() {
  const { repos, activeTabId, lastStashMode, lastIncludeUntracked, pullStrategy, fontSize } = useAppStore.getState();
  const state: AppStateData = {
    tabs: repos.map(r => ({ path: r.path, name: r.name })),
    active_tab: activeTabId === 'home' ? null : activeTabId,
    stash_mode: lastStashMode,
    include_untracked: lastIncludeUntracked,
    pull_strategy: pullStrategy,
    font_size: fontSize,
  };

  await safeInvoke('save_app_state', { state });
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

  await loadRepo(tabId);
  autoFetch(tabId);
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

export async function selectCommitDetail(oid: string) {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;
  useAppStore.setState({ isLoadingCommitDetail: true, selectedCommitDetail: null });
  
  const detail = await safeInvoke<any>('get_commit_detail', { repoPath: path, oid });
  if (detail) {
    useAppStore.setState({ selectedCommitDetail: detail, isLoadingCommitDetail: false });
  } else {
    useAppStore.setState({ isLoadingCommitDetail: false });
  }
}

export function selectFileDiff(filePath: string, staged: boolean, commitOid?: string) {
  useAppStore.setState({ 
    selectedDiff: { path: filePath, staged, commitOid }
  });
}

export async function openTerminal() {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;
  try {
    await safeInvoke('open_terminal', { path });
  } catch (e) {
    toast.error(`Failed to open terminal: ${e}`);
  }
}

/**
 * Background auto-fetch that doesn't show intrusive UI overlays.
 * It fetches from all remotes and then refreshes the active repo status.
 */
export async function autoFetch(path: string) {
  if (!path) return;
  
  try {
    console.log(`[AutoFetch] Starting for ${path}`);
    await safeInvoke('fetch_all_remotes', { repoPath: path });
    
    // Only refresh if this is still the active repo
    const currentActive = useAppStore.getState().activeRepoPath;
    if (currentActive === path) {
      await refreshActiveRepoStatus();
    }
    
    console.log(`[AutoFetch] Success for ${path}`);
  } catch (e) {
    console.error(`[AutoFetch] Failed:`, e);
  }
}
