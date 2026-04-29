import { invoke } from "@tauri-apps/api/core";
import { useAppStore, RepoInfo, RepoStatus, BranchInfo, FileStatus, CommitDetail, CheckoutError, RepoState, StashApplyResult, PullStrategy, LogResponse, ConflictMode } from '../store';
import { toast } from './toast';
import { handleError } from './error';

/**
 * Higher-order function to wrap async operations with global loading and error handling.
 * Ensures a minimum display time of 500ms for a "pro" feel if requested.
 */
async function withLoading<T>(
  operation: () => Promise<T>, 
  label: string | null = null,
  minTime: number = 0
): Promise<T | undefined> {
  const store = useAppStore.getState();
  const startTime = Date.now();
  
  try {
    store.setIsProcessing(true, label);
    const result = await operation();
    
    // Artificial delay for better UX if operation is too fast
    const elapsed = Date.now() - startTime;
    if (elapsed < minTime) {
      await new Promise(resolve => setTimeout(resolve, minTime - elapsed));
    }
    
    return result;
  } catch (err) {
    handleError(err, label || undefined);
    return undefined;
  } finally {
    store.setIsProcessing(false);
  }
}

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
  font_size?: number;
  background_color?: string;
  border_color?: string;
  panel_background_color?: string;
  layout_density?: 'compact' | 'normal';
  toolbar_group_background?: string;
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

/**
 * Triggers the force checkout flow.
 */
export async function forceCheckout(branchName: string) {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;

  try {
    useAppStore.setState({ forceCheckoutTarget: branchName, forceCheckoutPhase: 'processing' });
    const result = await invoke<ForceCheckoutResult>('force_checkout_from_origin', { repoPath: path, branchName });
    
    switch (result.type) {
      case 'Clean':
        useAppStore.setState({ forceCheckoutTarget: null, forceCheckoutPhase: 'idle' });
        toast.success(`Branch ${branchName} reset to origin.`);
        await loadRepo(path);
        break;
      case 'NeedsStash':
        useAppStore.setState({ forceCheckoutPhase: 'confirm_stash' });
        break;
      case 'NotOnBranch':
        useAppStore.setState({ forceCheckoutTarget: null, forceCheckoutPhase: 'idle' });
        toast.error("Cannot force checkout in detached HEAD state.");
        break;
      case 'NoRemoteRef':
        useAppStore.setState({ forceCheckoutTarget: null, forceCheckoutPhase: 'idle' });
        toast.error(`Remote branch origin/${branchName} not found.`);
        break;
      case 'Generic':
        useAppStore.setState({ forceCheckoutTarget: null, forceCheckoutPhase: 'idle' });
        toast.error(`Force checkout failed: ${result.data.message}`);
        break;
    }
  } catch (e) {
    useAppStore.setState({ forceCheckoutTarget: null, forceCheckoutPhase: 'idle' });
    toast.error(`System error: ${e}`);
  }
}

/**
 * Confirms force checkout by stashing changes first.
 */
export async function confirmForceCheckoutWithStash(branchName: string) {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;

  try {
    useAppStore.setState({ forceCheckoutPhase: 'processing' });
    const result = await invoke<ForceCheckoutResult>('force_checkout_confirm_with_stash', { repoPath: path, branchName });
    
    switch (result.type) {
      case 'StashAndDone':
        useAppStore.setState({ forceCheckoutTarget: null, forceCheckoutPhase: 'idle' });
        toast.success(`Branch ${branchName} reset to origin. Stash restored.`);
        await loadRepo(path);
        break;
      case 'StashConflict':
        // Keep target but set phase to stash_conflict to show the banner/alert
        useAppStore.setState({ forceCheckoutPhase: 'stash_conflict' });
        useAppStore.setState({ 
           stashConflict: { files: (result as any).data.files, index: 0, isPop: true }
        });
        toast.warning("Reset complete but stash restore had conflicts.");
        await loadRepo(path);
        break;
      case 'Generic':
        useAppStore.setState({ forceCheckoutTarget: null, forceCheckoutPhase: 'idle' });
        toast.error(`Force checkout failed: ${result.data.message}`);
        break;
      default:
        useAppStore.setState({ forceCheckoutTarget: null, forceCheckoutPhase: 'idle' });
        toast.error(`Force checkout failed with unexpected result.`);
    }
  } catch (e) {
    useAppStore.setState({ forceCheckoutTarget: null, forceCheckoutPhase: 'idle' });
    toast.error(`System error: ${e}`);
  }
}


