import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from '../../store';
import { toast } from '../../lib/toast';
import { safeInvoke, withLoading } from './utils';
import { loadRepo } from './repoService';
import { MergeResult, CreateBranchResult, BranchValidation, ResetMode, ResetResult } from './types';

export async function checkoutBranch(branchName: string) {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;

  await withLoading(async () => {
    await invoke('checkout_branch', { repoPath: path, branchName });
    await loadRepo(path);
    toast.success(`Switched to branch "${branchName}"`);
  }, `Checking out ${branchName}...`, 800);
}

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
        await loadRepo(path);
        break;
    }
  }, `Merging ${branchName}...`, 1000);
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
  const res = await safeInvoke<BranchValidation>('validate_branch_name', { repoPath: path, name });
  return res || { valid: false, error: 'Validation failed', suggestion: null };
}

export async function resetToCommit(commitOid: string, mode: ResetMode) {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;
  
  await withLoading(async () => {
    const result = await invoke<ResetResult>('reset_to_commit', { repoPath: path, commitOid, mode });
    await loadRepo(path);
    toast.success(`Reset ${result.commits_rewound} commit(s) successfully (${mode})`);
  }, `Resetting to ${commitOid.substring(0, 7)}...`, 800);
}

export function parseBranchFromRef(ref: string): string | null {
  if (ref === 'HEAD') return null;
  if (ref.startsWith('refs/tags/')) return null;
  if (ref.startsWith('refs/remotes/')) return null;
  if (ref.startsWith('refs/heads/')) return ref.slice('refs/heads/'.length);
  
  const headArrow = ref.match(/^HEAD -> (.+)$/);
  if (headArrow) return headArrow[1];
  
  return ref;
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
