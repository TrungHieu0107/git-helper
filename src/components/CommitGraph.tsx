import { useState, useMemo } from 'react';
import { useAppStore, CommitNode, EdgeInfo } from '../store';

// ── Constants ────────────────────────────────────────────────────────
const ROW_HEIGHT = 36;
const AVATAR_SIZE = 24;
const NODE_RADIUS = 5;
const INNER_DOT = 2;
const LW = 18; // LANE_WIDTH
const GRAPH_PADDING_RIGHT = 8;
const BG_COLOR = '#0d1117';

const LANE_COLORS = [
  '#7C6FDE', '#2EAA6B', '#D97706', '#DC4A2D',
  '#2B7FD4', '#C2406A', '#4E9A1F', '#6B7280',
];

function laneColor(colorIdx: number): string {
  return LANE_COLORS[colorIdx % LANE_COLORS.length];
}

function laneX(lane: number): number {
  return lane * LW + LW / 2;
}

// ── Edge type classification ─────────────────────────────────────────
type EdgeType = 'straight' | 'branch-off' | 'merge';

function classifyEdge(
  _edge: EdgeInfo,
  fromLane: number,
  toLane: number,
  currentCommit: CommitNode,
): EdgeType {
  if (fromLane === toLane) return 'straight';
  if (currentCommit.parents.length > 1) return 'merge';
  return 'branch-off';
}

// ── Edge path generation ─────────────────────────────────────────────
function edgePath(fromLane: number, toLane: number, edgeType: EdgeType): string {
  const xFrom = laneX(fromLane);
  const xTo = laneX(toLane);

  if (edgeType === 'straight') {
    return `M ${xFrom} 0 L ${xFrom} ${ROW_HEIGHT}`;
  }
  if (edgeType === 'branch-off') {
    // Horizontal-first: from commit node (y=18) curve to new lane, then down to y=36
    return `M ${xFrom} 18 C ${xFrom} 18, ${xTo} 18, ${xTo} 36`;
  }
  if (edgeType === 'merge') {
    // Vertical-first: from y=36 at source lane, curve to merge commit (y=18) on target lane
    return `M ${xFrom} 36 C ${xFrom} 18, ${xFrom} 18, ${xTo} 18`;
  }
  return '';
}

// ── Per-row edge data ────────────────────────────────────────────────
type RowEdge = {
  fromLane: number;
  toLane: number;
  colorIdx: number;
  edgeType: EdgeType;
  dashed?: boolean;
};

// ── Build per-row rendering data ─────────────────────────────────────
function useGraphData(commitLog: CommitNode[], graphRowOffset: number) {
  return useMemo(() => {
    if (!commitLog || commitLog.length === 0)
      return { maxLane: 0, rowEdges: new Map<number, RowEdge[]>() };

    let maxLane = 0;
    const rowEdges = new Map<number, RowEdge[]>();

    const addEdge = (row: number, edge: RowEdge) => {
      if (!rowEdges.has(row)) rowEdges.set(row, []);
      rowEdges.get(row)!.push(edge);
    };

    commitLog.forEach((node, i) => {
      const nodeRow = i + graphRowOffset;
      if (node.lane > maxLane) maxLane = node.lane;

      node.parents.forEach((parentOid, pIdx) => {
        const pRowIdx = commitLog.findIndex(n => n.oid === parentOid);
        const edgeInfo = node.edges[pIdx];
        const colorIdx = edgeInfo ? edgeInfo.color_idx : node.color_idx;

        if (pRowIdx !== -1) {
          const parentRow = pRowIdx + graphRowOffset;
          const toLane = edgeInfo ? edgeInfo.to_lane : commitLog[pRowIdx].lane;
          if (toLane > maxLane) maxLane = toLane;

          const eType = classifyEdge(
            edgeInfo || { to_lane: toLane, color_idx: colorIdx },
            node.lane, toLane, node
          );

          // At the commit row: draw the branch-off or merge curve (or straight)
          addEdge(nodeRow, { fromLane: node.lane, toLane, colorIdx, edgeType: eType });

          // Intermediate rows: straight pass-through on the target lane
          for (let r = nodeRow + 1; r < parentRow; r++) {
            addEdge(r, { fromLane: toLane, toLane, colorIdx, edgeType: 'straight' });
          }

          // At the parent row: if toLane differs from parent's lane we need a merge curve there
          if (parentRow > nodeRow) {
            const parentNode = commitLog[pRowIdx];
            if (toLane !== parentNode.lane) {
              addEdge(parentRow, {
                fromLane: toLane,
                toLane: parentNode.lane,
                colorIdx,
                edgeType: 'merge',
              });
            }
          }
        } else {
          // Parent outside loaded chunk — extend down
          const toLane = edgeInfo ? edgeInfo.to_lane : node.lane;
          if (toLane > maxLane) maxLane = toLane;
          const eType = node.lane === toLane ? 'straight' as EdgeType : 'branch-off' as EdgeType;
          addEdge(nodeRow, { fromLane: node.lane, toLane, colorIdx, edgeType: eType });
          for (let r = nodeRow + 1; r < nodeRow + 5; r++) {
            addEdge(r, { fromLane: toLane, toLane, colorIdx, edgeType: 'straight' });
          }
        }
      });
    });

    return { maxLane, rowEdges };
  }, [commitLog, graphRowOffset]);
}

