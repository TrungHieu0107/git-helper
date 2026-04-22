import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FileCode, FolderSearch, Plus, Minus, RotateCcw, History, Copy, X, Undo2 } from 'lucide-react';
import { openInEditor, showInExplorer, stageFile, unstageFile, discardFileChanges, refreshActiveRepoStatus, restoreFileFromCommit } from '../lib/repo';
import { toast } from '../lib/toast';
import { useAppStore } from '../store';
import { confirm } from './ui/ConfirmDialog';
import { cn } from '../lib/utils';
import { Separator } from './ui/Separator';
import { Badge } from './ui/Badge';

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
  const { setFileHistory, activeRepoPath } = useAppStore();

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
    const fullPath = `${activeRepoPath}${activeRepoPath.endsWith('/') || activeRepoPath.endsWith('\\') ? '' : '/'}${path}`;
    navigator.clipboard.writeText(fullPath.replace(/\//g, '\\'));
    toast.success('Full path copied');
    onClose();
  };

  const handleDiscard = async () => {
    const ok = await confirm({
      title: 'Discard Changes',
      message: `Are you sure you want to discard all changes in "${path}"? This action cannot be undone.`,
      confirmLabel: 'Discard',
      variant: 'danger'
    });
    
    if (ok) {
      await discardFileChanges(path);
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
      className: isStaged ? 'text-destructive hover:bg-destructive/10' : 'text-green-500 hover:bg-green-500/10',
      action: () => { isStaged ? unstageFile(path) : stageFile(path); onClose(); },
      hide: hideGitActions
    },
    ...(!isStaged ? [{
      id: 'discard',
      icon: <RotateCcw size={14} />,
      label: 'Discard Changes',
      className: 'text-destructive hover:bg-destructive/10',
      action: handleDiscard,
      hide: hideGitActions
    }] : []),
    { id: 'sep-2', separator: true },
    ...(commitOid ? [{
      id: 'restore',
      icon: <Undo2 size={14} />,
      label: 'Restore version from commit',
      action: async () => {
        if (!shortOid || !commitMessage) return;
        onClose();
        
        const ok = await confirm({
          title: 'Restore File',
          message: `Restore "${path}" to version from commit?`,
          detail: (
            <div className="flex items-center gap-2 text-xs bg-secondary/30 p-2 rounded-md border border-border/50">
              <Badge variant="secondary" className="font-mono">{shortOid}</Badge>
              <span className="text-muted-foreground italic truncate">"{commitMessage}"</span>
            </div>
          ),
          confirmLabel: 'Restore',
          variant: 'warning'
        });

        if (ok) {
          await restoreFileFromCommit(commitOid, path);
          await refreshActiveRepoStatus();
        }
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
    <AnimatePresence>
      <motion.div
        key="file-context-menu"
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        transition={{ duration: 0.1, ease: 'easeOut' }}
        className="fixed z-[9999] bg-background/80 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl py-1.5 min-w-[220px] overflow-hidden"
        style={{ left: adjustedPos.x, top: adjustedPos.y }}
      >
        <div className="px-3.5 py-2 border-b border-border/30 mb-1.5 bg-secondary/20">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 truncate max-w-[160px]">
              {path.split('/').pop()}
            </span>
            <button onClick={onClose} className="text-muted-foreground/40 hover:text-foreground transition-colors">
              <X size={12} />
            </button>
          </div>
        </div>
        
        <div className="px-1">
          {menuItems.map((item, idx) => (
            'separator' in item ? (
              <Separator key={`sep-${idx}`} className="my-1.5 opacity-50" />
            ) : (
              <button
                key={item.id}
                onClick={item.action}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-[12px] rounded-lg transition-all duration-200 text-left font-medium",
                  "hover:bg-secondary/80 hover:translate-x-1",
                  item.className || 'text-foreground/80 hover:text-foreground'
                )}
              >
                <span className="opacity-60">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
              </button>
            )
          ))}
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
