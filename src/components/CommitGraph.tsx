import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, CommitNode } from '../store';
import { loadMoreCommits, loadRepo } from '../lib/repo';
import { useResizableColumns, ResizeHandle } from './ResizableColumns';
import { CommitRow, WipRow, SkeletonRow } from './CommitGraph/CommitRow';
import { CommitContextMenu, ContextMenuPosition } from './CommitContextMenu';
import { cn } from '../lib/utils';
import { AlertCircle, Search } from 'lucide-react';

// ── Constants ────────────────────────────────────────────────────────
// ── Constants ────────────────────────────────────────────────────────
const LANE_W = 28;
const NODE_R = 9;
const LANE_PAD = NODE_R + 14;
const DEF_LABEL_W = 160;
const DEF_HASH_W = 80;
const DEF_AUTHOR_W = 120;

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
const lx = (lane: number) => LANE_PAD + lane * LANE_W;
const ly = (row: number, rowH: number) => row * rowH + rowH / 2;

// ── Helpers ──────────────────────────────────────────────────────────
function md5(s: string) {
  let a = 0, b = 0, c = 0, d = 0;
  const k = [
    0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
    0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be, 0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
    0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
    0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
    0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c, 0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
    0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
    0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
    0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1, 0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391
  ];
  const r = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
  ];
  const h = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];
  const words: number[] = [];
  const str = unescape(encodeURIComponent(s));
  for (let i = 0; i < str.length; i++) words[i >> 2] |= str.charCodeAt(i) << ((i % 4) << 3);
  words[str.length >> 2] |= 0x80 << ((str.length % 4) << 3);
  words[(((str.length + 8) >> 6) << 4) + 14] = str.length << 3;
  for (let i = 0; i < words.length; i += 16) {
    let [A, B, C, D] = h;
    for (let j = 0; j < 64; j++) {
      let f, g;
      if (j < 16) { f = (B & C) | (~B & D); g = j; }
      else if (j < 32) { f = (D & B) | (~D & C); g = (5 * j + 1) % 16; }
      else if (j < 48) { f = B ^ C ^ D; g = (3 * j + 5) % 16; }
      else { f = C ^ (B | ~D); g = (7 * j) % 16; }
      const temp = D;
      D = C;
      C = B;
      B = (B + ((A + f + k[j] + (words[i + g] || 0)) << r[j] | (A + f + k[j] + (words[i + g] || 0)) >>> (32 - r[j]))) | 0;
      A = temp;
    }
    h[0] = (h[0] + A) | 0; h[1] = (h[1] + B) | 0; h[2] = (h[2] + C) | 0; h[3] = (h[3] + D) | 0;
  }
  return h.map(x => (x >>> 0).toString(16).padStart(8, '0').split('').reverse().join('').match(/../g)!.reverse().join('')).join('');
}

const getAvatarUrl = (email: string) => `https://www.gravatar.com/avatar/${md5(email.trim().toLowerCase())}?s=32&d=identicon`;

// ── Manhattan-routed edge paths ──────────────────────────────────────
type Edge = { path: string; colorIdx: number; childOid: string; isMerge: boolean; dashed?: boolean; r1: number; r2: number };

