import React, { useRef, useEffect, useState } from 'react';
import { RotateCcw, GitMerge } from 'lucide-react';
import { useAppStore } from '../../store';

interface BranchContextMenuProps {
  branch: string;
  position: { x: number; y: number };
  onClose: () => void;
}

export const BranchContextMenu: React.FC<BranchContextMenuProps> = ({ 
  branch, 
  position, 
  onClose 
}) => {
  const { branches, cherryPickState, activeBranch } = useAppStore();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState(position);

  const hasOrigin = branch.startsWith('origin/') || branches.some(b => b.branch_type === 'remote' && b.name === `origin/${branch}`);
  const isProcessing = cherryPickState !== 'idle';
  const isCurrentBranch = activeBranch === branch;

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleForceCheckout = () => {
    onClose();
    useAppStore.setState({ forceCheckoutTarget: branch, forceCheckoutPhase: 'confirm_reset' });
  };

  const handleMerge = () => {
    onClose();
    useAppStore.getState().setMergeTarget(branch);
  };

  return (
    <div 
      ref={menuRef}
      className="fixed bg-background/80 border border-border/40 rounded-lg shadow-2xl py-1.5 z-[9999] min-w-[200px] animate-in fade-in zoom-in-95 duration-100 backdrop-blur-xl"
      style={{ top: menuPos.y, left: menuPos.x }}
    >
      <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider border-b border-border/20 mb-1 truncate">
        Branch: {branch}
      </div>

      <button
        disabled={isCurrentBranch || isProcessing}
        onClick={handleMerge}
        className={`w-full text-left flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
          isCurrentBranch || isProcessing
            ? 'text-muted-foreground/40 cursor-not-allowed'
            : 'text-dracula-cyan hover:bg-dracula-cyan/10 hover:text-dracula-cyan/80'
        }`}
      >
        <GitMerge size={14} />
        Merge into current branch
      </button>
      
      <div className="my-1 border-t border-border/20" />

      <button 
        disabled={!hasOrigin || isProcessing}
        onClick={handleForceCheckout}
        className={`w-full text-left flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
          !hasOrigin || isProcessing 
            ? 'text-muted-foreground/40 cursor-not-allowed' 
            : 'text-dracula-red hover:bg-dracula-red/10 hover:text-dracula-red/80'
        }`}
      >
        <RotateCcw size={14} />
        Force checkout from origin
      </button>

      {!hasOrigin && (
        <div className="px-3 py-1 text-[10px] text-muted-foreground/50 italic">
          No tracking branch on origin
        </div>
      )}
    </div>
  );
};
