import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Monitor, Cloud, ChevronDown, Clock, GitCommit, Tag, HardDrive } from 'lucide-react';
import { CommitNode, useAppStore } from '../../store';
import { selectCommitDetail, safeSwitchBranch } from '../../lib/repo';
import { Skeleton } from '../ui/Loading';
import { cn } from '../../lib/utils';


// Dracula Theme colors for lanes
const COLORS = [
  '#3ddbd9', // teal
  '#b072d1', // purple
  '#ff79c6', // pink
  '#ffb86c', // orange
  '#50fa7b', // green
  '#f1fa8c', // yellow
  '#ff5555', // red
  '#8be9fd', // cyan
];

const color = (i: number) => COLORS[i % COLORS.length];

export const SkeletonRow = React.memo(({ virtualRow, rowH, cw, graphColumnWidth }: { virtualRow: any, rowH: number, cw: any, graphColumnWidth: number }) => {
  return (
    <div 
      className="absolute left-0 w-full flex items-center pointer-events-none opacity-20"
      style={{ height: rowH, transform: `translateY(${virtualRow.start}px)` }}
    >
      <div className="shrink-0 pl-4" style={{ width: cw.label }}>
        <Skeleton width="60%" height={16} borderRadius="12px" />
      </div>
      <div style={{ width: 5 + graphColumnWidth + 5 }} />
      <div className="flex-1 flex items-center pl-6 pr-4">
        <Skeleton width="80%" height={14} />
      </div>
      <div className="pl-[21px]" style={{ width: 5 + cw.hash }}>
        <Skeleton width="80%" height={14} />
      </div>
      <div className="pl-[21px] pr-4" style={{ width: 5 + cw.author }}>
        <Skeleton width="70%" height={14} />
      </div>
    </div>
  );
});

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
          if (isRemoteOnly) {
            const fullRef = `origin/${name}`;
            useAppStore.setState({ forceCheckoutTarget: fullRef, forceCheckoutPhase: 'confirm_reset' });
          } else {
            await safeSwitchBranch(name);
          }
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
        className={cn(
          "flex items-center gap-1.5 px-1.5 py-0 rounded-full text-[10px] font-bold whitespace-nowrap min-w-0 cursor-pointer select-none border transition-all shadow-sm",
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
        <div className="bg-secondary/40 text-muted-foreground border border-border/40 px-1 py-0 rounded-full text-[9px] font-bold flex items-center gap-1 cursor-default hover:text-foreground hover:border-border transition-all h-[18px]">
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
            <div className="bg-background backdrop-blur-xl border border-border/40 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] p-1.5 flex flex-col gap-1 w-full min-w-[120px]">
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
  rowH: number;
  sel: number | null;
  activeOids: Set<string>;
  cw: any;
  graphColumnWidth: number;
  setSel: (r: number) => void;
  handleContextMenu: (e: React.MouseEvent, n: CommitNode) => void;
}

export const CommitRow = React.memo(({
  n, row, virtualRow, rowH, sel, activeOids, cw, graphColumnWidth, setSel, handleContextMenu
}: CommitRowProps) => {
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
      className="absolute left-0 w-full cursor-pointer group group/row"
      style={{ 
        height: rowH,
        transform: `translateY(${virtualRow.start}px)`,
        zIndex: sel === row ? 50 : 20
      }}
      onClick={() => {
        setSel(row);
        selectCommitDetail(n.oid);
      }}
      onContextMenu={(e) => handleContextMenu(e, n)}
    >
      {/* ══ Layer 1: Opaque backgrounds to hide graph lines ══ */}
      <div className="absolute inset-0 w-full h-full flex items-stretch z-[12] pointer-events-none">
        <div className="shrink-0" style={{ width: cw.label }} />
        <div className="shrink-0" style={{ width: 5 + graphColumnWidth + 5 }} />
        <div className="flex-1 bg-background" />
        <div className="shrink-0 bg-background" style={{ width: 5 + cw.hash }} />
        <div className="shrink-0 bg-background" style={{ width: 5 + cw.author }} />
      </div>

      {/* ══ Layer 2: Hover & Active Highlight ══ */}
      <div className={cn(
        "absolute inset-0 w-full h-full z-[15] pointer-events-none transition-colors duration-150 border-l-4",
        sel === row ? "bg-primary/10 border-primary" : "border-transparent group-hover/row:bg-white/[0.04]"
      )} />

      {/* ══ Layer 3: Content ══ */}
      <div className="absolute inset-0 w-full h-full flex items-center z-[20]">
        <div className="pl-2.5 overflow-visible shrink-0" style={{ width: cw.label }}>
          <BranchLabels refs={n.refs} colorIdx={n.color_idx} isActive={isActive} />
        </div>
        <div className="shrink-0" style={{ width: 5 + graphColumnWidth + 5 }} />
        <div className="flex-1 flex items-center pl-3 pr-2.5 min-w-0 h-full relative">
          {n.node_type === 'stash' ? (
            <div className="flex items-center gap-1.5 min-w-0">
               <span className="bg-dracula-orange/10 text-dracula-orange border border-dracula-orange/20 px-1.5 py-0 rounded-full text-[8px] font-bold uppercase tracking-tighter shrink-0 shadow-sm">STASH</span>
               <span className="truncate text-dracula-orange/80 text-[11px] italic font-medium transition-colors group-hover/row:text-dracula-orange">{n.message || 'Stashed changes'}</span>
            </div>
          ) : (
            <span className={cn(
              "truncate text-[12px] transition-colors duration-200",
              isActive ? "text-foreground" : "text-foreground/70 group-hover/row:text-foreground"
            )}>
              {n.message}
            </span>
          )}
        </div>
        <div 
          className="pl-3 flex items-center gap-1.5 group/hash relative h-full"
          style={{ width: 5 + cw.hash }}
          onClick={handleCopy}
        >
          <span className="font-mono text-[11px] text-muted-foreground/80 group-hover/row:text-foreground group-hover/hash:text-primary transition-colors">{n.short_oid}</span>
          <button className="opacity-0 group-hover/hash:opacity-100 p-0.5 hover:bg-primary/10 rounded-md transition-all duration-200">
            {copied ? <Check size={12} className="text-dracula-green" /> : <Copy size={12} className="text-muted-foreground/40" />}
          </button>
        </div>
        <div className="pl-3 flex items-center pr-2.5 h-full" style={{ width: 5 + cw.author }}>
           <span className="text-[11px] text-muted-foreground/80 truncate font-semibold group-hover/row:text-foreground transition-colors tracking-tight">{authorFirstName}</span>
        </div>
      </div>
    </div>
  );
});

