import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';

const LANE_COLORS = ['#7F77DD','#1D9E75','#BA7517','#D85A30','#378ADD','#D4537E','#639922','#888780'];
const COL_WIDTH = 16;
const ROW_HEIGHT = 32;
const PADDING_TOP = 8;
const PADDING_LEFT = 20;
const STROKE_WIDTH = 2;
const AVATAR_SIZE = 22;
const AVATAR_RADIUS = AVATAR_SIZE / 2;
const STASH_CORNER_RADIUS = 4;

type ConnectionPath = {
  fromColumn: number;
  fromRow: number;
  toColumn: number;
  toRow: number;
  color: string;
  dashed?: boolean;
};

export function CommitGraph() {
  const commitLog = useAppStore(state => state.commitLog);
  const stagedFiles = useAppStore(state => state.stagedFiles);
  const unstagedFiles = useAppStore(state => state.unstagedFiles);
  
  const hasWipRow = stagedFiles.length > 0 || unstagedFiles.length > 0;
  const graphRowOffset = hasWipRow ? 1 : 0;
  const totalRowCount = (commitLog?.length || 0) + graphRowOffset;

  // Compute connections spanning nodes -> parents
  const connections = useMemo(() => {
    const paths: ConnectionPath[] = [];
    if (!commitLog) return paths;

    commitLog.forEach((node, i) => {
      node.parents.forEach((parentOid, pIdx) => {
        const pRowIndex = commitLog.findIndex(n => n.oid === parentOid);
        if (pRowIndex !== -1) {
          const edgeInfo = node.edges[pIdx];
          const colorIdx = edgeInfo ? edgeInfo.color_idx : node.color_idx;
          paths.push({
            fromColumn: node.lane,
            fromRow: i + graphRowOffset,
            toColumn: edgeInfo ? edgeInfo.to_lane : commitLog[pRowIndex].lane,
            toRow: pRowIndex + graphRowOffset,
            color: LANE_COLORS[colorIdx % LANE_COLORS.length]
          });
        } else {
            // The parent is outside the loaded chunk (limit reached). We just draw a line extending down indefinitely.
            const edgeInfo = node.edges[pIdx];
            const colorIdx = edgeInfo ? edgeInfo.color_idx : node.color_idx;
            paths.push({
               fromColumn: node.lane,
               fromRow: i + graphRowOffset,
               toColumn: edgeInfo ? edgeInfo.to_lane : node.lane,
               toRow: totalRowCount + 2, // run off screen
               color: LANE_COLORS[colorIdx % LANE_COLORS.length]
            });
        }
      });
    });
    
    // WIP mock connections to HEAD (which is row 0 if it exists)
    if (hasWipRow && commitLog.length > 0) {
       paths.push({
         fromColumn: 0,
         fromRow: 0,
         toColumn: commitLog[0].lane,
         toRow: graphRowOffset,
         color: LANE_COLORS[commitLog[0].color_idx % LANE_COLORS.length],
         dashed: true
       });
    }

    return paths;
  }, [commitLog, hasWipRow, graphRowOffset, totalRowCount]);

  const columnToX = (columnIndex: number) => PADDING_LEFT + columnIndex * COL_WIDTH;
  const rowToY = (rowIndex: number) => PADDING_TOP + rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2;

  function buildCurvedConnectionPath(x1: number, y1: number, x2: number, y2: number) {
      const shiftY = 15;
      if (x1 === x2) return `M ${x1} ${y1} V ${y2}`;
      
      return `M ${x1} ${y1} C ${x1} ${y1 + shiftY}, ${x2} ${y2 - shiftY}, ${x2} ${y2}`;
  }

  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);

  const getAvatarUrl = (author: string) => {
      // Mock avatar mapping
      if (author === 'admin') return 'https://www.gravatar.com/avatar/00000000000000000000000000000000?s=48&d=wavatar';
      return 'https://www.gravatar.com/avatar/ab0203f?s=48&d=identicon';
  };

  return (
    <main className="flex-1 flex flex-col bg-[#0f172a] h-full overflow-hidden text-sm">
      {/* Sticky Headers */}
      <div className="h-[32px] flex items-center border-b border-[#1e293b] px-4 text-[12px] font-semibold text-[#8b949e] tracking-wider uppercase shrink-0 bg-[#0f172a] z-20 w-full min-w-max shadow-sm">
         <div className="w-[170px] shrink-0 border-r border-[#1e293b]/30">BRANCH / TAG</div>
         <div className="w-[120px] shrink-0 border-r border-[#1e293b]/30 pl-4">GRAPH</div>
         <div className="flex-1 pl-4 border-r border-[#1e293b]/30">MESSAGE</div>
         <div className="w-[80px] shrink-0 border-r border-[#1e293b]/30 pl-4">HASH</div>
         <div className="w-[120px] shrink-0 pl-4">AUTHOR</div>
      </div>

      {/* Graph Viewport */}
      <div className="flex-1 overflow-auto relative custom-scrollbar bg-[#0d1117]" style={{ willChange: 'transform' }}>
        <div className="relative min-w-max" style={{ height: `${totalRowCount * ROW_HEIGHT + PADDING_TOP + 50}px` }}>
          
          {/* Background stripe rows */}
          <div className="absolute top-0 left-0 w-full z-[1] pointer-events-none" style={{ paddingTop: PADDING_TOP }}>
              {Array.from({ length: totalRowCount }).map((_, i) => (
                  <div key={i} className={`border-b border-[#1e293b]/15 ${i % 2 === 0 ? 'bg-[#0f172a]' : 'bg-[#1e293b]/10'}`} style={{ height: ROW_HEIGHT }}></div>
              ))}
          </div>

          {/* SVG Graph Layer */}
          <div className="absolute top-0 bottom-0 pointer-events-none z-[5]" style={{ left: 170, width: 120 }}>
             <svg className="w-full h-full" style={{ minHeight: '100%' }}>
                <defs>
                   <clipPath id="avatar-clip">
                       <circle cx="0" cy="0" r={AVATAR_RADIUS} />
                   </clipPath>
                   <clipPath id="avatar-stash-clip">
                       <rect x={-AVATAR_RADIUS} y={-AVATAR_RADIUS} width={AVATAR_SIZE} height={AVATAR_SIZE} rx={STASH_CORNER_RADIUS} />
                   </clipPath>
                   <filter id="avatar-shadow" x="-20%" y="-20%" width="140%" height="140%">
                       <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#000" floodOpacity="0.5" />
                   </filter>
                </defs>

                {/* Lanes - we don't have explicit long lanes array anymore, connections form the lanes */}

                {/* Connections */}
                <g className="connections">
                    {connections.map((conn, idx) => {
                        const path = buildCurvedConnectionPath(columnToX(conn.fromColumn), rowToY(conn.fromRow), columnToX(conn.toColumn), rowToY(conn.toRow));
                        return (
                           <path 
                              key={`conn-${idx}`}
                              d={path}
                              fill="none" stroke={conn.color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeDasharray={conn.dashed ? "6 4" : "none"} opacity={0.8}
                           />
                        )
                    })}
                </g>
                
                {/* WIP Dashed line up to WIP Row */}
                {hasWipRow && (
                    <path
                        d={`M ${columnToX(0)} ${rowToY(0)} V ${rowToY(1)}`}
                        fill="none" stroke={LANE_COLORS[0]} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeDasharray="4 3" opacity={0.65}
                    />
                )}

                {/* Nodes rendering over lines */}
                <g className="nodes">
                    {hasWipRow && (
                        <g transform={`translate(${columnToX(0)}, ${rowToY(0)})`} filter="url(#avatar-shadow)">
                            <circle cx="0" cy="0" r={AVATAR_RADIUS + 1} fill="#0f172a" stroke="#58a6ff" strokeWidth="2" strokeDasharray="2 2" />
                            <circle cx="0" cy="0" r="3" fill="#58a6ff" />
                        </g>
                    )}

                    {commitLog?.map((n, idx) => {
                        const row = idx + graphRowOffset;
                        const cx = columnToX(n.lane);
                        const cy = rowToY(row);
                        const isHovered = hoveredRow === row;
                        const isSelected = selectedRow === row;
                        const color = LANE_COLORS[n.color_idx % LANE_COLORS.length];
                        const url = getAvatarUrl(n.author);
                        const isStash = false; // Add stash check later

                        return (
                           <g key={n.oid} transform={`translate(${cx}, ${cy}) scale(${isHovered ? 1.1 : 1})`} filter="url(#avatar-shadow)" className="transition-transform">
                              {isStash ? (
                                  <>
                                    <rect x={-AVATAR_RADIUS} y={-AVATAR_RADIUS} width={AVATAR_SIZE} height={AVATAR_SIZE} rx={4} fill={color} opacity="0.1" />
                                    <rect x={-AVATAR_RADIUS - 2} y={-AVATAR_RADIUS - 2} width={AVATAR_SIZE+4} height={AVATAR_SIZE+4} rx={4+2} fill="none" stroke={isSelected ? "#f0f6fc" : "rgba(255,255,255,0.9)"} strokeWidth="2" opacity="0.85" strokeDasharray="2 2" />
                                  </>
                              ) : (
                                  <>
                                    <circle cx="0" cy="0" r={AVATAR_RADIUS} fill={color} />
                                    <circle cx="0" cy="0" r={AVATAR_RADIUS + 2} fill="none" stroke={isSelected ? "#f0f6fc" : "rgba(255,255,255,0.9)"} strokeWidth="2" opacity="0.9" />
                                  </>
                              )}
                              
                              <image href={url} x={-AVATAR_RADIUS} y={-AVATAR_RADIUS} width={AVATAR_SIZE} height={AVATAR_SIZE} clipPath={`url(#${isStash ? 'avatar-stash-clip' : 'avatar-clip'})`} preserveAspectRatio="xMidYMid slice" opacity={isStash ? 0.7 : 1} />

                              {/* Selection halos */}
                              {isSelected && !isStash && (
                                  <circle cx="0" cy="0" r={AVATAR_RADIUS + 4} fill="none" stroke={color} strokeWidth="2" opacity="0.8" />
                              )}
                           </g>
                        )
                    })}
                </g>

             </svg>
          </div>

          {/* Foreground Text Rows */}
          <div className="absolute top-0 left-0 w-full z-10" style={{ paddingTop: PADDING_TOP }}>
              
              {/* WIP Row */}
              {hasWipRow && (
                 <div 
                    className={`flex items-center h-[32px] cursor-pointer border-b border-[#1e293b]/20 group transition-colors ${hoveredRow === 0 ? 'bg-[#1e293b]/40': ''} ${selectedRow === 0 ? 'bg-[#3b82f6]/10': ''}`}
                    onClick={() => setSelectedRow(0)}
                    onMouseEnter={() => setHoveredRow(0)}
                    onMouseLeave={() => setHoveredRow(null)}
                 >
                     <div className="w-[170px] shrink-0 pl-4 flex items-center pr-2">
                        <span className="bg-cyan-900/40 text-cyan-300 border border-cyan-700/50 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0">WIP</span>
                     </div>
                     <div className="w-[120px] shrink-0"></div>
                     <div className="flex-1 flex items-center pr-4 pl-4 min-w-0">
                         <div className="h-6 rounded border border-[#245d84]/60 bg-[#0b2942]/65 flex items-center px-2 gap-3 overflow-hidden max-w-full">
                            <span className="text-[11px] font-mono text-[#79c0ff] shrink-0">// WIP</span>
                            <span className="text-[10px] text-[#3fb950] shrink-0">+{stagedFiles.length} staged</span>
                            <span className="text-[10px] text-[#f2cc60] shrink-0">+{unstagedFiles.length} unstaged</span>
                         </div>
                     </div>
                     <div className="w-[80px] shrink-0 pl-4 font-mono opacity-60 text-[#8b949e]">WIP</div>
                     <div className="w-[120px] shrink-0 pl-4 opacity-60 text-[#8b949e] truncate">Working Tree</div>
                 </div>
              )}

              {/* Data Rows */}
              {commitLog?.map((n, idx) => {
                  const row = idx + graphRowOffset;
                  const isStash = false;
                  return (
                      <div 
                          key={n.oid}
                          className={`flex items-center h-[32px] cursor-pointer border-b border-[#1e293b]/20 group transition-colors ${hoveredRow === row ? 'bg-[#1e293b]/40': ''} ${selectedRow === row ? 'bg-[#3b82f6]/10': ''}`}
                          onClick={() => setSelectedRow(row)}
                          onMouseEnter={() => setHoveredRow(row)}
                          onMouseLeave={() => setHoveredRow(null)}
                      >
                          <div className="w-[170px] shrink-0 pl-4 flex items-center gap-1.5 overflow-hidden pr-2 text-xs">
                             {n.refs && n.refs.map(r => {
                                 let bgClass = "bg-emerald-900/40 text-emerald-300 border-emerald-700/50";
                                 if (r.includes('origin/')) bgClass = "bg-purple-900/40 text-purple-300 border-purple-700/50";
                                 if (r === 'HEAD') bgClass = "bg-sky-900/45 text-sky-300 border-sky-700/60";
                                 return <span key={r} className={`border px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap truncate max-w-[80px] ${bgClass}`}>{r}</span>
                             })}
                          </div>
                          
                          <div className="w-[120px] shrink-0 pointer-events-none"></div>

                          <div className="flex-1 flex items-center min-w-0 pr-4 pl-4 gap-2">
                             <div className={`truncate max-w-full ${isStash ? 'text-[#e5c07b]' : 'text-[#c9d1d9] font-medium'}`}>
                                 {n.message}
                             </div>
                          </div>

                          <div className="w-[80px] shrink-0 pl-4 font-mono text-xs text-[#8b949e] hover:text-white transition-colors">{n.short_oid}</div>
                          <div className="w-[120px] shrink-0 pl-4 text-xs text-[#8b949e] truncate">{n.author}</div>
                      </div>
                  );
              })}

          </div>
        </div>
      </div>
    </main>
  );
}
