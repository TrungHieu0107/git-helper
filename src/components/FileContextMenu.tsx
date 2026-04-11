import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileCode, FolderSearch, Plus, Minus, RotateCcw, History, Copy, X, Undo2 } from 'lucide-react';
import { openInEditor, showInExplorer, stageFile, unstageFile, discardFileChanges, refreshActiveRepoStatus } from '../lib/repo';
import { toast } from '../lib/toast';
import { useAppStore } from '../store';

export interface FileContextMenuProps {
  path: string;
  isStaged: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  hideGitActions?: boolean;
  commitOid?: string;
  shortOid?: string;
  commitMessage?: string;
}

export function FileContextMenu({ 
  path, 
  isStaged, 
  position, 
  onClose, 
  hideGitActions = false,
  commitOid,
  shortOid,
  commitMessage 
}: FileContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState(position);
  const { setFileHistory, activeRepoPath, setConfirmRestoreFile } = useAppStore();

  // Adjust position to stay within viewport
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let { x, y } = position;

    if (x + rect.width > vw - 10) x = vw - rect.width - 10;
    if (y + rect.height > vh - 10) y = vh - rect.height - 10;
    if (x < 10) x = 10;
    if (y < 10) y = 10;

    setAdjustedPos({ x, y });
  }, [position]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleCopyRepoPath = () => {
    navigator.clipboard.writeText(path);
    toast.success('Repo path copied');
    onClose();
  };

  const handleCopyFullPath = () => {
    if (!activeRepoPath) return;
    // Normalize path separators for Windows/Unix
    const fullPath = `${activeRepoPath}${activeRepoPath.endsWith('/') || activeRepoPath.endsWith('\\') ? '' : '/'}${path}`;
    navigator.clipboard.writeText(fullPath.replace(/\//g, '\\'));
    toast.success('Full path copied');
    onClose();
  };

  const handleDiscard = () => {
    if (window.confirm(`Are you sure you want to discard all changes in "${path}"?\nThis will revert the file to its state in HEAD and cannot be undone.`)) {
      discardFileChanges(path);
      onClose();
    }
  };

  const menuItems = [
    {
      id: 'open',
      icon: <FileCode size={14} />,
      label: 'Open in Editor',
      action: () => { openInEditor(path); onClose(); }
    },
    {
      id: 'reveal',
      icon: <FolderSearch size={14} />,
      label: 'Show in Explorer',
      action: () => { showInExplorer(path); onClose(); }
    },
    { id: 'sep-1', separator: true, hide: hideGitActions },
    {
      id: 'stage-unstage',
      icon: isStaged ? <Minus size={14} /> : <Plus size={14} />,
      label: isStaged ? 'Unstage File' : 'Stage File',
      color: isStaged ? 'text-[#f85149]' : 'text-[#3fb950]',
      action: () => { isStaged ? unstageFile(path) : stageFile(path); onClose(); },
      hide: hideGitActions
    },
    ...(!isStaged ? [{
      id: 'discard',
      icon: <RotateCcw size={14} />,
      label: 'Discard Changes',
      color: 'text-[#f85149]',
      action: handleDiscard,
      hide: hideGitActions
    }] : []),
    { id: 'sep-2', separator: true },
    ...(commitOid ? [{
      id: 'restore',
      icon: <Undo2 size={14} />,
      label: 'Restore File from This Version',
      action: async () => {
        if (!shortOid || !commitMessage) return;
        onClose();
        await refreshActiveRepoStatus();
        setConfirmRestoreFile({
          path,
          commitOid,
          shortOid,
          commitMessage,
        });
      }
    }, { id: 'sep-restore', separator: true }] : []),
    {
      id: 'history',
      icon: <History size={14} />,
      label: 'File History',
      action: () => { setFileHistory(path); onClose(); }
    },
    {
      id: 'copy-repo',
      icon: <Copy size={14} />,
      label: 'Copy Repo Path',
      action: handleCopyRepoPath
    },
    {
      id: 'copy-full',
      icon: <Copy size={14} />,
      label: 'Copy Full Path',
      action: handleCopyFullPath
    }
  ].filter(item => !('hide' in item) || !item.hide);

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-[#161b22] border border-[#30363d] rounded-md shadow-2xl py-1 min-w-[200px] animate-in fade-in zoom-in duration-100 ease-out"
      style={{ left: adjustedPos.x, top: adjustedPos.y }}
    >
      <div className="px-3 py-1.5 border-b border-[#30363d] mb-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[10px] font-mono text-[#8b949e] truncate max-w-[160px]">{path}</span>
          <button onClick={onClose} className="text-[#8b949e] hover:text-[#e6edf3]">
            <X size={12} />
          </button>
        </div>
      </div>
      
      {menuItems.map((item, idx) => (
        'separator' in item ? (
          <div key={`sep-${idx}`} className="h-px bg-[#30363d] my-1" />
        ) : (
          <button
            key={item.id}
            onClick={item.action}
            className={`w-full flex items-center gap-3 px-3 py-1.5 text-[12px] hover:bg-[#1f2937] transition-colors text-left ${item.color || 'text-[#e6edf3]'}`}
          >
            <span className="opacity-70">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
          </button>
        )
      ))}
    </div>,
    document.body
  );
}
