import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, CommitNode } from '../store';
import { loadMoreCommits } from '../lib/repo';
import { useResizableColumns, ResizeHandle } from './ResizableColumns';
import { CommitRow, WipRow, SkeletonRow } from './CommitGraph/CommitRow';
import { CommitContextMenu, ContextMenuPosition } from './CommitContextMenu';
import { cn } from '../lib/utils';
import { AlertCircle, Search } from 'lucide-react';

// ── Constants ────────────────────────────────────────────────────────
const ROW_H = 32;
const LANE_W = 20;
const NODE_R = 9;
const MERGE_DOT_R = 4;
const LANE_PAD = NODE_R + 10;
const DEF_LABEL_W = 160;
const DEF_HASH_W = 80;
const DEF_AUTHOR_W = 120;

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
const lx = (lane: number) => LANE_PAD + lane * LANE_W;
const ly = (row: number) => row * ROW_H + ROW_H / 2;

// ── Manhattan-routed edge paths ──────────────────────────────────────
type Edge = { path: string; colorIdx: number; childOid: string; isMerge: boolean; dashed?: boolean; r1: number; r2: number };

function roundedPath(x1: number, y1: number, x2: number, y2: number, type: 'merge' | 'branch-off', r: number = 8) {
  if (x1 === x2) return `M ${x1} ${y1} L ${x2} ${y2}`;
  if (y1 === y2) return `M ${x1} ${y1} L ${x2} ${y2}`;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const rad = Math.min(r, Math.abs(dx), Math.abs(dy));
  const dirX = Math.sign(dx);
  const dirY = Math.sign(dy);

  if (type === 'merge') {
    const arcStartX = x2 - dirX * rad;
    const arcStartY = y1;
    const arcEndX = x2;
    const arcEndY = y1 + dirY * rad;
    const sweep = (dirX * dirY > 0) ? 1 : 0;
    return `M ${x1} ${y1} L ${arcStartX} ${arcStartY} A ${rad} ${rad} 0 0 ${sweep} ${arcEndX} ${arcEndY} L ${x2} ${y2}`;
  } else {
    const arcStartX = x1;
    const arcStartY = y2 - dirY * rad;
    const arcEndX = x1 + dirX * rad;
    const arcEndY = y2;
    const sweep = (dirX * dirY > 0) ? 0 : 1;
    return `M ${x1} ${y1} L ${arcStartX} ${arcStartY} A ${rad} ${rad} 0 0 ${sweep} ${arcEndX} ${arcEndY} L ${x2} ${y2}`;
  }
}

