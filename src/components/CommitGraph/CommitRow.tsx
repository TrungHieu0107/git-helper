import React, { useState, useMemo } from 'react';
import { Copy, Check, Monitor, Cloud, ChevronDown, RotateCcw } from 'lucide-react';
import { CommitNode, useAppStore } from '../../store';
import { selectCommitDetail, safeSwitchBranch } from '../../lib/repo';

// ── Constants ────────────────────────────────────────────────────────
const ROW_H = 30;

const COLORS = [
  '#00d4ff', '#a855f7', '#ef4444', '#f97316', 
  '#ec4899', '#22c55e', '#eab308', '#6b7280'
];
const color = (i: number) => COLORS[i % COLORS.length];

const hue = (s: string) => { 
  let h = 0; 
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h); 
  return Math.abs(h) % 360; 
};

// ── BranchLabels Component ───────────────────────────────────────────
function BranchLabels({ refs, colorIdx, isActive }: { refs: string[], colorIdx: number, isActive: boolean }) {
  const [open, setOpen] = useState(false);
  const activeBranch = useAppStore(s => s.activeBranch);
  
  const branchGroups: [string, any][] = useMemo(() => {
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

  const renderBadge = ([name, info]: [string, any], isDropdown = false) => {
    const isRemoteOnly = info.isRemote && !info.isLocal;
    const isHead = info.isHead;
    const isTag = info.isTag;
    const isActiveBranch = name === activeBranch && !isRemoteOnly && !isTag;
    const clr = color(colorIdx);
    
    let baseClass = "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap truncate cursor-pointer select-none border transition-all shadow-sm";
    let bg = "";
    let style = {};

    if (isHead || isActiveBranch) {
      bg = "bg-[#0b213f] text-[#388bfd] border-[#388bfd]/30 hover:border-[#388bfd]/60 shadow-[0_0_8px_rgba(56,139,253,0.15)] ring-1 ring-[#388bfd]/20";
    } else if (isTag) {
      bg = "bg-[#251e0b] text-[#e3b341] border-[#e3b341]/30 hover:border-[#e3b341]/60";
    } else if (isRemoteOnly) {
      bg = "bg-[#21162e] text-[#a855f7] border-[#a855f7]/30 hover:border-[#a855f7]/60";
    } else {
      bg = "bg-[#1f2937]/50 border-white/10 hover:border-white/30 text-[#e6edf3]";
      style = { borderColor: clr + '40', color: clr };
    }

    const handleBranchClick = async (e: React.MouseEvent, fullRef: string) => {
      e.stopPropagation();
      if (isHead || isTag) return;
      if (isDropdown) setOpen(false);
      await safeSwitchBranch(fullRef);
    };

    return (
      <span key={name} 
        onClick={(e) => handleBranchClick(e, (info.isRemote && !info.isLocal) ? `origin/${name}` : name)}
        className={`${baseClass} ${bg} ${isDropdown ? 'max-w-none' : 'max-w-[130px]'}`}
        style={style}>
        {isHead ? name : (
          <>
            <span className="truncate">{name}</span>
            <div className="flex items-center gap-1 opacity-70 shrink-0">
              {info.isLocal && <Monitor size={10} />}
              {info.isRemote && <Cloud size={10} />}
            </div>
          </>
        )}
      </span>
    );
  };

  return (
    <div className={`relative flex items-center gap-1 transition-opacity duration-300 ${!isActive ? 'opacity-50 hover:opacity-100' : ''}`}
      onMouseEnter={() => others.length > 0 && setOpen(true)}
      onMouseLeave={() => setOpen(false)}>
      
      {renderBadge(primary)}

      {others.length > 0 && (
        <div className="bg-[#1c2128] text-[#6e7681] border border-[#30363d] px-1.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-0.5 cursor-default hover:text-[#e6edf3] hover:border-[#6e7681] transition-all h-[18px]">
          +{others.length}
          <ChevronDown size={10} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </div>
      )}

      {open && (
        <div className="absolute top-full left-0 mt-1 min-w-[200px] bg-[#1c2128] border border-[#30363d] rounded-lg shadow-2xl z-[50] p-1 flex flex-col gap-1 animate-in fade-in slide-in-from-top-1 duration-150">
           {others.map(entry => renderBadge(entry, true))}
        </div>
      )}
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
  const isActiveNode = activeOids.has(n.oid);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(n.oid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const authorFirstName = n.author.split(' ')[0];
  const authorInitial = n.author[0].toUpperCase();
  const authorHue = hue(n.author);

  return (
    <div 
      key={n.oid}
      className={`absolute left-0 w-full flex items-center cursor-pointer transition-all duration-150 group/row
        ${hov === row ? 'bg-[#1f2937]' : ''} ${sel === row ? 'bg-[#1d2d3e] border-l-2 border-[#388bfd]' : 'border-l-2 border-transparent'}`}
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
      <div className="pl-2 overflow-visible shrink-0" style={{ width: cw.label }}>
        <BranchLabels refs={n.refs} colorIdx={n.color_idx} isActive={isActiveNode} />
      </div>
      <div style={{ width: gw + 5 }} />
      <div className="flex-1 flex items-center pl-4 pr-4 min-w-0">
        {n.node_type === 'stash' ? (
          <div className="flex items-center gap-2">
             <span className="bg-[#251e0b] text-[#e3b341] border border-[#e3b341]/30 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 shadow-sm">STASH</span>
             <span className="truncate text-[#e3b341] text-[12px] italic opacity-90">{n.message}</span>
          </div>
        ) : (
          <span className="truncate text-[#e6edf3] text-[12px] font-medium">{n.message}</span>
        )}
      </div>
      <div 
        className="pl-4 flex items-center gap-2 group/hash relative" 
        style={{ width: cw.hash }}
        onClick={handleCopy}
      >
        <span className="hash-mono-text hover:text-[#388bfd] transition-colors">{n.short_oid}</span>
        <button className="opacity-0 group-hover/hash:opacity-100 p-1 hover:bg-white/10 rounded transition-all">
          {copied ? <Check size={12} className="text-[#3fb950]" /> : <Copy size={12} className="text-[#6e7681]" />}
        </button>
      </div>
      <div className="pl-4 flex items-center pr-4" style={{ width: cw.author }}>
         <span className="text-[12px] text-[#8b949e] truncate font-medium group-hover/row:text-[#e6edf3] transition-colors">{authorFirstName}</span>
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
  return (
    <div
      key="WIP"
      className={`absolute left-0 w-full flex items-center cursor-pointer transition-colors
        ${hov === 0 ? 'bg-[#1e293b]/40' : ''} ${sel === 0 ? 'bg-[#3b82f6]/10' : ''}`}
      style={{ 
        height: ROW_H,
        transform: `translateY(${virtualRow.start}px)`
      }}
      onClick={() => {
        setSel(0);
        useAppStore.setState({ selectedCommitDetail: null, isLoadingCommitDetail: false });
      }}
      onMouseEnter={() => setHov(0)} 
      onMouseLeave={() => setHov(null)}
    >
      <div className="pl-3 flex items-center" style={{ width: cw.label }}>
        <span className="bg-cyan-900/40 text-cyan-300 border border-cyan-700/50 px-1.5 py-0.5 rounded text-[10px] font-medium">WIP</span>
      </div>
      <div style={{ width: gw + 5 }} />
      <div className="flex-1 flex items-center pl-3 pr-4 min-w-0">
        <div className="h-6 rounded border border-[#245d84]/60 bg-[#0b2942]/65 flex items-center px-2 gap-3">
          <span className="text-[11px] font-mono text-[#79c0ff]">// WIP</span>
          <span className="text-[10px] text-[#3fb950]">+{status?.staged_count ?? staged.length} staged</span>
          <span className="text-[10px] text-[#f2cc60]">+{status?.unstaged_count ?? unstaged.length} unstaged</span>
        </div>
      </div>
      <div className="pl-3 font-mono text-[12px] text-[#8b949e]/60" style={{ width: cw.hash }}>—</div>
      <div className="pl-3 text-[12px] text-[#8b949e]/60 truncate" style={{ width: cw.author }}>Working Tree</div>
    </div>
  );
}
