import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from '../../store';
import { toast } from '../../lib/toast';
import { withLoading, safeInvoke } from './utils';
import { loadRepo } from './repoService';
import { PullStrategy, PullResult, PushResult, RemoteBranchInfo } from './types';

export async function fetchAllRepo() {
  const { activeRepoPath } = useAppStore.getState();
  if (!activeRepoPath) return;

  await withLoading(async () => {
    await invoke('fetch_all_remotes', { repoPath: activeRepoPath });
    toast.success('Fetched all remotes successfully');
    await loadRepo(activeRepoPath);
  }, "Fetching all remotes...", 1000);
}

export async function pullRepo(strategy?: PullStrategy) {
  const state = useAppStore.getState();
  const path = state.activeRepoPath;
  if (!path) return;

  const finalStrategy = strategy || state.pullStrategy;

  await withLoading(async () => {
    const result = await invoke<PullResult>('pull_remote', { 
      repoPath: path, 
      remote: 'origin', 
      branch: state.activeBranch || 'main',
      strategy: finalStrategy
    });
    
    await loadRepo(path);
    
    switch (result.type) {
      case 'UpToDate':
        toast.info("Already up to date");
        break;
      case 'FastForwarded':
        toast.success(`Fast-forwarded (${result.data.commits_added} commits)`);
        break;
      case 'Merged':
        toast.success("Merged remote changes");
        break;
      case 'Rebased':
        toast.success(`Rebased (${result.data.commits_rebased} commits)`);
        break;
    }
  }, "Pulling changes...", 1000);
}

export async function pushBranchToRemote(branchName: string, remote = 'origin', setUpstream = true): Promise<boolean> {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return false;
  
  const result = await withLoading(async () => {
    await invoke('push_branch_to_remote', { repoPath: path, branchName, remote, setUpstream });
    toast.success(`Pushed "${branchName}" to ${remote}`);
    return true;
  }, `Pushing ${branchName}...`, 1000);

  return !!result;
}

export async function pushCurrentBranch(
  repoPath: string,
  mode: 'normal' | 'force_with_lease',
) {
  const store = useAppStore.getState();
  await withLoading(async () => {
    try {
      const result = await invoke<PushResult>('push_current_branch', {
        repoPath,
        mode,
      });
      
      if (result.type === 'Success') {
        toast.success(`Pushed ${result.data.commits_pushed} commit(s) to remote.`);
        store.setLastCommitWasAmend(false);
      } else if (result.type === 'UpToDate') {
        toast.info('Already up to date.');
      }
      
      await loadRepo(repoPath);
    } catch (e) {
      if (String(e) === 'NO_UPSTREAM') {
        store.setShowSetUpstreamDialog(true);
        return;
      }
      throw e;
    }
  }, "Pushing changes...", 800);
}

export async function listRemoteBranches(): Promise<RemoteBranchInfo[]> {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return [];
  const res = await safeInvoke<RemoteBranchInfo[]>('list_remote_branches', { repoPath: path });
  return res || [];
}
