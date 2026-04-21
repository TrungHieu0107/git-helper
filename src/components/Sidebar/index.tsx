import { useState, useRef, useMemo } from "react";
import { Search, ChevronsLeft, ChevronsRight, X } from "lucide-react";
import { useAppStore, StashEntry } from "../../store";
import { BranchNode, BranchTreeItem } from "./BranchTree";
import { SectionHeader } from "./SectionHeader";
import { StashEntryItem, StashContextMenu } from "./Stashes";
import { BranchContextMenu } from "./BranchContextMenu";
import { Button } from "../ui/Button";

function buildBranchTree(branchNames: string[]): BranchNode[] {
    const rootMap = new Map<string, BranchNode>();
    
    branchNames.forEach(fullPath => {
        const parts = fullPath.split('/');
        let currentLevel = rootMap;
        let cumulativePath = "";

        parts.forEach((part, index) => {
            cumulativePath = cumulativePath ? `${cumulativePath}/${part}` : part;
            const isLast = index === parts.length - 1;
            
            if (!currentLevel.has(part)) {
                currentLevel.set(part, {
                    name: part,
                    fullPath: isLast ? fullPath : cumulativePath,
                    isBranch: isLast,
                    children: new Map()
                });
            }
            
            const node = currentLevel.get(part)!;
            if (!isLast) {
                currentLevel = node.children;
            } else {
                node.isBranch = true;
            }
        });
    });

    const toSortedArray = (map: Map<string, BranchNode>): BranchNode[] => {
        return Array.from(map.values()).sort((a, b) => {
            if (!a.isBranch && b.isBranch) return -1;
            if (a.isBranch && !b.isBranch) return 1;
            return a.name.localeCompare(b.name);
        });
    };

    return toSortedArray(rootMap);
}

function filterBranchTree(nodes: BranchNode[], filterText: string): BranchNode[] {
    if (!filterText) return nodes;
    const lowerFilter = filterText.toLowerCase();

    return nodes.reduce((acc, node) => {
        const filteredChildren = filterBranchTree(Array.from(node.children.values()), filterText);
        const matches = node.name.toLowerCase().includes(lowerFilter) || filteredChildren.length > 0;
        
        if (matches) {
            acc.push({
                ...node,
                children: new Map(filteredChildren.map(c => [c.name, c]))
            });
        }
        return acc;
    }, [] as BranchNode[]);
}