function roundedPath(x1: number, y1: number, x2: number, y2: number, type: 'merge' | 'branch-off', cornerRadius: number = 12) {
  const nodeRadius = NODE_R;
  
  // 1. Cùng một nhánh (Thẳng dọc)
  if (x1 === x2) {
    return `M ${x1} ${y1 + nodeRadius} L ${x2} ${y2 - nodeRadius}`;
  }

  // 2. Sang PHẢI (Parent ở bên phải Child) -> Ngang rồi Dọc
  if (x2 > x1) {
    const safeRadius = Math.min(cornerRadius, (x2 - x1) / 2, (y2 - y1) / 2);
    
    const p1x = x1 + nodeRadius; // Bắt đầu từ hông PHẢI node trên (Child)
    const p1y = y1;
    
    const p2x = x2 - safeRadius; // Đi ngang phải
    const p2y = y1;
    
    const cx  = x2;              // Điểm neo góc vuông
    const cy  = y1;
    
    const p3x = x2;              // Điểm kết thúc bo góc
    const p3y = y1 + safeRadius;
    
    const p4x = x2;
    const p4y = y2 - nodeRadius; // Đi thẳng xuống đỉnh node dưới (Parent)
    
    return `M ${p1x} ${p1y} L ${p2x} ${p2y} Q ${cx} ${cy} ${p3x} ${p3y} L ${p4x} ${p4y}`;
  }

  // 3. Sang TRÁI (Parent ở bên trái Child) -> Dọc rồi Ngang
  if (x2 < x1) {
    const safeRadius = Math.min(cornerRadius, (x1 - x2) / 2, (y2 - y1) / 2);
    
    const p1x = x1; 
    const p1y = y1 + nodeRadius;  // Bắt đầu từ ĐÁY node trên (Child)
    
    const p2x = x1;
    const p2y = y2 - safeRadius; // Đi thẳng xuống
    
    const cx  = x1;               // Điểm neo góc vuông
    const cy  = y2;
    
    const p3x = x1 - safeRadius;  // Điểm kết thúc bo góc
    const p3y = y2;
    
    const p4x = x2 + nodeRadius; // Đi ngang trái vào hông PHẢI node dưới (Parent)
    const p4y = y2;
    
    return `M ${p1x} ${p1y} L ${p2x} ${p2y} Q ${cx} ${cy} ${p3x} ${p3y} L ${p4x} ${p4y}`;
  }
}

function buildEdges(commits: CommitNode[], off: number, wip: boolean, minIdx: number, maxIdx: number, oidMap: Map<string, number>, rowH: number): Edge[] {
  const out: Edge[] = [];

  const firstCommitIdx = commits.findIndex(c => c.node_type === 'commit');
  if (wip && firstCommitIdx !== -1 && minIdx <= 0) {
    const target = commits[firstCommitIdx];
    const targetRow = firstCommitIdx + off;
    const x1 = lx(0), y1 = ly(0, rowH), x2 = lx(target.lane), y2 = ly(targetRow, rowH);
    out.push({ 
      path: roundedPath(x1, y1, x2, y2, 'branch-off'), 
      colorIdx: target.color_idx, 
      childOid: 'WIP', 
      isMerge: false, 
      dashed: true,
      r1: 0,
      r2: targetRow
    });
  }

  const start = Math.max(0, minIdx - 50);
  const end = Math.min(commits.length, maxIdx + 50);

  for (let i = start; i < end; i++) {
    const c = commits[i];
    if (c.node_type === 'stash') continue; 

    const row = i + off;
    c.parents.forEach((po, pi) => {
      const targetIdx = oidMap.get(po);
      const e = c.edges[pi];
      const ci = e?.color_idx ?? c.color_idx;
      const x1 = lx(c.lane), y1 = ly(row, rowH);
      const type = pi === 0 ? 'branch-off' : 'merge';

      if (targetIdx === undefined) {
        const tl = e?.to_lane ?? c.lane;
        const x2 = lx(tl), y2 = ly(row + 5, rowH);
        out.push({ 
          path: roundedPath(x1, y1, x2, y2, type), 
          colorIdx: ci, 
          childOid: c.oid, 
          isMerge: pi > 0,
          r1: row,
          r2: row + 5
        });
        return;
      }

      const pRow = targetIdx + off;
      if (Math.min(row, pRow) <= maxIdx && Math.max(row, pRow) >= minIdx) {
        const x2 = lx(commits[targetIdx].lane), y2 = ly(pRow, rowH);
        out.push({ 
          path: roundedPath(x1, y1, x2, y2, type), 
          colorIdx: ci, 
          childOid: c.oid, 
          isMerge: pi > 0,
          r1: Math.min(row, pRow),
          r2: Math.max(row, pRow)
        });
      }
    });
  }
  return out;
}