function buildEdges(commits: CommitNode[], off: number, wip: boolean, minIdx: number, maxIdx: number): Edge[] {
  const out: Edge[] = [];
  const oidMap = new Map<string, number>();
  commits.forEach((c, i) => oidMap.set(c.oid, i));

  const firstCommitIdx = commits.findIndex(c => c.node_type === 'commit');
  if (wip && firstCommitIdx !== -1 && minIdx <= 0) {
    const target = commits[firstCommitIdx];
    const targetRow = firstCommitIdx + off;
    const x1 = lx(0), y1 = ly(0), x2 = lx(target.lane), y2 = ly(targetRow);
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
      const x1 = lx(c.lane), y1 = ly(row);
      const type = pi === 0 ? 'branch-off' : 'merge';

      if (targetIdx === undefined) {
        const tl = e?.to_lane ?? c.lane;
        const x2 = lx(tl), y2 = ly(row + 5);
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
        const x2 = lx(commits[targetIdx].lane), y2 = ly(pRow);
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

function buildStashEdges(commits: CommitNode[], off: number, minIdx: number, maxIdx: number): Edge[] {
  const out: Edge[] = [];
  const oidMap = new Map<string, number>();
  commits.forEach((c, i) => oidMap.set(c.oid, i));

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
      const y1 = ly(pRow);                 
      const x2 = lx(c.lane);               
      const y2 = ly(row);                  
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
    estimateSize: () => ROW_H,
    overscan: 25,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const minVis = virtualItems[0]?.index ?? 0;
  const maxVis = virtualItems[virtualItems.length - 1]?.index ?? 0;

  const edges = useMemo(() => filteredCommits ? buildEdges(filteredCommits, off, hasWip, minVis, maxVis) : [], [filteredCommits, off, hasWip, minVis, maxVis]);
  const stashEdges = useMemo(() => filteredCommits ? buildStashEdges(filteredCommits, off, minVis, maxVis) : [], [filteredCommits, off, hasWip, minVis, maxVis]);

  const activeOids = useMemo(() => {
    const set = new Set<string>();
    if (!filteredCommits || filteredCommits.length === 0) return set;
    if (hasWip) set.add('WIP');
    const map = new Map<string, CommitNode>();
    filteredCommits.forEach((c: CommitNode) => map.set(c.oid, c));
    let current: string | undefined = filteredCommits.find((c: CommitNode) => c.refs.includes('HEAD'))?.oid || filteredCommits[0].oid;
    while (current) {
      set.add(current);
      current = map.get(current)?.parents?.[0];
    }
    return set;
  }, [filteredCommits, hasWip]);

  const [hov, setHov] = useState<number | null>(null);
  const sel = useAppStore(s => s.selectedRowIndex);
  const setSel = (index: number | null) => useAppStore.setState({ selectedRowIndex: index });
  
  const { widths: cw, onMouseDown } = useResizableColumns(
    { label: DEF_LABEL_W, hash: DEF_HASH_W, author: DEF_AUTHOR_W },
    { label: 100, hash: 60, author: 80 },
  );

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
      {/* Header */}
      <div className="h-9 flex items-center border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-30 min-w-max shadow-sm px-1">
        <div className="pl-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60" style={{ width: cw.label }}>
          Branches / Tags
        </div>
        <ResizeHandle onMouseDown={onMouseDown('label')} />
        <div className="pl-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60" style={{ width: gw }}>
          Graph
        </div>
        <div className="flex-1 pl-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
          Commit Message
        </div>
        <ResizeHandle onMouseDown={onMouseDown('hash')} />
        <div className="pl-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60" style={{ width: cw.hash }}>
          Hash
        </div>
        <ResizeHandle onMouseDown={onMouseDown('author')} />
        <div className="pl-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 pr-4" style={{ width: cw.author }}>
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
                <span className="text-[11px] font-black text-dracula-orange/90 leading-tight">
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
          {/* ═══ Background Highlight Layer ═══ */}
          {virtualItems.map((virtualRow) => {
            const row = virtualRow.index;
            const isSel = sel === row;
            const isHov = hov === row;
            if (!isSel && !isHov) return null;

            return (
              <div 
                key={`bg-${row}`}
                className={cn(
                  "absolute left-0 w-full pointer-events-none transition-all duration-200 z-[5]",
                  isSel ? "bg-primary/10 border-y border-primary/10" : "bg-secondary/40"
                )}
                style={{ height: ROW_H, transform: `translateY(${virtualRow.start}px)` }}
              />
            );
          })}

          {/* ═══ SVG Graph Layer ═══ */}
          <svg 
            className="absolute pointer-events-none z-[10]"
            style={{ left: cw.label, top: 0 }} 
            width={gw} 
            height={virtualizer.getTotalSize()}
          >
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
              <g transform={`translate(${lx(0)}, ${ly(0)})`}>
                <circle r={NODE_R} fill="#191a21" stroke="#bd93f9" strokeWidth={2} strokeDasharray="3 2" className="animate-pulse" />
                <text textAnchor="middle" dominantBaseline="central" fill="#bd93f9" fontSize={10} fontWeight={900}>W</text>
              </g>
            )}

            {/* Commit nodes */}
            {virtualItems.map((virtualRow) => {
              const row = virtualRow.index;
              const n = row === 0 && hasWip ? null : filteredCommits[row - off];
              if (!n) return null;

              const cx = lx(n.lane), cy = ly(row);
              const c = color(n.color_idx);
              const isMerge = (n.parents?.length ?? 0) > 1;
              const r = isMerge ? MERGE_DOT_R : NODE_R;

              if (n.node_type === 'stash') {
                return (
                  <g key={n.oid} transform={`translate(${cx}, ${cy})`}>
                    <rect x={-NODE_R} y={-NODE_R} width={NODE_R * 2} height={NODE_R * 2} rx={5}
                      fill="#21222c" stroke={c} strokeWidth={2} strokeDasharray="3 2" />
                    <text textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize={9} fontWeight={900}>S</text>
                  </g>
                );
              }

              if (isMerge) {
                return <circle key={n.oid} cx={cx} cy={cy} r={r} fill={c} className="shadow-lg" />;
              }

              const isActive = activeOids.has(n.oid);
              return (
                <g key={n.oid} transform={`translate(${cx}, ${cy})`}>
                  <circle r={r} fill={isActive ? c : "#21222c"} stroke={c} strokeWidth={isActive ? 3 : 2} className={cn(isActive && "shadow-[0_0_12px_rgba(255,255,255,0.2)]")} />
                  {!isActive && (
                    <text textAnchor="middle" dominantBaseline="central" fill={c} fontSize={10} fontWeight={900} opacity={0.9}>
                      {(n.author?.[0] ?? '?').toUpperCase()}
                    </text>
                  )}
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
                  hov={hov}
                  sel={sel}
                  cw={cw}
                  gw={gw}
                  status={status}
                  staged={staged}
                  unstaged={unstaged}
                  setHov={setHov}
                  setSel={setSel}
                />
              );
            }

            if (!n) {
              return <SkeletonRow key={`skeleton-${row}`} virtualRow={virtualRow} cw={cw} gw={gw} />;
            }

            return (
              <CommitRow 
                key={n.oid}
                n={n}
                row={row}
                virtualRow={virtualRow}
                hov={hov}
                sel={sel}
                activeOids={activeOids}
                cw={cw}
                gw={gw}
                setHov={setHov}
                setSel={setSel}
                handleContextMenu={handleContextMenu}
              />
            );
          })}

          {(!filteredCommits?.length && !isLoadingMore) && (
            <div className="flex flex-col items-center justify-center p-20 gap-4 opacity-40">
              <Search size={40} className="text-muted-foreground/20" />
              <span className="text-[14px] font-black uppercase tracking-widest text-muted-foreground/60">No commits matched</span>
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
