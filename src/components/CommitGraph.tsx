import { useState, useMemo, useEffect } from 'react';
import { useAppStore, CommitNode } from '../store';
import { loadMoreCommits } from '../lib/repo';
import { useResizableColumns, ResizeHandle } from './ResizableColumns';
import { Monitor, Cloud } from 'lucide-react';

// ── Constants ────────────────────────────────────────────────────────
const ROW_H = 36;
const LANE_W = 20;
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
type Edge = { path: string; colorIdx: number; dashed?: boolean };

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

function buildEdges(commits: CommitNode[], off: number, wip: boolean): Edge[] {
  const out: Edge[] = [];
  // WIP → first commit
  if (wip && commits.length > 0) {
    const x1 = lx(0), y1 = ly(0), x2 = lx(commits[0].lane), y2 = ly(off);
    out.push({ path: roundedPath(x1, y1, x2, y2, 'branch-off'), colorIdx: commits[0].color_idx, dashed: true });
  }
  commits.forEach((c, i) => {
    const row = i + off;
    c.parents.forEach((po, pi) => {
      const idx = commits.findIndex(n => n.oid === po);
      const e = c.edges[pi];
      const ci = e?.color_idx ?? c.color_idx;
      const x1 = lx(c.lane), y1 = ly(row);
      const type = pi === 0 ? 'branch-off' : 'merge';

      if (idx === -1) {
        const tl = e?.to_lane ?? c.lane;
        const x2 = lx(tl), y2 = ly(row + 5);
        out.push({ path: roundedPath(x1, y1, x2, y2, type), colorIdx: ci });
        return;
      }
      const pRow = idx + off;
      const x2 = lx(commits[idx].lane), y2 = ly(pRow);
      out.push({ path: roundedPath(x1, y1, x2, y2, type), colorIdx: ci });
    });
  });
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

  const hasWip = (status?.staged_count ?? 0) > 0 || (status?.unstaged_count ?? 0) > 0 || staged.length > 0 || unstaged.length > 0;
  const off = hasWip ? 1 : 0;
  const totalRows = (commitLog?.length || 0) + off;

  const maxLane = useMemo(() => {
    if (!commitLog?.length) return 0;
    return commitLog.reduce((m, c) => Math.max(m, c.lane, ...c.edges.map(e => e.to_lane)), 0);
  }, [commitLog]);

  const gw = LANE_PAD * 2 + maxLane * LANE_W;
  const th = totalRows * ROW_H;

  const edges = useMemo(() => commitLog ? buildEdges(commitLog, off, hasWip) : [], [commitLog, off, hasWip]);

  const [hov, setHov] = useState<number | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const { widths: cw, onMouseDown } = useResizableColumns(
    { label: DEF_LABEL_W, hash: DEF_HASH_W, author: DEF_AUTHOR_W },
    { label: 80, hash: 50, author: 60 },
  );

  useEffect(() => {
    if (commitLog?.length)
      console.log('GRAPH DEBUG:', commitLog.slice(0, 5).map(c => ({ oid: c.short_oid, lane: c.lane, edges: c.edges, parents: c.parents.map(p => p.slice(0, 7)) })));
  }, [commitLog]);

  return (
    <main className="flex-1 flex flex-col bg-[#0d1117] h-full overflow-hidden text-sm">
      {/* Header */}
      <div className="h-9 flex items-center border-b border-[#1e293b] text-[11px] font-semibold text-[#8b949e] tracking-wider uppercase shrink-0 bg-[#161b22] z-20 min-w-max">
        <div className="pl-3" style={{ width: cw.label }}>BRANCH / TAG</div>
        <ResizeHandle onMouseDown={onMouseDown('label')} />
        <div className="pl-2" style={{ width: gw }}>GRAPH</div>
        <div className="flex-1 pl-3">MESSAGE</div>
        <ResizeHandle onMouseDown={onMouseDown('hash')} />
        <div className="pl-3" style={{ width: cw.hash }}>HASH</div>
        <ResizeHandle onMouseDown={onMouseDown('author')} />
        <div className="pl-3" style={{ width: cw.author }}>AUTHOR</div>
      </div>

      {/* Scroll */}
      <div 
        className="flex-1 overflow-auto custom-scrollbar bg-[#0d1117]"
        onScroll={(e) => {
          const target = e.target as HTMLDivElement;
          if (hasMoreCommits && !isLoadingMore && target.scrollHeight - target.scrollTop - target.clientHeight < 100) {
            loadMoreCommits();
          }
        }}
      >
        <div className="relative min-w-max" style={{ minHeight: th }}>

          {/* ═══ SVG Graph Layer ═══ */}
          <svg className="absolute pointer-events-none z-[5]"
            style={{ left: cw.label + 5, top: 0 }} width={gw} height={th}>

            {/* Layer 2: Manhattan-routed horizontal+vertical connections */}
            {edges.map((e, i) => (
              <path key={`e-${i}`} d={e.path} fill="none"
                stroke={color(e.colorIdx)} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                strokeDasharray={e.dashed ? '6 4' : 'none'} />
            ))}

            {/* Layer 3: WIP node */}
            {hasWip && (
              <g>
                <circle cx={lx(0)} cy={ly(0)} r={NODE_R}
                  fill="#0d1117" stroke="#58a6ff" strokeWidth={2} strokeDasharray="4 3" />
                <text x={lx(0)} y={ly(0)} textAnchor="middle" dominantBaseline="central"
                  fill="#58a6ff" fontSize={10} fontWeight={700}>W</text>
              </g>
            )}

            {/* Layer 4: Commit nodes — ON TOP of all lines */}
            {commitLog?.map((n, i) => {
              const row = i + off;
              const cx = lx(n.lane), cy = ly(row);
              const c = color(n.color_idx);
              const h = hue(n.author);
              const isMerge = n.parents.length > 1;
              const r = isMerge ? MERGE_DOT_R : NODE_R;

              if (isMerge) {
                // Merge point — small filled dot
                return (
                  <g key={n.oid}>
                    <circle cx={cx} cy={cy} r={r} fill={c} />
                    {(hov === row || sel === row) && (
                      <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke="#fff" strokeWidth={1.5} opacity={0.6} />
                    )}
                  </g>
                );
              }

              // Regular commit — large circle with avatar initial
              return (
                <g key={n.oid}>
                  <circle cx={cx} cy={cy} r={r} fill={`hsl(${h}, 40%, 25%)`} stroke={c} strokeWidth={2} />
                  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
                    fill="#fff" fontSize={10} fontWeight={600} style={{ userSelect: 'none', pointerEvents: 'none' }}>
                    {(n.author || '?')[0].toUpperCase()}
                  </text>
                  {(hov === row || sel === row) && (
                    <circle cx={cx} cy={cy} r={r + 3} fill="none" stroke={sel === row ? '#fff' : c} strokeWidth={1.5} opacity={0.7} />
                  )}
                </g>
              );
            })}
          </svg>

          {/* ═══ HTML Rows ═══ */}
          {hasWip && (
            <div
              className={`flex items-center cursor-pointer transition-colors
                ${hov === 0 ? 'bg-[#1e293b]/40' : ''} ${sel === 0 ? 'bg-[#3b82f6]/10' : ''}`}
              style={{ height: ROW_H }}
              onClick={() => setSel(0)} onMouseEnter={() => setHov(0)} onMouseLeave={() => setHov(null)}>
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
              <div className="pl-3 font-mono text-xs text-[#8b949e]/60" style={{ width: cw.hash }}>—</div>
              <div className="pl-3 text-xs text-[#8b949e]/60 truncate" style={{ width: cw.author }}>Working Tree</div>
            </div>
          )}

          {commitLog?.map((n, i) => {
            const row = i + off;
            return (
              <div key={n.oid}
                className={`flex items-center cursor-pointer transition-colors
                  ${hov === row ? 'bg-[#1e293b]/40' : ''} ${sel === row ? 'bg-[#3b82f6]/10' : ''}`}
                style={{ height: ROW_H }}
                onClick={() => setSel(row)} onMouseEnter={() => setHov(row)} onMouseLeave={() => setHov(null)}>
                {/* Branch labels */}
                <div className="pl-2 flex items-center gap-1 overflow-hidden" style={{ width: cw.label }}>
                  {(() => {
                    const branchGroups = new Map<string, { isLocal: boolean; isRemote: boolean; isHead: boolean }>();
                    n.refs?.forEach(r => {
                      if (r === 'HEAD') {
                        branchGroups.set('HEAD', { isLocal: true, isRemote: false, isHead: true });
                        return;
                      }
                      let name = r;
                      let isRemote = false;
                      if (r.startsWith('origin/')) {
                        name = r.substring(7);
                        isRemote = true;
                      }
                      const existing = branchGroups.get(name) || { isLocal: false, isRemote: false, isHead: false };
                      if (isRemote) existing.isRemote = true;
                      else existing.isLocal = true;
                      branchGroups.set(name, existing);
                    });

                    return Array.from(branchGroups.entries()).map(([name, info]) => {
                      const isRemoteOnly = info.isRemote && !info.isLocal;
                      const bg = info.isHead ? 'bg-sky-900/50 text-sky-300 border-sky-600/50'
                        : isRemoteOnly ? 'bg-purple-900/40 text-purple-300 border-purple-600/50'
                        : `border-[${color(n.color_idx)}]/50`;
                      const style = !info.isHead && !isRemoteOnly ? { backgroundColor: color(n.color_idx) + '30', color: color(n.color_idx), borderColor: color(n.color_idx) + '60' } : undefined;
                      return (
                        <span key={name} className={`flex items-center gap-1 border px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap truncate max-w-[120px] ${info.isHead || isRemoteOnly ? bg : 'border'}`} style={style}>
                          {info.isHead ? name : (
                            <>
                              <span className="truncate">{name}</span>
                              <div className="flex items-center gap-0.5 opacity-80 shrink-0">
                                {info.isLocal && <Monitor size={10} />}
                                {info.isRemote && <Cloud size={10} />}
                              </div>
                            </>
                          )}
                        </span>
                      );
                    });
                  })()}
                </div>
                {/* Graph spacer */}
                <div style={{ width: gw + 5 }} />
                {/* Message */}
                <div className="flex-1 flex items-center pl-3 pr-4 min-w-0">
                  <span className="truncate text-[#c9d1d9] text-[13px]">{n.message}</span>
                </div>
                {/* Hash */}
                <div className="pl-3 font-mono text-xs text-[#8b949e] hover:text-white transition-colors" style={{ width: cw.hash }}>{n.short_oid}</div>
                {/* Author */}
                <div className="pl-3 text-xs text-[#8b949e] truncate" style={{ width: cw.author }}>{n.author}</div>
              </div>
            );
          })}

          {(!commitLog?.length) && (
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
    </main>
  );
}
