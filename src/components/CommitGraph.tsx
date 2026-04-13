import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAppStore, CommitNode } from '../store';
import { loadMoreCommits } from '../lib/repo';
import { useResizableColumns, ResizeHandle } from './ResizableColumns';
import { CommitRow, WipRow } from './CommitGraph/CommitRow';
import { CommitContextMenu, ContextMenuPosition } from './CommitContextMenu';

// ── Constants ────────────────────────────────────────────────────────
const ROW_H = 30;
const LANE_W = 18;
const NODE_R = 10;
const MERGE_DOT_R = 4;
const LANE_PAD = NODE_R + 8;
const DEF_LABEL_W = 150;
const DEF_HASH_W = 72;
const DEF_AUTHOR_W = 110;

const COLORS = [
  '#00d4ff', // cyan  — lane 0 (main/HEAD)
  '#a855f7', // purple
  '#ef4444', // red
  '#f97316', // orange
  '#ec4899', // pink
  '#22c55e', // green
  '#eab308', // yellow
  '#6b7280', // gray
];

const color = (i: number) => COLORS[i % COLORS.length];
const lx = (lane: number) => LANE_PAD + lane * LANE_W;
const ly = (row: number) => row * ROW_H + ROW_H / 2;
const hue = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h); return Math.abs(h) % 360; };

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
    // Horizontal first, then Vertical down
    const arcStartX = x2 - dirX * rad;
    const arcStartY = y1;
    const arcEndX = x2;
    const arcEndY = y1 + dirY * rad;
    const sweep = (dirX * dirY > 0) ? 1 : 0;
    return `M ${x1} ${y1} L ${arcStartX} ${arcStartY} A ${rad} ${rad} 0 0 ${sweep} ${arcEndX} ${arcEndY} L ${x2} ${y2}`;
  } else {
    // Vertical down first, then Horizontal
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
  
  // Use a map for O(1) row lookups instead of findIndex (O(N))
  const oidMap = new Map<string, number>();
  commits.forEach((c, i) => oidMap.set(c.oid, i));

  // WIP → first commit (skipping stashes)
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

  // Only process commits that could have visible edges
  // We buffer the range significantly to ensure long merge lines are captured
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
        // Parent not in current batch/view
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
      // Only add edge if it's within or entering the visible range
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

  const hasWip = (status?.staged_count ?? 0) > 0 || (status?.unstaged_count ?? 0) > 0 || staged.length > 0 || unstaged.length > 0;
  const off = hasWip ? 1 : 0;
  const totalRows = (filteredCommits?.length || 0) + off;

  const maxLane = useMemo(() => {
    if (!filteredCommits?.length) return 0;
    return filteredCommits.reduce((m: number, c: CommitNode) => Math.max(m, c.lane, ...c.edges.map((e: any) => e.to_lane)), 0);
  }, [filteredCommits]);

  const gw = LANE_PAD * 2 + maxLane * LANE_W;

  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: totalRows,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 30,
    overscan: 20,
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
      current = map.get(current)?.parents?.[0]; // follow main lineage
    }
    return set;
  }, [filteredCommits, hasWip]);

  const [hov, setHov] = useState<number | null>(null);
  const sel = useAppStore(s => s.selectedRowIndex);
  const setSel = (index: number | null) => useAppStore.setState({ selectedRowIndex: index });
  const { widths: cw, onMouseDown } = useResizableColumns(
    { label: DEF_LABEL_W, hash: DEF_HASH_W, author: DEF_AUTHOR_W },
    { label: 80, hash: 50, author: 60 },
  );

  // ── Context Menu State ──────────────────────────────────────────
  const [ctxMenu, setCtxMenu] = useState<{ commit: CommitNode; pos: ContextMenuPosition } | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent, commit: CommitNode) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ commit, pos: { x: e.clientX, y: e.clientY } });
  }, []);

  const closeContextMenu = useCallback(() => setCtxMenu(null), []);
  
  // ── Virtualization Setup (already called above) ───────────────────

  // Trigger loading more when we approach the bottom of the virtual list
  useEffect(() => {
    const lastItem = virtualItems[virtualItems.length - 1];
    if (!lastItem) return;

    if (hasMoreCommits && !isLoadingMore && lastItem.index >= totalRows - 10) {
      loadMoreCommits();
    }
  }, [virtualItems, totalRows, hasMoreCommits, isLoadingMore]);




  return (
    <main className="flex-1 flex flex-col bg-[#0d1117] h-full overflow-hidden text-sm">
      {/* Header */}
      <div className="h-7 flex items-center border-b border-[#30363d] bg-[#161b22] sticky top-0 z-30 min-w-max shadow-sm">
        <div className="pl-4 section-header-text" style={{ width: cw.label }}>BRANCH / TAG</div>
        <ResizeHandle onMouseDown={onMouseDown('label')} />
        <div className="pl-2 section-header-text" style={{ width: gw }}>GRAPH</div>
        <div className="flex-1 pl-4 section-header-text">MESSAGE</div>
        <ResizeHandle onMouseDown={onMouseDown('hash')} />
        <div className="pl-4 section-header-text" style={{ width: cw.hash }}>HASH</div>
        <ResizeHandle onMouseDown={onMouseDown('author')} />
        <div className="pl-4 section-header-text" style={{ width: cw.author }}>AUTHOR</div>
      </div>

      {/* Scroll */}
      {/* Scroll Container */}
      <div 
        ref={parentRef}
        className="flex-1 overflow-auto custom-scrollbar bg-[#0d1117] relative"
      >
        <div 
          className="relative min-w-max" 
          style={{ height: `${virtualizer.getTotalSize()}px` }}
        >
          {/* ═══ SVG Graph Layer ═══ */}
          <svg 
            className="absolute pointer-events-none z-[10]"
            style={{ 
              left: cw.label + 5, 
              top: 0 
            }} 
            width={gw} 
            height={virtualizer.getTotalSize()}
          >
            {/* Layer 1: Stash connection lines */}
            {(() => {
              const minVis = virtualItems[0]?.index ?? 0;
              const maxVis = virtualItems[virtualItems.length - 1]?.index ?? 0;
              return stashEdges
                .filter(e => e.r1 <= maxVis && e.r2 >= minVis)
                .map((e, i) => (
                  <path key={`se-${i}`} d={e.path} fill="none"
                    stroke={color(e.colorIdx)} strokeWidth={2} opacity={0.6}
                    strokeDasharray="5 4" strokeLinecap="round" strokeLinejoin="round" />
                ));
            })()}

            {/* Layer 2: Manhattan-routed connections */}
            {(() => {
              const minVis = virtualItems[0]?.index ?? 0;
              const maxVis = virtualItems[virtualItems.length - 1]?.index ?? 0;
              return edges
                .filter(e => e.r1 <= maxVis && e.r2 >= minVis)
                .map((e: Edge, i: number) => (
                  <path key={`e-${i}`} d={e.path} fill="none"
                    stroke={color(e.colorIdx)} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                    strokeDasharray={e.dashed ? '6 4' : 'none'} />
                ));
            })()}

            {/* Layer 3: WIP node */}
            {hasWip && (
              <g opacity={1}>
                <circle cx={lx(0)} cy={ly(0)} r={NODE_R}
                  fill="#0d1117" stroke="#58a6ff" strokeWidth={2} strokeDasharray="4 3" />
                <text x={lx(0)} y={ly(0)} textAnchor="middle" dominantBaseline="central"
                  fill="#58a6ff" fontSize={10} fontWeight={700}>W</text>
              </g>
            )}

            {/* Layer 4: Commit nodes — Rendered in virtual view only */}
            {virtualItems.map((virtualRow) => {
              const row = virtualRow.index;
              const n = row === 0 && hasWip ? null : filteredCommits[row - off];
              if (!n) return null;

              const cx = lx(n.lane), cy = ly(row);
              const c = color(n.color_idx);
              const h = hue(n.author);
              const isMerge = n.parents.length > 1;
              const r = isMerge ? MERGE_DOT_R : NODE_R;

              if (n.node_type === 'stash') {
                return (
                  <g key={n.oid}>
                    <rect x={cx - NODE_R} y={cy - NODE_R} width={NODE_R * 2} height={NODE_R * 2} rx={4}
                      fill={`hsl(${h}, 30%, 20%)`} stroke={c} strokeWidth={2} strokeDasharray="3 2" />
                    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
                      fill="#fff" fontSize={9} fontWeight={700} style={{ userSelect: 'none', pointerEvents: 'none' }}>
                      S
                    </text>
                  </g>
                );
              }

              if (isMerge) {
                return <circle key={n.oid} cx={cx} cy={cy} r={r} fill={c} />;
              }

              return (
                <g key={n.oid}>
                  <circle cx={cx} cy={cy} r={r} fill={`hsl(${h}, 40%, 25%)`} stroke={c} strokeWidth={2} />
                  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
                    fill="#fff" fontSize={10} fontWeight={600} style={{ userSelect: 'none', pointerEvents: 'none' }}>
                    {(n.author || '?')[0].toUpperCase()}
                  </text>
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

            if (!n) return null;

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

          {(!filteredCommits?.length) && (
            <div className="flex items-center justify-center p-8 text-[#8b949e]">
              No commits found.
            </div>
          )}

          {isLoadingMore && (
            <div className="flex items-center justify-center p-4 text-[#8b949e] gap-2" style={{ width: cw.label + gw + 200 }}>
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs">Loading more commits...</span>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Context Menu ═══ */}
      {ctxMenu && (
        <CommitContextMenu
          commit={ctxMenu.commit}
          position={ctxMenu.pos}
          onClose={closeContextMenu}
        />
      )}
    </main>
  );
}
