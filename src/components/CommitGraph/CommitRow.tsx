import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Monitor, Cloud, ChevronDown, Clock, GitCommit, Tag, HardDrive } from 'lucide-react';
import { CommitNode, useAppStore } from '../../store';
import { selectCommitDetail, safeSwitchBranch } from '../../lib/repo';
import { Skeleton } from '../ui/Loading';
import { cn } from '../../lib/utils';

const ROW_H = 32;

// Dracula Theme colors for lanes
const COLORS = [
  '#8be9fd', // cyan
  '#bd93f9', // purple
  '#ff79c6', // pink
  '#ffb86c', // orange
  '#50fa7b', // green
  '#6272a4', // comment (indigo-ish)
  '#ff5555', // red
  '#f1fa8c', // yellow
];

const color = (i: number) => COLORS[i % COLORS.length];

export function SkeletonRow({ virtualRow, cw, gw }: { virtualRow: any, cw: any, gw: number }) {
  return (
    <div 
      className="absolute left-0 w-full flex items-center px-2 pointer-events-none opacity-20"
      style={{ height: ROW_H, transform: `translateY(${virtualRow.start}px)` }}
    >
      <div className="shrink-0" style={{ width: cw.label }}>
        <Skeleton width="60%" height={16} borderRadius="12px" />
      </div>
      <div style={{ width: gw + 5 }} />
      <div className="flex-1 flex items-center pl-4 pr-4">
        <Skeleton width="80%" height={14} />
      </div>
      <div className="pl-4" style={{ width: cw.hash }}>
        <Skeleton width="80%" height={14} />
      </div>
      <div className="pl-4" style={{ width: cw.author }}>
        <Skeleton width="70%" height={14} />
      </div>
    </div>
  );
}