export function Sidebar() {
  const [localOpen, setLocalOpen] = useState(true);
  const [remoteOpen, setRemoteOpen] = useState(true);
  const [stashOpen, setStashOpen] = useState(true);
  const [filter, setFilter] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const [localFlex, setLocalFlex] = useState(1);
  const [remoteFlex, setRemoteFlex] = useState(1);
  const [stashFlex, setStashFlex] = useState(1);

  const [stashContextMenu, setStashContextMenu] = useState<{ x: number, y: number, stash: StashEntry } | null>(null);
  const [branchContextMenu, setBranchContextMenu] = useState<{ x: number, y: number, branch: string } | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebarWidth');
    return saved ? parseInt(saved, 10) : 260;
  });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const activeBranch = useAppStore(state => state.activeBranch) || "main";
  const stashes = useAppStore(state => state.stashes) || [];
  const branches = useAppStore(state => state.branches) || [];

  const { localBranches, remoteBranchesTree } = useMemo(() => {
    const locals: string[] = [];
    const remotes = new Map<string, string[]>();

    branches.forEach(b => {
      if (b.branch_type === 'local') {
        locals.push(b.name);
      } else {
        const parts = b.name.split('/');
        const remoteName = parts[0];
        const branchName = parts.slice(1).join('/');
        if (!remotes.has(remoteName)) remotes.set(remoteName, []);
        remotes.get(remoteName)!.push(branchName);
      }
    });

    return {
      localBranches: buildBranchTree(locals),
      remoteBranchesTree: new Map(Array.from(remotes.entries()).map(([r, names]) => [r, buildBranchTree(names)])),
    };
  }, [branches]);

  const filteredLocalTree = useMemo(() => filterBranchTree(localBranches, filter), [localBranches, filter]);
  
  const filteredRemoteTree = useMemo(() => {
      const entries = Array.from(remoteBranchesTree.entries()).map(([remote, tree]): [string, BranchNode[]] => {
          const filteredTree = filterBranchTree(tree, filter);
          return [remote, filteredTree];
      });
      return new Map(entries.filter(([remote, tree]) => 
          remote.toLowerCase().includes(filter.toLowerCase()) || tree.length > 0
      ));
  }, [remoteBranchesTree, filter]);

  const filteredStashes = useMemo(() => {
      if (!filter) return stashes;
      return stashes.filter(s => s.message.toLowerCase().includes(filter.toLowerCase()));
  }, [stashes, filter]);

  const startResizing = (section: 'local' | 'remote') => (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startLocal = localFlex;
    const startRemote = remoteFlex;
    const startStash = stashFlex;
    const totalFlex = localFlex + remoteFlex + stashFlex;
    const containerHeight = containerRef.current?.clientHeight || 500;
    const flexUnitHeight = containerHeight / totalFlex;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const flexDelta = deltaY / flexUnitHeight;

      if (section === 'local') {
        const newLocal = Math.max(0.1, startLocal + flexDelta);
        const remaining = totalFlex - newLocal;
        const ratio = remaining / (startRemote + startStash);
        setLocalFlex(newLocal);
        setRemoteFlex(startRemote * ratio);
        setStashFlex(startStash * ratio);
      } else if (section === 'remote') {
        const newRemote = Math.max(0.1, startRemote + flexDelta);
        const remaining = totalFlex - startLocal - newRemote;
        setRemoteFlex(newRemote);
        setStashFlex(Math.max(0.1, remaining));
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'default';
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'row-resize';
  };

  const startHorizontalResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.min(600, Math.max(180, startWidth + deltaX));
      setSidebarWidth(newWidth);
      localStorage.setItem('sidebarWidth', newWidth.toString());
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'default';
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
  };

  return (
    <aside 
      className={`bg-[#161b22] flex flex-col h-full border-r border-[#30363d] shrink-0 text-[#8b949e] select-none text-sm relative group/sidebar transition-all duration-300 ${isCollapsed ? 'w-12 items-center' : ''}`}
      style={{ width: isCollapsed ? '48px' : `${sidebarWidth}px` }}
    >
      {!isCollapsed && (
        <div 
          onMouseDown={startHorizontalResizing}
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/40 transition-colors z-[101]"
        />
      )}

      {isCollapsed ? (
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsCollapsed(false)} 
          className="mt-3 text-[#6e7681]"
        >
           <ChevronsRight size={16} />
        </Button>
      ) : (
        <>
          <div className="p-3 border-b border-[#30363d] flex flex-col gap-3 relative">
            <div className="flex justify-end items-center">
               <Button 
                 variant="ghost" 
                 size="icon" 
                 onClick={() => setIsCollapsed(true)} 
                 className="h-7 w-7 text-[#6e7681]"
               >
                   <ChevronsLeft size={16} />
               </Button>
            </div>
        
            <div className="flex items-center">
               <div className="flex-1 flex items-center bg-[#0d1117] rounded-md px-2 border border-[#30363d] focus-within:border-blue-500/50 shadow-inner transition-colors">
                  <Search size={14} className="text-[#6e7681] mr-2" />
                  <input
                    type="text"
                    placeholder="Filter branches, stashes..."
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    className="w-full bg-transparent border-none text-[13px] py-1.5 outline-none text-[#e6edf3] placeholder-[#6e7681]"
                  />
                  {filter && (
                    <button onClick={() => setFilter('')} className="text-[#6e7681] hover:text-[#e6edf3] ml-1">
                      <X size={14} />
                    </button>
                  )}
               </div>
            </div>
          </div>

          <div ref={containerRef} className="flex-1 flex flex-col overflow-hidden p-2 gap-0 relative">
            <div className={`flex flex-col min-h-0 pt-2 ${localOpen ? 'shrink' : 'shrink-0'}`} style={{ flex: localOpen ? localFlex : '0 0 auto' }}>
               <SectionHeader title="LOCAL" count={filteredLocalTree.length} open={localOpen} setOpen={setLocalOpen} />
               {localOpen && (
                 <div className="flex-1 flex flex-col mt-2 overflow-y-auto custom-scrollbar scrollbar-autohide bg-[#0d1117]/30 rounded-lg border border-[#30363d]/50 py-1">
                    {filteredLocalTree.length === 0 ? (
                      <div className="text-xs text-[#5c6370] italic px-2 py-2 text-center opacity-60">No branches found</div>
                    ) : (
                     filteredLocalTree.map(node => (
                        <BranchTreeItem key={node.fullPath} node={node} activeBranch={activeBranch} level={0} filter={filter} setBranchContextMenu={setBranchContextMenu} />
                      ))
                    )}
                 </div>
               )}
            </div>

            {localOpen && remoteOpen && (
              <div onMouseDown={startResizing('local')} className="h-1 cursor-row-resize hover:bg-blue-500/30 transition-colors my-1 shrink-0 z-10" />
            )}

            <div className={`flex flex-col min-h-0 pt-3 ${remoteOpen ? 'grow shrink' : 'shrink-0'}`} style={{ flex: remoteOpen ? remoteFlex : '0 0 auto' }}>
               <SectionHeader title="REMOTE" count={filteredRemoteTree.size} open={remoteOpen} setOpen={setRemoteOpen} />
               {remoteOpen && (
                 <div className="flex-1 flex flex-col mt-2 overflow-y-auto custom-scrollbar scrollbar-autohide bg-[#0d1117]/30 rounded-lg border border-[#30363d]/50 py-1">
                   {filteredRemoteTree.size === 0 ? (
                     <div className="text-xs text-[#5c6370] italic px-2 py-2 text-center opacity-60">No remotes</div>
                   ) : (
                     Array.from(filteredRemoteTree.entries()).map(([remote, tree]) => (
                       <div key={remote}>
                          {tree.map(node => (
                            <BranchTreeItem key={`${remote}/${node.fullPath}`} node={node} activeBranch={null} level={0} filter={filter} setBranchContextMenu={setBranchContextMenu} remotePrefix={remote} />
                          ))}
                       </div>
                     ))
                   )}
                 </div>
               )}
            </div>

            {remoteOpen && stashOpen && (
              <div onMouseDown={startResizing('remote')} className="h-1 cursor-row-resize hover:bg-blue-500/30 transition-colors my-1 shrink-0 z-10" />
            )}

            <div className={`flex flex-col min-h-0 pt-3 ${stashOpen ? 'shrink' : 'shrink-0'}`} style={{ flex: stashOpen ? stashFlex : '0 0 auto' }}>
               <SectionHeader title="STASHES" count={filteredStashes.length} open={stashOpen} setOpen={setStashOpen} />
               {stashOpen && (
                 <div className="flex-1 flex flex-col mt-2 overflow-y-auto custom-scrollbar scrollbar-autohide bg-[#0d1117]/30 rounded-lg border border-[#30363d]/50 py-1 px-1 gap-1">
                   {filteredStashes.length === 0 ? (
                     <div className="text-xs text-[#5c6370] italic px-2 py-2 text-center opacity-60">No stashes</div>
                   ) : (
                      filteredStashes.map((s: StashEntry) => (
                        <StashEntryItem 
                          key={s.oid} 
                          stash={s} 
                          filter={filter} 
                          onContextMenu={(e, stash) => {
                            e.preventDefault();
                            setStashContextMenu({ x: e.clientX, y: e.clientY, stash });
                          } } 
                        />
                      ))
                    )}
                 </div>
               )}
            </div>
          </div>
        </>
      )}
      {stashContextMenu && (
        <StashContextMenu 
          stash={stashContextMenu.stash} 
          position={{ x: stashContextMenu.x, y: stashContextMenu.y }} 
          onClose={() => setStashContextMenu(null)} 
        />
      )}
      {branchContextMenu && (
        <BranchContextMenu 
          branch={branchContextMenu.branch} 
          position={{ x: branchContextMenu.x, y: branchContextMenu.y }} 
          onClose={() => setBranchContextMenu(null)} 
        />
      )}
    </aside>
  );
}
