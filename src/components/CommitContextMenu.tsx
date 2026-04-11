import { useState, useEffect, useRef, useCallback } from 'react';
import { GitBranch, Copy, Eye, BookmarkPlus, GitCommit, CloudSync, Trash2, ChevronsDown } from 'lucide-react';
import { CommitNode, useAppStore, StashEntry } from '../store';
import { safeSwitchBranch, selectCommitDetail, applyStash, popStash } from '../lib/repo';
import { toast } from '../lib/toast';
import { CreateBranchDialog } from './CreateBranchDialog';
import { CherryPickDialog } from './CherryPickDialog';

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
  
  const isStash = commit.node_type === 'stash';

  // Adjust position to keep menu on-screen
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let { x, y } = position;

    if (x + rect.width > vw - 8) x = vw - rect.width - 8;
    if (y + rect.height > vh - 8) y = vh - rect.height - 8;
    if (x < 8) x = 8;
    if (y < 8) y = 8;

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
    // Checkout detached HEAD at this commit
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

  const handleDropStash = useCallback(() => {
    if (commit.stash_index !== undefined) {
      // Map CommitNode to StashEntry for the confirmation dialog
      const stashEntry: StashEntry = {
        stackIndex: commit.stash_index,
        message: commit.message,
        oid: commit.oid,
        parent_oid: commit.parents?.[0] || '',
        timestamp: commit.timestamp
      };
      useAppStore.setState({ confirmStashDrop: stashEntry });
      onClose();
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
        commits={[commit]} // For now, single commit
        onClose={onClose}
      />
    );
  }

  const menuItems = [
    {
      id: 'cherry-pick',
      icon: <GitCommit size={14} />,
      label: 'Cherry-pick This Commit...',
      color: 'text-[#d29922]',
      action: () => setShowCherryPick(true),
    },
    { id: 'sep-0', separator: true },
    {
      id: 'create-branch',
      icon: <GitBranch size={14} />,
      label: 'Create Branch Here',
      color: 'text-[#3fb950]',
      action: () => setShowCreateBranch(true),
    },
    {
      id: 'checkout-here',
      icon: <BookmarkPlus size={14} />,
      label: 'Checkout This Commit',
      color: 'text-[#79c0ff]',
      action: handleCheckoutHere,
    },
    { id: 'sep-1', separator: true },
    {
      id: 'view-details',
      icon: <Eye size={14} />,
      label: 'View Commit Details',
      color: 'text-[#8b949e]',
      action: handleViewDetails,
    },
    {
      id: 'copy-hash',
      icon: <Copy size={14} />,
      label: 'Copy Commit Hash',
      color: 'text-[#8b949e]',
      action: handleCopyOid,
      shortcut: commit.short_oid,
    },
    {
      id: 'copy-message',
      icon: <Copy size={14} />,
      label: 'Copy Commit Message',
      color: 'text-[#8b949e]',
      action: handleCopyMessage,
    },
  ];

  // If stash, add stash operations at the beginning
  const stashItems = isStash ? [
    {
      id: 'apply-stash',
      icon: <CloudSync size={14} />,
      label: 'Apply This Stash',
      color: 'text-[#388bfd]',
      action: handleApplyStash,
    },
    {
      id: 'pop-stash',
      icon: <ChevronsDown size={14} />,
      label: 'Pop This Stash',
      color: 'text-[#3fb950]',
      action: handlePopStash,
    },
    {
      id: 'drop-stash',
      icon: <Trash2 size={14} />,
      label: 'Delete This Stash',
      color: 'text-red-400',
      action: handleDropStash,
    },
    { id: 'stash-sep', separator: true },
  ] : [];

  const finalItems = [...stashItems, ...menuItems];

  return (
    <div
      ref={menuRef}
      className="commit-context-menu"
      style={{
        position: 'fixed',
        left: menuPos.x,
        top: menuPos.y,
        zIndex: 9999,
      }}
    >
      {/* Commit info header */}
      <div className="commit-context-menu-header">
        <div className="flex items-center gap-2">
          <code className="text-[10px] font-mono text-[#79c0ff] bg-[#0d1117] px-1.5 py-0.5 rounded">{commit.short_oid}</code>
          <span className="text-[11px] text-[#8b949e] truncate max-w-[180px]">{commit.message}</span>
        </div>
      </div>

      {/* Menu items */}
      <div className="py-1">
        {finalItems.map((item) =>
          'separator' in item ? (
            <div key={item.id} className="my-1 border-t border-[#21262d]" />
          ) : (
            <button
              key={item.id}
              onClick={item.action}
              className="commit-context-menu-item"
            >
              <span className={`shrink-0 ${item.color}`}>{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
              {'shortcut' in item && item.shortcut && (
                <span className="text-[10px] font-mono text-[#484f58] ml-2">{item.shortcut}</span>
              )}
            </button>
          )
        )}
      </div>
    </div>
  );
}