// ── BranchLabels Component ───────────────────────────────────────────
function BranchLabels({ refs, colorIdx, isActive }: { refs: string[], colorIdx: number, isActive: boolean }) {
  const [open, setOpen] = useState(false);
  const activeBranch = useAppStore(s => s.activeBranch);
  
  const branchGroups = useMemo(() => {
    const groups = new Map<string, { isLocal: boolean; isRemote: boolean; isHead: boolean; isTag?: boolean }>();
    let hasHead = false;
    refs?.forEach(r => {
      if (r === 'HEAD') {
        hasHead = true;
        return;
      }
      let name = r;
      let isRemote = false;
      let isTag = false;
      
      if (r.startsWith('origin/')) {
        name = r.substring(7);
        isRemote = true;
      } else if (r.startsWith('refs/tags/')) {
        name = r.substring(10);
        isTag = true;
      }
      
      const existing = groups.get(name) || { isLocal: false, isRemote: false, isHead: false, isTag: false };
      if (isTag) existing.isTag = true;
      else if (isRemote) existing.isRemote = true;
      else existing.isLocal = true;
      groups.set(name, existing);
    });
    
    const branchEntries = Array.from(groups.entries());
    if (branchEntries.length === 0 && hasHead) {
      return [['HEAD', { isLocal: true, isRemote: false, isHead: true }]];
    }
    return branchEntries;
  }, [refs]);

  if (branchGroups.length === 0) return null;
  const [primary, ...others] = branchGroups;

  const renderBadge = ([name, info]: [any, any], isDropdown = false) => {
    const isRemoteOnly = info.isRemote && !info.isLocal;
    const isHead = info.isHead;
    const isTag = info.isTag;
    const isActiveBranch = name === activeBranch && !isRemoteOnly && !isTag;
    const clr = color(colorIdx);
    
    return (
      <motion.span 
        key={name} 
        onDoubleClick={async (e) => {
          e.stopPropagation();
          if (isHead || isTag) return;
          if (isDropdown) setOpen(false);
          await safeSwitchBranch((info.isRemote && !info.isLocal) ? `origin/${name}` : name);
        }}
        onClick={(e) => {
          if (isRemoteOnly) {
            e.stopPropagation();
            if (isDropdown) setOpen(false);
            const fullRef = `origin/${name}`;
            useAppStore.setState({ forceCheckoutTarget: fullRef, forceCheckoutPhase: 'confirm_reset' });
          }
        }}
        className={cn(
          "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap min-w-0 cursor-pointer select-none border transition-all shadow-sm",
          (isHead || isActiveBranch) 
            ? "bg-primary/10 text-primary border-primary/20 shadow-[0_0_10px_rgba(var(--p),0.1)] ring-1 ring-primary/10"
            : isTag
              ? "bg-dracula-orange/10 text-dracula-orange border-dracula-orange/20"
              : isRemoteOnly
                ? "bg-dracula-purple/10 text-dracula-purple border-dracula-purple/20"
                : "bg-background/50 border-border/40 text-muted-foreground hover:text-foreground hover:border-border"
        )}
        style={(!isHead && !isActiveBranch && !isTag && !isRemoteOnly) ? { borderColor: `${clr}40`, color: clr } : {}}
      >
        {isTag ? <Tag size={10} className="shrink-0" /> : isHead ? <GitCommit size={10} className="shrink-0" /> : null}
        <span className="truncate">{name}</span>
        {!isHead && !isTag && (
          <div className="flex items-center gap-1 opacity-50 shrink-0">
            {info.isLocal && <Monitor size={10} />}
            {info.isRemote && <Cloud size={10} />}
          </div>
        )}
      </motion.span>
    );
  };

  return (
    <div 
      className={cn(
        "relative flex items-center gap-1.5 transition-all duration-300",
        !isActive ? "opacity-60 hover:opacity-100" : "opacity-100",
        open ? "z-[100]" : "z-auto"
      )}
      onMouseEnter={() => others.length > 0 && setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {renderBadge(primary as any)}

      {others.length > 0 && (
        <div className="bg-secondary/40 text-muted-foreground border border-border/40 px-1.5 py-0.5 rounded-full text-[9px] font-black flex items-center gap-1 cursor-default hover:text-foreground hover:border-border transition-all h-[18px]">
          +{others.length}
          <ChevronDown size={10} className={cn("transition-transform duration-300", open && "rotate-180")} />
        </div>
      )}

      <AnimatePresence>
        {open && (
          <motion.div 
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full left-0 pt-2 z-[50] w-max before:content-[''] before:absolute before:-top-4 before:inset-x-0 before:h-4"
          >
            <div className="bg-background/80 backdrop-blur-xl border border-border/40 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] p-1.5 flex flex-col gap-1 w-full min-w-[120px]">
              {others.map((entry: any) => renderBadge(entry, true))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── CommitRow Component ──────────────────────────────────────────────
export interface CommitRowProps {
  n: CommitNode;
  row: number;
  virtualRow: any;
  hov: number | null;
  sel: number | null;
  activeOids: Set<string>;
  cw: any;
  gw: number;
  setHov: (r: number | null) => void;
  setSel: (r: number) => void;
  handleContextMenu: (e: React.MouseEvent, n: CommitNode) => void;
}

export function CommitRow({
  n, row, virtualRow, hov, sel, activeOids, cw, gw, setHov, setSel, handleContextMenu
}: CommitRowProps) {
  const [copied, setCopied] = useState(false);
  const isActive = activeOids.has(n.oid);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(n.oid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const authorName = n.author || 'Unknown';
  const authorFirstName = authorName.split(' ')[0];

  return (
    <div 
      key={n.oid}
      className={cn(
        "absolute left-0 w-full flex items-center cursor-pointer transition-all duration-200 group/row border-l-4",
        hov === row ? "z-[60] border-transparent" : sel === row ? "z-[50] border-primary" : "z-[20] border-transparent"
      )}
      style={{ 
        height: ROW_H,
        transform: `translateY(${virtualRow.start}px)`
      }}
      onClick={() => {
        setSel(row);
        selectCommitDetail(n.oid);
      }}
      onContextMenu={(e) => handleContextMenu(e, n)}
      onMouseEnter={() => setHov(row)} 
      onMouseLeave={() => setHov(null)}
    >
      <div className="pl-3 overflow-visible shrink-0" style={{ width: cw.label }}>
        <BranchLabels refs={n.refs} colorIdx={n.color_idx} isActive={isActive} />
      </div>
      <div style={{ width: gw }} />
      <div className="flex-1 flex items-center pl-6 pr-4 min-w-0">
        {n.node_type === 'stash' ? (
          <div className="flex items-center gap-2.5">
             <span className="bg-dracula-orange/10 text-dracula-orange border border-dracula-orange/20 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter shrink-0 shadow-sm">STASH</span>
             <span className="truncate text-dracula-orange/80 text-[12px] italic font-medium">{n.message || 'Stashed changes'}</span>
          </div>
        ) : (
          <span className={cn(
            "truncate text-[12px] transition-colors duration-200",
            isActive ? "text-foreground font-medium" : "text-foreground/70 font-normal group-hover/row:text-foreground"
          )}>
            {n.message}
          </span>
        )}
      </div>
      <div 
        className="pl-4 flex items-center gap-2 group/hash relative" 
        style={{ width: cw.hash }}
        onClick={handleCopy}
      >
        <span className="font-mono text-[11px] text-muted-foreground/80 group-hover/hash:text-primary transition-colors">{n.short_oid}</span>
        <button className="opacity-0 group-hover/hash:opacity-100 p-1 hover:bg-primary/10 rounded-lg transition-all duration-200">
          {copied ? <Check size={12} className="text-dracula-green" /> : <Copy size={12} className="text-muted-foreground/40" />}
        </button>
      </div>
      <div className="pl-4 flex items-center pr-4" style={{ width: cw.author }}>
         <span className="text-[11px] text-muted-foreground/80 truncate font-semibold group-hover/row:text-foreground transition-colors uppercase tracking-tight">{authorFirstName}</span>
      </div>
    </div>
  );
}

// ── WipRow Component ─────────────────────────────────────────────────
export interface WipRowProps {
  virtualRow: any;
  hov: number | null;
  sel: number | null;
  cw: any;
  gw: number;
  status: any;
  staged: any[];
  unstaged: any[];
  setHov: (r: number | null) => void;
  setSel: (r: number) => void;
}

export function WipRow({
  virtualRow, hov, sel, cw, gw, status, staged, unstaged, setHov, setSel
}: WipRowProps) {
  const stagedCount = status?.staged_count ?? staged.length;
  const unstagedCount = status?.unstaged_count ?? unstaged.length;

  return (
    <div
      key="WIP"
      className={cn(
        "absolute left-0 w-full flex items-center cursor-pointer transition-all duration-200 border-l-4",
        hov === 0 ? "z-[60] border-transparent" : sel === 0 ? "z-[50] border-primary" : "z-[20] border-transparent"
      )}
      style={{ height: ROW_H, transform: `translateY(${virtualRow.start}px)` }}
      onClick={() => {
        setSel(0);
        useAppStore.setState({ selectedCommitDetail: null, isLoadingCommitDetail: false });
      }}
      onMouseEnter={() => setHov(0)} 
      onMouseLeave={() => setHov(null)}
    >
      <div className="pl-3 flex items-center" style={{ width: cw.label }}>
        <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter">WIP</span>
      </div>
      <div style={{ width: gw }} />
      <div className="flex-1 flex items-center pl-6 pr-4 min-w-0">
        <div className="h-7 rounded-xl border border-primary/10 bg-primary/5 flex items-center px-3 gap-4 shadow-sm backdrop-blur-sm group/wip-pill hover:border-primary/20 transition-all">
          <HardDrive size={12} className="text-primary/60 group-hover/wip-pill:scale-110 transition-transform" />
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-dracula-green uppercase flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-dracula-green shadow-[0_0_8px_rgba(80,250,123,0.4)]" />
              {stagedCount} Staged
            </span>
            <div className="w-px h-2.5 bg-border/40" />
            <span className="text-[10px] font-black text-dracula-orange uppercase flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-dracula-orange shadow-[0_0_8px_rgba(255,184,108,0.4)]" />
              {unstagedCount} Unstaged
            </span>
          </div>
        </div>
      </div>
      <div className="pl-4 flex items-center" style={{ width: cw.hash }}>
        <Clock size={12} className="text-muted-foreground/20" />
      </div>
      <div className="pl-4 pr-4 flex items-center" style={{ width: cw.author }}>
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Working Tree</span>
      </div>
    </div>
  );
}