export async function loadRepo(path: string) {
  useAppStore.setState({ isLoadingRepo: true, repoError: null });
  
  try {
    const filter = useAppStore.getState().branchFilter;
    let visibleBranches: string[] | undefined = undefined;
    if (filter !== 'all') {
      const branches = useAppStore.getState().branches;
      if (filter === 'local') visibleBranches = branches.filter(b => !b.is_remote).map(b => b.name);
      else if (filter === 'remote') visibleBranches = branches.filter(b => b.is_remote).map(b => b.name);
      else if (filter === 'active') visibleBranches = useAppStore.getState().activeBranch ? [useAppStore.getState().activeBranch!] : undefined;
    }

    // Parallel fetch for all repo data to reduce latency
    const [info, status, branches, logResponse, backendStashes, fileStatuses] = await Promise.all([
      invoke<RepoInfo>('open_repo', { path }),
      invoke<RepoStatus>('get_repo_status', { path }),
      invoke<BranchInfo[]>('list_branches', { repoPath: path }),
      invoke<LogResponse>('get_log', { 
        repoPath: path, 
        limit: 500, 
        offset: 0, 
        refresh: true,
        visible_branches: visibleBranches
      }),
      invoke<any[]>('list_stashes', { repoPath: path }),
      invoke<FileStatus[]>('get_status', { repoPath: path })
    ]);

    const stashes = backendStashes.map(s => ({
      ...s,
      stackIndex: s.index
    }));

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
      commitLog: logResponse.nodes,
      commitOffset: logResponse.commit_count,
      stashes,
      stagedFiles,
      unstagedFiles,
      repos: updatedRepos,
      hasMoreCommits: logResponse.has_more,
      
      // Reset selections on refresh/load to avoid stale views
      selectedCommitDetail: null,
      selectedDiff: null,
      selectedRowIndex: null,
      activeCommitOid: null,
      isLoadingCommitDetail: false
    });

    saveCurrentState();
    
    // Sync conflict state with real Git repo state
    const repoState = await invoke<string>('get_repo_state', { repoPath: path });
    
    if (repoState === 'merge' || repoState === 'cherry_pick' || repoState === 'rebase') {
      const conflictFiles = fileStatuses
        .filter(f => f.status === 'conflicted')
        .map(f => f.path);
      
      const source = repoState as 'merge' | 'cherry_pick' | 'rebase';
      useAppStore.getState().setCherryPickState('conflict', conflictFiles, source);
    } else {
      useAppStore.getState().setCherryPickState('idle');
    }
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
    const filter = state.branchFilter;
    let visibleBranches: string[] | undefined = undefined;
    if (filter !== 'all') {
      if (filter === 'local') visibleBranches = state.branches.filter(b => !b.is_remote).map(b => b.name);
      else if (filter === 'remote') visibleBranches = state.branches.filter(b => b.is_remote).map(b => b.name);
      else if (filter === 'active') visibleBranches = state.activeBranch ? [state.activeBranch] : undefined;
    }

    // Use commitOffset (actual commit count, excluding stashes) for correct revwalk pagination
    const logResponse = await invoke<LogResponse>('get_log', { 
      repoPath: state.activeRepoPath, 
      limit: 500, 
      offset: state.commitOffset,
      refresh: false,
      visible_branches: visibleBranches
    });
    
    useAppStore.setState({ 
      commitLog: [...state.commitLog, ...logResponse.nodes],
      commitOffset: state.commitOffset + logResponse.commit_count,
      hasMoreCommits: logResponse.has_more
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
  
  await withLoading(async () => {
    try {
      useAppStore.setState({ checkoutError: null });
      await invoke('checkout_branch', { repoPath: path, branchName, options });
      await loadRepo(path);
      toast.success(`Switched to branch "${branchName}"`);
      useAppStore.setState({ confirmCheckoutTo: null });
    } catch (e: any) {
      console.error("Checkout failed structure:", e);
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
  }, `Switching to "${branchName}"...`, 600);
}

export async function fetchAllRepo() {
  const { activeRepoPath } = useAppStore.getState();
  if (!activeRepoPath) return;

  await withLoading(async () => {
    await invoke('fetch_all_remotes', { repoPath: activeRepoPath });
    toast.success('Fetched all remotes successfully');
    await loadRepo(activeRepoPath);
  }, "Fetching all remotes...", 1000);
}

/**
 * Background auto-fetch that doesn't show intrusive UI overlays.
 * Used for lifecycle events like startup, tab switching, and opening repos.
 */
export async function autoFetch(path: string) {
  if (!path) return;
  
  try {
    console.log(`[AutoFetch] Starting for ${path}`);
    // Direct invoke without withLoading to keep it silent
    await invoke('fetch_all_remotes', { repoPath: path });
    // Reload repo data to update status (ahead/behind), branches, and log
    await loadRepo(path);
    console.log(`[AutoFetch] Success for ${path}`);
  } catch (e) {
    // Silent failure for auto-fetch to avoid interrupting the user's flow
    console.error(`[AutoFetch] Failed:`, e);
  }
}

export async function pullRepo(strategy?: PullStrategy) {
  const state = useAppStore.getState();
  const path = state.activeRepoPath;
  if (!path) return;
  
  const pullStrategy = strategy || state.pullStrategy;
  const store = useAppStore.getState();
  
  store.setIsProcessing(true, "Pulling changes...");
  
  try {
    const result = await invoke<PullResult>('pull_remote', { 
      repoPath: path, 
      remote: 'origin',
      strategy: pullStrategy 
    });

    await loadRepo(path);
    
    switch (result.type) {
      case 'UpToDate':
        toast.info("Already up to date.");
        break;
      case 'FastForwarded':
        toast.success(`Fast-forwarded ${result.data.commits_added} commit(s).`);
        break;
      case 'Merged':
        toast.success(`Merged — new commit ${result.data.merge_commit_oid.substring(0, 7)}.`);
        break;
      case 'Rebased':
        toast.success(`Rebased successfully.`);
        break;
    }
  } catch (error: unknown) {
    const msg = String(error);
    if (msg === "MERGE_CONFLICT") {
      await loadRepo(path); // Must load repo to get the conflicted file statuses
      const fileStatuses = await invoke<FileStatus[]>('get_status', { repoPath: path });
      const conflictFiles = fileStatuses.filter(f => f.status === 'conflicted');
      if (conflictFiles.length > 0) {
          useAppStore.getState().openConflictEditor(conflictFiles[0].path, 'Merge');
      }
      toast.info("Pull resulted in conflicts. Please resolve them.");
    } else {
      toast.error(msg);
    }
  } finally {
    store.setIsProcessing(false);
  }
}


export async function pushRepo() {
  const state = useAppStore.getState();
  if (!state.activeRepoPath) return;
  return pushCurrentBranch(state.activeRepoPath, 'normal');
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
        // Don't throw further to avoid global error handler showing a toast
        return;
      }
      throw e; // Pass to withLoading -> handleError
    }
  }, "Pushing changes...", 800);
}