// ── WipRow Component ─────────────────────────────────────────────────
export interface WipRowProps {
  virtualRow: any;
  rowH: number;
  sel: number | null;
  cw: any;
  graphColumnWidth: number;
  status: any;
  staged: any[];
  unstaged: any[];
  setSel: (r: number) => void;
}

export const WipRow = React.memo(({
  virtualRow, rowH, sel, cw, graphColumnWidth, status, staged, unstaged, setSel
}: WipRowProps) => {
  const stagedCount = status?.staged_count ?? staged.length;
  const unstagedCount = status?.unstaged_count ?? unstaged.length;

  return (
    <div
      key="WIP"
      className="absolute left-0 w-full cursor-pointer group group/wip"
      style={{ 
        height: rowH, 
        transform: `translateY(${virtualRow.start}px)`,
        zIndex: sel === 0 ? 50 : 20
      }}
      onClick={() => {
        setSel(0);
        useAppStore.setState({ selectedCommitDetail: null, isLoadingCommitDetail: false });
      }}
    >
      {/* ══ Layer 1: Opaque backgrounds to hide graph lines ══ */}
      <div className="absolute inset-0 w-full h-full flex items-stretch z-[12] pointer-events-none">
        <div className="shrink-0" style={{ width: cw.label }} />
        <div className="shrink-0" style={{ width: 5 + graphColumnWidth + 5 }} />
        <div className="flex-1 bg-background" />
        <div className="shrink-0 bg-background" style={{ width: 5 + cw.hash }} />
        <div className="shrink-0 bg-background" style={{ width: 5 + cw.author }} />
      </div>

      {/* ══ Layer 2: Hover & Active Highlight ══ */}
      <div className={cn(
        "absolute inset-0 w-full h-full z-[15] pointer-events-none transition-colors duration-150 border-l-4",
        sel === 0 ? "bg-primary/10 border-primary" : "border-transparent group-hover/wip:bg-white/[0.04]"
      )} />

      {/* ══ Layer 3: Content ══ */}
      <div className="absolute inset-0 w-full h-full flex items-center z-[20]">
        <div className="pl-2.5 flex items-center shrink-0" style={{ width: cw.label }}>
          <span className="bg-primary/10 text-primary border border-primary/20 px-1.5 py-0 rounded-full text-[10px] font-bold uppercase tracking-wider">WIP</span>
        </div>
        <div className="shrink-0" style={{ width: 5 + graphColumnWidth + 5 }} />
        <div className="flex-1 flex items-center pl-3 pr-2.5 min-w-0 h-full relative">
          <div className="h-[calc(100%-6px)] rounded-lg border border-primary/10 bg-primary/5 flex items-center px-2 gap-2 shadow-sm group/wip-pill hover:border-primary/20 transition-all">
            <HardDrive size={12} className="text-primary/60 group-hover/wip-pill:scale-110 transition-transform" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-dracula-green uppercase flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-dracula-green shadow-[0_0_8px_rgba(80,250,123,0.4)]" />
                {stagedCount} Staged
              </span>
              <div className="w-px h-3 bg-border/40" />
              <span className="text-[10px] font-bold text-dracula-orange uppercase flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-dracula-orange shadow-[0_0_8px_rgba(255,184,108,0.4)]" />
                {unstagedCount} Unstaged
              </span>
            </div>
          </div>
        </div>
        <div className="pl-3 flex items-center h-full" style={{ width: 5 + cw.hash }}>
          <Clock size={10} className="text-muted-foreground/20" />
        </div>
        <div className="pl-3 pr-2.5 flex items-center h-full" style={{ width: 5 + cw.author }}>
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 transition-colors group-hover/wip:text-foreground/80">Working Tree</span>
        </div>
      </div>
    </div>
  );
});