function buildStashEdges(commits: CommitNode[], off: number, minIdx: number, maxIdx: number, oidMap: Map<string, number>, rowH: number): Edge[] {
  const out: Edge[] = [];

  const start = Math.max(0, minIdx - 20);
  const end = Math.min(commits.length, maxIdx + 20);

  for (let i = start; i < end; i++) {
    const c = commits[i];
    if (c.node_type !== 'stash' || !c.base_oid) continue;
    
    const baseIdx = oidMap.get(c.base_oid);
    if (baseIdx === undefined) continue;

    const row = i + off;
    const pRow = baseIdx + off;
    
    if (Math.min(row, pRow) <= maxIdx && Math.max(row, pRow) >= minIdx) {
      const x1 = lx(commits[baseIdx].lane); 
      const y1 = ly(pRow, rowH);                 
      const x2 = lx(c.lane);               
      const y2 = ly(row, rowH);                  
      const path = roundedPath(x1, y1, x2, y2, 'merge');
      out.push({ 
        path, 
        colorIdx: c.color_idx, 
        childOid: c.oid, 
        isMerge: false, 
        dashed: true,
        r1: Math.min(row, pRow),
        r2: Math.max(row, pRow)
      });
    }
  }
  return out;
}

// ── Main Component ───────────────────────────────────────────────────
export function CommitGraph() {
  const commitLog = useAppStore(s => s.commitLog);
  const staged = useAppStore(s => s.stagedFiles);
  const unstaged = useAppStore(s => s.unstagedFiles);
  const status = useAppStore(s => s.repoStatus);
  const isLoadingMore = useAppStore(s => s.isLoadingMore);
  const hasMoreCommits = useAppStore(s => s.hasMoreCommits);
  const commitSearchInput = useAppStore(s => s.commitSearchInput);
  const layoutDensity = useAppStore(s => s.layoutDensity);
  const rowH = layoutDensity === 'compact' ? 29 : 37;

  const [debouncedSearch, setDebouncedSearch] = useState(commitSearchInput);
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(commitSearchInput), 150);
    return () => clearTimeout(timer);
  }, [commitSearchInput]);

  const filteredCommits = useMemo(() => {
    if (!commitLog) return [];
    if (!debouncedSearch.trim()) return commitLog;
    const q = debouncedSearch.toLowerCase();
    return commitLog.filter((c: CommitNode) => 
      c.message.toLowerCase().includes(q) || 
      c.short_oid.toLowerCase().includes(q) || 
      c.author.toLowerCase().includes(q)
    );
  }, [commitLog, debouncedSearch]);

  const showSearchWarning = debouncedSearch.trim() !== "" && commitLog.length > 5000;

  const hasWip = (status?.staged_count ?? 0) > 0 || (status?.unstaged_count ?? 0) > 0 || staged.length > 0 || unstaged.length > 0;
  const off = hasWip ? 1 : 0;
  const totalRows = (filteredCommits?.length || 0) + off + (isLoadingMore ? 5 : 0);

  const maxLane = useMemo(() => {
    if (!filteredCommits?.length) return 0;
    return filteredCommits.reduce((m: number, c: CommitNode) => Math.max(m, c.lane, ...c.edges.map((e: any) => e.to_lane)), 0);
  }, [filteredCommits]);

  const gw = LANE_PAD * 2 + maxLane * LANE_W;
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: totalRows,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowH,
    overscan: 30,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const minVis = virtualItems[0]?.index ?? 0;
  const maxVis = virtualItems[virtualItems.length - 1]?.index ?? 0;

  const oidMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!filteredCommits) return map;
    for (let i = 0; i < filteredCommits.length; i++) {
      map.set(filteredCommits[i].oid, i);
    }
    return map;
  }, [filteredCommits]);

  const edges = useMemo(() => {
    if (!filteredCommits) return [];
    return buildEdges(filteredCommits, off, hasWip, minVis, maxVis, oidMap, rowH);
  }, [filteredCommits, off, hasWip, minVis, maxVis, oidMap, rowH]);

  const stashEdges = useMemo(() => {
    if (!filteredCommits) return [];
    return buildStashEdges(filteredCommits, off, minVis, maxVis, oidMap, rowH);
  }, [filteredCommits, off, minVis, maxVis, oidMap, rowH]);

  const activeOids = useMemo(() => {
    const set = new Set<string>();
    if (!filteredCommits || filteredCommits.length === 0) return set;
    if (hasWip) set.add('WIP');
    
    // Find HEAD
    let currentOid = filteredCommits.find(c => c.refs.some(r => r === 'HEAD' || r.includes('HEAD')) )?.oid;
    if (!currentOid && filteredCommits.length > 0) currentOid = filteredCommits[0].oid;

    while (currentOid) {
      set.add(currentOid);
      const idx = oidMap.get(currentOid);
      if (idx === undefined) break;
      const node = filteredCommits[idx];
      currentOid = node?.parents?.[0];
    }
    return set;
  }, [filteredCommits, hasWip, oidMap]);


  const sel = useAppStore(s => s.selectedRowIndex);
  const setSel = (index: number | null) => useAppStore.setState({ selectedRowIndex: index });
  
  const { widths: cw, onMouseDown } = useResizableColumns(
    { label: DEF_LABEL_W, hash: DEF_HASH_W, author: DEF_AUTHOR_W },
    { label: 100, hash: 60, author: 80 },
  );

  const graphColumnWidth = useAppStore(s => s.graphColumnWidth);
  const setGraphColumnWidth = useAppStore(s => s.setGraphColumnWidth);

  const onGraphResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = graphColumnWidth;
    let ticking = false;

    const onMove = (ev: MouseEvent) => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const newWidth = Math.max(100, Math.min(startW + (ev.clientX - startX), 1000));
          setGraphColumnWidth(newWidth);
          ticking = false;
        });
        ticking = true;
      }
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [graphColumnWidth, setGraphColumnWidth]);

  const [ctxMenu, setCtxMenu] = useState<{ commit: CommitNode; pos: ContextMenuPosition } | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent, commit: CommitNode) => {
    e.preventDefault();
    setCtxMenu({ commit, pos: { x: e.clientX, y: e.clientY } });
  }, []);

  const closeContextMenu = useCallback(() => setCtxMenu(null), []);
  
  useEffect(() => {
    const lastItem = virtualItems[virtualItems.length - 1];
    if (!lastItem) return;
    if (hasMoreCommits && !isLoadingMore && lastItem.index >= totalRows - 12) {
      loadMoreCommits();
    }
  }, [virtualItems, totalRows, hasMoreCommits, isLoadingMore]);

  return (
    <motion.main 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col bg-background h-full overflow-hidden text-sm selection:bg-primary/20"
    >
      {/* Branch Filter Toolbar */}
      <div className="h-8 flex items-center px-3 gap-1.5 border-b border-border/40 bg-background/50 backdrop-blur-sm shrink-0">
        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50 mr-1.5">Display:</span>
        {(['all', 'local', 'remote', 'active'] as const).map(f => (
          <button
            key={f}
            onClick={() => {
              useAppStore.getState().setBranchFilter(f);
              const path = useAppStore.getState().activeRepoPath;
              if (path) loadRepo(path);
            }}
            className={cn(
              "px-1.5 py-0.5 rounded-md text-[10px] font-medium transition-all",
              useAppStore.getState().branchFilter === f
                ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_2px_10px_rgba(var(--primary),0.1)]"
                : "text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/50 border border-transparent"
            )}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="h-[var(--toolbar-height)] flex items-center border-b border-border/40 bg-background/95 backdrop-blur-md sticky top-0 z-30 min-w-max shadow-sm border-l-4 border-transparent">
        <div className="pl-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 shrink-0" style={{ width: cw.label }}>
          Branches / Tags
        </div>
        <ResizeHandle onMouseDown={onMouseDown('label')} />
        <div className="pl-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 shrink-0" style={{ width: graphColumnWidth }}>
          Graph
        </div>
        <ResizeHandle onMouseDown={onGraphResize} />
        <div className="flex-1 pl-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 min-w-[200px]">
          Commit Message
        </div>
        <ResizeHandle onMouseDown={onMouseDown('hash')} />
        <div className="pl-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 shrink-0" style={{ width: cw.hash }}>
          Hash
        </div>
        <ResizeHandle onMouseDown={onMouseDown('author')} />
        <div className="pl-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 pr-3 shrink-0" style={{ width: cw.author }}>
          Author
        </div>
      </div>

      {/* Scroll Container */}
      <div 
        ref={parentRef}
        className="flex-1 overflow-auto custom-scrollbar relative bg-background/30"
      >
        <AnimatePresence>
          {showSearchWarning && (
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="sticky top-4 right-8 float-right z-[100] px-4 py-2 bg-dracula-orange/10 border border-dracula-orange/20 rounded-2xl backdrop-blur-2xl flex items-center gap-3 shadow-[0_10px_40px_rgba(0,0,0,0.2)] pointer-events-none"
            >
              <div className="p-1.5 bg-dracula-orange/20 rounded-lg">
                <AlertCircle size={14} className="text-dracula-orange" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-dracula-orange/90 leading-tight">
                  SEARCHING {commitLog.length.toLocaleString()} COMMITS
                </span>
                <span className="text-[9px] font-medium text-dracula-orange/60">Performance may be impacted</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div 
          className="relative min-w-max" 
          style={{ height: `${virtualizer.getTotalSize()}px` }}
        >


          {/* ═══ SVG Graph Layer ═══ */}
          <svg 
            className="absolute pointer-events-none z-[10]"
            style={{ left: cw.label, top: 0 }} 
            width={gw} 
            height={virtualizer.getTotalSize()}
          >
            <defs>
              <clipPath id="avatar-clip">
                <circle cx="0" cy="0" r={NODE_R} />
              </clipPath>
            </defs>
            {/* Stash connections */}
            {stashEdges
              .filter(e => e.r1 <= maxVis && e.r2 >= minVis)
              .map((e, i) => (
                <path key={`se-${i}`} d={e.path} fill="none"
                  stroke={color(e.colorIdx)} strokeWidth={2} opacity={0.4}
                  strokeDasharray="4 4" strokeLinecap="round" strokeLinejoin="round" />
              ))}

            {/* Commit connections */}
            {edges
              .filter(e => e.r1 <= maxVis && e.r2 >= minVis)
              .map((e: Edge, i: number) => (
                <path key={`e-${i}`} d={e.path} fill="none"
                  stroke={color(e.colorIdx)} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                  strokeDasharray={e.dashed ? '6 4' : 'none'} opacity={0.8} />
              ))}

            {/* WIP node */}
            {hasWip && (
              <g transform={`translate(${lx(0)}, ${ly(0, rowH)})`}>
                <circle r={NODE_R} fill="#191a21" stroke="#bd93f9" strokeWidth={2} strokeDasharray="3 2" className="animate-pulse" />
                <text textAnchor="middle" dominantBaseline="central" fill="#bd93f9" fontSize={10} fontWeight={900}>W</text>
              </g>
            )}

            {/* Commit nodes */}
            {virtualItems.map((virtualRow) => {
              const row = virtualRow.index;
              const n = row === 0 && hasWip ? null : filteredCommits[row - off];
              if (!n) return null;

              const cx = lx(n.lane), cy = ly(row, rowH);
              const c = color(n.color_idx);
              const r = NODE_R;
              const isMerge = (n.parents?.length ?? 0) > 1;

              if (n.node_type === 'stash') {
                return (
                  <g key={n.oid} transform={`translate(${cx}, ${cy})`}>
                    <rect x={-NODE_R} y={-NODE_R} width={NODE_R * 2} height={NODE_R * 2} rx={5}
                      fill="#21222c" stroke={c} strokeWidth={2} strokeDasharray="3 2" />
                    <text textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize={9} fontWeight={900}>S</text>
                  </g>
                );
              }

              const isActive = activeOids.has(n.oid);
              const authorChar = (n.author?.[0] ?? '?').toUpperCase();

              const avatarUrl = getAvatarUrl(n.author_email || '');
              const clipId = "avatar-clip";

              return (
                <g key={n.oid} transform={`translate(${cx}, ${cy})`}>
                  {/* Fallback circle with initial */}
                  <circle 
                    r={r} 
                    fill={isActive ? c : "#21222c"} 
                    stroke={c} 
                    strokeWidth={isActive ? 3 : 2} 
                    className={cn(isActive && "shadow-[0_0_12px_rgba(255,255,255,0.2)]")} 
                  />
                  <text 
                    textAnchor="middle" 
                    dominantBaseline="central" 
                    fill={isActive ? "#191a21" : c} 
                    fontSize={11} 
                    fontWeight={900} 
                    opacity={isActive ? 1 : 0.8}
                  >
                    {authorChar}
                  </text>
                  
                  {/* Real Avatar with ClipPath */}
                  <image
                    href={avatarUrl}
                    x={-r}
                    y={-r}
                    width={r * 2}
                    height={r * 2}
                    clipPath={`url(#${clipId})`}
                    preserveAspectRatio="xMidYMid slice"
                    opacity={1}
                  />
                  
                  {/* Interactive stroke overlay (on top of image) */}
                  <circle 
                    r={r} 
                    fill="none" 
                    stroke={c} 
                    strokeWidth={isActive ? 2 : 1.5} 
                    opacity={0.8}
                  />
                </g>
              );
            })}
          </svg>

          {/* ═══ HTML Rows ═══ */}
          {virtualItems.map((virtualRow) => {
            const row = virtualRow.index;
            const isWip = row === 0 && hasWip;
            const n = isWip ? null : filteredCommits[row - off];

            if (isWip) {
              return (
                <WipRow 
                  key="WIP"
                  virtualRow={virtualRow}
                  rowH={rowH}
                  sel={sel}
                  cw={cw}
                  graphColumnWidth={graphColumnWidth}
                  status={status}
                  staged={staged}
                  unstaged={unstaged}

                  setSel={setSel}
                />
              );
            }

            if (!n) {
              return <SkeletonRow key={`skeleton-${row}`} virtualRow={virtualRow} rowH={rowH} cw={cw} graphColumnWidth={graphColumnWidth} />;
            }

            return (
              <CommitRow 
                key={n.oid}
                n={n}
                row={row}
                virtualRow={virtualRow}
                rowH={rowH}
                sel={sel}
                activeOids={activeOids}
                cw={cw}
                graphColumnWidth={graphColumnWidth}

                setSel={setSel}
                handleContextMenu={handleContextMenu}
              />
            );
          })}

          {(!filteredCommits?.length && !isLoadingMore) && (
            <div className="flex flex-col items-center justify-center p-20 gap-4 opacity-40">
              <Search size={40} className="text-muted-foreground/20" />
              <span className="text-[14px] font-bold uppercase tracking-widest text-muted-foreground/60">No commits matched</span>
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {ctxMenu && (
          <CommitContextMenu
            commit={ctxMenu.commit}
            position={ctxMenu.pos}
            onClose={closeContextMenu}
          />
        )}
      </AnimatePresence>
    </motion.main>
  );
}