export async function createStash(message?: string) {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;
  
  await withLoading(async () => {
    await invoke('create_stash', { repoPath: path, message: message || null });
    await loadRepo(path);
    toast.success("Stashed changes");
  }, "Stashing changes...", 600);
}

export async function stashUnstaged(options: StashUnstagedOptions) {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;

  return await withLoading(async () => {
    const state = await invoke<RepoState>('check_stash_preconditions', { repoPath: path });
    if (state !== 'Clean') {
      toast.error(`Cannot stash: repository is in ${state} state`);
      return false;
    }

    await invoke('stash_save_advanced', {
      repoPath: path,
      message: options.message || null,
      includeUntracked: options.includeUntracked,
      keepIndex: options.keepIndex,
    });

    await loadRepo(path);
    toast.success(options.keepIndex ? "Stashed unstaged changes" : "Stashed all changes");
    return true;
  }, "Stashing changes...", 600);
}

export async function applyStash(stackIndex: number) {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;

  await withLoading(async () => {
    const state = await invoke<RepoState>('check_stash_preconditions', { repoPath: path });
    if (state !== 'Clean') {
      const errorMsg = state === 'HasConflicts' 
        ? "Working tree already has conflicts. Resolve them first."
        : `Repository is in a ${state} state. Resolve it first.`;
      toast.error(errorMsg);
      return;
    }

    const result = await invoke<StashApplyResult>('apply_stash', { repoPath: path, index: stackIndex });
    await loadRepo(path);

    if (result.type === 'Conflict') {
      useAppStore.setState({ stashConflict: { files: result.data.files, index: stackIndex, isPop: false } });
      toast.info("Stash applied with conflicts. Please resolve them manually.");
    } else {
      toast.success("Applied stash successfully");
    }
  }, "Applying stash...", 800);
}

