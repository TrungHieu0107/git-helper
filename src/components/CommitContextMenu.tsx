import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch, Copy, Eye, BookmarkPlus, GitCommit, GitMerge, CloudSync, Trash2, ChevronsDown, RotateCcw, X, MessageSquare } from 'lucide-react';
import { CommitNode, useAppStore } from '../store';
import { safeSwitchBranch, selectCommitDetail, applyStash, popStash, dropStash, findMergableBranch } from '../lib/repo';
import { confirm } from './ui/ConfirmDialog';
import { toast } from '../lib/toast';
import { CreateBranchDialog } from './CreateBranchDialog';
import { CherryPickDialog } from './CherryPickDialog';
import { cn } from '../lib/utils';
import { Separator } from './ui/Separator';
import { Badge } from './ui/Badge';

// ── Types ────────────────────────────────────────────────────────────
export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface CommitContextMenuProps {
  commit: CommitNode;
  position: ContextMenuPosition;
  onClose: () => void;
}

// ── Main Context Menu ────────────────────────────────────────────────
export function CommitContextMenu({ commit, position, onClose }: CommitContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showCreateBranch, setShowCreateBranch] = useState(false);
  const [showCherryPick, setShowCherryPick] = useState(false);
  const [menuPos, setMenuPos] = useState(position);
  
  const repoInfo = useAppStore(s => s.repoInfo);
  const cherryPickState = useAppStore(s => s.cherryPickState);

  const isStash = commit.node_type === 'stash';

  // Adjust position to keep menu on-screen
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

    setMenuPos({ x, y });
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

  const handleCopyOid = useCallback(() => {
    navigator.clipboard.writeText(commit.oid);
    toast.success('Commit hash copied');
    onClose();
  }, [commit.oid, onClose]);

  const handleCopyMessage = useCallback(() => {
    navigator.clipboard.writeText(commit.message);
    toast.success('Commit message copied');
    onClose();
  }, [commit.message, onClose]);

  const handleViewDetails = useCallback(() => {
    selectCommitDetail(commit.oid);
    onClose();
  }, [commit.oid, onClose]);

  const handleCheckoutHere = useCallback(async () => {
    await safeSwitchBranch(commit.oid);
    onClose();
  }, [commit.oid, onClose]);

  const handleApplyStash = useCallback(() => {
    if (commit.stash_index !== undefined) {
      applyStash(commit.stash_index);
      onClose();
    }
  }, [commit.stash_index, onClose]);

  const handlePopStash = useCallback(() => {
    if (commit.stash_index !== undefined) {
      popStash(commit.stash_index);
      onClose();
    }
  }, [commit.stash_index, onClose]);

  const handleDropStash = useCallback(async () => {
    if (commit.stash_index !== undefined) {
      onClose();
      const ok = await confirm({
        title: 'Delete Stash',
        message: 'Are you sure you want to delete this stash entry? This action cannot be undone.',
        detail: (
          <div className="flex items-center gap-2 text-xs bg-secondary/30 p-2 rounded-md border border-border/50">
            <MessageSquare size={12} className="text-muted-foreground" />
            <span className="text-muted-foreground italic truncate">"{commit.message}"</span>
          </div>
        ),
        confirmLabel: 'Delete',
        variant: 'danger'
      });
      if (ok) await dropStash(commit.stash_index);
    }
  }, [commit, onClose]);

  if (showCreateBranch) {
    return (
      <CreateBranchDialog
        onClose={onClose}
        defaultSource={commit.oid}
        defaultSourceLabel={commit.short_oid}
      />
    );
  }
  
  if (showCherryPick) {
    return (
      <CherryPickDialog
        commits={[commit]}
        onClose={onClose}
      />
    );
  }

  const mergableBranch = repoInfo
    ? findMergableBranch(commit.refs, repoInfo.head_branch)
    : null;

  const remoteRefs = commit.refs.filter(r => r.startsWith('origin/'));

  const menuItems = [
    {
      id: 'merge-branch',
      icon: <GitMerge size={14} />,
      label: mergableBranch
        ? `Merge '${mergableBranch}' into '${repoInfo?.head_branch}'`
        : 'Merge Branch into HEAD...',
      className: 'text-primary hover:bg-primary/10',
      action: () => {
        if (mergableBranch) {
          useAppStore.getState().setMergeTarget(mergableBranch);
          onClose();
        }
      },
      hidden: isStash || !mergableBranch,
      disabled: isStash || cherryPickState !== 'idle',
    },
    {
      id: 'cherry-pick',
      icon: <GitCommit size={14} />,
      label: 'Cherry-pick This Commit...',
      className: 'text-amber-500 hover:bg-amber-500/10',
      action: () => setShowCherryPick(true),
    },
    {
      id: 'reset-here',
      icon: <RotateCcw size={14} />,
      label: 'Reset to this commit...',
      className: 'text-purple-400 hover:bg-purple-400/10',
      action: () => {
        useAppStore.getState().setResetToCommitTarget(commit);
        onClose();
      },
      disabled: isStash || commit.oid === repoInfo?.head_oid || cherryPickState !== 'idle'
    },
    ...remoteRefs.map(ref => ({
      id: `force-checkout-${ref}`,
      icon: <RotateCcw size={14} />,
      label: `Force reset local to '${ref}'`,
      className: 'text-destructive hover:bg-destructive/10',
      action: () => {
        useAppStore.setState({ forceCheckoutTarget: ref, forceCheckoutPhase: 'confirm_reset' });
        onClose();
      },
      disabled: isStash || cherryPickState !== 'idle'
    })),
    { id: 'sep-0', separator: true },
    {
      id: 'create-branch',
      icon: <GitBranch size={14} />,
      label: 'Create Branch Here',
      className: 'text-green-500 hover:bg-green-500/10',
      action: () => setShowCreateBranch(true),
    },
    {
      id: 'checkout-here',
      icon: <BookmarkPlus size={14} />,
      label: 'Checkout This Commit',
      className: 'text-primary/80 hover:bg-primary/10',
      action: handleCheckoutHere,
    },
    { id: 'sep-1', separator: true },
    {
      id: 'view-details',
      icon: <Eye size={14} />,
      label: 'View Commit Details',
      action: handleViewDetails,
    },
    {
      id: 'copy-hash',
      icon: <Copy size={14} />,
      label: 'Copy Commit Hash',
      action: handleCopyOid,
      shortcut: commit.short_oid,
    },
    {
      id: 'copy-message',
      icon: <Copy size={14} />,
      label: 'Copy Commit Message',
      action: handleCopyMessage,
    },
  ];

  const stashItems = isStash ? [
    {
      id: 'apply-stash',
      icon: <CloudSync size={14} />,
      label: 'Apply This Stash',
      className: 'text-primary hover:bg-primary/10',
      action: handleApplyStash,
    },
    {
      id: 'pop-stash',
      icon: <ChevronsDown size={14} />,
      label: 'Pop This Stash',
      className: 'text-green-500 hover:bg-green-500/10',
      action: handlePopStash,
    },
    {
      id: 'drop-stash',
      icon: <Trash2 size={14} />,
      label: 'Delete This Stash',
      className: 'text-destructive hover:bg-destructive/10',
      action: handleDropStash,
    },
    { id: 'stash-sep', separator: true },
  ] : [];

  const finalItems = [...stashItems, ...menuItems];

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="commit-context-menu"
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        transition={{ duration: 0.1, ease: 'easeOut' }}
        className="fixed z-[9999] bg-background/80 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl py-1.5 min-w-[240px] overflow-hidden"
        style={{ left: menuPos.x, top: menuPos.y }}
      >
        <div className="px-3.5 py-2 border-b border-border/30 mb-1.5 bg-secondary/20">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-hidden">
              <Badge variant="secondary" className="font-mono text-[10px] shrink-0">{commit.short_oid}</Badge>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 truncate max-w-[140px]">
                {commit.message}
              </span>
            </div>
            <button onClick={onClose} className="text-muted-foreground/40 hover:text-foreground transition-colors shrink-0">
              <X size={12} />
            </button>
          </div>
        </div>

        <div className="px-1 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {finalItems.map((item: any, idx) =>
            item.separator ? (
              <Separator key={`sep-${idx}`} className="my-1.5 opacity-50" />
            ) : (
              <button
                key={item.id}
                onClick={item.action}
                disabled={!!item.disabled}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-[12px] rounded-lg transition-all duration-200 text-left font-medium",
                  item.disabled ? "opacity-30 cursor-not-allowed grayscale" : "hover:bg-secondary/80 hover:translate-x-1",
                  item.className || 'text-foreground/80 hover:text-foreground'
                )}
              >
                <span className="opacity-60">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.shortcut && (
                  <span className="text-[10px] font-mono text-muted-foreground/40 ml-2">{item.shortcut}</span>
                )}
              </button>
            )
          )}
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
