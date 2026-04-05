import { useState, useMemo, useEffect } from 'react';
import { useAppStore, CommitNode } from '../store';
import { useResizableColumns, ResizeHandle } from './ResizableColumns';

// ── Constants (from spec) ────────────────────────────────────────────
const LANE_WIDTH = 20;
const ROW_HEIGHT = 36;
const NODE_RADIUS = 12;
const LANE_PADDING = NODE_RADIUS + 6;
const DEF_LABEL_W = 140;
const DEF_HASH_W = 72;
const DEF_AUTHOR_W = 110;

const LANE_COLORS = [
  '#00bcd4','#e53935','#e040fb','#7c4dff',
  '#fdd835','#ff9800','#4caf50','#78909c',
];

const lc = (i: number) => LANE_COLORS[i % LANE_COLORS.length];
const nx = (lane: number) => LANE_PADDING + lane * LANE_WIDTH;
const ny = (row: number) => row * ROW_HEIGHT + ROW_HEIGHT / 2;

// ── Connections ──────────────────────────────────────────────────────
type Conn = { path: string; colorIdx: number; dashed?: boolean };

function buildConns(commits: CommitNode[], off: number, wip: boolean): Conn[] {
  const out: Conn[] = [];
  const line = (x1: number, y1: number, x2: number, y2: number, ci: number, d?: boolean) => {
    if (x1 === x2) {
      out.push({ path: `M ${x1} ${y1} L ${x2} ${y2}`, colorIdx: ci, dashed: d });
    } else {
      const ym = (y1 + y2) / 2;
      out.push({ path: `M ${x1} ${y1} C ${x1} ${ym}, ${x2} ${ym}, ${x2} ${y2}`, colorIdx: ci, dashed: d });
    }
  };

  if (wip && commits.length > 0)
    line(nx(0), ny(0), nx(commits[0].lane), ny(off), commits[0].color_idx, true);

  commits.forEach((c, i) => {
    const r = i + off;
    c.parents.forEach((po, pi) => {
      const idx = commits.findIndex(n => n.oid === po);
      const e = c.edges[pi];
      const ci = e?.color_idx ?? c.color_idx;
      if (idx === -1) {
        line(nx(c.lane), ny(r), nx(e?.to_lane ?? c.lane), ny(r + 5), ci);
      } else {
        line(nx(c.lane), ny(r), nx(commits[idx].lane), ny(idx + off), ci);
      }
    });
  });
  return out;
}

// ── Avatar helpers ───────────────────────────────────────────────────
const getInit = (s: string) => (s || '?')[0].toUpperCase();
const hue = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h) % 360;
};