export async function popStash(stackIndex: number) {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;

  await withLoading(async () => {
    const state = await invoke<RepoState>('check_stash_preconditions', { repoPath: path });
    if (state !== 'Clean') {
      const errorMsg = state === 'HasConflicts' 
        ? "Working tree already has conflicts. Resolve them first."
        : `Repository is in a ${state} state. Resolve it first.`;
      toast.error(errorMsg);
      return;
    }

    const result = await invoke<StashApplyResult>('pop_stash', { repoPath: path, index: stackIndex });
    await loadRepo(path);

    if (result.type === 'Conflict') {
      useAppStore.setState({ stashConflict: { files: result.data.files, index: stackIndex, isPop: true } });
      toast.info("Conflicts detected. Stash was applied but NOT dropped.");
    } else {
      toast.success("Popped stash successfully");
    }
  }, "Popping stash...", 800);
}

export async function dropStash(stackIndex: number) {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;

  await withLoading(async () => {
    await invoke('drop_stash', { repoPath: path, index: stackIndex });
    await loadRepo(path);
    toast.success("Dropped stash entry");
  }, "Dropping stash...", 600);
}

export async function createBranch(name: string, startPoint?: string): Promise<CreateBranchResult | null> {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return null;
  
  const result = await withLoading(async () => {
    const res = await invoke<CreateBranchResult>('create_branch', { repoPath: path, name, startPoint });
    await loadRepo(path);
    toast.success(`Created branch "${name}"`);
    return res;
  }, `Creating branch "${name}"...`, 600);

  return result || null;
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

export async function commitRepo(message: string, amend: boolean = false): Promise<boolean> {
  const path = useAppStore.getState().activeRepoPath;
  if (!path || !message.trim()) return false;
  
  const result = await withLoading(async () => {
    const res = await invoke<CommitResult>('create_commit', { repoPath: path, message, amend });
    useAppStore.getState().setLastCommitWasAmend(res.amended);
    await loadRepo(path);
    toast.success(res.amended ? "Amended successfully" : "Committed successfully");
    return true;
  }, amend ? "Amending commit..." : "Creating commit...", 1000);

  return !!result;
}

export async function getHeadCommitInfo(): Promise<HeadCommitInfo | null> {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return null;
  return await invoke<HeadCommitInfo>('get_head_commit_info', { repoPath: path });
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
    handleError(e, "Stage failed");
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
    handleError(e, "Unstage failed");
  }
}

