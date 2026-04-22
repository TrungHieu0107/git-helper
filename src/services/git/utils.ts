import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from '../../store';
import { handleError } from '../../lib/error';

/**
 * Standard wrapper for Tauri invoke calls to catch all runtime exceptions.
 */
export async function safeInvoke<T>(cmd: string, args?: any): Promise<T | null> {
  try {
    return await invoke<T>(cmd, args);
  } catch (err) {
    handleError(err, `Command ${cmd} failed`);
    return null;
  }
}

/**
 * Higher-order function to wrap async operations with global loading and error handling.
 */
export async function withLoading<T>(
  operation: () => Promise<T>, 
  label: string | null = null,
  minTime: number = 0
): Promise<T | undefined> {
  const store = useAppStore.getState();
  const startTime = Date.now();
  
  try {
    store.setIsProcessing(true, label);
    const result = await operation();
    
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

/**
 * Helper to refresh repository status and files in the store.
 */
export async function refreshStatus(path: string) {
  const status = await safeInvoke<any[]>('get_status', { repoPath: path });
  const repoStatus = await safeInvoke<any>('get_repo_status', { path });
  
  if (status && repoStatus) {
    useAppStore.setState({ 
      unstagedFiles: status.filter(f => f.status === 'unstaged' || f.status === 'untracked'),
      stagedFiles: status.filter(f => f.status === 'staged'),
      repoStatus 
    });
  }
}