// ── Avatar Fallback ──────────────────────────────────────────────────
function AvatarFallback({ name, email, size = 24 }: Readonly<{ name: string; email: string; size?: number }>) {
  const initial = (name || email || '?')[0].toUpperCase();
  const hue = (email || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `hsl(${hue}, 55%, 40%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 500, color: '#fff', flexShrink: 0,
    }}>
      {initial}
    </div>
  );
}

// ── Avatar component ─────────────────────────────────────────────────
function CommitAvatar({ author, email }: Readonly<{ author: string; email: string }>) {
  const [imgError, setImgError] = useState(false);
  const gravatarUrl = `https://www.gravatar.com/avatar/${email}?s=48&d=404`;

  if (imgError) {
    return <AvatarFallback name={author} email={email} size={AVATAR_SIZE} />;
  }

  return (
    <img
      src={gravatarUrl}
      alt={author}
      width={AVATAR_SIZE}
      height={AVATAR_SIZE}
      style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      onError={() => setImgError(true)}
    />
  );
}

// ── Per-row SVG renderer ─────────────────────────────────────────────
function GraphRowSvg({
  node,
  edges,
  svgWidth,
  isWip,
}: Readonly<{
  node: CommitNode | null;
  edges: RowEdge[];
  svgWidth: number;
  isWip?: boolean;
}>) {
  const straightEdges = edges.filter(e => e.edgeType === 'straight');
  const branchOffEdges = edges.filter(e => e.edgeType === 'branch-off');
  const mergeEdges = edges.filter(e => e.edgeType === 'merge');

  return (
    <svg
      width={svgWidth}
      height={ROW_HEIGHT}
      style={{ overflow: 'visible', display: 'block', flexShrink: 0 }}
      viewBox={`0 0 ${svgWidth} ${ROW_HEIGHT}`}
    >
      {/* Layer 1: Pass-through straight vertical lines (z-bottom) */}
      {straightEdges.map((e, i) => (
        <line
          key={`st-${i}`}
          x1={laneX(e.fromLane)} y1={0}
          x2={laneX(e.fromLane)} y2={ROW_HEIGHT}
          stroke={laneColor(e.colorIdx)}
          strokeWidth={2}
          strokeDasharray={e.dashed ? '6 4' : 'none'}
        />
      ))}

      {/* Layer 2: Branch-off edges (horizontal-first curves) */}
      {branchOffEdges.map((e, i) => (
        <path
          key={`bo-${i}`}
          d={edgePath(e.fromLane, e.toLane, 'branch-off')}
          fill="none"
          stroke={laneColor(e.colorIdx)}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={e.dashed ? '6 4' : 'none'}
        />
      ))}

      {/* Layer 3: Merge edges (vertical-first curves) */}
      {mergeEdges.map((e, i) => (
        <path
          key={`mg-${i}`}
          d={edgePath(e.fromLane, e.toLane, 'merge')}
          fill="none"
          stroke={laneColor(e.colorIdx)}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={e.dashed ? '6 4' : 'none'}
        />
      ))}

      {/* Layer 4: Commit node circle */}
      {node && !isWip && (
        <>
          <circle
            cx={laneX(node.lane)} cy={18}
            r={NODE_RADIUS}
            fill={laneColor(node.color_idx)}
            stroke={laneColor(node.color_idx)}
            strokeWidth={1.5}
          />
          {/* Layer 5: Inner dark dot */}
          <circle
            cx={laneX(node.lane)} cy={18}
            r={INNER_DOT}
            fill={BG_COLOR}
          />
        </>
      )}

      {/* WIP node */}
      {isWip && (
        <>
          <circle
            cx={laneX(0)} cy={18}
            r={NODE_RADIUS + 1}
            fill="none" stroke="#58a6ff"
            strokeWidth={1.5} strokeDasharray="2 2"
          />
          <circle cx={laneX(0)} cy={18} r={INNER_DOT} fill="#58a6ff" />
        </>
      )}
    </svg>
  );
}

// ── Main Component ───────────────────────────────────────────────────
export function CommitGraph() {
  const commitLog = useAppStore(state => state.commitLog);
  const stagedFiles = useAppStore(state => state.stagedFiles);
  const unstagedFiles = useAppStore(state => state.unstagedFiles);
  const repoStatus = useAppStore(state => state.repoStatus);

  const hasWipRow = (repoStatus?.staged_count ?? 0) > 0
    || (repoStatus?.unstaged_count ?? 0) > 0
    || stagedFiles.length > 0
    || unstagedFiles.length > 0;
  const graphRowOffset = hasWipRow ? 1 : 0;

  const { maxLane, rowEdges } = useGraphData(commitLog, graphRowOffset);
  const activeLaneCount = maxLane + 1;
  const svgWidth = activeLaneCount * LW + GRAPH_PADDING_RIGHT;

  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);

  const wipEdges: RowEdge[] = useMemo(() => {
    if (!hasWipRow || !commitLog || commitLog.length === 0) return [];
    const toLane = commitLog[0].lane;
    const eType: EdgeType = toLane === 0 ? 'straight' : 'branch-off';
    return [{ fromLane: 0, toLane, colorIdx: commitLog[0].color_idx, edgeType: eType, dashed: true }];
  }, [hasWipRow, commitLog]);

  return (
    <main className="flex-1 flex flex-col bg-[#0f172a] h-full overflow-hidden text-sm">
      {/* Sticky Headers */}
      <div className="h-9 flex items-center border-b border-[#1e293b] px-4 text-[11px] font-semibold text-[#8b949e] tracking-wider uppercase shrink-0 bg-[#0f172a] z-20 w-full min-w-max shadow-sm">
        <div className="w-[140px] shrink-0 border-r border-[#1e293b]/30 pl-1">BRANCH / TAG</div>
        <div className="shrink-0 border-r border-[#1e293b]/30 pl-2 flex items-center" style={{ width: 28 + svgWidth }}>GRAPH</div>
        <div className="flex-1 pl-3 border-r border-[#1e293b]/30">MESSAGE</div>
        <div className="w-[72px] shrink-0 border-r border-[#1e293b]/30 pl-3">HASH</div>
        <div className="w-[110px] shrink-0 pl-3">AUTHOR</div>
      </div>

      {/* Graph Viewport */}
      <div className="flex-1 overflow-auto custom-scrollbar bg-[#0d1117]" style={{ willChange: 'transform' }}>
        <div className="min-w-max">

          {/* WIP Row */}
          {hasWipRow && (
            <div
              style={{ display: 'flex', height: ROW_HEIGHT, alignItems: 'center' }}
              className={`cursor-pointer border-b border-[#1e293b]/20 group transition-colors
                ${hoveredRow === 0 ? 'bg-[#1e293b]/40' : ''}
                ${selectedRow === 0 ? 'bg-[#3b82f6]/10' : ''}`}
              onClick={() => setSelectedRow(0)}
              onMouseEnter={() => setHoveredRow(0)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              {/* Refs */}
              <div className="w-[140px] shrink-0 pl-2 flex items-center pr-1">
                <span className="bg-cyan-900/40 text-cyan-300 border border-cyan-700/50 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0">WIP</span>
              </div>
              {/* Column A: Avatar */}
              <div style={{ width: 28, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                <div style={{
                  width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: '50%',
                  background: '#1e293b', border: '1px solid rgba(88,166,255,0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 10, color: '#58a6ff', fontWeight: 700 }}>W</span>
                </div>
              </div>
              {/* Column B: Graph SVG */}
              <GraphRowSvg node={null} edges={wipEdges} svgWidth={svgWidth} isWip />
              {/* Column C: Message */}
              <div style={{ flex: 1, overflow: 'hidden' }} className="flex items-center pr-4 pl-3">
                <div className="h-6 rounded border border-[#245d84]/60 bg-[#0b2942]/65 flex items-center px-2 gap-3 overflow-hidden max-w-full">
                  <span className="text-[11px] font-mono text-[#79c0ff] shrink-0">// WIP</span>
                  <span className="text-[10px] text-[#3fb950] shrink-0">+{repoStatus?.staged_count ?? stagedFiles.length} staged</span>
                  <span className="text-[10px] text-[#f2cc60] shrink-0">+{repoStatus?.unstaged_count ?? unstagedFiles.length} unstaged</span>
                </div>
              </div>
              <div className="w-[72px] shrink-0 pl-3 font-mono opacity-60 text-[#8b949e] text-xs">—</div>
              <div className="w-[110px] shrink-0 pl-3 opacity-60 text-[#8b949e] truncate text-xs">Working Tree</div>
            </div>
          )}

          {/* Commit Rows */}
          {commitLog?.map((n, idx) => {
            const row = idx + graphRowOffset;
            const edges = rowEdges.get(row) || [];
            return (
              <div
                key={n.oid}
                style={{ display: 'flex', height: ROW_HEIGHT, alignItems: 'center' }}
                className={`cursor-pointer border-b border-[#1e293b]/20 group transition-colors
                  ${hoveredRow === row ? 'bg-[#1e293b]/40' : ''}
                  ${selectedRow === row ? 'bg-[#3b82f6]/10' : ''}`}
                onClick={() => setSelectedRow(row)}
                onMouseEnter={() => setHoveredRow(row)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                {/* Refs */}
                <div className="w-[140px] shrink-0 pl-2 flex items-center gap-1 overflow-hidden pr-1 text-xs">
                  {n.refs?.map(r => {
                    let cls = 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50';
                    if (r.includes('origin/')) cls = 'bg-purple-900/40 text-purple-300 border-purple-700/50';
                    if (r === 'HEAD') cls = 'bg-sky-900/45 text-sky-300 border-sky-700/60';
                    return (
                      <span key={r} className={`border px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap truncate max-w-[70px] ${cls}`}>
                        {r}
                      </span>
                    );
                  })}
                </div>

                {/* Column A: Avatar — pure HTML, never inside SVG */}
                <div style={{ width: 28, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                  <CommitAvatar author={n.author} email={n.email} />
                </div>

                {/* Column B: Graph SVG — NO images, NO avatars inside */}
                <GraphRowSvg node={n} edges={edges} svgWidth={svgWidth} />

                {/* Column C: Message */}
                <div style={{ flex: 1, overflow: 'hidden' }} className="flex items-center pr-4 pl-3">
                  <div className="truncate max-w-full text-[#c9d1d9] font-medium text-[13px]">
                    {n.message}
                  </div>
                </div>

                {/* Hash */}
                <div className="w-[72px] shrink-0 pl-3 font-mono text-xs text-[#8b949e] hover:text-white transition-colors">
                  {n.short_oid}
                </div>

                {/* Author */}
                <div className="w-[110px] shrink-0 pl-3 text-xs text-[#8b949e] truncate">
                  {n.author}
                </div>
              </div>
            );
          })}

          {/* Empty state */}
          {(!commitLog || commitLog.length === 0) && (
            <div className="flex items-center justify-center h-32 text-[#5c6370] italic text-sm">
              No commits to display
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