export async function stageAll() {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;
  await withLoading(async () => {
    await invoke('stage_all', { repoPath: path });
    await loadRepo(path);
  }, "Staging all files...", 600);
}

export async function unstageAll() {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;
  await withLoading(async () => {
    await invoke('unstage_all', { repoPath: path });
    await loadRepo(path);
  }, "Unstaging all files...", 600);
}

export async function discardAllChanges() {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;
  await withLoading(async () => {
    await invoke('discard_all', { repoPath: path });
    await loadRepo(path);
  }, "Discarding all changes...", 800);
}

export async function undoLastCommit(mode: 'Soft' | 'Mixed' | 'Hard' = 'Soft') {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;
  
  await withLoading(async () => {
    try {
      await invoke('undo_last_commit', { repoPath: path, mode });
      await loadRepo(path);
      toast.success(`Last commit undone (${mode.toLowerCase()} reset)`);
    } catch (e) {
      toast.error(`Undo failed: ${e}`);
    }
  }, `Undoing last commit (${mode.toLowerCase()})...`, 600);
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
    
    // Stale conflict cleanup
    const activeConflictFile = useAppStore.getState().activeConflictFile;
    if (activeConflictFile) {
        const stillConflicted = status.some(f => f.path === activeConflictFile && f.status === 'conflicted');
        if (!stillConflicted) {
            useAppStore.getState().closeConflictEditor();
            toast.success(`Conflict in "${activeConflictFile}" has been resolved.`);
        }
    }
    
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

export async function saveCurrentState() {
  const { repos, activeTabId, lastStashMode, lastIncludeUntracked, pullStrategy } = useAppStore.getState();
  const state: AppStateData = {
    tabs: repos.map(r => ({ path: r.path, name: r.name })),
    active_tab: activeTabId === 'home' ? null : activeTabId,
    stash_mode: lastStashMode,
    include_untracked: lastIncludeUntracked,
    pull_strategy: pullStrategy,
  };

  try {
    await invoke('save_app_state', { state });
  } catch (e) {
    console.error('Failed to save app state:', e);
  }
}

export async function restoreAppState() {
    console.log("[Repo] Restoring app state...");
    try {
        const state = await invoke<AppStateData>('get_app_state');
        console.log("[Repo] Fetched app state from backend:", state);
        
        if (state.tabs.length > 0) {
            useAppStore.setState({ repos: state.tabs });
        }
        
        if (state.active_tab) {
            console.log("[Repo] Restoring active tab:", state.active_tab);
            await loadRepo(state.active_tab);
            autoFetch(state.active_tab);
        } else {
            useAppStore.setState({ activeTabId: 'home' });
        }

        if (state.stash_mode) {
          useAppStore.setState({ lastStashMode: state.stash_mode as any });
        }
        if (state.include_untracked !== undefined) {
          useAppStore.setState({ lastIncludeUntracked: state.include_untracked });
        }
        if (state.pull_strategy) {
          useAppStore.setState({ pullStrategy: state.pull_strategy });
        }
        console.log("[Repo] App state restoration logic finished.");
    } catch (e) {
      console.error('[Repo] Failed to restore app state:', e);
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
      store.setCherryPickState('conflict', cpState.conflicted_files, cpState.source);
      await refreshActiveRepoStatus();
    } else if (store.cherryPickState === 'conflict') {
      store.setCherryPickState('idle');
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
       isLoadingConflict: false
    });
  } catch (e) {
    toast.error(`Failed to load conflict diff: ${e}`);
    store.setIsLoadingConflict(false);
  }
}

