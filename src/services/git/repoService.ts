import { useAppStore } from '../../store';
import { safeInvoke } from './utils';
import { AppStateData } from './types';
import { toast } from '../../lib/toast';
import { LogResponse } from '../../store/slices/logSlice';

export async function loadRepo(path: string) {
  const store = useAppStore.getState();
  useAppStore.setState({ isLoadingRepo: true });
  
  try {
    store.setRepoPath(path);
    const info = await safeInvoke<any>('open_repo', { path });
    if (!info) {
      useAppStore.setState({ isLoadingRepo: false });
      return;
    }

    store.setRepoInfo(info);
    
    // Parallel fetch for all repo data to reduce latency
    const [status, repoStatus, branches, logResponse, backendStashes] = await Promise.all([
      safeInvoke<any[]>('get_status', { repoPath: path }),
      safeInvoke<any>('get_repo_status', { path }),
      safeInvoke<any[]>('list_branches', { repoPath: path }),
      safeInvoke<LogResponse>('get_log', { repoPath: path, limit: 200, offset: 0, refresh: true }),
      safeInvoke<any[]>('list_stashes', { repoPath: path })
    ]);

    if (status) store.setRepoFiles(
      status.filter(f => f.status === 'staged'),
      status.filter(f => f.status === 'unstaged' || f.status === 'untracked' || f.status === 'conflicted')
    );
    
    if (repoStatus) store.setRepoStatus(repoStatus);
    if (branches) store.setBranches(branches);
    
    if (logResponse) {
      store.setCommitLog(logResponse.nodes);
      store.setHasMoreCommits(logResponse.has_more);
      useAppStore.setState({ commitOffset: logResponse.commit_count });
    }

    if (backendStashes) {
      const stashes = backendStashes.map(s => ({
        ...s,
        stackIndex: s.index
      }));
      store.setStashes(stashes);
    }

    // Reset selections on refresh/load to avoid stale views
    store.setSelectedCommitDetail(null);
    store.setSelectedRowIndex(null);
    store.setActiveCommitOid(null);
    store.setIsLoadingCommitDetail(false);

    // Update recent repos
    const recent = await safeInvoke<any[]>('get_recent_repos');
    if (recent) useAppStore.getState().setRepos(recent.map(r => ({ path: r.path, name: r.name })));

  } catch (e) {
    console.error("Failed to load repo:", e);
  } finally {
    useAppStore.setState({ isLoadingRepo: false });
  }
}

export async function restoreAppState() {
  // Initialize defaults in SQLite if they don't exist
  const defaults = {
    'font_size': '13',
    'background_color': '#0f0f0f',
    'border_color': 'rgba(139, 153, 204, 0.15)',
    'panel_background_color': '#141414',
    'layout_density': 'compact',
    'toolbar_group_background': 'rgba(255, 255, 255, 0.03)'
  };
  await safeInvoke('init_config_defaults', { defaults });

  const state = await safeInvoke<AppStateData>('get_app_state');
  
  // Try to load individual values from SQLite to override JSON if present
  const [sqliteFontSize, sqliteBg, sqliteBorder, sqlitePanel, sqliteDensity, sqliteToolbar] = await Promise.all([
    safeInvoke<string>('get_config_value', { key: 'font_size' }),
    safeInvoke<string>('get_config_value', { key: 'background_color' }),
    safeInvoke<string>('get_config_value', { key: 'border_color' }),
    safeInvoke<string>('get_config_value', { key: 'panel_background_color' }),
    safeInvoke<string>('get_config_value', { key: 'layout_density' }),
    safeInvoke<string>('get_config_value', { key: 'toolbar_group_background' })
  ]);

  if (state) {
    useAppStore.setState({ 
      repos: state.tabs,
      pullStrategy: state.pull_strategy,
      lastStashMode: state.stash_mode,
      lastIncludeUntracked: state.include_untracked,
      fontSize: sqliteFontSize ? parseInt(sqliteFontSize) : (state.font_size || 13),
      backgroundColor: sqliteBg || state.background_color || '#0f0f0f',
      borderColor: sqliteBorder || state.border_color || 'rgba(139, 153, 204, 0.15)',
      panelBackgroundColor: sqlitePanel || state.panel_background_color || '#141414',
      layoutDensity: sqliteDensity as any || state.layout_density || 'compact',
      toolbarGroupBackground: sqliteToolbar || state.toolbar_group_background || 'rgba(255, 255, 255, 0.03)'
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
  const { repos, activeTabId, lastStashMode, lastIncludeUntracked, pullStrategy, fontSize, backgroundColor, borderColor, panelBackgroundColor, layoutDensity } = useAppStore.getState();
  const state: AppStateData = {
    tabs: repos.map(r => ({ path: r.path, name: r.name })),
    active_tab: activeTabId === 'home' ? null : activeTabId,
    stash_mode: lastStashMode,
    include_untracked: lastIncludeUntracked,
    pull_strategy: pullStrategy,
    font_size: fontSize,
    background_color: backgroundColor,
    border_color: borderColor,
    panel_background_color: panelBackgroundColor,
    layout_density: layoutDensity,
  };

  // Parallel save to both JSON and SQLite
  await Promise.all([
    safeInvoke('save_app_state', { state }),
    safeInvoke('save_config_value', { key: 'font_size', value: fontSize.toString() }),
    safeInvoke('save_config_value', { key: 'background_color', value: backgroundColor }),
    safeInvoke('save_config_value', { key: 'border_color', value: borderColor }),
    safeInvoke('save_config_value', { key: 'panel_background_color', value: panelBackgroundColor }),
    safeInvoke('save_config_value', { key: 'layout_density', value: layoutDensity }),
    safeInvoke('save_config_value', { key: 'toolbar_group_background', value: toolbarGroupBackground })
  ]);
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
