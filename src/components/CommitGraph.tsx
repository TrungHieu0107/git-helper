import React from 'react';

const LANE_COLORS = ['#7F77DD','#1D9E75','#BA7517','#D85A30','#378ADD','#D4537E','#639922','#888780'];
const LANE_WIDTH = 20;
const CENTER = 10;
const ROW_HEIGHT = 36;

export function CommitGraph() {
  
  // MOCK DATA since Rust doesn't have Phase 2 yet
  const commits = [
    { id: 'wip', message: '// WIP', branch: 'main', wip: true, count: 2 },
    { id: 'stash1', message: 'WIP on App.tsx', stash: true, lane: 0, colorIdx: 2 },
    { id: 'cx1', message: 'UI Refactoring phase', author: 'ntrun', lane: 0, colorIdx: 0, refs: ['main'] },
    { id: 'cx2', message: 'Phase 1 completed', author: 'ntrun', lane: 0, colorIdx: 0, refs: [] },
    { id: 'cx3', message: 'Initial project scaffold', author: 'admin', lane: 1, colorIdx: 1, refs: ['origin/main'] },
  ];

  return (
    <main className="flex-1 flex flex-col bg-[#282c34] h-full overflow-hidden text-sm">
      {/* Sticky Headers */}
      <div className="h-[32px] flex items-center border-b border-[#181a1f] px-2 text-[12px] font-semibold text-[#5c6370] tracking-wider uppercase shrink-0 bg-[#282c34] z-10 w-full min-w-max">
         <div className="w-[120px] shrink-0">BRANCH / TAG</div>
         <div className="w-[100px] shrink-0">GRAPH</div>
         <div className="flex-1">COMMIT MESSAGE</div>
      </div>

      {/* Graph List Wrapper */}
      <div className="flex-1 overflow-auto overflow-x-auto min-w-max">
        <div className="flex flex-col relative w-[800px] lg:w-full">
           
          {commits.map((c, i) => (
            <div key={i} className="flex h-[36px] items-center px-2 hover:bg-[#323842] border-b border-[#282c34] cursor-pointer text-[#a0a6b1]">
               
               {/* BRANCH/TAG COL */}
               <div className="w-[120px] shrink-0 flex items-center pr-2">
                 {c.refs && c.refs.map(r => (
                    <span key={r} className="bg-slate-700 px-1 py-0.5 rounded text-[10px] text-white font-mono shrink-0 mr-1">{r}</span>
                 ))}
                 {c.wip && <span className="bg-green-700/80 px-1 py-0.5 rounded text-[10px] text-white font-mono shrink-0 mr-1">✓ {c.branch}</span>}
               </div>

               {/* GRAPH SVG COL */}
               <div className="w-[100px] shrink-0 flex items-center h-full relative" style={{ overflow: 'visible' }}>
                  <svg width="100" height="36" className="absolute top-0 left-0" style={{ pointerEvents: 'none' }}>
                     {!c.wip && i < commits.length - 1 && (
                         <line x1={c.lane! * LANE_WIDTH + CENTER} y1="18" x2={c.lane! * LANE_WIDTH + CENTER} y2="36" stroke={LANE_COLORS[c.colorIdx!]} strokeWidth="2" />
                     )}
                     {!c.wip && i > 0 && (
                         <line x1={c.lane! * LANE_WIDTH + CENTER} y1="0" x2={c.lane! * LANE_WIDTH + CENTER} y2="18" stroke={LANE_COLORS[c.colorIdx!]} strokeWidth="2" strokeDasharray={c.stash ? "2,2" : ""} />
                     )}
                     
                     {c.wip && (
                         <>
                           <line x1={CENTER} y1="18" x2={CENTER} y2="36" stroke="#5c6370" strokeWidth="2" strokeDasharray="3,3" />
                           <circle cx={CENTER} cy="18" r="5" fill="transparent" stroke="#5c6370" strokeWidth="1.5" />
                         </>
                     )}
                     
                     {c.stash && (
                        <rect x={c.lane! * LANE_WIDTH + CENTER - 5} y="13" width="10" height="10" fill="#FAC775" transform={`rotate(45 ${c.lane! * LANE_WIDTH + CENTER} 18)`}/>
                     )}
                     
                     {!c.wip && !c.stash && (
                        <>
                           <circle cx={c.lane! * LANE_WIDTH + CENTER} cy="18" r="6" fill={LANE_COLORS[c.colorIdx!]} stroke={LANE_COLORS[c.colorIdx!]} strokeWidth="1.5" />
                           <circle cx={c.lane! * LANE_WIDTH + CENTER} cy="18" r="2" fill="#282c34" />
                        </>
                     )}
                  </svg>
               </div>

               {/* MESSAGE COL */}
               <div className="flex-1 flex items-center pr-2 min-w-0">
                  {c.author && (
                     <img src={`https://www.gravatar.com/avatar/ab0203f?s=48&d=identicon`} className="w-6 h-6 rounded-full mr-2 shrink-0" />
                  )}
                  {c.wip ? (
                     <span className="italic text-[#5c6370] truncate flex-1 min-w-0">{c.message}</span>
                  ) : (
                     <span className={`truncate flex-1 min-w-0 ${c.stash ? 'text-[#FAC775]' : 'text-[#e5e5e6] font-medium'}`}>{c.message}</span>
                  )}
                  {c.wip && (
                     <span className="ml-2 bg-[#181a1f] px-2 py-0.5 rounded-full text-xs shrink-0 flex items-center gap-1"><span className="text-amber-500">✏</span> {c.count}</span>
                  )}
               </div>

            </div>
          ))}

        </div>
      </div>
    </main>
  );
}