export async function resolveConflictFile(repoPath: string, path: string, resolvedContent: string, encoding?: string) {
  try {
    await invoke('resolve_conflict_file', { repoPath, path, resolvedContent, encoding: encoding || null });
    
    // Remove from store's conflict files list natively for fast UI update
    const state = useAppStore.getState();
    const newFiles = state.cherryPickConflictFiles.filter(f => f !== path);
    useAppStore.setState({ 
      cherryPickConflictFiles: newFiles,
      conflictVersions: null
    });
    state.closeConflictEditor();
    
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
  await withLoading(async () => {
    await invoke('cherry_pick_abort', { repoPath: path });
    useAppStore.getState().setCherryPickState('idle');
    await loadRepo(path);
    toast.success('Cherry-pick aborted');
  }, "Aborting cherry-pick...", 600);
}

export async function continueCherryPick() {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;
  await withLoading(async () => {
    await invoke('cherry_pick_continue', { repoPath: path });
    toast.success('Cherry-pick continued successfully');
    
    // Check remaining queue
    const remaining = useAppStore.getState().cherryPickRemainingOids;
    if (remaining.length > 0) {
      await invokeCherryPick(remaining);
    } else {
      useAppStore.getState().setCherryPickState('idle');
      await loadRepo(path);
    }
  }, "Continuing cherry-pick...", 800);
}

export async function invokeCherryPick(oids: string[]) {
  const path = useAppStore.getState().activeRepoPath;
  if (!path || oids.length === 0) return;
  
  await withLoading(async () => {
    const res = await invoke<any>('cherry_pick_commit', { repoPath: path, oids, mainline: 1 });
    if (res.type === 'Conflict') {
      toast.warning("Cherry-pick resulted in conflicts. Please resolve them.");
      useAppStore.getState().setCherryPickState('conflict', res.conflicted_files, 'cherry_pick');
      await refreshActiveRepoStatus();
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
  }, "Applying cherry-pick...", 1000);
}

export async function openInEditor(filePath: string) {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;
  const fullPath = await join(path, filePath);
  try {
    await invoke('open_file', { path: fullPath });
  } catch (e) {
    handleError(e, "Failed to open file");
  }
}

export async function showInExplorer(filePath: string) {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;
  const fullPath = await join(path, filePath);
  try {
    await invoke('reveal_file', { path: fullPath });
  } catch (e) {
    handleError(e, "Failed to reveal file");
  }
}

export async function discardFileChanges(filePath: string) {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;
  await withLoading(async () => {
    await invoke('discard_file_changes', { repoPath: path, filePath });
    await refreshActiveRepoStatus();
    toast.success(`Discarded changes in "${filePath}"`);
  }, `Discarding "${filePath}"...`, 600);
}

export async function restoreFileFromCommit(commitOid: string, filePath: string) {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;
  return await withLoading(async () => {
    await invoke('restore_file_from_commit', { repoPath: path, commitOid, filePath });
    await refreshActiveRepoStatus();
    toast.success(`"${filePath}" restored from commit ${commitOid.substring(0, 7)}`);
    return true;
  }, `Restoring "${filePath}"...`, 800);
}

export interface FileLogResponse {
  commits: FileCommit[];
  has_more: boolean;
}

export async function getFileLog(filePath: string, page: number = 0, pageSize: number = 100): Promise<FileLogResponse> {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return { commits: [], has_more: false };
  try {
    return await invoke<FileLogResponse>('get_file_log', { 
      repoPath: path, 
      filePath,
      page,
      pageSize
    });
  } catch (e) {
    toast.error(`Failed to load history: ${e}`);
    return { commits: [], has_more: false };
  }
}

async function join(base: string, part: string): Promise<string> {
  // Simple check for windows/unix path separator
  const sep = base.includes('\\') ? '\\' : '/';
  if (base.endsWith(sep)) return base + part;
  return base + sep + part;
}

export async function resetToCommit(commitOid: string, mode: ResetMode) {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;
  
  await withLoading(async () => {
    const result = await invoke<ResetResult>('reset_to_commit', { repoPath: path, commitOid, mode });
    useAppStore.getState().setResetToCommitTarget(null);
    await refreshActiveRepoStatus();
    await loadRepo(path);
    toast.success(`Reset ${result.commits_rewound} commit(s) successfully (${mode})`);
  }, `Resetting to ${commitOid.substring(0, 7)}...`, 800);
}

// ── New Conflict Routing Actions ─────────────────────────────────────────────

export async function getConflictContext(): Promise<ConflictContext | null> {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return null;
  try {
    return await invoke<ConflictContext>('get_conflict_context', { repoPath: path });
  } catch (e) {
    console.error('Failed to get conflict context:', e);
    return null;
  }
}

// ── Merge Branch ─────────────────────────────────────────────────────────────

type MergeResult =
  | { type: 'AlreadyUpToDate' }
  | { type: 'FastForward'; new_oid: string }
  | { type: 'MergeCommit'; merge_oid: string }
  | { type: 'Conflict'; conflicted_files: string[] };

export async function mergeBranch(branchName: string) {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;

  await withLoading(async () => {
    const result = await invoke<MergeResult>('merge_branch', { repoPath: path, branchName });

    switch (result.type) {
      case 'AlreadyUpToDate':
        toast.info(`Already up to date with "${branchName}"`);
        break;
      case 'FastForward':
        toast.success(`Fast-forwarded to ${result.new_oid.substring(0, 7)}`);
        await loadRepo(path);
        break;
      case 'MergeCommit':
        toast.success(`Merged "${branchName}" successfully`);
        await loadRepo(path);
        break;
      case 'Conflict':
        toast.warning(`Merge conflict — ${result.conflicted_files.length} file(s) need resolution`);
        useAppStore.getState().setCherryPickState('conflict', result.conflicted_files, 'merge');
        await loadRepo(path);
        await refreshActiveRepoStatus();
        break;
    }

    // Close merge dialog
    useAppStore.getState().setMergeTarget(null);
  }, `Merging ${branchName}...`, 1000);
}

export async function abortMerge() {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;
  await withLoading(async () => {
    await invoke('merge_abort', { repoPath: path });
    await loadRepo(path);
    useAppStore.getState().closeConflictEditor();
    toast.success('Merge aborted');
  }, "Aborting merge...", 600);
}

export async function continueMerge() {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;
  await withLoading(async () => {
    await invoke('merge_continue', { repoPath: path });
    await loadRepo(path);
    useAppStore.getState().closeConflictEditor();
    toast.success('Merge continued successfully');
  }, "Continuing merge...", 800);
}

export async function abortRebase() {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;
  await withLoading(async () => {
    await invoke('rebase_abort', { repoPath: path });
    await loadRepo(path);
    useAppStore.getState().closeConflictEditor();
    toast.success('Rebase aborted');
  }, "Aborting rebase...", 600);
}

export async function continueRebase() {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;
  await withLoading(async () => {
    await invoke('rebase_continue', { repoPath: path });
    await loadRepo(path);
    useAppStore.getState().closeConflictEditor();
    toast.success('Rebase continued successfully');
  }, "Continuing rebase...", 800);
}

/**
 * Parse branch name from a ref string.
 * "refs/heads/feature-x" → "feature-x"
 * "HEAD -> main"         → "main"
 * "main"                 → "main"
 * "refs/tags/v1.0"       → null (ignore tags)
 */
export function parseBranchFromRef(ref: string): string | null {
  if (ref === 'HEAD') return null;
  if (ref.startsWith('refs/tags/')) return null;
  if (ref.startsWith('refs/remotes/')) return null;
  if (ref.startsWith('refs/heads/')) return ref.slice('refs/heads/'.length);
  
  // Handle "HEAD -> main" format from git log --decorate
  const headArrow = ref.match(/^HEAD -> (.+)$/);
  if (headArrow) return headArrow[1];
  
  // Raw branch name
  return ref;
}

/** 
 * Find a valid branch name to merge from a commit's refs 
 */
export function findMergableBranch(
  refs: string[],
  currentBranch: string | null
): string | null {
  if (!currentBranch) return null;
  
  for (const ref of refs) {
    const branch = parseBranchFromRef(ref);
    if (branch && branch !== currentBranch) return branch;
  }
  return null;
}

