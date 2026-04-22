import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from '../../store';
import { withLoading, safeInvoke, refreshStatus } from './utils';
import { loadRepo } from './repoService';

export async function stageFile(filePath: string) {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;
  
  try {
    await invoke('stage_file', { repoPath: path, path: filePath });
    await refreshStatus(path);
  } catch (e) {
    // Already handled by error handler if we use safeInvoke, but stageFile is small
    await safeInvoke('stage_file', { repoPath: path, path: filePath });
    await refreshStatus(path);
  }
}

export async function unstageFile(filePath: string) {
  const path = useAppStore.getState().activeRepoPath;
  if (!path) return;
  
  await safeInvoke('unstage_file', { repoPath: path, path: filePath });
  await refreshStatus(path);
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
