import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from '../../store';
import { toast } from '../../lib/toast';
import { withLoading } from './utils';
import { loadRepo } from './repoService';
import { StashApplyResult } from './types';

export async function createStash(message?: string, includeUntracked: boolean = false) {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;

  await withLoading(async () => {
    await invoke('create_stash', { repoPath: path, message, includeUntracked });
    await loadRepo(path);
    toast.success("Stashed changes");
  }, "Creating stash...", 600);
}

export async function popStash(stackIndex: number) {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;

  await withLoading(async () => {
    const result = await invoke<StashApplyResult>('pop_stash', { repoPath: path, index: stackIndex });
    await loadRepo(path);

    if (result.type === 'Conflict') {
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

export async function applyStash(stackIndex: number) {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;

  await withLoading(async () => {
    const result = await invoke<StashApplyResult>('apply_stash', { repoPath: path, index: stackIndex });
    await loadRepo(path);

    if (result.type === 'Conflict') {
      toast.warning("Stash applied with conflicts");
    } else {
      toast.success("Applied stash successfully");
    }
  }, "Applying stash...", 800);
}