// ── Main Component ───────────────────────────────────────────────────
export function CommitGraph() {
  const commitLog = useAppStore(s => s.commitLog);
  const staged = useAppStore(s => s.stagedFiles);
  const unstaged = useAppStore(s => s.unstagedFiles);
  const status = useAppStore(s => s.repoStatus);

  const hasWip = (status?.staged_count ?? 0) > 0 || (status?.unstaged_count ?? 0) > 0
    || staged.length > 0 || unstaged.length > 0;
  const off = hasWip ? 1 : 0;
  const totalRows = (commitLog?.length || 0) + off;

  const maxLane = useMemo(() => {
    if (!commitLog?.length) return 0;
    return commitLog.reduce((m, c) =>
      Math.max(m, c.lane, ...c.edges.map(e => e.to_lane)), 0);
  }, [commitLog]);

  const gw = LANE_PADDING * 2 + maxLane * LANE_WIDTH;
  const th = totalRows * ROW_HEIGHT;

  const conns = useMemo(() =>
    commitLog ? buildConns(commitLog, off, hasWip) : [], [commitLog, off, hasWip]);

  const [hov, setHov] = useState<number | null>(null);
  const [sel, setSel] = useState<number | null>(null);

  const { widths: colW, onMouseDown } = useResizableColumns(
    { label: DEF_LABEL_W, hash: DEF_HASH_W, author: DEF_AUTHOR_W },
    { label: 80, hash: 50, author: 60 },
  );

  useEffect(() => {
    if (commitLog?.length)
      console.log('GRAPH DEBUG:', commitLog.slice(0, 5).map(c => ({
        oid: c.short_oid, lane: c.lane, edges: c.edges,
        parents: c.parents.map(p => p.slice(0, 7)),
      })));
  }, [commitLog]);

  return (
    <main className="flex-1 flex flex-col bg-[#0f172a] h-full overflow-hidden text-sm">
      {/* Header */}
      <div className="h-9 flex items-center border-b border-[#1e293b] text-[11px] font-semibold text-[#8b949e] tracking-wider uppercase shrink-0 bg-[#0f172a] z-20 min-w-max shadow-sm">
        <div className="pl-3" style={{ width: colW.label }}>BRANCH / TAG</div>
        <ResizeHandle onMouseDown={onMouseDown('label')} />
        <div className="pl-2" style={{ width: gw }}>GRAPH</div>
        <div className="flex-1 pl-3">MESSAGE</div>
        <ResizeHandle onMouseDown={onMouseDown('hash')} />
        <div className="pl-3" style={{ width: colW.hash }}>HASH</div>
        <ResizeHandle onMouseDown={onMouseDown('author')} />
        <div className="pl-3" style={{ width: colW.author }}>AUTHOR</div>
      </div>

      {/* Scroll */}
      <div className="flex-1 overflow-auto custom-scrollbar bg-[#0d1117]">
        <div className="relative min-w-max" style={{ minHeight: th }}>

          {/* SVG overlay — full graph */}
          <svg className="absolute pointer-events-none z-[5]"
            style={{ left: colW.label + 5, top: 0 }} width={gw} height={th}>

            {/* Lines */}
            {conns.map((c, i) => (
              <path key={i} d={c.path} fill="none" stroke={lc(c.colorIdx)}
                strokeWidth={2} strokeLinecap="round"
                strokeDasharray={c.dashed ? '6 4' : 'none'} />
            ))}

            {/* WIP node */}
            {hasWip && (
              <g>
                <circle cx={nx(0)} cy={ny(0)} r={NODE_RADIUS}
                  fill="#0d1117" stroke="#58a6ff" strokeWidth={2} strokeDasharray="4 3" />
                <text x={nx(0)} y={ny(0)} textAnchor="middle" dominantBaseline="central"
                  fill="#58a6ff" fontSize={11} fontWeight={700}>W</text>
              </g>
            )}

            {/* Commit nodes — ON TOP of lines */}
            {commitLog?.map((n, i) => {
              const row = i + off;
              const cx = nx(n.lane), cy = ny(row);
              const color = lc(n.color_idx);
              const h = hue(n.author);
              return (
                <g key={n.oid}>
                  <circle cx={cx} cy={cy} r={NODE_RADIUS}
                    fill={`hsl(${h}, 45%, 30%)`} stroke={color} strokeWidth={2} />
                  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
                    fill="#fff" fontSize={10} fontWeight={600}
                    style={{ userSelect: 'none', pointerEvents: 'none' }}>
                    {getInit(n.author)}
                  </text>
                  {(hov === row || sel === row) && (
                    <circle cx={cx} cy={cy} r={NODE_RADIUS + 3}
                      fill="none" stroke={sel === row ? '#fff' : color}
                      strokeWidth={1.5} opacity={0.7} />
                  )}
                </g>
              );
            })}
          </svg>

          {/* HTML rows */}
          {hasWip && (
            <div
              className={`flex items-center border-b border-[#1e293b]/20 cursor-pointer transition-colors
                ${hov === 0 ? 'bg-[#1e293b]/40' : ''} ${sel === 0 ? 'bg-[#3b82f6]/10' : ''}`}
              style={{ height: ROW_HEIGHT }}
              onClick={() => setSel(0)} onMouseEnter={() => setHov(0)} onMouseLeave={() => setHov(null)}>
              <div className="pl-3 flex items-center" style={{ width: colW.label }}>
                <span className="bg-cyan-900/40 text-cyan-300 border border-cyan-700/50 px-1.5 py-0.5 rounded text-[10px] font-medium">WIP</span>
              </div>
              <div style={{ width: gw }} />
              <div className="flex-1 flex items-center pl-3 pr-4 min-w-0">
                <div className="h-6 rounded border border-[#245d84]/60 bg-[#0b2942]/65 flex items-center px-2 gap-3 overflow-hidden">
                  <span className="text-[11px] font-mono text-[#79c0ff]">// WIP</span>
                  <span className="text-[10px] text-[#3fb950]">+{status?.staged_count ?? staged.length} staged</span>
                  <span className="text-[10px] text-[#f2cc60]">+{status?.unstaged_count ?? unstaged.length} unstaged</span>
                </div>
              </div>
              <div className="pl-3 font-mono text-xs text-[#8b949e]/60" style={{ width: colW.hash }}>—</div>
              <div className="pl-3 text-xs text-[#8b949e]/60 truncate" style={{ width: colW.author }}>Working Tree</div>
            </div>
          )}

          {commitLog?.map((n, i) => {
            const row = i + off;
            return (
              <div key={n.oid}
                className={`flex items-center border-b border-[#1e293b]/20 cursor-pointer transition-colors
                  ${hov === row ? 'bg-[#1e293b]/40' : ''} ${sel === row ? 'bg-[#3b82f6]/10' : ''}`}
                style={{ height: ROW_HEIGHT }}
                onClick={() => setSel(row)} onMouseEnter={() => setHov(row)} onMouseLeave={() => setHov(null)}>
                <div className="pl-3 flex items-center gap-1 overflow-hidden" style={{ width: colW.label }}>
                  {n.refs?.map(r => {
                    let c = 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50';
                    if (r.includes('origin/')) c = 'bg-purple-900/40 text-purple-300 border-purple-700/50';
                    if (r === 'HEAD') c = 'bg-sky-900/45 text-sky-300 border-sky-700/60';
                    return <span key={r} className={`border px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap truncate max-w-[65px] ${c}`}>{r}</span>;
                  })}
                </div>
                <div style={{ width: gw }} />
                <div className="flex-1 flex items-center pl-3 pr-4 min-w-0">
                  <span className="truncate text-[#c9d1d9] font-medium text-[13px]">{n.message}</span>
                </div>
                <div className="pl-3 font-mono text-xs text-[#8b949e] hover:text-white transition-colors" style={{ width: colW.hash }}>{n.short_oid}</div>
                <div className="pl-3 text-xs text-[#8b949e] truncate" style={{ width: colW.author }}>{n.author}</div>
              </div>
            );
          })}

          {(!commitLog?.length) && (
            <div className="flex items-center justify-center h-32 text-[#5c6370] italic">No commits to display</div>
          )}
        </div>
      </div>
    </main>
  );
}
